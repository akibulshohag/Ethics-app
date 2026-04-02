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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BusinessProfileCard from '../../components/BusinessProfileCard';
import PromotionCard from '../../components/PromotionCard';
import BusinessVideoCard from '../../components/BusinessVideoCard';
import BusinessVideoTabCard from '../../components/BusinessVideoTabCard';
import CommentsModal from '../../components/CommentsModal';
import CreatePostModal from '../../components/CreatePostModal';
import {
  getPostsByUser,
  updatePost,
  deletePost,
  togglePostLike,
  togglePostDislike,
  recordPostShare,
} from '../../services/postService';
import { launchImageLibrary } from 'react-native-image-picker';
import {
  getChannelProfile,
  updateChannelProfile,
  uploadProfilePhoto,
  uploadCoverImage,
  getGallery,
  uploadGallery,
  deleteGalleryPhoto,
  toggleGalleryPhotoLike,
  toggleGalleryPhotoDislike,
  recordGalleryPhotoShare,
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
import { getNotificationsByUserId } from '../../services/notificationService';
import {
  getPromotionsByUser,
  getNearbyPromotions,
  updatePromotion,
  deletePromotion,
} from '../../services/promotionService';
import {
  getMenuByUserId,
  getMenuFiles,
  uploadMenuItemImage,
  updateMenuItem,
  deleteMenuItem,
  deleteMenuFile,
} from '../../services/menuService';
import { appSetUser } from '../../redux/actions/appSlice';
import { safeImageUri } from '../../utils/helper';
import { buildPostShareMessage } from '../../utils/contentLinks';
import {
  geocodeAddress,
  getCurrentPositionSafe,
  reverseGeocode,
  getFallbackCoordsForUKArea,
} from '../../utils/geolocation';
import CreatePromotionModal from '../../components/CreatePromotionModal';
import Video from 'react-native-video';
import { getSocialIcon } from '../../constants/socialLinks';
import GalleryVideoDetailModal from '../../components/GalleryVideoDetailModal';
import { ALLERGENS, normalizeAllergens } from '../../constants/allergens';

const { width } = Dimensions.get('window');

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
    title: post.title || 'Untitled',
    channelName,
    channelAvatar,
    publishedAt: formatTimeAgo(createdAt),
    sortTime: new Date(createdAt || 0).getTime() || Date.now(),
    thumbnail:
      post.thumbnailUrl || post.mediaUrl || 'https://via.placeholder.com/300',
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

const MOCK_POSTS = [
  {
    id: '1',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    channelName: 'Dalchini',
    channelAvatar: 'https://via.placeholder.com/100',
    publishedAt: '5 months ago',
    thumbnail:
      'https://images.pexels.com/photos/2641886/pexels-photo-2641886.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    duration: '15:27',
    views: '3.2K',
    likes: '3.2K',
    dislikes: '368',
    comments: '675',
    shares: '675',
    website: 'www.tandoriplanet.com',
    hashtags: ['steak', 'food', 'fries'],
  },
  {
    id: '2',
    title: 'Special Beef Burger - Homemade Style',
    channelName: 'Dalchini',
    channelAvatar: 'https://via.placeholder.com/100',
    publishedAt: '2 months ago',
    thumbnail:
      'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    duration: '10:15',
    views: '5.1K',
    likes: '4.2K',
    dislikes: '120',
    comments: '890',
    shares: '450',
    website: 'www.tandoriplanet.com',
    hashtags: ['burger', 'beef', 'fastfood'],
  },
  {
    id: '3',
    title: 'Fresh Garden Salad with Lemon Dressing',
    channelName: 'Dalchini',
    channelAvatar: 'https://via.placeholder.com/100',
    publishedAt: '1 month ago',
    thumbnail:
      'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    duration: '05:45',
    views: '1.2K',
    likes: '900',
    dislikes: '15',
    comments: '120',
    shares: '80',
    website: 'www.tandoriplanet.com',
    hashtags: ['salad', 'healthy', 'vegan'],
  },
];

const MOCK_PROMOTIONS = [
  {
    id: '1',
    title: '10 Rice Bag',
    price: '£100',
    image:
      'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '120',
  },
  {
    id: '2',
    title: '10 Rice Bag',
    price: '£100',
    image:
      'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '120',
  },
  {
    id: '3',
    title: '10 Rice Bag',
    price: '£100',
    image:
      'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '120',
  },
];

const MOCK_GRID_IMAGES = [
  {
    id: '1',
    image:
      'https://images.pexels.com/photos/2641886/pexels-photo-2641886.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    id: '2',
    image:
      'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    id: '3',
    image:
      'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    id: '4',
    image:
      'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    id: '5',
    image:
      'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    id: '6',
    image:
      'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    id: '7',
    image:
      'https://images.pexels.com/photos/699953/pexels-photo-699953.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    id: '8',
    image:
      'https://images.pexels.com/photos/718742/pexels-photo-718742.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    id: '9',
    image:
      'https://images.pexels.com/photos/675951/pexels-photo-675951.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
];

const MOCK_VIDEOS = [
  {
    id: '1',
    title: 'Tandoori Planet',
    thumbnail:
      'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '100k',
    location: 'Birmingham, UK',
    distance: '12 Km',
  },
  {
    id: '2',
    title: 'Spicy Burger House',
    thumbnail:
      'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '85k',
    location: 'London, UK',
    distance: '5 Km',
  },
];

const BusinessProfileViewScreen = ({ navigation }) => {
  const route = useRoute();
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.app?.user);
  const profileUserId = route.params?.userId ?? currentUser?.id;
  const isOwnProfile = profileUserId === currentUser?.id;

  const [activeTab, setActiveTab] = useState('Gallery');
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsRefreshing, setPostsRefreshing] = useState(false);
  const [createPostModalVisible, setCreatePostModalVisible] = useState(false);
  const [commentsModalPostId, setCommentsModalPostId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editChannelAbout, setEditChannelAbout] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLatitude, setEditLatitude] = useState(null);
  const [editLongitude, setEditLongitude] = useState(null);
  const [editSocialLinks, setEditSocialLinks] = useState([]);
  const [editOpeningHours, setEditOpeningHours] = useState(
    DEFAULT_OPENING_HOURS,
  );
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
  const [notifications, setNotifications] = useState([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
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
  const [promotionSubTab, setPromotionSubTab] = useState('my'); // 'my' | 'other'
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
    tabsScrollRef.current.scrollTo({ x: Math.max(0, centeredX), animated: true });
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
        const res = await getPostsByUser(profileUserId, 1, 50);
        const list = (res?.posts || []).map(p => mapPostToCard(p, p.user));
        setPosts(list);
      } catch (e) {
        setPosts([]);
      } finally {
        setPostsLoading(false);
        setPostsRefreshing(false);
      }
    },
    [profileUserId],
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
      const [vRes, sRes] = await Promise.all([
        getUserVideos(profileUserId, 1, 50),
        shortsService.getUserShorts(profileUserId, 1, 50),
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
  }, [profileUserId]);

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
    const postItems = (posts || []).map(p => {
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
          'https://via.placeholder.com/600',
        ),
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
        'https://via.placeholder.com/600',
      ),
      type: v?._type || '',
      isShort: v?._type === 'short',
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
      thumbnail: safeImageUri(g?.src, 'https://via.placeholder.com/600'),
      createdAt: new Date(g?.createdAt || 0).getTime() || Date.now(),
      likeCount: g.likeCount ?? 0,
      dislikeCount: g.dislikeCount ?? 0,
      commentCount: g.commentCount ?? 0,
      shareCount: g.shareCount ?? 0,
      isLiked: g.isLiked ?? false,
      isDisliked: g.isDisliked ?? false,
    }));
    return [...postItems, ...videoItems, ...galleryItems].sort(
      (a, b) => b.createdAt - a.createdAt,
    );
  }, [posts, ownerVideos, galleryPhotos]);

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

  const loadNotifications = useCallback(async () => {
    if (!profileUserId) return;
    setNotificationsLoading(true);
    try {
      const data = await getNotificationsByUserId(profileUserId);
      setNotifications(Array.isArray(data) ? data : data?.notifications ?? []);
    } catch (e) {
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, [profileUserId]);

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

  const currentRole = (currentUser?.role || '').toLowerCase();
  const isOwnerOrVendor = currentRole === 'owner' || currentRole === 'vendor';
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
    if (activeTab === 'Promotions' && profileUserId) {
      loadPromotions(); // always load own promotions (My Promotions)
      if (isOwnProfile && isOwnerOrVendor) loadNearbyPromotionsCross(); // Other Promotions
    }
  }, [
    activeTab,
    profileUserId,
    isOwnProfile,
    isOwnerOrVendor,
    loadPromotions,
    loadNearbyPromotionsCross,
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
      setMenuItems(res?.menu ?? []);
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

  const openVideoDetails = useCallback(
    item => {
      if (!item?.id) return;
      const itemType = String(item.type || item._type || '').toLowerCase();
      if (itemType === 'short') {
        const sid = String(item.id);
        const fallbackName =
          profile?.nickname ||
          profile?.channelName ||
          profile?.name ||
          'User';
        const initialShortItem = {
          ...item,
          id: sid,
          type: 'short',
          userId: item?.userId || profileUserId,
          videoUrl: item?.videoUrl || item?.video_url,
          user: item?.user || {
            id: profileUserId,
            nickname: fallbackName,
            name: profile?.name || fallbackName,
          },
        };
        let nav = navigation;
        for (let i = 0; i < 16 && nav; i++) {
          const names = nav.getState?.()?.routeNames;
          if (Array.isArray(names) && names.includes('Shorts')) {
            nav.navigate('Shorts', {
              screen: 'ShortsVideoScreen',
              params: { shortId: sid, initialShortItem },
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
              params: { shortId: sid, initialShortItem },
            });
            return;
          }
          nav = nav.getParent?.();
        }
        navigation.navigate('Root', {
          screen: 'Shorts',
          params: {
            screen: 'ShortsVideoScreen',
            params: { shortId: sid, initialShortItem },
          },
        });
        return;
      }
      // Open video details via Root stack (BusinessProfileViewScreen is a Tab screen)
      try {
        navigation?.getParent()?.navigate('VideoDetailsScreen', {
          videoId: item.id,
        });
      } catch (_) {
        navigation?.navigate('VideoDetailsScreen', { videoId: item.id });
      }
    },
    [navigation, profileUserId, profile],
  );

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
    setEditLatitude(null);
    setEditLongitude(null);
    const links = profile?.socialLinks ?? currentUser?.socialLinks ?? [];
    const linkMap = Array.isArray(links)
      ? links.reduce((acc, l) => ({ ...acc, [l.type]: l.url || '' }), {})
      : {};
    setEditSocialLinks(
      [
        { value: 'instagram', label: 'Instagram' },
        { value: 'facebook', label: 'Facebook' },
        { value: 'x', label: 'X (Twitter)' },
        { value: 'google_email', label: 'Google / Email' },
        { value: 'website', label: 'Website' },
      ].map(t => ({ type: t.value, url: linkMap[t.value] || '' })),
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
    setEditProfileVisible(true);
  };

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
      let latitude = undefined;
      let longitude = undefined;
      if (
        editLatitude != null &&
        editLongitude != null &&
        Number.isFinite(editLatitude) &&
        Number.isFinite(editLongitude)
      ) {
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
      }
      setEditProfileVisible(false);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to update profile');
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

  const SOCIAL_TYPES = [
    { value: 'instagram', label: 'Instagram', icon: 'instagram' },
    { value: 'facebook', label: 'Facebook', icon: 'facebook' },
    { value: 'x', label: 'X (Twitter)', icon: 'twitter' },
    { value: 'google_email', label: 'Google / Email', icon: 'email-outline' },
    { value: 'website', label: 'Website', icon: 'web' },
  ];

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
        p => String(p?.postId || p?.id || '') === String(postMediaPreviewPostId),
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
        message: `Photo\neatix://user/${profileUserId}/gallery/${pid}`,
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
              commentCount: Math.max(
                0,
                Number(ge.commentCount ?? 0) + delta,
              ),
            }
          : ge,
      );
      setGalleryPreviewItem(it =>
        it && String(it.originId) === String(pid)
          ? {
              ...it,
              commentCount: Math.max(
                0,
                Number(it.commentCount ?? 0) + delta,
              ),
            }
          : it,
      );
      syncBPGalleryEngageFromServer(pid);
    },
    [commentsModalGalleryPhotoId, patchGalleryPhoto, syncBPGalleryEngageFromServer],
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
        const post = posts.find(
          p => String(p.id) === String(item.originId),
        );
        if (post) openPostMediaPreview(post);
        return;
      }
      if (sourceType === 'video') {
        const rawType = String(item?.type || '').toLowerCase();
        const isShort =
          item?.isShort || rawType === 'short' || rawType === 'shorts';
        const targetId = item?.originId ?? item?.id;
        if (!targetId) return;
        if (isShort) {
          const sid = String(targetId);
          const raw = (ownerVideos || []).find(
            v =>
              String(v.id) === sid &&
              (v._type === 'short' ||
                String(v._type || '').toLowerCase() === 'short'),
          );
          const fallbackName =
            profile?.nickname ||
            profile?.channelName ||
            profile?.name ||
            'User';
          const initialShortItem = raw
            ? {
                ...raw,
                id: sid,
                type: 'short',
                userId: raw.userId || profileUserId,
                videoUrl: raw.videoUrl || String(item?.mediaUrl || '').trim(),
                user: {
                  id: profileUserId,
                  nickname: fallbackName,
                  name: profile?.name || fallbackName,
                },
              }
            : {
                id: sid,
                type: 'short',
                videoUrl: String(item?.mediaUrl || '').trim(),
                userId: profileUserId,
                user: {
                  id: profileUserId,
                  nickname: fallbackName,
                  name: profile?.name || fallbackName,
                },
              };
          let nav = navigation;
          for (let i = 0; i < 16 && nav; i++) {
            const names = nav.getState?.()?.routeNames;
            if (Array.isArray(names) && names.includes('Shorts')) {
              nav.navigate('Shorts', {
                screen: 'ShortsVideoScreen',
                params: { shortId: sid, initialShortItem },
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
                params: { shortId: sid, initialShortItem },
              });
              return;
            }
            nav = nav.getParent?.();
          }
          navigation.navigate('Root', {
            screen: 'Shorts',
            params: {
              screen: 'ShortsVideoScreen',
              params: { shortId: sid, initialShortItem },
            },
          });
          return;
        }
        setGalleryVideoModal({
          contentId: String(targetId),
          kind: 'video',
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
          const base =
            raw || {
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
      profileUserId,
      currentUser?.id,
      ownerVideos,
      profile,
      navigation,
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
        thumbnail: safeImageUri(p?.src, 'https://via.placeholder.com/600'),
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
      setItemActionTarget({ kind, item });
      setItemActionVisible(true);
    },
    [isOwnProfile],
  );

  const openItemEdit = useCallback(() => {
    const target = itemActionTarget;
    if (!target?.item) return;
    const { kind, item } = target;
    setItemActionVisible(false);
    if (kind === 'menu') {
      setItemEditTitle(String(item.itemName || '').trim());
      setItemEditPrice(String(item.price ?? '').trim());
      setItemEditDescription(String(item.description || '').trim());
      setItemEditThumbnailUri(String(item.imageUrl || '').trim());
      setItemEditVideoUri('');
      setItemEditCategoryId(String(item.categoryId || item.category?.id || '').trim());
      setItemEditAllergens(normalizeAllergens(item.allergens));
      setItemEditAllergenIconUrls(normalizeAllergens(item.allergenIconUrls));
    } else if (kind === 'promotion') {
      setItemEditTitle(String(item.title || '').trim());
      setItemEditDescription(String(item.description || '').trim());
      setItemEditPromoCode(String(item.promoCode || '').trim());
      setItemEditPromoAmount(
        item.promoAmount != null ? String(item.promoAmount) : '',
      );
      setItemEditThumbnailUri(
        String(item.thumbnailUrl || item.image || '').trim(),
      );
      setItemEditVideoUri(String(item.videoUrl || '').trim());
    } else {
      setItemEditTitle(String(item.title || '').trim());
      setItemEditDescription(String(item.description || '').trim());
      setItemEditThumbnailUri(
        String(item.thumbnail || item.thumbnailUrl || '').trim(),
      );
      setItemEditVideoUri(String(item.videoUrl || item.mediaUrl || '').trim());
    }
    setItemEditVisible(true);
  }, [itemActionTarget]);

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
        const payload = {
          title: itemEditTitle.trim() || undefined,
          description: itemEditDescription.trim() || undefined,
          promoCode: itemEditPromoCode.trim() || undefined,
          promoAmount:
            itemEditPromoAmount.trim() === ''
              ? undefined
              : Number(itemEditPromoAmount),
          thumbnailUrl: itemEditThumbnailUri.trim() || undefined,
          videoUrl: itemEditVideoUri.trim() || undefined,
        };
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
        const payload = {
          itemName: itemEditTitle.trim() || undefined,
          description: itemEditDescription.trim() || undefined,
          price:
            itemEditPrice.trim() === ''
              ? undefined
              : Number(itemEditPrice.trim()),
          imageUrl: itemEditThumbnailUri.trim() || undefined,
          categoryId: itemEditCategoryId ? itemEditCategoryId : null,
          allergens: Array.isArray(itemEditAllergens) ? itemEditAllergens : [],
          allergenIconUrls: Array.isArray(itemEditAllergenIconUrls)
            ? itemEditAllergenIconUrls
            : [],
        };
        await updateMenuItem(currentUser?.token, item.id, payload);
        setMenuItems(prev =>
          prev.map(m => (m.id === item.id ? { ...m, ...payload } : m)),
        );
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
      {/* Top Navigation - OUTSIDE the image */}
      <View style={styles.topNavigation}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
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
        {/* <TouchableOpacity style={styles.moreIcon}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#666" />
        </TouchableOpacity> */}
      </View>

      <BusinessProfileCard
        profile={profile}
        isOwnProfile={isOwnProfile}
        onEditProfile={openEditProfile}
        onAvatarPress={handleAvatarPress}
        onCoverPress={handleCoverPress}
        coverUploading={uploadingCover}
      />

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
              ]
            : BASE_TABS
          ).map(tab => {
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
                  if (l) tabLayoutsRef.current[tab] = { x: l.x, width: l.width };
                }}
                onPress={() => {
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

      {/* Promotions sub-tabs: My Promotions | Other Promotions (owner sees vendor promos, vendor sees owner promos) */}
      {activeTab === 'Promotions' ? (
        <View style={styles.promotionSubTabRow}>
          <TouchableOpacity
            style={[
              styles.promotionSubTabBtn,
              promotionSubTab === 'my' && styles.promotionSubTabBtnActive,
            ]}
            onPress={() => setPromotionSubTab('my')}
          >
            <Text
              style={[
                styles.promotionSubTabText,
                promotionSubTab === 'my' && styles.promotionSubTabTextActive,
              ]}
            >
              My Promotions
            </Text>
          </TouchableOpacity>
          {isOwnProfile && isOwnerOrVendor ? (
            <TouchableOpacity
              style={[
                styles.promotionSubTabBtn,
                promotionSubTab === 'other' && styles.promotionSubTabBtnActive,
              ]}
              onPress={() => setPromotionSubTab('other')}
            >
              <Text
                style={[
                  styles.promotionSubTabText,
                  promotionSubTab === 'other' &&
                    styles.promotionSubTabTextActive,
                ]}
              >
                Other Promotions
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
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
            ? promotionSubTab === 'other'
              ? 'Other Promotions'
              : 'My Promotions'
            : activeTab}
        </Text>
        {activeTab === 'Menus' && isOwnProfile && isOwnerOrVendor ? (
          <TouchableOpacity
            onPress={() => navigation?.navigate('MenuManageScreen')}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#333" />
          </TouchableOpacity>
        ) : activeTab === 'Posts' && profileUserId === currentUser?.id ? (
          <TouchableOpacity onPress={() => setCreatePostModalVisible(true)}>
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
          promotionSubTab === 'my' &&
          isOwnProfile &&
          isOwnerOrVendor ? (
          <TouchableOpacity
            onPress={() => setCreatePromotionModalVisible(true)}
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
        ) : (
          <View style={styles.plusPlaceholder} />
        )}
      </View>
    </View>
  );

  const getListData = () => {
    switch (activeTab) {
      case 'Posts':
        return posts;
      case 'Promotions': {
        const list =
          promotionSubTab === 'other' && isOwnProfile && isOwnerOrVendor
            ? nearbyPromotionsCross
            : promotions;
        return list.map(p => ({
          ...p,
          id: p.id,
          title: p.title,
          image: p.thumbnailUrl || p.videoUrl,
          price:
            p.promoAmount != null
              ? `${p.promoCode || ''} • ${p.promoAmount}% off`
              : p.promoCode || '',
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
            items.forEach(m =>
              result.push({
                type: 'menu',
                id: m.id,
                itemName: m.itemName,
                price: m.price,
                imageUrl: m.imageUrl,
              }),
            );
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
          uncategorized.forEach(m =>
            result.push({
              type: 'menu',
              id: m.id,
              itemName: m.itemName,
              price: m.price,
              imageUrl: m.imageUrl,
            }),
          );
        }
        if (result.length === 0 && menuItems.length > 0) {
          menuItems.forEach(m =>
            result.push({
              type: 'menu',
              id: m.id,
              itemName: m.itemName,
              price: m.price,
              imageUrl: m.imageUrl,
            }),
          );
        }
        return result;
      }
      case 'Video':
        return ownerVideos;
      case 'Notification':
        return notifications;
      default:
        return [];
    }
  };

  const renderContentItem = ({ item }) => {
    if (activeTab === 'Posts') {
      const postId = item.postId || item.id;
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
        (profilePhotoUri && !profilePhotoUri.includes('via.placeholder')
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
          onPress={() => openPostMediaPreview(item)}
          onLike={currentUser?.id ? () => handlePostLike(postId) : undefined}
          onDislike={
            currentUser?.id ? () => handlePostDislike(postId) : undefined
          }
          onCommentPress={() => {
            setCommentsModalPostId(postId);
          }}
          onShare={() => handlePostShare(postId)}
          onMenuPress={isOwnProfile ? () => openPostActions(item) : undefined}
          hideMenuButton={!isOwnProfile}
        />
      );
    }
    if (activeTab === 'Promotions') {
      const canManagePromotion =
        isOwnProfile && isOwnerOrVendor && promotionSubTab === 'my';
      return (
        <View style={styles.manageCardWrap}>
          <PromotionCard
            item={{
              ...item,
              image: item.image
                ? safeImageUri(item.image)
                : 'https://via.placeholder.com/300',
            }}
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
            <View style={[styles.menuRowImage, styles.menuRowImagePlaceholder]}>
              <MaterialCommunityIcons
                name={isPdf ? 'file-pdf-box' : 'file-image'}
                size={24}
                color={isPdf ? '#E53935' : '#FF7F0B'}
              />
            </View>
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
          {item.imageUrl ? (
            <Image
              source={{ uri: safeImageUri(item.imageUrl) }}
              style={styles.menuRowImage}
            />
          ) : (
            <View style={[styles.menuRowImage, styles.menuRowImagePlaceholder]}>
              <MaterialCommunityIcons name="food" size={24} color="#999" />
            </View>
          )}
          <View style={styles.menuRowBody}>
            <Text style={styles.menuRowName} numberOfLines={1}>
              {item.itemName}
            </Text>
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
              const isShort =
                item._type === 'short' ||
                String(item.type || '').toLowerCase() === 'short';
              if (isShort) {
                openVideoDetails(item);
                return;
              }
              setGalleryVideoModal({
                contentId: String(item.id),
                kind: 'video',
              });
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
      return (
        <View style={styles.notificationRow}>
          <MaterialCommunityIcons
            name={
              item.type === 'order'
                ? 'cart'
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
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
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
      {activeTab === 'Photos' && galleryLoading && galleryPhotos.length === 0 ? (
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
      {activeTab === 'Promotions' &&
      (promotionSubTab === 'other' && isOwnProfile && isOwnerOrVendor
        ? nearbyPromotionsCrossLoading
        : promotionsLoading) &&
      (promotionSubTab === 'other' && isOwnProfile && isOwnerOrVendor
        ? nearbyPromotionsCross.length
        : promotions.length) === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FF7F0B" />
          <Text style={styles.loadingText}>
            {promotionSubTab === 'other'
              ? 'Loading other promotions...'
              : 'Loading promotions...'}
          </Text>
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
        data={getListData()}
        keyExtractor={(item, index) => item.id || `item-${index}`}
        renderItem={renderContentItem}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        numColumns={
          activeTab === 'Gallery' || activeTab === 'Photos' ? 3 : 1
        }
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
              refreshing={
                galleryLoading || postsLoading || ownerVideosLoading
              }
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
          ) : activeTab === 'Promotions' && profileUserId ? (
            <RefreshControl
              refreshing={
                promotionSubTab === 'other' && isOwnProfile && isOwnerOrVendor
                  ? nearbyPromotionsCrossRefreshing
                  : promotionsRefreshing
              }
              onRefresh={() =>
                promotionSubTab === 'other' && isOwnProfile && isOwnerOrVendor
                  ? loadNearbyPromotionsCross(true)
                  : loadPromotions(true)
              }
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
      />
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
      <CreatePostModal
        visible={createPostModalVisible}
        onClose={() => setCreatePostModalVisible(false)}
        onSuccess={() => loadPosts(true)}
        userId={currentUser?.id}
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
                  g =>
                    String(g.id) === String(commentsModalGalleryPhotoId),
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
                        itemEditCategoryId === cat.id &&
                          styles.postEditChipActive,
                      ]}
                      onPress={() => setItemEditCategoryId(cat.id)}
                      activeOpacity={0.85}
                    >
                      <Text
                        style={[
                          styles.postEditChipText,
                          itemEditCategoryId === cat.id &&
                            styles.postEditChipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
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
                <Text style={styles.postEditSmallLabel}>
                  Custom allergen icons
                </Text>
                <TouchableOpacity
                  style={styles.postEditMediaBtn}
                  onPress={pickItemAllergenIcon}
                  disabled={itemEditAllergenIconUploading}
                >
                  {itemEditAllergenIconUploading ? (
                    <ActivityIndicator size="small" color="#E26A00" />
                  ) : (
                    <Text style={styles.postEditMediaBtnText}>
                      Upload allergen icon
                    </Text>
                  )}
                </TouchableOpacity>
                {itemEditAllergenIconUrls.length > 0 ? (
                  <View style={styles.postEditCustomIconWrap}>
                    {itemEditAllergenIconUrls.map((uri, idx) => (
                      <View key={`${uri}-${idx}`} style={styles.postEditCustomIconItem}>
                        <Image source={{ uri }} style={styles.postEditCustomIconImage} />
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
                  <Text style={styles.postEditMediaBtnText}>Change Video</Text>
                </TouchableOpacity>
              ) : null}
            </View>
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
        onClose={() => setCreatePromotionModalVisible(false)}
        onSuccess={() => {
          loadPromotions(true);
          if (isOwnProfile && isOwnerOrVendor) loadNearbyPromotionsCross(true);
        }}
        userId={currentUser?.id}
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
                      'https://via.placeholder.com/600',
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
              <Text style={styles.editLabel}>Address</Text>
              <View style={styles.editAddressRow}>
                <TextInput
                  style={[styles.editInput, styles.editAddressInput]}
                  value={editAddress}
                  onChangeText={v => {
                    setEditAddress(v);
                    setEditLatitude(null);
                    setEditLongitude(null);
                  }}
                  placeholder="Address or use location below"
                  placeholderTextColor="#999"
                />
                <TouchableOpacity
                  style={styles.useLocationBtn}
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
                        )
                          return;
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
                    size={22}
                    color="#fff"
                  />
                  <Text style={styles.useLocationBtnText}>Use my location</Text>
                </TouchableOpacity>
              </View>
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
      </Modal>

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
                      (galleryEngagePhoto?.isLiked ??
                        galleryPreviewItem?.isLiked)
                        ? 'thumb-up'
                        : 'thumb-up-outline'
                    }
                    size={18}
                    color={
                      galleryEngagePhoto?.isLiked ??
                      galleryPreviewItem?.isLiked
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
                      (galleryEngagePhoto?.isDisliked ??
                        galleryPreviewItem?.isDisliked)
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
                    handlePostLike(postMediaPreviewPost?.postId || postMediaPreviewPost?.id)
                  }
                >
                  <MaterialCommunityIcons name="thumb-up-outline" size={18} color="#333" />
                  <Text style={styles.bpGalleryEngageCellLabel} numberOfLines={1}>
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
                  <Text style={styles.bpGalleryEngageCellLabel} numberOfLines={1}>
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
                  <Text style={styles.bpGalleryEngageCellLabel} numberOfLines={1}>
                    {postMediaPreviewPost?.comments ??
                      formatCount(postMediaPreviewPost?.commentCount ?? 0)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.bpGalleryEngageCell}
                  onPress={() =>
                    handlePostShare(postMediaPreviewPost?.postId || postMediaPreviewPost?.id)
                  }
                >
                  <MaterialCommunityIcons name="share-outline" size={18} color="#333" />
                  <Text style={styles.bpGalleryEngageCellLabel} numberOfLines={1}>
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
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  listContent: {
    paddingBottom: 20,
  },
  headerContainer: {
    paddingBottom: 0,
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginVertical: 10,
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 5,
  },
  activeTabItem: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF7F0B',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FF7F0B',
  },
  promotionSubTabRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  promotionSubTabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  promotionSubTabBtnActive: {
    backgroundColor: '#FF7F0B',
  },
  promotionSubTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
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
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
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
  editAddressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editAddressInput: {
    flex: 1,
  },
  useLocationBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  editSaveBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FF7F0B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editSaveBtnDisabled: {
    opacity: 0.7,
  },
  editSaveBtnText: {
    color: '#fff',
    fontSize: 16,
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
  postEditChipRow: {
    marginBottom: 10,
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
    marginBottom: 10,
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
