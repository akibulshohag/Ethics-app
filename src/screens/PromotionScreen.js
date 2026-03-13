import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Linking,
  Pressable,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

import logo from '../assets/short-logo.png';
import logoIX from '../assets/short-logo-ix.png';

import {
  getChannelProfile,
  updateChannelProfile,
  uploadProfilePhoto,
  uploadCoverImage,
  subscribeToChannel,
  unsubscribeFromChannel,
} from '../services/channelService';
import {
  getUserVideos,
  getLikedVideos,
  getVideoById,
  toggleLike as toggleVideoLike,
  toggleDislike as toggleVideoDislike,
  recordShare as recordVideoShare,
} from '../services/videoService';
import { shortsService } from '../services/shortsService';
import { getWatchLater } from '../services/playlistService';
import { getNearbyPromotions } from '../services/promotionService';
import { appSetUser } from '../redux/actions/appSlice';
import { safeImageUri } from '../utils/helper';
import Video from 'react-native-video';
import Slider from '@react-native-community/slider';
import CommentsModal from '../components/CommentsModal';
import SaveModal from '../components/SaveModal';
import { getSocialIcon } from '../constants/socialLinks';

const { width } = Dimensions.get('window');

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
          <Text style={{ color: '#888', fontSize: 13 }}>
            No items yet.
          </Text>
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

  const formatCount = n => {
    const num = Number(n || 0);
    if (!Number.isFinite(num) || num <= 0) return '0';
    if (num >= 1000000)
      return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
    if (num >= 1000)
      return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
    return String(Math.floor(num));
  };

  const mapVideoApiToModal = (v = {}) => {
    const u = v.user || {};
    const channelName = u.nickname || u.name || 'Unknown';
    const channelAvatar =
      u.photos?.[0] ||
      (Array.isArray(u.photos) && u.photos[0]) ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        channelName,
      )}&background=111&color=fff`;
    return {
      id: v.id,
      title: v.title || 'Untitled',
      videoUrl: v.videoUrl,
      thumbnail: v.thumbnailUrl || v.videoUrl || 'https://via.placeholder.com/600',
      durationSeconds: v.duration ?? 0,
      likeCount: v.likeCount ?? v._count?.likes ?? 0,
      dislikeCount: v.dislikeCount ?? 0,
      commentCount: v.commentCount ?? v._count?.comments ?? 0,
      shareCount: v.shareCount ?? 0,
      isLiked: v.isLiked ?? false,
      isDisliked: v.isDisliked ?? false,
      userId: v.userId,
      channelName,
      channelAvatar:
        typeof channelAvatar === 'string'
          ? channelAvatar
          : channelAvatar?.src ?? channelAvatar,
      socialLinks: Array.isArray(u.socialLinks) ? u.socialLinks : [],
    };
  };

  const mapShortApiToModal = (s = {}) => {
    const u = s.user || {};
    const channelName = u.nickname || u.name || 'Unknown';
    const channelAvatar =
      u.photos?.[0] ||
      (Array.isArray(u.photos) && u.photos[0]) ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        channelName,
      )}&background=111&color=fff`;
    return {
      id: s.id,
      title: s.title || 'Short',
      videoUrl: s.videoUrl,
      thumbnail:
        s.thumbnailUrl || s.coverUrl || s.videoUrl || 'https://via.placeholder.com/600',
      durationSeconds: s.duration ?? 0,
      likeCount: s.likeCount ?? s._count?.likes ?? 0,
      dislikeCount: s.dislikeCount ?? 0,
      commentCount: s.commentCount ?? s._count?.comments ?? 0,
      shareCount: s.shareCount ?? 0,
      isLiked: s.isLiked ?? false,
      isDisliked: s.isDisliked ?? false,
      userId: s.userId,
      channelName,
      channelAvatar:
        typeof channelAvatar === 'string'
          ? channelAvatar
          : channelAvatar?.src ?? channelAvatar,
      socialLinks: Array.isArray(u.socialLinks) ? u.socialLinks : [],
    };
  };

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

  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState(null);
  const [modalContentType, setModalContentType] = useState('video');
  const [videoModalLoading, setVideoModalLoading] = useState(false);
  const [videoModalError, setVideoModalError] = useState(null);
  const [modalVideo, setModalVideo] = useState(null);
  const [modalPaused, setModalPaused] = useState(true);
  const [modalProgress, setModalProgress] = useState({
    currentTime: 0,
    duration: 0,
  });
  const [modalIsSliding, setModalIsSliding] = useState(false);
  const [modalSlidingValue, setModalSlidingValue] = useState(0);
  const [channelSub, setChannelSub] = useState({
    isSubscribed: false,
    subscriberCount: 0,
  });
  const [subLoading, setSubLoading] = useState(false);
  const [videoCommentsVisible, setVideoCommentsVisible] = useState(false);
  const [saveVisible, setSaveVisible] = useState(false);
  const [activeVideoItem, setActiveVideoItem] = useState(null);
  const modalVideoRef = useRef(null);
  const seekingRef = useRef(false);
  const progressUpdateRef = useRef(0);

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

  const requireLogin = () => {
    if (!currentUser?.id) {
      Alert.alert('Login required', 'Please login to continue.');
      return true;
    }
    return false;
  };

  const formatTime = sec => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const openVideoModal = useCallback(
    async item => {
      if (!item?.id) return;
      setActiveVideoItem(item);
      const contentType = item.type === 'short' ? 'short' : 'video';
      setActiveVideoId(item.id);
      setModalContentType(contentType);
      setVideoModalVisible(true);
      setVideoModalLoading(true);
      setVideoModalError(null);
      setModalVideo(null);
      setModalPaused(true);
      setModalProgress({ currentTime: 0, duration: 0 });
      setModalIsSliding(false);
      setModalSlidingValue(0);
      setChannelSub({ isSubscribed: false, subscriberCount: 0 });
      const viewerRole = (currentUser?.role || 'user').toLowerCase();
      try {
        let mv = null;
        if (contentType === 'short') {
          const res = await shortsService.getShortById(
            item.id,
            currentUser?.id,
            viewerRole,
          );
          mv = mapShortApiToModal(res);
          setModalVideo(mv);
        } else {
          const res = await getVideoById(item.id, currentUser?.id, viewerRole);
          mv = mapVideoApiToModal(res);
          setModalVideo(mv);
        }
        setModalPaused(false);
        if (mv?.userId) {
          getChannelProfile(mv.userId, currentUser?.id)
            .then(p => {
              setChannelSub({
                isSubscribed: p?.isSubscribed ?? false,
                subscriberCount: p?.subscriberCount ?? 0,
              });
            })
            .catch(() => {});
        }
      } catch (e) {
        setVideoModalError(
          e?.response?.data?.message || e?.message || 'Failed to load video',
        );
      } finally {
        setVideoModalLoading(false);
      }
    },
    [currentUser?.id, currentUser?.role],
  );

  const closeVideoModal = useCallback(() => {
    setVideoModalVisible(false);
    setActiveVideoId(null);
    setActiveVideoItem(null);
    setModalVideo(null);
    setVideoModalError(null);
    setModalPaused(true);
    setModalProgress({ currentTime: 0, duration: 0 });
    setModalIsSliding(false);
    setModalSlidingValue(0);
    setVideoCommentsVisible(false);
    setSaveVisible(false);
  }, []);

  const modalDisplayTime = modalIsSliding
    ? modalSlidingValue
    : modalProgress.currentTime;

  const handleModalLike = useCallback(async () => {
    if (requireLogin()) return;
    if (!modalVideo?.id) return;
    setModalVideo(prev => {
      if (!prev) return prev;
      const isLiked = !prev.isLiked;
      const wasDisliked = prev.isDisliked;
      return {
        ...prev,
        isLiked,
        isDisliked: isLiked ? false : wasDisliked,
        likeCount: Math.max(0, prev.likeCount + (isLiked ? 1 : -1)),
        dislikeCount:
          isLiked && wasDisliked
            ? Math.max(0, prev.dislikeCount - 1)
            : prev.dislikeCount,
      };
    });
    try {
      if (modalContentType === 'short') {
        const res = await shortsService.toggleLike(
          modalVideo.id,
          currentUser.id,
        );
        if (res)
          setModalVideo(prev =>
            prev
              ? {
                  ...prev,
                  ...(res.likeCount != null && { likeCount: res.likeCount }),
                  ...(res.liked != null && { isLiked: res.liked }),
                }
              : prev,
          );
      } else {
        const res = await toggleVideoLike(modalVideo.id, currentUser.id);
        if (res)
          setModalVideo(prev =>
            prev
              ? {
                  ...prev,
                  ...(res.likeCount != null && { likeCount: res.likeCount }),
                  ...(res.dislikeCount != null && {
                    dislikeCount: res.dislikeCount,
                  }),
                  ...(res.isLiked != null && { isLiked: res.isLiked }),
                  ...(res.isDisliked != null && { isDisliked: res.isDisliked }),
                }
              : prev,
          );
      }
    } catch (_) {}
  }, [modalVideo?.id, modalContentType, currentUser?.id]);

  const handleModalDislike = useCallback(async () => {
    if (requireLogin()) return;
    if (!modalVideo?.id) return;
    setModalVideo(prev => {
      if (!prev) return prev;
      const isDisliked = !prev.isDisliked;
      const wasLiked = prev.isLiked;
      return {
        ...prev,
        isDisliked,
        isLiked: isDisliked ? false : wasLiked,
        dislikeCount: Math.max(0, prev.dislikeCount + (isDisliked ? 1 : -1)),
        likeCount:
          isDisliked && wasLiked
            ? Math.max(0, prev.likeCount - 1)
            : prev.likeCount,
      };
    });
    try {
      if (modalContentType === 'short') {
        const res = await shortsService.toggleDislike(
          modalVideo.id,
          currentUser.id,
        );
        if (res)
          setModalVideo(prev =>
            prev
              ? {
                  ...prev,
                  ...(res.dislikeCount != null && {
                    dislikeCount: res.dislikeCount,
                  }),
                  ...(res.disliked != null && { isDisliked: res.disliked }),
                }
              : prev,
          );
      } else {
        const res = await toggleVideoDislike(modalVideo.id, currentUser.id);
        if (res)
          setModalVideo(prev =>
            prev
              ? {
                  ...prev,
                  ...(res.likeCount != null && { likeCount: res.likeCount }),
                  ...(res.dislikeCount != null && {
                    dislikeCount: res.dislikeCount,
                  }),
                  ...(res.isLiked != null && { isLiked: res.isLiked }),
                  ...(res.isDisliked != null && { isDisliked: res.isDisliked }),
                }
              : prev,
          );
      }
    } catch (_) {}
  }, [modalVideo?.id, modalContentType, currentUser?.id]);

  const handleModalShare = useCallback(async () => {
    if (!modalVideo?.id) return;
    try {
      setModalVideo(prev =>
        prev ? { ...prev, shareCount: (prev.shareCount ?? 0) + 1 } : prev,
      );
      if (modalContentType === 'video') {
        recordVideoShare(modalVideo.id);
      }
      await Share.share({
        message: modalVideo?.title ? `${modalVideo.title}` : 'Check this video',
        url: modalVideo?.videoUrl || '',
        title: modalVideo?.title || 'Video',
      });
    } catch (_) {}
  }, [
    modalVideo?.id,
    modalVideo?.title,
    modalVideo?.videoUrl,
    modalContentType,
  ]);

  const handleSubscribe = useCallback(async () => {
    if (requireLogin()) return;
    if (!modalVideo?.userId || !currentUser?.id) return;
    if (String(modalVideo.userId) === String(currentUser.id)) return;
    setSubLoading(true);
    try {
      if (channelSub.isSubscribed) {
        await unsubscribeFromChannel(currentUser.id, modalVideo.userId);
        setChannelSub(p => ({
          ...p,
          isSubscribed: false,
          subscriberCount: Math.max(0, (p.subscriberCount ?? 0) - 1),
        }));
      } else {
        await subscribeToChannel(currentUser.id, modalVideo.userId);
        setChannelSub(p => ({
          ...p,
          isSubscribed: true,
          subscriberCount: (p.subscriberCount ?? 0) + 1,
        }));
      }
    } catch (_) {
    } finally {
      setSubLoading(false);
    }
  }, [modalVideo?.userId, currentUser?.id, channelSub.isSubscribed]);

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

  const openVideoDetails = useCallback(
    item => {
      if (!item?.id) return;
      if (item.type === 'short') {
        // Open shorts player inside Shorts tab stack
        navigation.getParent()?.navigate('Shorts', {
          screen: 'ShortsVideoScreen',
          params: { shortId: item.id },
        });
        return;
      }
      // Open video details via Root stack
      try {
        navigation.getParent()?.getParent()?.navigate('VideoDetailsScreen', {
          videoId: item.id,
        });
      } catch (_) {
        navigation.navigate('VideoDetailsScreen', { videoId: item.id });
      }
    },
    [navigation],
  );

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
        <TouchableOpacity style={styles.backBtn}>
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
          title="Most Liked Videos"
          items={mostLikedThumbs}
          loading={mostLikedLoading}
          onItemPress={openVideoModal}
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
            <ActivityIndicator size="small" color="#F5A623" />
          ) : nearbyPromotions.length === 0 ? (
            <Text style={{ color: '#888', fontSize: 13 }}>
              No promotions near you right now.
            </Text>
          ) : (
            <View style={styles.promoWrapper}>
              {nearbyPromotions.slice(0, 8).map((p, idx) => (
                <TouchableOpacity
                  key={p.id || idx}
                  style={[
                    styles.promoButton,
                    { backgroundColor: idx % 2 === 0 ? '#F9A825' : '#2C3E50' },
                  ]}
                  activeOpacity={0.8}
                  onPress={() =>
                    navigation.navigate('PromotionFullDetail', { promotion: p })
                  }
                >
                  <Text style={styles.promoButtonText} numberOfLines={1}>
                    {p.title || p.user?.nickname || p.user?.name || 'Promo'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <VideoSection
          title="Saved Videos"
          items={savedThumbs}
          loading={savedLoading}
          onItemPress={openVideoModal}
        />
        <VideoSection
          title="My Videos"
          items={myVideoThumbs}
          loading={myVideosLoading}
          onItemPress={openVideoModal}
          rightAccessory={<Icon name="plus" size={24} color="#000" />}
        />

        {/* Scroll Indicator */}
        <View style={styles.bottomArrowContainer}>
          <Icon name="chevron-down" size={45} color="#333" />
        </View>
      </ScrollView>

      {/* Video quick-view modal (same as UserViewsScreen) */}
      <Modal
        visible={videoModalVisible}
        animationType="slide"
        onRequestClose={closeVideoModal}
      >
        <SafeAreaView style={styles.videoModalContainer} edges={['top']}>
          <View style={styles.videoModalHeader}>
            <TouchableOpacity
              onPress={closeVideoModal}
              style={styles.videoModalHeaderBtn}
            >
              <Icon name="chevron-down" size={30} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.videoModalHeaderTitle} numberOfLines={1}>
              {modalVideo?.title || 'Video'}
            </Text>
            <View style={styles.videoModalHeaderBtn} />
          </View>

          <View style={styles.videoPlayerWrap}>
            {videoModalLoading ? (
              <View style={styles.videoLoadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.videoLoadingText}>Loading…</Text>
              </View>
            ) : videoModalError ? (
              <View style={styles.videoErrorOverlay}>
                <Icon name="alert-circle-outline" size={44} color="#fff" />
                <Text style={styles.videoErrorText}>{videoModalError}</Text>
                <TouchableOpacity
                  style={styles.videoRetryBtn}
                  onPress={() =>
                    activeVideoItem && openVideoModal(activeVideoItem)
                  }
                >
                  <Icon name="refresh" size={18} color="#fff" />
                  <Text style={styles.videoRetryText}>Retry</Text>
                </TouchableOpacity>
              </View>
            ) : modalVideo?.videoUrl ? (
              <>
                <Video
                  ref={modalVideoRef}
                  source={{ uri: String(modalVideo.videoUrl).trim() }}
                  poster={modalVideo.thumbnail}
                  posterResizeMode="cover"
                  style={styles.videoPlayer}
                  resizeMode="contain"
                  paused={modalPaused}
                  repeat={false}
                  controls={false}
                  playInBackground={false}
                  playWhenInactive={false}
                  ignoreSilentSwitch="ignore"
                  onLoad={data => {
                    setModalProgress(p => ({
                      ...p,
                      duration: data?.duration || 0,
                    }));
                    setModalPaused(false);
                  }}
                  onProgress={data => {
                    if (seekingRef.current) return;
                    const now = Date.now();
                    if (now - progressUpdateRef.current < 500) return;
                    progressUpdateRef.current = now;
                    setModalProgress(p => ({
                      ...p,
                      currentTime: data?.currentTime ?? p.currentTime,
                      duration:
                        data?.seekableDuration || data?.duration || p.duration,
                    }));
                  }}
                  onError={() =>
                    setVideoModalError(
                      'Failed to play video. The video format may not be supported or the URL is inaccessible.',
                    )
                  }
                />
                <Pressable
                  style={styles.videoTapOverlay}
                  onPress={() => setModalPaused(p => !p)}
                >
                  <Icon
                    name={
                      modalPaused
                        ? 'play-circle-outline'
                        : 'pause-circle-outline'
                    }
                    size={74}
                    color="rgba(255,255,255,0.9)"
                  />
                </Pressable>

                <View style={styles.videoSliderRow}>
                  <Slider
                    style={styles.videoSlider}
                    value={modalDisplayTime}
                    minimumValue={0}
                    maximumValue={Math.max(0.1, modalProgress.duration)}
                    minimumTrackTintColor="#fff"
                    maximumTrackTintColor="rgba(255,255,255,0.35)"
                    thumbTintColor="#fff"
                    onSlidingStart={() => {
                      setModalIsSliding(true);
                      setModalSlidingValue(modalProgress.currentTime);
                    }}
                    onValueChange={val => setModalSlidingValue(val)}
                    onSlidingComplete={val => {
                      if (
                        !modalVideoRef.current ||
                        modalProgress.duration <= 0
                      ) {
                        setModalIsSliding(false);
                        return;
                      }
                      const clamped = Math.max(
                        0,
                        Math.min(val, modalProgress.duration),
                      );
                      seekingRef.current = true;
                      modalVideoRef.current.seek(clamped);
                      setModalProgress(p => ({ ...p, currentTime: clamped }));
                      progressUpdateRef.current = Date.now();
                      setTimeout(() => {
                        seekingRef.current = false;
                      }, 300);
                      setModalIsSliding(false);
                    }}
                  />
                  <Text style={styles.videoTimeText}>
                    {formatTime(modalDisplayTime)} /{' '}
                    {formatTime(modalProgress.duration)}
                  </Text>
                </View>
              </>
            ) : (
              <View style={styles.videoErrorOverlay}>
                <Text style={styles.videoErrorText}>Video not available</Text>
              </View>
            )}
          </View>

          <ScrollView
            style={styles.videoModalBody}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.videoActionsRow}>
              <TouchableOpacity
                style={styles.videoActionBtn}
                onPress={handleModalLike}
              >
                <Icon
                  name={modalVideo?.isLiked ? 'thumb-up' : 'thumb-up-outline'}
                  size={22}
                  color={modalVideo?.isLiked ? '#FF7F0B' : '#222'}
                />
                <Text style={styles.videoActionText}>
                  {formatCount(modalVideo?.likeCount ?? 0)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.videoActionBtn}
                onPress={handleModalDislike}
              >
                <Icon
                  name={
                    modalVideo?.isDisliked ? 'thumb-down' : 'thumb-down-outline'
                  }
                  size={22}
                  color={modalVideo?.isDisliked ? '#FF7F0B' : '#222'}
                />
                <Text style={styles.videoActionText}>
                  {formatCount(modalVideo?.dislikeCount ?? 0)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.videoActionBtn}
                onPress={() => {
                  if (requireLogin()) return;
                  setVideoCommentsVisible(true);
                }}
              >
                <Icon name="comment-text-outline" size={22} color="#222" />
                <Text style={styles.videoActionText}>
                  {formatCount(modalVideo?.commentCount ?? 0)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.videoActionBtn}
                onPress={handleModalShare}
              >
                <Icon name="share-outline" size={22} color="#222" />
                <Text style={styles.videoActionText}>
                  {formatCount(modalVideo?.shareCount ?? 0)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.videoActionBtn}
                onPress={() => {
                  if (requireLogin()) return;
                  setSaveVisible(true);
                }}
              >
                <Icon name="bookmark-outline" size={22} color="#222" />
                <Text style={styles.videoActionText}>Save</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.channelRow}>
              <View style={styles.channelLeft}>
                <Image
                  source={{ uri: modalVideo?.channelAvatar }}
                  style={styles.channelAvatar}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.channelName} numberOfLines={1}>
                    {modalVideo?.channelName || 'Channel'}
                  </Text>
                  <Text style={styles.channelSubText}>
                    {formatCount(channelSub.subscriberCount ?? 0)} subscribers
                  </Text>
                </View>
              </View>
              {modalVideo?.userId &&
              currentUser?.id &&
              String(modalVideo.userId) === String(currentUser.id) ? null : (
                <TouchableOpacity
                  style={[
                    styles.subscribeBtn,
                    channelSub.isSubscribed && styles.subscribedBtn,
                  ]}
                  onPress={handleSubscribe}
                  disabled={subLoading || !modalVideo?.userId}
                >
                  {subLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text
                      style={[
                        styles.subscribeText,
                        channelSub.isSubscribed && styles.subscribedText,
                      ]}
                    >
                      {channelSub.isSubscribed ? 'Subscribed' : 'Subscribe'}
                    </Text>
                  )}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.contactRow}>
              {modalVideo?.userId &&
              currentUser?.id &&
              String(modalVideo.userId) === String(currentUser.id) ? null : (
                <TouchableOpacity
                  style={styles.messageBtn}
                  onPress={() => {
                    if (requireLogin()) return;
                    if (!modalVideo?.userId) return;
                    navigation.navigate('ChatScreen', {
                      partnerId: modalVideo.userId,
                      partnerName: modalVideo.channelName || 'Channel',
                      partnerAvatar: modalVideo.channelAvatar,
                    });
                  }}
                >
                  <Icon name="message-text-outline" size={18} color="#fff" />
                  <Text style={styles.messageBtnText}>Message</Text>
                </TouchableOpacity>
              )}

              <View style={styles.socialRow}>
                {(modalVideo?.socialLinks || [])
                  .filter(l => (l?.url || '').trim())
                  .slice(0, 6)
                  .map((l, idx) => (
                    <TouchableOpacity
                      key={`${l.type}-${idx}`}
                      style={styles.socialBtn}
                      onPress={() => {
                        const url = (l.url || '').trim();
                        if (!url) return;
                        Linking.openURL(
                          url.startsWith('http') ? url : `https://${url}`,
                        );
                      }}
                    >
                      <Icon
                        name={getSocialIcon((l.type || '').toLowerCase())}
                        size={20}
                        color="#FF7F0B"
                      />
                    </TouchableOpacity>
                  ))}
              </View>
            </View>
          </ScrollView>

          <CommentsModal
            visible={videoCommentsVisible}
            onClose={() => setVideoCommentsVisible(false)}
            contentType={modalContentType}
            contentId={modalVideo?.id}
            videoId={modalVideo?.id}
            video={modalVideo}
            user={currentUser}
            onCommentAdded={() => {
              if (!modalVideo?.id) return;
              setModalVideo(prev =>
                prev
                  ? { ...prev, commentCount: (prev.commentCount ?? 0) + 1 }
                  : prev,
              );
            }}
            onCommentDeleted={(wasTopLevel, deletedCount) => {
              const dec = deletedCount || (wasTopLevel ? 1 : 0) || 0;
              if (dec <= 0) return;
              setModalVideo(prev =>
                prev
                  ? {
                      ...prev,
                      commentCount: Math.max(
                        0,
                        (prev.commentCount ?? 0) - dec,
                      ),
                    }
                  : prev,
              );
            }}
          />

          <SaveModal
            visible={saveVisible}
            onClose={() => setSaveVisible(false)}
            contentType={modalContentType}
            contentId={modalVideo?.id}
          />
        </SafeAreaView>
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

  profileWrapper: { marginHorizontal: 16, marginTop: 4 },
  darkHeader: {
    backgroundColor: '#34495E',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  brandingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  eatText: { color: '#FFF', fontSize: 44, fontWeight: 'bold', marginRight: 20 },
  ixText: { color: '#FFF', fontSize: 44, fontWeight: 'bold', marginLeft: 20 },
  avatarContainer: { position: 'relative' },
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

  promoWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  promoButton: {
    width: '48.5%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  promoButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  bottomArrowContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  scrollPadding: { paddingBottom: 20 },
  logoImage: {
    width: 85,
    height: 30,
    marginRight: 10,
    marginTop: -30,
  },
  logoImageIx: {
    width: 60,
    height: 30,
    marginLeft: 5,
    marginTop: -30,
  },

  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: -10 },

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
  videoModalContainer: { flex: 1, backgroundColor: '#000' },
  videoModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  videoModalHeaderBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoModalHeaderTitle: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  videoPlayerWrap: {
    width: '100%',
    height: (width * 9) / 16,
    backgroundColor: '#000',
    position: 'relative',
  },
  videoPlayer: { width: '100%', height: '100%' },
  videoTapOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoSliderRow: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoSlider: { flex: 1, height: 28, marginRight: 8 },
  videoTimeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  videoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  videoLoadingText: {
    color: '#fff',
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  videoErrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.75)',
  },
  videoErrorText: {
    color: '#fff',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
  },
  videoRetryBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  videoRetryText: { color: '#fff', fontWeight: '700' },
  videoModalBody: { flex: 1, backgroundColor: '#fff' },
  videoActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  videoActionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    minWidth: 60,
  },
  videoActionText: { fontSize: 12, color: '#222', fontWeight: '600' },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  channelLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    paddingRight: 10,
  },
  channelAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#111',
  },
  channelName: { fontSize: 14, fontWeight: '800', color: '#111' },
  channelSubText: { fontSize: 12, color: '#666', marginTop: 2 },
  subscribeBtn: {
    backgroundColor: '#FF7F0B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  subscribedBtn: { backgroundColor: '#f2f2f2' },
  subscribeText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  subscribedText: { color: '#333' },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  messageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#111',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  messageBtnText: { color: '#fff', fontWeight: '800', fontSize: 12 },
  socialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flex: 1,
    paddingLeft: 10,
    flexWrap: 'wrap',
  },
  socialBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF4EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default PromotionScreen;
