import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from 'react';
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
  Platform,
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
  recordView as recordVideoView,
} from '../services/videoService';
import { shortsService } from '../services/shortsService';
import {
  getGallery,
  getChannelProfile,
  subscribeToChannel,
  unsubscribeFromChannel,
} from '../services/channelService';
import { saveLastLocationToBackend } from '../services/userLocationService';
import logo from '../assets/logo.png';
import { safeImageUri } from '../utils/helper';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import SaveModal from '../components/SaveModal';
import CommentsModal from '../components/CommentsModal';
import HomeMoreOptionModal from '../components/HomeMoreOptionModal';
import ReportContentModal from '../components/ReportContentModal';
import { downloadVideo } from '../services/downloadService';
import { setPlaylist } from '../services/playlistService';
import { submitReport } from '../services/reportService';
import { buildContentShareMessage } from '../utils/contentLinks';
import { getTopRestaurantsByOrders } from '../services/orderService';
import { getMenuByUserId } from '../services/menuService';
import {
  buildShortLocationFromUser,
  formatShortProfileLocationLine,
  abbrevCountryLabel,
} from '../utils/locationFormat';
import {
  distanceKmBetween,
  formatDistanceKm,
  resolveViewerLocationOpts,
  getOwnerLatLngFromMediaPayload,
} from '../utils/geoDistance';

const { width, height } = Dimensions.get('window');

