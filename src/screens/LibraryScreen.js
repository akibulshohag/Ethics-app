import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Share,
  Linking,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IMAGE_PLACEHOLDER } from '../utils/helper';
import { useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { appSetUser, clearBrowseLocation } from '../redux/actions/appSlice';
import { deleteMyAccount } from '../services/userSafetyService';
import { LOCATION_STORAGE_KEY } from '../services/userLocationService';
import { asyncStorageKeysToRemoveOnLogout } from '../utils/logoutStorage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Video from 'react-native-video';
import Slider from '@react-native-community/slider';
import CompactVideoCard from '../components/CompactVideoCard';
import CommentsModal from '../components/CommentsModal';
import SaveModal from '../components/SaveModal';
import {
  getUserVideos,
  getVideoWatchHistory,
  getVideoById,
  getLikedVideos,
  toggleLike as toggleVideoLike,
  toggleDislike as toggleVideoDislike,
  recordShare as recordVideoShare,
} from '../services/videoService';
import {
  getWatchLater,
  getFavorites,
  getPlaylistSummary,
  listCustomPlaylists,
  createCustomPlaylist,
} from '../services/playlistService';
import {
  getChannelProfile,
  subscribeToChannel,
  unsubscribeFromChannel,
} from '../services/channelService';
import { shortsService } from '../services/shortsService';
import { getDownloadedVideos } from '../services/downloadService';
import { getSocialIcon } from '../constants/socialLinks';
import { navigateToHomeOneLibraryDetail } from '../utils/navigateHomeLibraryDetail';
import { townOrCityOnlyFromUser } from '../utils/locationFormat';
import {
  distanceKmBetween,
  formatDistanceKm,
  resolveViewerLocationOpts,
  getOwnerLatLngFromMediaPayload,
} from '../utils/geoDistance';

const { width } = Dimensions.get('window');

const formatCount = n => {
  if (!n || n < 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

const safeUri = val =>
  typeof val === 'string' && val.trim().length > 0
    ? val.trim()
    : IMAGE_PLACEHOLDER;

const formatDuration = seconds => {
  if (!seconds || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const formatTimeAgo = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  if (diffMonths > 0)
    return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return 'Recently';
};

const mergeChannelProfileIntoMedia = (media, prof) => {
  if (!media || !prof || typeof prof !== 'object') return media;
  const u = media.user && typeof media.user === 'object' ? { ...media.user } : {};
  return {
    ...media,
    user: {
      ...u,
      id: u.id || prof.id,
      address: u.address || prof.address,
      latitude: u.latitude ?? prof.latitude,
      longitude: u.longitude ?? prof.longitude,
      nickname: u.nickname || prof.nickname,
      name: u.name || prof.name,
    },
    userId: media.userId || prof.id,
  };
};

const mapVideoApiToDisplay = (v, viewerOpts) => {
  const user = v.user || {};
  const viewCount = v.viewCount ?? v._count?.views ?? 0;
  const channelName = user.nickname || user.name || 'Unknown';
  const pubAt = v.publishedAt || v.createdAt;
  const locationShort = townOrCityOnlyFromUser(user);
  let distanceLabel = '';
  const { lat: olat, lng: olng } = getOwnerLatLngFromMediaPayload(v);
  if (
    viewerOpts?.viewerLat != null &&
    viewerOpts?.viewerLng != null &&
    olat != null &&
    olng != null
  ) {
    const km = distanceKmBetween(
      viewerOpts.viewerLat,
      viewerOpts.viewerLng,
      olat,
      olng,
    );
    if (km != null) distanceLabel = formatDistanceKm(km);
  }
  return {
    id: v.id,
    type: 'video',
    title: v.title || 'Untitled',
    channelName,
    views: `${formatCount(viewCount)} views`,
    viewsCompact: formatCount(viewCount),
    locationShort,
    distanceLabel,
    publishedAt: formatTimeAgo(pubAt),
    thumbnail:
      safeUri(v.thumbnailUrl || v.videoUrl) ||
      IMAGE_PLACEHOLDER,
    duration: formatDuration(v.duration),
  };
};

const mapShortApiToDisplay = (s, viewerOpts) => {
  const user = s.user || {};
  const viewCount = s.viewCount ?? s._count?.views ?? 0;
  const pubAt = s.publishedAt || s.createdAt;
  const channelName = user.nickname || user.name || 'Unknown';
  const locationShort = townOrCityOnlyFromUser(user);
  let distanceLabel = '';
  const { lat: olat, lng: olng } = getOwnerLatLngFromMediaPayload(s);
  if (
    viewerOpts?.viewerLat != null &&
    viewerOpts?.viewerLng != null &&
    olat != null &&
    olng != null
  ) {
    const km = distanceKmBetween(
      viewerOpts.viewerLat,
      viewerOpts.viewerLng,
      olat,
      olng,
    );
    if (km != null) distanceLabel = formatDistanceKm(km);
  }
  return {
    id: s.id,
    type: 'short',
    title:
      (s.title || 'Untitled').slice(0, 80) +
      (s.title?.length > 80 ? '...' : ''),
    channelName,
    views: `${formatCount(viewCount)} views`,
    viewsCompact: formatCount(viewCount),
    locationShort,
    distanceLabel,
    publishedAt: formatTimeAgo(pubAt),
    thumbnail:
      safeUri(s.thumbnailUrl || s.videoUrl) ||
      IMAGE_PLACEHOLDER,
    duration: s.duration ? formatDuration(s.duration) : 'SHORT',
  };
};

const mergeUpdatedShortToLibraryCard = (card, updated) => ({
  ...card,
  title:
    ((updated?.title ?? card.title ?? 'Untitled').slice(0, 80)) +
    ((updated?.title ?? card.title)?.length > 80 ? '...' : ''),
  thumbnail: safeUri(updated?.thumbnailUrl || updated?.coverUrl || card.thumbnail),
});

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
    thumbnail:
      v.thumbnailUrl || v.videoUrl || IMAGE_PLACEHOLDER,
    durationSeconds: v.duration ?? 0,
    likeCount: v.likeCount ?? v._count?.likes ?? 0,
    dislikeCount: v.dislikeCount ?? 0,
    commentCount: v.commentCount ?? v._count?.comments ?? 0,
    shareCount: v.shareCount ?? 0,
    isLiked: v.isLiked ?? false,
    isDisliked: v.isDisliked ?? false,
    userId: v.userId,
    channelName,
    channelAvatar,
    socialLinks: Array.isArray(u.socialLinks) ? u.socialLinks : [],
  };
};

const LOCATION_KEY = 'USER_LOCATION_SELECTION';

const LibraryScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector(state => state.app) || {};
  const [currentView, setCurrentView] = useState('library');
  const [modalVisible, setModalVisible] = useState(false);
  const [playlistTitle, setPlaylistTitle] = useState('');
  const [customPlaylists, setCustomPlaylists] = useState([]);
  const [customPlaylistsLoading, setCustomPlaylistsLoading] = useState(false);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);
  const [userVideos, setUserVideos] = useState([]);
  const [userShorts, setUserShorts] = useState([]);
  const [yourVideosLoading, setYourVideosLoading] = useState(false);
  const [yourVideosRefreshing, setYourVideosRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Videos');
  const [watchHistory, setWatchHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('All'); // All | Videos | Shorts
  const [downloadedVideos, setDownloadedVideos] = useState([]);
  const [savedBrowseCoords, setSavedBrowseCoords] = useState(null);

  const loadStoredBrowseCoords = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(LOCATION_KEY);
      if (!raw) {
        setSavedBrowseCoords(null);
        return;
      }
      const saved = JSON.parse(raw);
      const lat = saved?.coords?.lat ?? saved?.lat;
      const lng = saved?.coords?.lng ?? saved?.lng;
      if (lat != null && lng != null) {
        setSavedBrowseCoords({ lat: Number(lat), lng: Number(lng) });
      } else {
        setSavedBrowseCoords(null);
      }
    } catch {
      setSavedBrowseCoords(null);
    }
  }, []);

  useEffect(() => {
    loadStoredBrowseCoords();
  }, [loadStoredBrowseCoords]);

  useFocusEffect(
    useCallback(() => {
      loadStoredBrowseCoords();
    }, [loadStoredBrowseCoords]),
  );

  const viewerCoords = useMemo(
    () => resolveViewerLocationOpts(savedBrowseCoords, currentUser),
    [
      savedBrowseCoords,
      currentUser?.latitude,
      currentUser?.longitude,
      currentUser?.id,
    ],
  );

  useEffect(() => {
    const sub = shortsService.onShortUpdated?.(updated => {
      const sid = String(updated?.id || '').trim();
      if (!sid) return;
      setUserVideos(prev =>
        prev.map(v =>
          String(v?.id) === sid && String(v?.type || '').toLowerCase() === 'short'
            ? mergeUpdatedShortToLibraryCard(v, updated)
            : v,
        ),
      );
    });
    return () => sub?.remove?.();
  }, []);
  const [downloadsLoading, setDownloadsLoading] = useState(false);

  // Playlist counts (Watch Later, Liked, Favorites) - dynamic
  const [watchLaterCount, setWatchLaterCount] = useState(0);
  const [likedCount, setLikedCount] = useState(0);
  const [favoritesCount, setFavoritesCount] = useState(0);
  const [playlistCountsLoading, setPlaylistCountsLoading] = useState(false);
  const playlistFocusAtRef = useRef(0);

  // Video quick-view modal (same as UserViewsScreen)
  const [videoModalVisible, setVideoModalVisible] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState(null);
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
  const modalVideoRef = useRef(null);
  const seekingRef = useRef(false);
  const progressUpdateRef = useRef(0);
  const [saveVisible, setSaveVisible] = useState(false);
  const [videoCommentsVisible, setVideoCommentsVisible] = useState(false);
  const [channelSub, setChannelSub] = useState({
    isSubscribed: false,
    subscriberCount: 0,
  });
  const [subLoading, setSubLoading] = useState(false);

  const loadYourVideos = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const [vRes, sRes] = await Promise.all([
        getUserVideos(currentUser.id, 1, 50, currentUser.id),
        shortsService.getUserShorts(currentUser.id, 1, 50, currentUser.id),
      ]);
      const vList = Array.isArray(vRes.videos) ? vRes.videos : vRes?.data || [];
      const sList = Array.isArray(sRes.shorts) ? sRes.shorts : sRes?.data || [];
      setUserVideos(vList.map(v => mapVideoApiToDisplay(v, viewerCoords)));
      setUserShorts(sList.map(s => mapShortApiToDisplay(s, viewerCoords)));
    } catch (e) {
      console.error('Failed to load your videos/shorts:', e);
      setUserVideos([]);
      setUserShorts([]);
    }
  }, [currentUser?.id, viewerCoords]);

  useEffect(() => {
    if (currentView === 'yourVideos' && currentUser?.id) {
      setYourVideosLoading(true);
      loadYourVideos().finally(() => setYourVideosLoading(false));
    }
  }, [currentView, currentUser?.id, loadYourVideos]);

  const onRefreshYourVideos = useCallback(async () => {
    if (!currentUser?.id) return;
    setYourVideosRefreshing(true);
    await loadYourVideos();
    setYourVideosRefreshing(false);
  }, [currentUser?.id, loadYourVideos]);

  const loadDownloads = useCallback(async () => {
    try {
      const list = await getDownloadedVideos();
      setDownloadedVideos(list);
    } catch {
      setDownloadedVideos([]);
    }
  }, []);

  useEffect(() => {
    if (currentView === 'downloads') {
      setDownloadsLoading(true);
      loadDownloads().finally(() => setDownloadsLoading(false));
    }
  }, [currentView, loadDownloads]);

  const requireLogin = useCallback(() => {
    if (!currentUser?.id) {
      Alert.alert('Login required', 'Please login to continue.');
      return true;
    }
    return false;
  }, [currentUser?.id]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Log out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log out',
          style: 'destructive',
          onPress: async () => {
            try {
              dispatch(appSetUser(null));
              dispatch(clearBrowseLocation());
              const allKeys = await AsyncStorage.getAllKeys();
              const toRemove = asyncStorageKeysToRemoveOnLogout(allKeys);
              if (toRemove.length > 0) {
                await AsyncStorage.multiRemove(toRemove);
              }
              await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
              const parent = navigation.getParent();
              const root = parent?.getParent?.();
              if (root) {
                root.reset({
                  index: 0,
                  routes: [
                    {
                      name: 'Root',
                      state: {
                        index: 0,
                        routes: [
                          {
                            name: 'Home1',
                            state: {
                              index: 1,
                              routes: [
                                { name: 'HomeOneScreen' },
                                { name: 'HomeSevenScreen' },
                              ],
                            },
                          },
                        ],
                      },
                    },
                  ],
                });
              } else {
                navigation.navigate('HomeSevenScreen');
              }
            } catch (e) {
              console.error('Logout error:', e);
              Alert.alert('Error', 'Failed to log out. Please try again.');
            }
          },
        },
      ],
      { cancelable: true },
    );
  }, [dispatch, navigation]);

  const resetToLoginAfterDelete = useCallback(async () => {
    dispatch(appSetUser(null));
    dispatch(clearBrowseLocation());
    const allKeys = await AsyncStorage.getAllKeys();
    const toRemove = asyncStorageKeysToRemoveOnLogout(allKeys);
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
    await AsyncStorage.removeItem(LOCATION_STORAGE_KEY);
    const parent = navigation.getParent();
    const root = parent?.getParent?.();
    if (root) {
      root.reset({
        index: 0,
        routes: [
          {
            name: 'Root',
            state: {
              index: 0,
              routes: [
                {
                  name: 'Home1',
                  state: {
                    index: 1,
                    routes: [
                      { name: 'HomeOneScreen' },
                      { name: 'HomeSevenScreen' },
                    ],
                  },
                },
              ],
            },
          },
        ],
      });
    } else {
      navigation.navigate('HomeSevenScreen');
    }
  }, [dispatch, navigation]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your EatWaze account and data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm deletion',
              'Are you sure you want to permanently delete your account?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await deleteMyAccount();
                      await resetToLoginAfterDelete();
                    } catch (error) {
                      Alert.alert(
                        'Could not delete account',
                        error?.message ||
                          'Please try again or contact support.',
                      );
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [resetToLoginAfterDelete]);

  const openVideoModal = useCallback(
    async videoId => {
      if (!videoId) return;
      setActiveVideoId(videoId);
      setVideoModalVisible(true);
      setVideoModalLoading(true);
      setVideoModalError(null);
      setModalVideo(null);
      setModalPaused(true);
      setModalProgress({ currentTime: 0, duration: 0 });
      setModalIsSliding(false);
      setModalSlidingValue(0);
      setChannelSub({ isSubscribed: false, subscriberCount: 0 });
      try {
        const res = await getVideoById(
          videoId,
          currentUser?.id,
          currentUser?.role || 'user',
        );
        const mv = mapVideoApiToModal(res);
        setModalVideo(mv);
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
    setModalVideo(null);
    setVideoModalError(null);
    setModalPaused(true);
    setModalProgress({ currentTime: 0, duration: 0 });
    setModalIsSliding(false);
    setModalSlidingValue(0);
    setVideoCommentsVisible(false);
    setSaveVisible(false);
  }, []);

  const formatTime = useCallback(sec => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
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
      const res = await toggleVideoLike(modalVideo.id, currentUser.id);
      if (res) {
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
  }, [currentUser?.id, modalVideo?.id, requireLogin]);

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
      const res = await toggleVideoDislike(modalVideo.id, currentUser.id);
      if (res) {
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
  }, [currentUser?.id, modalVideo?.id, requireLogin]);

  const handleModalShare = useCallback(async () => {
    if (!modalVideo?.id) return;
    try {
      setModalVideo(prev =>
        prev ? { ...prev, shareCount: (prev.shareCount ?? 0) + 1 } : prev,
      );
      recordVideoShare(modalVideo.id);
      await Share.share({
        message: modalVideo?.title ? `${modalVideo.title}` : 'Check this video',
        url: modalVideo?.videoUrl || '',
        title: modalVideo?.title || 'Video',
      });
    } catch (_) {}
  }, [modalVideo?.id, modalVideo?.title, modalVideo?.videoUrl]);

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
  }, [
    channelSub.isSubscribed,
    currentUser?.id,
    modalVideo?.userId,
    requireLogin,
  ]);

  const handleVideoPress = useCallback(
    item => {
      if (item.localPath) {
        navigation?.navigate('VideoDetailsScreen', {
          videoId: item.id,
          offlineVideo: item,
        });
        return;
      }
      navigateToHomeOneLibraryDetail(navigation, item, { returnTo: 'library' });
    },
    [navigation],
  );

  const loadHistory = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const [vRes, sRes] = await Promise.all([
        getVideoWatchHistory(currentUser.id, 1, 100),
        shortsService.getWatchHistory(currentUser.id, 1, 100),
      ]);
      const vHistory = Array.isArray(vRes.history) ? vRes.history : [];
      const sHistory = Array.isArray(sRes.history) ? sRes.history : [];

      const ownerIds = new Set();
      vHistory.forEach(({ video: vid }) => {
        const id = vid?.userId || vid?.user?.id;
        if (id) ownerIds.add(String(id));
      });
      sHistory.forEach(({ short: sh }) => {
        const id = sh?.userId || sh?.user?.id;
        if (id) ownerIds.add(String(id));
      });

      const profileById = {};
      await Promise.allSettled(
        [...ownerIds].map(async oid => {
          try {
            const p = await getChannelProfile(oid, currentUser.id);
            if (p?.id) profileById[oid] = p;
          } catch {
            profileById[oid] = null;
          }
        }),
      );

      const withOwnerProfile = (media, ownerId) => {
        const p = ownerId ? profileById[String(ownerId)] : null;
        return p ? mergeChannelProfileIntoMedia(media, p) : media;
      };

      const videoItems = vHistory.map(({ video, watchedAt }) => {
        const oid = video?.userId || video?.user?.id;
        return {
          ...mapVideoApiToDisplay(withOwnerProfile(video, oid), viewerCoords),
          watchedAt: new Date(watchedAt).getTime(),
        };
      });
      const shortItems = sHistory.map(({ short, watchedAt }) => {
        const oid = short?.userId || short?.user?.id;
        return {
          ...mapShortApiToDisplay(withOwnerProfile(short, oid), viewerCoords),
          watchedAt: new Date(watchedAt).getTime(),
        };
      });
      const merged = [...videoItems, ...shortItems].sort(
        (a, b) => (b.watchedAt || 0) - (a.watchedAt || 0),
      );
      setWatchHistory(merged);
    } catch (e) {
      console.error('Failed to load watch history:', e);
      setWatchHistory([]);
    }
  }, [currentUser?.id, viewerCoords]);

  useEffect(() => {
    if (
      (currentView === 'history' || currentView === 'library') &&
      currentUser?.id
    ) {
      if (currentView === 'history') {
        setHistoryLoading(true);
      }
      loadHistory().finally(() => setHistoryLoading(false));
    }
  }, [currentView, currentUser?.id, loadHistory, viewerCoords]);

  const onRefreshHistory = useCallback(async () => {
    if (!currentUser?.id) return;
    setHistoryRefreshing(true);
    await loadHistory();
    setHistoryRefreshing(false);
  }, [currentUser?.id, loadHistory]);

  const loadCustomPlaylists = useCallback(async () => {
    if (!currentUser?.id) {
      setCustomPlaylists([]);
      return;
    }
    setCustomPlaylistsLoading(true);
    try {
      const list = await listCustomPlaylists(currentUser.id);
      setCustomPlaylists(Array.isArray(list) ? list : []);
    } catch (e) {
      setCustomPlaylists([]);
    } finally {
      setCustomPlaylistsLoading(false);
    }
  }, [currentUser?.id]);

  const loadPlaylistCounts = useCallback(async () => {
    if (!currentUser?.id) {
      setWatchLaterCount(0);
      setLikedCount(0);
      setFavoritesCount(0);
      return;
    }
    setPlaylistCountsLoading(true);
    try {
      const countItems = res => {
        const items = Array.isArray(res?.items) ? res.items.length : 0;
        const videos = Array.isArray(res?.videos) ? res.videos.length : 0;
        const shorts = Array.isArray(res?.shorts) ? res.shorts.length : 0;
        return items > 0 ? items : videos + shorts;
      };

      const [summary, watchLaterRes, likedVRes, likedSRes, favoritesRes] =
        await Promise.all([
          getPlaylistSummary(currentUser.id),
          getWatchLater(currentUser.id, 1, 500),
          getLikedVideos(currentUser.id, 1, 500),
          shortsService.getLikedShorts(currentUser.id, 1, 500),
          getFavorites(currentUser.id, 1, 500),
        ]);

      if (
        summary &&
        (summary.watchLaterCount != null ||
          summary.likedCount != null ||
          summary.favoritesCount != null)
      ) {
        setWatchLaterCount(Math.max(0, Number(summary.watchLaterCount) || 0));
        setLikedCount(Math.max(0, Number(summary.likedCount) || 0));
        setFavoritesCount(Math.max(0, Number(summary.favoritesCount) || 0));
      } else {
        setWatchLaterCount(countItems(watchLaterRes));
        setLikedCount(countItems(likedVRes) + countItems(likedSRes));
        setFavoritesCount(countItems(favoritesRes));
      }
    } catch (e) {
      console.warn('Failed to load playlist counts:', e?.message || e);
      setWatchLaterCount(0);
      setLikedCount(0);
      setFavoritesCount(0);
    } finally {
      setPlaylistCountsLoading(false);
    }
  }, [currentUser?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!currentUser?.id) return;
      const now = Date.now();
      const last = playlistFocusAtRef.current || 0;
      // Skip refetch if we loaded within the last 20s (tab switching).
      if (now - last < 20_000) return;
      playlistFocusAtRef.current = now;
      loadPlaylistCounts();
      if (currentView === 'library') {
        loadCustomPlaylists();
      }
    }, [currentUser?.id, currentView, loadPlaylistCounts, loadCustomPlaylists]),
  );

  const renderHeader = () => {
    const isLibrary = currentView === 'library';
    let title = 'Library';
    if (currentView === 'history') title = 'History';
    if (currentView === 'yourVideos') title = 'Your Videos';
    if (currentView === 'downloads') title = 'Downloads';
    if (currentView === 'watchLater') title = 'Watch Later';
    if (currentView === 'favorites') title = 'My Favorite Songs';

    return (
      <>
        {/* <View style={styles.logoRow}>
          {!isLibrary ? (
            <TouchableOpacity onPress={() => setCurrentView('library')}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={28}
                color="#333"
              />
            </TouchableOpacity>
          ) : (
            <MaterialCommunityIcons name="play-box" size={28} color="#F97507" />
          )}
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity>
            <MaterialCommunityIcons name="magnify" size={26} color="#333" />
          </TouchableOpacity>
          {!isLibrary ? (
            <TouchableOpacity style={styles.iconMargin}>
              <MaterialCommunityIcons
                name="dots-vertical"
                size={26}
                color="#333"
              />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.iconMargin}>
                <MaterialCommunityIcons
                  name="bell-outline"
                  size={26}
                  color="#333"
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation?.navigate('ProfileScreen')}>
                <Image
                  source={{ uri: 'https://i.pravatar.cc/100' }}
                  style={styles.profilePic}
                />
              </TouchableOpacity>
            </>
          )}
        </View> */}
        <View style={styles.topNavigation}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (currentView !== 'library') {
                setCurrentView('library');
              } else {
                navigation?.goBack();
              }
            }}
          >
            <View style={styles.backButtonInner}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={16}
                color="#fff"
              />
              <Text style={styles.backText}>Back</Text>
            </View>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const renderNewPlaylistModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalHeaderTitle}>New Playlist</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Playlist Title</Text>
                <TextInput
                  style={styles.modalInput}
                  placeholder="My playlist"
                  placeholderTextColor="#999"
                  value={playlistTitle}
                  onChangeText={setPlaylistTitle}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Privacy</Text>
                <TouchableOpacity style={styles.privacySelector}>
                  <View style={styles.privacyLeft}>
                    <MaterialCommunityIcons
                      name="lock-outline"
                      size={20}
                      color="#333"
                    />
                    <Text style={styles.privacyText}>Private</Text>
                  </View>
                  <MaterialCommunityIcons
                    name="menu-down"
                    size={24}
                    color="#333"
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.createButton,
                    creatingPlaylist && { opacity: 0.7 },
                  ]}
                  disabled={creatingPlaylist}
                  onPress={async () => {
                    if (requireLogin()) return;
                    const name = (playlistTitle || '').trim() || 'My playlist';
                    setCreatingPlaylist(true);
                    try {
                      const res = await createCustomPlaylist(name);
                      setModalVisible(false);
                      setPlaylistTitle('');
                      await loadCustomPlaylists();
                      await loadPlaylistCounts();
                      navigation.navigate('CustomPlaylistScreen', {
                        playlistId: res.id,
                        title: res.name,
                      });
                    } catch (e) {
                      Alert.alert(
                        'Could not create playlist',
                        e?.response?.data?.message ||
                          e?.message ||
                          'Try again.',
                      );
                    } finally {
                      setCreatingPlaylist(false);
                    }
                  }}
                >
                  {creatingPlaylist ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.createButtonText}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderListView = (data, options = {}) => {
    const {
      isYourVideos = false,
      activeFilter: filter = 'Videos',
      setActiveFilter: setFilter,
      loading = false,
      refreshing = false,
      onRefresh,
      onPress,
      emptyTitle,
      emptySubtitle,
    } = options;

    const listData = isYourVideos
      ? filter === 'Videos'
        ? userVideos
        : userShorts
      : data;

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        {renderHeader()}
        {renderVideoModal()}
        {isYourVideos && (
          <View style={styles.filterWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              <TouchableOpacity
                style={
                  filter === 'Videos'
                    ? styles.filterChipActive
                    : styles.filterChip
                }
                onPress={() => setFilter?.('Videos')}
              >
                <Text
                  style={
                    filter === 'Videos'
                      ? styles.filterTextActive
                      : styles.filterText
                  }
                >
                  Videos ({userVideos.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={
                  filter === 'Shorts'
                    ? styles.filterChipActive
                    : styles.filterChip
                }
                onPress={() => setFilter?.('Shorts')}
              >
                <Text
                  style={
                    filter === 'Shorts'
                      ? styles.filterTextActive
                      : styles.filterText
                  }
                >
                  Shorts ({userShorts.length})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97507" />
          </View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item, index) =>
              `${item.id || 'item'}-${item.type || 'v'}-${index}`
            }
            renderItem={({ item }) => (
              <CompactVideoCard
                video={item}
                onPress={() => (onPress ? onPress(item) : null)}
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              listData.length === 0 && styles.emptyListContent,
            ]}
            ListEmptyComponent={
              listData.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name={emptyTitle ? 'download-outline' : 'video-outline'}
                    size={64}
                    color="#FF7F0B"
                  />
                  <Text style={styles.emptyStateText}>
                    {emptyTitle || `No ${filter.toLowerCase()} yet`}
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    {emptySubtitle ||
                      (filter === 'Videos'
                        ? 'Upload your first video to get started'
                        : 'Create your first short to get started')}
                  </Text>
                </View>
              ) : null
            }
            refreshControl={
              isYourVideos && onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#F97507']}
                />
              ) : undefined
            }
          />
        )}
      </SafeAreaView>
    );
  };

  const renderVideoModal = () => (
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
            <MaterialCommunityIcons
              name="chevron-down"
              size={30}
              color="#fff"
            />
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
              <MaterialCommunityIcons
                name="alert-circle-outline"
                size={44}
                color="#fff"
              />
              <Text style={styles.videoErrorText}>{videoModalError}</Text>
              <TouchableOpacity
                style={styles.videoRetryBtn}
                onPress={() => activeVideoId && openVideoModal(activeVideoId)}
              >
                <MaterialCommunityIcons name="refresh" size={18} color="#fff" />
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
                <MaterialCommunityIcons
                  name={
                    modalPaused ? 'play-circle-outline' : 'pause-circle-outline'
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
                    if (!modalVideoRef.current || modalProgress.duration <= 0) {
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
              <MaterialCommunityIcons
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
              <MaterialCommunityIcons
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
              <MaterialCommunityIcons
                name="comment-text-outline"
                size={22}
                color="#222"
              />
              <Text style={styles.videoActionText}>
                {formatCount(modalVideo?.commentCount ?? 0)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.videoActionBtn}
              onPress={handleModalShare}
            >
              <MaterialCommunityIcons
                name="share-outline"
                size={22}
                color="#222"
              />
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
              <MaterialCommunityIcons
                name="bookmark-outline"
                size={22}
                color="#222"
              />
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
            {!isOwnVideo && (
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
            {!isOwnVideo && (
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
                <MaterialCommunityIcons
                  name="message-text-outline"
                  size={18}
                  color="#fff"
                />
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
                    <MaterialCommunityIcons
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
                    commentCount: Math.max(0, (prev.commentCount ?? 0) - dec),
                  }
                : prev,
            );
          }}
        />

        <SaveModal
          visible={saveVisible}
          onClose={() => setSaveVisible(false)}
          contentType="video"
          contentId={modalVideo?.id}
        />
      </SafeAreaView>
    </Modal>
  );

  if (currentView === 'history') {
    const historyList =
      historyFilter === 'Videos'
        ? watchHistory.filter(i => i.type === 'video')
        : historyFilter === 'Shorts'
        ? watchHistory.filter(i => i.type === 'short')
        : watchHistory;
    const videoCount = watchHistory.filter(i => i.type === 'video').length;
    const shortCount = watchHistory.filter(i => i.type === 'short').length;

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        {renderHeader()}
        {renderVideoModal()}
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              style={
                historyFilter === 'All'
                  ? styles.filterChipActive
                  : styles.filterChip
              }
              onPress={() => setHistoryFilter('All')}
            >
              <Text
                style={
                  historyFilter === 'All'
                    ? styles.filterTextActive
                    : styles.filterText
                }
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={
                historyFilter === 'Videos'
                  ? styles.filterChipActive
                  : styles.filterChip
              }
              onPress={() => setHistoryFilter('Videos')}
            >
              <Text
                style={
                  historyFilter === 'Videos'
                    ? styles.filterTextActive
                    : styles.filterText
                }
              >
                Videos ({videoCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={
                historyFilter === 'Shorts'
                  ? styles.filterChipActive
                  : styles.filterChip
              }
              onPress={() => setHistoryFilter('Shorts')}
            >
              <Text
                style={
                  historyFilter === 'Shorts'
                    ? styles.filterTextActive
                    : styles.filterText
                }
              >
                Shorts ({shortCount})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        {historyLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97507" />
          </View>
        ) : (
          <FlatList
            data={historyList}
            keyExtractor={(item, index) =>
              `${item.id || 'item'}-${item.type || 'v'}-${index}`
            }
            renderItem={({ item }) => (
              <CompactVideoCard
                video={item}
                onPress={() => handleVideoPress(item)}
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              historyList.length === 0 && styles.emptyListContent,
            ]}
            ListEmptyComponent={
              historyList.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="history"
                    size={64}
                    color="#ccc"
                  />
                  <Text style={styles.emptyStateText}>
                    No watch history yet
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    Videos and shorts you watch will appear here
                  </Text>
                </View>
              ) : null
            }
            refreshControl={
              currentUser?.id ? (
                <RefreshControl
                  refreshing={historyRefreshing}
                  onRefresh={onRefreshHistory}
                  colors={['#F97507']}
                />
              ) : undefined
            }
          />
        )}
      </SafeAreaView>
    );
  }

  if (currentView === 'yourVideos') {
    return renderListView([], {
      isYourVideos: true,
      activeFilter,
      setActiveFilter,
      loading: yourVideosLoading,
      refreshing: yourVideosRefreshing,
      onRefresh: onRefreshYourVideos,
      onPress: handleVideoPress,
    });
  }
  if (currentView === 'downloads') {
    return renderListView(downloadedVideos, {
      loading: downloadsLoading,
      onPress: handleVideoPress,
      emptyTitle: 'No downloads yet',
      emptySubtitle:
        'Download videos from the video details screen to watch offline',
    });
  }

  const isOwnVideo =
    !!currentUser?.id &&
    !!modalVideo?.userId &&
    String(currentUser.id) === String(modalVideo.userId);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}
      {renderNewPlaylistModal()}
      {renderVideoModal()}

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>History</Text>
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F7BB5B',
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 5,
            }}
            onPress={() => setCurrentView('history')}
          >
            <Text style={styles.viewAllText}>{'View All'} </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={14}
              color="#000"
            />
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.historyScroll}
        >
          {(watchHistory.length > 0 ? watchHistory.slice(0, 8) : []).map(
            (item, index) => (
              <TouchableOpacity
                key={`${item.id}-${item.type || 'v'}-${index}`}
                style={styles.historyCard}
                onPress={() => handleVideoPress(item)}
                activeOpacity={1}
              >
                <View>
                  <Image
                    source={{ uri: item.thumbnail }}
                    style={styles.historyThumb}
                  />
                  {/* <View style={styles.durationBadge}>
                    <Text style={styles.durationText}>{item.duration}</Text>
                  </View> */}
                </View>
                <View style={styles.historyInfo}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Text style={styles.historyTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: '#666' }}>
                        {item.viewsCompact ?? '—'}
                      </Text>
                      <MaterialCommunityIcons
                        name="eye"
                        size={16}
                        color="#666"
                      />
                    </View>
                  </View>
                  <View style={styles.historyMetaRow}>
                    {/* <Text style={styles.historyChannel}>
                      {item.channelName || 'Channel'} • {item.publishedAt}
                    </Text> */}
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 2,
                      }}
                    >
                      <MaterialCommunityIcons
                        name="map-marker"
                        size={16}
                        color="#666"
                      />
                      <Text style={{ fontSize: 12, color: '#666' }}>
                        {item.locationShort || '—'}
                      </Text>
                    </View>
                    <TouchableOpacity>
                      {/* <MaterialCommunityIcons
                        name="dots-vertical"
                        size={16}
                        color="#666"
                      /> */}
                      <Text style={{ fontSize: 12, color: '#666' }}>
                        {item.distanceLabel || '—'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            ),
          )}
        </ScrollView>

        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setCurrentView('yourVideos')}
        >
          <View style={styles.menuIconContainer}>
            <MaterialCommunityIcons
              name="play-circle"
              size={24}
              color="#F97507"
            />
          </View>
          <Text style={styles.menuText}>Your Videos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setCurrentView('downloads')}
        >
          <View style={styles.menuIconContainer}>
            <MaterialCommunityIcons
              name="download-circle"
              size={24}
              color="#F97507"
            />
          </View>
          <Text style={styles.menuText}>Downloads</Text>
        </TouchableOpacity>
        <View style={styles.divider} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Playlists</Text>
          <TouchableOpacity style={styles.recentlyAdded}>
            <Text style={styles.sortText}>Recently Added</Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={16}
              color="#424242"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.playlistItem}
          onPress={() => {
            if (requireLogin()) return;
            setPlaylistTitle('');
            setModalVisible(true);
          }}
        >
          <View style={styles.menuIconContainer}>
            <MaterialCommunityIcons name="plus" size={28} color="#F97507" />
          </View>
          <Text style={styles.menuText}>New Playlist</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playlistItem}
          onPress={() => navigation?.navigate('WatchLaterScreen')}
        >
          <View style={styles.menuIconContainer}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={24}
              color="#F97507"
            />
          </View>
          <View>
            <Text style={styles.menuText}>Watch Later</Text>
            <Text style={styles.subText}>
              {playlistCountsLoading
                ? '...'
                : `${watchLaterCount} unwatched video${
                    watchLaterCount !== 1 ? 's' : ''
                  }`}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playlistItem}
          onPress={() => navigation?.navigate('LikedScreen')}
        >
          <View style={styles.menuIconContainer}>
            <MaterialCommunityIcons name="thumb-up" size={24} color="#F97507" />
          </View>
          <View>
            <Text style={styles.menuText}>Liked Videos</Text>
            <Text style={styles.subText}>
              {playlistCountsLoading
                ? '...'
                : `${likedCount} video${likedCount !== 1 ? 's' : ''}`}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playlistItem}
          onPress={() => navigation?.navigate('FavoritesScreen')}
        >
          <View style={styles.menuIconContainer}>
            <MaterialCommunityIcons
              name="heart-outline"
              size={24}
              color="#F97507"
            />
          </View>
          <View>
            <Text style={styles.menuText}>My Favorite Songs</Text>
            <Text style={styles.subText}>
              {playlistCountsLoading
                ? '...'
                : `${favoritesCount} video${favoritesCount !== 1 ? 's' : ''}`}
            </Text>
          </View>
        </TouchableOpacity>

        {customPlaylistsLoading ? (
          <View style={{ paddingVertical: 16, alignItems: 'center' }}>
            <ActivityIndicator color="#F97507" />
          </View>
        ) : (
          customPlaylists.map(pl => (
            <TouchableOpacity
              key={pl.id}
              style={styles.playlistItem}
              onPress={() =>
                navigation.navigate('CustomPlaylistScreen', {
                  playlistId: pl.id,
                  title: pl.name,
                })
              }
            >
              <View style={styles.menuIconContainer}>
                <MaterialCommunityIcons
                  name="playlist-play"
                  size={24}
                  color="#F97507"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuText} numberOfLines={2}>
                  {pl.name}
                </Text>
                <Text style={styles.subText}>
                  {pl.itemCount ?? 0} video
                  {(pl.itemCount ?? 0) !== 1 ? 's' : ''}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}

        {currentUser?.id ? (
          <>
            <View style={styles.divider} />
            <TouchableOpacity
              style={styles.playlistItem}
              onPress={handleDeleteAccount}
            >
              <View
                style={[styles.menuIconContainer, styles.logoutIconContainer]}
              >
                <MaterialCommunityIcons
                  name="account-remove-outline"
                  size={24}
                  color="#E53935"
                />
              </View>
              <Text style={[styles.menuText, styles.logoutText]}>
                Delete account
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.playlistItem, styles.logoutButton]}
              onPress={handleLogout}
            >
              <View
                style={[styles.menuIconContainer, styles.logoutIconContainer]}
              >
                <MaterialCommunityIcons
                  name="logout"
                  size={24}
                  color="#E53935"
                />
              </View>
              <Text style={[styles.menuText, styles.logoutText]}>Log out</Text>
            </TouchableOpacity>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  listContent: { paddingTop: 10 },
  emptyListContent: { flexGrow: 1 },
  topNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  moreIcon: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 6,
  },
  emptyStateSubtext: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#1a1a1a',
  },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconMargin: { marginHorizontal: 15 },
  profilePic: { width: 30, height: 30, borderRadius: 15 },
  searchSection: { padding: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 45,
  },
  searchInput: { flex: 1, marginHorizontal: 10, fontSize: 14, color: '#333' },
  filterWrapper: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterScroll: { paddingHorizontal: 16 },
  filterChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F97507',
    marginRight: 8,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  filterTextActive: { color: '#F97507', fontWeight: 'bold', marginRight: 4 },
  filterText: { color: '#666' },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  viewAllText: { color: '#424242', fontWeight: '600', fontSize: 10 },
  historyScroll: { paddingLeft: 16, paddingVertical: 15 },
  historyCard: { width: 165, marginRight: 8 },
  historyThumb: { width: 165, height: 164, borderRadius: 16 },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  durationText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  historyInfo: { marginTop: 6 },
  historyTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    lineHeight: 18,
    width: 100,
  },
  historyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  historyChannel: { fontSize: 11, color: '#666' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuIconContainer: {
    width: 45,
    height: 25,
    borderRadius: 22.5,
    backgroundColor: '#FFF5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuText: { fontSize: 16, fontWeight: '600', color: '#333' },
  recentlyAdded: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7BB5B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
  },
  sortText: {
    color: '#424242',
    fontWeight: '600',
    marginRight: 4,
    fontSize: 12,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  subText: { fontSize: 12, color: '#666', marginTop: 2 },
  logoutButton: { marginBottom: 24 },
  logoutIconContainer: { backgroundColor: '#FFEBEE' },
  logoutText: { color: '#E53935', fontWeight: '700' },

  playlistHeader: { padding: 16 },
  playlistActionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97507',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    flex: 0.48,
    justifyContent: 'center',
  },
  playAllText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    flex: 0.48,
    justifyContent: 'center',
  },
  shuffleText: { color: '#333', fontWeight: 'bold', marginLeft: 8 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  inputContainer: { marginBottom: 20 },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  modalInput: {
    fontSize: 14,
    color: '#666',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  privacySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  privacyLeft: { flexDirection: 'row', alignItems: 'center' },
  privacyText: { fontSize: 14, color: '#666', marginLeft: 10 },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFF5EE',
    paddingVertical: 14,
    borderRadius: 25,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#F97507', fontWeight: 'bold', fontSize: 16 },
  createButton: {
    flex: 1,
    backgroundColor: '#F97507',
    paddingVertical: 14,
    borderRadius: 25,
    marginLeft: 10,
    alignItems: 'center',
  },
  createButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },

  // Video quick-view modal (same as UserViewsScreen)
  videoModalContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
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
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
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
  videoSlider: {
    flex: 1,
    height: 28,
    marginRight: 8,
  },
  videoTimeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
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
  videoRetryText: {
    color: '#fff',
    fontWeight: '700',
  },
  videoModalBody: {
    flex: 1,
    backgroundColor: '#fff',
  },
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
  videoActionText: {
    fontSize: 12,
    color: '#222',
    fontWeight: '600',
  },
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
  channelName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
  },
  channelSubText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  subscribeBtn: {
    backgroundColor: '#FF7F0B',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
  },
  subscribedBtn: {
    backgroundColor: '#f2f2f2',
  },
  subscribeText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  subscribedText: {
    color: '#333',
  },
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
  messageBtnText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
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

export default LibraryScreen;
