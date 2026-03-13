import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { useRoute } from '@react-navigation/native';
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
  subscribeToChannel,
  unsubscribeFromChannel,
} from '../../services/channelService';
import {
  getUserVideos,
  getVideoById,
  toggleLike as toggleVideoLike,
  toggleDislike as toggleVideoDislike,
  recordShare as recordVideoShare,
} from '../../services/videoService';
import { shortsService } from '../../services/shortsService';
import { getNotificationsByUserId } from '../../services/notificationService';
import {
  getPromotionsByUser,
  getNearbyPromotions,
} from '../../services/promotionService';
import { getMenuByUserId } from '../../services/menuService';
import { appSetUser } from '../../redux/actions/appSlice';
import { safeImageUri } from '../../utils/helper';
import {
  geocodeAddress,
  getCurrentPositionSafe,
  reverseGeocode,
  getFallbackCoordsForUKArea,
} from '../../utils/geolocation';
import CreatePromotionModal from '../../components/CreatePromotionModal';
import Video from 'react-native-video';
import Slider from '@react-native-community/slider';
import SaveModal from '../../components/SaveModal';
import { getSocialIcon } from '../../constants/socialLinks';

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
    thumbnail: s.thumbnailUrl || s.coverUrl || s.videoUrl || 'https://via.placeholder.com/600',
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

const mapPostToCard = (post, user) => {
  const u = post.user || user || {};
  const channelName = u.nickname || u.name || 'Unknown';
  const avatar =
    u.photos?.[0] ||
    (Array.isArray(u.photos) && u.photos[0]) ||
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
    channelAvatar: avatar,
    publishedAt: formatTimeAgo(post.publishedAt || post.createdAt),
    thumbnail:
      post.thumbnailUrl || post.mediaUrl || 'https://via.placeholder.com/300',
    duration,
    likes: formatCount(post.likeCount ?? 0),
    dislikes: formatCount(post.dislikeCount ?? 0),
    comments: formatCount(post.commentCount ?? 0),
    shares: formatCount(post.shareCount ?? 0),
    website: post.website || '',
    hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
  };
};

