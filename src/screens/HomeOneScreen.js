import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  FlatList,
  Share,
  BackHandler,
} from 'react-native';
import Video from 'react-native-video';
import Slider from '@react-native-community/slider';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCurrentPositionSafe,
  reverseGeocode,
  geocodeAddress,
  getPlaceSuggestions,
  getCoordsFromPlaceId,
  getFallbackCoordsForUKArea,
} from '../utils/geolocation';
import { appSetUser } from '../redux/actions/appSlice';
import { getFeatured } from '../services/featuredService';
import { getSponsored } from '../services/sponsoredService';
import {
  getVideos,
  getVideoWatchHistory,
  getVideoById,
  toggleLike as toggleVideoLike,
  toggleDislike as toggleVideoDislike,
  recordShare as recordVideoShare,
} from '../services/videoService';
import { shortsService } from '../services/shortsService';
import { getGallery, getChannelProfile } from '../services/channelService';
import { saveLastLocationToBackend } from '../services/userLocationService';
import logo from '../assets/logo.png';
import { safeImageUri } from '../utils/helper';
import { SafeAreaView } from 'react-native-safe-area-context';
import SaveModal from '../components/SaveModal';
import CommentsModal from '../components/CommentsModal';
import HomeMoreOptionModal from '../components/HomeMoreOptionModal';
import ReportContentModal from '../components/ReportContentModal';
import { downloadVideo } from '../services/downloadService';
import { setPlaylist } from '../services/playlistService';
import { submitReport } from '../services/reportService';

const { width, height } = Dimensions.get('window');

