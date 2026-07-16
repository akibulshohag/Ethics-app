import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  geocodeAddress,
  geocodeUkPostcode,
  getCurrentPositionSafe,
  reverseGeocode,
} from '../utils/geolocation';
import {
  browseAreaLabel,
  normalizeUkPostcode,
} from '../utils/ukPostcode';
import { config } from '../../config';

const UK_CENTER = { latitude: 51.5074, longitude: -0.1278 };
const MAP_MIN_HEIGHT = Math.max(280, Dimensions.get('window').height * 0.38);
const hasGoogleMapsKey = !!String(config?.googleMapsApiKey || '').trim();

function extractPostcodeFromAddress(address) {
  const m = String(address || '').match(
    /([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})/i,
  );
  return m ? normalizeUkPostcode(m[1]) : null;
}

function regionFromCoords(lat, lng) {
  return {
    latitude: lat,
    longitude: lng,
    latitudeDelta: 0.04,
    longitudeDelta: 0.04,
  };
}

/** Shared UK map + postcode picker for users and restaurant owners. */
export default function MapLocationPicker({
  visible,
  onClose,
  onConfirm,
  initialLat,
  initialLng,
  initialPostcode = '',
  initialAddress = '',
  title = 'Choose location',
  requirePostcode = false,
}) {
  const [postcode, setPostcode] = useState(initialPostcode || '');
  const [addressText, setAddressText] = useState(initialAddress || '');
  const [coords, setCoords] = useState(() => {
    const lat = Number(initialLat);
    const lng = Number(initialLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    return { lat: UK_CENTER.latitude, lng: UK_CENTER.longitude };
  });
  const [loading, setLoading] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef(null);

  const mapRegion = useMemo(
    () => regionFromCoords(coords.lat, coords.lng),
    [coords.lat, coords.lng],
  );

  const mapProvider = useMemo(() => {
    if (Platform.OS === 'ios') return undefined;
    return hasGoogleMapsKey ? PROVIDER_GOOGLE : undefined;
  }, []);

  useEffect(() => {
    if (!visible) return;
    setPostcode(initialPostcode || '');
    setAddressText(initialAddress || '');
    setMapReady(false);
    const lat = Number(initialLat);
    const lng = Number(initialLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setCoords({ lat, lng });
    } else {
      setCoords({ lat: UK_CENTER.latitude, lng: UK_CENTER.longitude });
    }
  }, [visible, initialLat, initialLng, initialPostcode, initialAddress]);

  useEffect(() => {
    if (!visible || !mapReady || !mapRef.current) return;
    mapRef.current.animateToRegion(regionFromCoords(coords.lat, coords.lng), 350);
  }, [visible, mapReady, coords.lat, coords.lng]);

  const applyCoords = useCallback(async (lat, lng, hintAddress) => {
    setCoords({ lat, lng });
    const addr = hintAddress || (await reverseGeocode(lat, lng));
    if (addr) {
      setAddressText(addr);
      const pc = extractPostcodeFromAddress(addr);
      if (pc) setPostcode(pc);
    }
  }, []);

  const searchPostcode = async () => {
    const pc = normalizeUkPostcode(postcode) || postcode.trim();
    if (!pc) {
      Alert.alert('Postcode', 'Enter a valid UK postcode (e.g. WD5 0AB).');
      return;
    }
    setLoading(true);
    try {
      let geo = await geocodeUkPostcode(pc);
      if (!geo) geo = await geocodeAddress(pc);
      if (!geo) geo = await geocodeAddress(`${pc}, United Kingdom`);
      if (!geo) {
        Alert.alert(
          'Not found',
          `Could not locate ${normalizeUkPostcode(pc) || pc}. Drag the pin on the map or use GPS.`,
        );
        return;
      }
      const formattedPc = normalizeUkPostcode(pc) || pc;
      setPostcode(formattedPc);
      const hint =
        geo.address || `${formattedPc}, United Kingdom`;
      await applyCoords(geo.lat, geo.lng, hint);
    } finally {
      setLoading(false);
    }
  };

  const useGps = () => {
    setLoading(true);
    getCurrentPositionSafe(
      async pos => {
        try {
          await applyCoords(pos.coords.latitude, pos.coords.longitude);
        } finally {
          setLoading(false);
        }
      },
      err => {
        setLoading(false);
        Alert.alert('Location', err || 'Could not get GPS location.');
      },
      { enableHighAccuracy: true, timeout: 20000 },
    );
  };

  const handleConfirm = () => {
    const pc = normalizeUkPostcode(postcode);
    if (requirePostcode && !pc) {
      Alert.alert(
        'Postcode required',
        'Enter a valid UK postcode or pick a point on the map.',
      );
      return;
    }
    if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
      Alert.alert('Location', 'Select a point on the map.');
      return;
    }
    onConfirm?.({
      lat: coords.lat,
      lng: coords.lng,
      postcode: pc || '',
      addressText: addressText.trim(),
      areaLabel: browseAreaLabel({
        postcode: pc,
        addressText,
        areaLabel: '',
      }),
    });
    onClose?.();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Icon name="close" size={26} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <View style={{ width: 26 }} />
        </View>

        <View style={styles.fieldRow}>
          <TextInput
            style={styles.postcodeInput}
            placeholder="UK postcode (e.g. WD5 0AB)"
            placeholderTextColor="#999"
            value={postcode}
            onChangeText={setPostcode}
            autoCapitalize="characters"
            returnKeyType="search"
            onSubmitEditing={searchPostcode}
          />
          <TouchableOpacity
            style={styles.searchBtn}
            onPress={searchPostcode}
            disabled={loading}
          >
            <Text style={styles.searchBtnText}>Find</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.addressInput}
          placeholder="Address (optional)"
          placeholderTextColor="#999"
          value={addressText}
          onChangeText={setAddressText}
          multiline
        />

        {Platform.OS === 'android' && !hasGoogleMapsKey ? (
          <Text style={styles.mapHint}>
            Map tiles need a Google Maps API key. You can still Find postcode, use GPS, or confirm.
          </Text>
        ) : null}

        <View style={styles.mapWrap}>
          <MapView
            ref={mapRef}
            style={StyleSheet.absoluteFill}
            provider={mapProvider}
            region={mapRegion}
            onMapReady={() => setMapReady(true)}
            onPress={e => {
              const { latitude, longitude } = e.nativeEvent.coordinate;
              applyCoords(latitude, longitude);
            }}
            mapType="standard"
            loadingEnabled
            loadingIndicatorColor="#F5A623"
            showsUserLocation
            showsMyLocationButton={Platform.OS === 'android'}
          >
            <Marker
              coordinate={{ latitude: coords.lat, longitude: coords.lng }}
              draggable
              onDragEnd={e => {
                const { latitude, longitude } = e.nativeEvent.coordinate;
                applyCoords(latitude, longitude);
              }}
            />
          </MapView>
          {!mapReady ? (
            <View style={styles.mapLoading} pointerEvents="none">
              <ActivityIndicator size="large" color="#F5A623" />
            </View>
          ) : null}
        </View>

        <TouchableOpacity style={styles.gpsBtn} onPress={useGps} disabled={loading}>
          <Icon name="crosshairs-gps" size={20} color="#F5A623" />
          <Text style={styles.gpsBtnText}>Use my location</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.confirmBtn, loading && styles.confirmDisabled]}
          onPress={handleConfirm}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.confirmText}>Confirm location</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFF',
    paddingTop: Platform.OS === 'ios' ? 48 : 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  title: { fontSize: 17, fontWeight: '600', color: '#1A1A1A' },
  fieldRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    marginBottom: 8,
  },
  postcodeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  searchBtn: {
    backgroundColor: '#F5A623',
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchBtnText: { color: '#FFF', fontWeight: '600' },
  addressInput: {
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#333',
    minHeight: 44,
    marginBottom: 8,
  },
  mapHint: {
    marginHorizontal: 16,
    marginBottom: 6,
    fontSize: 12,
    color: '#888',
    textAlign: 'center',
  },
  mapWrap: {
    flex: 1,
    minHeight: MAP_MIN_HEIGHT,
    marginHorizontal: 16,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 10,
    backgroundColor: '#E8E8E8',
  },
  mapLoading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
  },
  gpsBtnText: { color: '#F5A623', fontWeight: '600', fontSize: 15 },
  confirmBtn: {
    marginHorizontal: 16,
    marginBottom: 24,
    backgroundColor: '#F5A623',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  confirmDisabled: { opacity: 0.7 },
  confirmText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});