const BASE_TABS = ['Posts', 'Promotions', 'Grid', 'Video', 'Notification'];
// ... (I will handle the rest in the next edit chunk for the render function to avoid giant replaces)

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
    price: '$100',
    image:
      'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '120',
  },
  {
    id: '2',
    title: '10 Rice Bag',
    price: '$100',
    image:
      'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '120',
  },
  {
    id: '3',
    title: '10 Rice Bag',
    price: '$100',
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

  const [activeTab, setActiveTab] = useState('Posts');
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsRefreshing, setPostsRefreshing] = useState(false);
  const [createPostModalVisible, setCreatePostModalVisible] = useState(false);
  const [commentsModalPostId, setCommentsModalPostId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editChannelAbout, setEditChannelAbout] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editLatitude, setEditLatitude] = useState(null);
  const [editLongitude, setEditLongitude] = useState(null);
  const [editSocialLinks, setEditSocialLinks] = useState([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
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
  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState(null);

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
  const modalVideoRef = useRef(null);
  const seekingRef = useRef(false);
  const progressUpdateRef = useRef(0);

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
      const res = await getGallery(profileUserId);
      setGalleryPhotos(res?.photos ?? []);
    } catch (e) {
      setGalleryPhotos([]);
    } finally {
      setGalleryLoading(false);
    }
  }, [profileUserId]);

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
    if (activeTab === 'Grid' && profileUserId) loadGallery();
  }, [activeTab, profileUserId, loadGallery]);

  useEffect(() => {
    if (activeTab === 'Video' && profileUserId) loadOwnerVideos();
  }, [activeTab, profileUserId, loadOwnerVideos]);

  useEffect(() => {
    if (activeTab === 'Notification' && profileUserId) loadNotifications();
  }, [activeTab, profileUserId, loadNotifications]);

  useEffect(() => {
    if (activeTab === 'Promotions' && profileUserId) {
      if (isOwnProfile && isOwnerOrVendor) loadNearbyPromotionsCross();
      else loadPromotions();
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
      const res = await getMenuByUserId(profileUserId);
      setMenuItems(res?.menu ?? []);
    } catch (e) {
      setMenuItems([]);
    } finally {
      setMenuLoading(false);
    }
  }, [profileUserId]);

  useEffect(() => {
    if (activeTab === 'Menus' && profileUserId) loadMenu();
  }, [activeTab, profileUserId, loadMenu]);

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
      const contentType = item._type === 'short' ? 'short' : 'video';
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
          const res = await getVideoById(
            item.id,
            currentUser?.id,
            viewerRole,
          );
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
    setModalVideo(null);
    setVideoModalError(null);
    setModalPaused(true);
    setModalProgress({ currentTime: 0, duration: 0 });
    setModalIsSliding(false);
    setModalSlidingValue(0);
    setVideoCommentsVisible(false);
    setSaveVisible(false);
  }, []);

  const openVideoDetails = useCallback(
    item => {
      if (!item?.id) return;
      const itemType = String(item.type || item._type || '').toLowerCase();
      if (itemType === 'short') {
        // Open shorts player inside Shorts tab stack
        try {
          navigation?.navigate('Shorts', {
            screen: 'ShortsVideoScreen',
            params: { shortId: item.id },
          });
        } catch (_) {
          navigation?.getParent()?.navigate('Shorts', {
            screen: 'ShortsVideoScreen',
            params: { shortId: item.id },
          });
        }
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
    [navigation],
  );

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
        const res = await shortsService.toggleLike(modalVideo.id, currentUser.id);
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
  }, [
    modalVideo?.id,
    modalContentType,
    currentUser?.id,
  ]);

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
  }, [
    modalVideo?.id,
    modalContentType,
    currentUser?.id,
  ]);

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
  }, [modalVideo?.id, modalVideo?.title, modalVideo?.videoUrl, modalContentType]);

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
    modalVideo?.userId,
    currentUser?.id,
    channelSub.isSubscribed,
  ]);

  const openEditProfile = () => {
    setEditName(profile?.name ?? currentUser?.name ?? '');
    setEditNickname(
      profile?.nickname ?? profile?.channelName ?? currentUser?.nickname ?? '',
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
    setEditProfileVisible(true);
  };

  const handleCoverPress = useCallback(() => {
    if (!profileUserId || profileUserId !== currentUser?.id || uploadingCover)
      return;
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async res => {
      if (res.didCancel || res.errorCode || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setUploadingCover(true);
      try {
        await uploadCoverImage(profileUserId, {
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
  }, [profileUserId, currentUser?.id, uploadingCover, loadProfile]);

  const handleAvatarPress = useCallback(() => {
    if (!profileUserId || profileUserId !== currentUser?.id || uploadingAvatar)
      return;
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, async res => {
      if (res.didCancel || res.errorCode || !res.assets?.[0]) return;
      const asset = res.assets[0];
      setUploadingAvatar(true);
      try {
        const data = await uploadProfilePhoto(profileUserId, {
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || 'avatar.jpg',
        });
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
    });
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
        if (!coords || !Number.isFinite(coords.lat) || !Number.isFinite(coords.lng)) {
          const fallback = getFallbackCoordsForUKArea(addressStr);
          if (fallback) coords = fallback;
        }
        if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
          latitude = coords.lat;
          longitude = coords.lng;
        }
      }
      await updateChannelProfile(profileUserId, {
        name: editName.trim() || undefined,
        nickname: editNickname.trim() || undefined,
        channelAbout: editChannelAbout.trim() || undefined,
        phone: editPhone.trim() || undefined,
        address: addressStr,
        ...(latitude != null && { latitude }),
        ...(longitude != null && { longitude }),
        socialLinks: socialLinks.length ? socialLinks : undefined,
      });
      await loadProfile();
      if (currentUser?.id === profileUserId) {
        dispatch(
          appSetUser({
            ...currentUser,
            name: editName.trim() || currentUser.name,
            nickname: editNickname.trim() || currentUser.nickname,
            channelAbout: editChannelAbout.trim() || currentUser.channelAbout,
            phone: editPhone.trim() || currentUser.phone,
            address: addressStr || currentUser.address,
            ...(latitude != null && { latitude }),
            ...(longitude != null && { longitude }),
            socialLinks: socialLinks.length
              ? socialLinks
              : currentUser.socialLinks,
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
          message: `${post.title}\neatix://post/${postId}`,
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
        <TouchableOpacity style={styles.moreIcon}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#666" />
        </TouchableOpacity>
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
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {(isOwnProfile && isOwnerOrVendor
            ? ['Posts', 'Promotions', 'Menus', 'Grid', 'Video', 'Notification']
            : BASE_TABS
          ).map(tab => {
            const isGrid = tab === 'Grid';
            const isActive = activeTab === tab;

            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabItem,
                  activeTab === tab && styles.activeTabItem,
                ]}
                onPress={() => setActiveTab(tab)}
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

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {activeTab === 'Grid'
            ? 'Gallery'
            : activeTab === 'Video'
            ? 'Videos'
            : activeTab === 'Notification'
            ? 'Notifications'
            : activeTab === 'Menus'
            ? 'Menus'
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
        ) : activeTab === 'Promotions' && isOwnProfile && isOwnerOrVendor ? (
          <TouchableOpacity
            onPress={() => setCreatePromotionModalVisible(true)}
          >
            <MaterialCommunityIcons name="plus" size={24} color="#333" />
          </TouchableOpacity>
        ) : activeTab === 'Grid' && isOwnProfile ? (
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
          isOwnProfile && isOwnerOrVendor ? nearbyPromotionsCross : promotions;
        return list.map(p => ({
          id: p.id,
          title: p.title,
          image: p.thumbnailUrl || p.videoUrl,
          price:
            p.promoAmount != null
              ? `${p.promoCode || ''} • ${p.promoAmount}% off`
              : p.promoCode || '',
          views: formatCount(p.viewCount),
          promoCode: p.promoCode,
          promoAmount: p.promoAmount,
          startDate: p.startDate,
          expireDate: p.expireDate,
        }));
      }
      case 'Grid':
        return galleryPhotos.map(p => ({ id: p.id, image: p.src }));
      case 'Menus':
        return menuItems.map(m => ({
          id: m.id,
          itemName: m.itemName,
          price: m.price,
          imageUrl: m.imageUrl,
        }));
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
      return (
        <BusinessVideoCard
          video={item}
          postId={postId}
          onPress={undefined}
          onLike={currentUser?.id ? () => handlePostLike(postId) : undefined}
          onDislike={
            currentUser?.id ? () => handlePostDislike(postId) : undefined
          }
          onCommentPress={() => {
            setCommentsModalPostId(postId);
          }}
          onShare={() => handlePostShare(postId)}
        />
      );
    }
    if (activeTab === 'Promotions') {
      return (
        <PromotionCard
          item={{
            ...item,
            image: item.image
              ? safeImageUri(item.image)
              : 'https://via.placeholder.com/300',
          }}
        />
      );
    }
    if (activeTab === 'Menus') {
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
              {item.price != null ? `$${Number(item.price).toFixed(2)}` : '—'}
            </Text>
          </View>
        </View>
      );
    }
    if (activeTab === 'Grid') {
      return (
        <TouchableOpacity
          style={styles.gridImageContainer}
          onPress={() => {
            setPreviewImageUri(safeImageUri(item.image));
            setPreviewVisible(true);
          }}
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
        <BusinessVideoTabCard
          item={{
            ...item,
            thumbnail: item.thumbnail || item.thumbnailUrl,
            title: item.title || 'Video',
            views: item.views || formatCount(item.viewCount),
            location:
              item.location ||
              profile?.address ||
              currentUser?.address ||
              '',
            distance: item.distance || '',
          }}
          onPress={() => openVideoModal(item)}
        />
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
      {activeTab === 'Grid' && galleryLoading && galleryPhotos.length === 0 ? (
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
      (isOwnProfile && isOwnerOrVendor
        ? nearbyPromotionsCrossLoading
        : promotionsLoading) &&
      (isOwnProfile && isOwnerOrVendor
        ? nearbyPromotionsCross.length
        : promotions.length) === 0 ? (
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
          activeTab === 'Grid'
            ? 'grid-3-col'
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
        numColumns={activeTab === 'Grid' ? 3 : 1}
        columnWrapperStyle={
          activeTab === 'Grid' ? styles.gridColumnWrapper : undefined
        }
        refreshControl={
          activeTab === 'Posts' && profileUserId ? (
            <RefreshControl
              refreshing={postsRefreshing}
              onRefresh={() => loadPosts(true)}
              colors={['#FF7F0B']}
              tintColor="#FF7F0B"
            />
          ) : activeTab === 'Grid' ? (
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
                isOwnProfile && isOwnerOrVendor
                  ? nearbyPromotionsCrossRefreshing
                  : promotionsRefreshing
              }
              onRefresh={() =>
                isOwnProfile && isOwnerOrVendor
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
      <CreatePromotionModal
        visible={createPromotionModalVisible}
        onClose={() => setCreatePromotionModalVisible(false)}
        onSuccess={() => {
          loadPromotions(true);
          if (isOwnProfile && isOwnerOrVendor) loadNearbyPromotionsCross(true);
        }}
        userId={currentUser?.id}
      />

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
              <Text style={styles.editLabel}>Nickname (display name)</Text>
              <TextInput
                style={styles.editInput}
                value={editNickname}
                onChangeText={setEditNickname}
                placeholder="Nickname"
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
                      async (position) => {
                        const lat = position?.coords?.latitude;
                        const lng = position?.coords?.longitude;
                        if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return;
                        const addr = await reverseGeocode(lat, lng);
                        setEditAddress(addr || `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                        setEditLatitude(lat);
                        setEditLongitude(lng);
                      },
                      () => Alert.alert('Location', 'Could not get your location. Check permissions or enter address manually.'),
                    );
                  }}
                >
                  <MaterialCommunityIcons name="crosshairs-gps" size={22} color="#fff" />
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

      {/* Gallery image preview modal */}
      <Modal
        visible={previewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewVisible(false)}
      >
        <View style={styles.previewBackdrop}>
          <TouchableOpacity
            style={styles.previewCloseBtn}
            onPress={() => setPreviewVisible(false)}
          >
            <MaterialCommunityIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {previewImageUri ? (
            <Image
              source={{ uri: previewImageUri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>

      {/* Video/Short modal (same as UserViewsScreen) */}
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
            <Text
              style={styles.videoModalHeaderTitle}
              numberOfLines={1}
            >
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
                  onPress={() =>
                    activeVideoId &&
                    openVideoModal(
                      ownerVideos.find(
                        v => String(v.id) === String(activeVideoId),
                      ),
                    )
                  }
                >
                  <MaterialCommunityIcons
                    name="refresh"
                    size={18}
                    color="#fff"
                  />
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
                        data?.seekableDuration ||
                        data?.duration ||
                        p.duration,
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
                <MaterialCommunityIcons
                  name={
                    modalVideo?.isLiked ? 'thumb-up' : 'thumb-up-outline'
                  }
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
                    modalVideo?.isDisliked
                      ? 'thumb-down'
                      : 'thumb-down-outline'
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
            contentType={modalContentType}
            contentId={modalVideo?.id}
            videoId={modalVideo?.id}
            video={modalVideo}
            user={currentUser}
            onCommentAdded={() => {
              if (!modalVideo?.id) return;
              setModalVideo(prev =>
                prev
                  ? {
                      ...prev,
                      commentCount: (prev.commentCount ?? 0) + 1,
                    }
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
  menuRowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
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

export default BusinessProfileViewScreen;
