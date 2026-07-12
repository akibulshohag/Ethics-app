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
import LinearGradient from 'react-native-linear-gradient';
import Slider from '@react-native-community/slider';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector, useDispatch } from 'react-redux';
import { fetchDiscoveryData } from '../redux/actions/discoverySlice';
import {
  setHomeFeedCache,
  isHomeFeedCacheFresh,
} from '../redux/actions/homeFeedSlice';
import { buildDiscoveryCacheKey } from '../utils/discoveryCacheKey';
import { filterBlockedContent } from '../utils/filterBlockedContent';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  getCurrentPositionSafe,
  reverseGeocode,
  geocodeAddress,
  getPlaceSuggestions,
  getCoordsFromPlaceId,
  getFallbackCoordsForUKArea,
} from '../utils/geolocation';
import { appSetUser, setBrowseLocation } from '../redux/actions/appSlice';
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
  deleteVideo,
} from '../services/videoService';
import { shortsService } from '../services/shortsService';
import {
  getGallery,
  getChannelProfile,
  subscribeToChannel,
  unsubscribeFromChannel,
} from '../services/channelService';
import {
  saveLastLocationToBackend,
  persistBrowseLocation,
  normalizeBrowseLocation,
  loadStoredBrowseLocation,
  resolveProfileBrowseLocation,
} from '../services/userLocationService';
import {
  browseAreaLabel,
  UK_DEFAULT_RADIUS_KM,
  extractUkPostcodeFromText,
} from '../utils/ukPostcode';
import MapLocationPicker from '../components/MapLocationPicker';
import RestaurantBookingModal from '../components/RestaurantBookingModal';
import logo from '../assets/logo.png';
import { HEADER_LOGO_STYLE } from '../constants/headerLogo';
import { cuisineImageUriFromKey } from '../constants/cuisineCategoryImages';
import {
  buildDiscoveryCategoriesFromMenuCaches,
  buildMenuCuisineTags,
  ownerMenuMatchesCuisineFilter,
  resolveDiscoveryCategoryFromFilter,
  resolveCategoryChipNavigation,
} from '../constants/menuDiscoveryCategories';
import { buildHomeMenuCategoryChips } from '../constants/homeMenuCategories';

const FEATURED_CUISINE_CHIP_ORDER = [
  'bangladeshi',
  'indian',
  'wok',
  'biryani',
  'pizza',
  'burger',
  'chinese',
  'thai',
];
import DiscoveryTrendingCard from '../components/DiscoveryTrendingCard';
import { browseRestaurantsByCategory } from '../services/menuBrowseService';
import { openDiscoveryMedia } from '../utils/openDiscoveryMedia';
import spicePromoBg from '../assets/img/spice.png';
import { resolveVideoPosterUri, safeImageUri } from '../utils/helper';
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
import { shouldShowOrderBookButtons } from '../utils/contentVisibility';
import { getTopRestaurantsByOrders } from '../services/orderService';
import { getMenuByUserId } from '../services/menuService';
import {
  buildShortLocationFromUser,
  formatShortProfileLocationLine,
  formatCityCountryPostcodeLine,
  abbrevCountryLabel,
} from '../utils/locationFormat';
import {
  distanceKmBetween,
  formatDistanceKm,
  resolveViewerLocationOpts,
  getOwnerLatLngFromMediaPayload,
} from '../utils/geoDistance';
import NotificationBellButton from '../components/NotificationBellButton';
import NotificationsBottomSheet from '../components/NotificationsBottomSheet';
import { useNotifications } from '../hooks/useNotifications';

const { width, height } = Dimensions.get('window');
const FEED_HORIZONTAL_PAD = 15;
const SHORT_CAROUSEL_GAP = 8;
/** ~3 full cards + half peek (home feed layout) */
const SHORT_CAROUSEL_CARD_WIDTH =
  (width - FEED_HORIZONTAL_PAD * 2 - SHORT_CAROUSEL_GAP * 3) / 3.5;
const SHORT_CAROUSEL_CARD_HEIGHT = Math.round(SHORT_CAROUSEL_CARD_WIDTH * 1.42);
const FEATURED_HERO_HEIGHT = Math.round(
  (width - FEED_HORIZONTAL_PAD * 2) * 0.5,
);
const TRENDING_CARD_IMAGE_HEIGHT = Math.round(
  (width - FEED_HORIZONTAL_PAD * 2) * 0.42,
);

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
const HOME_PROMO_RADIUS_KM = 50;

/**
 * Home banner: one featured row. Prefer the campaign tied to the logged-in user
 * (owner userId on the featured row). If several match, use the first in API order.
 * Owners with no matching campaign see none; other roles / guests see the first global.
 */
const campaignLatLng = item => {
  const fromCampaign = {
    lat: Number(item?.latitude),
    lng: Number(item?.longitude),
  };
  if (Number.isFinite(fromCampaign.lat) && Number.isFinite(fromCampaign.lng)) {
    return fromCampaign;
  }
  const v = item?.video || {};
  const fromVideo = {
    lat: Number(
      v?.creatorLatitude ?? v?.latitude ?? v?.user?.latitude ?? v?.user?.lat,
    ),
    lng: Number(
      v?.creatorLongitude ?? v?.longitude ?? v?.user?.longitude ?? v?.user?.lng,
    ),
  };
  if (Number.isFinite(fromVideo.lat) && Number.isFinite(fromVideo.lng)) {
    return fromVideo;
  }
  return { lat: null, lng: null };
};

const hasRenderableCampaignPayload = campaign => {
  if (!campaign || typeof campaign !== 'object') return false;
  const v = campaign?.video;
  if (!v || typeof v !== 'object') return false;
  const media = String(v?.videoUrl || v?.thumbnailUrl || '').trim();
  if (!media) return false;
  const ownerName = String(
    campaign?.user?.nickname ||
      campaign?.user?.name ||
      v?.user?.nickname ||
      v?.user?.name ||
      '',
  )
    .trim()
    .toLowerCase();
  if (!ownerName || ownerName === 'unknown' || ownerName === 'restaurant') {
    return false;
  }
  return true;
};

const pickNearestCampaign = (
  list,
  viewerOpts,
  maxRadiusKm = HOME_PROMO_RADIUS_KM,
) => {
  if (!Array.isArray(list) || list.length === 0) return null;
  const withVideo = list.filter(item => hasRenderableCampaignPayload(item));
  if (withVideo.length === 0) return null;
  const viewerLat = Number(viewerOpts?.viewerLat);
  const viewerLng = Number(viewerOpts?.viewerLng);
  if (!Number.isFinite(viewerLat) || !Number.isFinite(viewerLng)) return null;
  let best = null;
  let bestKm = Number.POSITIVE_INFINITY;
  for (const item of withVideo) {
    const { lat, lng } = campaignLatLng(item);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    const km = distanceKmBetween(viewerLat, viewerLng, lat, lng);
    if (km != null && km < bestKm) {
      bestKm = km;
      best = item;
    }
  }
  if (!best) return null;
  if (Number.isFinite(maxRadiusKm) && bestKm > Number(maxRadiusKm)) return null;
  return best;
};

const pickHomeFeatured = (list, viewerUser, viewerOpts) => {
  if (!Array.isArray(list) || list.length === 0) return null;
  const withVideo = list.filter(item => hasRenderableCampaignPayload(item));
  if (withVideo.length === 0) return null;
  const vid = viewerUser?.id != null ? String(viewerUser.id) : null;
  const role = String(viewerUser?.role || '').toLowerCase();
  const isOwner = role === 'owner';

  if (vid) {
    const mine = withVideo.filter(f => {
      const ownerId = f?.userId ?? f?.user?.id;
      return ownerId != null && String(ownerId) === vid;
    });
    if (mine.length > 0) return pickNearestCampaign(mine, viewerOpts);
    if (isOwner) return null;
  }
  return pickNearestCampaign(withVideo, viewerOpts);
};

// Same shape as VideoDetailsScreen currentVideo so selectedItem has all fields
const mapToDisplayItem = (v, type, viewerOpts) => {
  const u = v.user || {};
  const pickNumeric = (...vals) => {
    for (const val of vals) {
      const n = Number(val);
      if (Number.isFinite(n)) return n;
    }
    return null;
  };
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
  const rating = pickNumeric(
    u?.averageRating,
    u?.average_rating,
    u?.ratingAverage,
    u?.rating_average,
    u?.ratingAvg,
    u?.rating_avg,
    u?.avgRating,
    u?.avg_rating,
    u?.rating,
    u?.stars,
    v?.averageRating,
    v?.average_rating,
    v?.ratingAverage,
    v?.rating_average,
    v?.ratingAvg,
    v?.rating_avg,
    v?.avgRating,
    v?.avg_rating,
    v?.rating,
    v?.stars,
  );
  const reviewCount = pickNumeric(
    u?.reviewCount,
    u?.review_count,
    u?.reviewsCount,
    u?.reviews_count,
    u?.totalReviews,
    u?.total_reviews,
    u?.ratingCount,
    u?.rating_count,
    u?._count?.reviews,
    u?._count?.ratings,
    v?.reviewCount,
    v?.review_count,
    v?.reviewsCount,
    v?.reviews_count,
    v?.totalReviews,
    v?.total_reviews,
    v?.ratingCount,
    v?.rating_count,
    v?._count?.reviews,
    v?._count?.ratings,
  );

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
    img: resolveVideoPosterUri(
      v.thumbnailUrl,
      v.coverUrl,
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
    ),
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
    rating: rating != null ? Math.max(0, Math.min(5, rating)) : 0,
    reviewCount: reviewCount != null ? Math.max(0, Math.floor(reviewCount)) : 0,
    likeCount: v.likeCount ?? v._count?.likes ?? 0,
    dislikeCount: v.dislikeCount ?? v._count?.dislikes ?? 0,
    commentCount: v.commentCount ?? v._count?.comments ?? 0,
    shareCount: v.shareCount ?? 0,
    isLiked: v.isLiked ?? false,
    creatorAddress: u.address ?? undefined,
    creatorLatitude: olat ?? undefined,
    creatorLongitude: olng ?? undefined,
    creatorSocialLinks: Array.isArray(u.socialLinks) ? u.socialLinks : [],
    scheduledPublishAt: v.scheduledPublishAt ?? undefined,
    scheduleAt: v.scheduleAt ?? undefined,
    scheduleDate: v.scheduleDate ?? undefined,
    scheduledAt: v.scheduledAt ?? undefined,
    publishAt: v.publishAt ?? undefined,
    publishedAt: v.publishedAt ?? undefined,
    isScheduled: isFutureScheduledMedia(v),
  };
};

const isFutureScheduledMedia = item => {
  const raw =
    item?.scheduledPublishAt ||
    item?.scheduleAt ||
    item?.scheduleDate ||
    item?.scheduledAt ||
    item?.publishAt ||
    item?.publishedAt ||
    null;
  const d = raw ? new Date(raw) : null;
  return !!(d && Number.isFinite(d.getTime()) && d.getTime() > Date.now());
};

const onlyPublishedNow = item => !isFutureScheduledMedia(item);

const readCuisineText = value => {
  if (value == null) return '';
  if (typeof value === 'string' || typeof value === 'number')
    return String(value);
  if (typeof value === 'object') {
    const candidate =
      value.name ??
      value.label ??
      value.title ??
      value.value ??
      value.tag ??
      value.category ??
      '';
    return typeof candidate === 'string' || typeof candidate === 'number'
      ? String(candidate)
      : '';
  }
  return '';
};
const normalizeCuisine = value =>
  readCuisineText(value).trim().toLowerCase().replace(/\s+/g, ' ');
