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
  Dimensions,
  Share,
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
import {
  getPostsByUser,
  togglePostLike,
  togglePostDislike,
  recordPostShare,
} from '../services/postService';
import {
  getGallery,
  uploadGallery,
  deleteGalleryPhoto,
} from '../services/channelService';
import { getNotificationsByUserId } from '../services/notificationService';
import BusinessVideoCard from '../components/BusinessVideoCard';
import BusinessVideoTabCard from '../components/BusinessVideoTabCard';
import CommentsModal from '../components/CommentsModal';
import CreatePostModal from '../components/CreatePostModal';

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

const { width: SCREEN_W } = Dimensions.get('window');
const PROMO_TAB_GRID_W = (SCREEN_W - 32 - 16) / 3;
/** Promotions preview: 2×2 grid (section padding 16×2 + gap 10). */
const PROMO_PREVIEW_CARD_W = (SCREEN_W - 32 - 10) / 2;
/** First-row colors only: amber + navy, alternating for 2×2 grid */
const PROMO_PREVIEW_BG = ['#F9A825', '#2C3E50'];

const PROMO_PROFILE_TABS = ['Posts', 'Gallery', 'Video', 'Notification'];

const formatCountTab = n => {
  const num = Number(n || 0);
  if (!Number.isFinite(num) || num < 0) return '0';
  if (num >= 1000000)
    return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.floor(num));
};

const formatTimeAgoTab = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  if (diffYears > 0) return `${diffYears}y ago`;
  if (diffMonths > 0) return `${diffMonths}mo ago`;
  if (diffDays > 0) return `${diffDays}d ago`;
  return 'Recently';
};

