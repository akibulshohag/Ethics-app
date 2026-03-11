import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

import {
  getChannelProfile,
  updateChannelProfile,
  uploadProfilePhoto,
  uploadCoverImage,
} from '../services/channelService';
import { getUserVideos, getLikedVideos } from '../services/videoService';
import { shortsService } from '../services/shortsService';
import { getWatchLater } from '../services/playlistService';
import { getNearbyPromotions } from '../services/promotionService';
import { appSetUser } from '../redux/actions/appSlice';
import { safeImageUri } from '../utils/helper';

const { width } = Dimensions.get('window');

const SOCIAL_TYPES = [
  { value: 'instagram', label: 'Instagram', icon: 'instagram' },
  { value: 'facebook', label: 'Facebook', icon: 'facebook' },
  { value: 'x', label: 'X (Twitter)', icon: 'twitter' },
  { value: 'google_email', label: 'Google / Email', icon: 'email-outline' },
  { value: 'website', label: 'Website', icon: 'web' },
];

const PromotionScreen = ({ onBack }) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.app?.user);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [savedItems, setSavedItems] = useState([]);
  const [savedLoading, setSavedLoading] = useState(false);
  const [myVideos, setMyVideos] = useState([]);
  const [myVideosLoading, setMyVideosLoading] = useState(false);
  const [mostLikedItems, setMostLikedItems] = useState([]);
  const [mostLikedLoading, setMostLikedLoading] = useState(false);
  const [nearbyPromotions, setNearbyPromotions] = useState([]);
  const [promotionsLoading, setPromotionsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editChannelAbout, setEditChannelAbout] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editSocialLinks, setEditSocialLinks] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const userId = currentUser?.id;
  const displayName =
    profile?.nickname ||
    profile?.name ||
    currentUser?.nickname ||
    currentUser?.name ||
    'User';
  const displayLocation = profile?.address || currentUser?.address || '';
  const bio = profile?.channelAbout || currentUser?.channelAbout || '';
  // Avatar from API profile first (channelAvatar), same as BusinessProfileViewScreen / BusinessProfileCard
  const avatarUri =
    profile?.channelAvatar ||
    profile?.photos?.[0]?.src ||
    currentUser?.photos?.[0]?.src ||
    (Array.isArray(currentUser?.photos) && currentUser?.photos[0]?.src) ||
    (currentUser?.photos?.[0] &&
      (typeof currentUser.photos[0] === 'string'
        ? currentUser.photos[0]
        : currentUser.photos[0]?.src));
  const coverUri =
    profile?.coverUrl ||
    profile?.coverImage ||
    'https://images.unsplash.com/photo-1552566626-52f8b828add9';

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    setProfileLoading(true);
    try {
      const data = await getChannelProfile(userId, userId);
      setProfile(data);
    } catch (e) {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [userId]);

  const loadSaved = useCallback(async () => {
    if (!userId) return;
    setSavedLoading(true);
    try {
      const res = await getWatchLater(userId, 1, 30);
      setSavedItems(res?.items ?? []);
    } catch (e) {
      setSavedItems([]);
    } finally {
      setSavedLoading(false);
    }
  }, [userId]);

  const loadMyVideos = useCallback(async () => {
    if (!userId) return;
    setMyVideosLoading(true);
    try {
      const [vRes, sRes] = await Promise.all([
        getUserVideos(userId, 1, 30),
        shortsService.getUserShorts(userId, 1, 30),
      ]);
      const videos = (vRes?.videos ?? []).map(v => ({
        ...v,
        type: 'video',
        id: v.id,
        thumbnailUrl: v.thumbnailUrl,
        title: v.title,
      }));
      const shorts = (sRes?.shorts ?? []).map(s => ({
        ...s,
        type: 'short',
        id: s.id,
        thumbnailUrl: s.thumbnailUrl || s.coverUrl,
        title: s.title || 'Short',
      }));
      setMyVideos([...videos, ...shorts]);
    } catch (e) {
      setMyVideos([]);
    } finally {
      setMyVideosLoading(false);
    }
  }, [userId]);

  const loadMostLiked = useCallback(async () => {
    if (!userId) return;
    setMostLikedLoading(true);
    try {
      const [vRes, sRes] = await Promise.all([
        getLikedVideos(userId, 1, 30),
        shortsService.getLikedShorts(userId, 1, 30),
      ]);
      const videos = (vRes?.videos ?? []).map(v => ({ ...v, type: 'video' }));
      const shorts = (sRes?.shorts ?? []).map(s => ({ ...s, type: 'short' }));
      setMostLikedItems([...videos, ...shorts]);
    } catch (e) {
      setMostLikedItems([]);
    } finally {
      setMostLikedLoading(false);
    }
  }, [userId]);

  const loadNearbyPromotions = useCallback(async () => {
    const lat = currentUser?.latitude ?? profile?.latitude ?? 23.8103;
    const lng = currentUser?.longitude ?? profile?.longitude ?? 90.4125;
    setPromotionsLoading(true);
    try {
      const res = await getNearbyPromotions(lat, lng, 50, 1, 30);
      setNearbyPromotions(res?.promotions ?? []);
    } catch (e) {
      setNearbyPromotions([]);
    } finally {
      setPromotionsLoading(false);
    }
  }, [
    currentUser?.latitude,
    currentUser?.longitude,
    profile?.latitude,
    profile?.longitude,
  ]);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId, loadProfile]);

  useEffect(() => {
    if (userId) {
      loadSaved();
      loadMyVideos();
      loadMostLiked();
      loadNearbyPromotions();
    }
  }, [userId, loadSaved, loadMyVideos, loadMostLiked, loadNearbyPromotions]);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await Promise.all([
      loadProfile(),
      loadSaved(),
      loadMyVideos(),
      loadMostLiked(),
      loadNearbyPromotions(),
    ]);
    setRefreshing(false);
  }, [
    userId,
    loadProfile,
    loadSaved,
    loadMyVideos,
    loadMostLiked,
    loadNearbyPromotions,
  ]);

  const openEditProfile = () => {
    const links = profile?.socialLinks ?? currentUser?.socialLinks ?? [];
    const linkMap = Array.isArray(links)
      ? links.reduce((acc, l) => ({ ...acc, [l.type]: l.url || '' }), {})
      : {};
    setEditName(profile?.name ?? currentUser?.name ?? '');
    setEditNickname(
      profile?.nickname ?? profile?.channelName ?? currentUser?.nickname ?? '',
    );
    setEditChannelAbout(
      profile?.channelAbout ?? currentUser?.channelAbout ?? '',
    );
    setEditPhone(currentUser?.phone ?? profile?.phone ?? '');
    setEditAddress(profile?.address ?? currentUser?.address ?? '');
    setEditSocialLinks(
      SOCIAL_TYPES.map(t => ({ type: t.value, url: linkMap[t.value] || '' })),
    );
    setEditProfileVisible(true);
  };

  const saveProfile = async () => {
    if (!userId) return;
    setSavingProfile(true);
    try {
      const socialLinks = editSocialLinks
        .map(l => ({
          type: (l.type || 'website').trim(),
          url: (l.url || '').trim(),
        }))
        .filter(l => l.url);
      await updateChannelProfile(userId, {
        name: editName.trim() || undefined,
        nickname: editNickname.trim() || undefined,
        channelAbout: editChannelAbout.trim() || undefined,
        phone: editPhone.trim() || undefined,
        address: editAddress.trim() || undefined,
        socialLinks: socialLinks.length ? socialLinks : undefined,
      });
      await loadProfile();
      dispatch(
        appSetUser({
          ...currentUser,
          name: editName.trim() || currentUser.name,
          nickname: editNickname.trim() || currentUser.nickname,
          channelAbout: editChannelAbout.trim() || currentUser.channelAbout,
          phone: editPhone.trim() || currentUser.phone,
          address: editAddress.trim() || currentUser.address,
          socialLinks: socialLinks.length
            ? socialLinks
            : currentUser.socialLinks,
        }),
      );
      setEditProfileVisible(false);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const updateSocialLinkUrl = (idx, value) => {
    setEditSocialLinks(prev =>
      prev.map((l, i) => (i === idx ? { ...l, url: value } : l)),
    );
  };

  const handleCoverPress = () => {
    if (!userId || uploadingCover) return;
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async res => {
      if (res.didCancel || res.errorCode || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setUploadingCover(true);
      try {
        await uploadCoverImage(userId, {
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || 'cover.jpg',
        });
        await loadProfile();
      } catch (e) {
        Alert.alert('Error', e?.message || 'Failed to upload cover image');
      } finally {
        setUploadingCover(false);
      }
    });
  };

  const handleAvatarPress = () => {
    if (!userId || uploadingAvatar) return;
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async res => {
      if (res.didCancel || res.errorCode || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setUploadingAvatar(true);
      try {
        const data = await uploadProfilePhoto(userId, {
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || 'avatar.jpg',
        });
        await loadProfile();
        const photoUrl = data?.photoUrl || data?.userUpdate?.photos?.[0]?.src;
        if (photoUrl) {
          dispatch(
            appSetUser({
              ...currentUser,
              photos: [{ title: 'avatar', src: photoUrl }],
            }),
          );
        }
      } catch (e) {
        Alert.alert('Error', e?.message || 'Failed to upload photo');
      } finally {
        setUploadingAvatar(false);
      }
    });
  };

  const getThumbnailForItem = item => {
    if (item.thumbnailUrl) return safeImageUri(item.thumbnailUrl);
    if (item.type === 'short' && item.coverUrl)
      return safeImageUri(item.coverUrl);
    return 'https://via.placeholder.com/200';
  };

  const handleMessagePress = () => {
    navigation.navigate('MessageList');
  };

  if (!currentUser?.id) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
        <View style={styles.navBar}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn}>
            <Icon name="chevron-left" size={18} color="#FFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.loginPrompt}>
            Please log in to view your profile.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      <View style={styles.navBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="chevron-left" size={18} color="#FFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.navRight} onPress={handleMessagePress}>
          <Text style={styles.messageLabel}>Message</Text>
          <Icon name="message-text-outline" size={24} color="#1A1A1A" />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF7F0B']}
            tintColor="#FF7F0B"
          />
        }
      >
        {/* Profile header: cover image as background, no extra top block */}
        <View style={styles.profileHeaderWithCover}>
          <Image
            source={{ uri: safeImageUri(coverUri) }}
            style={styles.profileCoverBg}
            resizeMode="cover"
          />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)']}
            style={styles.profileCoverGradient}
          />
          <TouchableOpacity
            style={styles.coverChangeTouch}
            onPress={handleCoverPress}
            activeOpacity={0.9}
            disabled={uploadingCover}
          />
          {uploadingCover && (
            <View style={styles.coverLoadingOverlay}>
              <ActivityIndicator size="large" color="#FFF" />
              <Text style={styles.coverLoadingText}>Updating cover...</Text>
            </View>
          )}
          {!uploadingCover && (
            <View style={styles.coverEditHint} pointerEvents="none">
              <Icon name="image-plus" size={20} color="rgba(255,255,255,0.9)" />
              <Text style={styles.coverEditHintText}>Change cover photo</Text>
            </View>
          )}
          <View style={styles.headerWrapper}>
            <View style={styles.profileHeaderCard}>
              {profileLoading && !profile ? (
                <ActivityIndicator
                  size="large"
                  color="#FFF"
                  style={{ marginVertical: 20 }}
                />
              ) : (
                <>
                  <View style={styles.brandRow}>
                    <TouchableOpacity
                      style={styles.avatarBorder}
                      onPress={handleAvatarPress}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? (
                        <ActivityIndicator
                          size="small"
                          color="#FFF"
                          style={styles.avatar}
                        />
                      ) : (
                        <Image
                          source={{
                            uri: avatarUri
                              ? safeImageUri(avatarUri)
                              : `https://ui-avatars.com/api/?name=${encodeURIComponent(
                                  displayName,
                                )}&background=333&color=fff`,
                          }}
                          style={styles.avatar}
                        />
                      )}
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.userName}>{displayName}</Text>
                  <Text style={styles.userLocation}>
                    {displayLocation || '—'}
                  </Text>

                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.editProfileBtn}
                      onPress={openEditProfile}
                      activeOpacity={0.8}
                    >
                      <Icon name="pencil" size={20} color="#1A1A1A" />
                      <Text style={styles.editProfileBtnText}>
                        Edit Profile
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      activeOpacity={0.8}
                      onPress={handleAvatarPress}
                    >
                      <Icon name="camera" size={22} color="#1A1A1A" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={handleMessagePress}
                      activeOpacity={0.8}
                    >
                      <Icon
                        name="message-text-outline"
                        size={22}
                        color="#1A1A1A"
                      />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
            <View style={styles.bioContainer}>
              <View style={styles.bioContentRow}>
                <Text style={styles.bioText} numberOfLines={4}>
                  {bio || 'No description yet.'}
                </Text>
                <TouchableOpacity
                  style={styles.editIcon}
                  onPress={openEditProfile}
                >
                  <Icon name="pencil-box-outline" size={22} color="#999" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
        {/* MOST LIKED VIDEOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Most Liked Videos</Text>
          {mostLikedLoading && mostLikedItems.length === 0 ? (
            <ActivityIndicator
              size="small"
              color="#FF7F0B"
              style={{ marginVertical: 12 }}
            />
          ) : mostLikedItems.length === 0 ? (
            <Text style={styles.emptyHint}>
              Videos you like will appear here.
            </Text>
          ) : (
            <View style={styles.videoGrid}>
              {mostLikedItems.slice(0, 6).map((item, idx) => (
                <TouchableOpacity
                  key={item.id || idx}
                  style={styles.thumbnailContainer}
                  onPress={() =>
                    item.type === 'video'
                      ? navigation.navigate('HomeOne', { openVideoId: item.id })
                      : navigation.navigate('HomeOne', { openShortId: item.id })
                  }
                >
                  <Image
                    source={{ uri: getThumbnailForItem(item) }}
                    style={styles.thumbnail}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* PROMOTIONS (nearby) */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promotions (nearby)</Text>
          {promotionsLoading && nearbyPromotions.length === 0 ? (
            <ActivityIndicator
              size="small"
              color="#FF7F0B"
              style={{ marginVertical: 12 }}
            />
          ) : nearbyPromotions.length === 0 ? (
            <Text style={styles.emptyHint}>
              No promotions near you right now.
            </Text>
          ) : (
            <View style={styles.promoGrid}>
              {nearbyPromotions.slice(0, 8).map((p, idx) => (
                <TouchableOpacity
                  key={p.id || idx}
                  style={[
                    styles.promoBtn,
                    idx % 2 === 0 ? styles.bgOrange : styles.bgDarkBlue,
                  ]}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate('PromotionDetail', { promotion: p })
                  }
                >
                  <Text style={styles.promoBtnText} numberOfLines={1}>
                    {p.title || p.user?.nickname || p.user?.name || 'Promo'}
                  </Text>
                  {p.promoCode ? (
                    <Text style={styles.promoCodeText} numberOfLines={1}>
                      {p.promoCode}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* SAVED VIDEOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Videos</Text>
          {savedLoading && savedItems.length === 0 ? (
            <ActivityIndicator
              size="small"
              color="#FF7F0B"
              style={{ marginVertical: 12 }}
            />
          ) : savedItems.length === 0 ? (
            <Text style={styles.emptyHint}>Save videos to watch later.</Text>
          ) : (
            <View style={styles.videoGrid}>
              {savedItems.slice(0, 6).map((item, idx) => (
                <TouchableOpacity
                  key={item.id || idx}
                  style={styles.thumbnailContainer}
                  onPress={() =>
                    navigation.navigate(
                      'HomeOne',
                      item.type === 'video'
                        ? { openVideoId: item.id }
                        : { openShortId: item.id },
                    )
                  }
                >
                  <Image
                    source={{ uri: getThumbnailForItem(item) }}
                    style={styles.thumbnail}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* MY VIDEOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Videos</Text>
          {myVideosLoading && myVideos.length === 0 ? (
            <ActivityIndicator
              size="small"
              color="#FF7F0B"
              style={{ marginVertical: 12 }}
            />
          ) : myVideos.length === 0 ? (
            <Text style={styles.emptyHint}>Your uploads will appear here.</Text>
          ) : (
            <View style={styles.videoGrid}>
              {myVideos.slice(0, 6).map((item, idx) => (
                <TouchableOpacity
                  key={item.id || idx}
                  style={styles.thumbnailContainer}
                  onPress={() =>
                    navigation.navigate(
                      'HomeOne',
                      item.type === 'video'
                        ? { openVideoId: item.id }
                        : { openShortId: item.id },
                    )
                  }
                >
                  <Image
                    source={{ uri: getThumbnailForItem(item) }}
                    style={styles.thumbnail}
                  />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomArrow}>
          <Icon name="chevron-down" size={40} color="#333" />
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal
        visible={editProfileVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !savingProfile && setEditProfileVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.editModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.editModalBackdrop} />
          <View style={styles.editModalBox}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => !savingProfile && setEditProfileVisible(false)}
                disabled={savingProfile}
              >
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.editModalScroll}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.editLabel}>Name</Text>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Name"
                placeholderTextColor="#999"
              />
              <Text style={styles.editLabel}>Nickname</Text>
              <TextInput
                style={styles.editInput}
                value={editNickname}
                onChangeText={setEditNickname}
                placeholder="Display name"
                placeholderTextColor="#999"
              />
              <Text style={styles.editLabel}>Description</Text>
              <TextInput
                style={[styles.editInput, styles.editInputMultiline]}
                value={editChannelAbout}
                onChangeText={setEditChannelAbout}
                placeholder="About you or your business"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
              <Text style={styles.editLabel}>Phone</Text>
              <TextInput
                style={styles.editInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Phone"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
              <Text style={styles.editLabel}>Address</Text>
              <TextInput
                style={styles.editInput}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Address / Location"
                placeholderTextColor="#999"
              />
              <Text style={[styles.editLabel, { marginTop: 16 }]}>
                Social links
              </Text>
              <View style={styles.socialLinksCard}>
                {SOCIAL_TYPES.map((t, idx) => (
                  <View
                    key={t.value}
                    style={[
                      styles.socialLinkRow,
                      idx === SOCIAL_TYPES.length - 1 &&
                        styles.socialLinkRowLast,
                    ]}
                  >
                    <View style={styles.socialLinkLabelWrap}>
                      <Icon
                        name={t.icon}
                        size={20}
                        color="#555"
                        style={styles.socialLinkIcon}
                      />
                      <Text style={styles.socialLinkLabel} numberOfLines={1}>
                        {t.label}
                      </Text>
                    </View>
                    <TextInput
                      style={styles.socialLinkInput}
                      value={editSocialLinks[idx]?.url ?? ''}
                      onChangeText={v => updateSocialLinkUrl(idx, v)}
                      placeholder="https://..."
                      placeholderTextColor="#999"
                      autoCapitalize="none"
                      keyboardType="url"
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[
                styles.editSaveBtn,
                savingProfile && styles.editSaveBtnDisabled,
              ]}
              onPress={saveProfile}
              disabled={savingProfile}
            >
              <Text style={styles.editSaveBtnText}>
                {savingProfile ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollContent: { paddingBottom: 40 },
  coverLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverLoadingText: { color: '#FFF', marginTop: 8, fontSize: 14 },
  coverEditHint: {
    position: 'absolute',
    top: 12,
    right: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  coverEditHintText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 11,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loginPrompt: { fontSize: 16, color: '#666', textAlign: 'center' },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backText: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
  navRight: { flexDirection: 'row', alignItems: 'center' },
  messageLabel: { fontSize: 13, color: '#666', marginRight: 8 },

  profileHeaderWithCover: {
    marginHorizontal: 15,
    marginTop: 0,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1a1a1a',
  },
  profileCoverBg: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  profileCoverGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 180,
  },
  coverChangeTouch: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  headerWrapper: {
    marginTop: -24,
    // paddingHorizontal: 15,
    paddingBottom: 0,
  },
  profileHeaderCard: {
    // backgroundColor: '#2C3E50',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingVertical: 25,
    alignItems: 'center',
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  brandText: {
    color: '#FFF',
    fontSize: 40,
    fontWeight: 'bold',
    marginHorizontal: 15,
  },
  avatarBorder: {
    borderWidth: 2,
    borderColor: '#000',
    borderRadius: 50,
    padding: 2,
  },
  avatar: { width: 85, height: 85, borderRadius: 42.5 },
  userName: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  userLocation: { color: '#BDC3C7', fontSize: 14 },
  actionButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flex: 1,
    maxWidth: 180,
  },
  editProfileBtnText: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  bioContainer: {
    backgroundColor: '#F2F2F2',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    padding: 15,
    marginTop: -1,
  },
  bioContentRow: { flexDirection: 'row', alignItems: 'flex-start' },
  bioText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
  editIcon: { marginLeft: 10 },

  section: { paddingHorizontal: 15, marginTop: 25 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 15,
  },
  emptyHint: { fontSize: 14, color: '#888', marginBottom: 8 },
  videoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  thumbnailContainer: {
    width: '31%',
    height: 90,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 8,
  },
  thumbnail: { width: '100%', height: '100%', resizeMode: 'cover' },
  promoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  promoBtn: {
    width: '48%',
    height: 45,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  bgOrange: { backgroundColor: '#F5A623' },
  bgDarkBlue: { backgroundColor: '#2C3E50' },
  promoBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  promoCodeText: { fontSize: 11, color: 'rgba(255,255,255,0.9)', marginTop: 2 },
  bottomArrow: { alignItems: 'center', marginTop: 30 },
  logoImage: { marginRight: 15 },

  editModalOverlay: { flex: 1, justifyContent: 'flex-end' },
  editModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  editModalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  editModalTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  editModalScroll: { maxHeight: 400, paddingHorizontal: 16, paddingTop: 12 },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  editInputMultiline: { minHeight: 80, textAlignVertical: 'top' },
  editSaveBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FF7F0B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editSaveBtnDisabled: { opacity: 0.7 },
  editSaveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  socialLinksCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  socialLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  socialLinkRowLast: { marginBottom: 0 },
  socialLinkLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
    minWidth: 120,
  },
  socialLinkIcon: { marginRight: 8 },
  socialLinkLabel: { fontSize: 14, fontWeight: '600', color: '#333', flex: 1 },
  socialLinkInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#333',
    backgroundColor: '#fff',
  },
});

export default PromotionScreen;