const isValidCuisineKey = key => {
  const k = normalizeCuisine(key);
  if (!k) return false;
  if (k === '[object object]' || k.includes('object object')) return false;
  return true;
};
const cuisineLabelFromKey = key => {
  const cleaned = normalizeCuisine(key);
  if (!isValidCuisineKey(cleaned)) return '';
  return cleaned
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
};
const cuisineIconFromKey = key => {
  const k = normalizeCuisine(key);
  if (!k) return 'silverware-fork-knife';
  if (k.includes('pizza') || k.includes('italian')) return 'pizza';
  if (k.includes('burger')) return 'hamburger';
  if (k.includes('dessert') || k.includes('sweet')) return 'cupcake';
  if (k.includes('bread') || k.includes('bakery')) return 'bread-slice';
  if (k.includes('coffee') || k.includes('cafe')) return 'coffee';
  if (k.includes('drink') || k.includes('juice')) return 'cup-water';
  if (k.includes('grill') || k.includes('bbq')) return 'grill';
  if (k.includes('seafood') || k.includes('fish')) return 'fish';
  if (k.includes('chicken')) return 'food-drumstick';
  if (k.includes('rice') || k.includes('bangla') || k.includes('indian'))
    return 'rice';
  if (k.includes('chinese') || k.includes('noodle')) return 'noodles';
  return 'silverware-fork-knife';
};
const displayCuisineLabel = label => String(label || '').trim();
const hasRenderablePromoCard = item => {
  if (!item || typeof item !== 'object') return false;
  const media = String(item.videoUrl || item.img || '').trim();
  const name = String(item.channelName || item.title || '').trim();
  const ownerId =
    item?.userId ?? item?.user?.id ?? item?._campaignOwnerUser?.id;
  const hasRemoteMedia = /^https?:\/\//i.test(media);
  const hasMedia =
    !!media &&
    hasRemoteMedia &&
    !media.includes('images.unsplash.com/photo-1568901346375-23c9450c58cd');
  const badName =
    !name ||
    name.toLowerCase() === 'unknown' ||
    name.toLowerCase() === 'untitled' ||
    name.toLowerCase() === 'restaurant' ||
    name.toLowerCase().replace(/[^a-z]/g, '') === 'restaurant';
  const hasName = !badName;
  return hasMedia && hasName && ownerId != null;
};
const normalizePromoName = (...values) => {
  for (const value of values) {
    const raw = String(value || '').trim();
    if (!raw) continue;
    const lower = raw.toLowerCase();
    const alpha = lower.replace(/[^a-z]/g, '');
    if (
      lower === 'unknown' ||
      lower === 'untitled' ||
      lower === 'restaurant' ||
      alpha === 'restaurant'
    ) {
      continue;
    }
    return raw;
  }
  return '';
};

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
  const [bookingModalVisible, setBookingModalVisible] = useState(false);
  const [bookingTarget, setBookingTarget] = useState(null);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryError, setGalleryError] = useState(null);
  const [locationMapVisible, setLocationMapVisible] = useState(false);
  const [addressText, setAddressText] = useState('');
  const [browsePostcode, setBrowsePostcode] = useState('');
  const [homeLocationOverride, setHomeLocationOverride] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const searchDebounceRef = useRef(null);
  const ownerMenuSearchCacheRef = useRef({});
  const ownerCategoryCacheRef = useRef({});
  const cuisineScrollRef = useRef(null);
  const cuisineScrollXRef = useRef(0);
  const cuisineContentWidthRef = useRef(0);
  const cuisineLayoutWidthRef = useRef(0);
  const [featuredVideo, setFeaturedVideo] = useState(null);
  const [sponsoredVideo, setSponsoredVideo] = useState(null);
  const [featuredChannelMeta, setFeaturedChannelMeta] = useState(null);
  /** Same source as restaurant detail: GET channel-profile (sponsored list omits rating + subscribe). */
  const [sponsoredChannelMeta, setSponsoredChannelMeta] = useState(null);
  /** Per channel owner — detail / sponsored banner */
  const [channelSubscribeByOwnerId, setChannelSubscribeByOwnerId] = useState(
    {},
  );
  /** Per trending video card — same channel can appear on multiple cards */
  const [trendingSubscribeByVideoId, setTrendingSubscribeByVideoId] = useState(
    {},
  );
  const [subscribeTogglingVideoId, setSubscribeTogglingVideoId] =
    useState(null);
  /** Owners the user toggled on Trending — skip bulk hydrate for their cards */
  const subscribeTouchedOwnersRef = useRef(new Set());
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [cuisineOptions, setCuisineOptions] = useState([]);
  const [feedVideos, setFeedVideos] = useState([]);
  const [feedShorts, setFeedShorts] = useState([]);
  const [popularShorts, setPopularShorts] = useState([]);
  const [newShorts, setNewShorts] = useState([]);
  const [mostOrderedRestaurants, setMostOrderedRestaurants] = useState([]);
  const [categoryBrowseRows, setCategoryBrowseRows] = useState([]);
  const [categoryBrowseLoading, setCategoryBrowseLoading] = useState(false);
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
  const browseLocation = useSelector(state => state.app?.browseLocation);
  const blockedUserIds = useSelector(state => state.app?.blockedUserIds || []);
  const authUserId = useMemo(
    () =>
      user?.id ?? user?.userId ?? user?._id ?? user?.uid ?? user?.sub ?? null,
    [user],
  );
  const isAuthenticated = !!(user?.token || authUserId);
  const {
    notifications,
    unreadCount,
    loading: notificationsLoading,
    markRead: markNotificationReadLocal,
    markAllRead: markAllNotificationsReadLocal,
  } = useNotifications(isAuthenticated ? authUserId : null);
  const [notificationsVisible, setNotificationsVisible] = useState(false);
  const isCuisineFilterScreen =
    route.name === 'HomeOneCuisineScreen' || !!route.params?.cuisineMode;
  const cuisineFilterKey = String(
    route.params?.discoveryCategoryKey ||
      normalizeCuisine(route.params?.initialCuisine || selectedCuisine) ||
      '',
  ).trim();
  const actorUserId =
    authUserId ??
    user?.id ??
    user?.userId ??
    user?._id ??
    user?.uid ??
    user?.sub ??
    null;
  const userRef = useRef(user);
  userRef.current = user;
  const browseLocationRef = useRef(browseLocation);
  browseLocationRef.current = browseLocation;
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

  const headerLocationLabel = useMemo(() => {
    if (homeLocationOverride) return homeLocationOverride;

    const sessionAddr = String(addressText || '').trim();
    const browseAddr = String(browseLocation?.addressText || '').trim();
    const addr = sessionAddr || browseAddr;
    const pc = String(
      browsePostcode ||
        browseLocation?.postcode ||
        extractUkPostcodeFromText(addr) ||
        '',
    ).trim();
    const formatted = formatCityCountryPostcodeLine({
      addressText: addr,
      postcode: pc,
    });
    if (formatted && formatted !== 'Set your area') return formatted;
    if (browseLocation?.areaLabel) return browseLocation.areaLabel;

    const profileAddr = String(user?.address || '').trim();
    if (profileAddr) {
      const fromProfile = formatCityCountryPostcodeLine({
        address: profileAddr,
        postcode:
          user?.postcode || extractUkPostcodeFromText(profileAddr) || '',
      });
      if (fromProfile && fromProfile !== 'Set your area') return fromProfile;
    }

    return (
      browseAreaLabel({
        postcode: pc,
        addressText: addr,
        areaLabel: browseLocation?.areaLabel || '',
      }) || 'Set your area'
    );
  }, [
    homeLocationOverride,
    addressText,
    browsePostcode,
    browseLocation?.addressText,
    browseLocation?.postcode,
    browseLocation?.areaLabel,
    user?.address,
    user?.postcode,
  ]);

  useEffect(() => {
    if (selectedLocation?.lat != null && selectedLocation?.lng != null) return;
    const lat = browseLocation?.lat != null ? Number(browseLocation.lat) : null;
    const lng = browseLocation?.lng != null ? Number(browseLocation.lng) : null;
    if (
      lat == null ||
      lng == null ||
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      return;
    }
    setSelectedLocation({ lat, lng });
    if (!addressText && browseLocation?.addressText) {
      setAddressText(browseLocation.addressText);
    }
    if (!browsePostcode && browseLocation?.postcode) {
      setBrowsePostcode(browseLocation.postcode);
    }
  }, [
    browseLocation?.lat,
    browseLocation?.lng,
    browseLocation?.addressText,
    browseLocation?.postcode,
    selectedLocation?.lat,
    selectedLocation?.lng,
    addressText,
    browsePostcode,
  ]);

  const homeFeedCache = useSelector(state => state.homeFeed);
  const homeFeedCacheRef = useRef(homeFeedCache);
  homeFeedCacheRef.current = homeFeedCache;
  const displayedCuisineOptions = useMemo(() => {
    if (!Array.isArray(cuisineOptions)) return [];
    const mapped = cuisineOptions
      .map(c => {
        const rawLabel = readCuisineText(c?.label);
        const rawKey = normalizeCuisine(c?.key || rawLabel);
        if (
          !isValidCuisineKey(rawKey) ||
          !rawLabel ||
          rawLabel === '[object Object]'
        ) {
          return null;
        }
        const discovery =
          resolveDiscoveryCategoryFromFilter(rawKey) ||
          resolveDiscoveryCategoryFromFilter(rawLabel);
        const key = discovery?.key || rawKey;
        const label = discovery?.label || rawLabel;
        return {
          ...c,
          key,
          label,
          icon: cuisineIconFromKey(key),
          imageUri: cuisineImageUriFromKey(key),
        };
      })
      .filter(Boolean);

    return mapped.sort((a, b) => {
      const ia = FEATURED_CUISINE_CHIP_ORDER.indexOf(a.key);
      const ib = FEATURED_CUISINE_CHIP_ORDER.indexOf(b.key);
      if (ia !== -1 || ib !== -1) {
        if (ia === -1) return 1;
        if (ib === -1) return -1;
        return ia - ib;
      }
      return String(a.label).localeCompare(String(b.label));
    });
  }, [cuisineOptions]);

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
        scheduledPublishAt: updated?.scheduledPublishAt ?? s.scheduledPublishAt,
        scheduleAt: updated?.scheduleAt ?? s.scheduleAt,
        scheduleDate: updated?.scheduleDate ?? s.scheduleDate,
        scheduledAt: updated?.scheduledAt ?? s.scheduledAt,
        publishedAt: updated?.publishedAt ?? s.publishedAt,
      });
      setFeedShorts(prev =>
        prev
          .map(s => (String(s?.id) === sid ? mergeShort(s) : s))
          .filter(onlyPublishedNow),
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

  const saveLocationSelection = useCallback(
    async (coords, label, postcode = '') => {
      const pc = String(postcode || browsePostcode || '').trim();
      const areaLabel = formatCityCountryPostcodeLine({
        addressText: label || '',
        postcode: pc,
      });
      setHomeLocationOverride(areaLabel);
      setSelectedLocation({ lat: coords.lat, lng: coords.lng });
      if (label) setAddressText(label);
      dispatch(
        setBrowseLocation({
          lat: coords.lat,
          lng: coords.lng,
          postcode: pc,
          addressText: label || '',
          areaLabel,
        }),
      );
      if (pc) setBrowsePostcode(pc);
      await persistBrowseLocation({
        userId: userRef.current?.id,
        lat: coords.lat,
        lng: coords.lng,
        postcode: pc,
        addressText: label || '',
        areaLabel,
      });
    },
    [dispatch, browsePostcode],
  );

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

  /** Bottom tab Home: exit inline video/restaurant detail back to main feed */
  useEffect(() => {
    if (!route.params?.homeTabReset) return;
    libraryDetailReturnRef.current = null;
    setVideoPaused(true);
    setIsRestaurantDetail(false);
    setIsVideoDetail(false);
    navigation.setParams({ homeTabReset: undefined });
  }, [route.params?.homeTabReset, navigation]);

  useFocusEffect(
    React.useCallback(() => {
      const stopPlaybackOnBlur = () => setVideoPaused(true);
      const params = route.params || {};
      const initialCuisineFromParams = readCuisineText(
        params.initialCuisine,
      ).trim();
      if (isCuisineFilterScreen) {
        if (initialCuisineFromParams) {
          setSelectedCuisine(initialCuisineFromParams);
          setSearchQuery(initialCuisineFromParams);
          setSearchDebounced(initialCuisineFromParams);
        }
      } else {
        // Main Home should always start with full default feed.
        setSelectedCuisine('');
      }
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
        if (params.postcode != null) setBrowsePostcode(params.postcode);
        const loc = normalizeBrowseLocation({
          lat: params.selectedLocation.lat,
          lng: params.selectedLocation.lng,
          postcode: params.postcode,
          addressText: params.addressText,
        });
        if (loc) dispatch(setBrowseLocation(loc));
        navigation.setParams({
          selectedLocation: undefined,
          addressText: undefined,
          postcode: undefined,
        });
        return stopPlaybackOnBlur;
      }
      // Restore last home browse area (not profile address) when coords are missing.
      if (selectedLocation?.lat == null && selectedLocation?.lng == null) {
        let cancelled = false;
        const restoreLocation = async () => {
          try {
            const u = userRef.current;

            const fromRedux = normalizeBrowseLocation(browseLocationRef.current);
            if (fromRedux && !cancelled) {
              const areaLabel =
                String(fromRedux.areaLabel || '').trim() ||
                formatCityCountryPostcodeLine({
                  addressText: fromRedux.addressText || '',
                  postcode: fromRedux.postcode || '',
                });
              setSelectedLocation({ lat: fromRedux.lat, lng: fromRedux.lng });
              setAddressText(fromRedux.addressText || '');
              setBrowsePostcode(fromRedux.postcode || '');
              if (areaLabel) setHomeLocationOverride(areaLabel);
              loadFeaturedAndFeed();
              loadContinueWatching();
              return;
            }

            const fromStored = normalizeBrowseLocation(
              await loadStoredBrowseLocation(u?.id),
            );
            if (fromStored && !cancelled) {
              const areaLabel =
                String(fromStored.areaLabel || '').trim() ||
                formatCityCountryPostcodeLine({
                  addressText: fromStored.addressText || '',
                  postcode: fromStored.postcode || '',
                });
              setSelectedLocation({ lat: fromStored.lat, lng: fromStored.lng });
              setAddressText(fromStored.addressText || '');
              setBrowsePostcode(fromStored.postcode || '');
              if (areaLabel) setHomeLocationOverride(areaLabel);
              dispatch(setBrowseLocation(fromStored));
              loadFeaturedAndFeed();
              loadContinueWatching();
              return;
            }

            const profileLoc = await resolveProfileBrowseLocation(u);
            if (profileLoc && !cancelled) {
              const areaLabel =
                String(profileLoc.areaLabel || '').trim() ||
                formatCityCountryPostcodeLine({
                  addressText: profileLoc.addressText || '',
                  postcode: profileLoc.postcode || '',
                });
              setSelectedLocation({ lat: profileLoc.lat, lng: profileLoc.lng });
              setAddressText(profileLoc.addressText || '');
              setBrowsePostcode(profileLoc.postcode || '');
              if (areaLabel) setHomeLocationOverride(areaLabel);
              dispatch(setBrowseLocation(profileLoc));
              loadFeaturedAndFeed();
              loadContinueWatching();
              return;
            }

            if (!cancelled) setLocationModalVisible(true);
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
      isCuisineFilterScreen,
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

  useEffect(() => {
    if (!isCuisineFilterScreen || !cuisineFilterKey) {
      setCategoryBrowseRows([]);
      setCategoryBrowseLoading(false);
      return;
    }
    let cancelled = false;
    setCategoryBrowseLoading(true);
    const voCat = resolveViewerLocationOpts(selectedLocation, user);
    browseRestaurantsByCategory({
      category: cuisineFilterKey,
      limit: 30,
      ...(voCat
        ? {
            nearbyLat: voCat.viewerLat,
            nearbyLng: voCat.viewerLng,
            radiusKm: UK_DEFAULT_RADIUS_KM,
          }
        : {}),
    })
      .then(res => {
        if (cancelled) return;
        setCategoryBrowseRows(
          Array.isArray(res?.restaurants) ? res.restaurants : [],
        );
      })
      .catch(() => {
        if (!cancelled) setCategoryBrowseRows([]);
      })
      .finally(() => {
        if (!cancelled) setCategoryBrowseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isCuisineFilterScreen, cuisineFilterKey, selectedLocation, user]);

  const withoutBlocked = useCallback(
    items => filterBlockedContent(items, blockedUserIds),
    [blockedUserIds],
  );

  useEffect(() => {
    setFeedVideos(prev => withoutBlocked(prev));
    setFeedShorts(prev => withoutBlocked(prev));
    setPopularShorts(prev => withoutBlocked(prev));
    setNewShorts(prev => withoutBlocked(prev));
  }, [withoutBlocked]);

  const loadFeaturedAndFeed = useCallback(async () => {
    const voBrowse = resolveViewerLocationOpts(selectedLocation, user);
    if (!voBrowse) return;
    const dropBlocked = items => filterBlockedContent(items, blockedUserIds);
    const feedCacheKey = buildDiscoveryCacheKey(voBrowse, user?.id);
    const searchTermEarly = searchDebounced?.trim() || undefined;
    const cached = homeFeedCacheRef.current;
    const hasHomeCacheData =
      cached.cacheKey === feedCacheKey &&
      (cached.feedVideos?.length > 0 ||
        cached.feedShorts?.length > 0 ||
        cached.popularShorts?.length > 0);
    const homeCacheFresh =
      !searchTermEarly &&
      hasHomeCacheData &&
      isHomeFeedCacheFresh(cached.fetchedAt, cached.cacheKey, feedCacheKey);

    if (!searchTermEarly && hasHomeCacheData) {
      const cachedFeedVideos = (cached.feedVideos || []).filter(
        onlyPublishedNow,
      );
      const cachedFeedShorts = (cached.feedShorts || []).filter(
        onlyPublishedNow,
      );
      const cachedPopularShorts = (cached.popularShorts || []).filter(
        onlyPublishedNow,
      );
      const cachedNewShorts = (cached.newShorts || []).filter(onlyPublishedNow);
      setFeaturedVideo(
        cached.featuredVideo && !isFutureScheduledMedia(cached.featuredVideo)
          ? cached.featuredVideo
          : null,
      );
      setSponsoredVideo(
        cached.sponsoredVideo && !isFutureScheduledMedia(cached.sponsoredVideo)
          ? cached.sponsoredVideo
          : null,
      );
      setFeedVideos(dropBlocked(cachedFeedVideos));
      setFeedShorts(dropBlocked(cachedFeedShorts));
      setPopularShorts(dropBlocked(cachedPopularShorts));
      setNewShorts(dropBlocked(cachedNewShorts));
      setMostOrderedRestaurants(cached.mostOrderedRestaurants || []);
      setCuisineOptions(cached.cuisineOptions || []);
      setFeedLoading(false);
      dispatch(
        fetchDiscoveryData({
          currentUserId: user?.id || null,
          cacheKey: feedCacheKey,
          locationOpts: voBrowse,
          force: false,
        }),
      );
      if (homeCacheFresh) {
        return;
      }
    }

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
      radiusKm: UK_DEFAULT_RADIUS_KM,
      excludeSponsored: true,
      excludeFeatured: true,
    };
    const shortParams = {
      ...baseParams,
      viewerUserId: user?.id,
      nearbyLat: lat,
      nearbyLng: lng,
      radiusKm: UK_DEFAULT_RADIUS_KM,
    };

    try {
      const [
        featuredRes,
        sponsoredRes,
        videosRes,
        shortsRes,
        popularShortsRes,
        newestShortsRes,
        topRes,
      ] = await Promise.all([
        getFeatured().catch(() => ({ featured: [] })),
        getSponsored().catch(() => ({ sponsored: [] })),
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
        getTopRestaurantsByOrders({
          page: 1,
          limit: 100,
          nearbyLat: lat,
          nearbyLng: lng,
          radiusKm: UK_DEFAULT_RADIUS_KM,
        }).catch(() => ({
          restaurants: [],
        })),
      ]);
      const pickedFeatured = pickHomeFeatured(
        featuredRes?.featured,
        user,
        voBrowse,
      );
      const pickedSponsored = pickNearestCampaign(
        sponsoredRes?.sponsored,
        voBrowse,
      );
      setFeaturedVideo(
        pickedFeatured && !isFutureScheduledMedia(pickedFeatured)
          ? pickedFeatured
          : null,
      );
      setSponsoredVideo(
        pickedSponsored && !isFutureScheduledMedia(pickedSponsored)
          ? pickedSponsored
          : null,
      );
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
      const topRestaurantOwnerIds = (topRes?.restaurants || [])
        .map(r => r?.id)
        .filter(Boolean)
        .map(String);
      const promoOwnerIds = [pickedFeatured, pickedSponsored]
        .map(
          item =>
            item?.userId ??
            item?.user?.id ??
            item?.video?.userId ??
            item?.video?.user?.id,
        )
        .filter(Boolean)
        .map(String);
      const allOwnerIdsForMenus = Array.from(
        new Set([
          ...uniqueOwnerIds,
          ...topRestaurantOwnerIds,
          ...promoOwnerIds,
        ]),
      );
      if (allOwnerIdsForMenus.length > 0) {
        await Promise.allSettled(
          allOwnerIdsForMenus.map(async oid => {
            try {
              const res = await getMenuByUserId(oid);
              const rows = Array.isArray(res?.menu)
                ? res.menu.map(m => ({
                    id: m?.id,
                    itemName: String(m?.itemName || '').trim(),
                    description: String(m?.description || '').trim(),
                    categoryName: readCuisineText(
                      m?.category?.name ?? m?.categoryName ?? m?.category,
                    ).trim(),
                    tags: Array.isArray(m?.tags) ? m.tags : [],
                  }))
                : [];
              const categories = Array.isArray(res?.categories)
                ? res.categories
                    .map(c =>
                      readCuisineText(
                        c?.name ?? c?.label ?? c?.title ?? c,
                      ).trim(),
                    )
                    .filter(Boolean)
                : [];
              ownerMenuSearchCacheRef.current[oid] = rows;
              ownerCategoryCacheRef.current[oid] = categories;
            } catch (_) {
              ownerMenuSearchCacheRef.current[oid] = [];
              ownerCategoryCacheRef.current[oid] = [];
            }
          }),
        );
      }
      const menuCacheSnapshot = {};
      allOwnerIdsForMenus.forEach(oid => {
        menuCacheSnapshot[oid] =
          ownerMenuSearchCacheRef.current[String(oid)] || [];
      });
      const discoveryOptions =
        buildDiscoveryCategoriesFromMenuCaches(menuCacheSnapshot);
      const discoveryKeys = new Set(discoveryOptions.map(o => o.key));
      const rawCuisineSet = new Set();
      allOwnerIdsForMenus.forEach(oid => {
        const rows = ownerMenuSearchCacheRef.current[String(oid)] || [];
        const categories = ownerCategoryCacheRef.current[String(oid)] || [];
        categories.forEach(cat => {
          const c = normalizeCuisine(cat);
          if (!isValidCuisineKey(c)) return;
          if (!discoveryKeys.has(c) && !resolveDiscoveryCategoryFromFilter(c)) {
            rawCuisineSet.add(c);
          }
        });
        rows.forEach(m => {
          const c = normalizeCuisine(m?.categoryName);
          if (!isValidCuisineKey(c)) return;
          if (!discoveryKeys.has(c) && !resolveDiscoveryCategoryFromFilter(c)) {
            rawCuisineSet.add(c);
          }
        });
      });
      const rawOptions = Array.from(rawCuisineSet)
        .map(key => ({
          key,
          label: cuisineLabelFromKey(key) || 'Menu',
          icon: cuisineIconFromKey(key),
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
      const dynamicOptions = [...discoveryOptions, ...rawOptions];
      setCuisineOptions(dynamicOptions);
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
          _menuTagsLower: buildMenuCuisineTags(
            menuRows,
            ownerCategoryCacheRef.current[String(ownerId)] || [],
          ),
          _matchedMenuItems: matchedMenuItems,
          _menuSearchKeyword: q,
        };
      };
      const mappedVideosWithMenu = mappedVideos
        .filter(onlyPublishedNow)
        .map(withMenuSearchMeta);
      const mappedShortsWithMenu = mappedShorts
        .filter(onlyPublishedNow)
        .map(withMenuSearchMeta);
      const mappedPopularShortsWithMenu = mappedPopularShorts
        .filter(onlyPublishedNow)
        .map(withMenuSearchMeta);
      const mappedNewestShortsWithMenu = mappedNewestShorts
        .filter(onlyPublishedNow)
        .map(withMenuSearchMeta);
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
      setFeedVideos(dropBlocked(mappedVideosWithMenu.filter(matchesSearch)));
      setFeedShorts(dropBlocked(mappedShortsWithMenu.filter(matchesSearch)));
      setPopularShorts(
        dropBlocked(mappedPopularShortsWithMenu.filter(matchesSearch)),
      );
      setNewShorts(dropBlocked(mappedNewestShortsWithMenu.filter(matchesSearch)));
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
          _menuTagsLower: buildMenuCuisineTags(
            ownerMenuSearchCacheRef.current[String(r?.id)] || [],
            ownerCategoryCacheRef.current[String(r?.id)] || [],
          ),
        };
      });
      setMostOrderedRestaurants(topRestaurants);
      dispatch(
        setHomeFeedCache({
          cacheKey: feedCacheKey,
          feedVideos: mappedVideosWithMenu.filter(matchesSearch),
          feedShorts: mappedShortsWithMenu.filter(matchesSearch),
          popularShorts: mappedPopularShortsWithMenu.filter(matchesSearch),
          newShorts: mappedNewestShortsWithMenu.filter(matchesSearch),
          mostOrderedRestaurants: topRestaurants,
          cuisineOptions: dynamicOptions,
          featuredVideo: pickedFeatured,
          sponsoredVideo: pickedSponsored,
        }),
      );
      dispatch(
        fetchDiscoveryData({
          currentUserId: user?.id || null,
          cacheKey: feedCacheKey,
          locationOpts: voBrowse,
          force: false,
        }),
      );
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
  }, [selectedLocation, user, searchDebounced, dispatch, blockedUserIds]);

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

  const lastBrowseSyncRef = useRef(Number(browseLocation?.updatedAt || 0));

  const applyBrowseLocationToSession = useCallback(loc => {
    if (!loc || loc.lat == null || loc.lng == null) return false;
    const lat = Number(loc.lat);
    const lng = Number(loc.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    const areaLabel =
      String(loc.areaLabel || '').trim() ||
      formatCityCountryPostcodeLine({
        addressText: loc.addressText || '',
        postcode: loc.postcode || '',
      });
    setSelectedLocation({ lat, lng });
    if (loc.addressText) setAddressText(String(loc.addressText));
    if (loc.postcode) setBrowsePostcode(String(loc.postcode));
    if (areaLabel) setHomeLocationOverride(areaLabel);
    return true;
  }, []);

  useEffect(() => {
    const updatedAt = Number(browseLocation?.updatedAt || 0);
    if (!updatedAt || updatedAt <= lastBrowseSyncRef.current) return;
    if (browseLocation?.lat == null || browseLocation?.lng == null) return;
    lastBrowseSyncRef.current = updatedAt;
    if (applyBrowseLocationToSession(browseLocation)) {
      loadFeaturedAndFeed();
      loadContinueWatching();
    }
  }, [
    browseLocation?.updatedAt,
    browseLocation?.lat,
    browseLocation?.lng,
    browseLocation?.addressText,
    browseLocation?.postcode,
    browseLocation?.areaLabel,
    applyBrowseLocationToSession,
    loadFeaturedAndFeed,
    loadContinueWatching,
  ]);

  useFocusEffect(
    useCallback(() => {
      if (isCuisineFilterScreen) return;
      const loc = normalizeBrowseLocation(browseLocationRef.current);
      if (loc) {
        applyBrowseLocationToSession(loc);
      }
    }, [isCuisineFilterScreen, applyBrowseLocationToSession]),
  );

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

  useEffect(() => {
    setFeaturedChannelMeta(null);
    const ownerId =
      featuredVideo?.user?.id ??
      featuredVideo?.video?.userId ??
      featuredVideo?.video?.user?.id;
    if (ownerId == null || String(ownerId).trim() === '') return;
    let cancelled = false;
    getChannelProfile(String(ownerId), user?.id)
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
        setFeaturedChannelMeta({
          rating: Number.isFinite(avg) ? Math.max(0, Math.min(5, avg)) : 0,
          reviewCount: Number.isFinite(count)
            ? Math.max(0, Math.floor(count))
            : 0,
          phone:
            p?.phone ?? p?.mobile ?? p?.phoneNumber ?? p?.contactPhone ?? null,
          email: p?.email ?? p?.contactEmail ?? p?.contact?.email ?? null,
          address: p?.address ?? null,
          channelAbout: p?.channelAbout ?? p?.about ?? p?.bio ?? null,
          latitude: p?.latitude ?? p?.lat ?? null,
          longitude: p?.longitude ?? p?.lng ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setFeaturedChannelMeta(null);
      });
    return () => {
      cancelled = true;
    };
  }, [
    featuredVideo?.user?.id,
    featuredVideo?.video?.userId,
    featuredVideo?.video?.user?.id,
    user?.id,
  ]);

  useEffect(() => {
    setSponsoredChannelMeta(null);
    const ownerId =
      sponsoredVideo?.user?.id ??
      sponsoredVideo?.video?.userId ??
      sponsoredVideo?.video?.user?.id;
    if (ownerId == null || String(ownerId).trim() === '') return;
    let cancelled = false;
    getChannelProfile(String(ownerId), user?.id)
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
        setSponsoredChannelMeta({
          rating: Number.isFinite(avg) ? Math.max(0, Math.min(5, avg)) : 0,
          reviewCount: Number.isFinite(count)
            ? Math.max(0, Math.floor(count))
            : 0,
          isSubscribed: !!p?.isSubscribed,
          phone:
            p?.phone ?? p?.mobile ?? p?.phoneNumber ?? p?.contactPhone ?? null,
          email: p?.email ?? p?.contactEmail ?? p?.contact?.email ?? null,
          address: p?.address ?? null,
          channelAbout: p?.channelAbout ?? p?.about ?? p?.bio ?? null,
          latitude: p?.latitude ?? p?.lat ?? null,
          longitude: p?.longitude ?? p?.lng ?? null,
        });
      })
      .catch(() => {
        if (!cancelled) setSponsoredChannelMeta(null);
      });
    return () => {
      cancelled = true;
    };
  }, [
    sponsoredVideo?.user?.id,
    sponsoredVideo?.video?.userId,
    sponsoredVideo?.video?.user?.id,
    user?.id,
  ]);

  // TEMP DEBUG: inspect featured payload + mapped card data.
  useEffect(() => {
    try {
      console.log('[HomeOneScreen][featuredVideo raw]', featuredVideo);
      console.log('[HomeOneScreen][featuredItem mapped]', featuredItem);
    } catch (_) {}
  }, [featuredVideo, featuredItem]);

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
          const itemDescriptionRaw =
            (item?.description != null && String(item.description).trim()) ||
            '';
          const baseViewCount = Math.max(
            Number(rawDisplay.viewCount ?? 0),
            Number(item?.viewCount ?? 0),
          );
          const vc = baseViewCount + 1;
          const full = {
            ...rawDisplay,
            // Preserve campaign/card values when present; fill missing fields from detail response.
            ...item,
            id: item?.id || rawDisplay?.id || res?.id,
            type: item?.type || rawDisplay?.type || 'video',
            _count: res?._count || item?._count || rawDisplay?._count || {},
            videoUrl:
              String(item?.videoUrl || '').trim() ||
              String(rawDisplay?.videoUrl || '').trim() ||
              String(res?.videoUrl || '').trim(),
            img:
              String(item?.img || '').trim() ||
              String(rawDisplay?.img || '').trim() ||
              String(res?.thumbnailUrl || '').trim() ||
              String(res?.videoUrl || '').trim(),
            title:
              normalizePromoName(item?.title, rawDisplay?.title, res?.title) ||
              rawDisplay?.title ||
              item?.title,
            channelName:
              normalizePromoName(
                item?.channelName,
                item?._campaignOwnerUser?.nickname,
                item?._campaignOwnerUser?.name,
                rawDisplay?.channelName,
              ) || rawDisplay?.channelName,
            location:
              String(item?.location || '').trim() ||
              String(item?._campaignMeta?.areaName || '').trim() ||
              rawDisplay?.location ||
              'Near you',
            creatorAddress:
              String(item?.creatorAddress || '').trim() ||
              String(item?._campaignMeta?.areaName || '').trim() ||
              rawDisplay?.creatorAddress,
            _campaignOwnerUser: item?._campaignOwnerUser || null,
            _campaignMeta: item?._campaignMeta || null,
            likeCount: Math.max(
              Number(item?.likeCount ?? 0),
              Number(rawDisplay?.likeCount ?? 0),
              Number(res?.likeCount ?? 0),
              Number(res?._count?.likes ?? 0),
            ),
            commentCount: Math.max(
              Number(item?.commentCount ?? 0),
              Number(rawDisplay?.commentCount ?? 0),
              Number(res?.commentCount ?? 0),
              Number(res?._count?.comments ?? 0),
            ),
            viewCount: vc,
            views:
              vc >= 1000 ? `${(vc / 1000).toFixed(1)}K views` : `${vc} views`,
          };
          const videoDescriptionRaw =
            itemDescriptionRaw ||
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
                p.mobile ??
                p.phoneNumber ??
                p.contactPhone ??
                p.contact?.phone ??
                co?.phone ??
                item?.user?.phone ??
                full.user?.phone,
              email:
                p.email ??
                p.contactEmail ??
                p.contact?.email ??
                co?.email ??
                item?.user?.email ??
                full.user?.email,
              address: p.address ?? co?.address ?? full.user?.address,
              channelAbout:
                ((item?.description && String(item.description).trim()) ||
                  undefined) ??
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
              (item?.location && String(item.location).trim()) ||
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
                (item?.creatorAddress && String(item.creatorAddress).trim()) ||
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

          const ownerIdForProfile =
            campaignOwner?.id ??
            item?.userId ??
            item?.user?.id ??
            full?.userId ??
            full?.user?.id ??
            null;
          if (ownerIdForProfile) {
            const ownerSeed =
              campaignOwner?.id != null
                ? campaignOwner
                : {
                    id: ownerIdForProfile,
                    nickname: item?.user?.nickname || full?.user?.nickname,
                    name: item?.user?.name || full?.user?.name,
                    phone: item?.user?.phone || full?.user?.phone,
                    email: item?.user?.email || full?.user?.email,
                    address:
                      item?.user?.address ||
                      item?.creatorAddress ||
                      full?.user?.address,
                  };
            getChannelProfile(ownerIdForProfile, user?.id)
              .then(profile => {
                setSelectedItem(prev => ({
                  ...applyCampaignOwner(ownerSeed, profile),
                  watchedAt: prev?.watchedAt,
                }));
              })
              .catch(() => {
                setSelectedItem(prev => ({
                  ...applyCampaignOwner(ownerSeed, null),
                  watchedAt: prev?.watchedAt,
                }));
              });
          } else {
            setSelectedItem(prev => ({
              ...full,
              _campaignVideoDetail: !!item?._campaignOwnerUser,
              watchedAt: prev?.watchedAt,
            }));
          }
        })
        .catch(() => {
          // Keep campaign card data usable even if details API fails.
          const safeFallback = {
            ...item,
            id: item?.id,
            type: item?.type || 'video',
            videoUrl:
              String(item?.videoUrl || '').trim() ||
              String(item?.img || '').trim() ||
              '',
            img:
              String(item?.img || '').trim() ||
              String(item?.videoUrl || '').trim() ||
              'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
            _campaignVideoDetail: !!item?._campaignOwnerUser,
            likeCount: Number(item?.likeCount ?? item?._count?.likes ?? 0),
            commentCount: Number(
              item?.commentCount ??
                item?.topLevelCommentCount ??
                item?._count?.comments ??
                0,
            ),
            description:
              String(item?.description || '').trim() ||
              String(item?.user?.channelAbout || '').trim() ||
              '',
          };
          setSelectedItem(prev => ({
            ...safeFallback,
            watchedAt: prev?.watchedAt,
          }));
        });
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
    if (!isAuthenticated || !actorUserId) {
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
            await unsubscribeFromChannel(actorUserId, videoChannelOwnerId);
          } else {
            await subscribeToChannel(actorUserId, videoChannelOwnerId);
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
  }, [
    isAuthenticated,
    actorUserId,
    videoChannelOwnerId,
    isOwnChannelVideo,
    navigation,
  ]);

  const handleFeedItemPress = item => {
    if (item?.type === 'short') {
      // openShortDetail(item)
      navigation.navigate('ProductShortsVideo', { item });
    } else {
      openRestaurantDetail(item);
    }
  };

  const getSponsoredOwnerId = useCallback(item => {
    if (!item) return null;
    return (
      item.userId ?? item?.user?.id ?? item?._campaignOwnerUser?.id ?? null
    );
  }, []);

  const openBookingForItem = useCallback(
    item => {
      const ownerId = getSponsoredOwnerId(item);
      if (!ownerId) return;
      if (!isAuthenticated || !actorUserId) {
        navigation.navigate('HomeSevenScreen');
        return;
      }
      const owner =
        item?._campaignOwnerUser ||
        (item?.user && typeof item.user === 'object' ? item.user : null) ||
        {};
      setBookingTarget({
        ownerId,
        ownerName:
          owner?.nickname ||
          owner?.name ||
          item?.channelName ||
          item?.title ||
          'Restaurant',
        address: owner?.address || item?.creatorAddress || item?.location || '',
      });
      setBookingModalVisible(true);
    },
    [actorUserId, getSponsoredOwnerId, isAuthenticated, navigation],
  );

  const patchSingleFeedVideoSubscribe = useCallback((videoId, isSubscribed) => {
    const vid = String(videoId || '');
    if (!vid) return;
    setFeedVideos(prev =>
      (prev || []).map(entry =>
        String(entry?.id) === vid
          ? {
              ...entry,
              user: {
                ...(entry.user && typeof entry.user === 'object'
                  ? entry.user
                  : {}),
                isSubscribed,
              },
            }
          : entry,
      ),
    );
  }, []);

  const getTrendingCardSubscribed = useCallback(
    video => {
      const vid = String(video?.id ?? '');
      if (
        vid &&
        Object.prototype.hasOwnProperty.call(trendingSubscribeByVideoId, vid)
      ) {
        return !!trendingSubscribeByVideoId[vid];
      }
      if (typeof video?.user?.isSubscribed === 'boolean') {
        return video.user.isSubscribed;
      }
      return false;
    },
    [trendingSubscribeByVideoId],
  );

  const trendingTopVideosForHydrate = useMemo(() => {
    const itemViewCount = item => Number(item?.viewCount ?? 0);
    return [...(feedVideos || [])]
      .sort((a, b) => itemViewCount(b) - itemViewCount(a))
      .slice(0, 3);
  }, [feedVideos]);

  useEffect(() => {
    if (!user?.id || trendingTopVideosForHydrate.length === 0) return;
    const byOwner = new Map();
    for (const v of trendingTopVideosForHydrate) {
      const oid = getSponsoredOwnerId(v);
      if (oid == null || String(oid).trim() === '') continue;
      const key = String(oid);
      if (!byOwner.has(key)) byOwner.set(key, []);
      byOwner.get(key).push(v);
    }
    if (byOwner.size === 0) return;
    let cancelled = false;
    (async () => {
      for (const [ownerKey, videos] of byOwner) {
        if (subscribeTouchedOwnersRef.current.has(ownerKey)) continue;
        try {
          const p = await getChannelProfile(ownerKey, user.id);
          if (cancelled) return;
          const sub = !!p?.isSubscribed;
          setChannelSubscribeByOwnerId(prev => ({
            ...prev,
            [ownerKey]: sub,
          }));
          setTrendingSubscribeByVideoId(prev => {
            const next = { ...prev };
            for (const v of videos) {
              const vid = String(v.id);
              if (!Object.prototype.hasOwnProperty.call(prev, vid)) {
                next[vid] = sub;
              }
            }
            return next;
          });
        } catch (_) {
          /* keep card defaults */
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [trendingTopVideosForHydrate, user?.id, getSponsoredOwnerId]);

  const handleSponsoredOrder = useCallback(
    item => {
      const ownerId = getSponsoredOwnerId(item);
      if (!ownerId) return;
      const ownerName =
        item?.user?.nickname || item?.user?.name || item?.channelName || '';
      const location =
        item?.location || item?.creatorAddress || item?.user?.address || '';
      if (!user?.token) {
        navigation.navigate('HomeSevenScreen', {
          returnToOrder: true,
          ownerUserId: ownerId,
        });
        return;
      }
      navigation.navigate('HomeThreeScreen', {
        ownerId,
        ownerName,
        location,
        searchKeyword: String(searchDebounced || '').trim(),
      });
    },
    [user?.token, navigation, searchDebounced, getSponsoredOwnerId],
  );

  const openCategoryRestaurant = useCallback(
    (row, categoryLabelForSearch = '') => {
      if (!row?.id) return;
      const ownerName = row?.name || 'Restaurant';
      const location = row?.address || '';
      const discoveryKey =
        route.params?.discoveryCategoryKey || cuisineFilterKey || '';
      const searchKw = String(
        categoryLabelForSearch || selectedCuisine || '',
      ).trim();
      if (!user?.token) {
        navigation.navigate('HomeSevenScreen', {
          returnToOrder: true,
          ownerUserId: row.id,
        });
        return;
      }
      navigation.navigate('HomeThreeScreen', {
        ownerId: row.id,
        ownerName,
        location,
        searchKeyword: searchKw,
        discoveryCategoryKey: discoveryKey,
      });
    },
    [
      navigation,
      user?.token,
      route.params?.discoveryCategoryKey,
      cuisineFilterKey,
      selectedCuisine,
    ],
  );

  const handleSponsoredBook = useCallback(
    item => {
      openBookingForItem(item);
    },
    [openBookingForItem],
  );

  const handleSponsoredSubscribe = useCallback(
    async item => {
      const ownerId = getSponsoredOwnerId(item);
      if (!ownerId) return;
      if (!isAuthenticated || !actorUserId) {
        navigation.navigate('HomeSevenScreen');
        return;
      }
      if (String(ownerId) === String(actorUserId)) return;
      const videoKey = String(item?.id ?? '');
      if (!videoKey) return;
      if (subscribeTogglingVideoId === videoKey) return;
      const ownerKey = String(ownerId);
      const wasSubscribed = getTrendingCardSubscribed(item);
      setSubscribeTogglingVideoId(videoKey);
      try {
        if (wasSubscribed) {
          await unsubscribeFromChannel(actorUserId, ownerId);
        } else {
          await subscribeToChannel(actorUserId, ownerId);
        }
        const nextSubscribed = !wasSubscribed;
        subscribeTouchedOwnersRef.current.add(ownerKey);
        setTrendingSubscribeByVideoId(prev => ({
          ...prev,
          [videoKey]: nextSubscribed,
        }));
        setChannelSubscribeByOwnerId(prev => ({
          ...prev,
          [ownerKey]: nextSubscribed,
        }));
        patchSingleFeedVideoSubscribe(item.id, nextSubscribed);
        if (
          sponsoredVideo &&
          String(
            sponsoredVideo?.user?.id ??
              sponsoredVideo?.video?.userId ??
              sponsoredVideo?.video?.user?.id ??
              '',
          ) === ownerKey
        ) {
          setSponsoredChannelMeta(prev =>
            prev
              ? { ...prev, isSubscribed: nextSubscribed }
              : { rating: 0, reviewCount: 0, isSubscribed: nextSubscribed },
          );
        }
      } catch (e) {
        Alert.alert(
          'Subscribe',
          e?.message || 'Could not update subscription.',
        );
      } finally {
        setSubscribeTogglingVideoId(null);
      }
    },
    [
      isAuthenticated,
      actorUserId,
      subscribeTogglingVideoId,
      getTrendingCardSubscribed,
      patchSingleFeedVideoSubscribe,
      navigation,
      getSponsoredOwnerId,
      sponsoredVideo,
    ],
  );

  const handleShortLike = useCallback(
    async item => {
      if (
        !isAuthenticated ||
        !actorUserId ||
        item?.type !== 'short' ||
        !item?.id
      )
        return;
      try {
        const res = await shortsService.toggleLike(item.id, actorUserId);
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
    [isAuthenticated, actorUserId],
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
    if (!isAuthenticated || !actorUserId || !selectedItem?.id) {
      navigation.navigate('HomeSevenScreen');
      return;
    }
    const targetId = selectedItem.id;
    const isShort = selectedItem?.type === 'short';
    try {
      const res = isShort
        ? await shortsService.toggleLike(targetId, actorUserId)
        : await toggleVideoLike(targetId, actorUserId);
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
  }, [
    isAuthenticated,
    actorUserId,
    navigation,
    selectedItem?.id,
    selectedItem?.type,
  ]);

  const handleRestaurantDislike = useCallback(async () => {
    if (!isAuthenticated || !actorUserId || !selectedItem?.id) {
      navigation.navigate('HomeSevenScreen');
      return;
    }
    const targetId = selectedItem.id;
    const isShort = selectedItem?.type === 'short';
    try {
      const res = isShort
        ? await shortsService.toggleDislike(targetId, actorUserId)
        : await toggleVideoDislike(targetId, actorUserId);
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
  }, [
    isAuthenticated,
    actorUserId,
    navigation,
    selectedItem?.id,
    selectedItem?.type,
  ]);

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

  const openHomeMoreForShort = useCallback(
    item => {
      if (!item?.id) return;
      const ownerId = item?.userId ?? item?.user?.id ?? null;
      const isOwner =
        !!actorUserId && !!ownerId && String(ownerId) === String(actorUserId);
      setHomeMoreTarget({
        contentType: 'short',
        contentId: item.id,
        videoUrl: item.videoUrl,
        title:
          item.title ||
          (item.description || 'Short').substring(0, 80) ||
          'Short',
        channelName:
          item.user?.nickname || item.user?.name || item.channelName || '',
        ownerId,
        canEdit: isOwner,
        canDelete: isOwner,
        sourceItem: item,
      });
      setHomeMoreVisible(true);
    },
    [actorUserId],
  );

  const openHomeMoreForFeedItem = useCallback(
    item => {
      if (!item?.id) return;
      const isShort = String(item.type || '').toLowerCase() === 'short';
      const ownerId = item?.userId ?? item?.user?.id ?? null;
      const isOwner =
        !!actorUserId && !!ownerId && String(ownerId) === String(actorUserId);
      setHomeMoreTarget({
        contentType: isShort ? 'short' : 'video',
        contentId: item.id,
        videoUrl: item.videoUrl,
        title:
          item.title ||
          item.channelName ||
          (item.description || '').substring(0, 80) ||
          'Video',
        channelName:
          item.channelName || item.user?.nickname || item.user?.name || '',
        ownerId,
        canEdit: isShort && isOwner,
        canDelete: isOwner,
        sourceItem: item,
      });
      setHomeMoreVisible(true);
    },
    [actorUserId],
  );

  const openHomeMoreFromSelected = useCallback(() => {
    if (!selectedItem?.id) return;
    const isShort = selectedItem.type === 'short';
    const ownerId = selectedItem?.userId ?? selectedItem?.user?.id ?? null;
    const isOwner =
      !!actorUserId && !!ownerId && String(ownerId) === String(actorUserId);
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
      ownerId,
      canEdit: isShort && isOwner,
      canDelete: isOwner,
      sourceItem: selectedItem,
    });
    setHomeMoreVisible(true);
  }, [actorUserId, selectedItem]);

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
    if (!requireLogin()) return;
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
  }, [homeMoreTarget, requireLogin]);

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
    if (!requireLogin()) return;
    Alert.alert(
      'Not interested',
      "We'll try to show you less content like this.",
    );
  }, [requireLogin]);

  const onMoreEditShort = useCallback(async () => {
    const t = homeMoreTarget;
    if (!t?.contentId || t.contentType !== 'short') return;
    if (!requireLogin()) return;
    if (!t.canEdit) return;

    let sourceShort = t.sourceItem || {
      id: t.contentId,
      title: t.title,
      videoUrl: t.videoUrl,
      userId: t.ownerId,
    };

    try {
      const detailRes = await shortsService.getShortById(
        t.contentId,
        actorUserId,
        String(user?.role || '').toLowerCase() || undefined,
      );
      const resolved =
        detailRes?.short && typeof detailRes.short === 'object'
          ? detailRes.short
          : detailRes?.data && typeof detailRes.data === 'object'
          ? detailRes.data
          : detailRes;
      if (resolved && typeof resolved === 'object') {
        sourceShort = { ...sourceShort, ...resolved };
      }
    } catch (_) {
      // The edit flow can still open with the home card data if detail fetch fails.
    }

    const pubAtRaw =
      sourceShort?.publishedAt ||
      sourceShort?.publishAt ||
      sourceShort?.postedAt ||
      null;
    const schedAtRaw =
      sourceShort?.scheduledPublishAt ||
      sourceShort?.scheduleAt ||
      sourceShort?.scheduleDate ||
      sourceShort?.scheduledAt ||
      null;
    const pubAt = pubAtRaw ? new Date(pubAtRaw) : null;
    const schedAt = schedAtRaw ? new Date(schedAtRaw) : null;
    const cand =
      schedAt && Number.isFinite(schedAt.getTime())
        ? schedAt
        : pubAt && Number.isFinite(pubAt.getTime())
        ? pubAt
        : null;
    const isFuture =
      cand &&
      Number.isFinite(cand.getTime()) &&
      cand.getTime() > Date.now() + 60_000;
    const visibilityLabel =
      String(sourceShort?.visibility || '').toLowerCase() === 'private'
        ? 'Private'
        : 'Public';
    const commentsLabel =
      String(sourceShort?.commentSetting || '').toLowerCase() === 'disable'
        ? 'Disable comments'
        : String(sourceShort?.commentSetting || '').toLowerCase() === 'hold'
        ? 'Hold potentially inappropriate comments'
        : 'Allow all comments';
    const durationNum = Number(sourceShort?.duration);
    const inferredPlatforms = Array.isArray(sourceShort?.platforms)
      ? sourceShort.platforms
      : Array.isArray(sourceShort?.selectedPlatforms)
      ? sourceShort.selectedPlatforms
      : [
          sourceShort?.facebookPageId ? 'facebook' : null,
          sourceShort?.instagramAccountId ? 'instagram' : null,
          sourceShort?.tiktokAccountId ? 'tiktok' : null,
          sourceShort?.youtubeChannelId ? 'youtube' : null,
        ].filter(Boolean);

    navigation.navigate('PostCreateNew', {
      isEdit: true,
      shortId: String(sourceShort?.id || t.contentId),
      short: sourceShort,
      editDraft: {
        source: 'short-edit',
        shortId: String(sourceShort?.id || t.contentId),
        caption: String(
          sourceShort?.desc ||
            sourceShort?.description ||
            sourceShort?.title ||
            '',
        ).trim(),
        title: String(
          sourceShort?.title ||
            sourceShort?.desc ||
            sourceShort?.description ||
            '',
        ).trim(),
        video: {
          uri: String(
            sourceShort?.videoUrl || sourceShort?.mediaUrl || t.videoUrl || '',
          ).trim(),
          type: 'video/mp4',
          name: `short-${sourceShort?.id || t.contentId}.mp4`,
          durationSec:
            Number.isFinite(durationNum) && durationNum > 0 ? durationNum : 15,
        },
        thumbnail: {
          uri: String(
            sourceShort?.thumbnailUrl ||
              sourceShort?.thumbnail ||
              sourceShort?.coverUrl ||
              sourceShort?.img ||
              '',
          ).trim(),
          type: 'image/jpeg',
          name: `short-cover-${sourceShort?.id || t.contentId}.jpg`,
        },
        platforms: inferredPlatforms,
        scheduledPublishAt:
          sourceShort?.scheduledPublishAt ||
          sourceShort?.scheduleAt ||
          (isFuture && cand ? cand.toISOString() : null),
        edits: {
          visibility: visibilityLabel,
          comments: commentsLabel,
          madeForKids:
            typeof sourceShort?.madeForKids === 'boolean'
              ? Boolean(sourceShort.madeForKids)
              : null,
          ageRestricted:
            typeof sourceShort?.ageRestricted === 'boolean'
              ? Boolean(sourceShort.ageRestricted)
              : null,
          scheduledPublishAt: isFuture && cand ? cand.toISOString() : null,
          hadFutureSchedule: !!isFuture,
          platforms: inferredPlatforms,
        },
      },
    });
  }, [actorUserId, homeMoreTarget, navigation, requireLogin, user?.role]);

  const onMoreDelete = useCallback(() => {
    const t = homeMoreTarget;
    if (!t?.contentId || !t.canDelete) return;
    if (!requireLogin()) return;
    const label = t.contentType === 'short' ? 'short' : 'video';
    Alert.alert(
      `Delete ${label}`,
      `Are you sure you want to delete this ${label}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (t.contentType === 'short') {
                await shortsService.deleteShort(t.contentId, actorUserId);
                setFeedShorts(prev =>
                  prev.filter(s => String(s?.id) !== String(t.contentId)),
                );
              } else {
                await deleteVideo(t.contentId, actorUserId);
                setFeedVideos(prev =>
                  prev.filter(v => String(v?.id) !== String(t.contentId)),
                );
              }
              if (String(selectedItem?.id) === String(t.contentId)) {
                setIsRestaurantDetail(false);
                setIsVideoDetail(false);
                setSelectedItem(null);
              }
              closeHomeMore();
            } catch (e) {
              Alert.alert('Error', e?.message || `Failed to delete ${label}`);
            }
          },
        },
      ],
    );
  }, [
    homeMoreTarget,
    requireLogin,
    actorUserId,
    selectedItem?.id,
    closeHomeMore,
  ]);

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
    const promoName = normalizePromoName(
      co?.nickname,
      co?.name,
      mergedUser?.nickname,
      mergedUser?.name,
      base?.channelName,
      video?.title,
      video?.description,
      base?.title,
    );
    const promoTitle = normalizePromoName(video?.title, promoName, base?.title);
    const ratingFromProfile =
      featuredChannelMeta != null ? featuredChannelMeta.rating : base.rating;
    const reviewCountFromProfile =
      featuredChannelMeta != null
        ? featuredChannelMeta.reviewCount
        : base.reviewCount;
    const withPromoName = {
      ...base,
      channelName: promoName,
      title: promoTitle,
      rating: ratingFromProfile,
      reviewCount: reviewCountFromProfile,
    };
    return co?.id
      ? {
          ...withPromoName,
          _campaignOwnerUser: co,
          ...(meta && { _campaignMeta: meta }),
        }
      : withPromoName;
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
        const ratingFromProfile =
          sponsoredChannelMeta != null
            ? sponsoredChannelMeta.rating
            : base.rating;
        const reviewCountFromProfile =
          sponsoredChannelMeta != null
            ? sponsoredChannelMeta.reviewCount
            : base.reviewCount;
        const promoName = normalizePromoName(
          co?.nickname,
          co?.name,
          mergedUser?.nickname,
          mergedUser?.name,
          base?.channelName,
          video?.title,
          video?.description,
          base?.title,
        );
        const promoTitle = normalizePromoName(
          video?.title,
          promoName,
          base?.title,
        );
        const withRating = {
          ...base,
          channelName: promoName,
          title: promoTitle,
          rating: ratingFromProfile,
          reviewCount: reviewCountFromProfile,
        };
        return co?.id
          ? {
              ...withRating,
              _campaignOwnerUser: co,
              ...(meta && { _campaignMeta: meta }),
            }
          : withRating;
      })()
    : null;

  // Future: re-enable feed sections below Trending (Most Ordered, Continue watching, etc.)
  // Curated feed order (top carousel / trending shown separately above):
  // 2 videos -> try new shorts -> 1 video -> most ordered -> 2 videos -> continue -> mixed feed.
  /*
  const buildFeedSections = () => {
    const shorts = feedShorts || [];
    const videos = feedVideos || [];
    const freshShorts = newShorts || [];
    const topRestaurants = mostOrderedRestaurants || [];
    const sections = [];
    let sIdx = 0;
    let vIdx = 0;

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
  */

  // const feedSections = buildFeedSections();

  // --- RENDERING HELPERS ---

  const renderResults = () => {
    const addr = (addressText && String(addressText).trim()) || '';
    const pc =
      (browsePostcode && String(browsePostcode).trim()) ||
      (browseLocation?.postcode && String(browseLocation.postcode).trim()) ||
      '';
    const primaryLoc = headerLocationLabel;
    const areaShort = primaryLoc.split(',')[0].trim();
    const areaForTitle = areaShort || 'your area';
    const secondaryLoc = addr || primaryLoc;
    const cuisineKey = normalizeCuisine(selectedCuisine);
    const cuisineSelected = isCuisineFilterScreen && !!cuisineKey;
    const safeChipOptions = buildHomeMenuCategoryChips();
    const getItemMenuTagsLower = item => {
      const directTags = Array.isArray(item?._menuTagsLower)
        ? item._menuTagsLower
        : [];
      if (directTags.length > 0) return directTags;
      const ownerId =
        item?.userId ??
        item?.user?.id ??
        item?._campaignOwnerUser?.id ??
        item?._campaignVideoDetail?.userId ??
        item?._campaignVideoDetail?.user?.id;
      if (!ownerId) return [];
      const oid = String(ownerId);
      return buildMenuCuisineTags(
        ownerMenuSearchCacheRef.current[oid] || [],
        ownerCategoryCacheRef.current[oid] || [],
      );
    };
    const ownerMatchesSelectedCuisine = ownerId => {
      if (!cuisineSelected || !ownerId) return false;
      const oid = String(ownerId);
      return ownerMenuMatchesCuisineFilter(
        ownerMenuSearchCacheRef.current[oid] || [],
        ownerCategoryCacheRef.current[oid] || [],
        cuisineKey,
      );
    };
    const matchesCuisineItem = item => {
      if (!cuisineSelected) return true;
      const tags = getItemMenuTagsLower(item);
      if (tags.includes(cuisineKey)) return true;
      const discovery = resolveDiscoveryCategoryFromFilter(cuisineKey);
      if (discovery && tags.includes(discovery.key)) return true;
      const ownerId =
        item?.userId ??
        item?.user?.id ??
        item?._campaignOwnerUser?.id ??
        item?._campaignVideoDetail?.userId ??
        item?._campaignVideoDetail?.user?.id;
      return ownerMatchesSelectedCuisine(ownerId);
    };
    const isPromoInSelectedArea = item => {
      const viewerLat = Number(viewerLocationOpts?.viewerLat);
      const viewerLng = Number(viewerLocationOpts?.viewerLng);
      if (!Number.isFinite(viewerLat) || !Number.isFinite(viewerLng))
        return false;
      const metaLat = Number(item?._campaignMeta?.latitude);
      const metaLng = Number(item?._campaignMeta?.longitude);
      // Strict: campaign must include area coordinates and be nearby.
      if (!Number.isFinite(metaLat) || !Number.isFinite(metaLng)) return false;
      const km = distanceKmBetween(viewerLat, viewerLng, metaLat, metaLng);
      return km != null && km <= HOME_PROMO_RADIUS_KM;
    };
    const withPromoDisplayFallbacks = (item, campaignRaw) => {
      if (!item) return null;
      const owner =
        item?._campaignOwnerUser ||
        campaignRaw?.user ||
        item?.user ||
        campaignRaw?.video?.user ||
        {};
      const rawVideo = campaignRaw?.video || {};
      const fixedChannelName = normalizePromoName(
        item?.channelName,
        owner?.nickname,
        owner?.name,
        rawVideo?.user?.nickname,
        rawVideo?.user?.name,
      );
      const fixedTitle = normalizePromoName(
        item?.title,
        rawVideo?.title,
        fixedChannelName,
      );
      const viewCount = Number(
        item?.viewCount ?? rawVideo?.viewCount ?? rawVideo?._count?.views ?? 0,
      );
      const fixedViews =
        String(item?.views || '').trim() || formatVideoViewsLabel(viewCount);
      return {
        ...item,
        channelName: fixedChannelName,
        title: fixedTitle,
        viewCount: Number.isFinite(viewCount) ? viewCount : 0,
        views: fixedViews,
      };
    };
    const featuredDisplayItem = withPromoDisplayFallbacks(
      featuredItem,
      featuredVideo,
    );
    const sponsoredDisplayItem = withPromoDisplayFallbacks(
      sponsoredItem,
      sponsoredVideo,
    );
    const featuredForCuisine =
      featuredDisplayItem &&
      isPromoInSelectedArea(featuredDisplayItem) &&
      hasRenderablePromoCard(featuredDisplayItem) &&
      matchesCuisineItem(featuredDisplayItem);
    const sponsoredForCuisine =
      sponsoredDisplayItem &&
      isPromoInSelectedArea(sponsoredDisplayItem) &&
      hasRenderablePromoCard(sponsoredDisplayItem) &&
      matchesCuisineItem(sponsoredDisplayItem);
    const featuredCardChannelName = normalizePromoName(
      featuredForCuisine?.channelName,
      featuredVideo?.user?.nickname,
      featuredVideo?.user?.name,
      featuredVideo?.video?.user?.nickname,
      featuredVideo?.video?.user?.name,
    );
    const featuredCardTitle = normalizePromoName(
      featuredForCuisine?.title,
      featuredVideo?.video?.title,
      featuredCardChannelName,
    );
    const featuredCardViews =
      String(featuredForCuisine?.views || '').trim() ||
      formatVideoViewsLabel(
        Number(
          featuredForCuisine?.viewCount ??
            featuredVideo?.video?.viewCount ??
            featuredVideo?.video?._count?.views ??
            0,
        ),
      );
    const featuredCardLocation =
      String(featuredForCuisine?.location || '').trim() ||
      String(featuredVideo?._campaignMeta?.areaName || '').trim() ||
      'Near you';
    const sponsoredCardChannelName = normalizePromoName(
      sponsoredForCuisine?.channelName,
      sponsoredVideo?.user?.nickname,
      sponsoredVideo?.user?.name,
      sponsoredVideo?.video?.user?.nickname,
      sponsoredVideo?.video?.user?.name,
    );
    const sponsoredCardTitle = normalizePromoName(
      sponsoredForCuisine?.title,
      sponsoredVideo?.video?.title,
      sponsoredCardChannelName,
    );
    const sponsoredCardViews =
      String(sponsoredForCuisine?.views || '').trim() ||
      formatVideoViewsLabel(
        Number(
          sponsoredForCuisine?.viewCount ??
            sponsoredVideo?.video?.viewCount ??
            sponsoredVideo?.video?._count?.views ??
            0,
        ),
      );
    const sponsoredCardLocation =
      String(sponsoredForCuisine?.location || '').trim() ||
      String(sponsoredVideo?._campaignMeta?.areaName || '').trim() ||
      'Near you';
    const featuredCardImg =
      String(featuredForCuisine?.img || '').trim() ||
      String(featuredVideo?.video?.thumbnailUrl || '').trim() ||
      String(featuredVideo?.video?.videoUrl || '').trim() ||
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd';
    const sponsoredCardImg =
      String(sponsoredForCuisine?.img || '').trim() ||
      String(sponsoredVideo?.video?.thumbnailUrl || '').trim() ||
      String(sponsoredVideo?.video?.videoUrl || '').trim() ||
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd';
    const featuredOwnerId =
      featuredForCuisine?._campaignOwnerUser?.id ??
      featuredVideo?.user?.id ??
      featuredForCuisine?.userId ??
      featuredForCuisine?.user?.id;
    const sponsoredOwnerId =
      sponsoredForCuisine?._campaignOwnerUser?.id ??
      sponsoredVideo?.user?.id ??
      sponsoredForCuisine?.userId ??
      sponsoredForCuisine?.user?.id;
    const featuredNavItem = featuredForCuisine
      ? {
          ...featuredForCuisine,
          id:
            featuredForCuisine?.id ??
            featuredVideo?.video?.id ??
            featuredVideo?.id,
          type: featuredForCuisine?.type || 'video',
          videoUrl:
            String(featuredForCuisine?.videoUrl || '').trim() ||
            String(featuredVideo?.video?.videoUrl || '').trim() ||
            '',
          img: featuredCardImg,
          viewCount: Number(
            featuredForCuisine?.viewCount ??
              featuredVideo?.video?.viewCount ??
              featuredVideo?.video?._count?.views ??
              0,
          ),
          description:
            String(featuredForCuisine?.description || '').trim() ||
            String(featuredVideo?.video?.description || '').trim() ||
            String(featuredChannelMeta?.channelAbout || '').trim(),
          userId: featuredOwnerId || featuredForCuisine.userId,
          _campaignOwnerUser:
            featuredForCuisine?._campaignOwnerUser ||
            featuredVideo?.user ||
            null,
          _campaignMeta:
            featuredForCuisine?._campaignMeta ||
            campaignMetaFrom(featuredVideo),
          location:
            String(featuredCardLocation || '').trim() ||
            String(featuredForCuisine?.location || '').trim() ||
            String(featuredChannelMeta?.address || '').trim() ||
            'Near you',
          creatorAddress:
            String(featuredForCuisine?.creatorAddress || '').trim() ||
            String(featuredChannelMeta?.address || '').trim() ||
            String(featuredVideo?._campaignMeta?.areaName || '').trim() ||
            String(featuredVideo?.video?.user?.address || '').trim(),
          creatorLatitude:
            featuredForCuisine?.creatorLatitude ??
            featuredChannelMeta?.latitude ??
            featuredVideo?._campaignMeta?.latitude,
          creatorLongitude:
            featuredForCuisine?.creatorLongitude ??
            featuredChannelMeta?.longitude ??
            featuredVideo?._campaignMeta?.longitude,
          user: {
            ...(featuredForCuisine?.user || {}),
            id: featuredOwnerId || featuredForCuisine?.user?.id,
            nickname:
              featuredForCuisine?.user?.nickname ||
              featuredCardChannelName ||
              featuredForCuisine?.user?.name,
            name:
              featuredForCuisine?.user?.name ||
              featuredCardChannelName ||
              featuredForCuisine?.user?.nickname,
            phone:
              featuredForCuisine?.user?.phone ??
              featuredChannelMeta?.phone ??
              null,
            email:
              featuredForCuisine?.user?.email ??
              featuredChannelMeta?.email ??
              null,
            address:
              featuredForCuisine?.user?.address ??
              featuredChannelMeta?.address ??
              null,
            channelAbout:
              featuredForCuisine?.user?.channelAbout ??
              featuredChannelMeta?.channelAbout ??
              null,
          },
        }
      : null;
    const sponsoredNavItem = sponsoredForCuisine
      ? {
          ...sponsoredForCuisine,
          id:
            sponsoredForCuisine?.id ??
            sponsoredVideo?.video?.id ??
            sponsoredVideo?.id,
          type: sponsoredForCuisine?.type || 'video',
          videoUrl:
            String(sponsoredForCuisine?.videoUrl || '').trim() ||
            String(sponsoredVideo?.video?.videoUrl || '').trim() ||
            '',
          img: sponsoredCardImg,
          viewCount: Number(
            sponsoredForCuisine?.viewCount ??
              sponsoredVideo?.video?.viewCount ??
              sponsoredVideo?.video?._count?.views ??
              0,
          ),
          description:
            String(sponsoredForCuisine?.description || '').trim() ||
            String(sponsoredVideo?.video?.description || '').trim() ||
            String(sponsoredChannelMeta?.channelAbout || '').trim(),
          userId: sponsoredOwnerId || sponsoredForCuisine.userId,
          _campaignOwnerUser:
            sponsoredForCuisine?._campaignOwnerUser ||
            sponsoredVideo?.user ||
            null,
          _campaignMeta:
            sponsoredForCuisine?._campaignMeta ||
            campaignMetaFrom(sponsoredVideo),
          location:
            String(sponsoredCardLocation || '').trim() ||
            String(sponsoredForCuisine?.location || '').trim() ||
            String(sponsoredChannelMeta?.address || '').trim() ||
            'Near you',
          creatorAddress:
            String(sponsoredForCuisine?.creatorAddress || '').trim() ||
            String(sponsoredChannelMeta?.address || '').trim() ||
            String(sponsoredVideo?._campaignMeta?.areaName || '').trim() ||
            String(sponsoredVideo?.video?.user?.address || '').trim(),
          creatorLatitude:
            sponsoredForCuisine?.creatorLatitude ??
            sponsoredChannelMeta?.latitude ??
            sponsoredVideo?._campaignMeta?.latitude,
          creatorLongitude:
            sponsoredForCuisine?.creatorLongitude ??
            sponsoredChannelMeta?.longitude ??
            sponsoredVideo?._campaignMeta?.longitude,
          user: {
            ...(sponsoredForCuisine?.user || {}),
            id: sponsoredOwnerId || sponsoredForCuisine?.user?.id,
            nickname:
              sponsoredForCuisine?.user?.nickname ||
              sponsoredCardChannelName ||
              sponsoredForCuisine?.user?.name,
            name:
              sponsoredForCuisine?.user?.name ||
              sponsoredCardChannelName ||
              sponsoredForCuisine?.user?.nickname,
            phone:
              sponsoredForCuisine?.user?.phone ??
              sponsoredChannelMeta?.phone ??
              null,
            email:
              sponsoredForCuisine?.user?.email ??
              sponsoredChannelMeta?.email ??
              null,
            address:
              sponsoredForCuisine?.user?.address ??
              sponsoredChannelMeta?.address ??
              null,
            channelAbout:
              sponsoredForCuisine?.user?.channelAbout ??
              sponsoredChannelMeta?.channelAbout ??
              null,
          },
        }
      : null;
    const itemViewCount = item => Number(item?.viewCount ?? 0);
    const shortsCarouselItems = (
      popularShorts.length > 0 ? popularShorts : feedShorts
    )
      .filter(matchesCuisineItem)
      .slice(0, 16);
    const carouselShortIds = new Set(
      shortsCarouselItems.map(s => String(s.id)),
    );
    const trendingTopVideos = (feedVideos || [])
      .filter(matchesCuisineItem)
      .slice()
      .sort((a, b) => itemViewCount(b) - itemViewCount(a))
      .slice(0, 3);
    // Future: used to hide trending videos from feed sections below when re-enabled.
    /*
    const trendingVideoIds = new Set(
      trendingTopVideos.map(v => String(v.id)),
    );
    */
    // Future: re-enable when restoring sections below Trending on home feed.
    /*
    const sectionsToRender = feedSections
      .map(section => ({
        ...section,
        data: (section.data || []).filter(item => {
          if (cuisineSelected && !matchesCuisineItem(item)) return false;
          if (
            section.type === 'VIDEOS' &&
            trendingVideoIds.size > 0 &&
            trendingVideoIds.has(String(item.id))
          ) {
            return false;
          }
          if (
            (section.type === 'SHORTS' || section.type === 'TRY_NEW_SHORTS') &&
            carouselShortIds.has(String(item.id))
          ) {
            return false;
          }
          return true;
        }),
      }))
      .filter(section => (section.data || []).length > 0);
    */
    const slideCuisineChips = dir => {
      const step = 5 * 70; // roughly 5 chips per click
      const maxOffset = Math.max(
        0,
        cuisineContentWidthRef.current - cuisineLayoutWidthRef.current,
      );
      const current = cuisineScrollXRef.current || 0;
      const next = Math.max(0, Math.min(maxOffset, current + dir * step));
      cuisineScrollRef.current?.scrollTo({ x: next, animated: true });
      cuisineScrollXRef.current = next;
    };

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
            <View style={styles.headerLeftCol}>
              <Image
                source={logo}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.locationRow}
                activeOpacity={0.85}
                onPress={() => setLocationModalVisible(true)}
              >
                <Icon name="map-marker-outline" size={17} color="#FFF" />
                <View style={styles.locationLabelWrap}>
                  <Text style={styles.locationText} numberOfLines={1}>
                    {primaryLoc}
                  </Text>
                  <Icon
                    name="chevron-down"
                    size={16}
                    color="#FFF"
                    style={styles.locationChevron}
                  />
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.headerRightGroup}>
              {isAuthenticated ? (
                <NotificationBellButton
                  unreadCount={unreadCount}
                  onPress={() => setNotificationsVisible(true)}
                  iconColor="#FFF"
                />
              ) : null}
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
                    return (
                      <Icon name="account-outline" size={28} color="#FFF" />
                    );
                  })()}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.searchBlock}>
            <Text style={styles.searchHint}>
              Watch what's popular near you, tap to get it
            </Text>
            <View style={styles.searchRow}>
              <TouchableOpacity
                style={styles.searchInputWrap}
                activeOpacity={0.9}
                onPress={() =>
                  navigation.navigate('HomeSearchScreen', {
                    nearLabel: primaryLoc || '',
                    autoFocus: true,
                    viewerLat:
                      selectedLocation?.lat ??
                      browseLocation?.lat ??
                      user?.latitude,
                    viewerLng:
                      selectedLocation?.lng ??
                      browseLocation?.lng ??
                      user?.longitude,
                  })
                }
              >
                <Icon name="magnify" size={22} color="#9CA3AF" />
                <Text style={styles.searchPlaceholder}>
                  Search for restaurants or dishes...
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterBtn}
                activeOpacity={0.85}
                onPress={() =>
                  navigation.navigate('HomeSearchScreen', {
                    nearLabel: primaryLoc || '',
                    viewerLat:
                      selectedLocation?.lat ??
                      browseLocation?.lat ??
                      user?.latitude,
                    viewerLng:
                      selectedLocation?.lng ??
                      browseLocation?.lng ??
                      user?.longitude,
                  })
                }
              >
                <Icon name="tune-variant" size={22} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.feedPadding}>
            <ScrollView
              ref={cuisineScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.cuisineChipRow}
              onLayout={e => {
                cuisineLayoutWidthRef.current = e.nativeEvent.layout.width || 0;
              }}
              onContentSizeChange={(w, _h) => {
                cuisineContentWidthRef.current = w || 0;
              }}
              onScroll={e => {
                cuisineScrollXRef.current = e.nativeEvent.contentOffset.x || 0;
              }}
              scrollEventThrottle={16}
              style={styles.cuisineScroll}
            >
              {safeChipOptions.map(cuisine => {
                const isActive =
                  cuisineSelected &&
                  normalizeCuisine(cuisine.label) === cuisineKey;
                return (
                  <TouchableOpacity
                    key={cuisine.key}
                    style={styles.cuisineChip}
                    onPress={() => {
                      navigation.navigate('HomeSearchCategoryScreen', {
                        categoryKey: cuisine.key,
                        categoryLabel: cuisine.label,
                        nearLabel: primaryLoc || '',
                        viewerLat: selectedLocation?.lat ?? user?.latitude,
                        viewerLng: selectedLocation?.lng ?? user?.longitude,
                      });
                    }}
                    activeOpacity={0.85}
                  >
                    <View style={styles.cuisineIconCircle}>
                      <Image
                        source={{ uri: cuisine.imageUri }}
                        style={styles.cuisineIconImage}
                        resizeMode="cover"
                      />
                    </View>
                    <Text
                      style={[
                        styles.cuisineChipText,
                        isActive && styles.cuisineChipTextActive,
                      ]}
                      numberOfLines={2}
                    >
                      {displayCuisineLabel(cuisine.label)}
                    </Text>
                    {isActive ? (
                      <View style={styles.cuisineChipUnderline} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {cuisineSelected ? (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitleFlat}>
                    Restaurants with {selectedCuisine}
                  </Text>
                </View>
                {categoryBrowseLoading && categoryBrowseRows.length === 0 ? (
                  <ActivityIndicator
                    size="small"
                    color="#F5A623"
                    style={{ marginVertical: 16 }}
                  />
                ) : null}
                {categoryBrowseRows.length === 0 && !categoryBrowseLoading ? (
                  <Text style={styles.cuisineEmptyHint}>
                    No restaurants with “{selectedCuisine}” on the menu nearby
                    yet.
                  </Text>
                ) : (
                  categoryBrowseRows.map((r, idx) => {
                    const hasVideo =
                      r?.mediaType === 'short' || r?.mediaType === 'video';
                    const viewsLabel =
                      Number(r?.totalViews) > 0
                        ? `${new Intl.NumberFormat('en-US').format(
                            r.totalViews,
                          )} views`
                        : Number(r?.orderCount) > 0
                        ? `${r.orderCount} orders`
                        : '';
                    const dishHint =
                      Number(r?.matchingItemCount) > 0
                        ? `${r.matchingItemCount} ${selectedCuisine} dish${
                            r.matchingItemCount === 1 ? '' : 'es'
                          }`
                        : r.address || '';
                    return (
                      <DiscoveryTrendingCard
                        key={`cat-browse-${r.id}`}
                        name={r.name}
                        subtitle={dishHint}
                        imageUri={r.mediaThumb}
                        viewsLabel={viewsLabel}
                        rating={r.rating}
                        featured={idx === 0}
                        showPlayIcon={hasVideo}
                        onPress={() =>
                          hasVideo
                            ? openDiscoveryMedia(navigation, r, {
                                onFallback: () =>
                                  openCategoryRestaurant(r, selectedCuisine),
                              })
                            : openCategoryRestaurant(r, selectedCuisine)
                        }
                        onOrderPress={() =>
                          openCategoryRestaurant(r, selectedCuisine)
                        }
                      />
                    );
                  })
                )}
              </>
            ) : null}

            {featuredForCuisine ? (
              <>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitleFlat}>Featured Near You</Text>
                  <TouchableOpacity
                    onPress={() =>
                      featuredNavItem && handleFeedItemPress(featuredNavItem)
                    }
                  >
                    <Text style={styles.viewMoreText}>View All</Text>
                  </TouchableOpacity>
                </View>
                <FeaturedHeroCard
                  channelName={featuredCardChannelName}
                  metaLine={(() => {
                    const cuisineLabel = cuisineSelected
                      ? displayCuisineLabel(selectedCuisine)
                      : displayCuisineLabel(
                          getItemMenuTagsLower(featuredForCuisine)[0] || 'Food',
                        );
                    const vc = Number(
                      featuredForCuisine?.viewCount ??
                        featuredVideo?.video?.viewCount ??
                        0,
                    );
                    const r = Number(featuredForCuisine?.rating ?? 0);
                    const rc = Number(featuredForCuisine?.reviewCount ?? 0);
                    return `${cuisineLabel} - ${formatCount(
                      vc,
                    )} - ★ ${r.toFixed(1)} (${rc})`;
                  })()}
                  img={featuredCardImg}
                  onPress={() => handleFeedItemPress(featuredNavItem)}
                  onOrderPress={() => handleSponsoredOrder(featuredNavItem)}
                  onMorePress={() => openHomeMoreForFeedItem(featuredNavItem)}
                  showOrderBook={shouldShowOrderBookButtons(
                    featuredNavItem,
                    user?.id,
                  )}
                />
              </>
            ) : null}

            {shortsCarouselItems.length > 0 ? (
              <>
                <Text style={styles.sectionTitleFlat}>Shorts</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  decelerationRate="fast"
                  snapToInterval={
                    SHORT_CAROUSEL_CARD_WIDTH + SHORT_CAROUSEL_GAP
                  }
                  snapToAlignment="start"
                  contentContainerStyle={styles.shortsCarouselRow}
                >
                  {shortsCarouselItems.map((item, index) => (
                    <View
                      key={`home-short-carousel-${item.id}-${index}`}
                      style={[
                        styles.shortsCarouselItem,
                        index < shortsCarouselItems.length - 1 && {
                          marginRight: SHORT_CAROUSEL_GAP,
                        },
                      ]}
                    >
                      <ShortCarouselCard
                        title={item.channelName || item.title}
                        img={item.img}
                        views={item.views}
                        onPress={() => handleFeedItemPress(item)}
                        onMorePress={() => openHomeMoreForShort(item)}
                      />
                    </View>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {sponsoredForCuisine ? (
              <PromoFridayBanner
                onExplorePress={() => {
                  if (sponsoredNavItem) handleFeedItemPress(sponsoredNavItem);
                }}
                onPlayPress={() => {
                  if (sponsoredNavItem) handleFeedItemPress(sponsoredNavItem);
                }}
              />
            ) : null}

            {trendingTopVideos.length > 0 ? (
              <>
                <View style={styles.trendingSectionHeader}>
                  <View style={styles.sectionHeaderTextCol}>
                    <Text style={styles.trendingSectionTitle}>
                      Trending Near You
                    </Text>
                    <Text style={styles.sectionSubtitle}>
                      Ranked by real views in your area
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.trendingViewAllBtn}
                    onPress={() =>
                      navigation.navigate('HomeShortsExploreScreen', {
                        title: 'Trending Near You',
                        sort: 'trending',
                      })
                    }
                  >
                    <Text style={styles.viewMoreText}>View All</Text>
                  </TouchableOpacity>
                </View>
                {trendingTopVideos.map(video => {
                  const trendingOwnerId = getSponsoredOwnerId(video);
                  const trendingVideoKey = String(video?.id ?? '');
                  return (
                    <HomeFeedVideoCard
                      key={`trending-${video.id}`}
                      title={video.title}
                      channelName={video.channelName}
                      views={video.views}
                      distanceLabel={video.distanceLabel}
                      rating={video.rating}
                      img={video.img}
                      onPress={() => handleFeedItemPress(video)}
                      onOrderPress={() => handleSponsoredOrder(video)}
                      onBookPress={() => handleSponsoredBook(video)}
                      onSubscribePress={() => handleSponsoredSubscribe(video)}
                      subscribeBusy={
                        !!trendingVideoKey &&
                        subscribeTogglingVideoId === trendingVideoKey
                      }
                      isSubscribed={getTrendingCardSubscribed(video)}
                      hideSubscribe={
                        !!user?.id &&
                        trendingOwnerId != null &&
                        String(user.id) === String(trendingOwnerId)
                      }
                      showOrderBook={shouldShowOrderBookButtons(video, user?.id)}
                    />
                  );
                })}
              </>
            ) : null}

            {/* Future: re-enable home feed sections below Trending (Most Ordered, Continue watching, Videos, Shorts grid, etc.)
            {feedLoading ? (
              <View style={styles.feedLoading}>
                <ActivityIndicator size="large" color="#F5A623" />
                <Text style={styles.feedLoadingText}>Loading...</Text>
              </View>
            ) : (
              <>
                {sectionsToRender.map((section, sectionIdx) => (
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
                      <Text style={styles.sectionTitleFlat}>Videos</Text>
                    )}
                    {section.type === 'CONTINUE' && section.data.length > 0 && (
                      <Text style={styles.sectionTitleFlat}>
                        Continue watching
                      </Text>
                    )}
                    {section.type === 'SPONSORED' &&
                      section.data.length > 0 && (
                        <Text style={styles.sectionTitleFlat}>
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
                          <View
                            key={`${item.id}-rest-${sectionIdx}-${index}`}
                            style={styles.shortsGridItem}
                          >
                            <ShortCard
                              title={item.title}
                              img={item.img}
                              views={item.views}
                              onPress={() =>
                                navigation.navigate('ProductShortsVideo', {
                                  item: {
                                    id: String(item.id),
                                    userId: item.id,
                                    ownerName: item.title,
                                    title: item.title,
                                    img: item.img,
                                    viewCount: Number(item.orderCount || 0),
                                    views: item.views,
                                    type: 'short',
                                    user: {
                                      id: item.id,
                                      nickname: item.title,
                                      name: item.title,
                                    },
                                  },
                                })
                              }
                            />
                          </View>
                        ))}
                      </View>
                    ) : (
                      section.data.map((item, index) => {
                        const sponsoredOwnerId = getSponsoredOwnerId(item);
                        const hideSponsoredSubscribe =
                          !!user?.id &&
                          sponsoredOwnerId != null &&
                          String(user.id) === String(sponsoredOwnerId);
                        return (
                          <HomeFeedVideoCard
                            key={`${item.id}-${item.type}-${sectionIdx}-${index}`}
                            title={item.title}
                            channelName={item.channelName}
                            views={item.views}
                            distanceLabel={item.distanceLabel}
                            rating={item.rating}
                            img={item.img}
                            onPress={() => handleFeedItemPress(item)}
                            onOrderPress={() => handleSponsoredOrder(item)}
                            onBookPress={() => handleSponsoredBook(item)}
                            onSubscribePress={() =>
                              handleSponsoredSubscribe(item)
                            }
                            subscribeBusy={
                              !!item?.id &&
                              subscribeTogglingVideoId === String(item.id)
                            }
                            isSubscribed={getTrendingCardSubscribed(item)}
                            hideSubscribe={hideSponsoredSubscribe}
                          />
                        );
                      })
                    )}
                  </View>
                ))}
              </>
            )}
            */}
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
              {shouldShowOrderBookButtons(selectedItem, user?.id) &&
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
        const likeDisplayCount = Math.max(
          Number(selectedItem?.likeCount ?? 0),
          Number(selectedItem?._count?.likes ?? 0),
        );
        const commentDisplayCount = Math.max(
          Number(selectedItem?.commentCount ?? 0),
          Number(selectedItem?.topLevelCommentCount ?? 0),
          Number(selectedItem?._count?.comments ?? 0),
        );
        const descDisplay =
          (selectedItem?.description &&
            String(selectedItem.description).trim()) ||
          (selectedItem?.user?.channelAbout &&
            String(selectedItem.user.channelAbout).trim()) ||
          (selectedItem?._campaignOwnerUser?.channelAbout &&
            String(selectedItem._campaignOwnerUser.channelAbout).trim()) ||
          'No description.';
        const contactPhone =
          selectedItem?.user?.phone ||
          selectedItem?.user?.mobile ||
          selectedItem?._campaignOwnerUser?.phone ||
          selectedItem?._campaignOwnerUser?.mobile ||
          selectedItem?.phone ||
          '—';
        const contactEmail =
          selectedItem?.user?.email ||
          selectedItem?._campaignOwnerUser?.email ||
          selectedItem?.email ||
          '—';
        const contactAddress =
          selectedItem?.location ||
          selectedItem?.creatorAddress ||
          selectedItem?.user?.address ||
          selectedItem?._campaignOwnerUser?.address ||
          selectedItem?._campaignMeta?.areaName ||
          '—';
        const showOrderBook = shouldShowOrderBookButtons(selectedItem, user?.id);
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
              {showOrderBook && (
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
                  {formatCount(likeDisplayCount)}
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
                  if (!isAuthenticated || !actorUserId) {
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
                  {formatCount(commentDisplayCount)}
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
                {showOrderBook ? (
                  <TouchableOpacity
                    style={[styles.resRowBtn, styles.resRowBtnPrimary]}
                    onPress={() => openBookingForItem(selectedItem)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.resRowBtnTextLight}>Book Now</Text>
                  </TouchableOpacity>
                ) : null}
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
                <Text style={styles.descText}>{descDisplay}</Text>
              </View>
            </View>

            <View style={styles.resGlassCard}>
              <View style={styles.contactContainer}>
                <Text style={styles.contactSectionLabel}>Contact</Text>
                <View style={styles.contactRow}>
                  <Icon name="phone-outline" size={18} color="#888" />
                  <Text style={styles.contactRowText}>{contactPhone}</Text>
                </View>
                <View style={styles.contactRow}>
                  <Icon name="email-outline" size={18} color="#888" />
                  <Text style={styles.contactRowText} numberOfLines={2}>
                    {contactEmail}
                  </Text>
                </View>
                <View style={styles.contactDivider} />
                <View style={[styles.contactRow, styles.contactRowLast]}>
                  <Icon name="map-marker-outline" size={18} color="#888" />
                  <Text style={styles.contactRowText}>{contactAddress}</Text>
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
        onEdit={onMoreEditShort}
        onDelete={onMoreDelete}
        showEdit={!!homeMoreTarget?.canEdit}
        showDelete={!!homeMoreTarget?.canDelete}
      />

      <RestaurantBookingModal
        visible={bookingModalVisible}
        onClose={() => setBookingModalVisible(false)}
        ownerId={bookingTarget?.ownerId}
        ownerName={bookingTarget?.ownerName}
        currentUser={user}
        defaultAddress={
          user?.address || addressText || bookingTarget?.address || ''
        }
      />

      <NotificationsBottomSheet
        visible={notificationsVisible}
        onClose={() => setNotificationsVisible(false)}
        notifications={notifications}
        loading={notificationsLoading}
        unreadCount={unreadCount}
        onMarkRead={markNotificationReadLocal}
        onMarkAllRead={markAllNotificationsReadLocal}
        navigation={navigation}
        currentUser={user}
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
        user={{ ...(user || {}), id: actorUserId || authUserId || user?.id }}
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
                style={styles.locationActionBtn}
                disabled={locationModalLoading}
                onPress={() => {
                  setLocationModalVisible(false);
                  setLocationMapVisible(true);
                }}
                activeOpacity={0.85}
              >
                <Icon
                  name="map-marker-radius"
                  size={16}
                  color="#FFF"
                  style={styles.locationActionIcon}
                />
                <Text
                  style={styles.locationActionText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  Map & postcode
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.locationActionBtn}
                disabled={locationModalLoading}
                activeOpacity={0.85}
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
                      size={16}
                      color="#FFF"
                      style={styles.locationActionIcon}
                    />
                    <Text
                      style={styles.locationActionText}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
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
                activeOpacity={0.7}
              >
                <Text style={styles.locationCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <MapLocationPicker
        visible={locationMapVisible}
        onClose={() => setLocationMapVisible(false)}
        title="Deliver to"
        initialLat={selectedLocation?.lat}
        initialLng={selectedLocation?.lng}
        initialPostcode={browsePostcode}
        initialAddress={addressText}
        onConfirm={async browse => {
          const coords = { lat: browse.lat, lng: browse.lng };
          setSelectedLocation(coords);
          setAddressText(browse.addressText || browse.areaLabel);
          setBrowsePostcode(browse.postcode || '');
          setLocationInput(browse.addressText || browse.postcode || '');
          await saveLocationSelection(
            coords,
            browse.addressText || browse.areaLabel,
            browse.postcode,
          );
          loadFeaturedAndFeed();
          loadContinueWatching();
        }}
      />
    </SafeAreaView>
  );
};

// --- SUB-COMPONENT ---

const FeaturedHeroCard = ({
  channelName,
  metaLine,
  img,
  onPress,
  onOrderPress,
  onMorePress,
  showOrderBook = true,
}) => (
  <TouchableOpacity
    style={styles.featuredHeroCard}
    onPress={onPress}
    activeOpacity={0.92}
  >
    <Image source={{ uri: img }} style={styles.featuredHeroImage} />
    <LinearGradient
      colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.72)']}
      style={styles.featuredHeroImageGrad}
    />
    <View style={styles.featuredHeroBadge}>
      <Text style={styles.featuredHeroBadgeText}>Featured</Text>
    </View>
    {onMorePress ? (
      <TouchableOpacity
        style={styles.featuredHeroMore}
        onPress={e => {
          e?.stopPropagation?.();
          onMorePress();
        }}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon name="dots-vertical" size={22} color="#FFF" />
      </TouchableOpacity>
    ) : null}
    <View style={styles.featuredHeroPlayWrap} pointerEvents="none">
      <Icon
        name="play-circle-outline"
        size={54}
        color="rgba(255,255,255,0.88)"
      />
    </View>
    <View style={styles.featuredHeroFooter}>
      <View style={styles.featuredHeroFooterText}>
        <Text style={styles.featuredHeroName} numberOfLines={1}>
          {channelName}
        </Text>
        <Text style={styles.featuredHeroMeta} numberOfLines={1}>
          {metaLine}
        </Text>
      </View>
      {showOrderBook ? (
        <TouchableOpacity
          style={styles.featuredHeroOrderBtn}
          activeOpacity={0.88}
          onPress={e => {
            e?.stopPropagation?.();
            onOrderPress?.();
          }}
        >
          <Text style={styles.featuredHeroOrderText}>Order Now</Text>
          <Icon name="arrow-right" size={16} color="#FFF" />
        </TouchableOpacity>
      ) : null}
    </View>
  </TouchableOpacity>
);

const ShortCarouselCard = ({ title, img, views, onPress, onMorePress }) => (
  <View
    style={[
      styles.shortCarouselCard,
      {
        width: SHORT_CAROUSEL_CARD_WIDTH,
        height: SHORT_CAROUSEL_CARD_HEIGHT,
      },
    ]}
  >
    <TouchableOpacity
      style={styles.shortCarouselPress}
      onPress={onPress}
      activeOpacity={0.9}
    >
      <Image source={{ uri: img }} style={styles.shortCarouselImage} />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.75)']}
        style={styles.shortCarouselGrad}
      />
      <Text style={styles.shortCarouselTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={styles.shortCarouselViews} numberOfLines={1}>
        {views}
      </Text>
    </TouchableOpacity>
    {onMorePress ? (
      <TouchableOpacity
        style={styles.shortCarouselDots}
        onPress={onMorePress}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Icon name="dots-vertical" size={18} color="#FFF" />
      </TouchableOpacity>
    ) : null}
  </View>
);

/** Video / sponsored feed card (Trending, Videos, Continue, etc.) */
const HomeFeedVideoCard = ({
  channelName,
  title,
  img,
  views,
  distanceLabel,
  rating,
  onPress,
  onOrderPress,
  onBookPress,
  onSubscribePress,
  subscribeBusy,
  isSubscribed,
  hideSubscribe,
  showOrderBook = true,
}) => {
  const displayName = String(channelName || title || 'Restaurant').trim();
  const safeRating = Number.isFinite(Number(rating))
    ? Number(rating).toFixed(1)
    : '0.0';

  return (
    <View style={styles.trendingCard}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.92}
        style={styles.trendingCardMediaWrap}
      >
        <Image source={{ uri: img }} style={styles.trendingCardImage} />
        <View style={styles.trendingCardPlayWrap} pointerEvents="none">
          <Icon
            name="play-circle-outline"
            size={52}
            color="rgba(255,255,255,0.9)"
          />
        </View>
      </TouchableOpacity>
      <View style={styles.trendingCardBody}>
        <View style={styles.trendingRow1}>
          <View style={styles.trendingTitleBlock}>
            <Text style={styles.trendingName} numberOfLines={1}>
              {displayName}
            </Text>
            <View style={styles.trendingRatingRow}>
              <Icon name="star" size={14} color="#F5A623" />
              <Text style={styles.trendingRatingText}>{safeRating}</Text>
            </View>
          </View>
          {showOrderBook ? (
            <View style={styles.trendingBtnGroup}>
              <TouchableOpacity
                style={styles.trendingOrderBtn}
                activeOpacity={0.88}
                onPress={onOrderPress}
                disabled={!onOrderPress}
              >
                <Text style={styles.trendingOrderText}>Order Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.trendingBookBtn}
                activeOpacity={0.88}
                onPress={onBookPress}
                disabled={!onBookPress}
              >
                <Text style={styles.trendingBookText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
        <View style={styles.trendingRow2}>
          <View style={styles.trendingMetaRow}>
            <Icon name="map-marker" size={14} color="#F5A623" />
            <Text style={styles.trendingMetaText}>{distanceLabel || '—'}</Text>
            <Icon
              name="eye-outline"
              size={14}
              color="#9CA3AF"
              style={styles.trendingMetaEye}
            />
            <Text style={styles.trendingMetaText}>{views || '0 views'}</Text>
          </View>
          {!hideSubscribe ? (
            <TouchableOpacity
              style={[
                styles.trendingSubscribeBtn,
                isSubscribed && styles.trendingSubscribeBtnActive,
              ]}
              activeOpacity={0.88}
              onPress={onSubscribePress}
              disabled={!onSubscribePress || !!subscribeBusy}
            >
              {subscribeBusy ? (
                <ActivityIndicator size="small" color="#555" />
              ) : (
                <Text
                  style={[
                    styles.trendingSubscribeText,
                    isSubscribed && styles.trendingSubscribeTextActive,
                  ]}
                >
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
        <Text style={styles.trendingTagline}>
          Like what you see? Get it now
        </Text>
      </View>
    </View>
  );
};

const PromoFridayBanner = ({ onExplorePress, onPlayPress }) => (
  <View style={styles.promoFridayWrap}>
    <Image
      source={spicePromoBg}
      style={styles.promoFridayBgImage}
      resizeMode="cover"
    />
    <LinearGradient
      colors={[
        '#F6B041',
        '#F69E23',
        'rgba(246, 158, 35, 0.82)',
        'rgba(246, 158, 35, 0.35)',
        'rgba(246, 158, 35, 0)',
      ]}
      locations={[0, 0.32, 0.52, 0.68, 1]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={styles.promoFridayGradientOverlay}
    />
    <View style={styles.promoFridayForeground}>
      <View style={styles.promoFridayContent}>
        <View style={styles.promoFridayTopRow}>
          <Image
            source={logo}
            style={styles.promoFridayLogo}
            resizeMode="contain"
          />
          <View style={styles.promoFridayExclusivePill}>
            <Text style={styles.promoFridayExclusiveText}>Exclusive</Text>
          </View>
        </View>
        <Text style={styles.promoFridayTitle}>Spice up your Friday</Text>
        <Text style={styles.promoFridaySub}>
          Enjoy Exclusive offers at top spots near you
        </Text>
        <TouchableOpacity
          style={styles.promoFridayCta}
          activeOpacity={0.75}
          onPress={onExplorePress}
        >
          <Text style={styles.promoFridayCtaText}>Explore Offer</Text>
          <Icon name="arrow-right" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>
      <View style={styles.promoFridayPlayCol}>
        <TouchableOpacity
          style={styles.promoFridayPlay}
          onPress={onPlayPress}
          activeOpacity={0.85}
        >
          <Icon name="play" size={26} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

// Two-per-row short card (HomeVersion-style): image, play overlay, bottom overlay with title + views
const ShortCard = ({ title, img, views, onPress, onMorePress, carousel }) => (
  <View style={[styles.shortCard, carousel && styles.shortCardCarousel]}>
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
    alignItems: 'flex-start',
  },
  headerLeftCol: {
    flex: 1,
    alignItems: 'flex-start',
    paddingRight: 8,
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  logoImage: HEADER_LOGO_STYLE,
  resultsTitle: {
    color: '#FFF',
    marginTop: 10,
    fontSize: 18,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  locationLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginLeft: 5,
  },
  locationText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  locationChevron: {
    marginLeft: 2,
    marginTop: 1,
  },
  searchBlock: {
    backgroundColor: '#FFF',
    paddingHorizontal: FEED_HORIZONTAL_PAD,
    paddingTop: 14,
    paddingBottom: 16,
  },
  searchHint: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
    lineHeight: 18,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 0,
  },
  searchPlaceholder: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#9CA3AF',
  },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2D2D2D',
    alignItems: 'center',
    justifyContent: 'center',
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
  homeDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
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
  feedPadding: { padding: FEED_HORIZONTAL_PAD, paddingTop: 8 },
  feedHint: {
    textAlign: 'center',
    fontSize: 14,
    color: '#777',
    marginBottom: 12,
  },
  orderNowCard: {
    borderWidth: 0,
    borderRadius: 10,
    backgroundColor: '#F5A623',
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#B36B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.24,
    shadowRadius: 4,
    elevation: 3,
  },
  orderNowCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  orderNowIconPill: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF3DA',
    borderWidth: 0,
  },
  orderNowCardTextWrap: { marginLeft: 8 },
  orderNowCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  orderNowCardSub: {
    marginTop: 1,
    fontSize: 11,
    color: '#FFF3D7',
  },
  cuisineScroll: {
    marginBottom: 2,
  },
  cuisineChipRow: {
    paddingBottom: 2,
    paddingRight: 4,
    gap: 5,
  },
  cuisineSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  cuisineArrowBtn: {
    width: 16,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  cuisineChip: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: 64,
    marginRight: 1,
    backgroundColor: '#FFF',
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#ECECEC',
    paddingTop: 3,
  },
  cuisineIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFF2D8',
    borderWidth: 1,
    borderColor: '#EBCB8A',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cuisineIconImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  cuisineChipText: {
    color: '#4E4E4E',
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
    lineHeight: 9,
    width: '100%',
  },
  cuisineChipTextActive: {
    color: '#F5A623',
    fontWeight: '700',
  },
  cuisineChipUnderline: {
    marginTop: 1,
    width: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#F5A623',
  },
  cuisineEmptyWrap: {
    marginTop: 24,
    paddingVertical: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
  },
  cuisineEmptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  cuisineEmptyHint: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  cuisineEmptyBtn: {
    marginTop: 16,
    backgroundColor: '#F5A623',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  cuisineEmptyBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  sectionTitleFlat: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 10,
    marginTop: 14,
  },
  featuredHeroCard: {
    width: '100%',
    height: FEATURED_HERO_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#222',
    marginBottom: 4,
  },
  featuredHeroImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  featuredHeroImageGrad: {
    ...StyleSheet.absoluteFillObject,
  },
  featuredHeroBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(33,33,33,0.82)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  featuredHeroBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  featuredHeroMore: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 4,
    zIndex: 5,
  },
  featuredHeroPlayWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredHeroFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 28,
  },
  featuredHeroFooterText: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  featuredHeroName: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '800',
  },
  featuredHeroMeta: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },
  featuredHeroOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5A623',
    paddingHorizontal: 14,
    paddingVertical: 9,
    minHeight: 36,
    borderRadius: 6,
    gap: 4,
    overflow: 'hidden',
  },
  featuredHeroOrderText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  shortCarouselCard: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
    position: 'relative',
  },
  shortCarouselPress: {
    width: '100%',
    height: '100%',
  },
  shortCarouselImage: {
    width: '100%',
    height: '100%',
  },
  shortCarouselGrad: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '42%',
  },
  shortCarouselTitle: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 22,
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  shortCarouselViews: {
    position: 'absolute',
    left: 8,
    right: 8,
    bottom: 8,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 10,
    fontWeight: '500',
  },
  shortCarouselDots: {
    position: 'absolute',
    top: 6,
    right: 6,
    zIndex: 4,
    padding: 2,
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
  shortsCarouselRow: {
    paddingBottom: 12,
    paddingRight: FEED_HORIZONTAL_PAD,
  },
  shortsCarouselItem: {},
  sectionHeaderTextCol: {
    flex: 1,
    paddingRight: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
    marginBottom: 0,
    lineHeight: 16,
  },
  trendingSectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 10,
  },
  trendingSectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  trendingViewAllBtn: {
    paddingTop: 2,
  },
  trendingCard: {
    backgroundColor: '#FEF6E7',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F0E4CC',
  },
  trendingCardMediaWrap: {
    width: '100%',
    height: TRENDING_CARD_IMAGE_HEIGHT,
    backgroundColor: '#E5E7EB',
  },
  trendingCardImage: {
    width: '100%',
    height: '100%',
  },
  trendingCardPlayWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingCardBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#FEF6E7',
  },
  trendingRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendingTitleBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingRight: 8,
  },
  trendingName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginRight: 8,
    flexShrink: 1,
  },
  trendingRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendingRatingText: {
    marginLeft: 3,
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  trendingBtnGroup: {
    flexDirection: 'row',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F5A623',
    overflow: 'hidden',
    flexShrink: 0,
  },
  trendingOrderBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 30,
    justifyContent: 'center',
  },
  trendingOrderText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '700',
  },
  trendingBookBtn: {
    backgroundColor: '#FFF7EA',
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 30,
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#F5A623',
  },
  trendingBookText: {
    color: '#F5A623',
    fontSize: 11,
    fontWeight: '700',
  },
  trendingRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  trendingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    flexWrap: 'wrap',
    paddingRight: 8,
  },
  trendingMetaText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginLeft: 3,
    marginRight: 10,
  },
  trendingMetaEye: {
    marginLeft: 2,
  },
  trendingSubscribeBtn: {
    backgroundColor: '#FFF8F0',
    borderWidth: 1,
    borderColor: '#E8DFD0',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
    minWidth: 88,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  trendingSubscribeBtnActive: {
    backgroundColor: '#EDE8E0',
    borderColor: '#D5CEC4',
  },
  trendingSubscribeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  trendingSubscribeTextActive: {
    color: '#6B7280',
  },
  trendingTagline: {
    marginTop: 8,
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  cuisineChipActive: {},
  promoFridayWrap: {
    marginTop: 4,
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    height: 136,
    backgroundColor: '#F69E23',
  },
  promoFridayBgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  promoFridayGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  promoFridayForeground: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  promoFridayContent: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 14,
    paddingRight: 4,
    justifyContent: 'center',
  },
  promoFridayPlayCol: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    paddingRight: 10,
  },
  promoFridayTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  promoFridayLogo: {
    width: 52,
    height: 22,
  },
  promoFridayExclusivePill: {
    marginLeft: 8,
    backgroundColor: 'rgba(246, 176, 65, 0)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.65)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  promoFridayExclusiveText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
  },
  promoFridayTitle: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 24,
  },
  promoFridaySub: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    marginTop: 4,
    lineHeight: 15,
    maxWidth: '95%',
  },
  promoFridayCta: {
    marginTop: 10,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    gap: 4,
  },
  promoFridayCtaText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.15,
  },
  promoFridayPlay: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.32)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
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
  sponsoredCard: {
    backgroundColor: '#F4F7F8',
    borderRadius: 15,
    marginBottom: 25,
    elevation: 1,
    overflow: 'hidden',
  },
  cardImageContainer: { height: 200, position: 'relative' },
  cardImage: { width: '100%', height: '100%', borderRadius: 10 },
  sponsoredCardImage: {
    width: '100%',
    height: '100%',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
  },
  playIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sponsoredTag: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#F5A623',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
  },
  sponsoredTagText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  cardInfo: {
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardInfoSponsored: {
    backgroundColor: '#FEF6E7',
    borderBottomEndRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 10,
    marginTop: -3,
  },
  cardInfoCompact: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  cardInfoMain: {
    flex: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  cardInlineRating: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginLeft: 8,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: '#222' },
  cardLocRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  cardLocText: { color: '#666', fontSize: 11, marginTop: 2 },
  sponsoredMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  sponsoredMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sponsoredMetaText: {
    marginLeft: 3,
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
  cardPromoLine: {
    marginTop: 3,
    color: '#8A8A8A',
    fontSize: 11,
    fontWeight: '500',
  },
  sponsoredActions: {
    marginLeft: 14,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    minHeight: 64,
  },
  sponsoredTopActions: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F5A623',
    borderRadius: 8,
    overflow: 'hidden',
  },
  sponsoredOrderBtn: {
    backgroundColor: '#F5A623',
    borderRadius: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginRight: 0,
    minHeight: 28,
    justifyContent: 'center',
  },
  sponsoredOrderText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  sponsoredBookBtn: {
    borderRadius: 0,
    borderWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: '#FFF7EA',
    minHeight: 28,
    justifyContent: 'center',
  },
  sponsoredBookText: { color: '#F5A623', fontSize: 12, fontWeight: '700' },
  sponsoredSubscribeBtn: {
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E2E2',
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#FFF',
  },
  sponsoredSubscribeText: { color: '#222', fontSize: 12, fontWeight: '600' },
  sponsoredSubscribeBtnActive: {
    backgroundColor: '#E8E8E8',
    borderColor: '#ccc',
  },
  sponsoredSubscribeTextActive: { color: '#555' },
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
    marginTop: 4,
  },
  locationActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5A623',
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 10,
    minHeight: 42,
    width: '100%',
    marginBottom: 8,
  },
  locationActionIcon: {
    marginRight: 6,
  },
  locationActionText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  locationCancelBtn: {
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 2,
  },
  locationCancelText: {
    color: '#6B7280',
    fontSize: 12,
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
