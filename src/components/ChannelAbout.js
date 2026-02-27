import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  Linking,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { Dropdown } from 'react-native-element-dropdown';
import { getCurrentPositionSafe, reverseGeocode } from '../utils/geolocation';
import { config } from '../../config';
import { getSocialIcon, SOCIAL_LINK_TYPES } from '../constants/socialLinks';

const formatDate = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `Joined ${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
};

const formatCount = n => {
  if (!n || n < 0) return '0';
  if (n >= 1000000000) return (n / 1000000000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

const MAP_WIDTH = Dimensions.get('window').width - 32;
const MAP_HEIGHT = 220;

const ChannelAbout = ({
  channelAbout = '',
  channelName = '',
  createdAt,
  totalViews = 0,
  canEdit = false,
  onSave,
  socialLinks: initialSocialLinks = [],
  address: initialAddress = '',
  latitude: initialLatitude,
  longitude: initialLongitude,
}) => {
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [nickname, setNickname] = useState(channelName);
  const [about, setAbout] = useState(channelAbout);
  const [address, setAddress] = useState(initialAddress || '');
  const [latitude, setLatitude] = useState(initialLatitude != null ? String(initialLatitude) : '');
  const [longitude, setLongitude] = useState(initialLongitude != null ? String(initialLongitude) : '');
  const [socialLinks, setSocialLinks] = useState(() => {
    const links = Array.isArray(initialSocialLinks) && initialSocialLinks.length > 0
      ? initialSocialLinks.map(l => ({ type: l.type || 'others', url: l.url || '' }))
      : [{ type: 'facebook', url: '' }];
    return links;
  });
  const [saving, setSaving] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const mapsKeyCheckDone = useRef(false);

  useEffect(() => {
    setNickname(channelName);
    setAbout(channelAbout);
    setAddress(initialAddress || '');
    setLatitude(initialLatitude != null ? String(initialLatitude) : '');
    setLongitude(initialLongitude != null ? String(initialLongitude) : '');
    setSocialLinks(
      Array.isArray(initialSocialLinks) && initialSocialLinks.length > 0
        ? initialSocialLinks.map(l => ({ type: l.type || 'others', url: l.url || '' }))
        : [{ type: 'facebook', url: '' }],
    );
    }, [channelName, channelAbout, initialAddress, initialLatitude, initialLongitude, initialSocialLinks]);

  const handleSave = async () => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave({
        nickname: nickname.trim() || undefined,
        channelAbout: about.trim() || undefined,
        address: address.trim() || undefined,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        socialLinks: socialLinks.filter(l => (l.url || '').trim()).map(l => ({ type: l.type, url: (l.url || '').trim() })),
      });
      setEditModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || e.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const openEdit = () => {
    setNickname(channelName);
    setAbout(channelAbout);
    setAddress(initialAddress || '');
    setLatitude(initialLatitude != null ? String(initialLatitude) : '');
    setLongitude(initialLongitude != null ? String(initialLongitude) : '');
    setSocialLinks(
      Array.isArray(initialSocialLinks) && initialSocialLinks.length > 0
        ? initialSocialLinks.map(l => ({ type: l.type || 'others', url: l.url || '' }))
        : [{ type: 'facebook', url: '' }],
    );
    setEditModalVisible(true);
  };

  const handleUseMyLocation = () => {
    setLocationLoading(true);
    getCurrentPositionSafe(
      async pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLatitude(String(lat));
        setLongitude(String(lng));
        const addr = await reverseGeocode(lat, lng);
        if (addr) setAddress(addr);
        setLocationLoading(false);
      },
      err => {
        setLocationLoading(false);
        Alert.alert('Location', err || 'Could not get location.');
      },
    );
  };

  const displaySocialLinks = Array.isArray(initialSocialLinks) ? initialSocialLinks.filter(l => (l?.url || '').trim()) : [];
  const hasLocation = initialLatitude != null && initialLongitude != null;

  // Debug: log location and map key so console shows why map may not display
  const latNum = Number(initialLatitude);
  const lngNum = Number(initialLongitude);
  const validCoordsForLog = Number.isFinite(latNum) && Number.isFinite(lngNum) && latNum >= -90 && latNum <= 90 && lngNum >= -180 && lngNum <= 180;
  const hasKey = !!(config.googleMapsApiKey && config.googleMapsApiKey.trim().length > 0);
  console.log('[ChannelAbout] Location:', {
    initialLatitude,
    initialLongitude,
    hasLocation,
    validCoords: validCoordsForLog,
    lat: latNum,
    lng: lngNum,
    mapsApiKeySet: hasKey,
    mapsApiKeyPrefix: hasKey ? config.googleMapsApiKey.substring(0, 10) + '...' : 'MISSING',
  });
  // One-time check: validate Maps API key with Static Map request (logs to console)
  if (hasLocation && hasKey && validCoordsForLog && !mapsKeyCheckDone.current) {
    mapsKeyCheckDone.current = true;
    const testUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${latNum},${lngNum}&zoom=14&size=200x100&key=${config.googleMapsApiKey}`;
    fetch(testUrl)
      .then(res => {
        if (res.ok) console.log('[ChannelAbout] Maps API key: OK (Static Map responded 200)');
        else console.warn('[ChannelAbout] Maps API key: FAIL –', res.status, res.statusText, '(Enable "Maps SDK for Android" and "Static Map API" in Google Cloud, check key restrictions)');
      })
      .catch(err => console.warn('[ChannelAbout] Maps API key check request failed:', err.message));
  }

  return (
    <View style={styles.container}>
      {/* Description Section */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Description</Text>
          {canEdit && (
            <TouchableOpacity onPress={openEdit} style={styles.editButton}>
              <MaterialCommunityIcons name="pencil" size={18} color="#F97507" />
              <Text style={styles.editText}>Edit channel</Text>
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.descriptionText}>
          {channelAbout || (canEdit ? 'Add a description to tell viewers about your channel.' : 'No description.')}
        </Text>
      </View>

      {/* More Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Details</Text>
        {createdAt && (
          <View style={styles.infoItem}>
            <MaterialCommunityIcons name="calendar" size={24} color="#212121" />
            <Text style={styles.infoText}>{formatDate(createdAt)}</Text>
          </View>
        )}
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="chart-line-variant" size={24} color="#212121" />
          <Text style={styles.infoText}>{formatCount(totalViews)} views</Text>
        </View>
      </View>

      {/* Social links */}
      {(displaySocialLinks.length > 0 || canEdit) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social links</Text>
          {displaySocialLinks.length > 0 ? (
            <View style={styles.socialLinksRow}>
              {displaySocialLinks.map((link, index) => (
                <TouchableOpacity
                  key={`${link.type}-${index}`}
                  style={styles.socialLinkIconBtn}
                  onPress={() => {
                    const url = (link.url || '').trim();
                    if (url) Linking.openURL(url.startsWith('http') ? url : `https://${url}`);
                  }}
                >
                  <MaterialCommunityIcons
                    name={getSocialIcon(link.type)}
                    size={26}
                    color="#F97507"
                  />
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <Text style={styles.mutedText}>No social links added yet.</Text>
          )}
        </View>
      )}

      {/* Location map */}
      {(hasLocation || (initialAddress && initialAddress.trim())) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          {initialAddress ? (
            <Text style={styles.descriptionText}>{initialAddress}</Text>
          ) : null}
          {hasLocation && (() => {
            const lat = Number(initialLatitude);
            const lng = Number(initialLongitude);
            const validCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
            if (!validCoords) {
              console.warn('[ChannelAbout] Map not rendered: invalid coordinates', { lat, lng });
              return null;
            }
            console.log('[ChannelAbout] Rendering map at', { lat, lng });
            return (
              <View style={[styles.mapWrap, { width: MAP_WIDTH, height: MAP_HEIGHT }]}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={[styles.mapImage, { width: MAP_WIDTH, height: MAP_HEIGHT }]}
                  initialRegion={{
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.008,
                    longitudeDelta: 0.008,
                  }}
                  scrollEnabled
                  zoomEnabled
                  pitchEnabled={false}
                  rotateEnabled={false}
                  mapType="standard"
                  showsUserLocation={false}
                  loadingEnabled
                  loadingIndicatorColor="#F97507"
                  loadingBackgroundColor="#f2f2f2"
                >
                  <Marker
                    coordinate={{ latitude: lat, longitude: lng }}
                    title="Location"
                  />
                </MapView>
              </View>
            );
          })()}
        </View>
      )}

      {/* Edit Modal */}
      <Modal
        visible={editModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Text style={styles.modalCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Edit channel</Text>
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                style={[styles.modalSave, saving && styles.modalSaveDisabled]}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#F97507" />
                ) : (
                  <Text style={styles.modalSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Channel name</Text>
              <TextInput
                style={styles.input}
                value={nickname}
                onChangeText={setNickname}
                placeholder="Your channel name"
                placeholderTextColor="#999"
              />
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>About</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={about}
                onChangeText={setAbout}
                placeholder="Tell viewers about your channel"
                placeholderTextColor="#999"
                multiline
                numberOfLines={4}
              />
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Address / Location</Text>
              <TextInput
                style={styles.input}
                value={address}
                onChangeText={setAddress}
                placeholder="Your address (e.g. city, area)"
                placeholderTextColor="#999"
              />
              <TouchableOpacity style={styles.useLocationBtn} onPress={handleUseMyLocation} disabled={locationLoading}>
                {locationLoading ? (
                  <ActivityIndicator size="small" color="#F97507" />
                ) : (
                  <MaterialCommunityIcons name="map-marker" size={20} color="#F97507" />
                )}
                <Text style={styles.useLocationBtnText}>{locationLoading ? 'Getting...' : 'Use my location'}</Text>
              </TouchableOpacity>
              {(latitude !== '' && longitude !== '') && (
                <Image
                  source={{
                    uri: `https://maps.googleapis.com/maps/api/staticmap?center=${latitude},${longitude}&zoom=14&size=360x100&markers=${latitude},${longitude}&key=${config.googleMapsApiKey}`,
                  }}
                  style={styles.modalMapPreview}
                  resizeMode="cover"
                />
              )}
              <Text style={[styles.inputLabel, { marginTop: 16 }]}>Social links</Text>
              {socialLinks.map((link, index) => (
                <View key={index} style={styles.socialLinkRow}>
                  <Dropdown
                    style={styles.socialLinkDropdown}
                    data={SOCIAL_LINK_TYPES}
                    labelField="label"
                    valueField="value"
                    value={link.type}
                    onChange={item =>
                      setSocialLinks(prev =>
                        prev.map((l, i) => (i === index ? { ...l, type: item.value } : l)),
                      )
                    }
                    placeholder="Type"
                  />
                  <TextInput
                    style={styles.socialLinkInput}
                    placeholder="URL"
                    value={link.url}
                    onChangeText={text =>
                      setSocialLinks(prev =>
                        prev.map((l, i) => (i === index ? { ...l, url: text } : l)),
                      )
                    }
                    placeholderTextColor="#999"
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setSocialLinks(prev =>
                        prev.length > 1 ? prev.filter((_, i) => i !== index) : prev,
                      )
                    }
                  >
                    <MaterialCommunityIcons name="close-circle" size={24} color="#F97507" />
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={styles.addLinkBtn}
                onPress={() => setSocialLinks(prev => [...prev, { type: 'others', url: '' }])}
              >
                <MaterialCommunityIcons name="plus" size={20} color="#F97507" />
                <Text style={styles.addLinkBtnText}>Add link</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editText: {
    fontSize: 14,
    color: '#F97507',
    fontWeight: '600',
    marginLeft: 4,
  },
  descriptionText: {
    fontSize: 14,
    color: '#616161',
    lineHeight: 22,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: '#212121',
    marginLeft: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
  },
  modalCancel: {
    fontSize: 16,
    color: '#616161',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  modalSave: {
    minWidth: 60,
    alignItems: 'flex-end',
  },
  modalSaveDisabled: {
    opacity: 0.6,
  },
  modalSaveText: {
    fontSize: 16,
    color: '#F97507',
    fontWeight: '600',
  },
  modalBody: {
    padding: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#212121',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  socialLinksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 8,
  },
  socialLinkIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF4EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mutedText: {
    fontSize: 14,
    color: '#9e9e9e',
    marginTop: 4,
  },
  mapWrap: {
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#f2f2f2',
  },
  mapImage: {
    borderRadius: 8,
  },
  mapFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
  },
  modalBodyScroll: {
    maxHeight: Dimensions.get('window').height * 0.6,
    padding: 16,
  },
  useLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: '#FFF4EB',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F97507',
  },
  useLocationBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97507',
  },
  modalMapPreview: {
    width: '100%',
    height: 100,
    borderRadius: 8,
    marginTop: 8,
    backgroundColor: '#f2f2f2',
  },
  socialLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  socialLinkDropdown: {
    flex: 1.2,
    height: 44,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  socialLinkInput: {
    flex: 2,
    height: 44,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    fontSize: 14,
  },
  addLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    marginBottom: 16,
  },
  addLinkBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F97507',
  },
});

export default ChannelAbout;
