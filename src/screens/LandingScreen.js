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
import { useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  getCurrentPositionSafe,
  reverseGeocode,
  geocodeAddress,
  getPlaceSuggestions,
  getCoordsFromPlaceId,
  getFallbackCoordsForUKArea,
} from '../utils/geolocation';
import logo from '../assets/logo.png';

const LOCATION_KEY = 'USER_LOCATION_SELECTION';
const LOCATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const LandingScreen = () => {
  const navigation = useNavigation();
  const user = useSelector(state => state.app?.user);
  const [addressText, setAddressText] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const debounceTimerRef = useRef(null);

  // If user already has a recent saved location, skip Landing and go straight to HomeOne
  useEffect(() => {
    let cancelled = false;
    const checkSavedLocation = async () => {
      try {
        if (!user?.id) return;
        const raw = await AsyncStorage.getItem(LOCATION_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        if (!saved || saved.userId !== user.id) return;
        if (!saved.savedAt || Date.now() - saved.savedAt > LOCATION_TTL_MS) return;
        if (!saved.coords?.lat || !saved.coords?.lng) return;
        if (cancelled) return;
        navigation.replace('HomeOneScreen', {
          selectedLocation: saved.coords,
          addressText: saved.addressText || '',
        });
      } catch (e) {
        // ignore storage errors and show Landing normally
      }
    };
    checkSavedLocation();
    return () => {
      cancelled = true;
    };
  }, [user?.id, navigation]);

  useEffect(() => {
    const trimmed = addressText.trim();
    if (!trimmed) {
      setAddressSuggestions([]);
      setSuggestionsLoading(false);
      return;
    }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      setSuggestionsLoading(true);
      const list = await getPlaceSuggestions(trimmed, { region: 'uk' });
      setAddressSuggestions(list || []);
      setSuggestionsLoading(false);
      debounceTimerRef.current = null;
    }, 280);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [addressText]);

  const goToResults = async (selectedLocation, addressLabel) => {
    try {
      await AsyncStorage.setItem(
        LOCATION_KEY,
        JSON.stringify({
          userId: user?.id || null,
          coords: selectedLocation,
          addressText: addressLabel || addressText,
          savedAt: Date.now(),
        }),
      );
    } catch (e) {
      // non-blocking; still navigate even if storage fails
    }
    navigation.replace('HomeOneScreen', {
      selectedLocation,
      addressText: addressLabel || addressText,
    });
  };

  const handleSelectSuggestion = async (description, placeId) => {
    setAddressText(description);
    setAddressSuggestions([]);
    setLocationLoading(true);
    try {
      let coords = placeId ? await getCoordsFromPlaceId(placeId) : null;
      if (!coords) coords = await geocodeAddress(description);
      if (!coords) coords = await geocodeAddress(description + ', United Kingdom');
      if (!coords) coords = getFallbackCoordsForUKArea(description);
      if (coords) {
        await goToResults(coords, description);
      } else {
        Alert.alert(
          'Address',
          'Could not get location for this address. Try "Use my location".',
        );
      }
    } catch (_) {
      const fallback = getFallbackCoordsForUKArea(description);
      if (fallback) {
        goToResults(fallback, description);
      } else {
        Alert.alert('Address', 'Something went wrong. Try "Use my location".');
      }
    }
    setLocationLoading(false);
  };

  const handleAddressSubmit = async () => {
    const trimmed = addressText.trim();
    if (trimmed) {
      setLocationLoading(true);
      try {
        let coords = await geocodeAddress(trimmed);
        if (!coords) {
          const parts = trimmed.split(',').map(p => p.trim()).filter(Boolean);
          if (parts.length >= 2) coords = await geocodeAddress(parts.slice(-2).join(', '));
          if (!coords && parts.length >= 1) coords = await geocodeAddress(parts[parts.length - 1]);
        }
        if (!coords) coords = await geocodeAddress(trimmed + ', United Kingdom');
        if (!coords) coords = getFallbackCoordsForUKArea(trimmed);
        if (coords) {
          await goToResults(coords, trimmed);
        } else {
          Alert.alert(
            'Address',
            'Could not find that address. Try "Use my location" or check the address.',
          );
        }
      } catch (_) {
        const fallback = getFallbackCoordsForUKArea(trimmed);
        if (fallback) {
          goToResults(fallback, trimmed);
        } else {
          Alert.alert('Address', 'Could not find that address.');
        }
      }
      setLocationLoading(false);
      return;
    }
    useMyLocation();
  };

  const useMyLocation = () => {
    setLocationLoading(true);
    setAddressSuggestions([]);
    getCurrentPositionSafe(
      async pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const coords = { lat, lng };
        const addr = await reverseGeocode(lat, lng);
        setAddressText(addr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        await goToResults(coords, addr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setLocationLoading(false);
      },
      err => {
        setLocationLoading(false);
        Alert.alert('Location', err || 'Could not get location.');
      },
    );
  };

  return (
    <View style={styles.landingContainer}>
      <View style={styles.centerContent}>
        <View style={[styles.logoContainer, { marginBottom: 20 }]}>
          <Image
            source={logo}
            style={{ width: 200, height: 50 }}
            resizeMode="contain"
          />
        </View>
        <View style={styles.landingSearchBox}>
          <Icon name="magnify" size={22} color="#999" style={styles.landingSearchIcon} />
          <TextInput
            style={styles.landingSearchInput}
            placeholder="Search address (UK / England)"
            placeholderTextColor="#999"
            value={addressText}
            onChangeText={setAddressText}
            onSubmitEditing={handleAddressSubmit}
            returnKeyType="search"
            editable={!locationLoading}
          />
          <TouchableOpacity
            onPress={locationLoading ? undefined : handleAddressSubmit}
            style={styles.landingMapIcon}
            disabled={locationLoading}
            activeOpacity={0.7}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#F5A623" />
            ) : (
              <Icon name="map-marker-radius" size={26} color="#F5A623" />
            )}
          </TouchableOpacity>
        </View>
        {addressText.trim().length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestionsLoading ? (
              <View style={styles.suggestionItem}>
                <ActivityIndicator size="small" color="#F5A623" />
                <Text style={styles.suggestionText}>Searching areas...</Text>
              </View>
            ) : addressSuggestions.length > 0 ? (
              <ScrollView
                style={styles.suggestionsScroll}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {addressSuggestions.slice(0, 8).map((item, idx) => (
                  <TouchableOpacity
                    key={item.place_id ? item.place_id : `fb-${idx}-${item.description}`}
                    style={styles.suggestionItem}
                    onPress={() => handleSelectSuggestion(item.description, item.place_id)}
                    activeOpacity={0.7}
                  >
                    <Icon name="map-marker-outline" size={18} color="#666" />
                    <Text style={styles.suggestionText} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.suggestionItem}>
                <Icon name="map-marker-outline" size={18} color="#999" />
                <Text style={styles.suggestionHint}>
                  No areas found. Type full address (e.g. Abbots Langley, London) or tap the location icon.
                </Text>
              </View>
            )}
          </View>
        )}
        <Text style={styles.slogan}>See it, Love it, order it</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  landingContainer: { flex: 1, backgroundColor: '#F5A623' },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {},
  landingSearchBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    width: '100%',
    height: 55,
    borderRadius: 10,
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  landingSearchIcon: { marginRight: 8 },
  landingSearchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  landingMapIcon: { padding: 8, marginLeft: 4 },
  suggestionsContainer: {
    width: '100%',
    marginTop: 8,
    backgroundColor: '#FFF',
    borderRadius: 10,
    maxHeight: 220,
    elevation: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    gap: 10,
  },
  suggestionText: { flex: 1, fontSize: 15, color: '#333' },
  suggestionHint: { flex: 1, fontSize: 14, color: '#666' },
  suggestionsScroll: { maxHeight: 260 },
  slogan: { color: '#FFF', marginTop: 20, fontSize: 14, fontWeight: '500' },
});

export default LandingScreen;
