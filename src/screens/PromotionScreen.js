import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
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

import logo from '../assets/short-logo.png';
import logoIX from '../assets/short-logo-ix.png';

import {
  getChannelProfile,
  updateChannelProfile,
  uploadProfilePhoto,
  uploadCoverImage,
} from '../services/channelService';
import { getUserVideos } from '../services/videoService';
import { shortsService } from '../services/shortsService';
import { getWatchLater } from '../services/playlistService';
import { getNearbyPromotions } from '../services/promotionService';
import { appSetUser } from '../redux/actions/appSlice';
import { safeImageUri } from '../utils/helper';
import { navigateToHomeOneLibraryDetail } from '../utils/navigateHomeLibraryDetail';

const VideoSection = ({
  title,
  items = [],
  loading = false,
  onItemPress,
  rightAccessory,
}) => (
  <View style={styles.sectionContainer}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rightAccessory || null}
    </View>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.horizontalScroll}
    >
      {loading ? (
        <View style={[styles.videoThumbnailContainer, { width: 105 }]}>
          <ActivityIndicator size="small" color="#F5A623" />
        </View>
      ) : items.length === 0 ? (
        <View style={[styles.videoThumbnailContainer, { width: 220 }]}>
          <Text style={{ color: '#888', fontSize: 13 }}>No items yet.</Text>
        </View>
      ) : (
        items.slice(0, 12).map((item, idx) => (
          <TouchableOpacity
            key={item.id || idx}
            style={styles.videoThumbnailContainer}
            activeOpacity={0.8}
            onPress={() => onItemPress && onItemPress(item)}
          >
            <Image
              source={{ uri: item.thumbnailUri }}
              style={styles.videoThumbnail}
            />
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  </View>
);

/** Same defaults as AllPromotionsScreen so home preview matches “see all” list. */
const PROMO_UK_LAT = 51.5074;
const PROMO_UK_LNG = -0.1278;
const PROMO_RADIUS_KM = 500;
const PROMO_FETCH_LIMIT = 80;

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
        getUserVideos(userId, 1, 100),
        shortsService.getUserShorts(userId, 1, 100),
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

  /** Your uploads sorted by likes (same pool as My Videos). */
  const mostLikedItems = useMemo(() => {
    const likes = it => it.likeCount ?? it._count?.likes ?? 0;
    return [...myVideos].sort((a, b) => likes(b) - likes(a));
  }, [myVideos]);

  const loadNearbyPromotions = useCallback(async () => {
    const lat = Number(
      currentUser?.latitude ?? profile?.latitude ?? PROMO_UK_LAT,
    );
    const lng = Number(
      currentUser?.longitude ?? profile?.longitude ?? PROMO_UK_LNG,
    );
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      setNearbyPromotions([]);
      return;
    }
    setPromotionsLoading(true);
    try {
      const [ownerRes, vendorRes] = await Promise.all([
        getNearbyPromotions(
          lat,
          lng,
          PROMO_RADIUS_KM,
          1,
          PROMO_FETCH_LIMIT,
          'owner',
        ),
        getNearbyPromotions(
          lat,
          lng,
          PROMO_RADIUS_KM,
          1,
          PROMO_FETCH_LIMIT,
          'vendor',
        ),
      ]);
      const map = new Map();
      for (const p of [
        ...(ownerRes?.promotions ?? []),
        ...(vendorRes?.promotions ?? []),
      ]) {
        if (p?.id && !map.has(p.id)) map.set(p.id, p);
      }
      setNearbyPromotions([...map.values()]);
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

  /** Always 3 tiles: real promos first, then “See all” fillers (same as chevron). */
  const promotionPreviewSlots = useMemo(() => {
    const list = nearbyPromotions || [];
    const slots = [];
    for (let i = 0; i < 3; i++) {
      slots.push(
        list[i]
          ? { kind: 'promo', promotion: list[i], index: i }
          : { kind: 'more', id: `more-${i}`, index: i },
      );
    }
    return slots;
  }, [nearbyPromotions]);

  useEffect(() => {
    if (userId) {
      loadProfile();
    }
  }, [userId, loadProfile]);

  useEffect(() => {
    if (userId) {
      loadSaved();
      loadMyVideos();
      loadNearbyPromotions();
    }
  }, [userId, loadSaved, loadMyVideos, loadNearbyPromotions]);

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    await Promise.all([
      loadProfile(),
      loadSaved(),
      loadMyVideos(),
      loadNearbyPromotions(),
    ]);
    setRefreshing(false);
  }, [userId, loadProfile, loadSaved, loadMyVideos, loadNearbyPromotions]);

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

  /** Same as BusinessProfileViewScreen Video tab +: Create modal (short / upload / go live), return to Promotion on close */
  const openMyVideosCreateFlow = useCallback(() => {
    if (!currentUser?.id) {
      navigation.navigate('HomeSevenScreen');
      return;
    }
    let nav = navigation;
    for (let i = 0; i < 12 && nav; i++) {
      const names = nav.getState?.()?.routeNames;
      if (Array.isArray(names) && names.includes('Create')) {
        const state = nav.getState();
        const idx = state?.index ?? 0;
        const tabName = state?.routes?.[idx]?.name || 'Home1';
        nav.navigate('Create', {
          returnTo: { tab: tabName, screen: 'PromotionScreen' },
        });
        return;
      }
      nav = nav.getParent?.();
    }
  }, [navigation, currentUser?.id]);

  /**
   * Videos → HomeOne full detail (same as Library Your videos). Back → PromotionScreen.
   * Shorts → Shorts tab ShortsVideoScreen.
   */
  const openLibraryMedia = useCallback(
    item => {
      if (!item?.id) return;
      const isShort =
        item.type === 'short' || String(item.type).toLowerCase() === 'short';
      if (isShort) {
        const sid = String(item.id);
        let nav = navigation;
        for (let i = 0; i < 16 && nav; i++) {
          const names = nav.getState?.()?.routeNames;
          if (Array.isArray(names) && names.includes('Shorts')) {
            nav.navigate('Shorts', {
              screen: 'ShortsVideoScreen',
              params: { shortId: sid },
            });
            return;
          }
          nav = nav.getParent?.();
        }
        nav = navigation;
        for (let i = 0; i < 16 && nav; i++) {
          const names = nav.getState?.()?.routeNames;
          if (Array.isArray(names) && names.includes('Library')) {
            nav.navigate('Library', {
              screen: 'ShortsVideoScreen',
              params: { shortId: sid },
            });
            return;
          }
          nav = nav.getParent?.();
        }
        return;
      }
      navigateToHomeOneLibraryDetail(navigation, item, {
        returnTo: 'promotion',
      });
    },
    [navigation],
  );

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

  const mostLikedThumbs = mostLikedItems.map(it => ({
    ...it,
    thumbnailUri: getThumbnailForItem(it),
  }));
  const savedThumbs = savedItems.map(it => ({
    ...it,
    thumbnailUri: getThumbnailForItem(it),
  }));
  const myVideoThumbs = myVideos.map(it => ({
    ...it,
    thumbnailUri: getThumbnailForItem(it),
  }));

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

      {/* Header Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (onBack ? onBack() : navigation.goBack())}
        >
          <Icon
            name="play"
            size={12}
            color="#FFF"
            style={styles.backIconFlip}
          />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.messageContainer}>
          <Text style={styles.messageLabel}>Message</Text>
          <Icon name="message-text-outline" size={26} color="#000" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollPadding}
      >
        {/* Profile Card Section */}
        <View style={styles.profileWrapper}>
          <View style={styles.darkHeader}>
            <View style={styles.brandingRow}>
              {/* <Text style={styles.eatText}>eat</Text> */}
              <View style={styles.avatarContainer}>
                <Image
                  source={logo}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>

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
                      style={styles.avatarImage}
                    />
                  )}
                  <View style={styles.avatarEditBadge}>
                    <Icon name="pencil-outline" size={12} color="#666" />
                  </View>
                </TouchableOpacity>
              </View>

              {/* <Text style={styles.ixText}>ix</Text> */}
              <View style={styles.headerLogoContainer}>
                <Image
                  source={logoIX}
                  style={styles.logoImageIx}
                  resizeMode="contain"
                />
              </View>
            </View>

            <Text style={styles.profileName}>{displayName}</Text>
            <Text style={styles.profileLocation}>{displayLocation || '—'}</Text>

            <View style={styles.actionButtonGroup}>
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={openEditProfile}
              >
                <Text style={styles.editProfileText}>Edit Profile</Text>
                <Icon name="pencil-box-outline" size={22} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconIconButton}>
                <Icon name="camera-outline" size={24} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconIconButton}
                onPress={handleMessagePress}
              >
                <Icon name="message-outline" size={24} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bio Section */}
          <View style={styles.bioBox}>
            <Text style={styles.bioText}>{bio || 'No description yet.'}</Text>
            <TouchableOpacity onPress={openEditProfile}>
              <Icon name="square-edit-outline" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Video Sections */}
        <VideoSection
          title="Most liked videos"
          items={mostLikedThumbs}
          loading={myVideosLoading}
          onItemPress={openLibraryMedia}
        />

        {/* Promotions Grid */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Promotions</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('AllPromotions')}
              activeOpacity={0.8}
            >
              <Icon name="chevron-right" size={26} color="#222" />
            </TouchableOpacity>
          </View>
          {promotionsLoading && nearbyPromotions.length === 0 ? (
            <View style={styles.promoPreviewRow}>
              {[0, 1, 2].map(i => (
                <View
                  key={`sk-${i}`}
                  style={[styles.promoPreviewCard, styles.promoPreviewSkeleton]}
                >
                  <ActivityIndicator size="small" color="#F5A623" />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.promoPreviewRow}>
              {promotionPreviewSlots.map(slot => {
                const bg =
                  slot.index % 3 === 0
                    ? '#F9A825'
                    : slot.index % 3 === 1
                    ? '#2C3E50'
                    : '#E65100';
                if (slot.kind === 'promo') {
                  const p = slot.promotion;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.promoPreviewCard, { backgroundColor: bg }]}
                      activeOpacity={0.85}
                      onPress={() =>
                        navigation.navigate('PromotionFullDetail', {
                          promotion: p,
                        })
                      }
                    >
                      <Text style={styles.promoPreviewTitle} numberOfLines={2}>
                        {p.user?.nickname || p.user?.name || p.title || 'Offer'}
                      </Text>
                    </TouchableOpacity>
                  );
                }
                return (
                  <TouchableOpacity
                    key={slot.id}
                    style={[
                      styles.promoPreviewCard,
                      styles.promoPreviewMore,
                      { borderColor: bg },
                    ]}
                    activeOpacity={0.85}
                    onPress={() => navigation.navigate('AllPromotions')}
                  >
                    <Icon name="storefront-outline" size={22} color={bg} />
                    <Text style={[styles.promoPreviewMoreText, { color: bg }]}>
                      {nearbyPromotions.length === 0 ? 'Browse' : 'See all'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        <VideoSection
          title="Saved Videos"
          items={savedThumbs}
          loading={savedLoading}
          onItemPress={openLibraryMedia}
        />
        <VideoSection
          title="My Videos"
          items={myVideoThumbs}
          loading={myVideosLoading}
          onItemPress={openLibraryMedia}
          rightAccessory={
            <TouchableOpacity
              onPress={openMyVideosCreateFlow}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              activeOpacity={0.7}
            >
              <Icon name="plus" size={24} color="#000" />
            </TouchableOpacity>
          }
        />

        {/* Scroll Indicator */}
        {/* <View style={styles.bottomArrowContainer}>
          <Icon name="chevron-down" size={45} color="#333" />
        </View> */}
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
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backIconFlip: { transform: [{ rotate: '180deg' }], marginRight: 4 },
  backText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  messageContainer: { flexDirection: 'row', alignItems: 'center' },
  messageLabel: { fontSize: 13, color: '#666', marginRight: 8 },

  profileWrapper: {
    marginHorizontal: 16,
    marginTop: 10,
    backgroundColor: '#F1F1F1',
    borderRadius: 32,
    overflow: 'hidden',
  },
  darkHeader: {
    backgroundColor: '#34495E',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  // brandingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },

  brandingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between', // Pushes logos to ends and keeps avatar in middle
    width: '100%',
    paddingHorizontal: 30, // Adjust this to move logos closer/further from edges
    marginBottom: 8,
  },
  eatText: { color: '#FFF', fontSize: 44, fontWeight: 'bold', marginRight: 20 },
  ixText: { color: '#FFF', fontSize: 44, fontWeight: 'bold', marginLeft: 20 },
  // avatarContainer: { position: 'relative' },
  avatarContainer: {
    width: 80, // Matches width of headerLogoContainer for perfect centering
    alignItems: 'flex-start',
  },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 2,
    top: 6,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 3,
    elevation: 2,
  },
  profileName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
  },
  profileLocation: { color: '#BDC3C7', fontSize: 13, marginBottom: 18 },

  actionButtonGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },
  editProfileText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  iconIconButton: {
    backgroundColor: '#FFF',
    width: 52,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bioBox: {
    backgroundColor: '#F1F1F1',
    flexDirection: 'row',
    padding: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
  },
  bioText: { flex: 1, color: '#555', fontSize: 12.5, lineHeight: 18 },

  sectionContainer: { marginTop: 22, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  horizontalScroll: { flexDirection: 'row' },
  videoThumbnailContainer: { marginRight: 12 },
  videoThumbnail: { width: 105, height: 85, borderRadius: 12 },

  promoPreviewRow: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
  },
  promoPreviewCard: {
    flex: 1,
    minWidth: 0,
    minHeight: 38,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoPreviewSkeleton: {
    backgroundColor: '#f0f0f0',
    borderWidth: 1,
    borderColor: '#e8e8e8',
  },
  promoPreviewTitle: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 17,
  },
  promoPreviewCode: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
  },
  promoPreviewMore: {
    backgroundColor: '#FFF',
    borderWidth: 2,
    borderStyle: 'dashed',
  },
  promoPreviewMoreText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 6,
    textAlign: 'center',
  },

  bottomArrowContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  scrollPadding: { paddingBottom: 20 },
  logoImage: {
    width: 85,
    height: 30,
    // marginRight: 15,
    marginLeft: -8,
    marginTop: -30,
  },
  logoImageIx: {
    width: 60,
    height: 30,
    marginLeft: 5,
    marginTop: -30,
  },

  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: -10 },
  avatarImage: {
    width: 95,
    height: 95,
    borderRadius: 47.5,
    borderWidth: 2,
    borderColor: '#000', // Darker border like the screenshot
  },
  avatarBorder: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

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
