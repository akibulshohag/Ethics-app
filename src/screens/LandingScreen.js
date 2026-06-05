import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  geocodeAddress,
  geocodeUkPostcode,
  getPlaceSuggestions,
  getCoordsFromPlaceId,
  getFallbackCoordsForUKArea,
} from '../utils/geolocation';
import {
  browseAreaLabel,
  normalizeUkPostcode,
  UK_POPULAR_AREAS,
} from '../utils/ukPostcode';
import { persistBrowseLocation, LOCATION_STORAGE_KEY } from '../services/userLocationService';
import { setBrowseLocation } from '../redux/actions/appSlice';
import MapLocationPicker from '../components/MapLocationPicker';
import logo from '../assets/logo.png';

const LOCATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const LandingScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector(state => state.app?.user);
  const [addressText, setAddressText] = useState('');
  const [postcodeInput, setPostcodeInput] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const checkSavedLocation = async () => {
      try {
        const raw = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        const coords = saved.coords || { lat: saved.lat, lng: saved.lng };
        const lat = coords?.lat != null ? Number(coords.lat) : null;
        const lng = coords?.lng != null ? Number(coords.lng) : null;
        if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
          return;
        }
        const fresh =
          saved.savedAt == null || Date.now() - saved.savedAt <= LOCATION_TTL_MS;
        const sameUser =
          saved.userId == null || user?.id == null || String(saved.userId) === String(user.id);
        if (!fresh || !sameUser || cancelled) return;

        const browse = {
          lat,
          lng,
          postcode: saved.postcode || '',
          addressText: saved.addressText || '',
          areaLabel: saved.areaLabel || browseAreaLabel(saved),
        };
        dispatch(setBrowseLocation(browse));
        navigation.replace('HomeOneScreen', {
          selectedLocation: { lat, lng },
          addressText: browse.addressText,
          postcode: browse.postcode,
        });
      } catch (_) {}
    };
    checkSavedLocation();
    return () => {
      cancelled = true;
    };
  }, [navigation, user?.id, dispatch]);

  useEffect(() => {
    const trimmed = addressText.trim();
    if (!trimmed) {
      setAddressSuggestions([]);
      return;
    }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      setSuggestionsLoading(true);
      const list = await getPlaceSuggestions(trimmed, { region: 'uk' });
      setAddressSuggestions(list || []);
      setSuggestionsLoading(false);
    }, 280);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [addressText]);

  const goToResults = async browse => {
    const { lat, lng, postcode, addressText: addr, areaLabel } = browse;
    dispatch(setBrowseLocation({ lat, lng, postcode, addressText: addr, areaLabel }));
    await persistBrowseLocation({
      userId: user?.id,
      lat,
      lng,
      postcode,
      addressText: addr,
      areaLabel,
    });
    navigation.replace('HomeOneScreen', {
      selectedLocation: { lat, lng },
      addressText: addr,
      postcode,
    });
  };

  const resolveCoordsFromText = async (text, placeId) => {
    let coords = placeId ? await getCoordsFromPlaceId(placeId) : null;
    if (!coords) coords = await geocodeAddress(text);
    if (!coords) coords = await geocodeAddress(`${text}, United Kingdom`);
    if (!coords) coords = getFallbackCoordsForUKArea(text);
    return coords;
  };

  const handleSelectSuggestion = async (description, placeId) => {
    setAddressText(description);
    setAddressSuggestions([]);
    setLocationLoading(true);
    try {
      const coords = await resolveCoordsFromText(description, placeId);
      if (!coords) {
        Alert.alert('Address', 'Could not get location. Try map or postcode.');
        return;
      }
      const pc = normalizeUkPostcode(description) || normalizeUkPostcode(postcodeInput) || '';
      await goToResults({
        lat: coords.lat,
        lng: coords.lng,
        postcode: pc,
        addressText: description,
        areaLabel: browseAreaLabel({ postcode: pc, addressText: description }),
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const handlePostcodeSearch = async () => {
    const pc = normalizeUkPostcode(postcodeInput);
    if (!pc) {
      Alert.alert('Postcode', 'Enter a valid UK postcode (e.g. WD5 0AB).');
      return;
    }
    setLocationLoading(true);
    try {
      let coords = await geocodeUkPostcode(pc);
      if (!coords) coords = await geocodeAddress(pc);
      if (!coords) coords = await geocodeAddress(`${pc}, United Kingdom`);
      if (!coords) {
        Alert.alert('Not found', `Could not locate ${pc}. Open map to pin.`);
        return;
      }
      await goToResults({
        lat: coords.lat,
        lng: coords.lng,
        postcode: pc,
        addressText: `${pc}, United Kingdom`,
        areaLabel: pc,
      });
    } finally {
      setLocationLoading(false);
    }
  };

  const handlePopularArea = async area => {
    setAddressText(area);
    setLocationLoading(true);
    try {
      const coords = await resolveCoordsFromText(`${area}, United Kingdom`, '');
      if (!coords) {
        Alert.alert('Area', 'Could not locate that area.');
        return;
      }
      await goToResults({
        lat: coords.lat,
        lng: coords.lng,
        postcode: normalizeUkPostcode(area) || '',
        addressText: area,
        areaLabel: area.split(',')[0].trim(),
      });
    } finally {
      setLocationLoading(false);
    }
  };

  return (
    <View style={styles.landingContainer}>
      <View style={styles.centerContent}>
        <Image source={logo} style={{ width: 200, height: 50, marginBottom: 16 }} resizeMode="contain" />

        <Text style={styles.sectionLabel}>Enter UK postcode</Text>
        <View style={styles.landingSearchBox}>
          <Icon name="map-marker" size={22} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.landingSearchInput}
            placeholder="e.g. WD5 0AB"
            placeholderTextColor="#999"
            value={postcodeInput}
            onChangeText={setPostcodeInput}
            autoCapitalize="characters"
            onSubmitEditing={handlePostcodeSearch}
            editable={!locationLoading}
          />
          <TouchableOpacity onPress={handlePostcodeSearch} disabled={locationLoading}>
            {locationLoading ? (
              <ActivityIndicator size="small" color="#F5A623" />
            ) : (
              <Icon name="arrow-right-circle" size={28} color="#F5A623" />
            )}
          </TouchableOpacity>
        </View>

        <Text style={[styles.sectionLabel, { marginTop: 16 }]}>Or search area / address</Text>
        <View style={styles.landingSearchBox}>
          <Icon name="magnify" size={22} color="#999" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.landingSearchInput}
            placeholder="Area, street, city"
            placeholderTextColor="#999"
            value={addressText}
            onChangeText={setAddressText}
            editable={!locationLoading}
          />
        </View>

        {addressText.trim().length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestionsLoading ? (
              <ActivityIndicator color="#F5A623" style={{ padding: 12 }} />
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" style={{ maxHeight: 160 }}>
                {addressSuggestions.slice(0, 6).map((item, idx) => (
                  <TouchableOpacity
                    key={item.place_id || `s-${idx}`}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(item.description, item.place_id)}
                  >
                    <Text style={styles.suggestionText} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          {UK_POPULAR_AREAS.map(area => (
            <TouchableOpacity
              key={area}
              style={styles.chip}
              onPress={() => handlePopularArea(area)}
            >
              <Text style={styles.chipText}>{area}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.mapBtn} onPress={() => setMapVisible(true)}>
          <Icon name="map" size={20} color="#FFF" />
          <Text style={styles.mapBtnText}>Pick on map / Use GPS</Text>
        </TouchableOpacity>

        <Text style={styles.slogan}>See it, Love it, order it</Text>
      </View>

      <MapLocationPicker
        visible={mapVisible}
        onClose={() => setMapVisible(false)}
        title="Deliver to"
        onConfirm={browse => goToResults(browse)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  landingContainer: { flex: 1, backgroundColor: '#F5A623' },
  centerContent: { flex: 1, paddingHorizontal: 24, paddingTop: 48 },
  sectionLabel: { color: '#FFF', fontSize: 13, fontWeight: '600', marginBottom: 8 },
  landingSearchBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  landingSearchInput: { flex: 1, fontSize: 16, color: '#333' },
  suggestionsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
  },
  suggestionItem: { padding: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  suggestionText: { fontSize: 15, color: '#333' },
  chipsScroll: { marginTop: 14, maxHeight: 44 },
  chip: {
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  chipText: { fontSize: 13, color: '#333', fontWeight: '500' },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#FFF',
    borderRadius: 10,
  },
  mapBtnText: { color: '#FFF', fontWeight: '600', fontSize: 15 },
  slogan: { color: '#FFF', marginTop: 24, fontSize: 14, textAlign: 'center' },
});

export default LandingScreen;