const mapPostToCardTab = (post, user) => {
  const u = post.user || user || {};
  const channelName = u.nickname || u.name || 'Unknown';
  const avatarRaw =
    u.photos?.[0] ||
    (Array.isArray(u.photos) && u.photos[0]) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      channelName,
    )}&background=111&color=fff`;
  const channelAvatar =
    typeof avatarRaw === 'string'
      ? avatarRaw
      : (avatarRaw?.src ?? avatarRaw?.uri) ||
        `https://ui-avatars.com/api/?name=${encodeURIComponent(
          channelName,
        )}&background=111&color=fff`;
  const duration =
    post.mediaType === 'video' && post.duration != null
      ? `${Math.floor(post.duration / 60)}:${String(
          post.duration % 60,
        ).padStart(2, '0')}`
      : '';
  return {
    id: post.id,
    postId: post.id,
    title: post.title || 'Untitled',
    channelName,
    channelAvatar,
    publishedAt: formatTimeAgoTab(post.publishedAt || post.createdAt),
    thumbnail:
      post.thumbnailUrl || post.mediaUrl || 'https://via.placeholder.com/300',
    duration,
    likes: formatCountTab(post.likeCount ?? 0),
    dislikes: formatCountTab(post.dislikeCount ?? 0),
    comments: formatCountTab(post.commentCount ?? 0),
    shares: formatCountTab(post.shareCount ?? 0),
    likeCount: post.likeCount ?? 0,
    dislikeCount: post.dislikeCount ?? 0,
    commentCount: post.commentCount ?? 0,
    shareCount: post.shareCount ?? 0,
    isLiked: post.isLiked ?? false,
    isDisliked: post.isDisliked ?? false,
    website: post.website || '',
    hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
    mediaUrl: post.mediaUrl,
  };
};

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

  const [activePromoTab, setActivePromoTab] = useState('Posts');
  const [postsTab, setPostsTab] = useState([]);
  const [postsTabLoading, setPostsTabLoading] = useState(false);
  const [galleryTab, setGalleryTab] = useState([]);
  const [galleryTabLoading, setGalleryTabLoading] = useState(false);
  const [galleryTabUploading, setGalleryTabUploading] = useState(false);
  const [notifTab, setNotifTab] = useState([]);
  const [notifTabLoading, setNotifTabLoading] = useState(false);
  const [commentsModalPostId, setCommentsModalPostId] = useState(null);
  const [createPostTabVisible, setCreatePostTabVisible] = useState(false);
  const [galleryPreviewVisible, setGalleryPreviewVisible] = useState(false);
  const [galleryPreviewUri, setGalleryPreviewUri] = useState(null);

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

  /** Up to 4 promos in a 2×2 grid; 3 items → 2 top + 1 bottom. Empty → 4 Browse tiles. */
  const promotionPreviewSlots = useMemo(() => {
    const list = nearbyPromotions || [];
    if (list.length === 0) {
      return [0, 1, 2, 3].map(i => ({
        kind: 'more',
        id: `more-${i}`,
        index: i,
      }));
    }
    return list.slice(0, 4).map((p, i) => ({
      kind: 'promo',
      promotion: p,
      index: i,
    }));
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

  const loadPostsTab = useCallback(async () => {
    if (!userId) {
      setPostsTab([]);
      return;
    }
    setPostsTabLoading(true);
    try {
      const res = await getPostsByUser(userId, 1, 50);
      setPostsTab((res?.posts || []).map(p => mapPostToCardTab(p, p.user)));
    } catch {
      setPostsTab([]);
    } finally {
      setPostsTabLoading(false);
    }
  }, [userId]);

  const loadGalleryTab = useCallback(async () => {
    if (!userId) {
      setGalleryTab([]);
      return;
    }
    setGalleryTabLoading(true);
    try {
      const res = await getGallery(userId);
      setGalleryTab(res?.photos ?? []);
    } catch {
      setGalleryTab([]);
    } finally {
      setGalleryTabLoading(false);
    }
  }, [userId]);

  const loadNotifTab = useCallback(async () => {
    if (!userId) {
      setNotifTab([]);
      return;
    }
    setNotifTabLoading(true);
    try {
      const data = await getNotificationsByUserId(userId);
      setNotifTab(Array.isArray(data) ? data : data?.notifications ?? []);
    } catch {
      setNotifTab([]);
    } finally {
      setNotifTabLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (activePromoTab === 'Posts') loadPostsTab();
    else if (activePromoTab === 'Gallery') loadGalleryTab();
    else if (activePromoTab === 'Video') loadMyVideos();
    else if (activePromoTab === 'Notification') loadNotifTab();
  }, [
    activePromoTab,
    userId,
    loadPostsTab,
    loadGalleryTab,
    loadMyVideos,
    loadNotifTab,
  ]);

  const updatePostTab = useCallback((postId, updater) => {
    setPostsTab(prev =>
      prev.map(p => (p.postId === postId || p.id === postId ? updater(p) : p)),
    );
  }, []);

  const handlePostTabLike = useCallback(
    async postId => {
      if (!currentUser?.id) return;
      const post = postsTab.find(p => p.postId === postId || p.id === postId);
      if (!post) return;
      const prevLikes = post.likes;
      updatePostTab(postId, p => ({
        ...p,
        likes: String(Math.max(0, Number(p.likes) + 1)),
      }));
      try {
        const res = await togglePostLike(postId, currentUser.id);
        const delta = res?.liked ? 1 : -1;
        updatePostTab(postId, p => ({
          ...p,
          likes: String(Math.max(0, Number(prevLikes) + delta)),
        }));
      } catch {
        updatePostTab(postId, p => ({ ...p, likes: prevLikes }));
      }
    },
    [currentUser?.id, postsTab, updatePostTab],
  );

  const handlePostTabDislike = useCallback(
    async postId => {
      if (!currentUser?.id) return;
      const post = postsTab.find(p => p.postId === postId || p.id === postId);
      if (!post) return;
      const prevDislikes = post.dislikes;
      updatePostTab(postId, p => ({
        ...p,
        dislikes: String(Math.max(0, Number(p.dislikes) + 1)),
      }));
      try {
        const res = await togglePostDislike(postId, currentUser.id);
        const delta = res?.disliked ? 1 : -1;
        updatePostTab(postId, p => ({
          ...p,
          dislikes: String(Math.max(0, Number(prevDislikes) + delta)),
        }));
      } catch {
        updatePostTab(postId, p => ({ ...p, dislikes: prevDislikes }));
      }
    },
    [currentUser?.id, postsTab, updatePostTab],
  );

  const handlePostTabShare = useCallback(
    async postId => {
      const post = postsTab.find(p => p.postId === postId || p.id === postId);
      if (!post) return;
      try {
        await Share.share({
          message: `${post.title}\neatix://post/${postId}`,
          title: post.title,
        });
        await recordPostShare(postId);
        updatePostTab(postId, p => ({
          ...p,
          shares: String(Number(p.shares || 0) + 1),
        }));
      } catch (e) {
        if (e?.message !== 'User did not share') {
          /* ignore */
        }
      }
    },
    [postsTab, updatePostTab],
  );

  const handlePostCommentAddedTab = useCallback(
    (_, delta = 1) => {
      if (commentsModalPostId) {
        updatePostTab(commentsModalPostId, p => ({
          ...p,
          comments: String(Number(p.comments || 0) + delta),
        }));
      }
    },
    [commentsModalPostId, updatePostTab],
  );

  const handleGalleryTabUpload = useCallback(() => {
    if (!userId || galleryTabUploading) return;
    launchImageLibrary(
      { mediaType: 'photo', selectionLimit: 10 },
      async res => {
        if (res.didCancel || res.errorCode || !res.assets?.length) return;
        setGalleryTabUploading(true);
        try {
          await uploadGallery(
            userId,
            res.assets.map(a => ({
              uri: a.uri,
              type: a.type || 'image/jpeg',
              name: a.fileName || 'photo.jpg',
            })),
          );
          await loadGalleryTab();
        } catch (e) {
          Alert.alert('Error', e?.message || 'Failed to upload photos');
        } finally {
          setGalleryTabUploading(false);
        }
      },
    );
  }, [userId, galleryTabUploading, loadGalleryTab]);

  const handleDeleteGalleryTabPhoto = useCallback(
    async photoId => {
      if (!userId) return;
      Alert.alert('Delete photo', 'Remove this photo from your gallery?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGalleryPhoto(userId, photoId);
              setGalleryTab(prev => prev.filter(p => p.id !== photoId));
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to delete');
            }
          },
        },
      ]);
    },
    [userId],
  );

  const onRefresh = useCallback(async () => {
    if (!userId) return;
    setRefreshing(true);
    const tabLoads = [];
    if (activePromoTab === 'Posts') tabLoads.push(loadPostsTab());
    else if (activePromoTab === 'Gallery') tabLoads.push(loadGalleryTab());
    else if (activePromoTab === 'Video') tabLoads.push(loadMyVideos());
    else if (activePromoTab === 'Notification') tabLoads.push(loadNotifTab());
    await Promise.all([
      loadProfile(),
      loadSaved(),
      loadMyVideos(),
      loadNearbyPromotions(),
      ...tabLoads,
    ]);
    setRefreshing(false);
  }, [
    userId,
    loadProfile,
    loadSaved,
    loadMyVideos,
    loadNearbyPromotions,
    activePromoTab,
    loadPostsTab,
    loadGalleryTab,
    loadNotifTab,
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
              params: { shortId: sid, initialShortItem: item },
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
              params: { shortId: sid, initialShortItem: item },
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
        {/* <View style={styles.messageContainer}>
          <Text style={styles.messageLabel}>Message</Text>
          <Icon name="message-text-outline" size={26} color="#000" />
        </View> */}
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

        {/* Same tab pattern as Business profile: Posts, Gallery, Video, Notification (no Promotions/Menus) */}
        <View style={styles.promoProfileTabsSection}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.promoTabBarScroll}
          >
            {PROMO_PROFILE_TABS.map(tab => {
              const isGrid = tab === 'Gallery';
              const active = activePromoTab === tab;
              return (
                <TouchableOpacity
                  key={tab}
                  style={[
                    styles.promoTabPill,
                    active && styles.promoTabPillActive,
                  ]}
                  onPress={() => setActivePromoTab(tab)}
                  activeOpacity={0.85}
                >
                  {isGrid ? (
                    <Icon
                      name="view-grid"
                      size={20}
                      color={active ? '#FF7F0B' : '#444'}
                    />
                  ) : (
                    <Text
                      style={[
                        styles.promoTabPillText,
                        active && styles.promoTabPillTextActive,
                      ]}
                    >
                      {tab}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.promoTabPanel}>
            {activePromoTab === 'Posts' ? (
              <>
                <View style={styles.promoTabGalleryHeader}>
                  <Text style={styles.promoTabSectionTitle}>Posts</Text>
                  <TouchableOpacity
                    onPress={() => setCreatePostTabVisible(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Icon name="plus" size={24} color="#333" />
                  </TouchableOpacity>
                </View>
                {postsTabLoading && postsTab.length === 0 ? (
                  <View style={styles.promoTabLoading}>
                    <ActivityIndicator size="small" color="#FF7F0B" />
                    <Text style={styles.promoTabLoadingText}>
                      Loading posts…
                    </Text>
                  </View>
                ) : postsTab.length === 0 ? (
                  <Text style={styles.promoTabEmpty}>
                    No posts yet. Tap + to create.
                  </Text>
                ) : (
                  postsTab.map(item => {
                    const postId = item.postId || item.id;
                    const profileAvatarUri =
                      profile?.channelAvatar &&
                      String(profile.channelAvatar).trim()
                        ? safeImageUri(profile.channelAvatar)
                        : null;
                    const profilePhotoUri =
                      profile?.photos?.[0] != null
                        ? safeImageUri(
                            typeof profile.photos[0] === 'string'
                              ? profile.photos[0]
                              : profile.photos[0]?.src,
                          )
                        : null;
                    const postOwnerAvatar =
                      (profileAvatarUri &&
                      !String(profileAvatarUri).includes('ui-avatars.com')
                        ? profileAvatarUri
                        : null) ||
                      (profilePhotoUri &&
                      !String(profilePhotoUri).includes('via.placeholder')
                        ? profilePhotoUri
                        : null) ||
                      item.channelAvatar;
                    return (
                      <BusinessVideoCard
                        key={String(postId)}
                        video={{
                          ...item,
                          channelAvatar: postOwnerAvatar || item.channelAvatar,
                        }}
                        postId={postId}
                        onLike={
                          currentUser?.id
                            ? () => handlePostTabLike(postId)
                            : undefined
                        }
                        onDislike={
                          currentUser?.id
                            ? () => handlePostTabDislike(postId)
                            : undefined
                        }
                        onCommentPress={() => setCommentsModalPostId(postId)}
                        onShare={() => handlePostTabShare(postId)}
                      />
                    );
                  })
                )}
              </>
            ) : null}

            {activePromoTab === 'Gallery' ? (
              <>
                <View style={styles.promoTabGalleryHeader}>
                  <Text style={styles.promoTabSectionTitle}>Gallery</Text>
                  <TouchableOpacity
                    onPress={handleGalleryTabUpload}
                    disabled={galleryTabUploading}
                  >
                    <Icon
                      name="plus"
                      size={24}
                      color={galleryTabUploading ? '#999' : '#333'}
                    />
                  </TouchableOpacity>
                </View>
                {galleryTabLoading && galleryTab.length === 0 ? (
                  <View style={styles.promoTabLoading}>
                    <ActivityIndicator size="small" color="#FF7F0B" />
                    <Text style={styles.promoTabLoadingText}>
                      Loading gallery…
                    </Text>
                  </View>
                ) : (
                  <View style={styles.promoTabGalleryGrid}>
                    {galleryTab.length === 0 ? (
                      <Text style={styles.promoTabEmpty}>
                        No photos yet. Tap + to upload.
                      </Text>
                    ) : (
                      galleryTab.map(photo => (
                        <TouchableOpacity
                          key={photo.id}
                          style={[
                            styles.promoTabGalleryCell,
                            { width: PROMO_TAB_GRID_W },
                          ]}
                          onPress={() => {
                            setGalleryPreviewUri(safeImageUri(photo.src));
                            setGalleryPreviewVisible(true);
                          }}
                          onLongPress={() =>
                            photo.id && handleDeleteGalleryTabPhoto(photo.id)
                          }
                          activeOpacity={0.9}
                        >
                          <Image
                            source={{ uri: safeImageUri(photo.src) }}
                            style={styles.promoTabGalleryImg}
                          />
                        </TouchableOpacity>
                      ))
                    )}
                  </View>
                )}
              </>
            ) : null}

            {activePromoTab === 'Video' ? (
              <>
                {myVideosLoading && myVideos.length === 0 ? (
                  <View style={styles.promoTabLoading}>
                    <ActivityIndicator size="small" color="#FF7F0B" />
                    <Text style={styles.promoTabLoadingText}>
                      Loading videos…
                    </Text>
                  </View>
                ) : myVideos.length === 0 ? (
                  <Text style={styles.promoTabEmpty}>No videos yet.</Text>
                ) : (
                  myVideos.map(item => (
                    <BusinessVideoTabCard
                      key={String(item.id)}
                      item={{
                        ...item,
                        thumbnail: item.thumbnail || item.thumbnailUrl,
                        title: item.title || 'Video',
                        views:
                          item.views || formatCountTab(item.viewCount ?? 0),
                        location:
                          item.location ||
                          profile?.address ||
                          currentUser?.address ||
                          '',
                        distance: item.distance || '',
                      }}
                      onPress={() => openLibraryMedia(item)}
                    />
                  ))
                )}
              </>
            ) : null}

            {activePromoTab === 'Notification' ? (
              <>
                {notifTabLoading && notifTab.length === 0 ? (
                  <View style={styles.promoTabLoading}>
                    <ActivityIndicator size="small" color="#FF7F0B" />
                    <Text style={styles.promoTabLoadingText}>
                      Loading notifications…
                    </Text>
                  </View>
                ) : notifTab.length === 0 ? (
                  <Text style={styles.promoTabEmpty}>
                    No notifications yet.
                  </Text>
                ) : (
                  notifTab.map((n, idx) => (
                    <View key={n.id || `n-${idx}`} style={styles.promoNotifRow}>
                      <Icon
                        name={
                          n.type === 'order'
                            ? 'cart'
                            : n.type === 'content'
                            ? 'video'
                            : 'bell'
                        }
                        size={22}
                        color="#666"
                        style={styles.promoNotifIcon}
                      />
                      <View style={styles.promoNotifBody}>
                        <Text style={styles.promoNotifMsg} numberOfLines={2}>
                          {n.message}
                        </Text>
                        <Text style={styles.promoNotifMeta}>
                          {n.type || 'general'} •{' '}
                          {n.createdAt
                            ? new Date(n.createdAt).toLocaleDateString()
                            : ''}
                        </Text>
                      </View>
                      {n.status === 'unread' ? (
                        <View style={styles.promoNotifDot} />
                      ) : null}
                    </View>
                  ))
                )}
              </>
            ) : null}
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
              {[0, 1, 2, 3].map(i => (
                <View
                  key={`sk-${i}`}
                  style={[
                    styles.promoPreviewCard,
                    styles.promoPreviewSkeleton,
                    { width: PROMO_PREVIEW_CARD_W },
                  ]}
                >
                  <ActivityIndicator size="small" color="#F5A623" />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.promoPreviewRow}>
              {promotionPreviewSlots.map(slot => {
                const bg =
                  PROMO_PREVIEW_BG[slot.index % PROMO_PREVIEW_BG.length];
                if (slot.kind === 'promo') {
                  const p = slot.promotion;
                  return (
                    <TouchableOpacity
                      key={p.id}
                      style={[
                        styles.promoPreviewCard,
                        { backgroundColor: bg, width: PROMO_PREVIEW_CARD_W },
                      ]}
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
                      { borderColor: bg, width: PROMO_PREVIEW_CARD_W },
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

      <CommentsModal
        visible={!!commentsModalPostId}
        onClose={() => setCommentsModalPostId(null)}
        contentType="post"
        contentId={commentsModalPostId}
        user={currentUser}
        onCommentAdded={handlePostCommentAddedTab}
        onCommentDeleted={(_top, count) =>
          handlePostCommentAddedTab(null, -(count || 1))
        }
      />
      <CreatePostModal
        visible={createPostTabVisible}
        onClose={() => setCreatePostTabVisible(false)}
        onSuccess={() => loadPostsTab()}
        userId={currentUser?.id}
      />

      <Modal
        visible={galleryPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGalleryPreviewVisible(false)}
      >
        <View style={styles.promoGalleryPreviewBackdrop}>
          <TouchableOpacity
            style={styles.promoGalleryPreviewClose}
            onPress={() => setGalleryPreviewVisible(false)}
          >
            <Icon name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {galleryPreviewUri ? (
            <Image
              source={{ uri: galleryPreviewUri }}
              style={styles.promoGalleryPreviewImg}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>

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
    flexWrap: 'wrap',
    gap: 10,
    rowGap: 10,
    justifyContent: 'flex-start',
    alignContent: 'flex-start',
  },
  promoPreviewCard: {
    minHeight: 40,
    paddingVertical: 12,
    paddingHorizontal: 10,
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
  promoProfileTabsSection: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  promoTabBarScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  promoTabPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 6,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  promoTabPillActive: {
    backgroundColor: '#FFF4EB',
    borderWidth: 1,
    borderColor: '#FF7F0B',
  },
  promoTabPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  promoTabPillTextActive: {
    color: '#FF7F0B',
  },
  promoTabPanel: {
    paddingHorizontal: 12,
    paddingBottom: 16,
    paddingTop: 8,
    minHeight: 120,
  },
  promoTabLoading: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  promoTabLoadingText: {
    marginTop: 8,
    fontSize: 13,
    color: '#888',
  },
  promoTabEmpty: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  promoTabGalleryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  promoTabSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
  },
  promoTabGalleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-start',
  },
  promoTabGalleryCell: {
    aspectRatio: 0.8,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  promoTabGalleryImg: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  promoNotifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  promoNotifIcon: {
    marginRight: 12,
  },
  promoNotifBody: {
    flex: 1,
  },
  promoNotifMsg: {
    fontSize: 14,
    color: '#333',
  },
  promoNotifMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  promoNotifDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF7F0B',
    marginLeft: 8,
  },
  promoGalleryPreviewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoGalleryPreviewClose: {
    position: 'absolute',
    top: 48,
    right: 16,
    padding: 8,
    zIndex: 2,
  },
  promoGalleryPreviewImg: {
    width: '100%',
    height: '100%',
  },
});

export default PromotionScreen;
