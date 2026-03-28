import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
  ScrollView,
  Modal,
  Share,
  Alert,
  Linking,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import UserProfileCard from '../../components/UserProfileCard';
import VideoCard from '../../components/VideoCard';
import CompactVideoCard from '../../components/CompactVideoCard';
import BusinessVideoCard from '../../components/BusinessVideoCard';
import PromotionCard from '../../components/PromotionCard';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { safeImageUri } from '../../utils/helper';
import Video from 'react-native-video';
import Slider from '@react-native-community/slider';
import {
  getUserVideos,
  getVideoById,
  toggleLike as toggleVideoLike,
  toggleDislike as toggleVideoDislike,
  recordShare as recordVideoShare,
} from '../../services/videoService';
import {
  getPostsByUser,
  togglePostLike,
  togglePostDislike,
  recordPostShare,
} from '../../services/postService';
import {
  getChannelProfile,
  getGallery,
  subscribeToChannel,
  unsubscribeFromChannel,
  toggleGalleryPhotoLike,
  toggleGalleryPhotoDislike,
  recordGalleryPhotoShare,
} from '../../services/channelService';
import { shortsService } from '../../services/shortsService';
import CommentsModal from '../../components/CommentsModal';
import SaveModal from '../../components/SaveModal';
import GalleryVideoDetailModal from '../../components/GalleryVideoDetailModal';
import { getSocialIcon } from '../../constants/socialLinks';
import { listCustomPlaylists } from '../../services/playlistService';

const { width } = Dimensions.get('window');

const TABS = [
  'Gallery',
  'Home',
  'Posts',
  'Videos',
  'Photos',
  'Playlists',
];

const PLAYLIST_PLACEHOLDER =
  'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&q=80';

const DEFAULT_OPENING_HOURS = [
  { day: 'Sunday', open: '12.00PM', close: '12.00PM' },
  { day: 'Monday', open: '12.00PM', close: '12.00PM' },
  { day: 'Tuesday', open: '12.00PM', close: '12.00PM' },
  { day: 'Wednesday', open: '12.00PM', close: '12.00PM' },
  { day: 'Thursday', open: '12.00PM', close: '12.00PM' },
  { day: 'Friday', open: '12.00PM', close: '12.00PM' },
  { day: 'Saturday', open: '12.00PM', close: '12.00PM' },
];

const formatCount = n => {
  const num = Number(n || 0);
  if (!Number.isFinite(num) || num <= 0) return '0';
  if (num >= 1000000)
    return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.floor(num));
};

const formatDuration = seconds => {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return '';
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${mm}:${String(ss).padStart(2, '0')}`;
};

const timeAgo = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
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

const mapVideoToCard = (v, profile) => {
  const name =
    profile?.channelName || profile?.nickname || profile?.name || 'Unknown';
  const avatar = safeImageUri(
    profile?.channelAvatar || profile?.photos?.[0]?.src || profile?.photos?.[0],
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name,
    )}&background=111&color=fff`,
  );
  const viewCount = v?.viewCount ?? v?._count?.views ?? 0;
  return {
    id: v.id,
    title: v.title || 'Untitled',
    channelName: name,
    channelAvatar: avatar,
    publishedAt: timeAgo(v.publishedAt || v.createdAt),
    thumbnail: safeImageUri(
      v.thumbnailUrl || v.videoUrl,
      'https://via.placeholder.com/600',
    ),
    duration: formatDuration(v.duration),
    views: `${formatCount(viewCount)} views`,
  };
};

const mapVideoApiToModal = (v = {}) => {
  const u = v.user || {};
  const channelName = u.nickname || u.name || 'Unknown';
  const rawAvatar = u.photos?.[0] ?? (Array.isArray(u.photos) && u.photos[0]);
  const channelAvatar = safeImageUri(
    rawAvatar?.src ?? rawAvatar,
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      channelName,
    )}&background=111&color=fff`,
  );
  return {
    id: v.id,
    title: v.title || 'Untitled',
    videoUrl: v.videoUrl,
    thumbnail:
      v.thumbnailUrl || v.videoUrl || 'https://via.placeholder.com/600',
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

const mapPostToCard = (p, profile) => {
  const name =
    profile?.channelName || profile?.nickname || profile?.name || 'Unknown';
  const avatar = safeImageUri(
    profile?.channelAvatar || profile?.photos?.[0]?.src || profile?.photos?.[0],
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      name,
    )}&background=111&color=fff`,
  );
  return {
    id: p.id,
    postId: p.id,
    title: p.title || 'Untitled',
    channelName: name,
    channelAvatar: avatar,
    publishedAt: timeAgo(p.publishedAt || p.createdAt),
    thumbnail: safeImageUri(
      p.thumbnailUrl || p.mediaUrl,
      'https://via.placeholder.com/600',
    ),
    duration:
      p.mediaType === 'video' && p.duration != null
        ? formatDuration(p.duration)
        : '',
    likeCount: p.likeCount ?? 0,
    dislikeCount: p.dislikeCount ?? 0,
    commentCount: p.commentCount ?? 0,
    shareCount: p.shareCount ?? 0,
    likes: formatCount(p.likeCount ?? 0),
    dislikes: formatCount(p.dislikeCount ?? 0),
    comments: formatCount(p.commentCount ?? 0),
    shares: formatCount(p.shareCount ?? 0),
    isLiked: p.isLiked ?? false,
    isDisliked: p.isDisliked ?? false,
    website: p.website || '',
    hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
    mediaUrl: p.mediaUrl,
    mediaType: p.mediaType || 'image',
  };
};

const UserViewsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Gallery');
  const route = useRoute();
  const currentUser = useSelector(state => state.app?.user);
  const profileUserId = route.params?.userId || currentUser?.id || null;

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState(null);
  const [postMediaPreviewVisible, setPostMediaPreviewVisible] = useState(false);
  const [postMediaPreviewUri, setPostMediaPreviewUri] = useState(null);
  const [postMediaPreviewType, setPostMediaPreviewType] = useState('image');
  const [instagramPreviewVisible, setInstagramPreviewVisible] = useState(false);
  const [instagramPreviewItem, setInstagramPreviewItem] = useState(null);
  const [galleryPostDetailVisible, setGalleryPostDetailVisible] =
    useState(false);
  const [galleryPostDetailItem, setGalleryPostDetailItem] = useState(null);
  const [galleryPostVideoVisible, setGalleryPostVideoVisible] = useState(false);
  const [galleryPostImageVisible, setGalleryPostImageVisible] = useState(false);

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSubscribeLoading, setProfileSubscribeLoading] = useState(false);

  const [rawVideos, setRawVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);

  const [channelPlaylists, setChannelPlaylists] = useState([]);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);

  const [rawPosts, setRawPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);
  const [galleryVideoModal, setGalleryVideoModal] = useState(null);
  const [galleryEngagePhoto, setGalleryEngagePhoto] = useState(null);
  const [commentsModalGalleryPhotoId, setCommentsModalGalleryPhotoId] =
    useState(null);

  const [postCommentsVisible, setPostCommentsVisible] = useState(false);
  const [activePostId, setActivePostId] = useState(null);

  // Video quick-view modal (no Order/Map/Related list)
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
  const modalVideoRef = React.useRef(null);
  const seekingRef = React.useRef(false);
  const progressUpdateRef = React.useRef(0);

  const [saveVisible, setSaveVisible] = useState(false);
  const [videoCommentsVisible, setVideoCommentsVisible] = useState(false);

  const [channelSub, setChannelSub] = useState({
    isSubscribed: false,
    subscriberCount: 0,
  });
  const [subLoading, setSubLoading] = useState(false);

  const headerTitle = useMemo(() => {
    return profile?.channelName || profile?.nickname || profile?.name || 'User';
  }, [profile]);

  const videos = useMemo(() => {
    return (rawVideos || []).map(v => mapVideoToCard(v, profile));
  }, [rawVideos, profile]);

  const posts = useMemo(() => {
    return (rawPosts || []).map(p => mapPostToCard(p, profile));
  }, [rawPosts, profile]);

  const instagramFeedItems = useMemo(() => {
    const postItems = (rawPosts || []).map(p => {
      const media = String(p?.mediaUrl || p?.thumbnailUrl || '').trim();
      const mt = String(p?.mediaType || '').toLowerCase();
      const isVideo =
        mt === 'video' || /\.(mp4|mov|m4v|webm|mkv)(\?|$)/i.test(media);
      return {
        id: `post-${p.id}`,
        originId: p.id,
        sourceType: 'post',
        title: p?.title || 'Post',
        description: String(p?.description || p?.caption || '').trim(),
        subtitle: timeAgo(p?.publishedAt || p?.createdAt),
        mediaType: isVideo ? 'video' : 'image',
        mediaUrl: media,
        thumbnail: safeImageUri(
          p?.thumbnailUrl || p?.mediaUrl,
          'https://via.placeholder.com/600',
        ),
        createdAt:
          new Date(p?.publishedAt || p?.createdAt || 0).getTime() || Date.now(),
      };
    });

    const videoItems = (rawVideos || []).map(v => ({
      id: `video-${v.id}`,
      originId: v.id,
      sourceType: 'video',
      title: v?.title || 'Video',
      subtitle: timeAgo(v?.publishedAt || v?.createdAt),
      mediaType: 'video',
      mediaUrl: String(v?.videoUrl || '').trim(),
      thumbnail: safeImageUri(
        v?.thumbnailUrl || v?.videoUrl,
        'https://via.placeholder.com/600',
      ),
      type: v?.type || v?._type || v?.contentType || '',
      isShort: v?.type === 'short' || Boolean(v?.isShort),
      createdAt:
        new Date(v?.publishedAt || v?.createdAt || 0).getTime() || Date.now(),
    }));

    const galleryItems = (galleryPhotos || []).map(g => ({
      id: `gallery-${g.id}`,
      originId: g.id,
      sourceType: 'gallery',
      title: 'Photo',
      subtitle: timeAgo(g?.createdAt),
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
  }, [rawPosts, rawVideos, galleryPhotos]);

  const requireLogin = () => {
    if (!currentUser?.id) {
      Alert.alert('Login required', 'Please login to continue.');
      return true;
    }
    return false;
  };

  const openVideoModal = async videoId => {
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
  };

  const closeVideoModal = () => {
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
  };

  const formatTime = sec => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const modalDisplayTime = modalIsSliding
    ? modalSlidingValue
    : modalProgress.currentTime;

  const handleModalLike = async () => {
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
  };

  const handleModalDislike = async () => {
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
  };

  const handleModalShare = async () => {
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
  };

  const handleSubscribe = async () => {
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
  };

  const updatePostLocal = (postId, updater) => {
    setRawPosts(prev =>
      (prev || []).map(p => (String(p.id) === String(postId) ? updater(p) : p)),
    );
  };

  const handlePostLike = async post => {
    if (requireLogin()) return;
    const postId = post?.postId || post?.id;
    if (!postId) return;

    // Optimistic UI
    updatePostLocal(postId, p => {
      const isLiked = !(p.isLiked ?? false);
      const wasDisliked = p.isDisliked ?? false;
      return {
        ...p,
        isLiked,
        isDisliked: isLiked ? false : wasDisliked,
        likeCount: Math.max(0, (p.likeCount ?? 0) + (isLiked ? 1 : -1)),
        dislikeCount:
          isLiked && wasDisliked
            ? Math.max(0, (p.dislikeCount ?? 0) - 1)
            : p.dislikeCount ?? 0,
      };
    });

    try {
      const res = await togglePostLike(postId, currentUser.id);
      if (res) {
        updatePostLocal(postId, p => ({
          ...p,
          ...(res.likeCount != null && { likeCount: res.likeCount }),
          ...(res.dislikeCount != null && { dislikeCount: res.dislikeCount }),
          ...(res.isLiked != null && { isLiked: res.isLiked }),
          ...(res.isDisliked != null && { isDisliked: res.isDisliked }),
        }));
      }
    } catch (e) {
      // revert by reloading posts
      loadPosts();
    }
  };

  const handlePostDislike = async post => {
    if (requireLogin()) return;
    const postId = post?.postId || post?.id;
    if (!postId) return;

    updatePostLocal(postId, p => {
      const isDisliked = !(p.isDisliked ?? false);
      const wasLiked = p.isLiked ?? false;
      return {
        ...p,
        isDisliked,
        isLiked: isDisliked ? false : wasLiked,
        dislikeCount: Math.max(
          0,
          (p.dislikeCount ?? 0) + (isDisliked ? 1 : -1),
        ),
        likeCount:
          isDisliked && wasLiked
            ? Math.max(0, (p.likeCount ?? 0) - 1)
            : p.likeCount ?? 0,
      };
    });

    try {
      const res = await togglePostDislike(postId, currentUser.id);
      if (res) {
        updatePostLocal(postId, p => ({
          ...p,
          ...(res.likeCount != null && { likeCount: res.likeCount }),
          ...(res.dislikeCount != null && { dislikeCount: res.dislikeCount }),
          ...(res.isLiked != null && { isLiked: res.isLiked }),
          ...(res.isDisliked != null && { isDisliked: res.isDisliked }),
        }));
      }
    } catch (e) {
      loadPosts();
    }
  };

  const handlePostShare = async post => {
    const postId = post?.postId || post?.id;
    if (!postId) return;
    try {
      updatePostLocal(postId, p => ({
        ...p,
        shareCount: (p.shareCount ?? 0) + 1,
      }));
      recordPostShare(postId);
      await Share.share({
        message: post?.title ? `${post.title}` : 'Check this post',
        url: post?.mediaUrl || '',
        title: post?.title || 'Post',
      });
    } catch (e) {
      // ignore
    }
  };

  const openPostComments = post => {
    if (requireLogin()) return;
    const postId = post?.postId || post?.id;
    if (!postId) return;
    setActivePostId(postId);
    setPostCommentsVisible(true);
  };

  const openPostMediaPreview = post => {
    const media = String(post?.mediaUrl || post?.thumbnail || '').trim();
    if (!media) return;
    const mt = String(post?.mediaType || '').toLowerCase();
    const byExt = /\.(mp4|mov|m4v|webm|mkv)(\?|$)/i.test(media);
    const kind = mt === 'video' || byExt ? 'video' : 'image';
    setPostMediaPreviewType(kind);
    setPostMediaPreviewUri(media);
    setPostMediaPreviewVisible(true);
  };

  const openInstagramPreview = item => {
    if (!item?.mediaUrl) return;
    setInstagramPreviewItem(item);
    setInstagramPreviewVisible(true);
  };

  const patchGalleryPhoto = useCallback((photoId, updater) => {
    setGalleryPhotos(prev =>
      prev.map(p => (String(p.id) === String(photoId) ? updater(p) : p)),
    );
  }, []);

  /** Re-fetch gallery so like/comment counts match server after toggles or reopening preview. */
  const syncGalleryEngageFromServer = useCallback(
    async pid => {
      if (!profileUserId || !pid) return;
      try {
        const res = await getGallery(profileUserId, currentUser?.id);
        const photos = res?.photos ?? [];
        setGalleryPhotos(photos);
        const fresh = photos.find(g => String(g.id) === String(pid));
        if (!fresh) return;
        setGalleryEngagePhoto(fresh);
        setInstagramPreviewItem(it =>
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

  const applyGalleryToggleLike = useCallback(p => {
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

  const applyGalleryToggleDislike = useCallback(p => {
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

  const handleGalleryEngageLike = useCallback(async () => {
    if (requireLogin()) return;
    if (!profileUserId || !galleryEngagePhoto?.id) return;
    const pid = galleryEngagePhoto.id;
    patchGalleryPhoto(pid, p => applyGalleryToggleLike(p));
    setGalleryEngagePhoto(ge =>
      ge && String(ge.id) === String(pid) ? applyGalleryToggleLike(ge) : ge,
    );
    setInstagramPreviewItem(it =>
      it && String(it.originId) === String(pid) ? applyGalleryToggleLike(it) : it,
    );
    try {
      await toggleGalleryPhotoLike(profileUserId, pid, currentUser.id);
      await syncGalleryEngageFromServer(pid);
    } catch {
      if (profileUserId) {
        getGallery(profileUserId, currentUser?.id)
          .then(r => setGalleryPhotos(r?.photos ?? []))
          .catch(() => {});
      }
    }
  }, [
    profileUserId,
    galleryEngagePhoto?.id,
    patchGalleryPhoto,
    applyGalleryToggleLike,
    currentUser?.id,
    syncGalleryEngageFromServer,
  ]);

  const handleGalleryEngageDislike = useCallback(async () => {
    if (requireLogin()) return;
    if (!profileUserId || !galleryEngagePhoto?.id) return;
    const pid = galleryEngagePhoto.id;
    patchGalleryPhoto(pid, p => applyGalleryToggleDislike(p));
    setGalleryEngagePhoto(ge =>
      ge && String(ge.id) === String(pid)
        ? applyGalleryToggleDislike(ge)
        : ge,
    );
    setInstagramPreviewItem(it =>
      it && String(it.originId) === String(pid)
        ? applyGalleryToggleDislike(it)
        : it,
    );
    try {
      await toggleGalleryPhotoDislike(profileUserId, pid, currentUser.id);
      await syncGalleryEngageFromServer(pid);
    } catch {
      if (profileUserId) {
        getGallery(profileUserId, currentUser?.id)
          .then(r => setGalleryPhotos(r?.photos ?? []))
          .catch(() => {});
      }
    }
  }, [
    profileUserId,
    galleryEngagePhoto?.id,
    patchGalleryPhoto,
    applyGalleryToggleDislike,
    currentUser?.id,
    syncGalleryEngageFromServer,
  ]);

  const handleGalleryEngageShare = useCallback(async () => {
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
      setInstagramPreviewItem(it =>
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

  const handleGalleryCommentAdded = useCallback(
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
      setInstagramPreviewItem(it =>
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
      syncGalleryEngageFromServer(pid);
    },
    [commentsModalGalleryPhotoId, patchGalleryPhoto, syncGalleryEngageFromServer],
  );

  const openGalleryPhotoCommentsModal = useCallback(() => {
    if (requireLogin()) return;
    if (!galleryEngagePhoto?.id) return;
    setCommentsModalGalleryPhotoId(galleryEngagePhoto.id);
  }, [galleryEngagePhoto?.id]);

  const openPhotosTabPreview = useCallback(
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
        subtitle: timeAgo(p?.createdAt),
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
      setInstagramPreviewItem(feedItem);
      setInstagramPreviewVisible(true);
    },
    [profileUserId, currentUser?.id],
  );

  const openGalleryItem = item => {
    if (!item?.mediaUrl) return;
    const sourceType = String(item?.sourceType || '').toLowerCase();
    if (sourceType === 'post') {
      setGalleryPostDetailItem(item);
      setGalleryPostDetailVisible(true);
      return;
    }
    if (sourceType === 'video') {
      setGalleryEngagePhoto(null);
      const rawType = String(
        item?.type || item?._type || item?.contentType || '',
      ).toLowerCase();
      const isShortByType = rawType === 'short' || rawType === 'shorts';
      const isShortByUrl = /\/shorts?\//i.test(String(item?.mediaUrl || ''));
      const isShort =
        Boolean(item?.isShort) || isShortByType || isShortByUrl;
      const targetId = item?.originId ?? item?.id;
      if (!targetId) return;
      if (isShort) {
        navigateToShortsVideoScreen(String(targetId), item);
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
        let raw = (galleryPhotos || []).find(g => String(g.id) === String(pid));
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
        setInstagramPreviewItem({
          ...item,
          likeCount: base.likeCount ?? item?.likeCount ?? 0,
          dislikeCount: base.dislikeCount ?? item?.dislikeCount ?? 0,
          commentCount: base.commentCount ?? item?.commentCount ?? 0,
          shareCount: base.shareCount ?? item?.shareCount ?? 0,
          isLiked: base.isLiked ?? item?.isLiked ?? false,
          isDisliked: base.isDisliked ?? item?.isDisliked ?? false,
        });
        setInstagramPreviewVisible(true);
      })();
      return;
    }
    openInstagramPreview(item);
  };

  const selectedGalleryPost = useMemo(() => {
    const id = galleryPostDetailItem?.originId;
    if (!id) return null;
    const source = (rawPosts || []).find(p => String(p.id) === String(id));
    if (!source) return null;
    return mapPostToCard(source, profile);
  }, [galleryPostDetailItem?.originId, rawPosts, profile]);

  const activePostCommentCount = useMemo(() => {
    if (!activePostId) return 0;
    const p = (rawPosts || []).find(x => String(x.id) === String(activePostId));
    if (p?.commentCount != null) return Number(p.commentCount) || 0;
    if (
      selectedGalleryPost &&
      String(selectedGalleryPost.postId || selectedGalleryPost.id) ===
        String(activePostId)
    ) {
      return Number(selectedGalleryPost.commentCount || 0) || 0;
    }
    return 0;
  }, [activePostId, rawPosts, selectedGalleryPost]);

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

  const showProfileSubscribe =
    !!profileUserId &&
    !!currentUser?.id &&
    String(profileUserId) !== String(currentUser.id);

  const handleProfileSubscribe = async () => {
    if (requireLogin()) return;
    if (!profileUserId || !currentUser?.id) return;
    if (String(profileUserId) === String(currentUser.id)) return;
    if (!profile) return;

    setProfileSubscribeLoading(true);
    try {
      if (profile?.isSubscribed) {
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
      // refresh from server on failure
      loadProfile();
    } finally {
      setProfileSubscribeLoading(false);
    }
  };

  const handleProfileMessagePress = useCallback(() => {
    if (requireLogin()) return;
    if (!profileUserId || !currentUser?.id) return;
    const isOwn = String(profileUserId) === String(currentUser.id);
    if (isOwn) {
      navigation.navigate('MessageList');
      return;
    }
    navigation.navigate('ChatScreen', {
      partnerId: profileUserId,
      partnerName:
        profile?.channelName || profile?.nickname || profile?.name || 'User',
      partnerAvatar: safeImageUri(
        profile?.channelAvatar ||
          profile?.photos?.[0]?.src ||
          profile?.photos?.[0],
      ),
    });
  }, [profileUserId, currentUser?.id, navigation, profile]);

  const handleChannelOrderNow = useCallback(() => {
    if (!profileUserId) return;
    const ownerName =
      profile?.channelName || profile?.nickname || profile?.name || '';
    const location = profile?.address || '';
    const goOrderFlow = (screen, params) => {
      navigation.navigate('Root', {
        screen: 'Home1',
        params: { screen, params },
      });
    };
    if (!currentUser?.token) {
      goOrderFlow('HomeSevenScreen', {
        returnToOrder: true,
        ownerUserId: profileUserId,
      });
      return;
    }
    goOrderFlow('HomeThreeScreen', {
      ownerId: profileUserId,
      ownerName,
      title: ownerName,
      location,
    });
  }, [profileUserId, profile, currentUser?.token, navigation]);

  /** Followers / Following lists live on Home1 stack (same as BusinessProfileCard) */
  const handlePressFollowers = useCallback(() => {
    if (!profileUserId) return;
    navigation.navigate('Root', {
      screen: 'Home1',
      params: {
        screen: 'FollowersListScreen',
        params: {
          profileId: profileUserId,
          userId: profileUserId,
        },
      },
    });
  }, [profileUserId, navigation]);

  const handlePressFollowing = useCallback(() => {
    if (!profileUserId) return;
    navigation.navigate('Root', {
      screen: 'Home1',
      params: {
        screen: 'FollowingListScreen',
        params: {
          profileId: profileUserId,
          userId: profileUserId,
        },
      },
    });
  }, [profileUserId, navigation]);

  /**
   * Shorts → Shorts tab ShortsVideoScreen (same as PromotionScreen `openLibraryMedia`).
   * View is recorded once in ShortsVideoScreen (deduped) so the count updates in the player UI.
   */
  const navigateToShortsVideoScreen = useCallback(
    (shortId, feedItem) => {
      if (!shortId) return;
      const sid = String(shortId);
      const raw =
        (rawVideos || []).find(
          v =>
            String(v.id) === sid &&
            (v.type === 'short' ||
              String(v.type || '').toLowerCase() === 'short'),
        ) || null;
      const fallbackName =
        raw?.user?.nickname ||
        raw?.user?.name ||
        profile?.nickname ||
        profile?.name ||
        currentUser?.nickname ||
        currentUser?.name ||
        'User';
      const initialShortItem = raw
        ? {
            ...raw,
            userId: raw?.userId || raw?.user?.id || profileUserId,
            user: {
              ...(raw.user && typeof raw.user === 'object' ? raw.user : {}),
              id: raw?.user?.id || raw?.userId || profileUserId,
              nickname: raw?.user?.nickname || fallbackName,
              name: raw?.user?.name || fallbackName,
            },
          }
        : feedItem && typeof feedItem === 'object'
        ? {
            ...feedItem,
            id: sid,
            userId: profileUserId,
            user: {
              id: profileUserId,
              nickname: fallbackName,
              name: fallbackName,
            },
          }
        : {
            id: sid,
            userId: profileUserId,
            user: {
              id: profileUserId,
              nickname: fallbackName,
              name: fallbackName,
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
    },
    [navigation, rawVideos, profileUserId, profile, currentUser],
  );

  const loadVideos = useCallback(async () => {
    if (!profileUserId) return;
    setVideosLoading(true);
    try {
      const [vRes, sRes] = await Promise.all([
        getUserVideos(profileUserId, 1, 100),
        shortsService.getUserShorts(profileUserId, 1, 100),
      ]);
      const videos = (vRes?.videos ?? []).map(v => ({ ...v, type: 'video' }));
      const shorts = (sRes?.shorts ?? []).map(s => ({ ...s, type: 'short' }));
      setRawVideos([...videos, ...shorts]);
    } catch (e) {
      setRawVideos([]);
    } finally {
      setVideosLoading(false);
    }
  }, [profileUserId]);

  const loadPosts = useCallback(async () => {
    if (!profileUserId) return;
    setPostsLoading(true);
    try {
      const res = await getPostsByUser(profileUserId, 1, 50);
      setRawPosts(res?.posts || []);
    } catch (e) {
      setRawPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [profileUserId]);

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

  const loadPlaylists = useCallback(async () => {
    if (!profileUserId) return;
    setPlaylistsLoading(true);
    try {
      const rows = await listCustomPlaylists(profileUserId);
      const ch =
        profile?.channelName || profile?.nickname || profile?.name || 'Channel';
      const cover = safeImageUri(
        profile?.channelAvatar ||
          profile?.photos?.[0]?.src ||
          profile?.photos?.[0],
        PLAYLIST_PLACEHOLDER,
      );
      setChannelPlaylists(
        (rows || []).map(p => ({
          id: p.id,
          title: p.name,
          playlistName: p.name,
          price: `${ch}\n\n${p.itemCount ?? 0} videos`,
          image: cover,
          views: String(p.itemCount ?? 0),
        })),
      );
    } catch {
      setChannelPlaylists([]);
    } finally {
      setPlaylistsLoading(false);
    }
  }, [profileUserId, profile]);

  useEffect(() => {
    if (!profileUserId) return;
    loadProfile();
    // Load Home tab data right away
    loadVideos();
  }, [profileUserId, loadProfile, loadVideos]);

  useEffect(() => {
    if (!profileUserId) {
      setChannelPlaylists([]);
      return;
    }
    if (activeTab !== 'Playlists') return;
    loadPlaylists();
  }, [activeTab, profileUserId, loadPlaylists]);

  useFocusEffect(
    React.useCallback(() => {
      if (route.params?.focusVideosTab) {
        setActiveTab('Videos');
        navigation.setParams({ focusVideosTab: undefined });
      }
    }, [route.params?.focusVideosTab, navigation]),
  );

  useEffect(() => {
    if (!profileUserId) return;
    if (activeTab === 'Posts') loadPosts();
    if (activeTab === 'Gallery') {
      loadGallery();
      loadPosts();
      loadVideos();
    }
    if (activeTab === 'Photos') loadGallery();
    if (activeTab === 'Videos') loadVideos();
    if (activeTab === 'Instagram') {
      loadPosts();
      loadGallery();
      loadVideos();
    }
  }, [activeTab, profileUserId, loadPosts, loadGallery, loadVideos]);

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

      <UserProfileCard
        profile={profile}
        loading={profileLoading}
        showSubscribe={showProfileSubscribe}
        onSubscribe={handleProfileSubscribe}
        onMessagePress={handleProfileMessagePress}
        subscribeLoading={profileSubscribeLoading}
        onOrderNowPress={handleChannelOrderNow}
        onPressFollowers={handlePressFollowers}
        onPressFollowing={handlePressFollowing}
        onPressReviews={() => {
          if (!profileUserId) return;
          navigation.navigate('ChannelReviewsScreen', {
            channelUserId: profileUserId,
            channelName:
              profile?.channelName ||
              profile?.nickname ||
              profile?.name ||
              'Channel',
          });
        }}
      />

      {/* Social icons row — business profiles only (hidden for role "user") */}
      {String(profile?.role || '').toLowerCase() !== 'user' ? (
        <View style={styles.profileSocialRow}>
          {(() => {
            const raw = profile?.socialLinks;
            const links = Array.isArray(raw)
              ? raw
              : raw && typeof raw === 'object'
              ? [raw]
              : [];
            const normalized = links.map(l => ({
              type: String(l?.type || 'others').toLowerCase(),
              url: String(l?.url || '').trim(),
            }));

            const iconOrder = [
              { type: 'instagram' },
              { type: 'facebook' },
              { type: 'x', image: require('../../assets/icons/x.png') },
              {
                type: 'tiktok',
                image: require('../../assets/icons/tiktok.png'),
              },
              {
                type: 'tripadvisor',
                image: require('../../assets/icons/tripadvisor.png'),
              },
              { type: 'google', icon: 'google' },
              { type: 'website', icon: 'web' },
            ];

            return iconOrder.map(({ type, icon, image }) => {
              const match = normalized.find(l => l.type === type && l.url);
              const url = match?.url || '';
              const disabled = !url;
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.profileSocialBtn,
                    disabled && styles.profileSocialBtnDisabled,
                  ]}
                  disabled={disabled}
                  onPress={() => {
                    if (!url) return;
                    Linking.openURL(
                      url.startsWith('http') ? url : `https://${url}`,
                    );
                  }}
                  activeOpacity={0.8}
                >
                  {image ? (
                    <Image
                      source={image}
                      style={{
                        width: 22,
                        height: 22,
                        tintColor: disabled ? '#BDBDBD' : null,
                      }}
                      resizeMode="contain"
                    />
                  ) : (
                    <MaterialCommunityIcons
                      name={icon || getSocialIcon(type)}
                      size={20}
                      color={disabled ? '#BDBDBD' : '#111'}
                    />
                  )}
                </TouchableOpacity>
              );
            });
          })()}
        </View>
      ) : null}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map(tab => {
          const isGrid = tab === 'Gallery';
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabItem,
                isActive && styles.activeTabItem,
                isGrid && styles.gridTabItem,
              ]}
              onPress={() => setActiveTab(tab)}
            >
              {isGrid ? (
                <MaterialCommunityIcons
                  name={tab === 'Instagram' ? 'instagram' : 'view-grid'}
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
      </View>
    </View>
  );

  const getListData = () => {
    switch (activeTab) {
      case 'Home':
        return [{ id: 'home' }];
      case 'Posts':
        return posts;
      case 'Gallery':
        return instagramFeedItems;
      case 'Photos':
        return (galleryPhotos || []).map(p => ({
          ...p,
          id: p.id,
          thumbnail: safeImageUri(p.src, 'https://via.placeholder.com/600'),
        }));
      case 'Videos':
        return videos;
      case 'Instagram':
        return instagramFeedItems;
      case 'Playlists':
        return playlistsLoading ? [] : channelPlaylists;
      default:
        return [];
    }
  };

  const renderContentItem = ({ item }) => {
    if (activeTab === 'Home') {
      const about =
        profile?.channelAbout || profile?.about || profile?.bio || '—';
      const phone =
        profile?.phone ||
        profile?.phoneNumber ||
        profile?.mobile ||
        profile?.contactPhone ||
        '—';
      const email = profile?.email || profile?.contactEmail || '—';
      const address = profile?.address || '—';
      const lat = profile?.latitude;
      const lng = profile?.longitude;
      const hasCoords =
        lat != null &&
        lng != null &&
        Number.isFinite(Number(lat)) &&
        Number.isFinite(Number(lng));

      const isOwnerProfile =
        String(profile?.role || '').toLowerCase() === 'owner';
      const openingHours =
        Array.isArray(profile?.openingHours) && profile.openingHours.length
          ? profile.openingHours
          : DEFAULT_OPENING_HOURS;

      return (
        <View style={styles.homeDetailsWrap}>
          <View style={styles.homeSection}>
            <Text style={styles.homeSectionTitle}>About</Text>
            <Text style={styles.aboutText}>{about}</Text>
          </View>

          <View style={styles.homeSection}>
            <TouchableOpacity
              disabled={!phone || phone === '—'}
              onPress={() => {
                if (!phone || phone === '—') return;
                Linking.openURL(`tel:${String(phone).replace(/\s/g, '')}`);
              }}
              activeOpacity={0.8}
              style={{ flexDirection: 'row', alignItems: 'center' }} // Ensures horizontal alignment
            >
              <Text style={styles.homeSectionTitle}>
                {/* "Contact:" label inline with the link */}
                Contact: <Text style={styles.phoneText}>+{String(phone)}</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={!email || email === '—'}
              onPress={() => {
                if (!email || email === '—') return;
                Linking.openURL(`mailto:${String(email).trim()}`);
              }}
              activeOpacity={0.8}
            >
              <Text style={[styles.homeSectionText, styles.linkText]}>
                {String(email)}
              </Text>
            </TouchableOpacity>
            <Text style={styles.homeSectionText}>
              Address : {String(address)}
            </Text>
          </View>

          <View style={styles.homeSection}>
            <View style={styles.mapCard}>
              <Text style={styles.mapTitle}>Location</Text>
              <View style={styles.mapPlaceholder}>
                <MaterialCommunityIcons
                  name="map-marker-radius-outline"
                  size={24}
                  color="#FFAD33"
                />
                <Text style={styles.mapText} numberOfLines={2}>
                  {hasCoords
                    ? `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
                    : 'Location not available'}
                </Text>
              </View>
              {hasCoords ? (
                <TouchableOpacity
                  style={styles.mapOpenBtn}
                  onPress={() =>
                    Linking.openURL(
                      `https://www.google.com/maps?q=${Number(lat)},${Number(
                        lng,
                      )}`,
                    )
                  }
                  activeOpacity={0.85}
                >
                  <MaterialCommunityIcons
                    name="map-outline"
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.mapOpenText}>Open in Maps</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>

          {isOwnerProfile ? (
            <View style={styles.homeSection}>
              <Text style={styles.homeSectionTitle}>Opening Hours :</Text>
              <View style={styles.hoursHeaderRow}>
                <Text style={[styles.hoursHeaderText, { flex: 1 }]}>Days</Text>
                <Text
                  style={[
                    styles.hoursHeaderText,
                    { width: 90, textAlign: 'right' },
                  ]}
                >
                  Opening Time
                </Text>
                <Text
                  style={[
                    styles.hoursHeaderText,
                    { width: 90, textAlign: 'right' },
                  ]}
                >
                  Close Time
                </Text>
              </View>
              {(openingHours || []).map((h, idx) => (
                <View key={`${h.day || idx}-${idx}`} style={styles.hoursRow}>
                  <Text
                    style={[styles.hoursCellDay, { flex: 1 }]}
                    numberOfLines={1}
                  >
                    {h.day || '—'}
                  </Text>
                  <Text
                    style={[
                      styles.hoursCell,
                      { width: 90, textAlign: 'right' },
                    ]}
                    numberOfLines={1}
                  >
                    {h.open || h.opening || h.start || '—'}
                  </Text>
                  <Text
                    style={[
                      styles.hoursCell,
                      { width: 90, textAlign: 'right' },
                    ]}
                    numberOfLines={1}
                  >
                    {h.close || h.closing || h.end || '—'}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      );
    }
    if (activeTab === 'Posts')
      return (
        <BusinessVideoCard
          video={{
            ...item,
            likes: formatCount(item.likeCount ?? 0),
            dislikes: formatCount(item.dislikeCount ?? 0),
            comments: formatCount(item.commentCount ?? 0),
            shares: formatCount(item.shareCount ?? 0),
          }}
          avatarSize={45}
          avatarMarginRight={8}
          hideMenuButton
          onPress={() => openPostMediaPreview(item)}
          onLike={() => handlePostLike(item)}
          onDislike={() => handlePostDislike(item)}
          onCommentPress={() => openPostComments(item)}
          onShare={() => handlePostShare(item)}
        />
      );
    if (activeTab === 'Gallery') {
      return (
        <TouchableOpacity
          style={styles.gridImageContainer}
          activeOpacity={0.85}
          onPress={() => openGalleryItem(item)}
        >
          <Image source={{ uri: item.thumbnail }} style={styles.gridImage} />
          {item.mediaType === 'video' ? (
            <View style={styles.instaVideoBadge}>
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
          activeOpacity={0.85}
          onPress={() => openPhotosTabPreview(item)}
        >
          <Image source={{ uri: item.thumbnail }} style={styles.gridImage} />
        </TouchableOpacity>
      );
    }
    if (activeTab === 'Instagram') {
      return (
        <TouchableOpacity
          style={styles.instaGridImageContainer}
          activeOpacity={0.85}
          onPress={() => openGalleryItem(item)}
        >
          <Image source={{ uri: item.thumbnail }} style={styles.gridImage} />
          {item.mediaType === 'video' ? (
            <View style={styles.instaVideoBadge}>
              <MaterialCommunityIcons name="play" size={14} color="#fff" />
            </View>
          ) : null}
        </TouchableOpacity>
      );
    }
    if (activeTab === 'Videos')
      return (
        <CompactVideoCard
          video={item}
          onPress={() => {
            const vid = rawVideos.find(
              v => String(v.id) === String(item.id),
            );
            const isShort = vid?.type === 'short';
            if (isShort) {
              navigateToShortsVideoScreen(String(item.id), vid);
              return;
            }
            setGalleryVideoModal({
              contentId: String(item.id),
              kind: 'video',
            });
          }}
        />
      );
    if (activeTab === 'Playlists')
      return (
        <View style={{ position: 'relative' }}>
          <PromotionCard
            item={item}
            onPress={() =>
              navigation.navigate('CustomPlaylistScreen', {
                playlistId: item.id,
                title: item.playlistName || item.title,
              })
            }
          />
          <TouchableOpacity
            style={{ position: 'absolute', top: 12, right: 16, padding: 4 }}
          >
            <MaterialCommunityIcons
              name="dots-vertical"
              size={20}
              color="#333"
            />
          </TouchableOpacity>
        </View>
      );
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      {!profileUserId ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Login required</Text>
          <Text style={styles.emptyText}>
            Please login to view this profile.
          </Text>
        </View>
      ) : null}
      <FlatList
        key={
          activeTab === 'Gallery' ||
          activeTab === 'Photos' ||
          activeTab === 'Instagram'
            ? `grid-3-col-${activeTab}`
            : `list-1-col-${activeTab}`
        }
        data={getListData()}
        keyExtractor={item => String(item.id)}
        renderItem={renderContentItem}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        numColumns={
          activeTab === 'Gallery' ||
          activeTab === 'Photos' ||
          activeTab === 'Instagram'
            ? 3
            : 1
        }
        columnWrapperStyle={
          activeTab === 'Gallery' ||
          activeTab === 'Photos' ||
          activeTab === 'Instagram'
            ? styles.gridColumnWrapper
            : undefined
        }
        ListEmptyComponent={() => {
          const loading =
            (activeTab === 'Home' && videosLoading) ||
            (activeTab === 'Videos' && videosLoading) ||
            (activeTab === 'Posts' && postsLoading) ||
            (activeTab === 'Gallery' &&
              (galleryLoading || postsLoading || videosLoading)) ||
            (activeTab === 'Photos' && galleryLoading) ||
            (activeTab === 'Instagram' &&
              (postsLoading || videosLoading || galleryLoading)) ||
            (activeTab === 'Playlists' && playlistsLoading);
          if (loading) {
            return (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#FFAD33" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            );
          }
          if (activeTab === 'Playlists') {
            return (
              <View style={styles.loadingWrap}>
                <Text style={styles.loadingText}>No playlists yet</Text>
              </View>
            );
          }
          return (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>No data found.</Text>
            </View>
          );
        }}
      />

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

      {/* Post media preview modal (image/video) */}
      <Modal
        visible={postMediaPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPostMediaPreviewVisible(false)}
      >
        <View style={styles.previewBackdrop}>
          <TouchableOpacity
            style={styles.previewCloseBtn}
            onPress={() => setPostMediaPreviewVisible(false)}
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
        </View>
      </Modal>

      {/* Post comments modal */}
      <CommentsModal
        visible={postCommentsVisible}
        onClose={() => {
          setPostCommentsVisible(false);
          setActivePostId(null);
        }}
        user={currentUser}
        contentType="post"
        contentId={activePostId}
        totalComments={activePostCommentCount}
        onCommentAdded={() => {
          if (!activePostId) return;
          updatePostLocal(activePostId, p => ({
            ...p,
            commentCount: (p.commentCount ?? 0) + 1,
          }));
          setGalleryPostDetailItem(prev => {
            if (!prev) return prev;
            if (String(prev.originId || prev.id) !== String(activePostId)) {
              return prev;
            }
            return {
              ...prev,
              commentCount: (prev.commentCount ?? 0) + 1,
            };
          });
        }}
        onCommentDeleted={(wasTopLevel, deletedCount) => {
          if (!activePostId) return;
          const dec = deletedCount || (wasTopLevel ? 1 : 0) || 0;
          if (dec <= 0) return;
          updatePostLocal(activePostId, p => ({
            ...p,
            commentCount: Math.max(0, (p.commentCount ?? 0) - dec),
          }));
          setGalleryPostDetailItem(prev => {
            if (!prev) return prev;
            if (String(prev.originId || prev.id) !== String(activePostId)) {
              return prev;
            }
            return {
              ...prev,
              commentCount: Math.max(0, (prev.commentCount ?? 0) - dec),
            };
          });
        }}
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
        onCommentAdded={handleGalleryCommentAdded}
        onCommentDeleted={(_top, count) =>
          handleGalleryCommentAdded(null, -(count || 1))
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
        siblingItems={rawVideos}
      />

      {/* Instagram / Gallery photo preview — full screen */}
      <Modal
        visible={instagramPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setInstagramPreviewVisible(false);
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
              setInstagramPreviewVisible(false);
              setGalleryEngagePhoto(null);
              setCommentsModalGalleryPhotoId(null);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialCommunityIcons name="close" size={24} color="#fff" />
          </TouchableOpacity>
          <View style={styles.galleryPhotoModalMediaWrap}>
            {instagramPreviewItem?.mediaUrl ? (
              instagramPreviewItem.mediaType === 'video' ? (
                <Video
                  source={{ uri: instagramPreviewItem.mediaUrl }}
                  style={styles.galleryPhotoModalMediaFill}
                  controls
                  paused={false}
                  repeat
                  resizeMode="contain"
                  ignoreSilentSwitch="ignore"
                />
              ) : (
                <Image
                  source={{ uri: instagramPreviewItem.mediaUrl }}
                  style={styles.galleryPhotoModalMediaFill}
                  resizeMode="contain"
                />
              )
            ) : null}
          </View>
            {String(instagramPreviewItem?.sourceType || '').toLowerCase() ===
            'gallery' ? (
              <View style={styles.uvIgEngageCard}>
                <Text style={styles.instagramPreviewMetaType}>Photo</Text>
                <Text style={styles.galleryEngageMetaSub}>
                  {instagramPreviewItem?.subtitle || 'Recently'}
                </Text>
                <View style={styles.galleryEngageRowSingle}>
                  <TouchableOpacity
                    style={styles.galleryEngageCell}
                    onPress={handleGalleryEngageLike}
                  >
                    <MaterialCommunityIcons
                      name={
                        (galleryEngagePhoto?.isLiked ??
                          instagramPreviewItem?.isLiked)
                          ? 'thumb-up'
                          : 'thumb-up-outline'
                      }
                      size={18}
                      color={
                        galleryEngagePhoto?.isLiked ??
                        instagramPreviewItem?.isLiked
                          ? '#FF7F0B'
                          : '#333'
                      }
                    />
                    <Text style={styles.galleryEngageCellLabel} numberOfLines={1}>
                      {formatCount(
                        galleryEngagePhoto?.likeCount ??
                          instagramPreviewItem?.likeCount ??
                          0,
                      )}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.galleryEngageCell}
                    onPress={handleGalleryEngageDislike}
                  >
                    <MaterialCommunityIcons
                      name={
                        (galleryEngagePhoto?.isDisliked ??
                          instagramPreviewItem?.isDisliked)
                          ? 'thumb-down'
                          : 'thumb-down-outline'
                      }
                      size={18}
                      color={
                        galleryEngagePhoto?.isDisliked ??
                        instagramPreviewItem?.isDisliked
                          ? '#FF7F0B'
                          : '#333'
                      }
                    />
                    <Text style={styles.galleryEngageCellLabel} numberOfLines={1}>
                      {formatCount(
                        galleryEngagePhoto?.dislikeCount ??
                          instagramPreviewItem?.dislikeCount ??
                          0,
                      )}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.galleryEngageCell}
                    onPress={openGalleryPhotoCommentsModal}
                  >
                    <MaterialCommunityIcons
                      name="comment-text-outline"
                      size={18}
                      color="#333"
                    />
                    <Text style={styles.galleryEngageCellLabel} numberOfLines={1}>
                      {formatCount(
                        galleryEngagePhoto?.commentCount ??
                          instagramPreviewItem?.commentCount ??
                          0,
                      )}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.galleryEngageCell}
                    onPress={handleGalleryEngageShare}
                  >
                    <MaterialCommunityIcons
                      name="share-outline"
                      size={18}
                      color="#333"
                    />
                    <Text style={styles.galleryEngageCellLabel} numberOfLines={1}>
                      {formatCount(
                        galleryEngagePhoto?.shareCount ??
                          instagramPreviewItem?.shareCount ??
                          0,
                      )}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.galleryPhotoModalPostMeta}>
                <Text style={styles.instagramPreviewMetaType}>
                  {instagramPreviewItem?.sourceType || ''}
                </Text>
                <Text style={styles.galleryPhotoModalPostTitle} numberOfLines={2}>
                  {instagramPreviewItem?.title || 'Post'}
                </Text>
                <Text style={styles.galleryPhotoModalPostSub} numberOfLines={1}>
                  {instagramPreviewItem?.subtitle || 'Recently'}
                </Text>
              </View>
            )}
        </SafeAreaView>
      </Modal>

      {/* Gallery post details modal (1st modal) */}
      <Modal
        visible={galleryPostDetailVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGalleryPostDetailVisible(false)}
      >
        <View style={styles.previewBackdrop}>
          <TouchableOpacity
            style={styles.previewCloseBtn}
            onPress={() => setGalleryPostDetailVisible(false)}
          >
            <MaterialCommunityIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <View style={styles.galleryPostDetailCard}>
            <ScrollView
              style={styles.galleryPostDetailScroll}
              contentContainerStyle={styles.galleryPostDetailContent}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.galleryPostDetailType}>Post</Text>
              <Text style={styles.galleryPostDetailTitle}>
                {selectedGalleryPost?.title ||
                  galleryPostDetailItem?.title ||
                  'Post'}
              </Text>
              {selectedGalleryPost?.description ||
              galleryPostDetailItem?.description ? (
                <Text style={styles.galleryPostDetailDesc}>
                  {selectedGalleryPost?.description ||
                    galleryPostDetailItem?.description}
                </Text>
              ) : null}

              <TouchableOpacity
                activeOpacity={0.9}
                style={styles.galleryPostMediaWrap}
                onPress={() => {
                  if (
                    String(
                      selectedGalleryPost?.mediaType ||
                        galleryPostDetailItem?.mediaType ||
                        '',
                    ).toLowerCase() === 'video'
                  ) {
                    setGalleryPostVideoVisible(true);
                  } else {
                    setGalleryPostImageVisible(true);
                  }
                }}
              >
                {String(
                  selectedGalleryPost?.mediaType ||
                    galleryPostDetailItem?.mediaType ||
                    '',
                ).toLowerCase() === 'video' ? (
                  <>
                    <Image
                      source={{
                        uri:
                          selectedGalleryPost?.thumbnail ||
                          galleryPostDetailItem?.thumbnail,
                      }}
                      style={styles.galleryPostDetailMedia}
                      resizeMode="cover"
                    />
                    <View style={styles.galleryPostPlayBadge}>
                      <MaterialCommunityIcons
                        name="play-circle"
                        size={48}
                        color="#fff"
                      />
                    </View>
                  </>
                ) : (
                  <Image
                    source={{
                      uri:
                        selectedGalleryPost?.mediaUrl ||
                        galleryPostDetailItem?.mediaUrl,
                    }}
                    style={styles.galleryPostDetailMedia}
                    resizeMode="cover"
                  />
                )}
              </TouchableOpacity>

              <View style={styles.galleryPostActionsRow}>
                <TouchableOpacity
                  style={styles.galleryPostActionBtn}
                  onPress={() =>
                    selectedGalleryPost && handlePostLike(selectedGalleryPost)
                  }
                >
                  <MaterialCommunityIcons
                    name={
                      selectedGalleryPost?.isLiked
                        ? 'thumb-up'
                        : 'thumb-up-outline'
                    }
                    size={20}
                    color={selectedGalleryPost?.isLiked ? '#FF7F0B' : '#333'}
                  />
                  <Text style={styles.galleryPostActionText}>
                    {formatCount(selectedGalleryPost?.likeCount ?? 0)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.galleryPostActionBtn}
                  onPress={() =>
                    selectedGalleryPost &&
                    handlePostDislike(selectedGalleryPost)
                  }
                >
                  <MaterialCommunityIcons
                    name={
                      selectedGalleryPost?.isDisliked
                        ? 'thumb-down'
                        : 'thumb-down-outline'
                    }
                    size={20}
                    color={selectedGalleryPost?.isDisliked ? '#FF7F0B' : '#333'}
                  />
                  <Text style={styles.galleryPostActionText}>
                    {formatCount(selectedGalleryPost?.dislikeCount ?? 0)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.galleryPostActionBtn}
                  onPress={() =>
                    selectedGalleryPost && openPostComments(selectedGalleryPost)
                  }
                >
                  <MaterialCommunityIcons
                    name="comment-text-outline"
                    size={20}
                    color="#333"
                  />
                  <Text style={styles.galleryPostActionText}>
                    {formatCount(selectedGalleryPost?.commentCount ?? 0)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.galleryPostActionBtn}
                  onPress={() =>
                    selectedGalleryPost && handlePostShare(selectedGalleryPost)
                  }
                >
                  <MaterialCommunityIcons
                    name="share-outline"
                    size={20}
                    color="#333"
                  />
                  <Text style={styles.galleryPostActionText}>
                    {formatCount(selectedGalleryPost?.shareCount ?? 0)}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Gallery post video player modal (2nd modal) */}
      <Modal
        visible={galleryPostVideoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGalleryPostVideoVisible(false)}
      >
        <View style={styles.previewBackdrop}>
          <TouchableOpacity
            style={styles.previewCloseBtn}
            onPress={() => setGalleryPostVideoVisible(false)}
          >
            <MaterialCommunityIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {selectedGalleryPost?.mediaUrl || galleryPostDetailItem?.mediaUrl ? (
            <Video
              source={{
                uri:
                  selectedGalleryPost?.mediaUrl ||
                  galleryPostDetailItem?.mediaUrl,
              }}
              style={styles.previewVideo}
              controls
              paused={false}
              repeat
              resizeMode="contain"
              ignoreSilentSwitch="ignore"
            />
          ) : null}
        </View>
      </Modal>

      {/* Gallery post image viewer modal (2nd modal for image) */}
      <Modal
        visible={galleryPostImageVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setGalleryPostImageVisible(false)}
      >
        <View style={styles.previewBackdrop}>
          <TouchableOpacity
            style={styles.previewCloseBtn}
            onPress={() => setGalleryPostImageVisible(false)}
          >
            <MaterialCommunityIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {selectedGalleryPost?.mediaUrl || galleryPostDetailItem?.mediaUrl ? (
            <Image
              source={{
                uri:
                  selectedGalleryPost?.mediaUrl ||
                  galleryPostDetailItem?.mediaUrl,
              }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>

      {/* Video quick-view modal (from UserViewsScreen) */}
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
                  source={{
                    uri: safeImageUri(modalVideo?.channelAvatar),
                  }}
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
            </View>

            <View style={styles.contactRow}>
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingBottom: 20,
  },
  homeDetailsWrap: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  homeSection: {
    marginBottom: 18,
  },
  homeSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#212121',
    marginBottom: 8,
  },
  homeSectionText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#666',
    marginBottom: 6,
  },
  phoneText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#424242',
    marginBottom: 6,
    fontWeight: '400',
  },
  aboutText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#424242',
    marginBottom: 6,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#EEEEEE',
  },

  mapCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
  },
  mapTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111',
    marginBottom: 10,
  },
  mapPlaceholder: {
    height: 130,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FFE6CC',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 8,
  },
  mapText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  mapOpenBtn: {
    marginTop: 10,
    backgroundColor: '#FFAD33',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  mapOpenText: {
    color: '#fff',
    fontWeight: '800',
    fontSize: 12,
  },
  hoursHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  hoursHeaderText: {
    fontSize: 12,
    color: '#777',
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
  },
  hoursCellDay: {
    fontSize: 13,
    color: '#777',
  },
  hoursCell: {
    fontSize: 12,
    color: '#777',
  },
  headerContainer: {
    paddingBottom: 0,
  },
  profileSocialRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 14,
    paddingTop: 10,
    paddingBottom: 6,
  },
  profileSocialBtn: {
    width: 30,
    height: 30,
    borderRadius: 17,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  profileSocialBtnDisabled: {
    backgroundColor: '#FAFAFA',
    borderColor: '#F0F0F0',
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
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Distribute evenly
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginVertical: 5,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 50,
    alignItems: 'center',
  },
  activeTabItem: {
    borderBottomWidth: 3,
    borderBottomColor: '#FFAD33', // Orange active border
  },
  gridTabItem: {
    paddingBottom: 8, // slight adjustment for icon centering
  },
  tabText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFAD33',
    fontWeight: '600',
  },
  gridColumnWrapper: {
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    gap: 8,
  },
  gridImageContainer: {
    width: (width - 32 - 16) / 3, // Full width minus horizontal padding (16*2) minus inner gaps (8*2)
    aspectRatio: 0.8, // Slightly taller than square exactly as done before
    marginBottom: 8,
  },
  instaGridImageContainer: {
    width: (width - 32 - 16) / 3,
    aspectRatio: 1.05,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  instaVideoBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingWrap: { paddingVertical: 30, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  emptyState: { padding: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  emptyText: { marginTop: 6, color: '#666' },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
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
  galleryPhotoModalPostMeta: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#1c1c1c',
  },
  galleryPhotoModalPostTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
  },
  galleryPhotoModalPostSub: {
    color: 'rgba(255,255,255,0.72)',
    fontSize: 12,
    marginTop: 4,
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
  uvIgEngageScroll: {
    flex: 1,
    width: '100%',
  },
  uvIgEngageScrollContent: {
    flexGrow: 1,
    paddingBottom: 28,
    alignItems: 'center',
    width: '100%',
  },
  uvIgEngageImage: {
    width: Dimensions.get('window').width,
    maxHeight: Dimensions.get('window').height * 0.62,
    minHeight: 220,
  },
  uvIgEngageCard: {
    width: '100%',
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 18,
    backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ececec',
  },
  galleryEngageMetaSub: {
    color: '#666',
    fontSize: 12,
    marginTop: 2,
    marginBottom: 4,
  },
  galleryEngageRowSingle: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    flexWrap: 'nowrap',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    paddingTop: 10,
  },
  galleryEngageCell: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  galleryEngageCellLabel: {
    fontSize: 10,
    marginTop: 4,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  instagramPreviewMeta: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  instagramPreviewMetaType: {
    color: '#FFAD33',
    fontSize: 11,
    textTransform: 'capitalize',
    fontWeight: '700',
    marginBottom: 4,
  },
  instagramPreviewMetaTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  instagramPreviewMetaSub: {
    color: '#ddd',
    fontSize: 12,
    marginTop: 2,
  },
  galleryPostDetailCard: {
    width: '90%',
    maxHeight: '82%',
    backgroundColor: '#fff',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  galleryPostDetailScroll: {
    flexGrow: 0,
  },
  galleryPostDetailContent: {
    paddingBottom: 8,
  },
  galleryPostDetailType: {
    color: '#FFAD33',
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },
  galleryPostDetailTitle: {
    color: '#111',
    fontSize: 16,
    fontWeight: '800',
  },
  galleryPostDetailDesc: {
    color: '#444',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  galleryPostMediaWrap: {
    marginTop: 12,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#111',
    aspectRatio: 1.1,
  },
  galleryPostDetailMedia: {
    width: '100%',
    height: '100%',
  },
  galleryPostPlayBadge: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  galleryPostActionsRow: {
    marginTop: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  galleryPostActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  galleryPostActionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
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

export default UserViewsScreen;