const formatCount = n => {
  if (n == null || n < 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

const viewerRole = user =>
  (user?.role && String(user.role).toLowerCase()) || 'user';

// Same shape as VideoDetailsScreen currentVideo so selectedItem has all fields
const mapToDisplayItem = (v, type) => {
  const u = v.user || {};
  const channelName = u.nickname || u.name || 'Unknown';
  const viewCount = v.viewCount ?? v._count?.views ?? 0;
  const viewsStr =
    viewCount >= 1000
      ? `${(viewCount / 1000).toFixed(1)}K views`
      : `${viewCount} views`;
  return {
    id: v.id,
    type,
    title:
      v.title ||
      (type === 'short'
        ? (v.description || 'Short').substring(0, 50)
        : 'Untitled'),
    description: v.description ?? '',
    location: u.address || 'Near you',
    img:
      v.thumbnailUrl ||
      v.videoUrl ||
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
    videoUrl: v.videoUrl,
    user: v.user,
    userId: v.userId || u.id,
    creatorRole: u.role != null ? String(u.role).toLowerCase() : undefined,
    channelName,
    channelAvatar:
      u.photos?.[0] ||
      (Array.isArray(u.photos) && u.photos[0]) ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        channelName,
      )}&background=111&color=fff`,
    views: viewsStr,
    viewCount,
    likeCount: v.likeCount ?? v._count?.likes ?? 0,
    dislikeCount: v.dislikeCount ?? v._count?.dislikes ?? 0,
    commentCount: v.commentCount ?? v._count?.comments ?? 0,
    shareCount: v.shareCount ?? 0,
    isLiked: v.isLiked ?? false,
    creatorAddress: u.address ?? undefined,
    creatorLatitude: u.latitude ?? undefined,
    creatorLongitude: u.longitude ?? undefined,
    creatorSocialLinks: Array.isArray(u.socialLinks) ? u.socialLinks : [],
  };
};

const LOCATION_KEY = 'USER_LOCATION_SELECTION';
const LOCATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const HomeOneScreen = () => {
  const [isVideoDetail, setIsVideoDetail] = useState(false);
  const [isRestaurantDetail, setIsRestaurantDetail] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [locationInput, setLocationInput] = useState('');
  const [locationModalLoading, setLocationModalLoading] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState([]);
  const [locationSuggestionsLoading, setLocationSuggestionsLoading] =
    useState(false);
  const locationDebounceRef = useRef(null);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState(null);
  const [addressText, setAddressText] = useState('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const searchDebounceRef = useRef(null);
  const [featuredVideo, setFeaturedVideo] = useState(null);
  const [sponsoredVideo, setSponsoredVideo] = useState(null);
  const [feedVideos, setFeedVideos] = useState([]);
  const [feedShorts, setFeedShorts] = useState([]);
  const [continueData, setContinueData] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [videoPaused, setVideoPaused] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [restaurantVideoKey, setRestaurantVideoKey] = useState(0);
  const shortVideoRef = useRef(null);
  const resVideoRef = useRef(null);
  const resSeekingRef = useRef(false);
  const resProgressUpdateRef = useRef(0);
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const user = useSelector(state => state.app?.user);
  const userRef = useRef(user);
  userRef.current = user;
  const userPhotosFetchedRef = useRef(false);
  const [resVideoProgress, setResVideoProgress] = useState({
    currentTime: 0,
    duration: 0,
  });
  const [resIsSliding, setResIsSliding] = useState(false);
  const [resSlidingValue, setResSlidingValue] = useState(0);
  const [resSaveVisible, setResSaveVisible] = useState(false);
  const [resCommentsVisible, setResCommentsVisible] = useState(false);
  const [resDownloadPct, setResDownloadPct] = useState(null);
  const [homeMoreVisible, setHomeMoreVisible] = useState(false);
  const [homeMoreTarget, setHomeMoreTarget] = useState(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [reportTarget, setReportTarget] = useState(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [morePlaylistVisible, setMorePlaylistVisible] = useState(false);
  const [morePlaylistType, setMorePlaylistType] = useState('short');
  const [morePlaylistId, setMorePlaylistId] = useState(null);
  /** When opening video from Library / UserViews Videos, Back returns there */
  const libraryDetailReturnRef = useRef(null);

  const galleryUserId = selectedItem?.userId || selectedItem?.user?.id;

  const saveLocationSelection = useCallback(async (coords, label) => {
    try {
      const uid = userRef.current?.id || null;
      await AsyncStorage.setItem(
        LOCATION_KEY,
        JSON.stringify({
          userId: uid,
          coords,
          addressText: label || '',
          savedAt: Date.now(),
        }),
      );
      if (uid && coords?.lat != null && coords?.lng != null) {
        saveLastLocationToBackend({
          lat: coords.lat,
          lng: coords.lng,
          addressText: label || '',
        }).catch(() => {});
      }
    } catch (e) {
      // ignore storage errors
    }
  }, []);

  // Debounced address suggestions in the location modal
  useEffect(() => {
    if (!locationModalVisible) {
      setLocationSuggestions([]);
      setLocationSuggestionsLoading(false);
      if (locationDebounceRef.current) {
        clearTimeout(locationDebounceRef.current);
        locationDebounceRef.current = null;
      }
      return;
    }
    const trimmed = locationInput.trim();
    if (!trimmed) {
      setLocationSuggestions([]);
      setLocationSuggestionsLoading(false);
      return;
    }
    if (locationDebounceRef.current) {
      clearTimeout(locationDebounceRef.current);
    }
    locationDebounceRef.current = setTimeout(async () => {
      setLocationSuggestionsLoading(true);
      try {
        const list = await getPlaceSuggestions(trimmed, { region: 'uk' });
        setLocationSuggestions(list || []);
      } catch (e) {
        setLocationSuggestions([]);
      } finally {
        setLocationSuggestionsLoading(false);
        locationDebounceRef.current = null;
      }
    }, 280);
    return () => {
      if (locationDebounceRef.current) {
        clearTimeout(locationDebounceRef.current);
        locationDebounceRef.current = null;
      }
    };
  }, [locationInput, locationModalVisible]);

  useEffect(() => {
    if (!showGalleryModal) {
      setGalleryImages([]);
      setGalleryError(null);
      return;
    }
    if (!galleryUserId) {
      setGalleryError('No user');
      setGalleryLoading(false);
      return;
    }
    setGalleryLoading(true);
    setGalleryError(null);
    getGallery(galleryUserId)
      .then(data => setGalleryImages(data?.photos || []))
      .catch(err => setGalleryError(err?.message || 'Failed to load gallery'))
      .finally(() => setGalleryLoading(false));
  }, [showGalleryModal, galleryUserId]);

  const openGalleryModal = useCallback(() => {
    setShowGalleryModal(true);
  }, []);

  const closeGalleryModal = useCallback(() => {
    setShowGalleryModal(false);
  }, []);

  const handleRestaurantDetailBack = useCallback(() => {
    setVideoPaused(true);
    const t = libraryDetailReturnRef.current;
    libraryDetailReturnRef.current = null;
    setIsRestaurantDetail(false);
    if (!t?.returnTo) return;

    if (t.returnTo === 'user_views' && t.returnUserId) {
      let nav = navigation;
      for (let i = 0; i < 16 && nav; i++) {
        const names = nav.getState?.()?.routeNames;
        if (
          Array.isArray(names) &&
          names.includes('UserViewsScreen') &&
          names.includes('Root')
        ) {
          nav.navigate('UserViewsScreen', {
            userId: t.returnUserId,
            focusVideosTab: true,
          });
          return;
        }
        nav = nav.getParent?.();
      }
      return;
    }

    if (t.returnTo === 'business_profile' && t.returnUserId) {
      navigation.navigate('BusinessProfileViewScreen', {
        userId: t.returnUserId,
        focusVideoTab: true,
      });
      return;
    }

    const libraryScreens = {
      watch_later: 'WatchLaterScreen',
      liked: 'LikedScreen',
      favorites: 'FavoritesScreen',
      library: 'LibraryScreen',
    };
    const libScreen = libraryScreens[t.returnTo];
    if (!libScreen) return;
    let nav = navigation;
    for (let i = 0; i < 14 && nav; i++) {
      const names = nav.getState?.()?.routeNames;
      if (Array.isArray(names) && names.includes('Library')) {
        nav.navigate('Library', { screen: libScreen });
        return;
      }
      nav = nav.getParent?.();
    }
  }, [navigation]);

  useEffect(() => {
    if (!isRestaurantDetail) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      handleRestaurantDetailBack();
      return true;
    });
    return () => sub.remove();
  }, [isRestaurantDetail, handleRestaurantDetailBack]);

  useFocusEffect(
    React.useCallback(() => {
      const stopPlaybackOnBlur = () => setVideoPaused(true);
      const params = route.params || {};
      const lib = params.openLibraryDetail;
      if (
        lib?.contentId &&
        (lib.contentType === 'video' || lib.contentType === 'short')
      ) {
        if (lib.returnTo) {
          libraryDetailReturnRef.current = {
            returnTo: lib.returnTo,
            returnUserId: lib.returnUserId,
          };
        } else {
          libraryDetailReturnRef.current = null;
        }
        navigation.setParams({ openLibraryDetail: undefined });
        setVideoPaused(true);
        setVideoError(null);
        setVideoLoading(false);
        setRestaurantVideoKey(k => k + 1);
        setResVideoProgress({ currentTime: 0, duration: 0 });
        setResIsSliding(false);
        setResSlidingValue(0);
        setIsVideoDetail(false);
        setIsRestaurantDetail(true);
        const id = String(lib.contentId);
        const ct = lib.contentType;
        setSelectedItem({ id, type: ct });
        if (ct === 'video') {
          getVideoById(id, user?.id, user?.role || 'user')
            .then(res => {
              const full = mapToDisplayItem(res, 'video');
              setSelectedItem(full);
            })
            .catch(() => {
              Alert.alert('Error', 'Could not load this video.');
              setIsRestaurantDetail(false);
            });
        } else {
          shortsService
            .getShortById(id, user?.id, user?.role || 'user')
            .then(res => {
              const full = mapToDisplayItem(res, 'short');
              setSelectedItem(full);
            })
            .catch(() => {
              Alert.alert('Error', 'Could not load this short.');
              setIsRestaurantDetail(false);
            });
        }
        return stopPlaybackOnBlur;
      }
      const showRestaurant = params.showRestaurantDetail;
      const restaurantItem = params.restaurantItem;
      if (showRestaurant && restaurantItem) {
        libraryDetailReturnRef.current = null;
        setSelectedItem(restaurantItem);
        setIsRestaurantDetail(true);
        navigation.setParams({
          showRestaurantDetail: undefined,
          restaurantItem: undefined,
        });
        return stopPlaybackOnBlur;
      }
      if (params.selectedLocation != null) {
        setSelectedLocation(params.selectedLocation);
        if (params.addressText != null) setAddressText(params.addressText);
        navigation.setParams({
          selectedLocation: undefined,
          addressText: undefined,
        });
        return stopPlaybackOnBlur;
      }
      // If we don't yet have a location, try to restore from storage. Never redirect to LandingScreen; stay on HomeOneScreen and open location modal if none.
      if (selectedLocation?.lat == null && selectedLocation?.lng == null) {
        let cancelled = false;
        const restoreLocation = async () => {
          try {
            const raw = await AsyncStorage.getItem(LOCATION_KEY);
            if (!raw) {
              if (!cancelled) setLocationModalVisible(true);
              return;
            }
            const saved = JSON.parse(raw);
            const sameUser =
              saved?.userId == null || !userRef.current?.id
                ? true
                : String(saved.userId) === String(userRef.current.id);
            const fresh =
              saved?.savedAt && Date.now() - saved.savedAt <= LOCATION_TTL_MS;
            if (
              saved?.coords?.lat != null &&
              saved?.coords?.lng != null &&
              sameUser &&
              fresh
            ) {
              if (cancelled) return;
              setSelectedLocation(saved.coords);
              setAddressText(saved.addressText || '');
              loadFeaturedAndFeed();
              loadContinueWatching();
            } else if (!cancelled) {
              setLocationModalVisible(true);
            }
          } catch (e) {
            if (!cancelled) setLocationModalVisible(true);
          }
        };
        restoreLocation();
        return () => {
          cancelled = true;
          stopPlaybackOnBlur();
        };
      }
      // Refresh feed when returning to home so shorts cards show updated view counts
      if (selectedLocation?.lat != null && selectedLocation?.lng != null) {
        loadFeaturedAndFeed();
        loadContinueWatching();
      }
      return stopPlaybackOnBlur;
    }, [
      route.params,
      navigation,
      user?.id,
      user?.role,
      selectedLocation?.lat,
      selectedLocation?.lng,
      loadFeaturedAndFeed,
      loadContinueWatching,
    ]),
  );

  const loadFeaturedAndFeed = useCallback(async () => {
    if (selectedLocation?.lat == null || selectedLocation?.lng == null) return;
    setFeedLoading(true);
    const lat = selectedLocation.lat;
    const lng = selectedLocation.lng;
    const role = viewerRole(user);
    const baseParams = { page: 1, limit: 50, sort: 'latest', viewerRole: role };
    const searchTerm = searchDebounced?.trim() || undefined;
    const videoParams = {
      ...baseParams,
      nearbyLat: lat,
      nearbyLng: lng,
      radiusKm: 50,
      excludeSponsored: true,
      excludeFeatured: true,
      ...(searchTerm && { search: searchTerm }),
    };
    const shortParams = {
      ...baseParams,
      nearbyLat: lat,
      nearbyLng: lng,
      radiusKm: 50,
      ...(searchTerm && { search: searchTerm }),
    };

    // Featured + sponsored: direct GET /featured and GET /sponsored (no location check)
    getFeatured()
      .then(({ featured: list }) => {
        const first =
          Array.isArray(list) && list.length > 0 && list[0].video
            ? list[0]
            : null;
        setFeaturedVideo(first);
      })
      .catch(() => setFeaturedVideo(null));
    getSponsored()
      .then(({ sponsored: list }) => {
        const first =
          Array.isArray(list) && list.length > 0 && list[0].video
            ? list[0]
            : null;
        setSponsoredVideo(first);
      })
      .catch(() => setSponsoredVideo(null));

    try {
      const [videosRes, shortsRes] = await Promise.all([
        getVideos(videoParams),
        shortsService.getShorts(shortParams),
      ]);
      const videos = (videosRes?.videos || []).map(v =>
        mapToDisplayItem(v, 'video'),
      );
      const shorts = (shortsRes?.shorts || [])
        .filter(s => s.videoUrl && String(s.videoUrl).trim())
        .map(s => mapToDisplayItem(s, 'short'));
      setFeedVideos(videos);
      setFeedShorts(shorts);
    } catch (e) {
      console.error('HomeOne load feed:', e);
      setFeedVideos([]);
      setFeedShorts([]);
    } finally {
      setFeedLoading(false);
    }
  }, [selectedLocation, user, searchDebounced]);

  const loadContinueWatching = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [vRes, sRes] = await Promise.all([
        getVideoWatchHistory(user.id, 1, 20),
        shortsService.getWatchHistory(user.id, 1, 20),
      ]);
      const vHistory = (vRes?.history || []).map(({ video, watchedAt }) => ({
        ...mapToDisplayItem(video || {}, 'video'),
        watchedAt: new Date(watchedAt).getTime(),
      }));
      const sHistory = (sRes?.history || []).map(({ short: s, watchedAt }) => ({
        ...mapToDisplayItem(s || {}, 'short'),
        watchedAt: new Date(watchedAt).getTime(),
      }));
      const merged = [...vHistory, ...sHistory]
        .filter(Boolean)
        .sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0))
        .slice(0, 10);
      setContinueData(merged);
    } catch (e) {
      setContinueData([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearchDebounced(searchQuery.trim());
      searchDebounceRef.current = null;
    }, 400);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchQuery]);

  useEffect(() => {
    if (selectedLocation?.lat != null && selectedLocation?.lng != null) {
      loadFeaturedAndFeed();
    }
  }, [
    selectedLocation?.lat,
    selectedLocation?.lng,
    searchDebounced,
    loadFeaturedAndFeed,
  ]);

  useEffect(() => {
    loadContinueWatching();
  }, [loadContinueWatching]);

  // When logged in but Redux user has no photos (e.g. old session), fetch channel profile and update so header shows avatar
  useEffect(() => {
    if (!user?.id || userPhotosFetchedRef.current) return;
    const firstPhoto = Array.isArray(user?.photos)
      ? user.photos[0]
      : user?.photos?.[0];
    const hasSrc =
      (typeof firstPhoto === 'string' && firstPhoto.trim()) ||
      (firstPhoto &&
        typeof firstPhoto === 'object' &&
        typeof firstPhoto.src === 'string' &&
        firstPhoto.src.trim());
    if (hasSrc) {
      userPhotosFetchedRef.current = true;
      return;
    }
    userPhotosFetchedRef.current = true;
    getChannelProfile(user.id, user.id)
      .then(profile => {
        const avatar =
          profile?.channelAvatar ||
          (profile?.photos?.[0] &&
            (typeof profile.photos[0] === 'string'
              ? profile.photos[0]
              : profile.photos[0]?.src));
        if (
          avatar &&
          typeof avatar === 'string' &&
          avatar.trim() &&
          !avatar.includes('ui-avatars.com')
        ) {
          const current = userRef.current;
          if (current?.id) {
            dispatch(
              appSetUser({
                ...current,
                photos: [{ title: 'avatar', src: avatar.trim() }],
              }),
            );
          }
        }
      })
      .catch(() => {});
  }, [user?.id, user?.photos, dispatch]);

  // Selected location is for feed only (nearby videos/shorts). Never updates user profile here:
  // owners keep their shop address from Edit Profile; other users' profile is not updated on home.
  const useMyLocation = () => {
    setLocationLoading(true);
    getCurrentPositionSafe(
      async pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelectedLocation({ lat, lng });
        const addr = await reverseGeocode(lat, lng);
        setAddressText(addr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setLocationLoading(false);
      },
      err => {
        setLocationLoading(false);
        Alert.alert('Location', err || 'Could not get location.');
      },
    );
  };

  const openShortDetail = item => {
    setSelectedItem(item);
    setVideoPaused(true);
    setVideoError(null);
    setVideoLoading(false);
    setIsVideoDetail(true);
    setIsRestaurantDetail(false);
    if (item?.id && item?.type === 'short') {
      shortsService
        .getShortById(item.id, user?.id, user?.role || 'user')
        .then(res => {
          const full = mapToDisplayItem(res, 'short');
          setSelectedItem(prev => ({ ...full, watchedAt: prev?.watchedAt }));
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    if (!isVideoDetail || selectedItem?.type !== 'short' || !selectedItem?.id)
      return;
    shortsService
      .recordView(selectedItem.id, user?.id || null)
      .then(() => {
        setSelectedItem(prev => {
          if (!prev) return prev;
          const newCount = (prev.viewCount ?? 0) + 1;
          return { ...prev, viewCount: newCount };
        });
      })
      .catch(() => {});
  }, [isVideoDetail, selectedItem?.id, selectedItem?.type, user?.id]);

  const openRestaurantDetail = item => {
    const campaignOwner = item?._campaignOwnerUser;
    setSelectedItem(item);
    setVideoPaused(true);
    setVideoError(null);
    setVideoLoading(false);
    setRestaurantVideoKey(k => k + 1);
    setResVideoProgress({ currentTime: 0, duration: 0 });
    setResIsSliding(false);
    setResSlidingValue(0);
    setIsVideoDetail(false);
    setIsRestaurantDetail(true);
    if (item?.id && (item?.type === 'video' || !item?.type)) {
      getVideoById(item.id, user?.id, user?.role || 'user')
        .then(res => {
          const full = mapToDisplayItem(res, item?.type || 'video');
          if (campaignOwner?.id) {
            const co = campaignOwner;
            const u = {
              ...(full.user && typeof full.user === 'object' ? full.user : {}),
              ...co,
              id: co.id,
            };
            const channelName =
              co.nickname || co.name || full.channelName || 'Restaurant';
            const firstPhoto = co.photos?.[0];
            const avatar =
              (typeof firstPhoto === 'string'
                ? firstPhoto
                : firstPhoto?.src) ||
              full.channelAvatar;
            setSelectedItem(prev => ({
              ...full,
              user: u,
              userId: co.id,
              channelName,
              channelAvatar: safeImageUri(
                avatar,
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  channelName,
                )}&background=111&color=fff`,
              ),
              location: co.address || full.location || 'Near you',
              creatorAddress: co.address ?? full.creatorAddress,
              creatorLatitude: co.latitude ?? full.creatorLatitude,
              creatorLongitude: co.longitude ?? full.creatorLongitude,
              creatorSocialLinks: Array.isArray(co.socialLinks)
                ? co.socialLinks
                : full.creatorSocialLinks || [],
              creatorRole:
                co.role != null
                  ? String(co.role).toLowerCase()
                  : full.creatorRole,
              watchedAt: prev?.watchedAt,
            }));
          } else {
            setSelectedItem(prev => ({ ...full, watchedAt: prev?.watchedAt }));
          }
        })
        .catch(() => {});
    }
  };

  const handleFeedItemPress = item => {
    if (item?.type === 'short') {
      // openShortDetail(item)
      navigation.navigate('ProductShortsVideo', { item });
    } else {
      openRestaurantDetail(item);
    }
  };

  const handleShortLike = useCallback(
    async item => {
      if (!user?.id || item?.type !== 'short' || !item?.id) return;
      try {
        await shortsService.toggleLike(item.id, user.id);
        setSelectedItem(prev => {
          if (!prev || prev.id !== item.id) return prev;
          const newLiked = !prev.isLiked;
          const delta = newLiked ? 1 : -1;
          const newCount = Math.max(0, (prev.likeCount ?? 0) + delta);
          return {
            ...prev,
            isLiked: newLiked,
            likeCount: newCount,
          };
        });
      } catch (e) {}
    },
    [user?.id],
  );

  const handleShortShare = useCallback(async item => {
    if (!item?.id) return;
    const message = `${
      item.title || item.description || 'Short'
    }\neatix://shorts/${item.id}`;
    try {
      await Share.share({ message, title: item.title || 'Share Short' });
      setSelectedItem(prev => {
        if (!prev || prev.id !== item.id) return prev;
        const newCount = (prev.shareCount ?? 0) + 1;
        return { ...prev, shareCount: newCount };
      });
    } catch (e) {
      if (e?.message !== 'User did not share') {
        Alert.alert('Share', 'Share failed');
      }
    }
  }, []);

  const handleRestaurantLike = useCallback(async () => {
    if (!user?.id || !selectedItem?.id) {
      navigation.navigate('HomeSevenScreen');
      return;
    }
    const isShort = selectedItem?.type === 'short';
    try {
      if (isShort) {
        await shortsService.toggleLike(selectedItem.id, user.id);
      } else {
        await toggleVideoLike(selectedItem.id, user.id);
      }
      setSelectedItem(prev => {
        if (!prev || prev.id !== selectedItem.id) return prev;
        const newLiked = !prev.isLiked;
        const delta = newLiked ? 1 : -1;
        const newCount = Math.max(0, (prev.likeCount ?? 0) + delta);
        return {
          ...prev,
          isLiked: newLiked,
          likeCount: newCount,
          ...(isShort && newLiked ? { isDisliked: false } : {}),
        };
      });
    } catch {}
  }, [navigation, selectedItem?.id, selectedItem?.type, user?.id]);

  const handleRestaurantDislike = useCallback(async () => {
    if (!user?.id || !selectedItem?.id) {
      navigation.navigate('HomeSevenScreen');
      return;
    }
    const isShort = selectedItem?.type === 'short';
    try {
      if (isShort) {
        await shortsService.toggleDislike(selectedItem.id, user.id);
      } else {
        await toggleVideoDislike(selectedItem.id, user.id);
      }
      setSelectedItem(prev => {
        if (!prev || prev.id !== selectedItem.id) return prev;
        const newDisliked = !prev.isDisliked;
        const delta = newDisliked ? 1 : -1;
        const newCount = Math.max(0, (prev.dislikeCount ?? 0) + delta);
        return {
          ...prev,
          isDisliked: newDisliked,
          dislikeCount: newCount,
          ...(isShort && newDisliked ? { isLiked: false } : {}),
        };
      });
    } catch {}
  }, [navigation, selectedItem?.id, selectedItem?.type, user?.id]);

  const handleRestaurantShare = useCallback(async () => {
    if (!selectedItem?.id) return;
    const isShort = selectedItem?.type === 'short';
    const message = `${selectedItem?.title || 'Video'}\neatix://${
      isShort ? 'shorts' : 'video'
    }/${selectedItem.id}`;
    try {
      await Share.share({ message, title: selectedItem?.title || 'Share' });
      if (!isShort) recordVideoShare(selectedItem.id);
      setSelectedItem(prev => {
        if (!prev || prev.id !== selectedItem.id) return prev;
        const newCount = (prev.shareCount ?? 0) + 1;
        return { ...prev, shareCount: newCount };
      });
    } catch (e) {
      if (e?.message !== 'User did not share') {
        Alert.alert('Share', 'Share failed');
      }
    }
  }, [selectedItem?.id, selectedItem?.type]);

  const handleRestaurantChat = useCallback(() => {
    if (!user?.id) {
      navigation.navigate('HomeSevenScreen');
      return;
    }
    const partnerId = selectedItem?.user?.id ?? selectedItem?.userId ?? null;
    if (!partnerId) return;
    navigation.navigate('DetailedChatScreen', {
      partnerId,
      partnerName:
        selectedItem?.user?.nickname ||
        selectedItem?.user?.name ||
        selectedItem?.title ||
        'User',
      partnerAvatar:
        selectedItem?.user?.channelAvatar ||
        selectedItem?.user?.avatar ||
        selectedItem?.user?.profileImage,
    });
  }, [navigation, selectedItem?.user?.id, selectedItem?.userId, user?.id]);

  const handleRestaurantDownload = useCallback(async () => {
    if (!selectedItem?.id || !selectedItem?.videoUrl) return;
    try {
      setResDownloadPct(0);
      await downloadVideo(
        {
          id: selectedItem.id,
          title: selectedItem.title,
          videoUrl: selectedItem.videoUrl,
          thumbnail: selectedItem.img,
          channelName:
            selectedItem?.user?.nickname ||
            selectedItem?.user?.name ||
            selectedItem?.title,
        },
        pct => setResDownloadPct(pct),
      );
      setResDownloadPct(null);
      Alert.alert('Downloaded', 'Saved for offline in Library > Downloads.');
    } catch (e) {
      setResDownloadPct(null);
      Alert.alert('Download failed', e?.message || 'Could not download video.');
    }
  }, [selectedItem?.id, selectedItem?.videoUrl]);

  const handleRestaurantSave = useCallback(() => {
    if (!user?.id) {
      navigation.navigate('HomeSevenScreen');
      return;
    }
    setResSaveVisible(true);
  }, [navigation, user?.id]);

  const openHomeMoreForShort = useCallback(item => {
    if (!item?.id) return;
    setHomeMoreTarget({
      contentType: 'short',
      contentId: item.id,
      videoUrl: item.videoUrl,
      title:
        item.title || (item.description || 'Short').substring(0, 80) || 'Short',
      channelName:
        item.user?.nickname || item.user?.name || item.channelName || '',
    });
    setHomeMoreVisible(true);
  }, []);

  const openHomeMoreFromSelected = useCallback(() => {
    if (!selectedItem?.id) return;
    const isShort = selectedItem.type === 'short';
    setHomeMoreTarget({
      contentType: isShort ? 'short' : 'video',
      contentId: selectedItem.id,
      videoUrl: selectedItem.videoUrl,
      title: selectedItem.title || 'Video',
      channelName:
        selectedItem.channelName ||
        selectedItem?.user?.nickname ||
        selectedItem?.user?.name ||
        '',
    });
    setHomeMoreVisible(true);
  }, [selectedItem]);

  const closeHomeMore = useCallback(() => {
    setHomeMoreVisible(false);
    setHomeMoreTarget(null);
  }, []);

  const requireLogin = useCallback(() => {
    if (!user?.id) {
      navigation.navigate('HomeSevenScreen');
      return false;
    }
    return true;
  }, [navigation, user?.id]);

  const onMoreSavePlaylist = useCallback(() => {
    if (!homeMoreTarget?.contentId) return;
    if (!requireLogin()) return;
    setMorePlaylistType(homeMoreTarget.contentType);
    setMorePlaylistId(homeMoreTarget.contentId);
    setMorePlaylistVisible(true);
  }, [homeMoreTarget, requireLogin]);

  const onMoreWatchLater = useCallback(async () => {
    if (!homeMoreTarget?.contentId) return;
    if (!requireLogin()) return;
    try {
      await setPlaylist(
        user.id,
        'watch_later',
        homeMoreTarget.contentType,
        homeMoreTarget.contentId,
        true,
      );
      Alert.alert('Saved', 'Added to Watch Later.');
    } catch {
      Alert.alert('Error', 'Could not save to Watch Later.');
    }
  }, [homeMoreTarget, requireLogin, user?.id]);

  const onMoreDownload = useCallback(async () => {
    const t = homeMoreTarget;
    if (!t?.videoUrl || !t?.contentId) {
      Alert.alert('Download', 'No video URL available.');
      return;
    }
    try {
      setResDownloadPct(0);
      await downloadVideo(
        {
          id: t.contentId,
          title: t.title,
          videoUrl: t.videoUrl,
          thumbnail: null,
          channelName: t.channelName,
        },
        pct => setResDownloadPct(pct),
      );
      setResDownloadPct(null);
      Alert.alert('Downloaded', 'Saved for offline in Library > Downloads.');
    } catch (e) {
      setResDownloadPct(null);
      Alert.alert('Download failed', e?.message || 'Could not download.');
    }
  }, [homeMoreTarget]);

  const onMoreShare = useCallback(async () => {
    const t = homeMoreTarget;
    if (!t?.contentId) return;
    const msg = `${t.title || 'Check this out'}\neatix://${
      t.contentType === 'short' ? 'shorts' : 'video'
    }/${t.contentId}`;
    try {
      await Share.share({ message: msg, title: t.title });
      if (t.contentType === 'video') {
        try {
          await recordVideoShare(t.contentId);
        } catch (_) {}
      }
    } catch (e) {
      if (e?.message !== 'User did not share') {
        /* ignore */
      }
    }
  }, [homeMoreTarget, user?.id]);

  const onMoreNotInterested = useCallback(() => {
    Alert.alert(
      'Not interested',
      "We'll try to show you less content like this.",
    );
  }, []);

  const onMoreOpenReport = useCallback(() => {
    if (!requireLogin()) return;
    const t = homeMoreTarget;
    if (!t?.contentId) return;
    setReportTarget({ ...t });
    setReportVisible(true);
  }, [homeMoreTarget, requireLogin]);

  const handleReportSubmit = useCallback(
    async reason => {
      if (!reportTarget?.contentId) return;
      setReportSubmitting(true);
      try {
        await submitReport({
          contentType: reportTarget.contentType === 'short' ? 'short' : 'video',
          contentId: reportTarget.contentId,
          reason,
        });
        Alert.alert('Thanks', 'Your report was submitted.');
        setReportVisible(false);
        setReportTarget(null);
        closeHomeMore();
      } catch {
        Alert.alert('Error', 'Could not submit report. Please try again.');
      } finally {
        setReportSubmitting(false);
      }
    },
    [reportTarget, closeHomeMore],
  );

  /** Featured/sponsored API returns campaign owner on parent; video.user may be missing — keep owner for detail screen. */
  const featuredItem = (() => {
    if (!featuredVideo?.video) return null;
    const video = featuredVideo.video;
    const co = featuredVideo.user;
    const mergedUser =
      co?.id || co?.name
        ? { ...(video.user && typeof video.user === 'object' ? video.user : {}), ...co }
        : video.user || co;
    const base = mapToDisplayItem({ ...video, user: mergedUser }, 'video');
    return co?.id ? { ...base, _campaignOwnerUser: co } : base;
  })();

  const sponsoredItem = sponsoredVideo?.video
    ? (() => {
        const video = sponsoredVideo.video;
        const co = sponsoredVideo.user;
        const mergedUser =
          co?.id || co?.name
            ? {
                ...(video.user && typeof video.user === 'object'
                  ? video.user
                  : {}),
                ...co,
              }
            : video.user || co;
        const base = mapToDisplayItem({ ...video, user: mergedUser }, 'video');
        return co?.id ? { ...base, _campaignOwnerUser: co } : base;
      })()
    : null;

  // Sectioned feed: sponsored → 2 shorts → 2 videos → continue (3) → 4 shorts → 4 videos → 6 → 6 ...
  const buildFeedSections = () => {
    const shorts = feedShorts || [];
    const videos = feedVideos || [];
    const sections = [];
    let sIdx = 0;
    let vIdx = 0;

    if (sponsoredItem) {
      sections.push({ type: 'SPONSORED', data: [sponsoredItem] });
    }

    const firstShorts = shorts.slice(sIdx, sIdx + 2);
    sIdx += firstShorts.length;
    if (firstShorts.length > 0) {
      sections.push({ type: 'SHORTS', data: firstShorts });
    }

    const firstVideos = videos.slice(vIdx, vIdx + 2);
    vIdx += firstVideos.length;
    if (firstVideos.length > 0) {
      sections.push({ type: 'VIDEOS', data: firstVideos });
    }

    if (continueData.length > 0) {
      sections.push({
        type: 'CONTINUE',
        data: continueData.slice(0, 3),
      });
    }

    let blockSize = 4;
    while (sIdx < shorts.length || vIdx < videos.length) {
      const blockShorts = shorts.slice(sIdx, sIdx + blockSize);
      sIdx += blockShorts.length;
      if (blockShorts.length > 0) {
        sections.push({ type: 'SHORTS', data: blockShorts });
      }
      const blockVideos = videos.slice(vIdx, vIdx + blockSize);
      vIdx += blockVideos.length;
      if (blockVideos.length > 0) {
        sections.push({ type: 'VIDEOS', data: blockVideos });
      }
      blockSize += 2;
    }
    return sections;
  };

  const feedSections = buildFeedSections();

  // --- RENDERING HELPERS ---

  const renderResults = () => (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <View style={styles.navRow}>
          {/* <TouchableOpacity
            onPress={() => navigation.navigate('LandingScreen')}
            style={styles.navBtn}
          >
            <Text style={styles.navBtnText}>{'<'} Home</Text>
          </TouchableOpacity> */}
          <View style={styles.headerLogoContainer}>
            <Image
              source={logo}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          {!(user?.token || user?.id) ? (
            <TouchableOpacity
              style={[styles.navBtn]}
              onPress={() => navigation.navigate('HomeSevenScreen')}
            >
              <Text style={styles.navBtnText}>Login {'>'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              // style={[styles.navBtn]}
              onPress={() => {
                const role = (user?.role || '').toLowerCase();
                if (role === 'owner' || role === 'vendor') {
                  navigation.navigate('BusinessProfileViewScreen');
                } else if (role === 'user') {
                  navigation.navigate('PromotionScreen');
                } else if (role === 'admin') {
                  navigation.getParent()?.navigate('Admin');
                } else {
                  navigation
                    .getParent()
                    ?.navigate('Library', { screen: 'ProfileScreen' });
                }
              }}
            >
              {(() => {
                // Same as PromotionScreen: backend photos are [{ src, title }]; use first photo src
                const firstPhoto =
                  user?.photos?.[0] ??
                  (Array.isArray(user?.photos) ? user.photos[0] : null);
                const photo =
                  user?.avatar ||
                  (typeof firstPhoto === 'string'
                    ? firstPhoto
                    : firstPhoto?.src) ||
                  null;
                const profileImageUri =
                  typeof photo === 'string' && photo.trim()
                    ? photo.trim()
                    : null;
                const hasProfileImage =
                  profileImageUri && String(profileImageUri).trim().length > 0;
                if (hasProfileImage) {
                  return (
                    <Image
                      source={{ uri: safeImageUri(profileImageUri) }}
                      style={styles.profileAvatar}
                    />
                  );
                }
                return <Icon name="account-outline" size={28} color="#FFF" />;
              })()}
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.resultsTitle}>
          Your search results in {addressText || 'your area'}...
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {featuredVideo?.video ? (
          <View style={styles.bannerWrapper}>
            <Image
              source={{
                uri:
                  featuredVideo.video.thumbnailUrl ||
                  featuredVideo.video.videoUrl ||
                  featuredItem?.img ||
                  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
              }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <TouchableOpacity
              style={styles.featuredBadge}
              onPress={() => featuredItem && openRestaurantDetail(featuredItem)}
              activeOpacity={0.9}
            >
              <Text style={styles.featuredText}>Featured</Text>
              <Icon name="chevron-right" size={16} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.locationSection}>
          <TouchableOpacity
            style={styles.homeDropdown}
            activeOpacity={0.8}
            onPress={() => {
              setLocationInput(addressText || '');
              setLocationModalVisible(true);
            }}
          >
            <Icon name="map-marker-radius" size={24} color="#FFF" />
            <Text style={styles.homeText} numberOfLines={1}>
              {addressText || 'Set your address'}
            </Text>
            <Icon name="chevron-down" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.addressSubtext} numberOfLines={2}>
            {addressText || 'Set your address on home'}
          </Text>

          <View style={styles.innerSearchBox}>
            <Icon name="magnify" size={20} color="#999" />
            <TextInput
              placeholder="Search"
              placeholderTextColor="#999"
              style={styles.innerInput}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>
        </View>

        <View style={styles.feedPadding}>
          <Text style={styles.feedHint}>
            your search, served fresh... watch and choose
          </Text>

          {feedLoading ? (
            <View style={styles.feedLoading}>
              <ActivityIndicator size="large" color="#F5A623" />
              <Text style={styles.feedLoadingText}>Loading...</Text>
            </View>
          ) : (
            <>
              {feedSections.map((section, sectionIdx) => (
                <View key={`${section.type}-${sectionIdx}`}>
                  {section.type === 'SHORTS' && section.data.length > 0 && (
                    <View
                      style={{ flexDirection: 'row', alignItems: 'center' }}
                    >
                      <Icon
                        style={{ marginRight: 5, marginTop: -5 }}
                        name="camera"
                        size={24}
                        color="#d17409ff"
                      />
                      <Text style={styles.sectionTitle}>Shorts</Text>
                    </View>
                  )}
                  {section.type === 'VIDEOS' && section.data.length > 0 && (
                    <Text style={styles.sectionTitle}>Videos</Text>
                  )}
                  {section.type === 'CONTINUE' && section.data.length > 0 && (
                    <Text style={styles.sectionTitle}>Continue watching</Text>
                  )}
                  {section.type === 'SPONSORED' && section.data.length > 0 && (
                    <Text style={styles.sectionTitle}>Sponsored near you</Text>
                  )}
                  {section.type === 'SHORTS' ? (
                    <View style={styles.shortsGrid}>
                      {section.data.map((item, index) => (
                        <View
                          key={`${item.id}-${item.type}-${sectionIdx}-${index}`}
                          style={styles.shortsGridItem}
                        >
                          <ShortCard
                            title={item.title}
                            img={item.img}
                            views={item.views}
                            onPress={() => handleFeedItemPress(item)}
                            onMorePress={() => openHomeMoreForShort(item)}
                          />
                        </View>
                      ))}
                    </View>
                  ) : (
                    section.data.map((item, index) => (
                      <FoodCard
                        key={`${item.id}-${item.type}-${sectionIdx}-${index}`}
                        title={item.title}
                        location={item.location}
                        isSponsored={section.type === 'SPONSORED'}
                        img={item.img}
                        onPress={() => handleFeedItemPress(item)}
                      />
                    ))
                  )}
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );

  const handleShortVideoLoad = () => {
    setVideoLoading(false);
    setVideoError(null);
    setVideoPaused(false);
  };

  const getVideoErrorMessage = e => {
    const fallback =
      'Failed to play video. The video format may not be supported or the URL is inaccessible.';
    if (!e) return fallback;
    const msg =
      e?.error?.localizedDescription ??
      e?.errorString ??
      e?.error?.errorString ??
      e?.message ??
      (typeof e === 'string' ? e : null);
    return msg && String(msg).trim() ? String(msg) : fallback;
  };

  const handleShortVideoError = e => {
    setVideoLoading(false);
    setVideoError(getVideoErrorMessage(e));
  };

  const handleRetryShortVideo = () => {
    setVideoError(null);
    setVideoLoading(true);
    setVideoPaused(true);
    setTimeout(() => setVideoPaused(false), 100);
  };

  const formatTime = sec => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const resDisplayTime = resIsSliding
    ? resSlidingValue
    : resVideoProgress.currentTime;
  const renderVideoDetail = () => (
    <View style={styles.videoBackground}>
      {selectedItem?.videoUrl ? (
        <>
          <Video
            ref={shortVideoRef}
            source={{ uri: String(selectedItem.videoUrl).trim() }}
            poster={selectedItem?.img}
            posterResizeMode="cover"
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            paused={videoPaused}
            repeat={false}
            controls={false}
            playInBackground={false}
            playWhenInactive={false}
            ignoreSilentSwitch="ignore"
            onLoadStart={() => {
              setVideoLoading(true);
              setVideoError(null);
            }}
            onLoad={handleShortVideoLoad}
            onError={handleShortVideoError}
            onReadyForDisplay={handleShortVideoLoad}
          />
          {(videoLoading || videoError) && (
            <View style={styles.shortVideoOverlay}>
              {videoLoading && <ActivityIndicator size="large" color="#FFF" />}
              {videoError && (
                <>
                  <Text style={styles.shortVideoErrorText}>{videoError}</Text>
                  <TouchableOpacity
                    style={styles.retryShortBtn}
                    onPress={handleRetryShortVideo}
                  >
                    <Icon name="refresh" size={20} color="#FFF" />
                    <Text style={styles.retryShortText}>Retry</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </>
      ) : (
        <Image
          source={{ uri: selectedItem?.img }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}
      <Pressable
        style={styles.videoOverlay}
        onPress={() => !videoError && setVideoPaused(p => !p)}
      >
        <View style={styles.videoOverlayInner}>
          <View style={styles.videoHeader}>
            <TouchableOpacity
              onPress={() => setIsVideoDetail(false)}
              style={styles.backBtn}
            >
              <Icon name="chevron-left" size={24} color="#FFF" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.videoHeaderIcons}>
              <Icon
                name="magnify"
                size={26}
                color="#FFF"
                style={{ marginRight: 15 }}
              />
              <TouchableOpacity
                onPress={openHomeMoreFromSelected}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="dots-vertical" size={26} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.rightActions}>
            <View style={styles.actionItem}>
              <View style={styles.iconCircle}>
                <Icon name="account-circle" size={30} color="#FFF" />
              </View>
              <Text style={styles.actionText}>
                {formatCount(selectedItem?.viewCount ?? 0)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() =>
                selectedItem?.type === 'short' && handleShortLike(selectedItem)
              }
            >
              <Icon
                name={selectedItem?.isLiked ? 'heart' : 'heart-outline'}
                size={32}
                color={selectedItem?.isLiked ? '#FF4D4D' : '#FFF'}
              />
              <Text style={styles.actionText}>
                {formatCount(selectedItem?.likeCount ?? 0)}
              </Text>
            </TouchableOpacity>
            <View style={styles.actionItem}>
              <Icon name="comment-text" size={32} color="#FFF" />
              <Text style={styles.actionText}>
                {formatCount(selectedItem?.commentCount ?? 0)}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() =>
                selectedItem?.type === 'short' && handleShortShare(selectedItem)
              }
            >
              <Icon name="share" size={32} color="#FFF" />
              <Text style={styles.actionText}>
                {formatCount(selectedItem?.shareCount ?? 0)}
              </Text>
            </TouchableOpacity>
          </View>
          {!videoLoading && !videoError && (
            <TouchableOpacity
              style={styles.shortPlayCenter}
              onPress={() => setVideoPaused(p => !p)}
              activeOpacity={1}
            >
              <Icon
                name={
                  videoPaused ? 'play-circle-outline' : 'pause-circle-outline'
                }
                size={72}
                color="rgba(255,255,255,0.95)"
              />
            </TouchableOpacity>
          )}
          <View style={styles.videoFooter}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                const ownerId =
                  selectedItem?.user?.id ?? selectedItem?.userId ?? null;
                if (ownerId) {
                  navigation.navigate('UserViewsScreen', { userId: ownerId });
                }
              }}
              disabled={!(selectedItem?.user?.id || selectedItem?.userId)}
            >
              <Text style={styles.videoUser}>
                @{(selectedItem?.title || '').toLowerCase().replace(/\s+/g, '')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.videoDesc}>
              {selectedItem?.title || 'Description'}
            </Text>
            <View style={styles.footerRow}>
              <View style={styles.audioRow}>
                <Icon name="music" size={18} color="#FFF" />
                <Text style={styles.audioText}>Original Sound</Text>
              </View>
              {(selectedItem?.creatorRole === 'owner' ||
                selectedItem?.user?.role === 'owner' ||
                selectedItem?.userId ||
                selectedItem?.user?.id) &&
                (!user?.token ? (
                  <TouchableOpacity
                    style={styles.resOrderBtn}
                    onPress={() => {
                      const ownerId =
                        selectedItem?.user?.id ?? selectedItem?.userId ?? null;
                      navigation.navigate('HomeSevenScreen', {
                        returnToOrder: true,
                        ownerUserId: ownerId,
                      });
                    }}
                  >
                    <Text style={styles.resOrderText}>Login</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.resOrderBtn}
                    onPress={() => {
                      const ownerId =
                        selectedItem?.user?.id ?? selectedItem?.userId ?? null;
                      if (ownerId) {
                        navigation.navigate('HomeThreeScreen', {
                          ownerId,
                          ownerName:
                            selectedItem?.user?.nickname ||
                            selectedItem?.user?.name ||
                            '',
                          title: selectedItem?.title,
                          location:
                            selectedItem?.location ||
                            selectedItem?.creatorAddress ||
                            '',
                        });
                      } else {
                        navigation.navigate('HomeThreeScreen');
                      }
                    }}
                  >
                    <Text style={styles.resOrderText}>Order Now</Text>
                  </TouchableOpacity>
                ))}
            </View>
            <View style={styles.bottomArrow}>
              <Icon name="chevron-down" size={40} color="#FFF" />
            </View>
          </View>
        </View>
      </Pressable>
    </View>
  );

  const renderRestaurantDetail = () => (
    <View style={styles.resContainer}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.resHeader}>
          <TouchableOpacity
            onPress={handleRestaurantDetailBack}
            style={styles.resBackBtn}
          >
            <Icon name="chevron-left" size={20} color="#FFF" />
            <Text style={styles.resBackText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={openHomeMoreFromSelected}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Icon name="dots-vertical" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.resTitleRow}>
          <View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                const ownerId =
                  selectedItem?.user?.id ?? selectedItem?.userId ?? null;
                if (ownerId) {
                  navigation.navigate('UserViewsScreen', { userId: ownerId });
                }
              }}
              disabled={!(selectedItem?.user?.id || selectedItem?.userId)}
            >
              <Text style={styles.resMainTitle}>
                {selectedItem?.user?.nickname ||
                  selectedItem?.user?.name ||
                  selectedItem?.title ||
                  '—'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.resSubLoc}>{selectedItem?.location}</Text>
          </View>
          {(selectedItem?.creatorRole === 'owner' ||
            selectedItem?.user?.role === 'owner' ||
            selectedItem?.userId ||
            selectedItem?.user?.id) &&
            (!user?.token ? (
              <TouchableOpacity
                style={styles.resOrderBtn}
                onPress={() => {
                  const ownerId =
                    selectedItem?.user?.id ?? selectedItem?.userId ?? null;
                  navigation.navigate('HomeSevenScreen', {
                    returnToOrder: true,
                    ownerUserId: ownerId,
                  });
                }}
              >
                <Text style={styles.resOrderText}>Login</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.resOrderBtn}
                onPress={() => {
                  const ownerId =
                    selectedItem?.user?.id ?? selectedItem?.userId ?? null;
                  if (ownerId) {
                    navigation.navigate('HomeThreeScreen', {
                      ownerId,
                      ownerName:
                        selectedItem?.user?.nickname ||
                        selectedItem?.user?.name ||
                        '',
                      title: selectedItem?.title,
                      location:
                        selectedItem?.location ||
                        selectedItem?.creatorAddress ||
                        '',
                    });
                  } else {
                    navigation.navigate('HomeThreeScreen');
                  }
                }}
              >
                <Text style={styles.resOrderText}>Order Now</Text>
              </TouchableOpacity>
            ))}
        </View>

        <View style={styles.resVideoCard}>
          {selectedItem?.videoUrl &&
          String(selectedItem.videoUrl).trim().startsWith('http') ? (
            <>
              <Video
                ref={resVideoRef}
                key={restaurantVideoKey}
                source={{
                  uri: String(selectedItem.videoUrl).trim(),
                }}
                poster={safeImageUri(
                  selectedItem?.img,
                  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
                )}
                posterResizeMode="cover"
                style={styles.resVideoImg}
                resizeMode="cover"
                paused={videoPaused}
                repeat={false}
                controls={false}
                playInBackground={false}
                playWhenInactive={false}
                onLoadStart={() => setVideoLoading(true)}
                onLoad={data => {
                  setVideoLoading(false);
                  setVideoError(null);
                  const dur = data?.duration || 0;
                  setResVideoProgress(p => ({ ...p, duration: dur }));
                }}
                onProgress={data => {
                  if (resSeekingRef.current) return;
                  const now = Date.now();
                  if (now - resProgressUpdateRef.current < 500) return;
                  resProgressUpdateRef.current = now;
                  setResVideoProgress(p => ({
                    currentTime: data?.currentTime ?? p.currentTime,
                    duration:
                      data?.seekableDuration || data?.duration || p.duration,
                  }));
                }}
                onError={e => {
                  setVideoLoading(false);
                  setVideoError(getVideoErrorMessage(e));
                }}
              />

              {videoLoading && (
                <View style={styles.resVideoLoadingOverlay}>
                  <ActivityIndicator size="small" color="#F5A623" />
                </View>
              )}
              {videoError && (
                <View style={styles.resVideoErrorOverlay}>
                  <Text style={styles.resVideoErrorText} numberOfLines={2}>
                    {videoError}
                  </Text>
                  <TouchableOpacity
                    style={styles.resRetryBtn}
                    onPress={() => {
                      setVideoError(null);
                      setVideoLoading(true);
                      setVideoPaused(true);
                      setRestaurantVideoKey(k => k + 1);
                      setTimeout(() => setVideoPaused(false), 200);
                    }}
                  >
                    <Icon name="refresh" size={20} color="#FFF" />
                    <Text style={styles.resRetryText}>Retry</Text>
                  </TouchableOpacity>
                </View>
              )}
              <Pressable
                style={styles.resPlayOverlay}
                onPress={() => !videoError && setVideoPaused(p => !p)}
              >
                {!videoLoading && !videoError && (
                  <Icon
                    name={videoPaused ? 'play-circle' : 'pause-circle'}
                    size={60}
                    color="rgba(255,255,255,0.9)"
                  />
                )}
              </Pressable>

              {!videoError && (
                <View style={styles.resProgressBarContainer}>
                  <Slider
                    style={styles.resProgressSlider}
                    value={resDisplayTime}
                    minimumValue={0}
                    maximumValue={Math.max(0.1, resVideoProgress.duration)}
                    minimumTrackTintColor="#fff"
                    maximumTrackTintColor="rgba(255,255,255,0.4)"
                    thumbTintColor="#fff"
                    onSlidingStart={() => {
                      setResIsSliding(true);
                      setResSlidingValue(resVideoProgress.currentTime);
                    }}
                    onValueChange={val => setResSlidingValue(val)}
                    onSlidingComplete={val => {
                      if (
                        !resVideoRef.current ||
                        resVideoProgress.duration <= 0
                      ) {
                        setResIsSliding(false);
                        return;
                      }
                      const clamped = Math.max(
                        0,
                        Math.min(val, resVideoProgress.duration),
                      );
                      resSeekingRef.current = true;
                      resVideoRef.current.seek(clamped);
                      setResVideoProgress(p => ({
                        ...p,
                        currentTime: clamped,
                      }));
                      resProgressUpdateRef.current = Date.now();
                      setTimeout(() => {
                        resSeekingRef.current = false;
                      }, 300);
                      setResIsSliding(false);
                    }}
                  />
                  <Text style={styles.resTimeText}>
                    {formatTime(resDisplayTime)} /{' '}
                    {formatTime(resVideoProgress.duration)}
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              <Image
                source={{
                  uri: safeImageUri(
                    selectedItem?.img,
                    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
                  ),
                }}
                style={styles.resVideoImg}
              />
              <View style={styles.resPlayOverlay}>
                <Icon
                  name="play-circle"
                  size={60}
                  color="rgba(255,255,255,0.8)"
                />
              </View>
            </>
          )}
        </View>

        <View style={styles.resActionsRow}>
          <TouchableOpacity
            style={styles.resActionItem}
            onPress={handleRestaurantLike}
            activeOpacity={0.7}
          >
            <Icon
              name={selectedItem?.isLiked ? 'thumb-up' : 'thumb-up-outline'}
              size={22}
              color="#111"
            />
            <Text style={styles.resActionText}>
              {formatCount(selectedItem?.likeCount ?? 0)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resActionItem}
            onPress={handleRestaurantDislike}
            activeOpacity={0.7}
          >
            <Icon
              name={
                selectedItem?.isDisliked ? 'thumb-down' : 'thumb-down-outline'
              }
              size={22}
              color="#111"
            />
            <Text style={styles.resActionText}>
              {formatCount(selectedItem?.dislikeCount ?? 0)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resActionItem}
            onPress={() => {
              if (!user?.id) {
                navigation.navigate('HomeSevenScreen');
                return;
              }
              if (!selectedItem?.id) return;
              setResCommentsVisible(true);
            }}
            activeOpacity={0.7}
            disabled={!selectedItem?.id}
          >
            <Icon name="comment-text-outline" size={22} color="#111" />
            <Text style={styles.resActionText}>
              {formatCount(selectedItem?.commentCount ?? 0)}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resActionItem}
            onPress={handleRestaurantChat}
            activeOpacity={0.7}
          >
            <Icon name="chat-outline" size={22} color="#111" />
            <Text style={styles.resActionText}>Chat</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resActionItem}
            onPress={handleRestaurantDownload}
            activeOpacity={0.7}
            disabled={resDownloadPct != null}
          >
            <Icon
              name={resDownloadPct != null ? 'download' : 'download-outline'}
              size={22}
              color="#111"
            />
            <Text style={styles.resActionText}>
              {resDownloadPct != null ? `${resDownloadPct}%` : 'Download'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resActionItem}
            onPress={handleRestaurantShare}
            activeOpacity={0.7}
          >
            <Icon name="share-outline" size={22} color="#111" />
            <Text style={styles.resActionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resActionItem}
            onPress={handleRestaurantSave}
            activeOpacity={0.7}
          >
            <Icon name="bookmark-outline" size={22} color="#111" />
            <Text style={styles.resActionText}>Save</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.resSocialRow}>
          <View style={styles.resIconGroup}>
            {[
              { type: 'instagram', icon: 'instagram' },
              { type: 'facebook', icon: 'facebook' },
              { type: 'x', icon: 'twitter' },
              { type: 'website', icon: 'web' },
            ].map(({ type, icon }) => {
              const link = (
                selectedItem?.user?.socialLinks ||
                selectedItem?.creatorSocialLinks ||
                []
              ).find(s => (s.type || '').toLowerCase() === type.toLowerCase());
              const url = link?.url || null;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => url && Linking.openURL(url)}
                  style={styles.socialIconWrap}
                >
                  <Icon
                    name={icon}
                    size={28}
                    color={url ? '#333' : '#000'}
                    style={styles.socialIcon}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
          <View>
            <TouchableOpacity style={styles.bookNowBtn}>
              <Text style={styles.bookNowText}>Book Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.galleryBtn}
              onPress={openGalleryModal}
            >
              <Text style={styles.galleryText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
        {/* <Text style={styles.webText}>
          {(
            selectedItem?.user?.socialLinks ||
            selectedItem?.creatorSocialLinks ||
            []
          ).find(s => (s.type || '').toLowerCase() === 'website')?.url ||
            (selectedItem?.user?.businessName
              ? `www.${String(selectedItem.user.businessName)
                  .toLowerCase()
                  .replace(/\s+/g, '')}.com`
              : null) ||
            '—'}
        </Text> */}

        <View style={styles.descContainer}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.descBox}>
            <Text style={styles.descText}>
              {selectedItem?.description ||
                selectedItem?.user?.channelAbout ||
                'No description.'}
            </Text>
          </View>
        </View>

        <View style={styles.contactContainer}>
          <Text style={styles.sectionTitle}>
            Phone :{' '}
            <Text style={{ fontWeight: 'normal' }}>
              {selectedItem?.user?.phone || '—'}
            </Text>
          </Text>
          <Text style={styles.contactEmail}>
            Email : {selectedItem?.user?.email || '—'}
          </Text>
          <Text style={styles.contactAddr}>
            Address :{' '}
            {selectedItem?.location ||
              selectedItem?.creatorAddress ||
              selectedItem?.user?.address ||
              '—'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );

  const barStyle = isRestaurantDetail
    ? 'dark-content'
    : isVideoDetail
    ? 'light-content'
    : 'light-content';

  const statusBarBg = isRestaurantDetail
    ? '#FFF'
    : isVideoDetail
    ? '#000'
    : '#F5A623';

  const safeAreaBg = isVideoDetail ? '#000' : statusBarBg;

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: safeAreaBg }}
      edges={['top']}
    >
      <StatusBar
        barStyle={barStyle}
        backgroundColor={statusBarBg}
        hidden={isVideoDetail}
        translucent={isVideoDetail}
      />
      {isRestaurantDetail
        ? renderRestaurantDetail()
        : isVideoDetail
        ? renderVideoDetail()
        : renderResults()}

      <SaveModal
        visible={
          (resSaveVisible && !!selectedItem?.id) ||
          (morePlaylistVisible && !!morePlaylistId)
        }
        onClose={() => {
          setResSaveVisible(false);
          setMorePlaylistVisible(false);
          setMorePlaylistId(null);
        }}
        contentType={morePlaylistVisible ? morePlaylistType : 'video'}
        contentId={morePlaylistVisible ? morePlaylistId : selectedItem?.id}
      />

      <HomeMoreOptionModal
        visible={homeMoreVisible}
        onClose={closeHomeMore}
        onPlaylist={onMoreSavePlaylist}
        onWatchLater={onMoreWatchLater}
        onDownload={onMoreDownload}
        onShare={onMoreShare}
        onNotInterested={onMoreNotInterested}
        onReport={onMoreOpenReport}
      />

      <ReportContentModal
        visible={reportVisible}
        onClose={() => {
          if (!reportSubmitting) {
            setReportVisible(false);
            setReportTarget(null);
          }
        }}
        onSubmit={handleReportSubmit}
        submitting={reportSubmitting}
      />

      <CommentsModal
        visible={resCommentsVisible}
        onClose={() => setResCommentsVisible(false)}
        contentType={selectedItem?.type === 'short' ? 'short' : 'video'}
        contentId={selectedItem?.id}
        videoId={selectedItem?.id}
        video={{
          commentCount: selectedItem?.commentCount ?? 0,
          topLevelCommentCount: selectedItem?.commentCount ?? 0,
        }}
        user={user}
        onCommentAdded={() => {
          setSelectedItem(prev => {
            if (!prev?.id) return prev;
            const newCount = (prev.commentCount ?? 0) + 1;
            return { ...prev, commentCount: newCount };
          });
        }}
        onCommentDeleted={(_wasTopLevel, deletedCount) => {
          setSelectedItem(prev => {
            if (!prev?.id) return prev;
            const dec = deletedCount || 1;
            const newCount = Math.max(0, (prev.commentCount ?? 0) - dec);
            return { ...prev, commentCount: newCount };
          });
        }}
      />

      <Modal
        visible={showGalleryModal}
        animationType="slide"
        transparent
        onRequestClose={closeGalleryModal}
      >
        <View style={styles.galleryModalOverlay}>
          <View style={styles.galleryModalContent}>
            <View style={styles.galleryModalHeader}>
              <Text style={styles.galleryModalTitle}>Gallery</Text>
              <TouchableOpacity
                onPress={closeGalleryModal}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Icon name="close" size={28} color="#333" />
              </TouchableOpacity>
            </View>
            {galleryLoading ? (
              <View style={styles.galleryModalLoading}>
                <ActivityIndicator size="large" color="#F5A623" />
                <Text style={styles.galleryModalLoadingText}>
                  Loading gallery…
                </Text>
              </View>
            ) : galleryError ? (
              <View style={styles.galleryModalEmpty}>
                <Icon name="image-off" size={48} color="#999" />
                <Text style={styles.galleryModalEmptyText}>{galleryError}</Text>
              </View>
            ) : !galleryImages?.length ? (
              <View style={styles.galleryModalEmpty}>
                <Icon name="image-multiple" size={48} color="#999" />
                <Text style={styles.galleryModalEmptyText}>
                  No gallery images
                </Text>
              </View>
            ) : (
              <FlatList
                data={galleryImages}
                keyExtractor={item =>
                  item?.id || item?.src || String(Math.random())
                }
                numColumns={2}
                contentContainerStyle={styles.galleryGridContent}
                renderItem={({ item }) => {
                  const uri =
                    typeof item === 'string'
                      ? item
                      : item?.src ?? item?.url ?? null;
                  if (!uri) return null;
                  return (
                    <View style={styles.galleryGridItem}>
                      <Image
                        source={{ uri }}
                        style={styles.galleryGridImage}
                        resizeMode="cover"
                      />
                    </View>
                  );
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={locationModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          if (!locationModalLoading) setLocationModalVisible(false);
        }}
      >
        <View style={styles.locationModalOverlay}>
          <View style={styles.locationModalContent}>
            <Text style={styles.locationModalTitle}>Choose your area</Text>
            <TextInput
              style={styles.locationModalInput}
              value={locationInput}
              onChangeText={setLocationInput}
              placeholder="Type address (e.g. area, city)"
              placeholderTextColor="#999"
              editable={!locationModalLoading}
              returnKeyType="done"
              onSubmitEditing={async () => {
                // submit typed address directly (same as tapping suggestion-less confirm)
                const trimmed = locationInput.trim();
                if (!trimmed) return;
                setLocationModalLoading(true);
                try {
                  let coords = await geocodeAddress(trimmed);
                  if (!coords)
                    coords = await geocodeAddress(`${trimmed}, United Kingdom`);
                  if (!coords) coords = getFallbackCoordsForUKArea(trimmed);
                  if (!coords) {
                    Alert.alert(
                      'Address',
                      'Could not find that address. Please refine it or use your location.',
                    );
                    setLocationModalLoading(false);
                    return;
                  }
                  setSelectedLocation(coords);
                  setAddressText(trimmed);
                  await saveLocationSelection(coords, trimmed);
                  setLocationModalVisible(false);
                  loadFeaturedAndFeed();
                  loadContinueWatching();
                } catch (e) {
                  Alert.alert(
                    'Address',
                    'Could not find that address. Please try again.',
                  );
                } finally {
                  setLocationModalLoading(false);
                }
              }}
            />
            {locationInput.trim().length > 0 && (
              <View style={styles.locationSuggestionsBox}>
                {locationSuggestionsLoading ? (
                  <View style={styles.locationSuggestionItem}>
                    <ActivityIndicator size="small" color="#F5A623" />
                    <Text style={styles.locationSuggestionText}>
                      Searching areas...
                    </Text>
                  </View>
                ) : locationSuggestions.length > 0 ? (
                  <ScrollView
                    style={{ maxHeight: 200 }}
                    keyboardShouldPersistTaps="handled"
                  >
                    {locationSuggestions.slice(0, 8).map((item, idx) => (
                      <TouchableOpacity
                        key={item.place_id || `loc-${idx}`}
                        style={styles.locationSuggestionItem}
                        activeOpacity={0.7}
                        onPress={async () => {
                          if (locationModalLoading) return;
                          setLocationInput(item.description);
                          setLocationSuggestions([]);
                          setLocationModalLoading(true);
                          try {
                            let coords = item.place_id
                              ? await getCoordsFromPlaceId(item.place_id)
                              : null;
                            if (!coords)
                              coords = await geocodeAddress(item.description);
                            if (!coords)
                              coords = await geocodeAddress(
                                `${item.description}, United Kingdom`,
                              );
                            if (!coords)
                              coords = getFallbackCoordsForUKArea(
                                item.description,
                              );
                            if (!coords) {
                              Alert.alert(
                                'Address',
                                'Could not get location for this address. Try "Use my location".',
                              );
                              setLocationModalLoading(false);
                              return;
                            }
                            setSelectedLocation(coords);
                            setAddressText(item.description);
                            await saveLocationSelection(
                              coords,
                              item.description,
                            );
                            setLocationModalVisible(false);
                            loadFeaturedAndFeed();
                            loadContinueWatching();
                          } catch (e) {
                            Alert.alert(
                              'Address',
                              'Something went wrong. Try again or use your location.',
                            );
                          } finally {
                            setLocationModalLoading(false);
                          }
                        }}
                      >
                        <Icon
                          name="map-marker-outline"
                          size={18}
                          color="#666"
                          style={{ marginRight: 8 }}
                        />
                        <Text
                          style={styles.locationSuggestionText}
                          numberOfLines={2}
                        >
                          {item.description}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.locationSuggestionItem}>
                    <Icon
                      name="map-marker-outline"
                      size={18}
                      color="#999"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.locationSuggestionHint}>
                      No areas found. Type full address or tap "Use my
                      location".
                    </Text>
                  </View>
                )}
              </View>
            )}
            <View style={styles.locationModalButtons}>
              <TouchableOpacity
                style={styles.locationUseMyBtn}
                disabled={locationModalLoading}
                onPress={() => {
                  setLocationModalLoading(true);
                  getCurrentPositionSafe(
                    async pos => {
                      try {
                        const lat = pos?.coords?.latitude;
                        const lng = pos?.coords?.longitude;
                        if (
                          lat == null ||
                          lng == null ||
                          !Number.isFinite(lat) ||
                          !Number.isFinite(lng)
                        ) {
                          setLocationModalLoading(false);
                          return;
                        }
                        const addr = await reverseGeocode(lat, lng);
                        const label =
                          addr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                        const coords = { lat, lng };
                        setLocationInput(label);
                        setSelectedLocation(coords);
                        setAddressText(label);
                        await saveLocationSelection(coords, label);
                        setLocationModalVisible(false);
                        loadFeaturedAndFeed();
                        loadContinueWatching();
                      } catch (e) {
                        Alert.alert(
                          'Location',
                          'Could not get your location. Check permissions.',
                        );
                      } finally {
                        setLocationModalLoading(false);
                      }
                    },
                    err => {
                      setLocationModalLoading(false);
                      Alert.alert(
                        'Location',
                        err || 'Could not get your location.',
                      );
                    },
                  );
                }}
              >
                {locationModalLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Icon
                      name="crosshairs-gps"
                      size={20}
                      color="#FFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.locationUseMyText}>
                      Use my location
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.locationCancelBtn}
                onPress={() => {
                  if (!locationModalLoading) setLocationModalVisible(false);
                }}
              >
                <Text style={styles.locationCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

// --- SUB-COMPONENT ---

// Two-per-row short card (HomeVersion-style): image, play overlay, bottom overlay with title + views
const ShortCard = ({ title, img, views, onPress, onMorePress }) => (
  <View style={styles.shortCard}>
    <TouchableOpacity
      style={styles.shortCardPress}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image source={{ uri: img }} style={styles.shortCardImage} />
      <View style={styles.shortPlayIconOverlay}>
        <Icon name="play-circle" size={40} color="rgba(255,255,255,0.8)" />
      </View>
      <View style={styles.shortCardOverlay}>
        <Text style={styles.shortCardTitle} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.shortCardViews}>{views}</Text>
      </View>
    </TouchableOpacity>
    {onMorePress ? (
      <TouchableOpacity
        style={styles.shortCardDots}
        onPress={onMorePress}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon name="dots-vertical" size={22} color="#FFF" />
      </TouchableOpacity>
    ) : null}
  </View>
);

const FoodCard = ({ title, location, isSponsored, img, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
    <View style={styles.cardImageContainer}>
      <Image source={{ uri: img }} style={styles.cardImage} />
      <View style={styles.playIconOverlay}>
        <Icon name="play-circle" size={50} color="rgba(255,255,255,0.8)" />
      </View>
      {isSponsored && (
        <View style={styles.sponsoredTag}>
          <Text style={styles.sponsoredTagText}>Sponsored</Text>
        </View>
      )}
    </View>
    <View style={styles.cardInfo}>
      <View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text
          numberOfLines={1}
          style={{ width: 150, color: '#666', fontSize: 12 }}
        >
          {location}
        </Text>
      </View>
      <View style={styles.cardStats}>
        <Text style={styles.statSmall}>100k views</Text>
        <Text style={styles.statSmall}>1.2 Km</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // Landing/Feed Styles
  landingContainer: { flex: 1, backgroundColor: '#F5A623' },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoText: { fontSize: 80, color: '#FFF', letterSpacing: -3 },
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
  landingSearchPlaceholder: { color: '#999', fontSize: 16, marginLeft: 10 },
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
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  suggestionHint: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  suggestionsScroll: { maxHeight: 260 },
  slogan: { color: '#FFF', marginTop: 20, fontSize: 14, fontWeight: '500' },
  feedLoading: { paddingVertical: 40, alignItems: 'center' },
  feedLoadingText: { marginTop: 10, fontSize: 14, color: '#666' },
  mainContainer: { flex: 1, backgroundColor: '#FFF' },
  header: { backgroundColor: '#F5A623', padding: 15 },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  navBtnText: { color: '#424242', fontSize: 12, fontWeight: '600' },
  headerLogo: { color: '#FFF', fontSize: 26, fontWeight: 'bold' },
  headerLogoContainer: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  logoImage: {
    width: 100,
    height: 30,
  },
  resultsTitle: {
    color: '#FFF',
    marginTop: 10,
    fontSize: 18,
    fontWeight: '700',
  },
  bannerWrapper: { width: '100%', height: 210, position: 'relative' },
  bannerImage: { width: '100%', height: '100%' },
  featuredBadge: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    backgroundColor: '#212121',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
  },
  featuredText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 5,
  },
  locationSection: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 15,
    paddingBottom: 20,
    paddingTop: 10,
  },
  homeDropdown: { flexDirection: 'row', alignItems: 'center' },
  homeText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  addressSubtext: {
    color: '#FFF',
    fontSize: 12,
    opacity: 0.9,
    marginBottom: 15,
  },
  innerSearchBox: {
    position: 'absolute',
    bottom: -22,
    left: 15,
    right: 15,
    flexDirection: 'row',
    backgroundColor: '#FFF',
    height: 45,
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  innerInput: { flex: 1, marginLeft: 10, fontSize: 15 },
  feedPadding: { padding: 15, marginTop: 20 },
  feedHint: {
    textAlign: 'center',
    fontSize: 11,
    color: '#777',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  shortsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 10,
  },
  shortsGridItem: {
    width: '50%',
    padding: 6,
  },
  shortCard: {
    height: 280,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#222',
    position: 'relative',
  },
  shortCardPress: {
    width: '100%',
    height: '100%',
  },
  shortCardDots: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 20,
    padding: 6,
  },
  shortCardImage: { width: '100%', height: '100%' },
  shortPlayIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  shortCardTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  shortCardViews: { color: '#fff', fontSize: 11, marginTop: 4 },
  card: {
    backgroundColor: '#F4F7F8',
    borderRadius: 15,
    marginBottom: 25,
    elevation: 1,
    overflow: 'hidden',
    padding: 10,
  },
  cardImageContainer: { height: 200, position: 'relative' },
  cardImage: { width: '100%', height: '100%', borderRadius: 10 },
  playIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sponsoredTag: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#F5A623',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
  },
  sponsoredTagText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  cardInfo: {
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  cardLocRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  cardLocText: { color: '#666', fontSize: 13, marginLeft: 5 },
  cardStats: { alignItems: 'flex-end' },
  statSmall: { fontSize: 12, color: '#999' },

  // Video Detail (short full-screen)
  videoBackground: {
    flex: 1,
    width: width,
    height: height,
    backgroundColor: '#000',
  },
  shortVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortVideoErrorText: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  retryShortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryShortText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  videoOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  videoOverlayInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  shortPlayCenter: {
    position: 'absolute',
    alignSelf: 'center',
    top: '35%',
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  backText: { color: '#FFF', fontWeight: 'bold', marginLeft: 5 },
  videoHeaderIcons: { flexDirection: 'row', alignItems: 'center' },
  rightActions: {
    position: 'absolute',
    right: 15,
    bottom: height * 0.25,
    alignItems: 'center',
  },
  actionItem: { alignItems: 'center', marginBottom: 20 },
  iconCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: { color: '#FFF', fontSize: 12, marginTop: 5, fontWeight: '600' },
  videoFooter: { padding: 20, paddingBottom: 40 },
  videoUser: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  videoDesc: { color: '#FFF', fontSize: 15, marginBottom: 5 },
  videoHashtags: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  translationText: {
    color: '#FFF',
    fontSize: 13,
    textDecorationLine: 'underline',
    marginBottom: 15,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audioRow: { flexDirection: 'row', alignItems: 'center' },
  audioText: { color: '#FFF', fontSize: 13, marginLeft: 5 },
  orderNowBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
  },
  orderNowText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  bottomArrow: { alignItems: 'center', marginTop: 20 },

  // Restaurant Detail
  resContainer: { flex: 1, backgroundColor: '#FFF' },
  resHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    alignItems: 'center',
  },
  resBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resBackText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  resTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  resMainTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  resSubLoc: { fontSize: 12, color: '#999', width: 200 },
  resOrderBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resOrderText: { color: '#FFF', fontWeight: 'bold' },
  resVideoCard: {
    paddingHorizontal: 15,
    height: 220,
    position: 'relative',
    marginBottom: 20,
  },
  resVideoImg: { width: '100%', height: '100%', borderRadius: 15 },
  resVideoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  resVideoErrorOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 8,
  },
  resVideoErrorText: { color: '#FFF', fontSize: 12 },
  resRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(245,166,35,0.9)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  resRetryText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  resPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  resProgressBarContainer: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  resProgressSlider: {
    flex: 1,
    height: 28,
    marginRight: 8,
  },
  resTimeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  resSocialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    alignItems: 'flex-start',
  },
  resIconGroup: { flexDirection: 'row', flexWrap: 'wrap', width: '60%' },
  socialIconWrap: { marginRight: 15, marginBottom: 10 },
  socialIcon: {},
  bookNowBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  bookNowText: { color: '#FFF', fontWeight: 'bold' },
  galleryBtn: {
    backgroundColor: '#222',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
  },
  galleryText: { color: '#FFF', fontWeight: 'bold' },
  webText: {
    paddingHorizontal: 15,
    color: '#666',
    fontSize: 13,
    marginBottom: 20,
  },
  resActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: 15,
    marginBottom: 10,
  },
  resActionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 44,
  },
  resActionText: {
    marginTop: 6,
    fontSize: 12,
    color: '#222',
    fontWeight: '600',
  },
  descContainer: { paddingHorizontal: 15, marginBottom: 20 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  descBox: { backgroundColor: '#F0F0F0', padding: 15, borderRadius: 12 },
  descText: { fontSize: 14, color: '#555', lineHeight: 20 },
  contactContainer: { paddingHorizontal: 15, paddingBottom: 30 },
  contactEmail: { color: '#555', marginTop: 5 },
  contactAddr: { color: '#555', marginTop: 5 },
  galleryModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  galleryModalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: height * 0.85,
    paddingBottom: 24,
  },
  galleryModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  galleryModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  galleryModalLoading: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  galleryModalLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  galleryModalEmpty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  galleryModalEmptyText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  locationModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  locationModalContent: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 20,
  },
  locationModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
    color: '#111827',
  },
  locationModalInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111827',
    marginBottom: 16,
  },
  locationSuggestionsBox: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    marginBottom: 12,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  locationSuggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  locationSuggestionText: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
  },
  locationSuggestionHint: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
  },
  locationModalButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  locationUseMyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5A623',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    marginRight: 8,
  },
  locationUseMyText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  locationCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  locationCancelText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  galleryGridContent: {
    padding: 8,
    paddingBottom: 24,
  },
  galleryGridItem: {
    flex: 1,
    aspectRatio: 1,
    padding: 4,
  },
  galleryGridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
});

export default HomeOneScreen;
