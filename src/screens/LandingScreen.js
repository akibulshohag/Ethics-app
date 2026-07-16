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
  StatusBar,
  Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
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
import {
  persistBrowseLocation,
  LOCATION_STORAGE_KEY,
} from '../services/userLocationService';
import { setBrowseLocation } from '../redux/actions/appSlice';
import MapLocationPicker from '../components/MapLocationPicker';
import logo from '../assets/logo.png';
import { LANDING_LOGO_STYLE } from '../constants/headerLogo';
import signupFood from '../assets/img/signupfood.png';
import decorBowl from '../assets/img/s1.png';
import decorSkyline from '../assets/img/s2.png';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const LOCATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const ORANGE = '#F5A623';
const CREAM = '#FFF5EB';
const HEADER_HEIGHT = SCREEN_HEIGHT * 0.33;
const CARD_OVERLAP = 32;
const CARD_MARGIN_H = 18;
const CARD_MARGIN_B = 28;
const CARD_BOTTOM_ART_H = SCREEN_HEIGHT * 0.085;
const CARD_PAD_H = 20;
const CARD_PAD_TOP = 36;
const CARD_INNER_W = SCREEN_WIDTH - CARD_MARGIN_H * 2;

const LandingScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector(state => state.app?.user);
  const browseLocation = useSelector(state => state.app?.browseLocation);
  const [addressText, setAddressText] = useState('');
  const [postcodeInput, setPostcodeInput] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const debounceTimerRef = useRef(null);
  const autoEnteredHomeRef = useRef(false);

  useEffect(() => {
    if (autoEnteredHomeRef.current) return;
    let cancelled = false;
    const goHome = browse => {
      if (cancelled || !browse) return;
      const lat = Number(browse.lat);
      const lng = Number(browse.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      autoEnteredHomeRef.current = true;
      navigation.replace('HomeOneScreen', {
        selectedLocation: { lat, lng },
        addressText: browse.addressText || '',
        postcode: browse.postcode || '',
      });
    };

    const checkSavedLocation = async () => {
      try {
        // Fast path: Redux already has browse location after login / relaunch.
        const reduxLat =
          browseLocation?.lat != null ? Number(browseLocation.lat) : null;
        const reduxLng =
          browseLocation?.lng != null ? Number(browseLocation.lng) : null;
        if (Number.isFinite(reduxLat) && Number.isFinite(reduxLng)) {
          goHome({
            lat: reduxLat,
            lng: reduxLng,
            postcode: browseLocation.postcode || '',
            addressText: browseLocation.addressText || '',
          });
          return;
        }

        const raw = await AsyncStorage.getItem(LOCATION_STORAGE_KEY);
        if (!raw) return;
        const saved = JSON.parse(raw);
        const coords = saved.coords || { lat: saved.lat, lng: saved.lng };
        const lat = coords?.lat != null ? Number(coords.lat) : null;
        const lng = coords?.lng != null ? Number(coords.lng) : null;
        if (
          lat == null ||
          lng == null ||
          !Number.isFinite(lat) ||
          !Number.isFinite(lng)
        ) {
          return;
        }
        const fresh =
          saved.savedAt == null ||
          Date.now() - saved.savedAt <= LOCATION_TTL_MS;
        const sameUser =
          saved.userId == null ||
          user?.id == null ||
          String(saved.userId) === String(user.id);
        if (!fresh || !sameUser || cancelled) return;

        const browse = {
          lat,
          lng,
          postcode: saved.postcode || '',
          addressText: saved.addressText || '',
          areaLabel: saved.areaLabel || browseAreaLabel(saved),
        };
        dispatch(setBrowseLocation(browse));
        goHome(browse);
      } catch (_) {}
    };
    checkSavedLocation();
    return () => {
      cancelled = true;
    };
    // Only auto-enter home once on first mount / login — not when user returns to change location.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    dispatch(
      setBrowseLocation({ lat, lng, postcode, addressText: addr, areaLabel }),
    );
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
      const pc =
        normalizeUkPostcode(description) ||
        normalizeUkPostcode(postcodeInput) ||
        '';
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
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={ORANGE} />

      <View style={styles.header}>
        <SafeAreaView edges={['top']} style={styles.headerSafe}>
          <View style={styles.headerTextBlock}>
            <Image source={logo} style={styles.logo} resizeMode="contain" />
            <Text style={styles.headerSlogan}>See it, Love it, order it</Text>
          </View>
        </SafeAreaView>
        <View style={styles.foodImageWrap}>
          <Image
            source={signupFood}
            style={styles.foodImage}
            resizeMode="cover"
          />
        </View>
      </View>

      <View style={styles.cardOuter}>
        <View style={styles.card}>
          <ScrollView
            style={styles.cardScroll}
            contentContainerStyle={styles.cardContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.cardBody}>
              <Text style={styles.fieldLabel}>Enter UK postcode</Text>
              <View style={styles.inputRow}>
                <Icon
                  name="map-marker-outline"
                  size={22}
                  color="#333"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. WD5 0AB"
                  placeholderTextColor="#B0B0B0"
                  value={postcodeInput}
                  onChangeText={setPostcodeInput}
                  autoCapitalize="characters"
                  onSubmitEditing={handlePostcodeSearch}
                  editable={!locationLoading}
                />
                <TouchableOpacity
                  style={styles.arrowBtn}
                  onPress={handlePostcodeSearch}
                  disabled={locationLoading}
                  activeOpacity={0.85}
                >
                  {locationLoading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Icon name="chevron-right" size={22} color="#FFF" />
                  )}
                </TouchableOpacity>
              </View>

              <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
                Enter UK Area
              </Text>
              <View style={styles.inputRow}>
                <Icon
                  name="magnify-plus-outline"
                  size={22}
                  color="#333"
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="Area, street, city"
                  placeholderTextColor="#B0B0B0"
                  value={addressText}
                  onChangeText={setAddressText}
                  editable={!locationLoading}
                />
              </View>

              {addressText.trim().length > 0 && (
                <View style={styles.suggestionsContainer}>
                  {suggestionsLoading ? (
                    <ActivityIndicator color={ORANGE} style={{ padding: 12 }} />
                  ) : (
                    <ScrollView
                      keyboardShouldPersistTaps="handled"
                      style={{ maxHeight: 160 }}
                    >
                      {addressSuggestions.slice(0, 6).map((item, idx) => (
                        <TouchableOpacity
                          key={item.place_id || `s-${idx}`}
                          style={styles.suggestionItem}
                          onPress={() =>
                            handleSelectSuggestion(
                              item.description,
                              item.place_id,
                            )
                          }
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

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.chipsScroll}
                contentContainerStyle={styles.chipsContent}
              >
                {UK_POPULAR_AREAS.map(area => (
                  <TouchableOpacity
                    key={area}
                    style={styles.chip}
                    onPress={() => handlePopularArea(area)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.chipText}>{area}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={styles.mapBtn}
                onPress={() => setMapVisible(true)}
                activeOpacity={0.9}
              >
                <Icon name="map-outline" size={20} color="#FFF" />
                <Text style={styles.mapBtnText}>Pick on Map / Use GPS</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cardBottom}>
              <Text style={styles.cardSlogan}>See it, Love it, order it</Text>
              <View style={styles.bottomArtRow} pointerEvents="none">
                <Image
                  source={decorBowl}
                  style={styles.decorLeft}
                  resizeMode="contain"
                />
                <Image
                  source={decorSkyline}
                  style={styles.decorRight}
                  resizeMode="contain"
                />
              </View>
            </View>
          </ScrollView>
        </View>
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
  root: {
    flex: 1,
    backgroundColor: ORANGE,
  },
  header: {
    height: HEADER_HEIGHT,
    backgroundColor: ORANGE,
    overflow: 'hidden',
    zIndex: 1,
  },
  headerSafe: {
    paddingHorizontal: 24,
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: CARD_OVERLAP + 8,
  },
  headerTextBlock: {
    zIndex: 2,
    maxWidth: SCREEN_WIDTH * 0.72,
  },
  logo: {
    ...LANDING_LOGO_STYLE,
    marginBottom: 6,
  },
  headerSlogan: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    marginTop: 4,
    marginBottom: 0,
  },
  foodImageWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: SCREEN_WIDTH * 0.56,
    height: HEADER_HEIGHT * 0.92,
    overflow: 'hidden',
    borderBottomLeftRadius: SCREEN_WIDTH * 0.28,
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  cardOuter: {
    flex: 1,
    marginTop: -CARD_OVERLAP,
    marginHorizontal: CARD_MARGIN_H,
    marginBottom: CARD_MARGIN_B,
    zIndex: 2,
    alignSelf: 'stretch',
  },
  card: {
    backgroundColor: CREAM,
    borderRadius: 28,
    overflow: 'hidden',
    maxHeight: SCREEN_HEIGHT - HEADER_HEIGHT + CARD_OVERLAP - CARD_MARGIN_B - 4,
    marginTop: 20,
  },
  cardScroll: {
    flexGrow: 0,
  },
  cardContent: {
    paddingHorizontal: CARD_PAD_H,
    paddingTop: CARD_PAD_TOP,
    paddingBottom: 2,
  },
  cardBody: {
    flexShrink: 0,
  },
  cardBottom: {
    flexShrink: 0,
  },
  fieldLabel: {
    color: ORANGE,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
  },
  fieldLabelSpaced: {
    marginTop: 22,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    minHeight: 54,
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    paddingVertical: 10,
  },
  arrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },
  suggestionsContainer: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginTop: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionItem: {
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  suggestionText: {
    fontSize: 15,
    color: '#333',
  },
  chipsScroll: {
    marginTop: 22,
    maxHeight: 46,
  },
  chipsContent: {
    paddingRight: 4,
  },
  chip: {
    backgroundColor: '#FFF',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 24,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E8E0D5',
  },
  chipText: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  mapBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 28,
    paddingVertical: 16,
    backgroundColor: ORANGE,
    borderRadius: 14,
  },
  mapBtnText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 15,
  },
  cardSlogan: {
    color: '#9A7B5A',
    marginTop: 24,
    marginBottom: 10,
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  bottomArtRow: {
    position: 'relative',
    width: CARD_INNER_W,
    height: CARD_BOTTOM_ART_H,
    marginTop: 4,
    marginBottom: 0,
    marginHorizontal: -CARD_PAD_H,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  decorLeft: {
    position: 'absolute',
    left: -58,
    bottom: -10,
    width: CARD_INNER_W * 0.5,
    height: CARD_BOTTOM_ART_H * 1.38,
    opacity: 0.9,
    blendMode: 'screen',
  },
  decorRight: {
    position: 'absolute',
    right: -50,
    bottom: -6,
    width: CARD_INNER_W * 0.68,
    height: CARD_BOTTOM_ART_H * 1.3,
    opacity: 0.9,
    blendMode: 'screen',
  },
});

export default LandingScreen;
