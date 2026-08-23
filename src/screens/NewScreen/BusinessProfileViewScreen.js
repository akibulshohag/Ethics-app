import React, {
  useState,
  useCallback,
  useEffect,
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
  Dimensions,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Share,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Pressable,
  BackHandler,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import appLogo from '../../assets/logo.png';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BusinessProfileCard from '../../components/BusinessProfileCard';
import BiometricLockToggle from '../../components/BiometricLockToggle';
import PromotionCard from '../../components/PromotionCard';
import BusinessVideoCard from '../../components/BusinessVideoCard';
import BusinessVideoTabCard from '../../components/BusinessVideoTabCard';
import CommentsModal from '../../components/CommentsModal';
import {
  getPostsByUser,
  updatePost,
  deletePost,
  togglePostLike,
  togglePostDislike,
  recordPostShare,
} from '../../services/postService';
import { launchImageLibrary } from 'react-native-image-picker';
import { facebookOAuthRedirectUri, tiktokOAuthRedirectUri, youtubeOAuthRedirectUri } from '../../../config';
import {
  getChannelProfile,
  updateChannelProfile,
  uploadProfilePhoto,
  uploadCoverImage,
  subscribeToChannel,
  unsubscribeFromChannel,
  getGallery,
  getFacebookConnectUrl,
  getSocialAccounts,
  getTikTokConnectUrl,
  connectYouTubeAccount,
  getYouTubeConnectUrl,
  getInstagramLinkStatus,
  uploadGallery,
  deleteGalleryPhoto,
  toggleGalleryPhotoLike,
  toggleGalleryPhotoDislike,
  recordGalleryPhotoShare,
  getDeliveryAreaUsers,
} from '../../services/channelService';
import {
  pickProfileAvatarCrop,
  pickProfileCoverCrop,
} from '../../utils/profileImagePicker';
import {
  getUserVideos,
  updateVideo,
  deleteVideo,
} from '../../services/videoService';
import { shortsService } from '../../services/shortsService';
import { useNotifications } from '../../hooks/useNotifications';
import NotificationBellButton from '../../components/NotificationBellButton';
import {
  getPromotionsByUser,
  getNearbyPromotions,
  updatePromotion,
  deletePromotion,
} from '../../services/promotionService';
import {
  createOwnerRider,
  listOwnerRiders,
  uploadOwnerRiderAvatar,
} from '../../services/riderService';
import {
  getMenuByUserId,
  getMenuFiles,
  uploadMenuItemImage,
  updateMenuItem,
  deleteMenuItem,
  deleteMenuFile,
} from '../../services/menuService';
import { persistBrowseLocation } from '../../services/userLocationService';
import { appSetUser, setBrowseLocation } from '../../redux/actions/appSlice';
import { blockUser } from '../../services/userSafetyService';
import { isUserBlocked } from '../../utils/filterBlockedContent';
import {IMAGE_PLACEHOLDER, safeImageUri} from '../../utils/helper';
import MenuItemThumbnail from '../../components/MenuItemThumbnail';
import { buildPostShareMessage } from '../../utils/contentLinks';
import {
  buildOwnerScopedShortsFeed,
  navigateToScopedShortsPlayer,
} from '../../utils/navigateToScopedShortsPlayer';
import {
  geocodeAddress,
  getCurrentPositionSafe,
  reverseGeocode,
  getFallbackCoordsForUKArea,
} from '../../utils/geolocation';
import MapLocationPicker from '../../components/MapLocationPicker';
import { normalizeUkPostcode, extractUkPostcodeFromText } from '../../utils/ukPostcode';
import { formatDistanceKm } from '../../utils/geoDistance';
import { formatCityCountryPostcodeLine } from '../../utils/locationFormat';
import CreatePromotionModal from '../../components/CreatePromotionModal';
import CreateTierDiscountModal from '../../components/CreateTierDiscountModal';
import {
  OFFER_TYPES,
  filterPromotionsByType,
  formatPromotionSchedule,
  formatPromotionSummary,
  getPromotionDisplayImage,
} from '../../utils/promotionUtils';
import Video from 'react-native-video';
import { getSocialIcon } from '../../constants/socialLinks';
import GalleryVideoDetailModal from '../../components/GalleryVideoDetailModal';
import { ALLERGENS, normalizeAllergens } from '../../constants/allergens';
import MenuAllergenRow from '../../components/MenuAllergenRow';
import { mapMenuListRow, normalizeMenuItemFromApi } from '../../utils/menuListItem';
import { viewerProfileContentParams } from '../../utils/contentVisibility';

const { width } = Dimensions.get('window');
const IS_COMPACT_WIDTH = width < 390;

const BUSINESS_SOCIAL_BAR = [
  { type: 'instagram', icon: 'instagram' },
  { type: 'facebook', icon: 'facebook' },
  { type: 'x', image: require('../../assets/icons/x.png') },
  { type: 'tiktok', image: require('../../assets/icons/tiktok.png') },
  {
    type: 'tripadvisor',
    image: require('../../assets/icons/tripadvisor.png'),
  },
  { type: 'google_email', icon: 'google' },
  { type: 'website', icon: 'web' },
];

const SOCIAL_TYPES = [
  { value: 'instagram', label: 'Instagram', icon: 'instagram' },
  { value: 'facebook', label: 'Facebook', icon: 'facebook' },
  { value: 'x', label: 'X (Twitter)', icon: 'twitter' },
  { value: 'youtube', label: 'YouTube', icon: 'youtube' },
  { value: 'tiktok', label: 'TikTok', icon: 'music-note' },
  { value: 'google_email', label: 'Google / Email', icon: 'email-outline' },
  { value: 'website', label: 'Website', icon: 'web' },
];

const getSavedSocialLinkUrl = (editSocialLinks, profile, currentUser, type) => {
  const key = String(type || '').toLowerCase();
  const fromEdit = (editSocialLinks || []).find(
    l => String(l?.type || '').toLowerCase() === key,
  )?.url;
  if (String(fromEdit || '').trim()) return String(fromEdit).trim();
  const raw = profile?.socialLinks ?? currentUser?.socialLinks ?? [];
  const links = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object'
    ? [raw]
    : [];
  const match = links.find(l => String(l?.type || '').toLowerCase() === key);
  return String(match?.url || '').trim();
};

const formatCount = n => {
  if (n == null || n < 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

const formatTimeAgo = dateStr => {
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

const isFutureScheduledMedia = item => {
  const raw =
    item?.scheduledPublishAt ||
    item?.scheduleAt ||
    item?.scheduledAt ||
    item?.publishAt ||
    item?.publishedAt ||
    null;
  const d = raw ? new Date(raw) : null;
  return !!(d && Number.isFinite(d.getTime()) && d.getTime() > Date.now());
};

const mapPostToCard = (post, user) => {
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
  const createdAt = post.publishedAt || post.createdAt;
  return {
    id: post.id,
    postId: post.id,
    sourceType: 'post',
    title: post.title || 'Untitled',
    channelName,
    channelAvatar,
    publishedAt: formatTimeAgo(createdAt),
    sortTime: new Date(createdAt || 0).getTime() || Date.now(),
    thumbnail:
      post.thumbnailUrl || post.mediaUrl || IMAGE_PLACEHOLDER,
    duration,
    likes: formatCount(post.likeCount ?? 0),
    dislikes: formatCount(post.dislikeCount ?? 0),
    comments: formatCount(post.commentCount ?? 0),
    shares: formatCount(post.shareCount ?? 0),
    website: post.website || '',
    hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
    description: post.description || post.desc || '',
    mediaUrl: post.mediaUrl || '',
    mediaType: post.mediaType || 'image',
  };
};

const mapShortToPostCard = (shortItem, user, profileUserId) => {
  const u = shortItem.user || user || {};
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
  const createdAt = shortItem.publishedAt || shortItem.createdAt;
  const duration =
    shortItem.duration != null
      ? `${Math.floor(shortItem.duration / 60)}:${String(
          shortItem.duration % 60,
        ).padStart(2, '0')}`
      : '';
  return {
    id: shortItem.id,
    postId: shortItem.id,
    sourceType: 'short',
    shortId: shortItem.id,
    userId: shortItem.userId || profileUserId,
    title: shortItem.title || 'Short',
    channelName,
    channelAvatar,
    publishedAt: formatTimeAgo(createdAt),
    sortTime: new Date(createdAt || 0).getTime() || Date.now(),
    thumbnail:
      shortItem.thumbnailUrl ||
      shortItem.coverUrl ||
      shortItem.videoUrl ||
      IMAGE_PLACEHOLDER,
    duration,
    likes: formatCount(shortItem.likeCount ?? 0),
    dislikes: formatCount(shortItem.dislikeCount ?? 0),
    comments: formatCount(shortItem.commentCount ?? 0),
    shares: formatCount(shortItem.shareCount ?? 0),
    website: '',
    hashtags: [],
    description: shortItem.description || '',
    mediaUrl: shortItem.videoUrl || '',
    mediaType: 'short',
    videoUrl: shortItem.videoUrl || '',
    type: 'short',
    _type: 'short',
  };
};

const BASE_TABS = [
  'Gallery',
  'Posts',
  'Promotions',
  'Video',
  'Photos',
  'Notification',
];

const DEFAULT_OPENING_HOURS = [
  { day: 'Sunday', open: '12.00PM', close: '12.00PM' },
  { day: 'Monday', open: '12.00PM', close: '12.00PM' },
  { day: 'Tuesday', open: '12.00PM', close: '12.00PM' },
  { day: 'Wednesday', open: '12.00PM', close: '12.00PM' },
  { day: 'Thursday', open: '12.00PM', close: '12.00PM' },
  { day: 'Friday', open: '12.00PM', close: '12.00PM' },
  { day: 'Saturday', open: '12.00PM', close: '12.00PM' },
];

const BusinessProfileViewScreen = ({ navigation }) => {
  const route = useRoute();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const currentUser = useSelector(state => state.app?.user);
  const browseLocation = useSelector(state => state.app?.browseLocation);
  const blockedUserIds = useSelector(state => state.app?.blockedUserIds || []);
  const profileUserId = route.params?.userId ?? currentUser?.id;
  const isOwnProfile = profileUserId === currentUser?.id;

  const [activeTab, setActiveTab] = useState('Gallery');
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsRefreshing, setPostsRefreshing] = useState(false);
  const openPostCreateNewFlow = useCallback(() => {
    if (!currentUser?.id) {
      navigation?.navigate('HomeSevenScreen');
      return;
    }
    let nav = navigation;
    for (let i = 0; i < 12 && nav; i++) {
      const names = nav.getState?.()?.routeNames;
      if (Array.isArray(names) && names.includes('PostCreateNew')) {
        nav.navigate('PostCreateNew');
        return;
      }
      nav = nav.getParent?.();
    }
    navigation?.navigate('PostCreateNew');
  }, [navigation, currentUser?.id]);
  const [commentsModalPostId, setCommentsModalPostId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSubscribeLoading, setProfileSubscribeLoading] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editChannelAbout, setEditChannelAbout] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editPostcode, setEditPostcode] = useState('');
  const [editLatitude, setEditLatitude] = useState(null);
  const [editLongitude, setEditLongitude] = useState(null);
  const [locationMapVisible, setLocationMapVisible] = useState(false);
  const [editSocialLinks, setEditSocialLinks] = useState([]);
  const [facebookPages, setFacebookPages] = useState([]);
  const [facebookConnecting, setFacebookConnecting] = useState(false);
  const [facebookConnectUrl, setFacebookConnectUrl] = useState('');
  const [tiktokAccounts, setTiktokAccounts] = useState([]);
  const [tiktokConnecting, setTiktokConnecting] = useState(false);
  const [tiktokConnectUrl, setTiktokConnectUrl] = useState('');
  const [youtubeAccounts, setYoutubeAccounts] = useState([]);
  const [youtubeConnecting, setYoutubeConnecting] = useState(false);
  const [youtubeConnectUrl, setYoutubeConnectUrl] = useState('');
  const [instagramLinkStatus, setInstagramLinkStatus] = useState(null);
  const [instagramChecking, setInstagramChecking] = useState(false);
  const [editOpeningHours, setEditOpeningHours] = useState(
    DEFAULT_OPENING_HOURS,
  );
  const [editDeliveryTime, setEditDeliveryTime] = useState('');
  const [editContentAreaKm, setEditContentAreaKm] = useState('');
  const [editPickupAreaKm, setEditPickupAreaKm] = useState('');
  const [editDeliveryAreaKm, setEditDeliveryAreaKm] = useState('');
  const [editTaxCharge0To10Km, setEditTaxCharge0To10Km] = useState('');
  const [editTaxCharge11To20Km, setEditTaxCharge11To20Km] = useState('');
  const [editTaxCharge21To30Km, setEditTaxCharge21To30Km] = useState('');
  const [editVendorMinOrderQty, setEditVendorMinOrderQty] = useState('');
  const [editVendorMaxOrderQty, setEditVendorMaxOrderQty] = useState('');
  const [savingDeliverySettings, setSavingDeliverySettings] = useState(false);
  const [riders, setRiders] = useState([]);
  const [ridersLoading, setRidersLoading] = useState(false);
  const [riderNameInput, setRiderNameInput] = useState('');
  const [riderEmailInput, setRiderEmailInput] = useState('');
  const [riderPhoneInput, setRiderPhoneInput] = useState('');
  const [riderAddressInput, setRiderAddressInput] = useState('');
  const [riderPasswordInput, setRiderPasswordInput] = useState('');
  const [riderPhotoFile, setRiderPhotoFile] = useState(null);
  const [addRiderModalVisible, setAddRiderModalVisible] = useState(false);
  const [creatingRider, setCreatingRider] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryVideoModal, setGalleryVideoModal] = useState(null);
  const [galleryEngagePhoto, setGalleryEngagePhoto] = useState(null);
  const [galleryPreviewVisible, setGalleryPreviewVisible] = useState(false);
  const [galleryPreviewItem, setGalleryPreviewItem] = useState(null);
  const [commentsModalGalleryPhotoId, setCommentsModalGalleryPhotoId] =
    useState(null);
  const [ownerVideos, setOwnerVideos] = useState([]);
  const [ownerVideosLoading, setOwnerVideosLoading] = useState(false);
  const [notificationsModalVisible, setNotificationsModalVisible] =
    useState(false);
  const [areaUsers, setAreaUsers] = useState([]);
  const [areaUsersLoading, setAreaUsersLoading] = useState(false);
  const [areaUsersMeta, setAreaUsersMeta] = useState({
    radiusKm: null,
    ownerAddress: '',
    message: '',
    total: 0,
  });
  const [promotions, setPromotions] = useState([]);
  const [promotionsLoading, setPromotionsLoading] = useState(false);
  const [promotionsRefreshing, setPromotionsRefreshing] = useState(false);
  const [nearbyPromotionsCross, setNearbyPromotionsCross] = useState([]);
  const [nearbyPromotionsCrossLoading, setNearbyPromotionsCrossLoading] =
    useState(false);
  const [nearbyPromotionsCrossRefreshing, setNearbyPromotionsCrossRefreshing] =
    useState(false);
  const [createPromotionModalVisible, setCreatePromotionModalVisible] =
    useState(false);
  const [promotionSubTab, setPromotionSubTab] = useState('order'); // order | booking | both
  const [createTierDiscountModalVisible, setCreateTierDiscountModalVisible] =
    useState(false);
  const [editingPromotion, setEditingPromotion] = useState(null);
  const [promotionDetailModalVisible, setPromotionDetailModalVisible] =
    useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState(null);
  const [promotionVideoPaused, setPromotionVideoPaused] = useState(true);
  const promotionVideoRef = useRef(null);
  const [menuItems, setMenuItems] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [menuFiles, setMenuFiles] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);

  const [postActionVisible, setPostActionVisible] = useState(false);
  const [postEditVisible, setPostEditVisible] = useState(false);
  const [postActionTarget, setPostActionTarget] = useState(null);
  const [postEditTitle, setPostEditTitle] = useState('');
  const [postEditDescription, setPostEditDescription] = useState('');
  const [postEditWebsite, setPostEditWebsite] = useState('');
  const [postEditHashtags, setPostEditHashtags] = useState('');
  const [postEditThumbnailUri, setPostEditThumbnailUri] = useState('');
  const [postEditVideoUri, setPostEditVideoUri] = useState('');
  const [postEditSaving, setPostEditSaving] = useState(false);
  const [itemActionVisible, setItemActionVisible] = useState(false);
  const [itemEditVisible, setItemEditVisible] = useState(false);
  const [itemActionTarget, setItemActionTarget] = useState(null); // { kind: 'promotion'|'video'|'menu'|'menuFile', item }
  const [itemEditTitle, setItemEditTitle] = useState('');
  const [itemEditDescription, setItemEditDescription] = useState('');
  const [itemEditPrice, setItemEditPrice] = useState('');
  const [itemEditPromoCode, setItemEditPromoCode] = useState('');
  const [itemEditPromoAmount, setItemEditPromoAmount] = useState('');
  const [itemEditThumbnailUri, setItemEditThumbnailUri] = useState('');
  const [itemEditVideoUri, setItemEditVideoUri] = useState('');
  const [itemEditCategoryId, setItemEditCategoryId] = useState('');
  const [itemEditAllergens, setItemEditAllergens] = useState([]);
  const [itemEditAllergenIconUrls, setItemEditAllergenIconUrls] = useState([]);
  const [itemEditAllergenIconUploading, setItemEditAllergenIconUploading] =
    useState(false);
  const [itemEditSelectedMenuIds, setItemEditSelectedMenuIds] = useState([]);
  const [itemEditSaving, setItemEditSaving] = useState(false);
  const [postMediaPreviewVisible, setPostMediaPreviewVisible] = useState(false);
  const [postMediaPreviewUri, setPostMediaPreviewUri] = useState(null);
  const [postMediaPreviewType, setPostMediaPreviewType] = useState('image');
  const [postMediaPreviewPostId, setPostMediaPreviewPostId] = useState(null);
  const tabsScrollRef = useRef(null);
  const tabLayoutsRef = useRef({});
  const tabsViewportWidthRef = useRef(0);

  const scrollActiveTabIntoView = useCallback(tab => {
    const layout = tabLayoutsRef.current?.[tab];
    const viewportWidth = tabsViewportWidthRef.current || 0;
    if (!layout || !viewportWidth || !tabsScrollRef.current?.scrollTo) return;

    const centeredX = layout.x - (viewportWidth - layout.width) / 2;
    tabsScrollRef.current.scrollTo({
      x: Math.max(0, centeredX),
      animated: true,
    });
  }, []);

  const loadPosts = useCallback(
    async (refresh = false) => {
      if (!profileUserId) {
        setPosts([]);
        return;
      }
      if (refresh) setPostsRefreshing(true);
      else setPostsLoading(true);
      try {
        const [postRes, shortRes] = await Promise.all([
          getPostsByUser(profileUserId, 1, 50, currentUser?.id),
          shortsService.getUserShorts(profileUserId, 1, 50, currentUser?.id),
        ]);
        const postItems = (postRes?.posts || []).map(p =>
          mapPostToCard(p, p.user),
        );
        const postMediaUrls = new Set(
          postItems
            .map(p => String(p?.mediaUrl || '').trim())
            .filter(Boolean),
        );
        const shortItems = (shortRes?.shorts || [])
          .map(s => mapShortToPostCard(s, s.user, profileUserId))
          .filter(s => {
            const url = String(s?.mediaUrl || s?.videoUrl || '').trim();
            return url && !postMediaUrls.has(url);
          });
        const merged = [...postItems, ...shortItems].sort(
          (a, b) => (b?.sortTime || 0) - (a?.sortTime || 0),
        );
        setPosts(merged);
      } catch (e) {
        setPosts([]);
      } finally {
        setPostsLoading(false);
        setPostsRefreshing(false);
      }
    },
    [profileUserId, currentUser?.id],
  );

  const buildProfileMediaFeed = useCallback(() => {
    const fromOwner = buildOwnerScopedShortsFeed(ownerVideos, profileUserId);
    const seenIds = new Set(fromOwner.map(v => String(v.id)));
    const seenUrls = new Set(
      fromOwner.map(v => String(v.videoUrl || '').trim()).filter(Boolean),
    );
    const fromPosts = (posts || [])
      .filter(p => {
        const st = String(p?.sourceType || '').toLowerCase();
        const mt = String(p?.mediaType || '').toLowerCase();
        const url = String(p?.mediaUrl || p?.videoUrl || '').trim();
        if (!url) return false;
        const id = String(p?.shortId || p?.id || '');
        if (id && seenIds.has(id)) return false;
        if (seenUrls.has(url)) return false;
        return (
          st === 'short' ||
          mt === 'short' ||
          mt === 'video' ||
          /\.(mp4|mov|m4v|webm|mkv)(\?|$)/i.test(url)
        );
      })
      .map(p => ({
        id: p.shortId || p.id,
        userId: p.userId || profileUserId,
        videoUrl: String(p.mediaUrl || p.videoUrl || '').trim(),
        thumbnailUrl: p.thumbnail,
        _type:
          String(p?.sourceType || p?.mediaType || '').toLowerCase() === 'short'
            ? 'short'
            : 'video',
        title: p.title,
        publishedAt: p.publishedAt,
        sortTime: p.sortTime,
      }));
    return [...fromOwner, ...fromPosts].sort((a, b) => {
      const ta =
        a.sortTime ||
        new Date(a.publishedAt || a.createdAt || 0).getTime() ||
        0;
      const tb =
        b.sortTime ||
        new Date(b.publishedAt || b.createdAt || 0).getTime() ||
        0;
      return tb - ta;
    });
  }, [ownerVideos, posts, profileUserId]);

  const openOwnerMediaPlayer = useCallback(
    (mediaId, { rawItem, videoUrl, mediaType = 'video' } = {}) => {
      const mid = String(mediaId || rawItem?.id || rawItem?.shortId || '').trim();
      const url = String(
        videoUrl || rawItem?.videoUrl || rawItem?.mediaUrl || '',
      ).trim();
      if (!mid || !url) return;
      const fallbackName =
        profile?.nickname || profile?.channelName || profile?.name || 'User';
      const isShort =
        String(mediaType || rawItem?.sourceType || rawItem?._type || '')
          .toLowerCase()
          .includes('short') ||
        String(rawItem?.mediaType || '').toLowerCase() === 'short';
      const initialShortItem = {
        ...(rawItem && typeof rawItem === 'object' ? rawItem : {}),
        id: mid,
        type: isShort ? 'short' : 'video',
        _type: isShort ? 'short' : 'video',
        userId: rawItem?.userId || profileUserId,
        videoUrl: url,
        user: rawItem?.user || {
          id: profileUserId,
          nickname: fallbackName,
          name: profile?.name || fallbackName,
        },
      };
      const scopedShortsFeed = buildProfileMediaFeed();
      const feed =
        scopedShortsFeed.length > 0
          ? scopedShortsFeed
          : [
              {
                id: mid,
                userId: profileUserId,
                videoUrl: url,
                _type: isShort ? 'short' : 'video',
              },
            ];
      navigateToScopedShortsPlayer(navigation, {
        shortId: mid,
        initialShortItem,
        shortsFeedMode: 'owner',
        scopedShortsFeed: feed,
        returnTo: 'business_profile',
        returnUserId: profileUserId,
      });
    },
    [navigation, profileUserId, profile, buildProfileMediaFeed],
  );

  const openShortFromPostsTab = useCallback(
    item => {
      const sid = String(item?.shortId || item?.id || '').trim();
      if (!sid) return;
      openOwnerMediaPlayer(sid, {
        rawItem: item,
        videoUrl: item?.videoUrl || item?.mediaUrl,
        mediaType: 'short',
      });
    },
    [openOwnerMediaPlayer],
  );

  useEffect(() => {
    if (activeTab === 'Posts' && profileUserId) {
      loadPosts();
    }
  }, [activeTab, profileUserId, loadPosts]);

  const loadGallery = useCallback(async () => {
    if (!profileUserId) return;
    setGalleryLoading(true);
    try {
      const res = await getGallery(profileUserId, currentUser?.id);
      setGalleryPhotos(res?.photos ?? []);
    } catch (e) {
      setGalleryPhotos([]);
    } finally {
      setGalleryLoading(false);
    }
  }, [profileUserId, currentUser?.id]);

  const loadOwnerVideos = useCallback(async () => {
    if (!profileUserId) return;
    setOwnerVideosLoading(true);
    try {
      const visibility = viewerProfileContentParams(currentUser, {
        latitude: profile?.latitude,
        longitude: profile?.longitude,
      });
      const [vRes, sRes] = await Promise.all([
        getUserVideos(profileUserId, 1, 50, currentUser?.id, visibility),
        shortsService.getUserShorts(
          profileUserId,
          1,
          50,
          currentUser?.id,
          visibility,
        ),
      ]);
      const videos = (vRes?.videos ?? []).map(v => ({
        ...v,
        id: v.id,
        _type: 'video',
        title: v.title,
        thumbnail: v.thumbnailUrl,
        views: formatCount(v.viewCount),
        duration: v.duration
          ? `${Math.floor(v.duration / 60)}:${String(v.duration % 60).padStart(
              2,
              '0',
            )}`
          : '',
      }));
      const shorts = (sRes?.shorts ?? []).map(s => ({
        ...s,
        id: s.id,
        _type: 'short',
        title: s.title || 'Short',
        thumbnail: s.thumbnailUrl || s.coverUrl,
        views: formatCount(s.viewCount),
        duration: s.duration
          ? `${Math.floor(s.duration / 60)}:${String(s.duration % 60).padStart(
              2,
              '0',
            )}`
          : '',
      }));
      setOwnerVideos([...videos, ...shorts]);
    } catch (e) {
      setOwnerVideos([]);
    } finally {
      setOwnerVideosLoading(false);
    }
  }, [
    profileUserId,
    currentUser,
    profile?.latitude,
    profile?.longitude,
  ]);

  useEffect(() => {
    const sub = shortsService.onShortUpdated?.(updated => {
      const sid = String(updated?.id || '').trim();
      if (!sid) return;
      setOwnerVideos(prev =>
        prev.map(v => {
          if (String(v?.id) !== sid) return v;
          const vType = String(v?._type || v?.type || '').toLowerCase();
          if (vType && vType !== 'short') return v;
          return {
            ...v,
            title: updated?.title ?? v.title,
            description: updated?.description ?? v.description,
            thumbnail:
              updated?.thumbnailUrl ?? updated?.coverUrl ?? v.thumbnail,
            thumbnailUrl:
              updated?.thumbnailUrl ?? updated?.coverUrl ?? v.thumbnailUrl,
            coverUrl: updated?.coverUrl ?? updated?.thumbnailUrl ?? v.coverUrl,
            videoUrl: updated?.videoUrl ?? v.videoUrl,
            mediaUrl: updated?.videoUrl ?? updated?.mediaUrl ?? v.mediaUrl,
            visibility: updated?.visibility ?? v.visibility,
            commentSetting: updated?.commentSetting ?? v.commentSetting,
            publishedAt: updated?.publishedAt ?? v.publishedAt,
          };
        }),
      );
    });
    return () => sub?.remove?.();
  }, []);

  const combinedGalleryFeed = useMemo(() => {
    const ownerIds = new Set(
      (ownerVideos || []).map(v => String(v?.id || '')).filter(Boolean),
    );
    const ownerMediaUrls = new Set(
      (ownerVideos || [])
        .map(v => String(v?.videoUrl || '').trim())
        .filter(Boolean),
    );
    const postItems = (posts || [])
      .filter(p => {
        const st = String(p?.sourceType || '').toLowerCase();
        if (st === 'short') return false;
        const media = String(p?.mediaUrl || '').trim();
        if (media && ownerMediaUrls.has(media)) return false;
        const pid = String(p?.id || '');
        if (pid && ownerIds.has(pid)) return false;
        return true;
      })
      .map(p => {
      const media = String(p?.mediaUrl || '').trim();
      const mt = String(p?.mediaType || '').toLowerCase();
      const isVideo =
        mt === 'video' || /\.(mp4|mov|m4v|webm|mkv)(\?|$)/i.test(media);
      return {
        id: `post-${p.id}`,
        originId: p.id,
        sourceType: 'post',
        title: p?.title || 'Post',
        description: String(p?.description || '').trim(),
        subtitle: p.publishedAt,
        mediaType: isVideo ? 'video' : 'image',
        mediaUrl: media,
        thumbnail: safeImageUri(
          p?.thumbnail || p.mediaUrl,
          IMAGE_PLACEHOLDER,
        ),
        isScheduled: isFutureScheduledMedia(p),
        createdAt: p.sortTime || Date.now(),
      };
    });
    const videoItems = (ownerVideos || []).map(v => ({
      id: `video-${v.id}`,
      originId: v.id,
      sourceType: 'video',
      title: v?.title || 'Video',
      subtitle: '',
      mediaType: 'video',
      mediaUrl: String(v?.videoUrl || '').trim(),
      thumbnail: safeImageUri(
        v?.thumbnail || v?.thumbnailUrl,
        IMAGE_PLACEHOLDER,
      ),
      type: v?._type || '',
      isShort: v?._type === 'short',
      isScheduled: isFutureScheduledMedia(v),
      createdAt:
        new Date(v?.publishedAt || v?.createdAt || 0).getTime() || Date.now(),
    }));
    const galleryItems = (galleryPhotos || []).map(g => ({
      id: `gallery-${g.id}`,
      originId: g.id,
      sourceType: 'gallery',
      title: 'Photo',
      subtitle: formatTimeAgo(g?.createdAt),
      mediaType: 'image',
      mediaUrl: String(g?.src || '').trim(),
      thumbnail: safeImageUri(g?.src, IMAGE_PLACEHOLDER),
      createdAt: new Date(g?.createdAt || 0).getTime() || Date.now(),
      likeCount: g.likeCount ?? 0,
      dislikeCount: g.dislikeCount ?? 0,
      commentCount: g.commentCount ?? 0,
      shareCount: g.shareCount ?? 0,
      isLiked: g.isLiked ?? false,
      isDisliked: g.isDisliked ?? false,
    }));
    return [...postItems, ...videoItems, ...galleryItems]
      .filter(item => isOwnProfile || !item.isScheduled)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [posts, ownerVideos, galleryPhotos, isOwnProfile]);

  const patchGalleryPhoto = useCallback((photoId, updater) => {
    setGalleryPhotos(prev =>
      prev.map(p => (String(p.id) === String(photoId) ? updater(p) : p)),
    );
  }, []);

  const syncBPGalleryEngageFromServer = useCallback(
    async pid => {
      if (!profileUserId || !pid) return;
      try {
        const res = await getGallery(profileUserId, currentUser?.id);
        const photos = res?.photos ?? [];
        setGalleryPhotos(photos);
        const fresh = photos.find(g => String(g.id) === String(pid));
        if (!fresh) return;
        setGalleryEngagePhoto(fresh);
        setGalleryPreviewItem(it =>
          it && String(it.originId) === String(pid)
            ? {
                ...it,
                likeCount: fresh.likeCount,
                dislikeCount: fresh.dislikeCount,
                commentCount: fresh.commentCount,
                shareCount: fresh.shareCount,
                isLiked: fresh.isLiked,
                isDisliked: fresh.isDisliked,
              }
            : it,
        );
      } catch (_) {}
    },
    [profileUserId, currentUser?.id],
  );

  const currentRole = (currentUser?.role || '').toLowerCase();
  const isOwnerOrVendor = currentRole === 'owner' || currentRole === 'vendor';
  const isVendor = currentRole === 'vendor';

  const notificationUserId =
    isOwnProfile && isOwnerOrVendor && profileUserId ? profileUserId : null;
  const {
    notifications,
    unreadCount: unreadNotificationCount,
    loading: notificationsLoading,
    refresh: loadNotifications,
  } = useNotifications(notificationUserId);

  const loadPromotions = useCallback(
    async (refresh = false) => {
      if (!profileUserId) {
        setPromotions([]);
        return;
      }
      if (refresh) setPromotionsRefreshing(true);
      else setPromotionsLoading(true);
      try {
        const res = await getPromotionsByUser(profileUserId, 1, 50);
        setPromotions(res?.promotions ?? []);
      } catch (e) {
        setPromotions([]);
      } finally {
        setPromotionsLoading(false);
        setPromotionsRefreshing(false);
      }
    },
    [profileUserId],
  );

  const loadAreaUsers = useCallback(async () => {
    if (!profileUserId || !isOwnProfile || !isOwnerOrVendor) {
      setAreaUsers([]);
      return;
    }
    setAreaUsersLoading(true);
    try {
      const data = await getDeliveryAreaUsers(profileUserId, 1, 100);
      setAreaUsers(Array.isArray(data?.items) ? data.items : []);
      setAreaUsersMeta({
        radiusKm: data?.radiusKm ?? null,
        ownerAddress: data?.ownerAddress ?? profile?.address ?? '',
        message: data?.message ?? '',
        total: data?.total ?? 0,
      });
    } catch (error) {
      setAreaUsers([]);
      const rawMsg =
        error?.message ??
        (typeof error === 'string' ? error : 'Could not load area users');
      setAreaUsersMeta(prev => ({
        ...prev,
        message: String(rawMsg),
      }));
    } finally {
      setAreaUsersLoading(false);
    }
  }, [profileUserId, isOwnProfile, isOwnerOrVendor, profile?.address]);

  const handleNotificationBellPress = useCallback(() => {
    if (!isOwnProfile || !isOwnerOrVendor) return;
    setNotificationsModalVisible(true);
    loadNotifications();
  }, [isOwnProfile, isOwnerOrVendor, loadNotifications]);

  const loadNearbyPromotionsCross = useCallback(
    async (refresh = false) => {
      if (!isOwnProfile || !currentUser?.id || !isOwnerOrVendor) {
        setNearbyPromotionsCross([]);
        return;
      }
      if (refresh) setNearbyPromotionsCrossRefreshing(true);
      else setNearbyPromotionsCrossLoading(true);
      const lat = currentUser?.latitude ?? profile?.latitude ?? 23.8103;
      const lng = currentUser?.longitude ?? profile?.longitude ?? 90.4125;
      const creatorRole = currentRole === 'owner' ? 'vendor' : 'owner';
      try {
        const res = await getNearbyPromotions(lat, lng, 50, 1, 50, creatorRole);
        setNearbyPromotionsCross(res?.promotions ?? []);
      } catch (e) {
        setNearbyPromotionsCross([]);
      } finally {
        setNearbyPromotionsCrossLoading(false);
        setNearbyPromotionsCrossRefreshing(false);
      }
    },
    [
      isOwnProfile,
      currentUser?.id,
      currentUser?.latitude,
      currentUser?.longitude,
      currentRole,
      profile?.latitude,
      profile?.longitude,
    ],
  );

  useEffect(() => {
    if (activeTab === 'Photos' && profileUserId) loadGallery();
  }, [activeTab, profileUserId, loadGallery]);

  useEffect(() => {
    if (activeTab === 'Gallery' && profileUserId) {
      loadGallery();
      loadPosts();
      loadOwnerVideos();
    }
  }, [activeTab, profileUserId, loadGallery, loadPosts, loadOwnerVideos]);

  useEffect(() => {
    if (activeTab === 'Video' && profileUserId) loadOwnerVideos();
  }, [activeTab, profileUserId, loadOwnerVideos]);

  useEffect(() => {
    if (activeTab === 'Notification' && profileUserId) loadNotifications();
  }, [activeTab, profileUserId, loadNotifications]);

  useEffect(() => {
    if (
      activeTab === 'Area Users' &&
      profileUserId &&
      isOwnProfile &&
      isOwnerOrVendor
    ) {
      loadAreaUsers();
    }
  }, [
    activeTab,
    profileUserId,
    isOwnProfile,
    isOwnerOrVendor,
    loadAreaUsers,
  ]);

  const loadRiders = useCallback(async () => {
    if (!profileUserId || !isOwnProfile || !isOwnerOrVendor) {
      setRiders([]);
      return;
    }
    setRidersLoading(true);
    try {
      const res = await listOwnerRiders(profileUserId);
      setRiders(res?.riders ?? []);
    } catch {
      setRiders([]);
    } finally {
      setRidersLoading(false);
    }
  }, [profileUserId, isOwnProfile, isOwnerOrVendor]);

  useEffect(() => {
    if (
      activeTab === 'Riders' &&
      profileUserId &&
      isOwnProfile &&
      isOwnerOrVendor
    ) {
      loadRiders();
    }
  }, [activeTab, profileUserId, isOwnProfile, isOwnerOrVendor, loadRiders]);

  const resetRiderForm = useCallback(() => {
    setRiderNameInput('');
    setRiderEmailInput('');
    setRiderPhoneInput('');
    setRiderAddressInput('');
    setRiderPasswordInput('');
    setRiderPhotoFile(null);
  }, []);

  const openAddRiderModal = useCallback(() => {
    resetRiderForm();
    setAddRiderModalVisible(true);
  }, [resetRiderForm]);

  const closeAddRiderModal = useCallback(() => {
    if (creatingRider) return;
    setAddRiderModalVisible(false);
    resetRiderForm();
  }, [creatingRider, resetRiderForm]);

  const handlePickRiderPhoto = useCallback(async () => {
    try {
      const file = await pickProfileAvatarCrop();
      if (file) setRiderPhotoFile(file);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not process image');
    }
  }, []);

  const handleCreateRider = async () => {
    if (!profileUserId) return;
    const email = String(riderEmailInput || '').trim();
    const password = String(riderPasswordInput || '').trim();
    const name = String(riderNameInput || '').trim();
    if (!name) {
      Alert.alert('Required', 'Rider name is required.');
      return;
    }
    if (!email || !password) {
      Alert.alert('Required', 'Email and password are required for the rider.');
      return;
    }
    setCreatingRider(true);
    try {
      const res = await createOwnerRider(profileUserId, {
        email,
        password,
        name,
        phone: riderPhoneInput.trim() || undefined,
        address: riderAddressInput.trim() || undefined,
      });
      const riderId = res?.rider?.id;
      if (riderPhotoFile && riderId) {
        await uploadOwnerRiderAvatar(profileUserId, riderId, riderPhotoFile);
      }
      setAddRiderModalVisible(false);
      resetRiderForm();
      await loadRiders();
      Alert.alert('Success', 'Rider account created.');
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to create rider';
      Alert.alert('Error', Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setCreatingRider(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'Promotions' && profileUserId) {
      loadPromotions();
    }
  }, [
    activeTab,
    profileUserId,
    loadPromotions,
  ]);

  const loadMenu = useCallback(async () => {
    if (!profileUserId) return;
    setMenuLoading(true);
    try {
      const [res, filesRes] = await Promise.all([
        getMenuByUserId(profileUserId),
        currentUser?.token
          ? getMenuFiles(currentUser.token, profileUserId).catch(() => ({
              files: [],
            }))
          : Promise.resolve({ files: [] }),
      ]);
      setMenuItems(
        (res?.menu ?? []).map(m =>
          normalizeMenuItemFromApi(m, res?.categories ?? []),
        ),
      );
      setMenuCategories(res?.categories ?? []);
      setMenuFiles(filesRes?.files ?? []);
    } catch (e) {
      setMenuItems([]);
      setMenuCategories([]);
      setMenuFiles([]);
    } finally {
      setMenuLoading(false);
    }
  }, [profileUserId, currentUser?.token]);

  useEffect(() => {
    if (activeTab === 'Menus' && profileUserId) loadMenu();
  }, [activeTab, profileUserId, loadMenu]);

  useEffect(() => {
    const t = setTimeout(() => scrollActiveTabIntoView(activeTab), 0);
    return () => clearTimeout(t);
  }, [activeTab, isOwnProfile, isOwnerOrVendor, scrollActiveTabIntoView]);

  // Refetch menu when screen gains focus (e.g. returning from MenuManageScreen) so Menus tab shows updated data
  useFocusEffect(
    useCallback(() => {
      if (activeTab === 'Menus' && profileUserId) loadMenu();
    }, [activeTab, profileUserId, loadMenu]),
  );

  // After full video detail (HomeOne) back → return to Video tab
  useFocusEffect(
    useCallback(() => {
      if (route.params?.focusVideoTab) {
        setActiveTab('Video');
        navigation.setParams({ focusVideoTab: undefined });
      }
    }, [route.params?.focusVideoTab, navigation]),
  );

  const handleGalleryUpload = useCallback(() => {
    if (!profileUserId || profileUserId !== currentUser?.id || galleryUploading)
      return;
    launchImageLibrary(
      { mediaType: 'photo', selectionLimit: 10 },
      async res => {
        if (res.didCancel || res.errorCode || !res.assets?.length) return;
        setGalleryUploading(true);
        try {
          await uploadGallery(
            profileUserId,
            res.assets.map(a => ({
              uri: a.uri,
              type: a.type || 'image/jpeg',
              name: a.fileName || 'photo.jpg',
            })),
          );
          await loadGallery();
        } catch (e) {
          Alert.alert('Error', e?.message || 'Failed to upload photos');
        } finally {
          setGalleryUploading(false);
        }
      },
    );
  }, [profileUserId, currentUser?.id, galleryUploading, loadGallery]);

  const handleDeleteGalleryPhoto = useCallback(
    async photoId => {
      if (!profileUserId || profileUserId !== currentUser?.id) return;
      Alert.alert('Delete photo', 'Remove this photo from your gallery?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteGalleryPhoto(profileUserId, photoId);
              setGalleryPhotos(prev => prev.filter(p => p.id !== photoId));
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to delete');
            }
          },
        },
      ]);
    },
    [profileUserId, currentUser?.id],
  );

  const loadProfile = useCallback(async () => {
    if (!profileUserId) return;
    setProfileLoading(true);
    try {
      const data = await getChannelProfile(profileUserId, currentUser?.id);
      setProfile(data);
    } catch (e) {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [profileUserId, currentUser?.id]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (!profile || !isOwnProfile) return;
    setEditDeliveryTime(String(profile.deliveryTime || ''));
    setEditContentAreaKm(
      profile.contentAreaKm != null &&
        Number.isFinite(Number(profile.contentAreaKm))
        ? String(profile.contentAreaKm)
        : '',
    );
    setEditPickupAreaKm(
      profile.pickupAreaKm != null &&
        Number.isFinite(Number(profile.pickupAreaKm))
        ? String(profile.pickupAreaKm)
        : '',
    );
    setEditDeliveryAreaKm(
      profile.deliveryAreaKm != null &&
        Number.isFinite(Number(profile.deliveryAreaKm))
        ? String(profile.deliveryAreaKm)
        : '',
    );
    setEditTaxCharge0To10Km(
      profile.taxCharge0To10Km != null &&
        Number.isFinite(Number(profile.taxCharge0To10Km))
        ? String(profile.taxCharge0To10Km)
        : '',
    );
    setEditTaxCharge11To20Km(
      profile.taxCharge11To20Km != null &&
        Number.isFinite(Number(profile.taxCharge11To20Km))
        ? String(profile.taxCharge11To20Km)
        : '',
    );
    setEditTaxCharge21To30Km(
      profile.taxCharge21To30Km != null &&
        Number.isFinite(Number(profile.taxCharge21To30Km))
        ? String(profile.taxCharge21To30Km)
        : '',
    );
    setEditVendorMinOrderQty(
      profile.vendorMinOrderQty != null &&
        Number.isFinite(Number(profile.vendorMinOrderQty))
        ? String(profile.vendorMinOrderQty)
        : '',
    );
    setEditVendorMaxOrderQty(
      profile.vendorMaxOrderQty != null &&
        Number.isFinite(Number(profile.vendorMaxOrderQty))
        ? String(profile.vendorMaxOrderQty)
        : '',
    );
  }, [profile, isOwnProfile]);

  const parseOptionalTaxCharge = raw => {
    const text = String(raw || '').trim();
    if (!text) return { value: undefined, invalid: false };
    const n = Number(text);
    if (!Number.isFinite(n) || n < 0) return { value: null, invalid: true };
    return { value: n, invalid: false };
  };

  const parseOptionalVendorQty = raw => {
    const text = String(raw || '').trim();
    if (!text) return { value: null, invalid: false };
    const n = Number(text);
    if (!Number.isFinite(n) || n < 1 || !Number.isInteger(n)) {
      return { value: null, invalid: true };
    }
    return { value: n, invalid: false };
  };

  const saveDeliverySettings = async () => {
    if (!profileUserId || profileUserId !== currentUser?.id) return;
    const contentRaw = String(editContentAreaKm || '').trim();
    const pickupRaw = String(editPickupAreaKm || '').trim();
    const areaRaw = String(editDeliveryAreaKm || '').trim();
    const contentAreaKm = contentRaw ? Number(contentRaw) : undefined;
    const pickupAreaKm = pickupRaw ? Number(pickupRaw) : undefined;
    const deliveryAreaKm = areaRaw ? Number(areaRaw) : undefined;
    if (
      contentRaw &&
      (!Number.isFinite(contentAreaKm) || contentAreaKm <= 0)
    ) {
      Alert.alert('Invalid area', 'Enter content/browse area in km (e.g. 20).');
      return;
    }
    if (pickupRaw && (!Number.isFinite(pickupAreaKm) || pickupAreaKm <= 0)) {
      Alert.alert('Invalid area', 'Enter pickup area in km (e.g. 10).');
      return;
    }
    if (areaRaw && (!Number.isFinite(deliveryAreaKm) || deliveryAreaKm <= 0)) {
      Alert.alert('Invalid area', 'Enter delivery area in km (e.g. 15).');
      return;
    }
    const tier0 = parseOptionalTaxCharge(editTaxCharge0To10Km);
    const tier1 = parseOptionalTaxCharge(editTaxCharge11To20Km);
    const tier2 = parseOptionalTaxCharge(editTaxCharge21To30Km);
    if (tier0.invalid || tier1.invalid || tier2.invalid) {
      Alert.alert(
        'Invalid tax/charge',
        'Enter valid amounts for distance tiers (0 or greater).',
      );
      return;
    }
    const vendorMin = parseOptionalVendorQty(editVendorMinOrderQty);
    const vendorMax = parseOptionalVendorQty(editVendorMaxOrderQty);
    if (isVendor && (vendorMin.invalid || vendorMax.invalid)) {
      Alert.alert(
        'Invalid order quantity',
        'Enter whole numbers of 1 or more for min/max per item, or leave blank.',
      );
      return;
    }
    if (
      isVendor &&
      vendorMin.value != null &&
      vendorMax.value != null &&
      vendorMin.value > vendorMax.value
    ) {
      Alert.alert(
        'Invalid order quantity',
        'Minimum per item cannot be greater than maximum per item.',
      );
      return;
    }
    setSavingDeliverySettings(true);
    try {
      await updateChannelProfile(profileUserId, {
        deliveryTime: editDeliveryTime.trim() || undefined,
        contentAreaKm,
        pickupAreaKm,
        deliveryAreaKm,
        taxCharge0To10Km: tier0.value,
        taxCharge11To20Km: tier1.value,
        taxCharge21To30Km: tier2.value,
        ...(isVendor
          ? {
              vendorMinOrderQty: vendorMin.value,
              vendorMaxOrderQty: vendorMax.value,
            }
          : {}),
      });
      await loadProfile();
      if (currentUser?.id === profileUserId) {
        dispatch(
          appSetUser({
            ...currentUser,
            deliveryTime: editDeliveryTime.trim() || currentUser.deliveryTime,
            contentAreaKm:
              contentAreaKm != null
                ? contentAreaKm
                : currentUser.contentAreaKm,
            pickupAreaKm:
              pickupAreaKm != null ? pickupAreaKm : currentUser.pickupAreaKm,
            deliveryAreaKm:
              deliveryAreaKm != null
                ? deliveryAreaKm
                : currentUser.deliveryAreaKm,
            taxCharge0To10Km:
              tier0.value != null ? tier0.value : currentUser.taxCharge0To10Km,
            taxCharge11To20Km:
              tier1.value != null ? tier1.value : currentUser.taxCharge11To20Km,
            taxCharge21To30Km:
              tier2.value != null ? tier2.value : currentUser.taxCharge21To30Km,
            ...(isVendor
              ? {
                  vendorMinOrderQty: vendorMin.value,
                  vendorMaxOrderQty: vendorMax.value,
                }
              : {}),
          }),
        );
      }
      Alert.alert(
        'Saved',
        isVendor
          ? 'Area, delivery, and order quantity settings updated.'
          : 'Area and delivery settings updated.',
      );
      if (activeTab === 'Area Users') loadAreaUsers();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Failed to save delivery settings';
      Alert.alert('Error', Array.isArray(msg) ? msg.join(', ') : String(msg));
    } finally {
      setSavingDeliverySettings(false);
    }
  };

  const handleProfileSubscribe = useCallback(async () => {
    if (!currentUser?.id || !profileUserId || isOwnProfile || !profile) return;
    setProfileSubscribeLoading(true);
    try {
      if (profile.isSubscribed) {
        await unsubscribeFromChannel(currentUser.id, profileUserId);
        setProfile(prev =>
          prev
            ? {
                ...prev,
                isSubscribed: false,
                subscriberCount: Math.max(0, (prev.subscriberCount ?? 0) - 1),
              }
            : prev,
        );
      } else {
        await subscribeToChannel(currentUser.id, profileUserId);
        setProfile(prev =>
          prev
            ? {
                ...prev,
                isSubscribed: true,
                subscriberCount: (prev.subscriberCount ?? 0) + 1,
              }
            : prev,
        );
      }
    } catch (_) {
      loadProfile();
    } finally {
      setProfileSubscribeLoading(false);
    }
  }, [
    currentUser?.id,
    profileUserId,
    isOwnProfile,
    profile,
    loadProfile,
  ]);

  const profileIsBlocked = isUserBlocked(blockedUserIds, profileUserId);

  const handleBlockUser = useCallback(() => {
    if (!currentUser?.id) {
      Alert.alert('Login required', 'Please login to continue.');
      return;
    }
    if (!profileUserId) {
      Alert.alert('Unavailable', 'Could not find this profile to block.');
      return;
    }
    if (isOwnProfile) {
      Alert.alert('Not allowed', 'You cannot block your own profile.');
      return;
    }
    if (profileIsBlocked) {
      Alert.alert(
        'User blocked',
        'You have already blocked this user. Their content is hidden from your feed.',
      );
      return;
    }
    const displayName =
      profile?.channelName || profile?.nickname || profile?.name || 'this user';
    Alert.alert(
      'Block user?',
      `You will no longer see videos, posts, or messages from ${displayName}.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(profileUserId);
              Alert.alert(
                'User blocked',
                'Their content has been removed from your feed.',
                [{ text: 'OK', onPress: () => navigation.goBack() }],
              );
            } catch (error) {
              Alert.alert(
                'Could not block user',
                error?.message || 'Please try again.',
              );
            }
          },
        },
      ],
    );
  }, [
    currentUser?.id,
    profileUserId,
    isOwnProfile,
    profileIsBlocked,
    profile,
    navigation,
  ]);

  const openVideoDetails = useCallback(
    item => {
      if (!item?.id) return;
      openOwnerMediaPlayer(item.id, {
        rawItem: item,
        videoUrl: item?.videoUrl || item?.video_url,
        mediaType: item?._type || item?.type || 'video',
      });
    },
    [openOwnerMediaPlayer],
  );

  useEffect(() => {
    if (!editProfileVisible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (savingProfile) return true;
      setEditProfileVisible(false);
      return true;
    });
    return () => sub.remove();
  }, [editProfileVisible, savingProfile]);

  const runAwayFromReactModal = useCallback(async work => {
    await new Promise(resolve => setTimeout(resolve, 120));
    await work();
  }, []);

  const openEditProfile = () => {
    setEditName(
      profile?.name ??
        profile?.nickname ??
        profile?.channelName ??
        currentUser?.name ??
        currentUser?.nickname ??
        '',
    );
    setEditChannelAbout(
      profile?.channelAbout ?? currentUser?.channelAbout ?? '',
    );
    setEditPhone(currentUser?.phone ?? profile?.phone ?? '');
    setEditAddress(profile?.address ?? currentUser?.address ?? '');
    setEditPostcode(profile?.postcode ?? currentUser?.postcode ?? '');
    setEditLatitude(profile?.latitude ?? currentUser?.latitude ?? null);
    setEditLongitude(profile?.longitude ?? currentUser?.longitude ?? null);
    const links = profile?.socialLinks ?? currentUser?.socialLinks ?? [];
    const linkMap = Array.isArray(links)
      ? links.reduce((acc, l) => ({ ...acc, [l.type]: l.url || '' }), {})
      : {};
    setEditSocialLinks(
      SOCIAL_TYPES.map(t => ({ type: t.value, url: linkMap[t.value] || '' })),
    );
    const oh = profile?.openingHours ?? currentUser?.openingHours;
    setEditOpeningHours(
      Array.isArray(oh) && oh.length
        ? oh.map(h => ({
            day: h?.day || '',
            open: h?.open || h?.opening || h?.start || '',
            close: h?.close || h?.closing || h?.end || '',
          }))
        : DEFAULT_OPENING_HOURS,
    );
    setFacebookConnectUrl('');
    setTiktokConnectUrl('');
    setYoutubeConnectUrl('');
    loadFacebookPages();
    loadInstagramLinkStatus();
    setEditProfileVisible(true);
  };

  const loadFacebookPages = useCallback(async () => {
    if (!profileUserId) return;
    try {
      const rows = await getSocialAccounts(profileUserId);
      const list = Array.isArray(rows) ? rows : [];
      setFacebookPages(
        list.filter(
          r => String(r?.platform || '').toLowerCase() === 'facebook',
        ),
      );
      setTiktokAccounts(
        list.filter(r => String(r?.platform || '').toLowerCase() === 'tiktok'),
      );
      setYoutubeAccounts(
        list.filter(r => String(r?.platform || '').toLowerCase() === 'youtube'),
      );
    } catch {
      setFacebookPages([]);
      setTiktokAccounts([]);
      setYoutubeAccounts([]);
    }
  }, [profileUserId]);

  const loadInstagramLinkStatus = useCallback(async (sync = true) => {
    if (!profileUserId) return;
    setInstagramChecking(true);
    try {
      const res = await getInstagramLinkStatus(profileUserId, sync);
      setInstagramLinkStatus(res);
      return res;
    } catch {
      setInstagramLinkStatus(null);
      return null;
    } finally {
      setInstagramChecking(false);
    }
  }, [profileUserId]);

  const handleVerifyInstagram = useCallback(async () => {
    const connectUserId = String(currentUser?.id || profileUserId || '').trim();
    if (!connectUserId) {
      Alert.alert('Instagram', 'Sign in to connect Instagram.');
      return;
    }
    const hasFbPages = (facebookPages || []).length > 0;
    if (!hasFbPages) {
      setInstagramChecking(true);
      try {
        const res = await getFacebookConnectUrl(connectUserId, {
          forInstagram: true,
        });
        const url = String(res?.url || '').trim();
        if (!url) {
          Alert.alert('Instagram', 'Could not get connect link.');
          return;
        }
        setFacebookConnectUrl(url);
        await Linking.openURL(url);
        Alert.alert(
          'Instagram',
          'Sign in with Facebook and choose the Page linked to your Instagram Business account. When finished, return here and tap Check Instagram link.',
        );
      } catch (e) {
        Alert.alert(
          'Instagram',
          e?.message ||
            'Could not start Instagram connect. Check FACEBOOK_APP_ID on the server.',
        );
      } finally {
        setInstagramChecking(false);
      }
      return;
    }
    const res = await loadInstagramLinkStatus(true);
    const linked = (res?.pages || []).some(row => row.instagramLinked);
    const stored = (res?.instagramAccounts || []).length > 0;
    if (linked || stored) {
      await loadFacebookPages();
      Alert.alert('Instagram', 'Instagram connected successfully.');
      return;
    }
    Alert.alert(
      'Instagram',
      'No Instagram Business account linked to your Facebook Page yet. Link them in Meta Business Suite, then tap Check Instagram link again.',
    );
  }, [
    profileUserId,
    currentUser?.id,
    facebookPages,
    loadInstagramLinkStatus,
    loadFacebookPages,
  ]);

  const handleVerifyFacebook = useCallback(async () => {
    const connectUserId = String(currentUser?.id || profileUserId || '').trim();
    if (!connectUserId) {
      Alert.alert('Facebook', 'Sign in to verify Facebook.');
      return;
    }
    setFacebookConnecting(true);
    try {
      const res = await getFacebookConnectUrl(connectUserId);
      const url = String(res?.url || '').trim();
      if (!url) {
        Alert.alert('Facebook', 'Could not get connect link.');
        return;
      }
      setFacebookConnectUrl(url);
    } catch (e) {
      Alert.alert(
        'Facebook',
        e?.message ||
          'Could not get Facebook link. Add FACEBOOK_APP_ID on the server or set facebookAppId in config.js.',
      );
    } finally {
      setFacebookConnecting(false);
    }
  }, [profileUserId, currentUser?.id]);

  const handleCopyFacebookUrl = useCallback(() => {
    if (!facebookConnectUrl) return;
    Clipboard.setString(facebookConnectUrl);
    Alert.alert('Copied', 'Facebook verify link copied.');
  }, [facebookConnectUrl]);

  const handleCopyFacebookRedirectUri = useCallback(() => {
    Clipboard.setString(facebookOAuthRedirectUri());
    Alert.alert(
      'Copied',
      'Paste this into Meta → Facebook Login → Valid OAuth Redirect URIs.',
    );
  }, []);

  const handleVerifyTiktok = useCallback(async () => {
    const connectUserId = String(currentUser?.id || profileUserId || '').trim();
    if (!connectUserId) {
      Alert.alert('TikTok', 'Sign in to verify TikTok.');
      return;
    }
    setTiktokConnecting(true);
    try {
      const res = await getTikTokConnectUrl(connectUserId);
      const url = String(res?.url || '').trim();
      if (!url) {
        Alert.alert('TikTok', 'Could not get connect link.');
        return;
      }
      setTiktokConnectUrl(url);
    } catch (e) {
      Alert.alert(
        'TikTok',
        e?.message ||
          'Set TIKTOK_CLIENT_KEY on the server (and tiktokClientKey in config.js as fallback), then add the redirect URI in TikTok Developer Portal.',
      );
    } finally {
      setTiktokConnecting(false);
    }
  }, [profileUserId, currentUser?.id]);

  const handleCopyTiktokUrl = useCallback(() => {
    if (!tiktokConnectUrl) return;
    Clipboard.setString(tiktokConnectUrl);
    Alert.alert('Copied', 'TikTok verify link copied.');
  }, [tiktokConnectUrl]);

  const handleCopyTiktokRedirectUri = useCallback(() => {
    Clipboard.setString(tiktokOAuthRedirectUri());
    Alert.alert(
      'Copied',
      'Add this redirect URI in TikTok for Developers → your app → Login Kit / URL properties.',
    );
  }, []);

  const handleVerifyYoutube = useCallback(async () => {
    const connectUserId = String(currentUser?.id || profileUserId || '').trim();
    if (!connectUserId) {
      Alert.alert('YouTube', 'Sign in to verify YouTube.');
      return;
    }
    setYoutubeConnecting(true);
    try {
      await connectYouTubeAccount(connectUserId);
      await loadFacebookPages();
      Alert.alert('YouTube', 'YouTube channel connected successfully.');
    } catch (e) {
      Alert.alert(
        'YouTube',
        e?.message ||
          'Could not connect YouTube. Add your Gmail as a Google OAuth test user, or use the browser link below.',
      );
    } finally {
      setYoutubeConnecting(false);
    }
  }, [profileUserId, currentUser?.id, loadFacebookPages]);

  const handleOpenYoutubeBrowserLink = useCallback(async () => {
    const connectUserId = String(currentUser?.id || profileUserId || '').trim();
    if (!connectUserId) {
      Alert.alert('YouTube', 'Sign in to verify YouTube.');
      return;
    }
    setYoutubeConnecting(true);
    try {
      const res = await getYouTubeConnectUrl(connectUserId, 'verify');
      const url = String(res?.url || '').trim();
      if (!url) {
        Alert.alert('YouTube', 'Could not get connect link.');
        return;
      }
      setYoutubeConnectUrl(url);
      await Linking.openURL(url);
    } catch (e) {
      Alert.alert('YouTube', e?.message || 'Could not open YouTube connect link.');
    } finally {
      setYoutubeConnecting(false);
    }
  }, [profileUserId, currentUser?.id]);

  const handleCopyYoutubeUrl = useCallback(() => {
    if (!youtubeConnectUrl) return;
    Clipboard.setString(youtubeConnectUrl);
    Alert.alert('Copied', 'YouTube verify link copied.');
  }, [youtubeConnectUrl]);

  const handleCopyYoutubeRedirectUri = useCallback(() => {
    Clipboard.setString(youtubeOAuthRedirectUri());
    Alert.alert(
      'Copied',
      'Add this exact redirect URI in Google Cloud Console → Credentials → OAuth 2.0 Web client.',
    );
  }, []);

  const handleCoverPress = useCallback(() => {
    if (!profileUserId || profileUserId !== currentUser?.id || uploadingCover)
      return;
    (async () => {
      let file;
      try {
        file = await pickProfileCoverCrop();
      } catch (e) {
        Alert.alert('Error', e?.message || 'Could not process image');
        return;
      }
      if (!file) return;
      setUploadingCover(true);
      try {
        await uploadCoverImage(profileUserId, file);
        await loadProfile();
      } catch (e) {
        Alert.alert('Error', e?.message || 'Failed to upload cover image');
      } finally {
        setUploadingCover(false);
      }
    })();
  }, [profileUserId, currentUser?.id, uploadingCover, loadProfile]);

  const handleAvatarPress = useCallback(() => {
    if (!profileUserId || profileUserId !== currentUser?.id || uploadingAvatar)
      return;
    (async () => {
      let file;
      try {
        file = await pickProfileAvatarCrop();
      } catch (e) {
        Alert.alert('Error', e?.message || 'Could not process image');
        return;
      }
      if (!file) return;
      setUploadingAvatar(true);
      try {
        const data = await uploadProfilePhoto(profileUserId, file);
        await loadProfile();
        const photoUrl = data?.photoUrl || data?.userUpdate?.photos?.[0]?.src;
        if (currentUser?.id === profileUserId && photoUrl) {
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
    })();
  }, [profileUserId, currentUser, uploadingAvatar, loadProfile, dispatch]);

  const saveProfile = async () => {
    if (!profileUserId || profileUserId !== currentUser?.id) return;
    if (isOwnerOrVendor) {
      const hasPin =
        editLatitude != null &&
        editLongitude != null &&
        Number.isFinite(editLatitude) &&
        Number.isFinite(editLongitude);
      if (!hasPin) {
        Alert.alert(
          'Location required',
          'Set your shop location on the map so nearby customers can find your videos and menu.',
        );
        return;
      }
    }
    setSavingProfile(true);
    try {
      const socialLinks = editSocialLinks
        .map(l => ({
          type: (l.type || 'website').trim(),
          url: (l.url || '').trim(),
        }))
        .filter(l => l.url);
      const nameValue = editName.trim() || undefined;
      const addressStr = editAddress.trim() || undefined;
      let postcodeStr = editPostcode.trim()
        ? normalizeUkPostcode(editPostcode)
        : undefined;
      if (!postcodeStr && addressStr) {
        postcodeStr = extractUkPostcodeFromText(addressStr) || undefined;
      }
      let latitude = undefined;
      let longitude = undefined;
      const previousAddress = String(
        profile?.address ?? currentUser?.address ?? '',
      ).trim();
      const previousPostcode = String(
        profile?.postcode ?? currentUser?.postcode ?? '',
      ).trim();
      const addressChanged = !!addressStr && addressStr !== previousAddress;
      const postcodeChanged =
        !!postcodeStr && postcodeStr !== previousPostcode;
      const shouldReuseEditCoords =
        !addressChanged &&
        !postcodeChanged &&
        editLatitude != null &&
        editLongitude != null &&
        Number.isFinite(editLatitude) &&
        Number.isFinite(editLongitude);
      if (shouldReuseEditCoords) {
        latitude = editLatitude;
        longitude = editLongitude;
      } else if (addressStr) {
        let coords = await geocodeAddress(addressStr);
        if (!coords && addressStr) {
          coords = await geocodeAddress(addressStr + ', United Kingdom');
        }
        if (
          !coords ||
          !Number.isFinite(coords.lat) ||
          !Number.isFinite(coords.lng)
        ) {
          const fallback = getFallbackCoordsForUKArea(addressStr);
          if (fallback) coords = fallback;
        }
        if (
          coords &&
          Number.isFinite(coords.lat) &&
          Number.isFinite(coords.lng)
        ) {
          latitude = coords.lat;
          longitude = coords.lng;
        }
      }
      await updateChannelProfile(profileUserId, {
        name: nameValue,
        nickname: nameValue,
        channelAbout: editChannelAbout.trim() || undefined,
        phone: editPhone.trim() || undefined,
        address: addressStr,
        postcode: postcodeStr,
        ...(latitude != null && { latitude }),
        ...(longitude != null && { longitude }),
        socialLinks: socialLinks.length ? socialLinks : undefined,
        ...(currentRole === 'owner' && {
          openingHours: (editOpeningHours || [])
            .map(h => ({
              day: String(h?.day || '').trim(),
              open: String(h?.open || '').trim(),
              close: String(h?.close || '').trim(),
            }))
            .filter(h => h.day),
        }),
      });
      await loadProfile();
      if (currentUser?.id === profileUserId) {
        dispatch(
          appSetUser({
            ...currentUser,
            name: nameValue || currentUser.name,
            nickname: nameValue || currentUser.nickname,
            channelAbout: editChannelAbout.trim() || currentUser.channelAbout,
            phone: editPhone.trim() || currentUser.phone,
            address: addressStr || currentUser.address,
            postcode: postcodeStr || currentUser.postcode,
            ...(latitude != null && { latitude }),
            ...(longitude != null && { longitude }),
            socialLinks: socialLinks.length
              ? socialLinks
              : currentUser.socialLinks,
            ...(currentRole === 'owner' && {
              openingHours: editOpeningHours,
            }),
          }),
        );
        if (
          latitude != null &&
          longitude != null &&
          Number.isFinite(latitude) &&
          Number.isFinite(longitude)
        ) {
          const areaLabel = formatCityCountryPostcodeLine({
            address: addressStr,
            postcode: postcodeStr,
          });
          dispatch(
            setBrowseLocation({
              lat: latitude,
              lng: longitude,
              postcode: postcodeStr || '',
              addressText: addressStr || '',
              areaLabel,
            }),
          );
          persistBrowseLocation({
            userId: profileUserId,
            lat: latitude,
            lng: longitude,
            postcode: postcodeStr || '',
            addressText: addressStr || '',
            areaLabel,
          }).catch(() => {});
        }
      }
      setEditProfileVisible(false);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.message ||
        'Failed to update profile';
      const detail = Array.isArray(msg) ? msg.join(', ') : String(msg);
      Alert.alert('Error', detail);
    } finally {
      setSavingProfile(false);
    }
  };

  const updateOpeningHour = (idx, patch) => {
    setEditOpeningHours(prev =>
      (prev || []).map((h, i) => (i === idx ? { ...h, ...patch } : h)),
    );
  };

  const updateSocialLinkUrl = (idx, value) => {
    setEditSocialLinks(prev =>
      prev.map((l, i) => (i === idx ? { ...l, url: value } : l)),
    );
  };

  const showFacebookVerify = useMemo(
    () =>
      !!getSavedSocialLinkUrl(
        editSocialLinks,
        profile,
        currentUser,
        'facebook',
      ),
    [editSocialLinks, profile, currentUser],
  );
  const showInstagramVerify = useMemo(
    () =>
      !!getSavedSocialLinkUrl(
        editSocialLinks,
        profile,
        currentUser,
        'instagram',
      ) ||
      showFacebookVerify,
    [editSocialLinks, profile, currentUser, showFacebookVerify],
  );
  const showTiktokVerify = useMemo(
    () =>
      !!getSavedSocialLinkUrl(editSocialLinks, profile, currentUser, 'tiktok'),
    [editSocialLinks, profile, currentUser],
  );
  const showYoutubeVerify = useMemo(
    () =>
      !!getSavedSocialLinkUrl(editSocialLinks, profile, currentUser, 'youtube'),
    [editSocialLinks, profile, currentUser],
  );

  const updatePostInList = useCallback((postId, updater) => {
    setPosts(prev =>
      prev.map(p => (p.postId === postId || p.id === postId ? updater(p) : p)),
    );
  }, []);

  const handlePostLike = useCallback(
    async postId => {
      if (!currentUser?.id) return;
      const post = posts.find(p => p.postId === postId || p.id === postId);
      if (!post) return;
      const prevLikes = post.likes;
      updatePostInList(postId, p => ({
        ...p,
        likes: String(Math.max(0, Number(p.likes) + 1)),
      }));
      try {
        const res = await togglePostLike(postId, currentUser.id);
        const delta = res?.liked ? 1 : -1;
        updatePostInList(postId, p => ({
          ...p,
          likes: String(Math.max(0, Number(prevLikes) + delta)),
        }));
      } catch {
        updatePostInList(postId, p => ({ ...p, likes: prevLikes }));
      }
    },
    [currentUser?.id, posts, updatePostInList],
  );

  const handlePostDislike = useCallback(
    async postId => {
      if (!currentUser?.id) return;
      const post = posts.find(p => p.postId === postId || p.id === postId);
      if (!post) return;
      const prevDislikes = post.dislikes;
      updatePostInList(postId, p => ({
        ...p,
        dislikes: String(Math.max(0, Number(p.dislikes) + 1)),
      }));
      try {
        const res = await togglePostDislike(postId, currentUser.id);
        const delta = res?.disliked ? 1 : -1;
        updatePostInList(postId, p => ({
          ...p,
          dislikes: String(Math.max(0, Number(prevDislikes) + delta)),
        }));
      } catch {
        updatePostInList(postId, p => ({ ...p, dislikes: prevDislikes }));
      }
    },
    [currentUser?.id, posts, updatePostInList],
  );

  const handlePostShare = useCallback(
    async postId => {
      const post = posts.find(p => p.postId === postId || p.id === postId);
      if (!post) return;
      try {
        await Share.share({
          message: buildPostShareMessage({ id: postId }),
          title: post.title,
        });
        await recordPostShare(postId);
        updatePostInList(postId, p => ({
          ...p,
          shares: String(Number(p.shares || 0) + 1),
        }));
      } catch (e) {
        if (e?.message !== 'User did not share') {
          // ignore
        }
      }
    },
    [posts, updatePostInList],
  );

  const handlePostCommentAdded = useCallback(
    (_, delta = 1) => {
      if (commentsModalPostId) {
        updatePostInList(commentsModalPostId, p => ({
          ...p,
          comments: String(Number(p.comments || 0) + delta),
        }));
      }
    },
    [commentsModalPostId, updatePostInList],
  );

  const openPostMediaPreview = useCallback(post => {
    const media = String(post?.mediaUrl || post?.thumbnail || '').trim();
    if (!media) return;
    const postId = post?.postId || post?.id;
    if (postId) setPostMediaPreviewPostId(String(postId));
    const mt = String(post?.mediaType || '').toLowerCase();
    const byExt = /\.(mp4|mov|m4v|webm|mkv)(\?|$)/i.test(media);
    const kind = mt === 'video' || byExt ? 'video' : 'image';
    setPostMediaPreviewType(kind);
    setPostMediaPreviewUri(safeImageUri(media));
    setPostMediaPreviewVisible(true);
  }, []);

  const postMediaPreviewPost = useMemo(() => {
    if (!postMediaPreviewPostId) return null;
    return (
      posts.find(
        p =>
          String(p?.postId || p?.id || '') === String(postMediaPreviewPostId),
      ) || null
    );
  }, [posts, postMediaPreviewPostId]);

  const applyGLLike = useCallback(p => {
    const nextLiked = !p.isLiked;
    let lc = Number(p.likeCount ?? 0);
    let dc = Number(p.dislikeCount ?? 0);
    if (nextLiked) {
      lc += 1;
      if (p.isDisliked) dc = Math.max(0, dc - 1);
    } else {
      lc = Math.max(0, lc - 1);
    }
    return {
      ...p,
      isLiked: nextLiked,
      isDisliked: false,
      likeCount: lc,
      dislikeCount: dc,
    };
  }, []);

  const applyGLDislike = useCallback(p => {
    const nextDis = !p.isDisliked;
    let lc = Number(p.likeCount ?? 0);
    let dc = Number(p.dislikeCount ?? 0);
    if (nextDis) {
      dc += 1;
      if (p.isLiked) lc = Math.max(0, lc - 1);
    } else {
      dc = Math.max(0, dc - 1);
    }
    return {
      ...p,
      isDisliked: nextDis,
      isLiked: false,
      likeCount: lc,
      dislikeCount: dc,
    };
  }, []);

  const handleBPGalleryLike = useCallback(async () => {
    if (!currentUser?.id) {
      Alert.alert('Login required', 'Please login to continue.');
      return;
    }
    if (!profileUserId || !galleryEngagePhoto?.id) return;
    const pid = galleryEngagePhoto.id;
    patchGalleryPhoto(pid, p => applyGLLike(p));
    setGalleryEngagePhoto(ge =>
      ge && String(ge.id) === String(pid) ? applyGLLike(ge) : ge,
    );
    setGalleryPreviewItem(it =>
      it && String(it.originId) === String(pid) ? applyGLLike(it) : it,
    );
    try {
      await toggleGalleryPhotoLike(profileUserId, pid, currentUser.id);
      await syncBPGalleryEngageFromServer(pid);
    } catch {
      getGallery(profileUserId, currentUser?.id)
        .then(r => setGalleryPhotos(r?.photos ?? []))
        .catch(() => {});
    }
  }, [
    profileUserId,
    galleryEngagePhoto?.id,
    patchGalleryPhoto,
    applyGLLike,
    currentUser?.id,
    syncBPGalleryEngageFromServer,
  ]);

  const handleBPGalleryDislike = useCallback(async () => {
    if (!currentUser?.id) {
      Alert.alert('Login required', 'Please login to continue.');
      return;
    }
    if (!profileUserId || !galleryEngagePhoto?.id) return;
    const pid = galleryEngagePhoto.id;
    patchGalleryPhoto(pid, p => applyGLDislike(p));
    setGalleryEngagePhoto(ge =>
      ge && String(ge.id) === String(pid) ? applyGLDislike(ge) : ge,
    );
    setGalleryPreviewItem(it =>
      it && String(it.originId) === String(pid) ? applyGLDislike(it) : it,
    );
    try {
      await toggleGalleryPhotoDislike(profileUserId, pid, currentUser.id);
      await syncBPGalleryEngageFromServer(pid);
    } catch {
      getGallery(profileUserId, currentUser?.id)
        .then(r => setGalleryPhotos(r?.photos ?? []))
        .catch(() => {});
    }
  }, [
    profileUserId,
    galleryEngagePhoto?.id,
    patchGalleryPhoto,
    applyGLDislike,
    currentUser?.id,
    syncBPGalleryEngageFromServer,
  ]);

  const handleBPGalleryShare = useCallback(async () => {
    if (!profileUserId || !galleryEngagePhoto?.id) return;
    const pid = galleryEngagePhoto.id;
    try {
      await Share.share({
        message: `Photo\neatwaze://user/${profileUserId}/gallery/${pid}`,
        title: 'Photo',
      });
      await recordGalleryPhotoShare(profileUserId, pid);
      patchGalleryPhoto(pid, p => ({
        ...p,
        shareCount: (p.shareCount ?? 0) + 1,
      }));
      setGalleryEngagePhoto(ge =>
        ge && String(ge.id) === String(pid)
          ? { ...ge, shareCount: (ge.shareCount ?? 0) + 1 }
          : ge,
      );
      setGalleryPreviewItem(it =>
        it && String(it.originId) === String(pid)
          ? { ...it, shareCount: (it.shareCount ?? 0) + 1 }
          : it,
      );
    } catch (e) {
      if (e?.message !== 'User did not share') {
        /* ignore */
      }
    }
  }, [profileUserId, galleryEngagePhoto?.id, patchGalleryPhoto]);

  const handleBPGalleryCommentAdded = useCallback(
    (_, delta = 1) => {
      if (!commentsModalGalleryPhotoId) return;
      const pid = commentsModalGalleryPhotoId;
      patchGalleryPhoto(pid, p => ({
        ...p,
        commentCount: Math.max(0, Number(p.commentCount ?? 0) + delta),
      }));
      setGalleryEngagePhoto(ge =>
        ge && String(ge.id) === String(pid)
          ? {
              ...ge,
              commentCount: Math.max(0, Number(ge.commentCount ?? 0) + delta),
            }
          : ge,
      );
      setGalleryPreviewItem(it =>
        it && String(it.originId) === String(pid)
          ? {
              ...it,
              commentCount: Math.max(0, Number(it.commentCount ?? 0) + delta),
            }
          : it,
      );
      syncBPGalleryEngageFromServer(pid);
    },
    [
      commentsModalGalleryPhotoId,
      patchGalleryPhoto,
      syncBPGalleryEngageFromServer,
    ],
  );

  const openBPGalleryComments = useCallback(() => {
    if (!currentUser?.id) {
      Alert.alert('Login required', 'Please login to continue.');
      return;
    }
    if (!galleryEngagePhoto?.id) return;
    setCommentsModalGalleryPhotoId(galleryEngagePhoto.id);
  }, [currentUser?.id, galleryEngagePhoto?.id]);

  const openCombinedGalleryItem = useCallback(
    item => {
      if (!item?.mediaUrl && !item?.thumbnail) return;
      const sourceType = String(item?.sourceType || '').toLowerCase();
      if (sourceType === 'post') {
        const post = posts.find(p => String(p.id) === String(item.originId));
        if (!post) return;
        const st = String(post?.sourceType || post?.mediaType || '').toLowerCase();
        const media = String(post?.mediaUrl || post?.videoUrl || '').trim();
        const isVideoPost =
          st === 'short' ||
          st === 'video' ||
          String(post?.mediaType || '').toLowerCase() === 'video' ||
          /\.(mp4|mov|m4v|webm|mkv)(\?|$)/i.test(media);
        if (isVideoPost && media) {
          openOwnerMediaPlayer(post.shortId || post.id, {
            rawItem: post,
            videoUrl: media,
            mediaType: st === 'short' ? 'short' : 'video',
          });
          return;
        }
        openPostMediaPreview(post);
        return;
      }
      if (sourceType === 'video') {
        const rawType = String(item?.type || '').toLowerCase();
        const isShort =
          item?.isShort || rawType === 'short' || rawType === 'shorts';
        const targetId = item?.originId ?? item?.id;
        if (!targetId) return;
        const raw = (ownerVideos || []).find(
          v => String(v.id) === String(targetId),
        );
        openOwnerMediaPlayer(String(targetId), {
          rawItem: raw || item,
          videoUrl: raw?.videoUrl || item?.mediaUrl,
          mediaType: isShort ? 'short' : 'video',
        });
        return;
      }
      if (sourceType === 'gallery') {
        const pid = item?.originId;
        if (!pid) return;
        (async () => {
          let raw = galleryPhotos.find(g => String(g.id) === String(pid));
          if (profileUserId) {
            try {
              const res = await getGallery(profileUserId, currentUser?.id);
              const photos = res?.photos ?? [];
              setGalleryPhotos(photos);
              const fresh = photos.find(g => String(g.id) === String(pid));
              if (fresh) raw = fresh;
            } catch (_) {}
          }
          const base = raw || {
            id: pid,
            src: item?.mediaUrl,
            likeCount: item?.likeCount ?? 0,
            dislikeCount: item?.dislikeCount ?? 0,
            commentCount: item?.commentCount ?? 0,
            shareCount: item?.shareCount ?? 0,
            isLiked: item?.isLiked ?? false,
            isDisliked: item?.isDisliked ?? false,
          };
          setGalleryEngagePhoto(base);
          setGalleryPreviewItem({
            ...item,
            likeCount: base.likeCount ?? item?.likeCount ?? 0,
            dislikeCount: base.dislikeCount ?? item?.dislikeCount ?? 0,
            commentCount: base.commentCount ?? item?.commentCount ?? 0,
            shareCount: base.shareCount ?? item?.shareCount ?? 0,
            isLiked: base.isLiked ?? item?.isLiked ?? false,
            isDisliked: base.isDisliked ?? item?.isDisliked ?? false,
          });
          setGalleryPreviewVisible(true);
        })();
      }
    },
    [
      posts,
      galleryPhotos,
      openPostMediaPreview,
      openOwnerMediaPlayer,
      profileUserId,
      currentUser?.id,
      ownerVideos,
    ],
  );

  const openPhotosTabPreviewBP = useCallback(
    async photo => {
      if (!photo?.src && !photo?.id) return;
      let p = photo;
      if (profileUserId && photo?.id) {
        try {
          const res = await getGallery(profileUserId, currentUser?.id);
          const photos = res?.photos ?? [];
          setGalleryPhotos(photos);
          const fresh = photos.find(g => String(g.id) === String(photo.id));
          if (fresh) p = fresh;
        } catch (_) {}
      }
      const feedItem = {
        id: `gallery-${p.id}`,
        originId: p.id,
        sourceType: 'gallery',
        title: 'Photo',
        subtitle: formatTimeAgo(p?.createdAt),
        mediaType: 'image',
        mediaUrl: String(p?.src || '').trim(),
        thumbnail: safeImageUri(p?.src, IMAGE_PLACEHOLDER),
        likeCount: p.likeCount ?? 0,
        dislikeCount: p.dislikeCount ?? 0,
        commentCount: p.commentCount ?? 0,
        shareCount: p.shareCount ?? 0,
        isLiked: p.isLiked ?? false,
        isDisliked: p.isDisliked ?? false,
      };
      setGalleryEngagePhoto(p);
      setGalleryPreviewItem(feedItem);
      setGalleryPreviewVisible(true);
    },
    [profileUserId, currentUser?.id],
  );

  const openPostActions = useCallback(
    post => {
      if (!isOwnProfile || !post?.id) return;
      setPostActionTarget(post);
      setPostActionVisible(true);
    },
    [isOwnProfile],
  );

  const openPostEdit = useCallback(() => {
    const t = postActionTarget;
    if (!t) return;
    setPostActionVisible(false);
    setPostEditTitle(String(t.title || '').trim());
    setPostEditDescription(String(t.description || '').trim());
    setPostEditWebsite(String(t.website || '').trim());
    setPostEditHashtags(
      Array.isArray(t.hashtags)
        ? t.hashtags.join(' ')
        : String(t.hashtags || ''),
    );
    setPostEditThumbnailUri(String(t.thumbnail || '').trim());
    setPostEditVideoUri(
      String(
        (String(t.mediaType || '').toLowerCase() === 'video'
          ? t.mediaUrl
          : '') || '',
      ).trim(),
    );
    setPostEditVisible(true);
  }, [postActionTarget]);

  const pickPostThumbnail = useCallback(async () => {
    const res = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.9,
      selectionLimit: 1,
    });
    const asset = res?.assets?.[0];
    if (asset?.uri) setPostEditThumbnailUri(asset.uri);
  }, []);

  const pickPostVideo = useCallback(async () => {
    const res = await launchImageLibrary({
      mediaType: 'video',
      quality: 1,
      selectionLimit: 1,
    });
    const asset = res?.assets?.[0];
    if (asset?.uri) {
      setPostEditVideoUri(asset.uri);
      if (!postEditThumbnailUri) {
        setPostEditThumbnailUri(asset.uri);
      }
    }
  }, [postEditThumbnailUri]);

  const submitPostEdit = useCallback(async () => {
    if (!postActionTarget?.id || !currentUser?.id) return;
    const payload = {
      title: postEditTitle.trim() || undefined,
      description: postEditDescription.trim() || undefined,
      website: postEditWebsite.trim() || undefined,
      hashtags: postEditHashtags
        .split(/[\s,]+/)
        .map(t => t.trim())
        .filter(Boolean),
      thumbnailUrl: postEditThumbnailUri.trim() || undefined,
      mediaUrl:
        (postEditVideoUri.trim() || postEditThumbnailUri.trim() || '').trim() ||
        undefined,
      mediaType: postEditVideoUri.trim() ? 'video' : 'image',
    };
    try {
      setPostEditSaving(true);
      await updatePost(postActionTarget.id, currentUser.id, payload);
      updatePostInList(postActionTarget.id, p => ({
        ...p,
        title: payload.title ?? p.title,
        description: payload.description ?? p.description,
        website: payload.website ?? p.website,
        hashtags: payload.hashtags?.length ? payload.hashtags : p.hashtags,
        thumbnail: payload.thumbnailUrl ?? p.thumbnail,
        mediaUrl: payload.mediaUrl ?? p.mediaUrl,
        mediaType: payload.mediaType ?? p.mediaType,
      }));
      setPostEditVisible(false);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to update post');
    } finally {
      setPostEditSaving(false);
    }
  }, [
    postActionTarget,
    currentUser?.id,
    postEditTitle,
    postEditDescription,
    postEditWebsite,
    postEditHashtags,
    postEditThumbnailUri,
    postEditVideoUri,
    updatePostInList,
  ]);

  const deletePostFromActions = useCallback(() => {
    const t = postActionTarget;
    if (!t?.id || !currentUser?.id) return;
    setPostActionVisible(false);
    Alert.alert('Delete post', 'Are you sure you want to delete this post?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await deletePost(t.id, currentUser.id);
            setPosts(prev =>
              prev.filter(p => String(p.id || p.postId) !== String(t.id)),
            );
          } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to delete post');
          }
        },
      },
    ]);
  }, [postActionTarget, currentUser?.id]);

  const openItemActions = useCallback(
    (kind, item) => {
      if (!isOwnProfile || !item?.id) return;
      let resolved = item;
      if (kind === 'menu') {
        resolved =
          menuItems.find(m => String(m.id) === String(item.id)) ||
          mapMenuListRow(item) ||
          item;
      }
      setItemActionTarget({ kind, item: resolved });
      setItemActionVisible(true);
    },
    [isOwnProfile, menuItems],
  );

  const openPromotionEdit = useCallback(item => {
    if (!item?.id) return;
    setEditingPromotion(item);
    if ((item.offerType || OFFER_TYPES.ORDER) === OFFER_TYPES.BOOKING) {
      setCreateTierDiscountModalVisible(true);
    } else {
      setCreatePromotionModalVisible(true);
    }
  }, []);

  const openItemEdit = useCallback(() => {
    const target = itemActionTarget;
    if (!target?.item) return;
    const { kind, item } = target;
    setItemActionVisible(false);
    if (kind === 'promotion') {
      openPromotionEdit(item);
      return;
    }
    if (kind === 'menu') {
      const full =
        menuItems.find(m => String(m.id) === String(item.id)) || item;
      setItemEditSelectedMenuIds([]);
      setItemEditTitle(String(full.itemName || '').trim());
      setItemEditPrice(String(full.price ?? '').trim());
      setItemEditDescription(String(full.description || '').trim());
      setItemEditThumbnailUri(String(full.imageUrl || '').trim());
      setItemEditVideoUri('');
      setItemEditCategoryId(
        String(full.categoryId || full.category?.id || '').trim(),
      );
      setItemEditAllergens(normalizeAllergens(full.allergens));
      setItemEditAllergenIconUrls(normalizeAllergens(full.allergenIconUrls));
    } else {
      setItemEditSelectedMenuIds([]);
      setItemEditTitle(String(item.title || '').trim());
      setItemEditDescription(String(item.description || '').trim());
      setItemEditThumbnailUri(
        String(item.thumbnail || item.thumbnailUrl || '').trim(),
      );
      setItemEditVideoUri(String(item.videoUrl || item.mediaUrl || '').trim());
    }
    setItemEditVisible(true);
  }, [itemActionTarget, openPromotionEdit, menuItems]);

  const itemEditMenuSections = useMemo(() => {
    const uncategorized = menuItems.filter(
      i => !i.categoryId && !i.category?.id,
    );
    const sections = [];
    (menuCategories || []).forEach(cat => {
      const items = menuItems.filter(
        i => (i.categoryId || i.category?.id) === cat.id,
      );
      if (items.length > 0) {
        sections.push({ id: cat.id, title: cat.name, data: items });
      }
    });
    if (uncategorized.length > 0) {
      sections.push({
        id: 'uncategorized',
        title: 'Uncategorized',
        data: uncategorized,
      });
    }
    if (sections.length === 0 && menuItems.length > 0) {
      sections.push({ id: 'all', title: 'Menu', data: menuItems });
    }
    return sections;
  }, [menuItems, menuCategories]);

  const itemEditAllMenuIds = useMemo(
    () => menuItems.map(i => String(i.id)).filter(Boolean),
    [menuItems],
  );

  const itemEditAllMenusSelected =
    itemEditAllMenuIds.length > 0 &&
    itemEditAllMenuIds.every(id => itemEditSelectedMenuIds.includes(id));

  const toggleItemEditMenuId = useCallback(id => {
    const key = String(id);
    setItemEditSelectedMenuIds(prev =>
      prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key],
    );
  }, []);

  const toggleItemEditSelectAllMenus = useCallback(() => {
    setItemEditSelectedMenuIds(prev =>
      itemEditAllMenuIds.length === 0
        ? prev
        : itemEditAllMenuIds.every(id => prev.includes(id))
        ? []
        : itemEditAllMenuIds,
    );
  }, [itemEditAllMenuIds]);

  const pickItemThumbnail = useCallback(async () => {
    const res = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.9,
      selectionLimit: 1,
    });
    const asset = res?.assets?.[0];
    if (asset?.uri) setItemEditThumbnailUri(asset.uri);
  }, []);

  const pickItemVideo = useCallback(async () => {
    const res = await launchImageLibrary({
      mediaType: 'video',
      quality: 1,
      selectionLimit: 1,
    });
    const asset = res?.assets?.[0];
    if (asset?.uri) setItemEditVideoUri(asset.uri);
  }, []);

  const pickItemAllergenIcon = useCallback(async () => {
    if (!currentUser?.token) return;
    const res = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.9,
      selectionLimit: 1,
    });
    const asset = res?.assets?.[0];
    if (!asset?.uri) return;
    setItemEditAllergenIconUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name:
          asset.fileName || asset.uri?.split('/').pop() || 'allergen-icon.jpg',
      });
      const data = await uploadMenuItemImage(currentUser.token, formData);
      const url = String(data?.imageUrl || '').trim();
      if (url) {
        setItemEditAllergenIconUrls(prev =>
          prev.includes(url) ? prev : [...prev, url],
        );
      }
    } catch (e) {
      Alert.alert('Error', e?.message || 'Allergen icon upload failed');
    } finally {
      setItemEditAllergenIconUploading(false);
    }
  }, [currentUser?.token]);

  const submitItemEdit = useCallback(async () => {
    const target = itemActionTarget;
    const userId = currentUser?.id;
    if (!target?.item?.id || !userId) return;
    const { kind, item } = target;
    try {
      setItemEditSaving(true);
      if (kind === 'promotion') {
        const offerType = item.offerType || OFFER_TYPES.ORDER;
        const payload = {
          title: itemEditTitle.trim() || undefined,
          description: itemEditDescription.trim() || undefined,
          thumbnailUrl: itemEditThumbnailUri.trim() || undefined,
          videoUrl: itemEditVideoUri.trim() || undefined,
        };
        if (offerType === OFFER_TYPES.ORDER) {
          const code = itemEditPromoCode.trim();
          const amountRaw = itemEditPromoAmount.trim();
          if (code) payload.promoCode = code;
          if (amountRaw !== '') {
            const amount = Number(amountRaw);
            if (Number.isFinite(amount)) payload.promoAmount = amount;
          }
          payload.menuItemIds = itemEditSelectedMenuIds;
        }
        await updatePromotion(item.id, userId, payload);
        setPromotions(prev =>
          prev.map(p => (p.id === item.id ? { ...p, ...payload } : p)),
        );
      } else if (kind === 'video') {
        const payload = {
          title: itemEditTitle.trim() || undefined,
          description: itemEditDescription.trim() || undefined,
          thumbnailUrl: itemEditThumbnailUri.trim() || undefined,
          videoUrl: itemEditVideoUri.trim() || undefined,
        };
        if (String(item._type || '').toLowerCase() === 'short') {
          await shortsService.updateShort(item.id, userId, payload);
        } else {
          await updateVideo(item.id, userId, payload);
        }
        setOwnerVideos(prev =>
          prev.map(v =>
            v.id === item.id
              ? {
                  ...v,
                  title: payload.title ?? v.title,
                  description: payload.description ?? v.description,
                  thumbnail: payload.thumbnailUrl ?? v.thumbnail,
                  thumbnailUrl: payload.thumbnailUrl ?? v.thumbnailUrl,
                  videoUrl: payload.videoUrl ?? v.videoUrl,
                }
              : v,
          ),
        );
      } else if (kind === 'menu') {
        const name = itemEditTitle.trim();
        const priceRaw = itemEditPrice.trim();
        const price = priceRaw === '' ? NaN : Number(priceRaw);
        if (!name) {
          Alert.alert('Error', 'Item name is required');
          return;
        }
        if (!Number.isFinite(price) || price < 0) {
          Alert.alert('Error', 'Enter a valid price');
          return;
        }
        const payload = {
          itemName: name,
          description: itemEditDescription.trim() || null,
          price,
          imageUrl: itemEditThumbnailUri.trim() || null,
          categoryId: itemEditCategoryId ? itemEditCategoryId : null,
          allergens: Array.isArray(itemEditAllergens) ? itemEditAllergens : [],
          allergenIconUrls: Array.isArray(itemEditAllergenIconUrls)
            ? itemEditAllergenIconUrls
            : [],
        };
        const updated = await updateMenuItem(
          currentUser?.token,
          item.id,
          payload,
        );
        const normalized = normalizeMenuItemFromApi(updated, menuCategories);
        setMenuItems(prev =>
          prev.map(m =>
            String(m.id) === String(item.id)
              ? normalizeMenuItemFromApi({ ...m, ...normalized }, menuCategories)
              : m,
          ),
        );
        await loadMenu();
      }
      setItemEditVisible(false);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to update item');
    } finally {
      setItemEditSaving(false);
    }
  }, [
    itemActionTarget,
    currentUser?.id,
    currentUser?.token,
    itemEditTitle,
    itemEditDescription,
    itemEditPrice,
    itemEditPromoCode,
    itemEditPromoAmount,
    itemEditThumbnailUri,
    itemEditVideoUri,
    itemEditCategoryId,
    itemEditAllergens,
    itemEditAllergenIconUrls,
    itemEditSelectedMenuIds,
    menuCategories,
    loadMenu,
  ]);

  const deleteItemFromActions = useCallback(() => {
    const target = itemActionTarget;
    const userId = currentUser?.id;
    if (!target?.item || !userId) return;
    const { kind, item } = target;
    const label =
      kind === 'promotion'
        ? 'promotion'
        : kind === 'menu'
        ? 'menu item'
        : kind === 'menuFile'
        ? 'menu file'
        : 'video';
    setItemActionVisible(false);
    Alert.alert(
      `Delete ${label}`,
      `Are you sure you want to delete this ${label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (kind === 'promotion') {
                await deletePromotion(item.id, userId);
                setPromotions(prev => prev.filter(p => p.id !== item.id));
              } else if (kind === 'video') {
                if (String(item._type || '').toLowerCase() === 'short') {
                  await shortsService.deleteShort(item.id, userId);
                } else {
                  await deleteVideo(item.id, userId);
                }
                setOwnerVideos(prev => prev.filter(v => v.id !== item.id));
              } else if (kind === 'menu') {
                await deleteMenuItem(currentUser?.token, item.id);
                setMenuItems(prev => prev.filter(m => m.id !== item.id));
              } else if (kind === 'menuFile') {
                const fileId = item.fileId || item.id;
                if (!fileId || String(fileId).startsWith('file-')) {
                  throw new Error('Menu file id is missing');
                }
                await deleteMenuFile(currentUser?.token, fileId);
                setMenuFiles(prev =>
                  prev.filter(f => String(f.id) !== String(fileId)),
                );
              }
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to delete item');
            }
          },
        },
      ],
    );
  }, [itemActionTarget, currentUser?.id, currentUser?.token]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <BusinessProfileCard
        profile={profile}
        isOwnProfile={isOwnProfile}
        isOwnerOrVendor={isOwnerOrVendor}
        onEditProfile={openEditProfile}
        onAvatarPress={handleAvatarPress}
        onCoverPress={handleCoverPress}
        coverUploading={uploadingCover}
        onSubscribe={
          !isOwnProfile && currentUser?.id ? handleProfileSubscribe : undefined
        }
        subscribeLoading={profileSubscribeLoading}
      />

      {isOwnProfile ? (
        <View style={styles.profileSocialRow}>
          {(() => {
            const raw = profile?.socialLinks ?? currentUser?.socialLinks ?? [];
            const links = Array.isArray(raw)
              ? raw
              : raw && typeof raw === 'object'
              ? [raw]
              : [];
            const normalized = links.map(l => ({
              type: String(l?.type || 'others').toLowerCase(),
              url: String(l?.url || '').trim(),
            }));

            const linked = BUSINESS_SOCIAL_BAR.map(({ type, icon, image }) => {
              const match = normalized.find(
                l =>
                  l.url &&
                  (l.type === type ||
                    (type === 'google_email' &&
                      (l.type === 'google' || l.type === 'google_email'))),
              );
              return match
                ? { type, icon, image, url: match.url }
                : null;
            }).filter(Boolean);

            if (!linked.length) return null;

            return linked.map(({ type, icon, image, url }) => (
              <TouchableOpacity
                key={type}
                style={styles.profileSocialBtn}
                onPress={() => {
                  Linking.openURL(
                    url.startsWith('http') ? url : `https://${url}`,
                  );
                }}
                activeOpacity={0.8}
              >
                {image ? (
                  <Image
                    source={image}
                    style={{ width: 22, height: 22 }}
                    resizeMode="contain"
                  />
                ) : (
                  <MaterialCommunityIcons
                    name={icon || getSocialIcon(type)}
                    size={20}
                    color="#111"
                  />
                )}
              </TouchableOpacity>
            ));
          })()}
        </View>
      ) : null}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView
          ref={tabsScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          onLayout={e => {
            tabsViewportWidthRef.current = e?.nativeEvent?.layout?.width || 0;
            scrollActiveTabIntoView(activeTab);
          }}
        >
          {(isOwnProfile && isOwnerOrVendor
            ? [
                'Gallery',
                'Posts',
                'Promotions',
                'Menus',
                'Video',
                'Photos',
                'Notification',
                'Area Users',
                'Riders',
                'Settings',
              ]
            : BASE_TABS
          )
            .concat(!isOwnProfile && currentUser?.id ? ['Block'] : [])
            .map(tab => {
            const isGrid = tab === 'Gallery';
            const isActive = activeTab === tab;

            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabItem,
                  activeTab === tab && styles.activeTabItem,
                ]}
                onLayout={e => {
                  const l = e?.nativeEvent?.layout;
                  if (l)
                    tabLayoutsRef.current[tab] = { x: l.x, width: l.width };
                }}
                onPress={() => {
                  if (tab === 'Block') {
                    handleBlockUser();
                    return;
                  }
                  setActiveTab(tab);
                  scrollActiveTabIntoView(tab);
                }}
              >
                {isGrid ? (
                  <MaterialCommunityIcons
                    name="view-grid"
                    size={22}
                    color={isActive ? '#FF7F0B' : '#444'}
                  />
                ) : (
                  <Text
                    style={[styles.tabText, isActive && styles.activeTabText]}
                  >
                    {tab}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Promotions sub-tabs: Order | Booking Discount */}
      {activeTab === 'Promotions' ? (
        (() => {
          const promotionTabs = [
            { key: 'order', label: 'Order' },
            {
              key: 'booking',
              label: IS_COMPACT_WIDTH ? 'Booking' : 'Booking Discount',
            },
            { key: 'both', label: 'Both' },
          ];
          const renderPromotionTab = (tab, tabIndex, tabs) => (
            <TouchableOpacity
              key={tab.key}
              style={[
                styles.promotionSubTabBtn,
                !IS_COMPACT_WIDTH && styles.promotionSubTabBtnEqual,
                tabIndex < tabs.length - 1 && styles.promotionSubTabBtnSpacing,
                promotionSubTab === tab.key && styles.promotionSubTabBtnActive,
              ]}
              onPress={() => setPromotionSubTab(tab.key)}
            >
              <Text
                style={[
                  styles.promotionSubTabText,
                  promotionSubTab === tab.key && styles.promotionSubTabTextActive,
                ]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.78}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );

          if (IS_COMPACT_WIDTH) {
            return (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.promotionSubTabRow}
              >
                {promotionTabs.map(renderPromotionTab)}
              </ScrollView>
            );
          }

          return (
            <View style={styles.promotionSubTabRow}>
              {promotionTabs.map(renderPromotionTab)}
            </View>
          );
        })()
      ) : null}

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle} numberOfLines={1}>
          {activeTab === 'Gallery'
            ? 'Gallery'
            : activeTab === 'Photos'
            ? 'Photos'
            : activeTab === 'Video'
            ? 'Videos'
            : activeTab === 'Notification'
            ? 'Notifications'
            : activeTab === 'Menus'
            ? 'Menus'
            : activeTab === 'Promotions'
            ? promotionSubTab === 'booking'
              ? 'Booking Discounts'
              : promotionSubTab === 'both'
              ? 'Order & Booking'
              : 'Order Promotions'
            : activeTab === 'Settings'
            ? 'Delivery Settings'
            : activeTab === 'Area Users'
            ? 'Area Users'
            : activeTab === 'Riders'
            ? 'Riders'
            : activeTab}
        </Text>
        {activeTab === 'Menus' && isOwnProfile && isOwnerOrVendor ? (
          <TouchableOpacity
            onPress={() => navigation?.navigate('MenuManageScreen')}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#333" />
          </TouchableOpacity>
        ) : activeTab === 'Posts' && profileUserId === currentUser?.id ? (
          <TouchableOpacity onPress={openPostCreateNewFlow}>
            <MaterialCommunityIcons name="plus" size={24} color="#333" />
          </TouchableOpacity>
        ) : activeTab === 'Video' && profileUserId === currentUser?.id ? (
          <TouchableOpacity
            onPress={() => {
              // Open Create tab and tell it to return to this screen when closed
              navigation.navigate('Create', {
                returnTo: { tab: 'Home1', screen: 'BusinessProfileViewScreen' },
                _openPicker: Date.now(),
              });
            }}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#333" />
          </TouchableOpacity>
        ) : activeTab === 'Promotions' &&
          isOwnProfile &&
          isOwnerOrVendor ? (
          <TouchableOpacity
            onPress={() => {
              setEditingPromotion(null);
              if (promotionSubTab === 'booking') {
                setCreateTierDiscountModalVisible(true);
              } else {
                setCreatePromotionModalVisible(true);
              }
            }}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#333" />
          </TouchableOpacity>
        ) : activeTab === 'Photos' && isOwnProfile ? (
          <TouchableOpacity
            onPress={handleGalleryUpload}
            disabled={galleryUploading}
          >
            <MaterialCommunityIcons
              name="plus"
              size={24}
              color={galleryUploading ? '#999' : '#333'}
            />
          </TouchableOpacity>
        ) : activeTab === 'Riders' && isOwnProfile && isOwnerOrVendor ? (
          <TouchableOpacity onPress={openAddRiderModal}>
            <MaterialCommunityIcons name="plus" size={24} color="#333" />
          </TouchableOpacity>
        ) : (
          <View style={styles.plusPlaceholder} />
        )}
      </View>
      {activeTab === 'Riders' && isOwnProfile && isOwnerOrVendor ? (
        <View style={styles.ridersTopBar}>
          <Text style={styles.ridersTopHint}>
            Riders log in with email and password and see assigned deliveries on
            the Orders tab.
          </Text>
          <TouchableOpacity
            style={styles.addRiderBtn}
            onPress={openAddRiderModal}
            activeOpacity={0.85}
          >
            <MaterialCommunityIcons name="account-plus" size={20} color="#fff" />
            <Text style={styles.addRiderBtnText}>Add Rider</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      {activeTab === 'Area Users' && isOwnProfile && isOwnerOrVendor ? (
        <View style={styles.areaUsersSummary}>
          <Text style={styles.areaUsersSummaryText}>
            {areaUsersMeta.radiusKm != null
              ? `Logged-in customers within ${areaUsersMeta.radiusKm} km of your restaurant`
              : 'Set content/browse area (km) in Settings to list nearby customers'}
          </Text>
          {areaUsersMeta.ownerAddress ? (
            <Text style={styles.areaUsersSummarySub} numberOfLines={2}>
              Your restaurant: {areaUsersMeta.ownerAddress}
            </Text>
          ) : null}
          {areaUsersMeta.message ? (
            <Text style={styles.areaUsersSummaryHint}>{areaUsersMeta.message}</Text>
          ) : null}
          {!areaUsersLoading && areaUsersMeta.radiusKm != null ? (
            <Text style={styles.areaUsersSummaryCount}>
              {areaUsersMeta.total} user
              {areaUsersMeta.total === 1 ? '' : 's'} in your content area
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  const getListData = () => {
    switch (activeTab) {
      case 'Posts':
        return posts;
      case 'Promotions': {
        const typeMap = {
          order: OFFER_TYPES.ORDER,
          booking: OFFER_TYPES.BOOKING,
          both: OFFER_TYPES.BOTH,
        };
        const list = filterPromotionsByType(
          promotions,
          typeMap[promotionSubTab] || OFFER_TYPES.ORDER,
        );
        return list.map(p => ({
          ...p,
          id: p.id,
          title: p.title,
          image: getPromotionDisplayImage(p),
          price: formatPromotionSummary(p),
          views: formatCount(p.viewCount),
        }));
      }
      case 'Gallery':
        return combinedGalleryFeed;
      case 'Photos':
        return galleryPhotos.map(p => ({
          ...p,
          id: p.id,
          image: p.src,
        }));
      case 'Menus': {
        const result = [];
        const files = Array.isArray(menuFiles) ? menuFiles : [];
        if (files.length > 0) {
          result.push({
            type: 'menuSection',
            id: 'section-menu-files',
            title: 'Menu Files',
          });
          files.forEach(f =>
            result.push({
              type: 'menuFile',
              id: `file-${f.id || f.fileUrl}`,
              fileId: f.id,
              fileUrl: f.fileUrl,
              fileType: f.fileType || '',
              title: f.originalName || f.name || 'Menu file',
            }),
          );
        }
        (menuCategories || []).forEach(cat => {
          const items = menuItems.filter(
            m => (m.categoryId || m.category?.id) === cat.id,
          );
          if (items.length > 0) {
            result.push({
              type: 'menuSection',
              id: `section-${cat.id}`,
              title: cat.name,
            });
            items.forEach(m => result.push(mapMenuListRow(m)));
          }
        });
        const uncategorized = menuItems.filter(
          m => !m.categoryId && !m.category?.id,
        );
        if (uncategorized.length > 0) {
          result.push({
            type: 'menuSection',
            id: 'section-uncategorized',
            title: 'Uncategorized',
          });
          uncategorized.forEach(m => result.push(mapMenuListRow(m)));
        }
        if (result.length === 0 && menuItems.length > 0) {
          menuItems.forEach(m => result.push(mapMenuListRow(m)));
        }
        return result;
      }
      case 'Video':
        return ownerVideos;
      case 'Notification':
        return notifications;
      case 'Area Users':
        return areaUsers.map(u => ({
          ...u,
          id: u.id,
        }));
      case 'Riders':
        return riders.map(r => ({ ...r, id: r.id }));
      case 'Settings':
        return [];
      default:
        return [];
    }
  };

  const renderAreaUserRow = item => {
    const avatarUri = item.avatar
      ? safeImageUri(item.avatar)
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
          item.name || 'User',
        )}&background=111&color=fff`;
    const locationLine = [item.address, item.postcode].filter(Boolean).join(' · ');
    return (
      <TouchableOpacity
        style={styles.areaUserRow}
        onPress={() =>
          navigation?.navigate('UserViewsScreen', { userId: item.id })
        }
        activeOpacity={0.85}
      >
        <Image source={{ uri: avatarUri }} style={styles.areaUserAvatar} />
        <View style={styles.areaUserBody}>
          <Text style={styles.areaUserName} numberOfLines={1}>
            {item.name}
          </Text>
          {locationLine ? (
            <Text style={styles.areaUserAddress} numberOfLines={2}>
              {locationLine}
            </Text>
          ) : (
            <Text style={styles.areaUserAddressMuted}>No saved address</Text>
          )}
          <Text style={styles.areaUserDistance}>
            {formatDistanceKm(item.distanceKm)} from your restaurant
          </Text>
        </View>
        <MaterialCommunityIcons name="chevron-right" size={22} color="#999" />
      </TouchableOpacity>
    );
  };

  const renderRiderRow = item => {
    const avatarUri = item.avatar
      ? safeImageUri(item.avatar)
      : `https://ui-avatars.com/api/?name=${encodeURIComponent(
          item.name || 'Rider',
        )}&background=FF7F0B&color=fff`;
    return (
      <View style={styles.areaUserRow}>
        <Image source={{ uri: avatarUri }} style={styles.areaUserAvatar} />
        <View style={styles.areaUserBody}>
          <Text style={styles.areaUserName} numberOfLines={1}>
            {item.name || item.email}
          </Text>
          <Text style={styles.areaUserAddress} numberOfLines={1}>
            {item.email}
          </Text>
          {item.phone ? (
            <Text style={styles.areaUserAddressMuted} numberOfLines={1}>
              {item.phone}
            </Text>
          ) : null}
          {item.address ? (
            <Text style={styles.areaUserAddress} numberOfLines={2}>
              {item.address}
            </Text>
          ) : null}
          <Text style={styles.areaUserDistance}>
            Active: {item.activeOrders ?? 0} · Done: {item.completedOrders ?? 0}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.riderDetailsBtn}
          onPress={() =>
            navigation?.navigate('RiderDetailScreen', {
              ownerId: profileUserId,
              riderId: item.id,
            })
          }
        >
          <Text style={styles.riderDetailsBtnText}>Details</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderNotificationRow = item => (
    <View style={styles.notificationRow}>
      <MaterialCommunityIcons
        name={
          item.type === 'order'
            ? 'cart'
            : item.type === 'restaurant_booking'
            ? 'calendar-account'
            : item.type === 'content'
            ? 'video'
            : 'bell'
        }
        size={22}
        color="#666"
        style={styles.notificationIcon}
      />
      <View style={styles.notificationBody}>
        <Text style={styles.notificationMessage} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.notificationMeta}>
          {item.type || 'general'} •{' '}
          {item.createdAt
            ? new Date(item.createdAt).toLocaleDateString()
            : ''}
        </Text>
      </View>
      {item.status === 'unread' ? <View style={styles.unreadDot} /> : null}
    </View>
  );

  const renderContentItem = ({ item }) => {
    if (activeTab === 'Posts') {
      const isShortItem =
        String(item?.sourceType || '').toLowerCase() === 'short' ||
        String(item?.mediaType || '').toLowerCase() === 'short';
      const postId = item.postId || item.id;
      const isVideoPost =
        !isShortItem &&
        (String(item?.mediaType || '').toLowerCase() === 'video' ||
          /\.(mp4|mov|m4v|webm|mkv)(\?|$)/i.test(
            String(item?.mediaUrl || ''),
          ));
      // Posts API does not return user.photos; use profile (channel) avatar first so owner photo shows
      const profileAvatarUri =
        profile?.channelAvatar && String(profile.channelAvatar).trim()
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
        (profileAvatarUri && !profileAvatarUri.includes('ui-avatars.com')
          ? profileAvatarUri
          : null) ||
        (profilePhotoUri &&
        !/via\.placeholder|image-placeholder|avatar-placeholder/i.test(
          String(profilePhotoUri),
        )
          ? profilePhotoUri
          : null) ||
        item.channelAvatar;
      return (
        <BusinessVideoCard
          video={{
            ...item,
            channelAvatar: postOwnerAvatar || item.channelAvatar,
          }}
          postId={postId}
          onPress={() => {
            if (isShortItem) openShortFromPostsTab(item);
            else if (isVideoPost) {
              openOwnerMediaPlayer(postId, {
                rawItem: item,
                videoUrl: item.mediaUrl,
                mediaType: 'video',
              });
            } else openPostMediaPreview(item);
          }}
          onLike={
            isShortItem
              ? undefined
              : currentUser?.id
              ? () => handlePostLike(postId)
              : undefined
          }
          onDislike={
            isShortItem
              ? undefined
              : currentUser?.id
              ? () => handlePostDislike(postId)
              : undefined
          }
          onCommentPress={
            isShortItem
              ? undefined
              : () => {
                  setCommentsModalPostId(postId);
                }
          }
          onShare={isShortItem ? undefined : () => handlePostShare(postId)}
          onMenuPress={
            isShortItem || !isOwnProfile
              ? undefined
              : () => openPostActions(item)
          }
          hideMenuButton={isShortItem || !isOwnProfile}
        />
      );
    }
    if (activeTab === 'Promotions') {
      const canManagePromotion = isOwnProfile && isOwnerOrVendor;
      const listImage = item.image || getPromotionDisplayImage(item);
      const isTierPromo =
        (item.offerType || OFFER_TYPES.ORDER) !== OFFER_TYPES.ORDER &&
        !listImage;
      const hasVideo = Boolean(String(item.videoUrl || '').trim());
      return (
        <View style={styles.manageCardWrap}>
          <PromotionCard
            item={{
              ...item,
              image: listImage ? safeImageUri(listImage) : null,
            }}
            isTierPromo={isTierPromo}
            hasVideo={hasVideo}
            onPress={() => {
              setSelectedPromotion(item);
              setPromotionVideoPaused(true);
              setPromotionDetailModalVisible(true);
            }}
          />
          {canManagePromotion ? (
            <TouchableOpacity
              style={styles.manageDotsBtn}
              onPress={() => openItemActions('promotion', item)}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={20}
                color="#222"
              />
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }
    if (activeTab === 'Menus') {
      if (item.type === 'menuSection') {
        return (
          <View style={styles.menuSectionHeader}>
            <Text style={styles.menuSectionHeaderText} numberOfLines={1}>
              {item.title}
            </Text>
          </View>
        );
      }
      if (item.type === 'menuFile') {
        const url = String(item.fileUrl || '').trim();
        const isPdf =
          /\.pdf(\?|$)/i.test(url) || item.fileType === 'application/pdf';
        return (
          <TouchableOpacity
            style={styles.menuRowItem}
            onPress={() => {
              if (!url) return;
              Linking.openURL(safeImageUri(url));
            }}
            activeOpacity={0.85}
          >
            {isPdf ? (
              <View style={[styles.menuRowImage, styles.menuRowImagePlaceholder]}>
                <MaterialCommunityIcons
                  name="file-pdf-box"
                  size={24}
                  color="#E53935"
                />
              </View>
            ) : (
              <MenuItemThumbnail
                uri={url}
                style={styles.menuRowImage}
                imageStyle={styles.menuRowImage}
              />
            )}
            <View style={styles.menuRowBody}>
              <Text style={styles.menuRowName} numberOfLines={1}>
                {item.title || (isPdf ? 'Menu PDF' : 'Menu image')}
              </Text>
              <Text style={styles.menuRowPrice}>
                {isPdf ? 'PDF menu file' : 'Image menu file'}
              </Text>
            </View>
            {isOwnProfile && item.fileId ? (
              <TouchableOpacity
                style={styles.menuManageBtn}
                onPress={() => openItemActions('menuFile', item)}
              >
                <MaterialCommunityIcons
                  name="dots-vertical"
                  size={20}
                  color="#333"
                />
              </TouchableOpacity>
            ) : (
              <MaterialCommunityIcons
                name="open-in-new"
                size={20}
                color="#666"
              />
            )}
          </TouchableOpacity>
        );
      }
      return (
        <View style={styles.menuRowItem}>
          <MenuItemThumbnail
            uri={item.imageUrl}
            style={styles.menuRowImage}
            imageStyle={styles.menuRowImage}
          />
          <View style={styles.menuRowBody}>
            <Text style={styles.menuRowName} numberOfLines={1}>
              {item.itemName}
            </Text>
            {item.description ? (
              <Text style={styles.menuRowDescription} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            <MenuAllergenRow
              allergens={item.allergens}
              allergenIconUrls={item.allergenIconUrls}
            />
            <Text style={styles.menuRowPrice}>
              {item.price != null ? `£${Number(item.price).toFixed(2)}` : '—'}
            </Text>
          </View>
          {isOwnProfile && item.id ? (
            <TouchableOpacity
              style={styles.menuManageBtn}
              onPress={() => openItemActions('menu', item)}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={20}
                color="#333"
              />
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }
    if (activeTab === 'Gallery') {
      return (
        <TouchableOpacity
          style={styles.gridImageContainer}
          activeOpacity={0.85}
          onPress={() => openCombinedGalleryItem(item)}
        >
          <Image source={{ uri: item.thumbnail }} style={styles.gridImage} />
          {item.mediaType === 'video' ? (
            <View style={styles.galleryVideoBadge}>
              <MaterialCommunityIcons name="play" size={14} color="#fff" />
            </View>
          ) : null}
          {isOwnProfile && item.isScheduled ? (
            <View style={styles.galleryScheduledBadge}>
              <MaterialCommunityIcons
                name="clock-outline"
                size={11}
                color="#fff"
              />
              <Text style={styles.galleryScheduledBadgeText}>Scheduled</Text>
            </View>
          ) : null}
        </TouchableOpacity>
      );
    }
    if (activeTab === 'Photos') {
      return (
        <TouchableOpacity
          style={styles.gridImageContainer}
          onPress={() => openPhotosTabPreviewBP(item)}
          onLongPress={() =>
            isOwnProfile && item.id && handleDeleteGalleryPhoto(item.id)
          }
          activeOpacity={1}
        >
          <Image
            source={{ uri: safeImageUri(item.image) }}
            style={styles.gridImage}
          />
          {isOwnProfile && item.id ? (
            <View style={styles.galleryDeleteBadge}>
              <MaterialCommunityIcons
                name="delete-outline"
                size={18}
                color="#fff"
              />
            </View>
          ) : null}
        </TouchableOpacity>
      );
    }
    if (activeTab === 'Video') {
      return (
        <View style={styles.manageCardWrap}>
          <BusinessVideoTabCard
            item={{
              ...item,
              thumbnail: item.thumbnail || item.thumbnailUrl,
              title: item.title || 'Video',
              views: item.views || formatCount(item.viewCount),
              location:
                item.location || profile?.address || currentUser?.address || '',
              distance: item.distance || '',
            }}
            onPress={() => {
              if (!item?.id || !profileUserId) return;
              openVideoDetails(item);
            }}
          />
          {isOwnProfile && item.id ? (
            <TouchableOpacity
              style={styles.manageDotsBtn}
              onPress={() => openItemActions('video', item)}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={20}
                color="#222"
              />
            </TouchableOpacity>
          ) : null}
        </View>
      );
    }
    if (activeTab === 'Notification') {
      return renderNotificationRow(item);
    }
    if (activeTab === 'Area Users') {
      return renderAreaUserRow(item);
    }
    if (activeTab === 'Riders') {
      return renderRiderRow(item);
    }
    return null;
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="#F6B041"
        translucent
      />
      <View style={[styles.fixedTopBar, { paddingTop: insets.top }]}>
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation?.goBack()}
            activeOpacity={0.85}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={22}
              color="#FFF"
            />
            <Text style={styles.topNavBackText}>Back</Text>
          </TouchableOpacity>
          <Image
            source={appLogo}
            style={styles.promoHeaderLogo}
            resizeMode="contain"
          />
          <View style={styles.promoHeaderBell}>
            <NotificationBellButton
              unreadCount={
                isOwnProfile && isOwnerOrVendor ? unreadNotificationCount : 0
              }
              onPress={handleNotificationBellPress}
              iconColor="#1F2937"
              size={24}
            />
          </View>
        </View>
      </View>
      {activeTab === 'Posts' && postsLoading && posts.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FF7F0B" />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      ) : null}
      {activeTab === 'Gallery' &&
      (galleryLoading || postsLoading || ownerVideosLoading) &&
      combinedGalleryFeed.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FF7F0B" />
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      ) : null}
      {activeTab === 'Photos' &&
      galleryLoading &&
      galleryPhotos.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FF7F0B" />
          <Text style={styles.loadingText}>Loading gallery...</Text>
        </View>
      ) : null}
      {activeTab === 'Video' &&
      ownerVideosLoading &&
      ownerVideos.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FF7F0B" />
          <Text style={styles.loadingText}>Loading videos...</Text>
        </View>
      ) : null}
      {activeTab === 'Notification' &&
      notificationsLoading &&
      notifications.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FF7F0B" />
          <Text style={styles.loadingText}>Loading notifications...</Text>
        </View>
      ) : null}
      {activeTab === 'Area Users' &&
      areaUsersLoading &&
      areaUsers.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FF7F0B" />
          <Text style={styles.loadingText}>Loading area users...</Text>
        </View>
      ) : null}
      {activeTab === 'Promotions' &&
      promotionsLoading &&
      promotions.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FF7F0B" />
          <Text style={styles.loadingText}>Loading promotions...</Text>
        </View>
      ) : null}
      {activeTab === 'Menus' && menuLoading && menuItems.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FF7F0B" />
          <Text style={styles.loadingText}>Loading menu...</Text>
        </View>
      ) : null}
      <FlatList
        key={
          activeTab === 'Gallery' || activeTab === 'Photos'
            ? `grid-3-col-${activeTab}`
            : activeTab === 'Menus'
            ? 'menus'
            : `list-1-col-${activeTab}`
        }
        style={styles.mainList}
        data={getListData()}
        keyExtractor={(item, index) => item.id || `item-${index}`}
        renderItem={renderContentItem}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        numColumns={activeTab === 'Gallery' || activeTab === 'Photos' ? 3 : 1}
        columnWrapperStyle={
          activeTab === 'Gallery' || activeTab === 'Photos'
            ? styles.gridColumnWrapper
            : undefined
        }
        refreshControl={
          activeTab === 'Posts' && profileUserId ? (
            <RefreshControl
              refreshing={postsRefreshing}
              onRefresh={() => loadPosts(true)}
              colors={['#FF7F0B']}
              tintColor="#FF7F0B"
            />
          ) : activeTab === 'Gallery' ? (
            <RefreshControl
              refreshing={galleryLoading || postsLoading || ownerVideosLoading}
              onRefresh={() => {
                loadGallery();
                loadPosts(true);
                loadOwnerVideos();
              }}
              colors={['#FF7F0B']}
              tintColor="#FF7F0B"
            />
          ) : activeTab === 'Photos' ? (
            <RefreshControl
              refreshing={galleryLoading}
              onRefresh={loadGallery}
              colors={['#FF7F0B']}
              tintColor="#FF7F0B"
            />
          ) : activeTab === 'Video' ? (
            <RefreshControl
              refreshing={ownerVideosLoading}
              onRefresh={loadOwnerVideos}
              colors={['#FF7F0B']}
              tintColor="#FF7F0B"
            />
          ) : activeTab === 'Notification' ? (
            <RefreshControl
              refreshing={notificationsLoading}
              onRefresh={loadNotifications}
              colors={['#FF7F0B']}
              tintColor="#FF7F0B"
            />
          ) : activeTab === 'Area Users' ? (
            <RefreshControl
              refreshing={areaUsersLoading}
              onRefresh={loadAreaUsers}
              colors={['#FF7F0B']}
              tintColor="#FF7F0B"
            />
          ) : activeTab === 'Riders' && isOwnProfile && isOwnerOrVendor ? (
            <RefreshControl
              refreshing={ridersLoading}
              onRefresh={loadRiders}
              colors={['#FF7F0B']}
              tintColor="#FF7F0B"
            />
          ) : activeTab === 'Promotions' && profileUserId ? (
            <RefreshControl
              refreshing={promotionsRefreshing}
              onRefresh={() => loadPromotions(true)}
              colors={['#FF7F0B']}
              tintColor="#FF7F0B"
            />
          ) : activeTab === 'Menus' ? (
            <RefreshControl
              refreshing={menuLoading}
              onRefresh={loadMenu}
              colors={['#FF7F0B']}
              tintColor="#FF7F0B"
            />
          ) : undefined
        }
        ListEmptyComponent={
          activeTab === 'Settings' && isOwnProfile && isOwnerOrVendor ? (
            <View style={styles.settingsPanel}>
              <Text style={styles.settingsHint}>
                Set how long delivery usually takes, three separate areas from
                your shop on the map (content/browse, pickup, delivery), and
                tax/charges by distance for delivery.
              </Text>
              <Text style={styles.editLabel}>Delivery Time</Text>
              <TextInput
                style={styles.editInput}
                value={editDeliveryTime}
                onChangeText={setEditDeliveryTime}
                placeholder='e.g. 30-45 minutes'
                placeholderTextColor="#999"
              />
              <Text style={styles.editLabel}>
                Content / Browse Area (KM)
              </Text>
              <Text style={styles.settingsFieldHint}>
                Users inside this radius see your videos, shorts, posts, and
                promotions.
              </Text>
              <TextInput
                style={styles.editInput}
                value={editContentAreaKm}
                onChangeText={setEditContentAreaKm}
                placeholder="e.g. 20"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
              <Text style={styles.editLabel}>Pickup Area (KM)</Text>
              <Text style={styles.settingsFieldHint}>
                Customers must be within this radius to place pickup orders.
              </Text>
              <TextInput
                style={styles.editInput}
                value={editPickupAreaKm}
                onChangeText={setEditPickupAreaKm}
                placeholder="e.g. 10"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
              <Text style={styles.editLabel}>Delivery Area (KM)</Text>
              <Text style={styles.settingsFieldHint}>
                Customers must be within this radius for delivery orders.
              </Text>
              <TextInput
                style={styles.editInput}
                value={editDeliveryAreaKm}
                onChangeText={setEditDeliveryAreaKm}
                placeholder="e.g. 15"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
              <Text style={styles.editLabel}>Tax & charges — 0-10 km (£)</Text>
              <TextInput
                style={styles.editInput}
                value={editTaxCharge0To10Km}
                onChangeText={setEditTaxCharge0To10Km}
                placeholder="e.g. 2.50"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
              <Text style={styles.editLabel}>Tax & charges — 11-20 km (£)</Text>
              <TextInput
                style={styles.editInput}
                value={editTaxCharge11To20Km}
                onChangeText={setEditTaxCharge11To20Km}
                placeholder="e.g. 4.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
              <Text style={styles.editLabel}>Tax & charges — 21-30 km (£)</Text>
              <TextInput
                style={styles.editInput}
                value={editTaxCharge21To30Km}
                onChangeText={setEditTaxCharge21To30Km}
                placeholder="e.g. 6.00"
                placeholderTextColor="#999"
                keyboardType="decimal-pad"
              />
              {isVendor ? (
                <>
                  <Text style={styles.editLabel}>Min order quantity (per item)</Text>
                  <Text style={styles.settingsFieldHint}>
                    Each menu item in an order must meet this minimum (e.g. 5
                    means samosa and biriyani each need at least 5).
                  </Text>
                  <TextInput
                    style={styles.editInput}
                    value={editVendorMinOrderQty}
                    onChangeText={setEditVendorMinOrderQty}
                    placeholder="e.g. 5"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                  />
                  <Text style={styles.editLabel}>Max order quantity (per item)</Text>
                  <Text style={styles.settingsFieldHint}>
                    Optional cap per menu line item. Leave blank for no maximum.
                  </Text>
                  <TextInput
                    style={styles.editInput}
                    value={editVendorMaxOrderQty}
                    onChangeText={setEditVendorMaxOrderQty}
                    placeholder="e.g. 50"
                    placeholderTextColor="#999"
                    keyboardType="number-pad"
                  />
                </>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.editSaveBtn,
                  styles.settingsSaveBtn,
                  savingDeliverySettings && styles.editSaveBtnDisabled,
                ]}
                onPress={saveDeliverySettings}
                disabled={savingDeliverySettings}
              >
                {savingDeliverySettings ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.editSaveBtnText}>Save settings</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : activeTab === 'Riders' &&
            isOwnProfile &&
            isOwnerOrVendor &&
            !ridersLoading &&
            riders.length === 0 ? (
            <Text style={styles.areaUsersEmpty}>No riders yet. Tap Add Rider above.</Text>
          ) : activeTab === 'Area Users' &&
            isOwnProfile &&
            isOwnerOrVendor &&
            !areaUsersLoading &&
            areaUsers.length === 0 ? (
            <Text style={styles.areaUsersEmpty}>
              {areaUsersMeta.message ||
                'No logged-in customers with a saved location in your content area yet.'}
            </Text>
          ) : null
        }
      />
      <Modal
        visible={notificationsModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNotificationsModalVisible(false)}
      >
        <View style={styles.editModalOverlay}>
          <TouchableOpacity
            style={styles.editModalBackdrop}
            activeOpacity={1}
            onPress={() => setNotificationsModalVisible(false)}
          />
          <View style={styles.notificationsModalBox}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Notifications</Text>
              <TouchableOpacity
                onPress={() => setNotificationsModalVisible(false)}
              >
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            {notificationsLoading && notifications.length === 0 ? (
              <View style={styles.notificationsModalLoading}>
                <ActivityIndicator size="small" color="#FF7F0B" />
                <Text style={styles.notificationsModalLoadingText}>
                  Loading notifications...
                </Text>
              </View>
            ) : notifications.length === 0 ? (
              <Text style={styles.notificationsModalEmpty}>
                No notifications yet.
              </Text>
            ) : (
              <FlatList
                data={notifications}
                keyExtractor={(item, index) => item.id || `notif-${index}`}
                renderItem={({ item }) => renderNotificationRow(item)}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={notificationsLoading}
                    onRefresh={loadNotifications}
                    colors={['#FF7F0B']}
                    tintColor="#FF7F0B"
                  />
                }
              />
            )}
          </View>
        </View>
      </Modal>
      <CommentsModal
        visible={!!commentsModalPostId}
        onClose={() => setCommentsModalPostId(null)}
        contentType="post"
        contentId={commentsModalPostId}
        user={currentUser}
        onCommentAdded={handlePostCommentAdded}
        onCommentDeleted={(_topLevel, count) =>
          handlePostCommentAdded(null, -(count || 1))
        }
      />
      <CommentsModal
        visible={!!commentsModalGalleryPhotoId}
        onClose={() => setCommentsModalGalleryPhotoId(null)}
        contentType="gallery_photo"
        contentId={commentsModalGalleryPhotoId}
        galleryChannelUserId={profileUserId}
        user={currentUser}
        totalComments={
          commentsModalGalleryPhotoId
            ? Number(
                galleryPhotos.find(
                  g => String(g.id) === String(commentsModalGalleryPhotoId),
                )?.commentCount ?? 0,
              )
            : undefined
        }
        onCommentAdded={handleBPGalleryCommentAdded}
        onCommentDeleted={(_top, count) =>
          handleBPGalleryCommentAdded(null, -(count || 1))
        }
      />
      <GalleryVideoDetailModal
        visible={!!galleryVideoModal}
        onClose={() => setGalleryVideoModal(null)}
        contentId={galleryVideoModal?.contentId}
        contentKind={galleryVideoModal?.kind === 'short' ? 'short' : 'video'}
        profileUserId={profileUserId}
        currentUser={currentUser}
        navigation={navigation}
        siblingItems={ownerVideos}
        onContentDeleted={({ contentId }) => {
          setOwnerVideos(prev =>
            prev.filter(v => String(v.id) !== String(contentId)),
          );
          setGalleryVideoModal(null);
        }}
      />
      <Modal
        visible={postActionVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPostActionVisible(false)}
      >
        <View style={styles.postActionBackdrop}>
          <View style={styles.postActionCard}>
            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={openPostEdit}
              activeOpacity={0.85}
            >
              <Text style={styles.postActionText}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={deletePostFromActions}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.postActionText, styles.postActionDeleteText]}
              >
                Delete
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.postActionBtn, styles.postActionCancelBtn]}
              onPress={() => setPostActionVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.postActionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={postEditVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPostEditVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.postEditBackdrop}
        >
          <View style={styles.postEditCard}>
            <Text style={styles.postEditTitle}>Edit Post</Text>
            <TextInput
              style={styles.postEditInput}
              value={postEditTitle}
              onChangeText={setPostEditTitle}
              placeholder="Title"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={[styles.postEditInput, styles.postEditTextarea]}
              value={postEditDescription}
              onChangeText={setPostEditDescription}
              placeholder="Description"
              placeholderTextColor="#9CA3AF"
              multiline
            />
            <TextInput
              style={styles.postEditInput}
              value={postEditWebsite}
              onChangeText={setPostEditWebsite}
              placeholder="Website"
              placeholderTextColor="#9CA3AF"
            />
            <TextInput
              style={styles.postEditInput}
              value={postEditHashtags}
              onChangeText={setPostEditHashtags}
              placeholder="#tags separated by space"
              placeholderTextColor="#9CA3AF"
            />
            <View style={styles.postEditRow}>
              <TouchableOpacity
                style={styles.postEditMediaBtn}
                onPress={pickPostThumbnail}
              >
                <Text style={styles.postEditMediaBtnText}>
                  Change Thumbnail
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.postEditMediaBtn}
                onPress={pickPostVideo}
              >
                <Text style={styles.postEditMediaBtnText}>Change Video</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.postEditActions}>
              <TouchableOpacity
                style={[styles.postEditActionBtn, styles.postEditCancelBtn]}
                onPress={() => setPostEditVisible(false)}
                disabled={postEditSaving}
              >
                <Text style={styles.postEditCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.postEditActionBtn, styles.postEditSaveBtn]}
                onPress={submitPostEdit}
                disabled={postEditSaving}
              >
                {postEditSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.postEditSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <Modal
        visible={itemActionVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setItemActionVisible(false)}
      >
        <View style={styles.postActionBackdrop}>
          <View style={styles.postActionCard}>
            {itemActionTarget?.kind !== 'menuFile' ? (
              <TouchableOpacity
                style={styles.postActionBtn}
                onPress={openItemEdit}
                activeOpacity={0.85}
              >
                <Text style={styles.postActionText}>Edit</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.postActionBtn}
              onPress={deleteItemFromActions}
              activeOpacity={0.85}
            >
              <Text
                style={[styles.postActionText, styles.postActionDeleteText]}
              >
                Delete
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.postActionBtn, styles.postActionCancelBtn]}
              onPress={() => setItemActionVisible(false)}
              activeOpacity={0.85}
            >
              <Text style={styles.postActionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal
        visible={itemEditVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setItemEditVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.postEditBackdrop}
        >
          <View style={styles.postEditCard}>
            <Text style={styles.postEditTitle}>
              Edit{' '}
              {itemActionTarget?.kind === 'promotion'
                ? 'Promotion'
                : itemActionTarget?.kind === 'menu'
                ? 'Menu'
                : 'Video'}
            </Text>
            <ScrollView
              style={styles.postEditFormScroll}
              contentContainerStyle={styles.postEditFormContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <TextInput
                style={styles.postEditInput}
                value={itemEditTitle}
                onChangeText={setItemEditTitle}
                placeholder={
                  itemActionTarget?.kind === 'menu' ? 'Item Name' : 'Title'
                }
                placeholderTextColor="#9CA3AF"
              />
              <TextInput
                style={[styles.postEditInput, styles.postEditTextarea]}
                value={itemEditDescription}
                onChangeText={setItemEditDescription}
                placeholder="Description"
                placeholderTextColor="#9CA3AF"
                multiline
              />
              {itemActionTarget?.kind === 'menu' ? (
                <TextInput
                  style={styles.postEditInput}
                  value={itemEditPrice}
                  onChangeText={setItemEditPrice}
                  placeholder="Price"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="decimal-pad"
                />
              ) : null}
              {itemActionTarget?.kind === 'menu' ? (
                <>
                  <Text style={styles.postEditSmallLabel}>Category</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.postEditChipRow}
                    contentContainerStyle={styles.postEditChipRowContent}
                    keyboardShouldPersistTaps="handled"
                  >
                    <TouchableOpacity
                      style={[
                        styles.postEditChip,
                        !itemEditCategoryId && styles.postEditChipActive,
                      ]}
                      onPress={() => setItemEditCategoryId('')}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.postEditChipText,
                          !itemEditCategoryId && styles.postEditChipTextActive,
                        ]}
                      >
                        None
                      </Text>
                    </TouchableOpacity>
                    {(menuCategories || []).map(cat => (
                      <TouchableOpacity
                        key={cat.id}
                        style={[
                          styles.postEditChip,
                          String(itemEditCategoryId) === String(cat.id) &&
                            styles.postEditChipActive,
                        ]}
                        onPress={() => setItemEditCategoryId(String(cat.id))}
                        activeOpacity={0.85}
                      >
                        <Text
                          style={[
                            styles.postEditChipText,
                            String(itemEditCategoryId) === String(cat.id) &&
                              styles.postEditChipTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {cat.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  {itemEditCategoryId ? (
                    <Text style={styles.postEditSelectionHint}>
                      Category:{' '}
                      {(menuCategories || []).find(
                        c => String(c.id) === String(itemEditCategoryId),
                      )?.name || 'Selected'}
                    </Text>
                  ) : (
                    <Text style={styles.postEditSelectionHint}>
                      Category: None (Uncategorized)
                    </Text>
                  )}
                  <Text style={styles.postEditSmallLabel}>Allergens</Text>
                  <View style={styles.postEditAllergenWrap}>
                    {ALLERGENS.map(a => {
                      const active = itemEditAllergens.includes(a.key);
                      return (
                        <TouchableOpacity
                          key={a.key}
                          style={[
                            styles.postEditAllergenChip,
                            active && styles.postEditAllergenChipActive,
                          ]}
                          onPress={() =>
                            setItemEditAllergens(prev =>
                              prev.includes(a.key)
                                ? prev.filter(x => x !== a.key)
                                : [...prev, a.key],
                            )
                          }
                          activeOpacity={0.85}
                        >
                          <MaterialCommunityIcons
                            name={a.icon}
                            size={16}
                            color={active ? '#fff' : '#666'}
                          />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <Text style={styles.postEditSmallLabel}>Menu preview</Text>
                  <View style={styles.postEditMenuPreview}>
                    <MenuAllergenRow
                      allergens={itemEditAllergens}
                      allergenIconUrls={itemEditAllergenIconUrls}
                    />
                    {!itemEditAllergens?.length &&
                    !itemEditAllergenIconUrls?.length ? (
                      <Text style={styles.postEditSelectionHint}>
                        No allergens selected — none will show on the menu.
                      </Text>
                    ) : null}
                  </View>
                  <Text style={styles.postEditSmallLabel}>
                    Custom allergen icons
                  </Text>
                  <TouchableOpacity
                    style={styles.postEditMediaBtn}
                    onPress={pickItemAllergenIcon}
                    disabled={itemEditAllergenIconUploading}
                  >
                    <View style={styles.postEditMediaBtnContent}>
                      {itemEditAllergenIconUploading ? (
                        <ActivityIndicator size="small" color="#E26A00" />
                      ) : (
                        <MaterialCommunityIcons
                          name="image-plus"
                          size={18}
                          color="#E26A00"
                        />
                      )}
                      <Text style={styles.postEditMediaBtnText}>
                        {itemEditAllergenIconUploading
                          ? 'Uploading icon...'
                          : 'Upload allergen icon'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  {itemEditAllergenIconUrls.length > 0 ? (
                    <View style={styles.postEditCustomIconWrap}>
                      {itemEditAllergenIconUrls.map((uri, idx) => (
                        <View
                          key={`${uri}-${idx}`}
                          style={styles.postEditCustomIconItem}
                        >
                          <Image
                            source={{ uri: safeImageUri(uri) }}
                            style={styles.postEditCustomIconImage}
                          />
                          <TouchableOpacity
                            style={styles.postEditCustomIconRemove}
                            onPress={() =>
                              setItemEditAllergenIconUrls(prev =>
                                prev.filter((_, i) => i !== idx),
                              )
                            }
                          >
                            <MaterialCommunityIcons
                              name="close"
                              size={12}
                              color="#fff"
                            />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ) : null}
                </>
              ) : null}
              {itemActionTarget?.kind === 'promotion' ? (
                <>
                  <TextInput
                    style={styles.postEditInput}
                    value={itemEditPromoCode}
                    onChangeText={setItemEditPromoCode}
                    placeholder="Promo code"
                    placeholderTextColor="#9CA3AF"
                  />
                  <TextInput
                    style={styles.postEditInput}
                    value={itemEditPromoAmount}
                    onChangeText={setItemEditPromoAmount}
                    placeholder="Promo amount (%)"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                  />
                  {(itemActionTarget?.item?.offerType || OFFER_TYPES.ORDER) ===
                  OFFER_TYPES.ORDER ? (
                    <>
                      <Text style={styles.postEditSmallLabel}>
                        Menu items in this offer
                      </Text>
                      {menuLoading ? (
                        <ActivityIndicator
                          size="small"
                          color="#FF7F0B"
                          style={{ marginVertical: 8 }}
                        />
                      ) : menuItems.length === 0 ? (
                        <Text style={styles.promoEditMenuHint}>
                          No menu items yet. Add items in your menu first.
                        </Text>
                      ) : (
                        <View style={styles.promoEditMenuList}>
                          <TouchableOpacity
                            style={[
                              styles.promoEditMenuRow,
                              styles.promoEditSelectAllRow,
                            ]}
                            onPress={toggleItemEditSelectAllMenus}
                            activeOpacity={0.7}
                          >
                            <MaterialCommunityIcons
                              name={
                                itemEditAllMenusSelected
                                  ? 'checkbox-marked'
                                  : 'checkbox-blank-outline'
                              }
                              size={22}
                              color={
                                itemEditAllMenusSelected ? '#FF7F0B' : '#999'
                              }
                            />
                            <Text style={styles.promoEditMenuName}>
                              {itemEditAllMenusSelected
                                ? 'Unselect all'
                                : 'Select all'}
                            </Text>
                          </TouchableOpacity>
                          {itemEditMenuSections.map(section => (
                            <View key={section.id} style={styles.promoEditMenuSection}>
                              <Text
                                style={styles.promoEditMenuSectionTitle}
                                numberOfLines={1}
                              >
                                {section.title}
                              </Text>
                              {section.data.map(menuItem => {
                                const menuId = String(menuItem.id);
                                const checked =
                                  itemEditSelectedMenuIds.includes(menuId);
                                return (
                                  <TouchableOpacity
                                    key={menuId}
                                    style={styles.promoEditMenuRow}
                                    onPress={() => toggleItemEditMenuId(menuId)}
                                    activeOpacity={0.7}
                                  >
                                    <MaterialCommunityIcons
                                      name={
                                        checked
                                          ? 'checkbox-marked'
                                          : 'checkbox-blank-outline'
                                      }
                                      size={22}
                                      color={checked ? '#FF7F0B' : '#999'}
                                    />
                                    <Text
                                      style={styles.promoEditMenuName}
                                      numberOfLines={1}
                                    >
                                      {menuItem.itemName || 'Unnamed'}
                                    </Text>
                                    {menuItem.price != null ? (
                                      <Text style={styles.promoEditMenuPrice}>
                                        {typeof menuItem.price === 'number'
                                          ? menuItem.price.toFixed(2)
                                          : menuItem.price}
                                      </Text>
                                    ) : null}
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          ))}
                        </View>
                      )}
                    </>
                  ) : null}
                </>
              ) : null}
              <View style={styles.postEditRow}>
                <TouchableOpacity
                  style={styles.postEditMediaBtn}
                  onPress={pickItemThumbnail}
                >
                  <Text style={styles.postEditMediaBtnText}>
                    Change Thumbnail
                  </Text>
                </TouchableOpacity>
                {itemActionTarget?.kind !== 'menu' ? (
                  <TouchableOpacity
                    style={styles.postEditMediaBtn}
                    onPress={pickItemVideo}
                  >
                    <Text style={styles.postEditMediaBtnText}>
                      Change Video
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </ScrollView>
            <View style={styles.postEditActions}>
              <TouchableOpacity
                style={[styles.postEditActionBtn, styles.postEditCancelBtn]}
                onPress={() => setItemEditVisible(false)}
                disabled={itemEditSaving}
              >
                <Text style={styles.postEditCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.postEditActionBtn, styles.postEditSaveBtn]}
                onPress={submitItemEdit}
                disabled={itemEditSaving}
              >
                {itemEditSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.postEditSaveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      <CreatePromotionModal
        visible={createPromotionModalVisible}
        offerType={
          (editingPromotion?.offerType === OFFER_TYPES.BOTH
            ? OFFER_TYPES.BOTH
            : promotionSubTab === 'both'
            ? OFFER_TYPES.BOTH
            : OFFER_TYPES.ORDER)
        }
        promotionToEdit={
          editingPromotion &&
          (editingPromotion.offerType || OFFER_TYPES.ORDER) !== OFFER_TYPES.BOOKING
            ? editingPromotion
            : null
        }
        onClose={() => {
          setCreatePromotionModalVisible(false);
          setEditingPromotion(null);
        }}
        onSuccess={() => {
          loadPromotions(true);
          setEditingPromotion(null);
        }}
        userId={currentUser?.id}
      />
      <CreateTierDiscountModal
        visible={createTierDiscountModalVisible}
        promotionToEdit={
          editingPromotion?.offerType === OFFER_TYPES.BOOKING
            ? editingPromotion
            : null
        }
        onClose={() => {
          setCreateTierDiscountModalVisible(false);
          setEditingPromotion(null);
        }}
        onSuccess={() => {
          loadPromotions(true);
          setEditingPromotion(null);
        }}
        userId={currentUser?.id}
        offerType={OFFER_TYPES.BOOKING}
      />

      {/* Promotion detail modal: video/image + full details */}
      <Modal
        visible={promotionDetailModalVisible && !!selectedPromotion}
        animationType="slide"
        onRequestClose={() => {
          setPromotionDetailModalVisible(false);
          setSelectedPromotion(null);
          setPromotionVideoPaused(true);
        }}
      >
        <SafeAreaView
          style={styles.promotionDetailModalContainer}
          edges={['top']}
        >
          <View style={styles.promotionDetailModalHeader}>
            <TouchableOpacity
              style={styles.promotionDetailCloseBtn}
              onPress={() => {
                setPromotionDetailModalVisible(false);
                setSelectedPromotion(null);
                setPromotionVideoPaused(true);
              }}
            >
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.promotionDetailModalTitle} numberOfLines={1}>
              {selectedPromotion?.title || 'Promotion'}
            </Text>
            <View style={styles.promotionDetailCloseBtn} />
          </View>
          <ScrollView
            style={styles.promotionDetailScroll}
            showsVerticalScrollIndicator={false}
          >
            {selectedPromotion?.videoUrl ? (
              <View style={styles.promotionDetailMediaWrap}>
                <Video
                  ref={promotionVideoRef}
                  source={{ uri: String(selectedPromotion.videoUrl).trim() }}
                  style={styles.promotionDetailVideo}
                  resizeMode="contain"
                  paused={promotionVideoPaused}
                  repeat={false}
                  controls={false}
                  onError={() => {}}
                />
                <Pressable
                  style={StyleSheet.absoluteFill}
                  onPress={() => setPromotionVideoPaused(p => !p)}
                >
                  <View style={styles.promotionDetailPlayOverlay}>
                    <MaterialCommunityIcons
                      name={
                        promotionVideoPaused
                          ? 'play-circle-outline'
                          : 'pause-circle-outline'
                      }
                      size={72}
                      color="rgba(255,255,255,0.9)"
                    />
                  </View>
                </Pressable>
              </View>
            ) : (
              <Image
                source={{
                  uri: safeImageUri(
                    selectedPromotion?.thumbnailUrl ||
                      selectedPromotion?.image ||
                      IMAGE_PLACEHOLDER,
                  ),
                }}
                style={styles.promotionDetailImage}
                resizeMode="cover"
              />
            )}
            <View style={styles.promotionDetailBody}>
              <Text style={styles.promotionDetailTitle}>
                {selectedPromotion?.title || '—'}
              </Text>
              {selectedPromotion?.description ? (
                <Text style={styles.promotionDetailDescription}>
                  {selectedPromotion.description}
                </Text>
              ) : null}
              <View style={styles.promotionDetailMetaRow}>
                <MaterialCommunityIcons
                  name="eye-outline"
                  size={18}
                  color="#666"
                />
                <Text style={styles.promotionDetailMetaText}>
                  {formatCount(selectedPromotion?.viewCount ?? 0)} views
                </Text>
              </View>
              {selectedPromotion?.promoCode ? (
                <View style={styles.promotionDetailPromoRow}>
                  <Text style={styles.promotionDetailPromoLabel}>
                    Promo Code
                  </Text>
                  <Text style={styles.promotionDetailPromoCode}>
                    {selectedPromotion.promoCode}
                  </Text>
                </View>
              ) : null}
              {selectedPromotion?.promoAmount != null ? (
                <Text style={styles.promotionDetailOffer}>
                  Get {selectedPromotion.promoAmount}% OFF
                </Text>
              ) : null}
              {selectedPromotion?.startDate ? (
                <Text style={styles.promotionDetailDate}>
                  Start:{' '}
                  {new Date(selectedPromotion.startDate).toLocaleDateString()}
                </Text>
              ) : null}
              {selectedPromotion?.expireDate ? (
                <Text style={styles.promotionDetailDate}>
                  Expires:{' '}
                  {new Date(selectedPromotion.expireDate).toLocaleDateString()}
                </Text>
              ) : null}
              {formatPromotionSchedule(selectedPromotion) ? (
                <Text style={styles.promotionDetailDate}>
                  Schedule: {formatPromotionSchedule(selectedPromotion)}
                </Text>
              ) : null}
              {selectedPromotion?.user?.nickname ||
              selectedPromotion?.user?.name ? (
                <Text style={styles.promotionDetailBusiness}>
                  {selectedPromotion.user.nickname ||
                    selectedPromotion.user.name}
                </Text>
              ) : null}
              {selectedPromotion?.user?.address ? (
                <Text style={styles.promotionDetailAddress} numberOfLines={2}>
                  {selectedPromotion.user.address}
                </Text>
              ) : null}
              {/* {selectedPromotion?.userId && currentUser?.id ? (
                <TouchableOpacity
                  style={styles.promotionDetailOrderBtn}
                  onPress={() => {
                    setPromotionDetailModalVisible(false);
                    setSelectedPromotion(null);
                    navigation?.navigate('Home1', {
                      screen: 'HomeThreeScreen',
                      params: {
                        ownerId: selectedPromotion.userId,
                        ownerName:
                          selectedPromotion?.user?.nickname ||
                          selectedPromotion?.user?.name ||
                          '',
                        title:
                          selectedPromotion?.user?.nickname ||
                          selectedPromotion?.user?.name ||
                          '',
                        location: selectedPromotion?.user?.address || '',
                      },
                    });
                  }}
                >
                  <Text style={styles.promotionDetailOrderBtnText}>
                    Order Now
                  </Text>
                </TouchableOpacity>
              ) : null} */}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Edit Profile sheet — in-window overlay (not RN Modal) for OEM biometric UI. */}
      {editProfileVisible ? (
        <View style={styles.editModalRoot} pointerEvents="box-none">
        <KeyboardAvoidingView
          style={styles.editModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.editModalBackdrop}
            activeOpacity={1}
            onPress={() => !savingProfile && setEditProfileVisible(false)}
          />
          <View style={styles.editModalBox}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => !savingProfile && setEditProfileVisible(false)}
                disabled={savingProfile}
              >
                <MaterialCommunityIcons name="close" size={24} color="#333" />
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
              <Text style={styles.editLabel}>Description</Text>
              <TextInput
                style={[styles.editInput, styles.editInputMultiline]}
                value={editChannelAbout}
                onChangeText={setEditChannelAbout}
                placeholder="Short description about you or your business"
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
              <Text style={styles.editLabel}>UK Postcode</Text>
              <TextInput
                style={styles.editInput}
                value={editPostcode}
                onChangeText={setEditPostcode}
                placeholder="e.g. SW1A 1AA"
                placeholderTextColor="#999"
                autoCapitalize="characters"
              />
              <Text style={styles.editLabel}>Address</Text>
              <TextInput
                style={[styles.editInput, styles.editAddressInput]}
                value={editAddress}
                onChangeText={v => {
                  setEditAddress(v);
                  setEditLatitude(null);
                  setEditLongitude(null);
                }}
                placeholder="Street, city, postcode"
                placeholderTextColor="#999"
                numberOfLines={1}
              />
              {editAddress.trim() ? (
                <Text style={styles.editLocationPreview}>
                  {formatCityCountryPostcodeLine({
                    address: editAddress,
                    postcode: editPostcode,
                  })}
                </Text>
              ) : null}
              <View style={styles.editAddressActions}>
                <TouchableOpacity
                  style={[
                    styles.editAddressActionBtn,
                    styles.editAddressActionBtnFirst,
                  ]}
                  onPress={() => setLocationMapVisible(true)}
                  accessibilityLabel="Pick on map"
                >
                  <MaterialCommunityIcons name="map" size={20} color="#fff" />
                  <Text style={styles.editAddressActionText} numberOfLines={1}>
                    Pick on map
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.editAddressActionBtn}
                  accessibilityLabel="Use my location"
                  onPress={async () => {
                    getCurrentPositionSafe(
                      async position => {
                        const lat = position?.coords?.latitude;
                        const lng = position?.coords?.longitude;
                        if (
                          lat == null ||
                          lng == null ||
                          !Number.isFinite(lat) ||
                          !Number.isFinite(lng)
                        ) {
                          return;
                        }
                        const addr = await reverseGeocode(lat, lng);
                        setEditAddress(
                          addr || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
                        );
                        setEditLatitude(lat);
                        setEditLongitude(lng);
                      },
                      () =>
                        Alert.alert(
                          'Location',
                          'Could not get your location. Check permissions or enter address manually.',
                        ),
                    );
                  }}
                >
                  <MaterialCommunityIcons
                    name="crosshairs-gps"
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.editAddressActionText} numberOfLines={1}>
                    Use my location
                  </Text>
                </TouchableOpacity>
              </View>
              {isOwnProfile ? (
                <BiometricLockToggle
                  variant="modal"
                  runAwayFromReactModal={runAwayFromReactModal}
                />
              ) : null}
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
                      <MaterialCommunityIcons
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
              {showFacebookVerify ? (
                <>
                  <Text style={[styles.editLabel, { marginTop: 16 }]}>
                    Facebook page verification
                  </Text>
                  <Text style={styles.facebookMetaHint}>
                    If Facebook shows &quot;App not active&quot; or &quot;Feature
                    unavailable&quot; while the Meta app is in Development mode, add
                    that person under Meta Developer Console → your Eatwaze app → App
                    roles → Roles → Tester. They must accept the invite on Facebook,
                    then retry Verify Facebook.
                    {'\n\n'}
                    If Facebook shows &quot;URL Blocked&quot;: Meta Developer
                    Console → your app → Facebook Login → Settings → turn on Client
                    OAuth Login and Web OAuth Login → add this redirect URI (exact
                    match):
                  </Text>
                  <View style={styles.facebookRedirectRow}>
                    <Text selectable style={styles.facebookRedirectUriText}>
                      {facebookOAuthRedirectUri()}
                    </Text>
                    <TouchableOpacity
                      style={styles.facebookRedirectCopyBtn}
                      onPress={handleCopyFacebookRedirectUri}
                    >
                      <Text style={styles.facebookRedirectCopyBtnText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.facebookCard}>
                    <View style={styles.facebookActionsRow}>
                      <TouchableOpacity
                        style={styles.facebookActionBtn}
                        onPress={handleVerifyFacebook}
                        disabled={facebookConnecting}
                      >
                        <Text style={styles.facebookActionBtnText}>
                          {facebookConnecting ? 'Opening...' : 'Verify Facebook'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.facebookActionBtn,
                          styles.facebookRefreshBtn,
                        ]}
                        onPress={loadFacebookPages}
                      >
                        <Text style={styles.facebookActionBtnText}>
                          Refresh pages
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {facebookConnectUrl ? (
                      <View style={styles.facebookUrlBox}>
                        <Text selectable style={styles.facebookUrlText}>
                          {facebookConnectUrl}
                        </Text>
                        <View style={styles.facebookUrlActions}>
                          <TouchableOpacity
                            style={styles.facebookMiniBtn}
                            onPress={() => Linking.openURL(facebookConnectUrl)}
                          >
                            <Text style={styles.facebookMiniBtnText}>Open</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.facebookMiniBtn}
                            onPress={handleCopyFacebookUrl}
                          >
                            <Text style={styles.facebookMiniBtnText}>Copy URL</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}
                    {(facebookPages || []).length > 0 ? (
                      <View style={styles.facebookPagesWrap}>
                        {facebookPages.map(p => (
                          <View
                            key={p?.id || p?.accountId}
                            style={styles.facebookPageChip}
                          >
                            <Text
                              style={styles.facebookPageChipText}
                              numberOfLines={1}
                            >
                              {p?.accountName || p?.accountId}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.facebookHelpText}>
                        No Facebook pages connected yet.
                      </Text>
                    )}
                  </View>
                </>
              ) : null}

              {showInstagramVerify ? (
                <>
                  <Text style={[styles.editLabel, { marginTop: 16 }]}>
                    Instagram (via Facebook Page)
                  </Text>
                  <Text style={styles.facebookMetaHint}>
                    Instagram connects through your Facebook Page (Meta requirement). Tap
                    Verify Instagram to sign in — Facebook Page connection is not required
                    first. Link Instagram Business to your Page in Meta Business Suite if
                    needed.
                  </Text>
                  <View style={styles.facebookCard}>
                    <View style={styles.facebookActionsRow}>
                      <TouchableOpacity
                        style={styles.facebookActionBtn}
                        onPress={handleVerifyInstagram}
                        disabled={instagramChecking}
                      >
                        <Text style={styles.facebookActionBtnText}>
                          {instagramChecking ? 'Loading...' : 'Verify Instagram'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.facebookActionBtn,
                          styles.facebookRefreshBtn,
                        ]}
                        onPress={() => loadInstagramLinkStatus(true)}
                        disabled={instagramChecking}
                      >
                        <Text style={styles.facebookActionBtnText}>
                          Check Instagram link
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {instagramLinkStatus?.pages?.length > 0 ? (
                      <View style={styles.facebookPagesWrap}>
                        {instagramLinkStatus.pages.map((row, idx) => (
                          <View
                            key={row.pageId || String(idx)}
                            style={styles.facebookPageChip}
                          >
                            <Text style={styles.facebookPageChipText} numberOfLines={3}>
                              {row.pageName || row.pageId}
                              {row.instagramLinked
                                ? ` → @${row.instagramUsername || 'linked'}`
                                : row.error
                                  ? ` — ${row.error}`
                                  : ' — no Instagram Business linked'}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.facebookHelpText}>
                        Tap Verify Instagram to connect — no Facebook verify step needed first.
                      </Text>
                    )}
                    {instagramLinkStatus?.instagramAccounts?.length > 0 ? (
                      <Text style={[styles.facebookHelpText, { marginTop: 8 }]}>
                        Auto-post token stored:{' '}
                        {instagramLinkStatus.instagramAccounts
                          .map(a => `@${a.accountName || a.accountId}`)
                          .join(', ')}
                      </Text>
                    ) : null}
                  </View>
                </>
              ) : null}

              {showTiktokVerify ? (
                <>
                  <Text style={[styles.editLabel, { marginTop: 16 }]}>
                    TikTok verification
                  </Text>
                  <Text style={styles.facebookMetaHint}>
                    TikTok for Developers → your app → Login Kit → add this redirect URI (exact
                    match). Enable scopes: user.info.basic, user.info.profile, video.publish.
                  </Text>
                  <View style={styles.facebookRedirectRow}>
                    <Text selectable style={styles.facebookRedirectUriText}>
                      {tiktokOAuthRedirectUri()}
                    </Text>
                    <TouchableOpacity
                      style={styles.facebookRedirectCopyBtn}
                      onPress={handleCopyTiktokRedirectUri}
                    >
                      <Text style={styles.facebookRedirectCopyBtnText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.facebookCard}>
                    <View style={styles.facebookActionsRow}>
                      <TouchableOpacity
                        style={styles.facebookActionBtn}
                        onPress={handleVerifyTiktok}
                        disabled={tiktokConnecting}
                      >
                        <Text style={styles.facebookActionBtnText}>
                          {tiktokConnecting ? 'Loading...' : 'Verify TikTok'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.facebookActionBtn,
                          styles.facebookRefreshBtn,
                        ]}
                        onPress={loadFacebookPages}
                      >
                        <Text style={styles.facebookActionBtnText}>
                          Refresh accounts
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {tiktokConnectUrl ? (
                      <View style={styles.facebookUrlBox}>
                        <Text selectable style={styles.facebookUrlText}>
                          {tiktokConnectUrl}
                        </Text>
                        <View style={styles.facebookUrlActions}>
                          <TouchableOpacity
                            style={styles.facebookMiniBtn}
                            onPress={() => Linking.openURL(tiktokConnectUrl)}
                          >
                            <Text style={styles.facebookMiniBtnText}>Open</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.facebookMiniBtn}
                            onPress={handleCopyTiktokUrl}
                          >
                            <Text style={styles.facebookMiniBtnText}>Copy URL</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}
                    {(tiktokAccounts || []).length > 0 ? (
                      <View style={styles.facebookPagesWrap}>
                        {tiktokAccounts.map(p => (
                          <View
                            key={p?.id || p?.accountId}
                            style={styles.facebookPageChip}
                          >
                            <Text
                              style={styles.facebookPageChipText}
                              numberOfLines={1}
                            >
                              {p?.accountName || p?.accountId}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.facebookHelpText}>
                        No TikTok accounts connected yet.
                      </Text>
                    )}
                  </View>
                </>
              ) : null}

              {showYoutubeVerify ? (
                <>
                  <Text style={[styles.editLabel, { marginTop: 16 }]}>
                    YouTube verification
                  </Text>
                  <Text style={styles.facebookMetaHint}>
                    Verify uses Google Sign-In with youtube.readonly only. If Google shows
                    "Access blocked", add the user Gmail under Google Cloud Console → OAuth
                    consent screen → Test users (app is in Testing mode). Redirect URI for
                    browser fallback:
                  </Text>
                  <View style={styles.facebookRedirectRow}>
                    <Text selectable style={styles.facebookRedirectUriText}>
                      {youtubeOAuthRedirectUri()}
                    </Text>
                    <TouchableOpacity
                      style={styles.facebookRedirectCopyBtn}
                      onPress={handleCopyYoutubeRedirectUri}
                    >
                      <Text style={styles.facebookRedirectCopyBtnText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.facebookCard}>
                    <View style={styles.facebookActionsRow}>
                      <TouchableOpacity
                        style={styles.facebookActionBtn}
                        onPress={handleVerifyYoutube}
                        disabled={youtubeConnecting}
                      >
                        <Text style={styles.facebookActionBtnText}>
                          {youtubeConnecting ? 'Loading...' : 'Verify YouTube'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.facebookActionBtn,
                          styles.facebookRefreshBtn,
                        ]}
                        onPress={handleOpenYoutubeBrowserLink}
                        disabled={youtubeConnecting}
                      >
                        <Text style={styles.facebookActionBtnText}>
                          Browser link
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.facebookActionBtn,
                          styles.facebookRefreshBtn,
                        ]}
                        onPress={loadFacebookPages}
                      >
                        <Text style={styles.facebookActionBtnText}>
                          Refresh accounts
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {youtubeConnectUrl ? (
                      <View style={styles.facebookUrlBox}>
                        <Text selectable style={styles.facebookUrlText}>
                          {youtubeConnectUrl}
                        </Text>
                        <View style={styles.facebookUrlActions}>
                          <TouchableOpacity
                            style={styles.facebookMiniBtn}
                            onPress={() => Linking.openURL(youtubeConnectUrl)}
                          >
                            <Text style={styles.facebookMiniBtnText}>Open</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={styles.facebookMiniBtn}
                            onPress={handleCopyYoutubeUrl}
                          >
                            <Text style={styles.facebookMiniBtnText}>Copy URL</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : null}
                    {(youtubeAccounts || []).length > 0 ? (
                      <View style={styles.facebookPagesWrap}>
                        {youtubeAccounts.map(p => (
                          <View
                            key={p?.id || p?.accountId}
                            style={styles.facebookPageChip}
                          >
                            <Text
                              style={styles.facebookPageChipText}
                              numberOfLines={1}
                            >
                              {p?.accountName || p?.accountId}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={styles.facebookHelpText}>
                        No YouTube channels connected yet.
                      </Text>
                    )}
                  </View>
                </>
              ) : null}

              {currentRole === 'owner' ? (
                <>
                  <Text style={[styles.editLabel, { marginTop: 16 }]}>
                    Opening Hours
                  </Text>
                  <View style={styles.openingHoursCard}>
                    {(editOpeningHours || DEFAULT_OPENING_HOURS).map(
                      (h, idx) => (
                        <View
                          key={`${h.day || idx}-${idx}`}
                          style={[
                            styles.openingHoursRow,
                            idx ===
                              (editOpeningHours || DEFAULT_OPENING_HOURS)
                                .length -
                                1 && styles.openingHoursRowLast,
                          ]}
                        >
                          <Text style={styles.openingDay} numberOfLines={1}>
                            {h.day}
                          </Text>
                          <TextInput
                            style={styles.openingTimeInput}
                            value={h.open}
                            onChangeText={v =>
                              updateOpeningHour(idx, { open: v })
                            }
                            placeholder="Open"
                            placeholderTextColor="#999"
                            autoCapitalize="none"
                          />
                          <TextInput
                            style={styles.openingTimeInput}
                            value={h.close}
                            onChangeText={v =>
                              updateOpeningHour(idx, { close: v })
                            }
                            placeholder="Close"
                            placeholderTextColor="#999"
                            autoCapitalize="none"
                          />
                        </View>
                      ),
                    )}
                  </View>
                </>
              ) : null}
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
        </View>
      ) : null}

      <Modal
        visible={addRiderModalVisible}
        animationType="slide"
        transparent
        onRequestClose={closeAddRiderModal}
      >
        <KeyboardAvoidingView
          style={styles.editModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.editModalBackdrop} />
          <View style={styles.editModalBox}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Add Rider</Text>
              <TouchableOpacity
                onPress={closeAddRiderModal}
                disabled={creatingRider}
              >
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.editModalScroll}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.settingsHint}>
                Create a rider account for your restaurant. They will log in with
                the email and password you set here.
              </Text>
              <TouchableOpacity
                style={styles.riderPhotoPicker}
                onPress={handlePickRiderPhoto}
                disabled={creatingRider}
                activeOpacity={0.85}
              >
                {riderPhotoFile?.uri ? (
                  <Image
                    source={{ uri: riderPhotoFile.uri }}
                    style={styles.riderPhotoPreview}
                  />
                ) : (
                  <View style={styles.riderPhotoPlaceholder}>
                    <MaterialCommunityIcons
                      name="camera-plus"
                      size={32}
                      color="#999"
                    />
                  </View>
                )}
                <Text style={styles.riderPhotoPickerText}>
                  {riderPhotoFile ? 'Change profile photo' : 'Add profile photo'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.editLabel}>Name</Text>
              <TextInput
                style={styles.editInput}
                value={riderNameInput}
                onChangeText={setRiderNameInput}
                placeholder="Rider full name"
                placeholderTextColor="#999"
              />
              <Text style={styles.editLabel}>Email</Text>
              <TextInput
                style={styles.editInput}
                value={riderEmailInput}
                onChangeText={setRiderEmailInput}
                placeholder="rider@email.com"
                placeholderTextColor="#999"
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Text style={styles.editLabel}>Phone</Text>
              <TextInput
                style={styles.editInput}
                value={riderPhoneInput}
                onChangeText={setRiderPhoneInput}
                placeholder="07xxx xxxxxx"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
              <Text style={styles.editLabel}>Address</Text>
              <TextInput
                style={[styles.editInput, styles.editInputMultiline]}
                value={riderAddressInput}
                onChangeText={setRiderAddressInput}
                placeholder="Street, city, postcode"
                placeholderTextColor="#999"
                multiline
                numberOfLines={2}
              />
              <Text style={styles.editLabel}>Password</Text>
              <TextInput
                style={styles.editInput}
                value={riderPasswordInput}
                onChangeText={setRiderPasswordInput}
                placeholder="Min 8 chars, upper, lower, number"
                placeholderTextColor="#999"
                secureTextEntry
              />
            </ScrollView>
            <TouchableOpacity
              style={[
                styles.editSaveBtn,
                creatingRider && styles.editSaveBtnDisabled,
              ]}
              onPress={handleCreateRider}
              disabled={creatingRider}
            >
              {creatingRider ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.editSaveBtnText}>Create rider</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <MapLocationPicker
        visible={locationMapVisible}
        onClose={() => setLocationMapVisible(false)}
        title="Shop location"
        initialLat={editLatitude}
        initialLng={editLongitude}
        initialPostcode={editPostcode}
        initialAddress={editAddress}
        requirePostcode={isOwnerOrVendor}
        onConfirm={browse => {
          setEditLatitude(browse.lat);
          setEditLongitude(browse.lng);
          setEditPostcode(browse.postcode || editPostcode);
          setEditAddress(browse.addressText || browse.areaLabel || editAddress);
        }}
      />

      {/* Profile gallery photo — full screen */}
      <Modal
        visible={galleryPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setGalleryPreviewVisible(false);
          setGalleryEngagePhoto(null);
          setCommentsModalGalleryPhotoId(null);
        }}
      >
        <SafeAreaView
          style={styles.galleryPhotoModalRoot}
          edges={['top', 'bottom', 'left', 'right']}
        >
          <TouchableOpacity
            style={styles.galleryPhotoModalClose}
            onPress={() => {
              setGalleryPreviewVisible(false);
              setGalleryEngagePhoto(null);
              setCommentsModalGalleryPhotoId(null);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.galleryPhotoModalMediaWrap}>
            {galleryPreviewItem?.mediaUrl ? (
              <Image
                source={{ uri: galleryPreviewItem.mediaUrl }}
                style={styles.galleryPhotoModalMediaFill}
                resizeMode="contain"
              />
            ) : null}
          </View>
          <View style={styles.bpIgEngageCard}>
            <Text style={styles.previewMetaType}>Photo</Text>
            <Text style={styles.bpGalleryEngageMetaSub}>
              {galleryPreviewItem?.subtitle || 'Recently'}
            </Text>
            <View style={styles.bpGalleryEngageRow}>
              <TouchableOpacity
                style={styles.bpGalleryEngageCell}
                onPress={handleBPGalleryLike}
              >
                <MaterialCommunityIcons
                  name={
                    galleryEngagePhoto?.isLiked ?? galleryPreviewItem?.isLiked
                      ? 'thumb-up'
                      : 'thumb-up-outline'
                  }
                  size={18}
                  color={
                    galleryEngagePhoto?.isLiked ?? galleryPreviewItem?.isLiked
                      ? '#FF7F0B'
                      : '#333'
                  }
                />
                <Text style={styles.bpGalleryEngageCellLabel} numberOfLines={1}>
                  {formatCount(
                    galleryEngagePhoto?.likeCount ??
                      galleryPreviewItem?.likeCount ??
                      0,
                  )}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bpGalleryEngageCell}
                onPress={handleBPGalleryDislike}
              >
                <MaterialCommunityIcons
                  name={
                    galleryEngagePhoto?.isDisliked ??
                    galleryPreviewItem?.isDisliked
                      ? 'thumb-down'
                      : 'thumb-down-outline'
                  }
                  size={18}
                  color={
                    galleryEngagePhoto?.isDisliked ??
                    galleryPreviewItem?.isDisliked
                      ? '#FF7F0B'
                      : '#333'
                  }
                />
                <Text style={styles.bpGalleryEngageCellLabel} numberOfLines={1}>
                  {formatCount(
                    galleryEngagePhoto?.dislikeCount ??
                      galleryPreviewItem?.dislikeCount ??
                      0,
                  )}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bpGalleryEngageCell}
                onPress={openBPGalleryComments}
              >
                <MaterialCommunityIcons
                  name="comment-text-outline"
                  size={18}
                  color="#333"
                />
                <Text style={styles.bpGalleryEngageCellLabel} numberOfLines={1}>
                  {formatCount(
                    galleryEngagePhoto?.commentCount ??
                      galleryPreviewItem?.commentCount ??
                      0,
                  )}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bpGalleryEngageCell}
                onPress={handleBPGalleryShare}
              >
                <MaterialCommunityIcons
                  name="share-outline"
                  size={18}
                  color="#333"
                />
                <Text style={styles.bpGalleryEngageCellLabel} numberOfLines={1}>
                  {formatCount(
                    galleryEngagePhoto?.shareCount ??
                      galleryPreviewItem?.shareCount ??
                      0,
                  )}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </Modal>

      {/* Post media preview modal (image/video) */}
      <Modal
        visible={postMediaPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPostMediaPreviewVisible(false);
          setPostMediaPreviewPostId(null);
        }}
      >
        <View style={styles.previewBackdrop}>
          <TouchableOpacity
            style={styles.previewCloseBtn}
            onPress={() => {
              setPostMediaPreviewVisible(false);
              setPostMediaPreviewPostId(null);
            }}
          >
            <MaterialCommunityIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {postMediaPreviewUri ? (
            postMediaPreviewType === 'video' ? (
              <Video
                source={{ uri: postMediaPreviewUri }}
                style={styles.previewVideo}
                controls
                paused={false}
                repeat
                resizeMode="contain"
                ignoreSilentSwitch="ignore"
              />
            ) : (
              <Image
                source={{ uri: postMediaPreviewUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            )
          ) : null}
          {postMediaPreviewPost ? (
            <View style={styles.bpGalleryEngageCard}>
              <View style={styles.bpGalleryEngageRow}>
                <TouchableOpacity
                  style={styles.bpGalleryEngageCell}
                  onPress={() =>
                    handlePostLike(
                      postMediaPreviewPost?.postId || postMediaPreviewPost?.id,
                    )
                  }
                >
                  <MaterialCommunityIcons
                    name="thumb-up-outline"
                    size={18}
                    color="#333"
                  />
                  <Text
                    style={styles.bpGalleryEngageCellLabel}
                    numberOfLines={1}
                  >
                    {postMediaPreviewPost?.likes ??
                      formatCount(postMediaPreviewPost?.likeCount ?? 0)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bpGalleryEngageCell}
                  onPress={() =>
                    handlePostDislike(
                      postMediaPreviewPost?.postId || postMediaPreviewPost?.id,
                    )
                  }
                >
                  <MaterialCommunityIcons
                    name="thumb-down-outline"
                    size={18}
                    color="#333"
                  />
                  <Text
                    style={styles.bpGalleryEngageCellLabel}
                    numberOfLines={1}
                  >
                    {postMediaPreviewPost?.dislikes ??
                      formatCount(postMediaPreviewPost?.dislikeCount ?? 0)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bpGalleryEngageCell}
                  onPress={() =>
                    setCommentsModalPostId(
                      postMediaPreviewPost?.postId || postMediaPreviewPost?.id,
                    )
                  }
                >
                  <MaterialCommunityIcons
                    name="comment-text-outline"
                    size={18}
                    color="#333"
                  />
                  <Text
                    style={styles.bpGalleryEngageCellLabel}
                    numberOfLines={1}
                  >
                    {postMediaPreviewPost?.comments ??
                      formatCount(postMediaPreviewPost?.commentCount ?? 0)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bpGalleryEngageCell}
                  onPress={() =>
                    handlePostShare(
                      postMediaPreviewPost?.postId || postMediaPreviewPost?.id,
                    )
                  }
                >
                  <MaterialCommunityIcons
                    name="share-outline"
                    size={18}
                    color="#333"
                  />
                  <Text
                    style={styles.bpGalleryEngageCellLabel}
                    numberOfLines={1}
                  >
                    {postMediaPreviewPost?.shares ??
                      formatCount(postMediaPreviewPost?.shareCount ?? 0)}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  mainList: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    paddingBottom: 20,
    backgroundColor: '#FFFFFF',
    flexGrow: 1,
  },
  promoTopGradient: {
    paddingBottom: 0,
  },
  fixedTopBar: {
    backgroundColor: '#F6B041',
    zIndex: 30,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minHeight: 48,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 78,
    minHeight: 36,
  },
  topNavBackText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 2,
  },
  promoHeaderLogo: {
    width: 88,
    height: 28,
  },
  promoHeaderBell: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  headerContainer: {
    paddingBottom: 0,
    backgroundColor: '#FFFFFF',
  },
  profileSocialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 18,
    paddingTop: 0,
    paddingBottom: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  profileSocialBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSocialBtnDisabled: {
    opacity: 0.45,
  },
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
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  coverArea: {
    width: '100%',
    height: 400,
    backgroundColor: '#eee',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgeContainer: {
    position: 'absolute',
    top: 15,
    right: 15,
    alignItems: 'flex-end',
  },
  twoPartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIconPart: {
    backgroundColor: '#fff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  badgeTextPart: {
    backgroundColor: '#FFAD33',
    paddingLeft: 20,
    paddingRight: 15,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: -16,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  profileOverlayBox: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(184, 115, 0, 0.65)',
    borderRadius: 20,
    padding: 15,
  },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
  },
  profileAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#333',
  },
  avatarEditIcon: {
    position: 'absolute',
    top: 5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
  },
  profileNameGroup: {
    marginLeft: 15,
  },
  businessName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 5,
  },
  dotSeparator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginLeft: 8,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editProfileBtnLarge: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 12,
    flex: 1,
  },
  editBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  squareIconBtn: {
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBottomPart: {
    backgroundColor: '#dcdcdc',
    paddingTop: 15,
    paddingBottom: 20,
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusMsgContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingTop: 15,
    paddingHorizontal: 20,
  },
  statusMsg: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  tabsContainer: {
    marginTop: 0,
    marginBottom: 10,
    paddingHorizontal: 8,
    paddingTop: 4,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E7EB',
  },
  tabItem: {
    paddingHorizontal: IS_COMPACT_WIDTH ? 8 : 12,
    paddingVertical: 10,
    marginRight: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  activeTabItem: {
    borderBottomWidth: 3,
    borderBottomColor: '#F5A623',
  },
  tabText: {
    fontSize: IS_COMPACT_WIDTH ? 12 : 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#F5A623',
    fontWeight: '700',
  },
  promotionSubTabRow: {
    flexDirection: 'row',
    paddingHorizontal: IS_COMPACT_WIDTH ? 12 : 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexGrow: 1,
  },
  promotionSubTabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: IS_COMPACT_WIDTH ? 96 : 0,
    minHeight: 36,
    paddingHorizontal: IS_COMPACT_WIDTH ? 10 : 8,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  promotionSubTabBtnEqual: {
    flex: 1,
    minWidth: 0,
  },
  promotionSubTabBtnSpacing: {
    marginRight: 8,
  },
  promotionSubTabBtnActive: {
    backgroundColor: '#FF7F0B',
  },
  promotionSubTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    textAlign: 'center',
  },
  promotionSubTabTextActive: {
    color: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  sectionTitle: {
    flex: 1,
    marginRight: 8,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  plusPlaceholder: {
    width: 24,
    height: 24,
  },
  gridColumnWrapper: {
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    gap: 8,
  },
  gridImageContainer: {
    width: (width - 24 - 16) / 3,
    aspectRatio: 0.8,
    marginBottom: 8,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#E8E8E8',
  },
  galleryDeleteBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryVideoBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryScheduledBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FF7F0B',
    borderRadius: 11,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  galleryScheduledBadgeText: {
    color: '#fff',
    fontSize: 9,
    fontWeight: '700',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 0,
    resizeMode: 'cover',
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  notificationIcon: {
    marginRight: 12,
  },
  notificationBody: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#333',
  },
  notificationMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF7F0B',
    marginLeft: 8,
  },
  areaUsersSummary: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    backgroundColor: '#FFFBF5',
    borderWidth: 1,
    borderColor: '#F0E6D2',
  },
  areaUsersSummaryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    lineHeight: 20,
  },
  areaUsersSummarySub: {
    marginTop: 6,
    fontSize: 12,
    color: '#666',
    lineHeight: 17,
  },
  areaUsersSummaryHint: {
    marginTop: 6,
    fontSize: 12,
    color: '#B45309',
    lineHeight: 17,
  },
  areaUsersSummaryCount: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '600',
    color: '#FF7F0B',
  },
  areaUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  areaUserAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eee',
    marginRight: 12,
  },
  areaUserBody: {
    flex: 1,
    minWidth: 0,
  },
  areaUserName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#222',
  },
  areaUserAddress: {
    marginTop: 2,
    fontSize: 13,
    color: '#555',
    lineHeight: 18,
  },
  areaUserAddressMuted: {
    marginTop: 2,
    fontSize: 13,
    color: '#999',
  },
  areaUserDistance: {
    marginTop: 4,
    fontSize: 12,
    color: '#FF7F0B',
    fontWeight: '600',
  },
  riderDetailsBtn: {
    backgroundColor: '#FF7F0B',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'center',
  },
  riderDetailsBtnText: { color: '#fff', fontWeight: '700', fontSize: 12 },
  ridersTopBar: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  ridersTopHint: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
    marginBottom: 12,
  },
  addRiderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FF7F0B',
    paddingVertical: 12,
    borderRadius: 10,
  },
  addRiderBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  riderPhotoPicker: {
    alignItems: 'center',
    marginBottom: 16,
  },
  riderPhotoPreview: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#eee',
  },
  riderPhotoPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
  },
  riderPhotoPickerText: {
    marginTop: 8,
    fontSize: 13,
    color: '#FF7F0B',
    fontWeight: '600',
  },
  areaUsersEmpty: {
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
    paddingHorizontal: 24,
    paddingVertical: 24,
    lineHeight: 20,
  },
  notificationsModalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '75%',
    paddingBottom: 16,
  },
  notificationsModalLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
    gap: 8,
  },
  notificationsModalLoadingText: {
    fontSize: 14,
    color: '#666',
  },
  notificationsModalEmpty: {
    textAlign: 'center',
    fontSize: 14,
    color: '#888',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  editModalRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
    elevation: 2000,
  },
  editModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
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
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  editModalScroll: {
    maxHeight: 400,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
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
  editInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editAddressInput: {
    width: '100%',
    marginBottom: 10,
  },
  editLocationPreview: {
    fontSize: 13,
    color: '#666',
    marginBottom: 10,
    lineHeight: 18,
  },
  editAddressActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 4,
  },
  editAddressActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF7F0B',
    paddingHorizontal: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  editAddressActionBtnFirst: {
    marginRight: 8,
  },
  editAddressActionText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
    flexShrink: 1,
  },
  settingsPanel: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  settingsHint: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
    marginBottom: 8,
  },
  settingsFieldHint: {
    fontSize: 12,
    color: '#888',
    lineHeight: 17,
    marginBottom: 6,
    marginTop: -4,
  },
  settingsSaveBtn: {
    marginHorizontal: 0,
    marginTop: 20,
  },
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
  useLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF7F0B',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  useLocationBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  socialLinksCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  openingHoursCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 12,
    marginTop: 4,
  },
  openingHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 8,
  },
  openingHoursRowLast: {
    marginBottom: 0,
  },
  openingDay: {
    width: 92,
    minWidth: 92,
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  openingTimeInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
    fontSize: 13,
    color: '#333',
    backgroundColor: '#fff',
  },
  socialLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  socialLinkRowLast: {
    marginBottom: 0,
  },
  socialLinkLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 120,
    minWidth: 120,
  },
  socialLinkIcon: {
    marginRight: 8,
  },
  socialLinkLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
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
  facebookMetaHint: {
    color: '#6B7280',
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
    marginBottom: 8,
  },
  facebookRedirectRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  facebookRedirectUriText: {
    flex: 1,
    color: '#111827',
    fontSize: 11,
    lineHeight: 16,
  },
  facebookRedirectCopyBtn: {
    backgroundColor: '#374151',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  facebookRedirectCopyBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  facebookCard: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 10,
    backgroundColor: '#fff',
  },
  facebookActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  facebookActionBtn: {
    flex: 1,
    backgroundColor: '#FF7F0B',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  facebookRefreshBtn: {
    backgroundColor: '#111827',
  },
  facebookActionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  facebookHelpText: {
    marginTop: 10,
    color: '#6B7280',
    fontSize: 12,
  },
  facebookPagesWrap: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  facebookPageChip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    maxWidth: '100%',
    backgroundColor: '#F9FAFB',
  },
  facebookPageChipText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '600',
  },
  facebookUrlBox: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 10,
    backgroundColor: '#FAFAFA',
  },
  facebookUrlText: {
    color: '#374151',
    fontSize: 12,
    lineHeight: 18,
  },
  facebookUrlActions: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
  },
  facebookMiniBtn: {
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  facebookMiniBtnText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  menuSectionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e8e8',
  },
  menuSectionHeaderText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
  },
  menuRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  manageCardWrap: {
    position: 'relative',
  },
  manageDotsBtn: {
    position: 'absolute',
    top: 10,
    right: 12,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
    padding: 4,
  },
  menuRowImage: {
    width: 56,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  menuRowImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuRowBody: { flex: 1, marginLeft: 12 },
  menuRowName: { fontSize: 16, fontWeight: '600', color: '#212121' },
  menuRowDescription: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    lineHeight: 16,
  },
  menuRowPrice: { fontSize: 14, color: '#666', marginTop: 2 },
  menuManageBtn: {
    marginLeft: 8,
    padding: 4,
  },
  promotionDetailModalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  promotionDetailModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  promotionDetailCloseBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promotionDetailModalTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  promotionDetailScroll: {
    flex: 1,
  },
  promotionDetailMediaWrap: {
    width: '100%',
    height: (width * 9) / 16,
    backgroundColor: '#000',
    position: 'relative',
  },
  promotionDetailVideo: {
    width: '100%',
    height: '100%',
  },
  promotionDetailPlayOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  promotionDetailImage: {
    width: '100%',
    height: (width * 9) / 16,
    backgroundColor: '#eee',
  },
  promotionDetailBody: {
    padding: 16,
    paddingBottom: 32,
  },
  promotionDetailTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#212121',
    marginBottom: 10,
  },
  promotionDetailDescription: {
    fontSize: 15,
    color: '#555',
    lineHeight: 22,
    marginBottom: 12,
  },
  promotionDetailMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  promotionDetailMetaText: {
    fontSize: 14,
    color: '#666',
  },
  promotionDetailPromoRow: {
    marginBottom: 10,
  },
  promotionDetailPromoLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  promotionDetailPromoCode: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FF7F0B',
    letterSpacing: 1,
  },
  promotionDetailOffer: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    marginBottom: 8,
  },
  promotionDetailDate: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  promotionDetailBusiness: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginTop: 12,
    marginBottom: 4,
  },
  promotionDetailAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  promotionDetailOrderBtn: {
    backgroundColor: '#FF7F0B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  promotionDetailOrderBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  bpIgEngageScroll: {
    flex: 1,
    width: '100%',
  },
  bpIgEngageScrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
    alignItems: 'center',
    width: '100%',
  },
  bpIgEngageImage: {
    width: Dimensions.get('window').width,
    maxHeight: Dimensions.get('window').height * 0.62,
    minHeight: 220,
  },
  bpIgEngageCard: {
    width: '100%',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ececec',
  },
  galleryPhotoModalRoot: {
    flex: 1,
    backgroundColor: '#000',
  },
  galleryPhotoModalClose: {
    position: 'absolute',
    top: 8,
    right: 12,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryPhotoModalMediaWrap: {
    flex: 1,
    width: '100%',
    minHeight: 0,
    backgroundColor: '#000',
  },
  galleryPhotoModalMediaFill: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000',
  },
  bpGalleryEngageMetaSub: {
    color: '#666',
    fontSize: 12,
    marginBottom: 4,
  },
  bpGalleryEngageRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    flexWrap: 'nowrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  bpGalleryEngageCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 6,
  },
  bpGalleryEngageCellLabel: {
    fontSize: 10,
    marginTop: 4,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  previewMetaType: {
    color: '#FF7F0B',
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
  },
  previewMetaSub: {
    color: '#ddd',
    fontSize: 12,
    marginBottom: 8,
  },
  galleryPostActionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'nowrap',
  },
  galleryPostActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  galleryPostActionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
    zIndex: 2,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewVideo: {
    width: '100%',
    height: '85%',
  },
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
  postActionBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  postActionCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    overflow: 'hidden',
  },
  postActionBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  postActionCancelBtn: {
    borderBottomWidth: 0,
  },
  postActionText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  postActionDeleteText: {
    color: '#E53935',
  },
  postEditBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  postEditCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    maxHeight: '88%',
  },
  postEditFormScroll: {
    maxHeight: '80%',
  },
  postEditFormContent: {
    paddingBottom: 8,
  },
  postEditTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111',
    marginBottom: 10,
  },
  postEditInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111',
    marginBottom: 10,
  },
  postEditTextarea: {
    minHeight: 90,
    textAlignVertical: 'top',
  },
  postEditSmallLabel: {
    marginTop: 4,
    marginBottom: 6,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
  },
  postEditSelectionHint: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  postEditMenuPreview: {
    paddingVertical: 6,
    marginBottom: 4,
  },
  promoEditMenuHint: {
    fontSize: 13,
    color: '#888',
    marginBottom: 8,
  },
  promoEditMenuList: {
    marginBottom: 8,
  },
  promoEditMenuSection: {
    marginTop: 8,
  },
  promoEditMenuSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
    marginTop: 4,
  },
  promoEditMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
    gap: 10,
  },
  promoEditSelectAllRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    marginBottom: 4,
  },
  promoEditMenuName: {
    flex: 1,
    fontSize: 15,
    color: '#212121',
  },
  promoEditMenuPrice: {
    fontSize: 14,
    color: '#666',
    fontWeight: '600',
  },
  postEditChipRow: {
    marginBottom: 10,
    minHeight: 44,
  },
  postEditChipRowContent: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  postEditChip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    marginRight: 8,
    backgroundColor: '#fff',
    maxWidth: 160,
  },
  postEditChipActive: {
    borderColor: '#FF8C00',
    backgroundColor: '#FF8C00',
  },
  postEditChipText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
  },
  postEditChipTextActive: {
    color: '#fff',
  },
  postEditAllergenWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 10,
  },
  postEditAllergenChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  postEditAllergenChipActive: {
    backgroundColor: '#FF8C00',
    borderColor: '#FF8C00',
  },
  postEditCustomIconWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 6,
  },
  postEditCustomIconItem: {
    width: 42,
    height: 42,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  postEditCustomIconImage: {
    width: '100%',
    height: '100%',
  },
  postEditCustomIconRemove: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: 16,
    height: 16,
    borderBottomLeftRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  postEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 2,
    marginBottom: 10,
  },
  postEditMediaBtn: {
    flex: 1,
    backgroundColor: '#FFF4EB',
    borderWidth: 1,
    borderColor: '#FFDFC2',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  postEditMediaBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  postEditMediaBtnText: {
    color: '#E26A00',
    fontWeight: '700',
    fontSize: 12,
  },
  postEditActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  postEditActionBtn: {
    minWidth: 90,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  postEditCancelBtn: {
    backgroundColor: '#F3F4F6',
  },
  postEditSaveBtn: {
    backgroundColor: '#FF7F0B',
  },
  postEditCancelText: {
    color: '#111',
    fontWeight: '700',
  },
  postEditSaveText: {
    color: '#fff',
    fontWeight: '700',
  },
});

export default BusinessProfileViewScreen;
