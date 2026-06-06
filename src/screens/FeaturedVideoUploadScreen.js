import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { getUsers, getUser } from '../services/adminUserService';
import { createFeatured } from '../services/featuredService';
import { uploadVideo } from '../services/videoService';
import { launchImageLibrary } from 'react-native-image-picker';
import VideoCoverPickerModal from '../components/VideoCoverPickerModal';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

const canUseFeaturedUpload = roleNorm => {
  const r = String(roleNorm || '').toLowerCase();
  return (
    r === 'owner' ||
    r === 'admin' ||
    r === 'superadmin' ||
    r === 'super_admin' ||
    r === 'super-admin'
  );
};

const KEYBOARD_SCROLL_OFFSET = 120;

const FeaturedVideoUploadScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useSelector(s => s.app) || {};
  const roleNorm = String(user?.role || '').toLowerCase();
  const isAdminUser =
    roleNorm === 'admin' ||
    roleNorm === 'superadmin' ||
    roleNorm === 'super_admin' ||
    roleNorm === 'super-admin';
  const isOwnerUser = roleNorm === 'owner';

  const [featuredForm, setFeaturedForm] = useState({
    ownerId: '',
    title: '',
    areaName: '',
    latitude: '',
    longitude: '',
    radiusKm: '2',
    startDate: '',
    endDate: '',
    amountPaid: '0',
    currency: 'GBP',
  });
  const [featuredVideoFile, setFeaturedVideoFile] = useState(null);
  const [featuredThumbnailFile, setFeaturedThumbnailFile] = useState(null);
  const [featuredOwnerSearchQuery, setFeaturedOwnerSearchQuery] = useState('');
  const [featuredOwnerSearchResults, setFeaturedOwnerSearchResults] = useState(
    [],
  );
  const [featuredOwnerSearchLoading, setFeaturedOwnerSearchLoading] =
    useState(false);
  const [selectedFeaturedOwner, setSelectedFeaturedOwner] = useState(null);
  const featuredOwnerSearchTimeoutRef = useRef(null);
  const scrollRef = useRef(null);
  const fieldLayoutsRef = useRef({});
  const lastFocusedFieldRef = useRef(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [myFeaturedProfile, setMyFeaturedProfile] = useState(null);
  const [myFeaturedProfileLoading, setMyFeaturedProfileLoading] =
    useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [coverPickerVisible, setCoverPickerVisible] = useState(false);

  useEffect(() => {
    if (!user?.id || !canUseFeaturedUpload(user?.role)) {
      Alert.alert('Unavailable', 'Featured upload is for owners and admins.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  }, [user?.id, user?.role, navigation]);

  const registerFieldLayout = useCallback((key, y) => {
    fieldLayoutsRef.current[key] = y;
  }, []);

  const scrollFieldIntoView = useCallback(key => {
    const delay = Platform.OS === 'ios' ? 280 : 120;
    setTimeout(() => {
      const y = fieldLayoutsRef.current[key];
      if (typeof y !== 'number' || !scrollRef.current?.scrollTo) return;
      scrollRef.current.scrollTo({
        y: Math.max(0, y - KEYBOARD_SCROLL_OFFSET),
        animated: true,
      });
    }, delay);
  }, []);

  useEffect(() => {
    const showEvt =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, e => {
      setKeyboardHeight(Number(e?.endCoordinates?.height || 0));
      if (lastFocusedFieldRef.current) {
        scrollFieldIntoView(lastFocusedFieldRef.current);
      }
    });
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [scrollFieldIntoView]);

  const fieldSectionProps = useCallback(
    key => ({
      onLayout: e => registerFieldLayout(key, e.nativeEvent.layout.y),
    }),
    [registerFieldLayout],
  );

  const inputFocusProps = useCallback(
    key => ({
      onFocus: () => {
        lastFocusedFieldRef.current = key;
        scrollFieldIntoView(key);
      },
    }),
    [scrollFieldIntoView],
  );

  const searchFeaturedOwners = useCallback(async query => {
    setFeaturedOwnerSearchLoading(true);
    try {
      const res = await getUsers({
        role: 'owner',
        search: query && query.trim() ? query.trim() : undefined,
        getAll: true,
      });
      setFeaturedOwnerSearchResults(res?.data || []);
    } catch (e) {
      setFeaturedOwnerSearchResults([]);
    } finally {
      setFeaturedOwnerSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAdminUser) return;
    if (featuredOwnerSearchTimeoutRef.current)
      clearTimeout(featuredOwnerSearchTimeoutRef.current);
    featuredOwnerSearchTimeoutRef.current = setTimeout(() => {
      searchFeaturedOwners(featuredOwnerSearchQuery);
    }, 400);
    return () => {
      if (featuredOwnerSearchTimeoutRef.current)
        clearTimeout(featuredOwnerSearchTimeoutRef.current);
    };
  }, [featuredOwnerSearchQuery, isAdminUser, searchFeaturedOwners]);

  useEffect(() => {
    if (!isOwnerUser || !user?.id) return;
    let cancelled = false;
    setMyFeaturedProfileLoading(true);
    getUser(user.id)
      .then(res => {
        const profile = res?.user || res;
        if (cancelled) return;
        setMyFeaturedProfile(profile || null);
        setFeaturedForm(p => ({
          ...p,
          areaName: profile?.address
            ? String(profile.address).trim()
            : p.areaName,
          latitude:
            profile?.latitude != null ? String(profile.latitude) : p.latitude,
          longitude:
            profile?.longitude != null
              ? String(profile.longitude)
              : p.longitude,
        }));
      })
      .catch(() => {
        if (!cancelled) setMyFeaturedProfile(null);
      })
      .finally(() => {
        if (!cancelled) setMyFeaturedProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isOwnerUser, user?.id]);

  const pickFeaturedVideo = () => {
    launchImageLibrary({ mediaType: 'video', videoQuality: 'high' }, res => {
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('Error', res.errorMessage || 'Failed to pick video');
        return;
      }
      if (res.assets?.[0]) {
        setFeaturedVideoFile(res.assets[0]);
        setFeaturedThumbnailFile(null);
      }
    });
  };

  const openThumbnailFromVideo = () => {
    if (!featuredVideoFile?.uri) {
      Alert.alert(
        'Select video first',
        'Choose a featured video before picking a thumbnail frame.',
      );
      return;
    }
    setCoverPickerVisible(true);
  };

  const pickFeaturedThumbnail = () => {
    launchImageLibrary({ mediaType: 'photo' }, res => {
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('Error', res.errorMessage || 'Failed to pick image');
        return;
      }
      if (res.assets?.[0]) setFeaturedThumbnailFile(res.assets[0]);
    });
  };

  const handleCreateFeatured = async () => {
    const {
      ownerId,
      title,
      areaName: featAreaName,
      radiusKm,
      startDate,
      endDate,
      amountPaid,
      currency,
    } = featuredForm;
    const isAdmin = isAdminUser;

    if (!featuredVideoFile || !featuredThumbnailFile) {
      Alert.alert('Error', 'Please select a video and a thumbnail');
      return;
    }
    if (isAdmin && !ownerId) {
      Alert.alert('Error', 'Please select the owner this featured is for');
      return;
    }
    if (isAdmin) {
      if (!selectedFeaturedOwner) {
        Alert.alert('Error', 'Please select the owner this featured is for');
        return;
      }
      if (
        selectedFeaturedOwner.latitude == null ||
        selectedFeaturedOwner.longitude == null
      ) {
        Alert.alert(
          'Error',
          'Selected owner has no saved location. Update owner profile first.',
        );
        return;
      }
    } else if (isOwnerUser) {
      const lat = myFeaturedProfile?.latitude ?? user?.latitude;
      const lng = myFeaturedProfile?.longitude ?? user?.longitude;
      if (lat == null || lng == null) {
        Alert.alert(
          'Error',
          'You have no saved location. Update your profile first.',
        );
        return;
      }
    }
    if (!startDate || !endDate || amountPaid === '') {
      Alert.alert('Error', 'Please fill Dates and Amount paid');
      return;
    }
    setSubmitLoading(true);
    try {
      const videoTitle =
        title || featAreaName
          ? `Featured - ${title || featAreaName}`
          : 'Featured video';
      const uploadRes = await uploadVideo({
        userId: user.id,
        title: videoTitle,
        videoUri: featuredVideoFile.uri,
        videoType: featuredVideoFile.type || 'video/mp4',
        videoName:
          featuredVideoFile.fileName ||
          featuredVideoFile.uri?.split('/').pop() ||
          'video.mp4',
        thumbnailUri: featuredThumbnailFile.uri,
        thumbnailType: featuredThumbnailFile.type || 'image/jpeg',
        thumbnailName:
          featuredThumbnailFile.fileName ||
          featuredThumbnailFile.uri?.split('/').pop() ||
          'thumb.jpg',
      });
      const finalVideoId = uploadRes?.video?.id || uploadRes?.id;
      if (!finalVideoId)
        throw new Error('Upload succeeded but no video ID returned');

      const body = {
        videoId: finalVideoId,
        radiusKm: parseFloat(radiusKm) || 2,
        startDate: new Date(startDate).toISOString(),
        endDate: new Date(endDate).toISOString(),
        amountPaid: parseFloat(amountPaid) || 0,
        currency: currency || 'GBP',
      };
      if (isAdmin) body.ownerId = ownerId;
      await createFeatured(user.token, body);
      Alert.alert('Success', 'Featured campaign created.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to create');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (!user?.id || !canUseFeaturedUpload(user?.role)) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="arrow-left" size={26} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Icon name="arrow-left" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload featured video</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 56 : 0}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom:
                SPACING.xxl +
                Math.max(0, keyboardHeight - insets.bottom) +
                24,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          automaticallyAdjustKeyboardInsets
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
        >
        {isAdminUser && (
          <>
            <Text style={styles.label}>
              1. Select owner (list shows only role: owner)
            </Text>
            {selectedFeaturedOwner ? (
              <View style={styles.selectedOwnerBox}>
                <Text style={styles.selectedOwnerName} numberOfLines={1}>
                  {selectedFeaturedOwner.nickname ||
                    selectedFeaturedOwner.name ||
                    selectedFeaturedOwner.email}
                </Text>
                {selectedFeaturedOwner.address ? (
                  <Text
                    style={styles.selectedOwnerAddress}
                    numberOfLines={2}
                  >
                    {selectedFeaturedOwner.address}
                  </Text>
                ) : null}
                <TouchableOpacity
                  onPress={() => {
                    setSelectedFeaturedOwner(null);
                    setFeaturedForm(p => ({
                      ...p,
                      ownerId: '',
                      areaName: '',
                      latitude: '',
                      longitude: '',
                    }));
                  }}
                  style={styles.changeOwnerBtn}
                >
                  <Text style={styles.changeOwnerBtnText}>Change owner</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  value={featuredOwnerSearchQuery}
                  onChangeText={setFeaturedOwnerSearchQuery}
                  placeholder="Search by name or email (email is unique)"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                />
                <Text style={[styles.hintText, { marginTop: 4 }]}>
                  Only owners listed. Type name or full email → select one,
                  address & location auto-fill.
                </Text>
                {featuredOwnerSearchLoading ? (
                  <ActivityIndicator
                    size="small"
                    style={{ marginVertical: 8 }}
                    color={COLORS.primaryOrange}
                  />
                ) : featuredOwnerSearchResults.length > 0 ? (
                  <ScrollView
                    style={styles.ownerSearchList}
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                  >
                    {featuredOwnerSearchResults.map(o => (
                      <TouchableOpacity
                        key={o.id}
                        style={styles.ownerSearchItem}
                        onPress={() => {
                          setFeaturedOwnerSearchLoading(true);
                          getUser(o.id)
                            .then(res => {
                              const profile = res?.user || res || o;
                              setSelectedFeaturedOwner(profile);
                              setFeaturedForm(p => ({
                                ...p,
                                ownerId: profile?.id || o.id,
                                areaName: profile?.address
                                  ? String(profile.address).trim()
                                  : '',
                                latitude:
                                  profile?.latitude != null
                                    ? String(profile.latitude)
                                    : '',
                                longitude:
                                  profile?.longitude != null
                                    ? String(profile.longitude)
                                    : '',
                              }));
                              setFeaturedOwnerSearchQuery('');
                              setFeaturedOwnerSearchResults([]);
                            })
                            .catch(() => {
                              setSelectedFeaturedOwner(o);
                              setFeaturedForm(p => ({
                                ...p,
                                ownerId: o.id,
                                areaName: o.address
                                  ? String(o.address).trim()
                                  : '',
                                latitude:
                                  o.latitude != null
                                    ? String(o.latitude)
                                    : '',
                                longitude:
                                  o.longitude != null
                                    ? String(o.longitude)
                                    : '',
                              }));
                              setFeaturedOwnerSearchQuery('');
                              setFeaturedOwnerSearchResults([]);
                            })
                            .finally(() =>
                              setFeaturedOwnerSearchLoading(false),
                            );
                        }}
                      >
                        <Text style={styles.ownerSearchItemName} numberOfLines={1}>
                          {o.nickname || o.name || o.email}
                        </Text>
                        {o.address ? (
                          <Text
                            style={styles.ownerSearchItemAddress}
                            numberOfLines={1}
                          >
                            {o.address}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : featuredOwnerSearchQuery.trim() ? (
                  <Text style={styles.hintText}>
                    No owners found. Try another search.
                  </Text>
                ) : (
                  <Text style={styles.hintText}>
                    Type to search owners (name or email).
                  </Text>
                )}
              </>
            )}
          </>
        )}

        <View {...fieldSectionProps('title')}>
          <Text style={styles.label}>Title (optional)</Text>
          <TextInput
            style={styles.input}
            value={featuredForm.title}
            onChangeText={t => setFeaturedForm(p => ({ ...p, title: t }))}
            placeholder="e.g. My featured promo"
            placeholderTextColor="#999"
            {...inputFocusProps('title')}
          />
        </View>
        <Text style={styles.label}>Video (required)</Text>
        <TouchableOpacity
          style={[styles.primaryBtn, { marginVertical: 4 }]}
          onPress={pickFeaturedVideo}
        >
          <Text style={styles.primaryBtnText}>
            {featuredVideoFile
              ? featuredVideoFile.fileName || 'Video selected'
              : 'Pick video'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.label}>Thumbnail (required)</Text>
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            { marginVertical: 4 },
            !featuredVideoFile?.uri && styles.primaryBtnDisabled,
          ]}
          onPress={openThumbnailFromVideo}
          disabled={!featuredVideoFile?.uri}
        >
          <Text style={styles.primaryBtnText}>
            {featuredThumbnailFile
              ? featuredThumbnailFile.fileName || 'Thumbnail selected'
              : 'Choose thumbnail from video'}
          </Text>
        </TouchableOpacity>
        <Text style={styles.thumbHint}>
          Pick a frame from your video, or use a photo from the gallery below.
        </Text>
        <TouchableOpacity
          style={styles.galleryThumbLink}
          onPress={pickFeaturedThumbnail}
        >
          <Text style={styles.galleryThumbLinkText}>
            Or pick cover photo from gallery
          </Text>
        </TouchableOpacity>
        <Text style={styles.label}>Location</Text>
        <View style={styles.selectedOwnerBox}>
          {isAdminUser ? (
            !selectedFeaturedOwner ? (
              <Text style={styles.hintText}>
                Select an owner first. Location will be taken from that
                owner&apos;s profile.
              </Text>
            ) : selectedFeaturedOwner?.address ? (
              <Text style={styles.selectedOwnerAddress}>
                {selectedFeaturedOwner.address}
              </Text>
            ) : (
              <Text style={styles.hintText}>
                Selected owner has no address/location saved. Please update the
                owner profile first.
              </Text>
            )
          ) : myFeaturedProfileLoading ? (
            <Text style={styles.hintText}>Loading your saved location…</Text>
          ) : myFeaturedProfile?.address || user?.address ? (
            <Text style={styles.selectedOwnerAddress}>
              {myFeaturedProfile?.address || user?.address}
            </Text>
          ) : (
            <Text style={styles.hintText}>
              You have no address/location saved. Please update your profile
              first.
            </Text>
          )}
        </View>
        <View {...fieldSectionProps('radius')}>
          <Text style={styles.label}>Radius (km)</Text>
          <TextInput
            style={styles.input}
            value={featuredForm.radiusKm}
            onChangeText={t => setFeaturedForm(p => ({ ...p, radiusKm: t }))}
            placeholder="2"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
            {...inputFocusProps('radius')}
          />
        </View>
        <View {...fieldSectionProps('startDate')}>
          <Text style={styles.label}>Start date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={featuredForm.startDate}
            onChangeText={t => setFeaturedForm(p => ({ ...p, startDate: t }))}
            placeholder="2026-02-18"
            placeholderTextColor="#999"
            {...inputFocusProps('startDate')}
          />
        </View>
        <View {...fieldSectionProps('endDate')}>
          <Text style={styles.label}>End date (YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            value={featuredForm.endDate}
            onChangeText={t => setFeaturedForm(p => ({ ...p, endDate: t }))}
            placeholder="2026-03-18"
            placeholderTextColor="#999"
            {...inputFocusProps('endDate')}
          />
        </View>
        <View {...fieldSectionProps('amountPaid')}>
          <Text style={styles.label}>Amount paid</Text>
          <TextInput
            style={styles.input}
            value={featuredForm.amountPaid}
            onChangeText={t => setFeaturedForm(p => ({ ...p, amountPaid: t }))}
            placeholder="0"
            placeholderTextColor="#999"
            keyboardType="decimal-pad"
            {...inputFocusProps('amountPaid')}
          />
        </View>
        <View {...fieldSectionProps('currency')}>
          <Text style={styles.label}>Currency</Text>
          <TextInput
            style={styles.input}
            value={featuredForm.currency}
            onChangeText={t => setFeaturedForm(p => ({ ...p, currency: t }))}
            placeholder="GBP"
            placeholderTextColor="#999"
            {...inputFocusProps('currency')}
          />
        </View>

        <View {...fieldSectionProps('submit')}>
          <TouchableOpacity
            style={[styles.submitBtn, submitLoading && { opacity: 0.7 }]}
            onPress={handleCreateFeatured}
            disabled={submitLoading}
          >
            {submitLoading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.submitBtnText}>Create featured campaign</Text>
            )}
          </TouchableOpacity>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <VideoCoverPickerModal
        visible={coverPickerVisible}
        onClose={() => setCoverPickerVisible(false)}
        videoUri={featuredVideoFile?.uri}
        durationSec={featuredVideoFile?.duration}
        title="Select featured thumbnail"
        onSelect={frame => {
          const uri = frame?.uri
            ? String(frame.uri).startsWith('file://')
              ? frame.uri
              : `file://${frame.uri}`
            : '';
          if (!uri) return;
          setFeaturedThumbnailFile({
            uri,
            type: frame.type || 'image/jpeg',
            fileName: frame.fileName || 'thumb.jpg',
          });
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerBtn: { width: 40 },
  headerTitle: {
    flex: 1,
    fontSize: FONTS.lg,
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
  },
  scroll: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollContent: {
    padding: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  label: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    fontSize: FONTS.base,
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primaryOrange,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  primaryBtnText: { color: COLORS.white, fontWeight: '600', fontSize: FONTS.sm },
  primaryBtnDisabled: { opacity: 0.45 },
  thumbHint: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
    marginBottom: 6,
  },
  galleryThumbLink: {
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 4,
  },
  galleryThumbLinkText: {
    fontSize: FONTS.sm,
    color: COLORS.primaryOrange,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  selectedOwnerBox: {
    borderWidth: 1,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginVertical: 6,
    backgroundColor: COLORS.gray100 || '#f5f5f5',
  },
  selectedOwnerName: {
    fontSize: FONTS.base,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  selectedOwnerAddress: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  changeOwnerBtn: { marginTop: 8, alignSelf: 'flex-start' },
  changeOwnerBtnText: {
    fontSize: FONTS.sm,
    color: COLORS.primaryOrange,
    fontWeight: '600',
  },
  ownerSearchList: { maxHeight: 160, marginVertical: 6 },
  ownerSearchItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  ownerSearchItemName: {
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  ownerSearchItemAddress: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  hintText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginVertical: 8,
  },
  submitBtn: {
    marginTop: SPACING.xl,
    backgroundColor: COLORS.primaryOrange,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
  },
  submitBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: FONTS.base,
  },
});

export default FeaturedVideoUploadScreen;