const formatCount = n => {
  if (n == null || n < 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

/** Full-number grouping like YouTube: "23 views" / "2,344,000 views" */
const formatVideoViewsLabel = n => {
  const num = Number(n);
  if (!Number.isFinite(num) || num < 0) return '0 views';
  const rounded = Math.floor(num);
  const formatted = new Intl.NumberFormat('en-US').format(rounded);
  return `${formatted} ${rounded === 1 ? 'view' : 'views'}`;
};

const viewerRole = user =>
  (user?.role && String(user.role).toLowerCase()) || 'user';

/**
 * Home banner: one featured row. Prefer the campaign tied to the logged-in user
 * (owner userId on the featured row). If several match, use the first in API order.
 * Owners with no matching campaign see none; other roles / guests see the first global.
 */
const pickHomeFeatured = (list, viewerUser) => {
  if (!Array.isArray(list) || list.length === 0) return null;
  const withVideo = list.filter(item => item?.video);
  if (withVideo.length === 0) return null;
  const vid = viewerUser?.id != null ? String(viewerUser.id) : null;
  const role = String(viewerUser?.role || '').toLowerCase();
  const isOwner = role === 'owner';

  if (vid) {
    const mine = withVideo.find(f => {
      const ownerId = f?.userId ?? f?.user?.id;
      return ownerId != null && String(ownerId) === vid;
    });
    if (mine) return mine;
    if (isOwner) return null;
  }
  return withVideo[0];
};

// Same shape as VideoDetailsScreen currentVideo so selectedItem has all fields
const mapToDisplayItem = (v, type, viewerOpts) => {
  const u = v.user || {};
  const channelName = u.nickname || u.name || 'Unknown';
  const firstPhoto =
    Array.isArray(u.photos) && u.photos.length > 0 ? u.photos[0] : null;
  const channelAvatar =
    u.channelAvatar ||
    u.avatar ||
    u.profileImage ||
    u.photoUrl ||
    (typeof firstPhoto === 'string' ? firstPhoto : firstPhoto?.src) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      channelName,
    )}&background=111&color=fff`;
  const viewCount = v.viewCount ?? v._count?.views ?? 0;
  const viewsStr =
    viewCount >= 1000
      ? `${(viewCount / 1000).toFixed(1)}K views`
      : `${viewCount} views`;

  const locationLine =
    buildShortLocationFromUser(u) ||
    formatShortProfileLocationLine(String(u.address || '').trim()) ||
    '';
  const locationDisplay = locationLine || 'Near you';

  const { lat: olat, lng: olng } = getOwnerLatLngFromMediaPayload(v);
  let distanceLabel = '';
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
    type,
    title:
      v.title ||
      (type === 'short'
        ? (v.description || 'Short').substring(0, 50)
        : 'Untitled'),
    description: v.description ?? '',
    location: locationDisplay,
    locationLine,
    distanceLabel,
    img:
      v.thumbnailUrl ||
      v.videoUrl ||
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
    videoUrl: v.videoUrl,
    user: {
      ...(u && typeof u === 'object' ? u : {}),
      id: u.id ?? v.userId,
      nickname: u.nickname || v.nickname || channelName,
      name: u.name || v.name || channelName,
      avatar: u.avatar || channelAvatar,
      channelAvatar: u.channelAvatar || channelAvatar,
      profileImage: u.profileImage || channelAvatar,
      photoUrl: u.photoUrl || channelAvatar,
      isSubscribed:
        typeof u.isSubscribed === 'boolean' ? u.isSubscribed : !!v.isSubscribed,
    },
    userId: v.userId || u.id,
    creatorRole: u.role != null ? String(u.role).toLowerCase() : undefined,
    channelName,
    channelAvatar,
    views: viewsStr,
    viewsCompact: formatCount(viewCount),
    viewCount,
    likeCount: v.likeCount ?? v._count?.likes ?? 0,
    dislikeCount: v.dislikeCount ?? v._count?.dislikes ?? 0,
    commentCount: v.commentCount ?? v._count?.comments ?? 0,
    shareCount: v.shareCount ?? 0,
    isLiked: v.isLiked ?? false,
    creatorAddress: u.address ?? undefined,
    creatorLatitude: olat ?? undefined,
    creatorLongitude: olng ?? undefined,
    creatorSocialLinks: Array.isArray(u.socialLinks) ? u.socialLinks : [],
  };
};

const LOCATION_KEY = 'USER_LOCATION_SELECTION';
const LOCATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const HomeOneScreen = () => {
  const insets = useSafeAreaInsets();
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
  const ownerMenuSearchCacheRef = useRef({});
  const [featuredVideo, setFeaturedVideo] = useState(null);
  const [sponsoredVideo, setSponsoredVideo] = useState(null);
  const [feedVideos, setFeedVideos] = useState([]);
  const [feedShorts, setFeedShorts] = useState([]);
  const [popularShorts, setPopularShorts] = useState([]);
  const [newShorts, setNewShorts] = useState([]);
  const [mostOrderedRestaurants, setMostOrderedRestaurants] = useState([]);
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
  /** Channel subscribe state for restaurant/video detail (not own video) */
  const [resDetailSubscribe, setResDetailSubscribe] = useState({
    isSubscribed: false,
    loading: false,
    toggling: false,
  });
  const [resDetailRating, setResDetailRating] = useState({
    average: 0,
    reviewCount: 0,
  });

  const viewerLocationOpts = useMemo(
    () => resolveViewerLocationOpts(selectedLocation, user),
    [
      selectedLocation?.lat,
      selectedLocation?.lng,
      user?.latitude,
      user?.longitude,
    ],
  );

  useEffect(() => {
    const sub = shortsService.onShortUpdated?.(updated => {
      const sid = String(updated?.id || '').trim();
      if (!sid) return;
      const mergeShort = s => ({
        ...s,
        title: updated?.title ?? s.title,
        description: updated?.description ?? s.description,
        img: updated?.thumbnailUrl ?? updated?.coverUrl ?? s.img,
        thumbnailUrl:
          updated?.thumbnailUrl ?? updated?.coverUrl ?? s.thumbnailUrl,
        coverUrl: updated?.coverUrl ?? updated?.thumbnailUrl ?? s.coverUrl,
        videoUrl: updated?.videoUrl ?? s.videoUrl,
        mediaUrl: updated?.videoUrl ?? updated?.mediaUrl ?? s.mediaUrl,
        visibility: updated?.visibility ?? s.visibility,
        commentSetting: updated?.commentSetting ?? s.commentSetting,
        publishedAt: updated?.publishedAt ?? s.publishedAt,
      });
      setFeedShorts(prev =>
        prev.map(s => (String(s?.id) === sid ? mergeShort(s) : s)),
      );
      setSelectedItem(prev => {
        if (String(prev?.id) !== sid) return prev;
        const t = String(prev?.type || prev?._type || '').toLowerCase();
        if (t && t !== 'short') return prev;
        return mergeShort(prev);
      });
    });
    return () => sub?.remove?.();
  }, []);
  /** When opening video from Library / UserViews Videos, Back returns there */
  const libraryDetailReturnRef = useRef(null);

  const galleryUserId = selectedItem?.userId || selectedItem?.user?.id;
  const videoChannelOwnerId =
    selectedItem?.userId ?? selectedItem?.user?.id ?? null;
  const isOwnChannelVideo =
    !!user?.id &&
    !!videoChannelOwnerId &&
    String(videoChannelOwnerId) === String(user.id);
  const showSubscribeBtn = !!videoChannelOwnerId && !isOwnChannelVideo;

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

    if (t.returnTo === 'promotion') {
      navigation.navigate(
        'PromotionScreen',
        t.returnUserId != null && t.returnUserId !== ''
          ? { userId: String(t.returnUserId) }
          : undefined,
      );
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
              const full = mapToDisplayItem(res, 'video', viewerLocationOpts);
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
              const full = mapToDisplayItem(res, 'short', viewerLocationOpts);
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
            } else if (
              userRef.current?.latitude != null &&
              userRef.current?.longitude != null
            ) {
              if (cancelled) return;
              setSelectedLocation({
                lat: Number(userRef.current.latitude),
                lng: Number(userRef.current.longitude),
              });
              const u = userRef.current;
              setAddressText(
                (u?.address && String(u.address).trim()) ||
                  [u?.city, u?.country].filter(Boolean).join(', ') ||
                  '',
              );
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
      viewerLocationOpts,
      loadFeaturedAndFeed,
      loadContinueWatching,
    ]),
  );

  const loadFeaturedAndFeed = useCallback(async () => {
    const voBrowse = resolveViewerLocationOpts(selectedLocation, user);
    if (!voBrowse) return;
    setFeedLoading(true);
    const lat = voBrowse.viewerLat;
    const lng = voBrowse.viewerLng;
    const role = viewerRole(user);
    const baseParams = {
      page: 1,
      limit: 50,
      sort: 'latest',
      viewerRole: role,
    };
    const searchTerm = searchDebounced?.trim() || undefined;
    const videoParams = {
      ...baseParams,
      nearbyLat: lat,
      nearbyLng: lng,
      radiusKm: 50,
      excludeSponsored: true,
      excludeFeatured: true,
    };
    const shortParams = {
      ...baseParams,
      viewerUserId: user?.id,
      nearbyLat: lat,
      nearbyLng: lng,
      radiusKm: 50,
    };

    // Featured + sponsored: direct GET /featured and GET /sponsored (no location check)
    getFeatured()
      .then(({ featured: list }) => {
        setFeaturedVideo(pickHomeFeatured(list, user));
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
      const [videosRes, shortsRes, popularShortsRes, newestShortsRes, topRes] =
        await Promise.all([
          getVideos(videoParams),
          shortsService.getShorts(shortParams),
          shortsService.getShorts({
            ...shortParams,
            sort: 'trending',
            page: 1,
            limit: 16,
          }),
          shortsService.getShorts({
            ...shortParams,
            sort: 'newest',
            page: 1,
            limit: 16,
          }),
          getTopRestaurantsByOrders({ page: 1, limit: 10 }).catch(() => ({
            restaurants: [],
          })),
        ]);
      const vo = { viewerLat: lat, viewerLng: lng };
      const mappedVideos = (videosRes?.videos || []).map(v =>
        mapToDisplayItem(v, 'video', vo),
      );
      const rawShorts = (shortsRes?.shorts || []).filter(
        s => s.videoUrl && String(s.videoUrl).trim(),
      );
      const hasShortAvatar = s => {
        const u = s?.user && typeof s.user === 'object' ? s.user : {};
        const p0 =
          Array.isArray(u?.photos) && u.photos.length > 0 ? u.photos[0] : null;
        return !!(
          s?.avatar ||
          s?.channelAvatar ||
          s?.profileImage ||
          s?.photoUrl ||
          u?.avatar ||
          u?.channelAvatar ||
          u?.profileImage ||
          u?.photoUrl ||
          (typeof p0 === 'string' ? p0 : p0?.src)
        );
      };
      const missingOwnerIds = Array.from(
        new Set(
          rawShorts
            .filter(s => !hasShortAvatar(s))
            .map(s => s?.userId || s?.user?.id)
            .filter(Boolean)
            .map(String),
        ),
      );
      const ownerProfileById = {};
      await Promise.allSettled(
        missingOwnerIds.map(async oid => {
          try {
            const p = await getChannelProfile(oid, user?.id);
            ownerProfileById[String(oid)] = p || null;
          } catch (_) {
            ownerProfileById[String(oid)] = null;
          }
        }),
      );
      const mapShortWithOwnerPatch = s => {
        const oid = String(s?.userId || s?.user?.id || '');
        const p = oid ? ownerProfileById[oid] : null;
        if (!p) return mapToDisplayItem(s, 'short', vo);
        const u = s?.user && typeof s.user === 'object' ? s.user : {};
        const p0 =
          Array.isArray(p?.photos) && p.photos.length > 0 ? p.photos[0] : null;
        const pPhoto =
          typeof p0 === 'string'
            ? p0
            : p0?.src || p?.channelAvatar || p?.profileImage || null;
        const mergedUser = {
          ...u,
          id: u?.id || s?.userId || p?.id,
          nickname: u?.nickname || p?.nickname || p?.name || s?.nickname,
          name: u?.name || p?.name || p?.nickname || s?.name,
          avatar:
            u?.avatar ||
            u?.channelAvatar ||
            u?.profileImage ||
            u?.photoUrl ||
            pPhoto,
          channelAvatar: u?.channelAvatar || p?.channelAvatar || pPhoto,
          profileImage: u?.profileImage || p?.profileImage || pPhoto,
          photoUrl: u?.photoUrl || p?.photoUrl || pPhoto,
          photos:
            Array.isArray(u?.photos) && u.photos.length > 0
              ? u.photos
              : Array.isArray(p?.photos)
              ? p.photos
              : pPhoto
              ? [{ src: pPhoto }]
              : [],
        };
        return mapToDisplayItem(
          {
            ...s,
            userId: s?.userId || mergedUser?.id,
            user: mergedUser,
          },
          'short',
          vo,
        );
      };
      const mappedShorts = rawShorts.map(mapShortWithOwnerPatch);
      const mappedPopularShorts = (popularShortsRes?.shorts || [])
        .filter(s => s?.videoUrl && String(s.videoUrl).trim())
        .map(mapShortWithOwnerPatch);
      const mappedNewestShorts = (newestShortsRes?.shorts || [])
        .filter(s => s?.videoUrl && String(s.videoUrl).trim())
        .map(mapShortWithOwnerPatch);
      const q = String(searchTerm || '')
        .toLowerCase()
        .trim();
      const allMappedMedia = [
        ...mappedVideos,
        ...mappedShorts,
        ...mappedPopularShorts,
        ...mappedNewestShorts,
      ];
      const uniqueOwnerIds = Array.from(
        new Set(
          allMappedMedia
            .map(m => m?.userId ?? m?.user?.id)
            .filter(Boolean)
            .map(String),
        ),
      );
      if (q && uniqueOwnerIds.length > 0) {
        await Promise.allSettled(
          uniqueOwnerIds.map(async oid => {
            if (ownerMenuSearchCacheRef.current[oid]) return;
            try {
              const res = await getMenuByUserId(oid);
              const rows = Array.isArray(res?.menu)
                ? res.menu.map(m => ({
                    id: m?.id,
                    itemName: String(m?.itemName || '').trim(),
                    description: String(m?.description || '').trim(),
                    tags: Array.isArray(m?.tags) ? m.tags : [],
                  }))
                : [];
              ownerMenuSearchCacheRef.current[oid] = rows;
            } catch (_) {
              ownerMenuSearchCacheRef.current[oid] = [];
            }
          }),
        );
      }
      const withMenuSearchMeta = item => {
        const ownerId = item?.userId ?? item?.user?.id;
        if (!ownerId) return item;
        const menuRows = ownerMenuSearchCacheRef.current[String(ownerId)] || [];
        if (!Array.isArray(menuRows) || menuRows.length === 0) return item;
        const menuBlob = menuRows
          .map(m =>
            [
              m?.itemName,
              m?.description,
              ...(Array.isArray(m?.tags) ? m.tags : []),
            ]
              .filter(Boolean)
              .join(' '),
          )
          .join(' ')
          .toLowerCase();
        const matchedMenuItems =
          q && q.length > 0
            ? menuRows
                .filter(m =>
                  [
                    m?.itemName,
                    m?.description,
                    ...(Array.isArray(m?.tags) ? m.tags : []),
                  ]
                    .filter(Boolean)
                    .join(' ')
                    .toLowerCase()
                    .includes(q),
                )
                .slice(0, 8)
            : [];
        return {
          ...item,
          _menuSearchBlob: menuBlob,
          _matchedMenuItems: matchedMenuItems,
          _menuSearchKeyword: q,
        };
      };
      const mappedVideosWithMenu = mappedVideos.map(withMenuSearchMeta);
      const mappedShortsWithMenu = mappedShorts.map(withMenuSearchMeta);
      const mappedPopularShortsWithMenu =
        mappedPopularShorts.map(withMenuSearchMeta);
      const mappedNewestShortsWithMenu = mappedNewestShorts.map(
        withMenuSearchMeta,
      );
      const matchesSearch = item => {
        if (!q) return true;
        const haystack = [
          item?.title,
          item?.description,
          item?.channelName,
          item?.location,
          item?.creatorAddress,
          item?.user?.nickname,
          item?.user?.name,
          item?.user?.address,
          item?._menuSearchBlob,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return haystack.includes(q);
      };
      setFeedVideos(mappedVideosWithMenu.filter(matchesSearch));
      setFeedShorts(mappedShortsWithMenu.filter(matchesSearch));
      setPopularShorts(mappedPopularShortsWithMenu.filter(matchesSearch));
      setNewShorts(mappedNewestShortsWithMenu.filter(matchesSearch));
      const topRestaurants = (topRes?.restaurants || []).map(r => {
        const firstPhoto =
          Array.isArray(r?.photos) && r.photos.length > 0 ? r.photos[0] : null;
        const photo =
          typeof firstPhoto === 'string' ? firstPhoto : firstPhoto?.src || null;
        const city =
          (r?.city && String(r.city).trim()) ||
          (r?.town && String(r.town).trim()) ||
          '';
        const country = r?.country && String(r.country).trim();
        const locShort =
          (city && country && `${city}, ${abbrevCountryLabel(country)}`) ||
          formatShortProfileLocationLine(String(r?.address || '').trim()) ||
          '';
        let distanceLabel = '';
        if (
          r?.latitude != null &&
          r?.longitude != null &&
          lat != null &&
          lng != null
        ) {
          const km = distanceKmBetween(
            lat,
            lng,
            Number(r.latitude),
            Number(r.longitude),
          );
          if (km != null) distanceLabel = formatDistanceKm(km);
        }
        const oc = Number(r?.orderCount || 0);
        return {
          id: r?.id,
          type: 'restaurant',
          title: r?.nickname || r?.name || 'Restaurant',
          location: locShort || 'Near you',
          distanceLabel,
          img:
            photo ||
            'https://images.unsplash.com/photo-1552566626-52f8b828add9',
          orderCount: oc,
          views: `${oc} order${oc === 1 ? '' : 's'}`,
        };
      });
      setMostOrderedRestaurants(topRestaurants);
    } catch (e) {
      console.error('HomeOne load feed:', e);
      setFeedVideos([]);
      setFeedShorts([]);
      setPopularShorts([]);
      setNewShorts([]);
      setMostOrderedRestaurants([]);
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
        ...mapToDisplayItem(video || {}, 'video', viewerLocationOpts),
        watchedAt: new Date(watchedAt).getTime(),
      }));
      const sHistory = (sRes?.history || []).map(({ short: s, watchedAt }) => ({
        ...mapToDisplayItem(s || {}, 'short', viewerLocationOpts),
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
  }, [user?.id, viewerLocationOpts]);

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
    if (resolveViewerLocationOpts(selectedLocation, user)) {
      loadFeaturedAndFeed();
    }
  }, [
    selectedLocation?.lat,
    selectedLocation?.lng,
    user?.latitude,
    user?.longitude,
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
          const full = mapToDisplayItem(res, 'short', viewerLocationOpts);
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
    const campaignMeta = item?._campaignMeta || null;
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
          recordVideoView(item.id, user?.id || null).catch(() => {});
          const rawDisplay = mapToDisplayItem(
            res,
            item?.type || 'video',
            viewerLocationOpts,
          );
          const vc = (rawDisplay.viewCount ?? 0) + 1;
          const full = {
            ...rawDisplay,
            viewCount: vc,
            views:
              vc >= 1000 ? `${(vc / 1000).toFixed(1)}K views` : `${vc} views`,
          };
          const videoDescriptionRaw =
            (res?.description != null && String(res.description).trim()) ||
            (full.description != null && String(full.description).trim()) ||
            '';

          const applyCampaignOwner = (co, profile) => {
            const p = profile && typeof profile === 'object' ? profile : {};
            const u = {
              ...(full.user && typeof full.user === 'object' ? full.user : {}),
              ...(co && typeof co === 'object' ? co : {}),
              id: co?.id,
              phone:
                p.phone ??
                p.phoneNumber ??
                p.contactPhone ??
                co?.phone ??
                full.user?.phone,
              email: p.email ?? p.contactEmail ?? co?.email ?? full.user?.email,
              address: p.address ?? co?.address ?? full.user?.address,
              channelAbout:
                p.channelAbout ??
                p.about ??
                p.bio ??
                co?.channelAbout ??
                full.user?.channelAbout,
              nickname:
                p.nickname ??
                p.channelName ??
                co?.nickname ??
                full.user?.nickname,
              name: p.name ?? co?.name ?? full.user?.name,
              photos: p.photos ?? co?.photos ?? full.user?.photos,
              socialLinks: Array.isArray(p.socialLinks)
                ? p.socialLinks
                : Array.isArray(co?.socialLinks)
                ? co.socialLinks
                : full.user?.socialLinks,
              role: p.role ?? co?.role ?? full.user?.role,
            };
            const channelName =
              u.nickname || u.name || full.channelName || 'Restaurant';
            const photo0 = p.photos?.[0] ?? co?.photos?.[0] ?? u.photos?.[0];
            const avatar =
              p.channelAvatar ||
              (typeof photo0 === 'string' ? photo0 : photo0?.src) ||
              full.channelAvatar;
            const addrLine =
              (p.address && String(p.address).trim()) ||
              (u.address && String(u.address).trim()) ||
              (campaignMeta?.areaName &&
                String(campaignMeta.areaName).trim()) ||
              (co?.address && String(co.address).trim()) ||
              full.location ||
              'Near you';
            return {
              ...full,
              description: videoDescriptionRaw,
              _campaignVideoDetail: true,
              user: u,
              userId: co?.id,
              channelName,
              channelAvatar: safeImageUri(
                avatar,
                `https://ui-avatars.com/api/?name=${encodeURIComponent(
                  channelName,
                )}&background=111&color=fff`,
              ),
              location: addrLine,
              creatorAddress:
                (p.address && String(p.address).trim()) ||
                (co?.address && String(co.address).trim()) ||
                campaignMeta?.areaName ||
                full.creatorAddress,
              creatorLatitude:
                p.latitude ?? co?.latitude ?? campaignMeta?.latitude,
              creatorLongitude:
                p.longitude ?? co?.longitude ?? campaignMeta?.longitude,
              creatorSocialLinks: Array.isArray(u.socialLinks)
                ? u.socialLinks
                : full.creatorSocialLinks || [],
              creatorRole:
                u.role != null
                  ? String(u.role).toLowerCase()
                  : full.creatorRole,
            };
          };

          if (campaignOwner?.id) {
            getChannelProfile(campaignOwner.id, user?.id)
              .then(profile => {
                setSelectedItem(prev => ({
                  ...applyCampaignOwner(campaignOwner, profile),
                  watchedAt: prev?.watchedAt,
                }));
              })
              .catch(() => {
                setSelectedItem(prev => ({
                  ...applyCampaignOwner(campaignOwner, null),
                  watchedAt: prev?.watchedAt,
                }));
              });
          } else {
            setSelectedItem(prev => ({ ...full, watchedAt: prev?.watchedAt }));
          }
        })
        .catch(() => {});
    }
  };

  useEffect(() => {
    if (!isRestaurantDetail) {
      setResDetailSubscribe({
        isSubscribed: false,
        loading: false,
        toggling: false,
      });
      setResDetailRating({ average: 0, reviewCount: 0 });
      return;
    }
    if (!videoChannelOwnerId) {
      setResDetailSubscribe({
        isSubscribed: false,
        loading: false,
        toggling: false,
      });
      setResDetailRating({ average: 0, reviewCount: 0 });
      return;
    }
    /** Own channel: hide subscribe, but still load rating/review counts from API */
    if (isOwnChannelVideo) {
      setResDetailSubscribe({
        isSubscribed: false,
        loading: false,
        toggling: false,
      });
    } else {
      setResDetailSubscribe(s => ({ ...s, loading: true, toggling: false }));
    }
    let cancelled = false;
    getChannelProfile(videoChannelOwnerId, user?.id)
      .then(p => {
        if (cancelled) return;
        const avgRaw =
          p?.averageRating ?? p?.ratingAverage ?? p?.ratingAvg ?? p?.rating;
        const countRaw =
          p?.reviewCount ??
          p?.reviewsCount ??
          p?.totalReviews ??
          p?.ratingCount;
        const avg = Number(avgRaw);
        const count = Number(countRaw);
        if (!isOwnChannelVideo) {
          setResDetailSubscribe({
            isSubscribed: !!p?.isSubscribed,
            loading: false,
            toggling: false,
          });
        }
        setResDetailRating({
          average: Number.isFinite(avg) ? Math.max(0, Math.min(5, avg)) : 0,
          reviewCount: Number.isFinite(count)
            ? Math.max(0, Math.floor(count))
            : 0,
        });
      })
      .catch(() => {
        if (cancelled) return;
        if (!isOwnChannelVideo) {
          setResDetailSubscribe({
            isSubscribed: false,
            loading: false,
            toggling: false,
          });
        }
        setResDetailRating({ average: 0, reviewCount: 0 });
      });
    return () => {
      cancelled = true;
    };
  }, [
    isRestaurantDetail,
    videoChannelOwnerId,
    isOwnChannelVideo,
    user?.id,
    selectedItem?.id,
  ]);

  const handleRestaurantSubscribe = useCallback(() => {
    if (!user?.id) {
      navigation.navigate('HomeSevenScreen');
      return;
    }
    if (!videoChannelOwnerId || isOwnChannelVideo) return;
    setResDetailSubscribe(s => {
      if (s.toggling || s.loading) return s;
      const wasSubscribed = s.isSubscribed;
      (async () => {
        try {
          if (wasSubscribed) {
            await unsubscribeFromChannel(user.id, videoChannelOwnerId);
          } else {
            await subscribeToChannel(user.id, videoChannelOwnerId);
          }
          setResDetailSubscribe({
            isSubscribed: !wasSubscribed,
            loading: false,
            toggling: false,
          });
        } catch (e) {
          Alert.alert(
            'Subscribe',
            e?.message || 'Could not update subscription.',
          );
          setResDetailSubscribe(s2 => ({ ...s2, toggling: false }));
        }
      })();
      return { ...s, toggling: true };
    });
  }, [user?.id, videoChannelOwnerId, isOwnChannelVideo, navigation]);

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
        const res = await shortsService.toggleLike(item.id, user.id);
        const nowLiked = res?.liked === true;
        setSelectedItem(prev => {
          if (!prev || prev.id !== item.id) return prev;
          const wasLiked = !!prev.isLiked;
          const wasDisliked = !!prev.isDisliked;
          let likeCount = Number(prev.likeCount ?? 0) || 0;
          let dislikeCount = Number(prev.dislikeCount ?? 0) || 0;
          if (nowLiked) {
            if (!wasLiked) likeCount += 1;
            if (wasDisliked) dislikeCount = Math.max(0, dislikeCount - 1);
            return {
              ...prev,
              isLiked: true,
              isDisliked: false,
              likeCount,
              dislikeCount,
            };
          }
          if (wasLiked) likeCount = Math.max(0, likeCount - 1);
          return {
            ...prev,
            isLiked: false,
            likeCount,
            dislikeCount,
          };
        });
      } catch (e) {}
    },
    [user?.id],
  );

  const handleShortShare = useCallback(async item => {
    if (!item?.id) return;
    const message = buildContentShareMessage({
      type: 'short',
      id: item.id,
      title: item.title || item.description || 'Short',
    });
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
    const targetId = selectedItem.id;
    const isShort = selectedItem?.type === 'short';
    try {
      const res = isShort
        ? await shortsService.toggleLike(targetId, user.id)
        : await toggleVideoLike(targetId, user.id);
      const nowLiked = res?.liked === true;
      setSelectedItem(prev => {
        if (!prev || prev.id !== targetId) return prev;
        const wasLiked = !!prev.isLiked;
        const wasDisliked = !!prev.isDisliked;
        let likeCount = Number(prev.likeCount ?? 0) || 0;
        let dislikeCount = Number(prev.dislikeCount ?? 0) || 0;
        if (nowLiked) {
          if (!wasLiked) likeCount += 1;
          if (wasDisliked) {
            dislikeCount = Math.max(0, dislikeCount - 1);
          }
          return {
            ...prev,
            isLiked: true,
            isDisliked: false,
            likeCount,
            dislikeCount,
          };
        }
        if (wasLiked) likeCount = Math.max(0, likeCount - 1);
        return {
          ...prev,
          isLiked: false,
          likeCount,
          dislikeCount,
        };
      });
    } catch {}
  }, [navigation, selectedItem?.id, selectedItem?.type, user?.id]);

  const handleRestaurantDislike = useCallback(async () => {
    if (!user?.id || !selectedItem?.id) {
      navigation.navigate('HomeSevenScreen');
      return;
    }
    const targetId = selectedItem.id;
    const isShort = selectedItem?.type === 'short';
    try {
      const res = isShort
        ? await shortsService.toggleDislike(targetId, user.id)
        : await toggleVideoDislike(targetId, user.id);
      const nowDisliked = res?.disliked === true;
      setSelectedItem(prev => {
        if (!prev || prev.id !== targetId) return prev;
        const wasLiked = !!prev.isLiked;
        const wasDisliked = !!prev.isDisliked;
        let likeCount = Number(prev.likeCount ?? 0) || 0;
        let dislikeCount = Number(prev.dislikeCount ?? 0) || 0;
        if (nowDisliked) {
          if (!wasDisliked) dislikeCount += 1;
          if (wasLiked) likeCount = Math.max(0, likeCount - 1);
          return {
            ...prev,
            isDisliked: true,
            isLiked: false,
            likeCount,
            dislikeCount,
          };
        }
        if (wasDisliked) dislikeCount = Math.max(0, dislikeCount - 1);
        return {
          ...prev,
          isDisliked: false,
          likeCount,
          dislikeCount,
        };
      });
    } catch {}
  }, [navigation, selectedItem?.id, selectedItem?.type, user?.id]);

  const handleRestaurantShare = useCallback(async () => {
    if (!selectedItem?.id) return;
    const isShort = selectedItem?.type === 'short';
    const message = buildContentShareMessage({
      type: isShort ? 'short' : 'video',
      id: selectedItem.id,
      title: selectedItem?.title || (isShort ? 'Short' : 'Video'),
    });
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
    const partnerName =
      selectedItem?.user?.nickname ||
      selectedItem?.user?.name ||
      selectedItem?.title ||
      'User';
    const avatarCandidate =
      selectedItem?.channelAvatar ||
      selectedItem?.user?.channelAvatar ||
      selectedItem?.user?.photos?.[0] ||
      selectedItem?.user?.avatar ||
      selectedItem?.user?.profileImage;
    const partnerAvatar = safeImageUri(
      avatarCandidate,
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        partnerName,
      )}&background=111&color=fff`,
    );
    navigation.navigate('DetailedChatScreen', {
      partnerId,
      partnerName,
      partnerAvatar,
    });
  }, [
    navigation,
    selectedItem?.user?.id,
    selectedItem?.userId,
    selectedItem?.channelAvatar,
    selectedItem?.user,
    user?.id,
  ]);

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
    const msg = buildContentShareMessage({
      type: t.contentType === 'short' ? 'short' : 'video',
      id: t.contentId,
      title: t.title || 'Check this out',
    });
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

  const campaignMetaFrom = parent =>
    parent &&
    (parent.areaName != null ||
      parent.latitude != null ||
      parent.longitude != null)
      ? {
          areaName: parent.areaName || '',
          latitude: parent.latitude,
          longitude: parent.longitude,
        }
      : null;

  /** Featured/sponsored API returns campaign owner on parent; video.user may be missing — keep owner for detail screen. */
  const featuredItem = (() => {
    if (!featuredVideo?.video) return null;
    const video = featuredVideo.video;
    const co = featuredVideo.user;
    const mergedUser =
      co?.id || co?.name
        ? {
            ...(video.user && typeof video.user === 'object' ? video.user : {}),
            ...co,
          }
        : video.user || co;
    const base = mapToDisplayItem(
      {
        ...video,
        creatorLatitude:
          video.creatorLatitude ??
          featuredVideo.latitude ??
          mergedUser?.latitude ??
          mergedUser?.lat,
        creatorLongitude:
          video.creatorLongitude ??
          featuredVideo.longitude ??
          mergedUser?.longitude ??
          mergedUser?.lng,
        user: mergedUser,
      },
      'video',
      viewerLocationOpts,
    );
    const meta = campaignMetaFrom(featuredVideo);
    return co?.id
      ? {
          ...base,
          _campaignOwnerUser: co,
          ...(meta && { _campaignMeta: meta }),
        }
      : base;
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
        const base = mapToDisplayItem(
          {
            ...video,
            creatorLatitude:
              video.creatorLatitude ??
              sponsoredVideo.latitude ??
              mergedUser?.latitude ??
              mergedUser?.lat,
            creatorLongitude:
              video.creatorLongitude ??
              sponsoredVideo.longitude ??
              mergedUser?.longitude ??
              mergedUser?.lng,
            user: mergedUser,
          },
          'video',
          viewerLocationOpts,
        );
        const meta = campaignMetaFrom(sponsoredVideo);
        return co?.id
          ? {
              ...base,
              _campaignOwnerUser: co,
              ...(meta && { _campaignMeta: meta }),
            }
          : base;
      })()
    : null;

  // Curated feed order:
  // sponsored -> most popular shorts -> 2 videos -> try new shorts -> 1 video
  // -> most ordered restaurants -> 2 videos -> continue -> remaining mixed feed.
  const buildFeedSections = () => {
    const shorts = feedShorts || [];
    const videos = feedVideos || [];
    const popShorts = popularShorts || [];
    const freshShorts = newShorts || [];
    const topRestaurants = mostOrderedRestaurants || [];
    const sections = [];
    let sIdx = 0;
    let vIdx = 0;

    if (sponsoredItem) {
      sections.push({ type: 'SPONSORED', data: [sponsoredItem] });
    }

    const firstPopular = popShorts.slice(0, 6);
    if (firstPopular.length > 0) {
      sections.push({ type: 'MOST_POPULAR_SHORTS', data: firstPopular });
    }

    const firstVideos = videos.slice(vIdx, vIdx + 2);
    vIdx += firstVideos.length;
    if (firstVideos.length > 0) {
      sections.push({ type: 'VIDEOS', data: firstVideos });
    }

    const firstTryNew = freshShorts.slice(0, 10);
    if (firstTryNew.length > 0) {
      sections.push({ type: 'TRY_NEW_SHORTS', data: firstTryNew });
    }

    const bridgeVideo = videos.slice(vIdx, vIdx + 1);
    vIdx += bridgeVideo.length;
    if (bridgeVideo.length > 0) {
      sections.push({ type: 'VIDEOS', data: bridgeVideo });
    }

    if (topRestaurants.length > 0) {
      sections.push({
        type: 'MOST_ORDERS',
        data: topRestaurants.slice(0, 6),
      });
    }

    const secondVideos = videos.slice(vIdx, vIdx + 2);
    vIdx += secondVideos.length;
    if (secondVideos.length > 0) {
      sections.push({ type: 'VIDEOS', data: secondVideos });
    }

    if (continueData.length > 0) {
      sections.push({
        type: 'CONTINUE',
        data: continueData.slice(0, 3),
      });
    }

    // Use the regular feed shorts as the continuation mix.
    const firstShorts = shorts.slice(sIdx, sIdx + 4);
    sIdx += firstShorts.length;
    if (firstShorts.length > 0) {
      sections.push({ type: 'SHORTS', data: firstShorts });
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

  const renderResults = () => {
    const addr = (addressText && String(addressText).trim()) || '';
    const areaShort = addr ? addr.split(',')[0].trim() : '';
    const areaForTitle = areaShort || 'your area';
    const primaryLoc = areaShort || addr || 'Set your address';
    const secondaryLoc = addr || primaryLoc;

    return (
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
                    profileImageUri &&
                    String(profileImageUri).trim().length > 0;
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
            Your search results in {areaForTitle}...
          </Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          {featuredVideo?.video ? (
            <TouchableOpacity
              style={styles.bannerWrapper}
              activeOpacity={0.92}
              onPress={() => featuredItem && openRestaurantDetail(featuredItem)}
            >
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
              <View style={styles.featuredPlayOverlay} pointerEvents="none">
                <Icon
                  name="play-circle"
                  size={56}
                  color="rgba(255,255,255,0.92)"
                />
              </View>
              <View style={styles.featuredBadge} pointerEvents="none">
                <Text style={styles.featuredText}>Featured</Text>
                <Icon name="chevron-right" size={16} color="#FFF" />
              </View>
            </TouchableOpacity>
          ) : null}

          <View style={styles.locationSection}>
            <View style={styles.locationTopRow}>
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
                  {primaryLoc}
                </Text>
                <Icon name="chevron-down" size={24} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.locationOrderBtn}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('OrderNowBrowseScreen', {
                    initialQuery: searchDebounced || searchQuery || '',
                  })
                }
              >
                <Text style={styles.locationOrderBtnText}>Order Now</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.addressSubtext} numberOfLines={2}>
              {secondaryLoc}
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
                    {(section.type === 'MOST_POPULAR_SHORTS' ||
                      section.type === 'TRY_NEW_SHORTS' ||
                      section.type === 'MOST_ORDERS') && (
                      <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>
                          {section.type === 'MOST_POPULAR_SHORTS'
                            ? 'Most Viewed'
                            : section.type === 'TRY_NEW_SHORTS'
                            ? 'New Videos'
                            : 'Most Ordered'}
                        </Text>
                        {(section.type === 'MOST_POPULAR_SHORTS' ||
                          section.type === 'TRY_NEW_SHORTS') && (
                          <TouchableOpacity
                            onPress={() =>
                              navigation.navigate('HomeShortsExploreScreen', {
                                title:
                                  section.type === 'MOST_POPULAR_SHORTS'
                                    ? 'Most Viewed'
                                    : 'New Videos',
                                sort:
                                  section.type === 'MOST_POPULAR_SHORTS'
                                    ? 'trending'
                                    : 'newest',
                              })
                            }
                          >
                            <Text style={styles.viewMoreText}>View more</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
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
                    {section.type === 'SPONSORED' &&
                      section.data.length > 0 && (
                        <Text style={styles.sectionTitle}>
                          Sponsored near you
                        </Text>
                      )}
                    {section.type === 'SHORTS' ||
                    section.type === 'MOST_POPULAR_SHORTS' ? (
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
                    ) : section.type === 'TRY_NEW_SHORTS' ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.tryNewRow}
                      >
                        {section.data.map((item, index) => (
                          <View
                            key={`${item.id}-${item.type}-${sectionIdx}-${index}`}
                            style={styles.tryNewCard}
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
                      </ScrollView>
                    ) : section.type === 'MOST_ORDERS' ? (
                      <View style={styles.shortsGrid}>
                        {section.data.map((item, index) => (
                          <TouchableOpacity
                            key={`${item.id}-rest-${sectionIdx}-${index}`}
                            style={styles.shortsGridItem}
                            activeOpacity={0.9}
                            onPress={() =>
                              navigation.navigate('BusinessProfileViewScreen', {
                                userId: item.id,
                                focusVideoTab: true,
                              })
                            }
                          >
                            <FoodCard
                              title={item.title}
                              location={item.location}
                              views={item.views}
                              distanceLabel={item.distanceLabel}
                              img={item.img}
                              onPress={() =>
                                navigation.navigate(
                                  'BusinessProfileViewScreen',
                                  {
                                    userId: item.id,
                                    focusVideoTab: true,
                                  },
                                )
                              }
                            />
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : (
                      section.data.map((item, index) => (
                        <FoodCard
                          key={`${item.id}-${item.type}-${sectionIdx}-${index}`}
                          title={item.title}
                          location={item.location}
                          views={item.views}
                          distanceLabel={item.distanceLabel}
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
  };

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
                    <Text style={styles.resOrderText}>Order Now</Text>
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
                          searchKeyword: String(searchDebounced || '').trim(),
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
      {(() => {
        const avgRaw =
          selectedItem?.user?.averageRating ??
          selectedItem?.user?.ratingAverage ??
          selectedItem?.user?.ratingAvg ??
          selectedItem?.user?.rating ??
          selectedItem?.averageRating ??
          selectedItem?.ratingAverage ??
          selectedItem?.ratingAvg ??
          selectedItem?.rating;
        const reviewRaw =
          selectedItem?.user?.reviewCount ??
          selectedItem?.user?.reviewsCount ??
          selectedItem?.user?.totalReviews ??
          selectedItem?.user?.ratingCount ??
          selectedItem?.reviewCount ??
          selectedItem?.reviewsCount ??
          selectedItem?.totalReviews ??
          selectedItem?.ratingCount;
        const avg = Number.isFinite(Number(avgRaw))
          ? Math.max(0, Math.min(5, Number(avgRaw)))
          : 0;
        const reviews = Number.isFinite(Number(reviewRaw))
          ? Math.max(0, Math.floor(Number(reviewRaw)))
          : 0;
        const avgDisplay =
          resDetailRating.average > 0 ? resDetailRating.average : avg;
        const reviewsDisplay =
          resDetailRating.reviewCount > 0
            ? resDetailRating.reviewCount
            : reviews;
        const rounded = Math.round(avgDisplay);
        const viewCountRaw =
          selectedItem?.viewCount ?? selectedItem?._count?.views ?? 0;
        const viewsLabel = formatVideoViewsLabel(viewCountRaw);
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.resScrollContent,
              { paddingBottom: Math.max(insets.bottom, 12) + 28 },
            ]}
          >
            <View style={styles.resHeader}>
              <TouchableOpacity
                onPress={handleRestaurantDetailBack}
                style={styles.resBackBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
              >
                <Icon name="chevron-left" size={24} color="#1A1A1A" />
                <Text style={styles.resBackText}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={openHomeMoreFromSelected}
                style={styles.resHeaderMenuBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Icon name="dots-vertical" size={22} color="#444" />
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
                      const targetRole = String(
                        selectedItem?.creatorRole ||
                          selectedItem?.user?.role ||
                          '',
                      ).toLowerCase();
                      if (targetRole === 'user') {
                        navigation.navigate('PromotionScreen', {
                          userId: ownerId,
                        });
                      } else {
                        navigation.navigate('UserViewsScreen', {
                          userId: ownerId,
                        });
                      }
                    }
                  }}
                  disabled={!(selectedItem?.user?.id || selectedItem?.userId)}
                >
                  <View style={styles.resNameRatingRow}>
                    <Text style={styles.resMainTitle}>
                      {selectedItem?.user?.nickname ||
                        selectedItem?.user?.name ||
                        selectedItem?.title ||
                        '—'}
                    </Text>
                    <View style={styles.resMetaRow}>
                      <Icon name="eye-outline" size={15} color="#606060" />
                      <Text style={styles.resViewsText}>{viewsLabel}</Text>
                      {(String(
                        selectedItem?.creatorRole || '',
                      ).toLowerCase() === 'owner' ||
                        String(selectedItem?.user?.role || '').toLowerCase() ===
                          'owner') && (
                        <View style={styles.resRatingRow}>
                          {[1, 2, 3, 4, 5].map(star => (
                            <Icon
                              key={`res-rating-${star}`}
                              name={star <= rounded ? 'star' : 'star-outline'}
                              size={13}
                              color={star <= rounded ? '#FFE082' : '#C7C7C7'}
                            />
                          ))}
                          <Text style={styles.resRatingText}>
                            ({reviewsDisplay}{' '}
                            {reviewsDisplay === 1 ? 'review' : 'reviews'})
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
              {(selectedItem?.creatorRole === 'owner' ||
                selectedItem?.user?.role === 'owner' ||
                selectedItem?.userId ||
                selectedItem?.user?.id) && (
                <View style={styles.resOrderBtnWrap}>
                  {!user?.token ? (
                    <TouchableOpacity
                      style={styles.resOrderBtn}
                      onPress={() => {
                        const ownerId =
                          selectedItem?.user?.id ??
                          selectedItem?.userId ??
                          null;
                        navigation.navigate('HomeSevenScreen', {
                          returnToOrder: true,
                          ownerUserId: ownerId,
                        });
                      }}
                    >
                      <Text style={styles.resOrderText}>Order Now</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.resOrderBtn}
                      onPress={() => {
                        const ownerId =
                          selectedItem?.user?.id ??
                          selectedItem?.userId ??
                          null;
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
                            searchKeyword: String(searchDebounced || '').trim(),
                          });
                        } else {
                          navigation.navigate('HomeThreeScreen');
                        }
                      }}
                    >
                      <Text style={styles.resOrderText}>Order Now</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
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
                    repeat
                    ignoreSilentSwitch="ignore"
                    controls={false}
                    playInBackground={false}
                    playWhenInactive={false}
                    onLoadStart={() => setVideoLoading(true)}
                    onLoad={data => {
                      setVideoLoading(false);
                      setVideoError(null);
                      const dur = data?.duration || 0;
                      setResVideoProgress(p => ({ ...p, duration: dur }));
                      setVideoPaused(false);
                    }}
                    onProgress={data => {
                      if (resSeekingRef.current) return;
                      const now = Date.now();
                      if (now - resProgressUpdateRef.current < 500) return;
                      resProgressUpdateRef.current = now;
                      setResVideoProgress(p => ({
                        currentTime: data?.currentTime ?? p.currentTime,
                        duration:
                          data?.seekableDuration ||
                          data?.duration ||
                          p.duration,
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

            <View style={styles.resActionsRowWrap}>
              <TouchableOpacity
                style={styles.resActionItem}
                onPress={handleRestaurantLike}
                activeOpacity={0.7}
              >
                <Icon
                  name={selectedItem?.isLiked ? 'thumb-up' : 'thumb-up-outline'}
                  size={21}
                  color="#333"
                />
                <Text style={styles.resActionText}>
                  {formatCount(selectedItem?.likeCount ?? 0)}
                </Text>
              </TouchableOpacity>

              {/* <TouchableOpacity
                style={styles.resActionItem}
                onPress={handleRestaurantDislike}
                activeOpacity={0.7}
              >
                <Icon
                  name={
                    selectedItem?.isDisliked
                      ? 'thumb-down'
                      : 'thumb-down-outline'
                  }
                  size={21}
                  color="#333"
                />
                <Text style={styles.resActionText}>
                  {formatCount(selectedItem?.dislikeCount ?? 0)}
                </Text>
              </TouchableOpacity> */}

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
                <Icon name="comment-text-outline" size={21} color="#333" />
                <Text style={styles.resActionText}>
                  {formatCount(selectedItem?.commentCount ?? 0)}
                </Text>
              </TouchableOpacity>

              {/* <TouchableOpacity
                style={styles.resActionItem}
                onPress={handleRestaurantChat}
                activeOpacity={0.7}
              >
                <Icon name="chat-outline" size={21} color="#333" />
                <Text style={styles.resActionText}>Chat</Text>
              </TouchableOpacity> */}
              <TouchableOpacity
                style={styles.resActionItem}
                onPress={handleRestaurantDownload}
                activeOpacity={0.7}
              >
                <Icon name="download-outline" size={21} color="#333" />
                <Text style={styles.resActionText}>Download</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resActionItem}
                onPress={handleRestaurantShare}
                activeOpacity={0.7}
              >
                <Icon name="share-outline" size={21} color="#333" />
                <Text style={styles.resActionText}>Share</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.resActionItem}
                onPress={handleRestaurantSave}
                activeOpacity={0.7}
              >
                <Icon name="bookmark-outline" size={21} color="#333" />
                <Text style={styles.resActionText}>Save</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.resSocialRow}>
              {/* <View style={styles.resIconGroup}>
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
          </View> */}
              <View style={styles.resBookGalleryRow}>
                <TouchableOpacity
                  style={[styles.resRowBtn, styles.resRowBtnPrimary]}
                  activeOpacity={0.85}
                >
                  <Text style={styles.resRowBtnTextLight}>Book Now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.resRowBtn, styles.resRowBtnDark]}
                  onPress={openGalleryModal}
                  activeOpacity={0.85}
                >
                  <Text style={styles.resRowBtnTextLight}>Gallery</Text>
                </TouchableOpacity>
                {showSubscribeBtn ? (
                  <TouchableOpacity
                    style={[
                      styles.resRowBtn,
                      resDetailSubscribe.isSubscribed
                        ? styles.resRowBtnSubscribed
                        : styles.resRowBtnSubscribeOutline,
                    ]}
                    onPress={handleRestaurantSubscribe}
                    activeOpacity={0.85}
                    disabled={
                      resDetailSubscribe.loading || resDetailSubscribe.toggling
                    }
                  >
                    {resDetailSubscribe.loading ||
                    resDetailSubscribe.toggling ? (
                      <ActivityIndicator
                        size="small"
                        color={
                          resDetailSubscribe.isSubscribed ? '#555' : '#F5A623'
                        }
                      />
                    ) : (
                      <Text
                        style={
                          resDetailSubscribe.isSubscribed
                            ? styles.resRowBtnTextMuted
                            : styles.resRowBtnTextOrange
                        }
                      >
                        {resDetailSubscribe.isSubscribed
                          ? 'Subscribed'
                          : 'Subscribe'}
                      </Text>
                    )}
                  </TouchableOpacity>
                ) : null}
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

            <View style={styles.resGlassCard}>
              <View style={styles.descContainer}>
                <Text style={styles.sectionTitle}>Description</Text>
                <Text style={styles.descText}>
                  {selectedItem?._campaignVideoDetail
                    ? selectedItem?.description &&
                      String(selectedItem.description).trim()
                      ? String(selectedItem.description).trim()
                      : 'No description.'
                    : selectedItem?.description ||
                      selectedItem?.user?.channelAbout ||
                      'No description.'}
                </Text>
              </View>
            </View>

            <View style={styles.resGlassCard}>
              <View style={styles.contactContainer}>
                <Text style={styles.contactSectionLabel}>Contact</Text>
                <View style={styles.contactRow}>
                  <Icon name="phone-outline" size={18} color="#888" />
                  <Text style={styles.contactRowText}>
                    {selectedItem?.user?.phone || '—'}
                  </Text>
                </View>
                <View style={styles.contactRow}>
                  <Icon name="email-outline" size={18} color="#888" />
                  <Text style={styles.contactRowText} numberOfLines={2}>
                    {selectedItem?.user?.email || '—'}
                  </Text>
                </View>
                <View style={styles.contactDivider} />
                <View style={[styles.contactRow, styles.contactRowLast]}>
                  <Icon name="map-marker-outline" size={18} color="#888" />
                  <Text style={styles.contactRowText}>
                    {selectedItem?.location ||
                      selectedItem?.creatorAddress ||
                      selectedItem?.user?.address ||
                      '—'}
                  </Text>
                </View>
                {selectedItem?.creatorLatitude != null &&
                selectedItem?.creatorLongitude != null &&
                Number.isFinite(Number(selectedItem.creatorLatitude)) &&
                Number.isFinite(Number(selectedItem.creatorLongitude)) ? (
                  <TouchableOpacity
                    onPress={() =>
                      Linking.openURL(
                        `https://www.google.com/maps?q=${Number(
                          selectedItem.creatorLatitude,
                        )},${Number(selectedItem.creatorLongitude)}`,
                      )
                    }
                    activeOpacity={0.85}
                    style={styles.contactMapRow}
                  >
                    <Icon name="map-search-outline" size={18} color="#1565C0" />
                    <Text style={styles.contactMapLink}>
                      Open in Maps ·{' '}
                      {Number(selectedItem.creatorLatitude).toFixed(5)},{' '}
                      {Number(selectedItem.creatorLongitude).toFixed(5)}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </ScrollView>
        );
      })()}
    </View>
  );

  const barStyle = isRestaurantDetail
    ? 'dark-content'
    : isVideoDetail
    ? 'light-content'
    : 'light-content';

  const statusBarBg = isRestaurantDetail
    ? '#FFFFFF'
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

const FoodCard = ({
  title,
  location,
  isSponsored,
  img,
  onPress,
  views,
  distanceLabel,
}) => (
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
        <Text style={styles.cardTitle}>
          {title.length > 30 ? `${title.substring(0, 30)}...` : title}
        </Text>
        <Text
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{ width: 150, color: '#666', fontSize: 11 }}
        >
          {location}
        </Text>
      </View>
      <View style={styles.cardStats}>
        <Text style={styles.statSmall}>{views || '—'}</Text>
        <Text style={styles.statSmall}>{distanceLabel || '—'}</Text>
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
  featuredPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
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
    position: 'relative',
  },
  locationTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  homeDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  locationOrderBtn: {
    backgroundColor: '#FFF',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  locationOrderBtnText: {
    color: '#F5A623',
    fontWeight: '700',
    fontSize: 12,
  },
  homeLocationTextCol: {
    flex: 1,
    marginHorizontal: 10,
    minWidth: 0,
  },
  homeText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  addressSubtext: {
    color: '#FFF',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 2,
    marginBottom: 15,
    fontWeight: '400',
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
    fontSize: 14,
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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  viewMoreText: {
    color: '#D78500',
    fontSize: 13,
    fontWeight: '700',
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
  tryNewRow: { paddingBottom: 8, paddingRight: 6 },
  tryNewCard: {
    width: width * 0.46,
    marginRight: 10,
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
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  cardLocRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  cardLocText: { color: '#666', fontSize: 13, marginLeft: 5 },
  cardStats: { alignItems: 'flex-end' },
  statSmall: { fontSize: 11, color: '#999' },

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
  resContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    position: 'relative',
  },
  resScrollContent: {
    flexGrow: 1,
  },
  resHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 12,
  },
  resBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    minHeight: 44,
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
    }),
  },
  resBackText: {
    color: '#1A1A1A',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 2,
  },
  resHeaderMenuBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  resMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
    flexWrap: 'wrap',
  },
  resNameRatingRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 0,
    paddingRight: 4,
  },
  resMainTitle: { fontSize: 22, fontWeight: '700', color: '#111' },
  resRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  resRatingText: {
    marginLeft: 4,
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  resViewsText: {
    fontSize: 13,
    color: '#606060',
    fontWeight: '500',
  },
  resOrderBtnWrap: {
    flexShrink: 0,
    justifyContent: 'center',
  },
  resOrderBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 118,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      android: { elevation: 2 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
    }),
  },
  resOrderText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 0.2,
  },
  resVideoCard: {
    marginHorizontal: 16,
    height: 220,
    position: 'relative',
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#000',
    ...Platform.select({
      android: { elevation: 4 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
      },
    }),
  },
  resVideoImg: { width: '100%', height: '100%', borderRadius: 16 },
  resVideoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
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
    borderRadius: 16,
  },
  resProgressBarContainer: {
    position: 'absolute',
    left: 12,
    right: 12,
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
    flexDirection: 'column',
    paddingHorizontal: 16,
    alignItems: 'stretch',
  },
  resIconGroup: { flexDirection: 'row', flexWrap: 'wrap', width: '60%' },
  socialIconWrap: { marginRight: 15, marginBottom: 10 },
  socialIcon: {},
  resBookGalleryRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 12,
    gap: 8,
  },
  resRowBtn: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 6,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  resRowBtnPrimary: { backgroundColor: '#F5A623' },
  resRowBtnDark: { backgroundColor: '#222' },
  resRowBtnSubscribeOutline: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#F5A623',
  },
  resRowBtnSubscribed: {
    backgroundColor: '#E8E8E8',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  resRowBtnTextLight: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  resRowBtnTextOrange: {
    color: '#F5A623',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  resRowBtnTextMuted: {
    color: '#555',
    fontWeight: '700',
    fontSize: 13,
    textAlign: 'center',
  },
  bookNowBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 10,
  },
  bookNowText: { color: '#FFF', fontWeight: 'bold' },
  galleryBtn: {
    backgroundColor: '#222',
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 20,
  },
  galleryText: { color: '#FFF', fontWeight: 'bold', textAlign: 'center' },
  webText: {
    paddingHorizontal: 15,
    color: '#666',
    fontSize: 13,
    marginBottom: 20,
  },
  resActionsRowWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 14,
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    borderRadius: 0,
    marginHorizontal: 16,
    ...Platform.select({
      android: { elevation: 0 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
    }),
  },
  resActionItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
    minWidth: 44,
  },
  resActionText: {
    marginTop: 4,
    fontSize: 11,
    color: '#4B5563',
    fontWeight: '600',
  },
  resGlassCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#ECEDEF',
    borderRadius: 14,
    borderWidth: 0,
    borderColor: 'transparent',
    ...Platform.select({
      android: { elevation: 0 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0,
        shadowRadius: 0,
      },
    }),
  },
  descContainer: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },
  descText: { fontSize: 14, color: '#4B5563', lineHeight: 20, marginTop: 1 },
  contactContainer: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
  },
  contactSectionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    gap: 10,
  },
  contactDivider: {
    height: 1,
    backgroundColor: 'rgba(148,163,184,0.24)',
    marginTop: 1,
    marginBottom: 8,
  },
  contactRowLast: {
    marginBottom: 0,
  },
  contactRowText: {
    flex: 1,
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  contactMapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  contactEmail: { color: '#555', marginTop: 5 },
  contactAddr: { color: '#555', marginTop: 5 },
  contactMapLink: {
    flex: 1,
    color: '#1565C0',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
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
