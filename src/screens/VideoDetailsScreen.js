import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Image,
  TouchableOpacity,
  Pressable,
  Dimensions,
  StatusBar,
  TextInput,
  Share,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import VideoCard from '../components/VideoCard';
import DescriptionModal from '../components/DescriptionModal';
import SaveModal from '../components/SaveModal';
import CommentsModal from '../components/CommentsModal';
import LiveChatModal from '../components/LiveChatModal';
import ProductDetailModal from '../components/ProductDetailModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Video from 'react-native-video';
import Slider from '@react-native-community/slider';
import {
  getVideoById,
  getVideos,
  recordView,
  toggleLike,
  toggleDislike,
  recordShare,
  addComment,
  getComments,
} from '../services/videoService';
import {
  getChannelProfile,
  subscribeToChannel,
  unsubscribeFromChannel,
} from '../services/channelService';
import {
  downloadVideo,
  isVideoDownloaded,
  getLocalPath,
} from '../services/downloadService';
import { config } from '../../config';
import { getSocialIcon } from '../constants/socialLinks';

const { width } = Dimensions.get('window');

const formatCount = n => {
  if (!n || n < 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

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

const formatPublishedDate = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

const mapVideoApiToDisplay = v => {
  const user = v.user || {};
  const viewCount = v.viewCount ?? v._count?.views ?? 0;
  const likeCount = v.likeCount ?? v._count?.likes ?? 0;
  const dislikeCount = v.dislikeCount ?? 0;
  const commentCount = v.commentCount ?? v._count?.comments ?? 0;
  const topLevelCommentCount = v.topLevelCommentCount ?? commentCount;
  const shareCount = v.shareCount ?? 0;
  const pubAt = v.publishedAt || v.createdAt;
  const channelName = user.nickname || user.name || 'Unknown';
  const channelAvatar =
    user.photos?.[0] ||
    (Array.isArray(user.photos) && user.photos[0]) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      channelName,
    )}&background=111&color=fff`;
  return {
    id: v.id,
    title: v.title || 'Untitled',
    channelName,
    channelAvatar,
    views: `${formatCount(viewCount)} views`,
    viewCount,
    likeCount,
    dislikeCount,
    commentCount,
    topLevelCommentCount,
    shareCount,
    publishedAt: formatTimeAgo(pubAt),
    publishedDate: formatPublishedDate(pubAt),
    thumbnail:
      v.thumbnailUrl || v.videoUrl || 'https://via.placeholder.com/300',
    videoUrl: v.videoUrl,
    duration: formatDuration(v.duration),
    durationSeconds: v.duration,
    description: v.description || '',
    tags: Array.isArray(v.tags) ? v.tags : [],
    userId: v.userId,
    isLiked: v.isLiked ?? false,
    isDisliked: v.isDisliked ?? false,
    creatorAddress: user.address ?? undefined,
    creatorLatitude: user.latitude ?? undefined,
    creatorLongitude: user.longitude ?? undefined,
    creatorSocialLinks: Array.isArray(user.socialLinks) ? user.socialLinks : [],
    creatorRole: user.role ?? undefined,
  };
};

const ActionButton = ({ icon, label, onPress, disabled }) => (
  <TouchableOpacity
    style={[styles.actionButton, disabled && { opacity: 0.5 }]}
    onPress={onPress}
    disabled={disabled}
  >
    <MaterialCommunityIcons name={icon} size={24} color="#212121" />
    <Text style={styles.actionText}>{label}</Text>
  </TouchableOpacity>
);

const VideoDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector(state => state?.app?.user);
  const videoId = route.params?.videoId;
  const offlineVideo = route.params?.offlineVideo;

  const [currentVideo, setCurrentVideo] = useState(null);
  const [relatedVideos, setRelatedVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [channelSubscription, setChannelSubscription] = useState({
    isSubscribed: false,
    subscriberCount: 0,
  });
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [liveChatModalVisible, setLiveChatModalVisible] = useState(false);
  const [productDetailModalVisible, setProductDetailModalVisible] =
    useState(false);

  // Video player states
  const [videoPaused, setVideoPaused] = useState(true);
  const [videoProgress, setVideoProgress] = useState({
    currentTime: 0,
    duration: 0,
  });
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [videoReady, setVideoReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const progressUpdateRef = useRef(0);
  const lastBufferRef = useRef(null);
  const videoRef = useRef(null);
  const isSeekingRef = useRef(false);
  const [isSliding, setIsSliding] = useState(false);
  const [slidingValue, setSlidingValue] = useState(0);

  const [downloadProgress, setDownloadProgress] = useState(null);
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [videoPlaybackUri, setVideoPlaybackUri] = useState(null);


  const loadVideo = useCallback(async () => {
    if (!videoId && !offlineVideo) {
      setError('No video selected');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);

      if (offlineVideo) {
        const video = {
          id: offlineVideo.id,
          title: offlineVideo.title || 'Untitled',
          channelName: offlineVideo.channelName || 'Unknown',
          channelAvatar: null,
          views: 'Offline',
          viewCount: 0,
          likeCount: 0,
          dislikeCount: 0,
          commentCount: 0,
          topLevelCommentCount: 0,
          shareCount: 0,
          publishedAt: 'Downloaded',
          publishedDate: '',
          thumbnail: offlineVideo.thumbnail,
          videoUrl: null,
          duration: offlineVideo.duration || '0:00',
          durationSeconds: 0,
          description: '',
          tags: [],
          userId: null,
          isLiked: false,
          isDisliked: false,
        };
        setCurrentVideo(video);
        setVideoPlaybackUri(offlineVideo.localPath);
        setIsDownloaded(true);
        setRelatedVideos([]);
      } else {
        const [videoRes, videosRes] = await Promise.all([
          getVideoById(videoId, user?.id, user?.role),
          getVideos({ page: 1, limit: 10, viewerRole: user?.role || 'user' }),
        ]);
        const video = mapVideoApiToDisplay(videoRes);
        setCurrentVideo(video);
        setVideoPlaybackUri(null);
        const downloaded = await isVideoDownloaded(videoId);
        setIsDownloaded(downloaded);
        if (downloaded) {
          const localPath = await getLocalPath(videoId);
          setVideoPlaybackUri(localPath || video.videoUrl);
        } else {
          setVideoPlaybackUri(video.videoUrl);
        }
        const others = (videosRes?.videos || [])
          .filter(v => v.id !== videoId)
          .map(mapVideoApiToDisplay);
        setRelatedVideos(others);
        if (video?.userId) {
          getChannelProfile(video.userId, user?.id)
            .then(profile => {
              setChannelSubscription({
                isSubscribed: profile.isSubscribed ?? false,
                subscriberCount: profile.subscriberCount ?? 0,
              });
            })
            .catch(() => {});
        }
      }
      // Reset video player states
      setVideoPaused(true);
      setVideoProgress({ currentTime: 0, duration: 0 });
      setVideoLoading(false);
      setVideoError(null);
      setVideoReady(false);
      setIsBuffering(false);
      setRetryCount(0);
      lastBufferRef.current = null;
      progressUpdateRef.current = 0;
      isSeekingRef.current = false;
      setIsSliding(false);
      if (!offlineVideo && videoId) {
        recordView(videoId, user?.id).then(() => {
          setCurrentVideo(prev =>
            prev ? { ...prev, viewCount: prev.viewCount + 1 } : null,
          );
        });
      }
    } catch (e) {
      setError(
        e?.response?.data?.message || e?.message || 'Failed to load video',
      );
      setCurrentVideo(null);
      setRelatedVideos([]);
      setChannelSubscription({ isSubscribed: false, subscriberCount: 0 });
    } finally {
      setLoading(false);
    }
  }, [videoId, offlineVideo, user?.id]);

  useEffect(() => {
    loadVideo();
  }, [loadVideo]);

  const handleSubscribe = async () => {
    if (!user?.id) {
      navigation.navigate('Login');
      return;
    }
    if (!currentVideo?.userId) return;
    if (currentVideo.userId === user.id) return; // own channel
    setSubscribeLoading(true);
    try {
      const isSub = channelSubscription.isSubscribed;
      if (isSub) {
        await unsubscribeFromChannel(user.id, currentVideo.userId);
        setChannelSubscription(prev => ({
          ...prev,
          isSubscribed: false,
          subscriberCount: Math.max(0, prev.subscriberCount - 1),
        }));
      } else {
        await subscribeToChannel(user.id, currentVideo.userId);
        setChannelSubscription(prev => ({
          ...prev,
          isSubscribed: true,
          subscriberCount: prev.subscriberCount + 1,
        }));
      }
    } catch (e) {
      console.error('Subscribe error:', e);
    } finally {
      setSubscribeLoading(false);
    }
  };

  const handleLike = async () => {
    if (!user?.id) {
      navigation.navigate('Login');
      return;
    }
    if (!currentVideo) return;
    try {
      await toggleLike(currentVideo.id, user.id);
      setCurrentVideo(prev => {
        if (!prev) return prev;
        const unliking = prev.isLiked;
        return {
          ...prev,
          isLiked: !unliking,
          isDisliked: unliking ? prev.isDisliked : false,
          likeCount: prev.likeCount + (unliking ? -1 : 1),
          dislikeCount:
            !unliking && prev.isDisliked
              ? prev.dislikeCount - 1
              : prev.dislikeCount,
        };
      });
    } catch {}
  };

  const handleDislike = async () => {
    if (!user?.id) {
      navigation.navigate('Login');
      return;
    }
    if (!currentVideo) return;
    try {
      await toggleDislike(currentVideo.id, user.id);
      setCurrentVideo(prev => {
        if (!prev) return prev;
        const undisliking = prev.isDisliked;
        return {
          ...prev,
          isDisliked: !undisliking,
          isLiked: undisliking ? prev.isLiked : false,
          dislikeCount: prev.dislikeCount + (undisliking ? -1 : 1),
          likeCount:
            !undisliking && prev.isLiked ? prev.likeCount - 1 : prev.likeCount,
        };
      });
    } catch {}
  };

  const handleDownload = async () => {
    if (!currentVideo) return;
    if (isDownloaded) {
      Alert.alert(
        'Already downloaded',
        'This video is available for offline playback.',
      );
      return;
    }
    setDownloadProgress(0);
    try {
      await downloadVideo(
        {
          id: currentVideo.id,
          title: currentVideo.title,
          videoUrl: currentVideo.videoUrl,
          thumbnail: currentVideo.thumbnail,
          channelName: currentVideo.channelName,
          duration: currentVideo.duration,
        },
        pct => setDownloadProgress(pct),
      );
      setDownloadProgress(null);
      setIsDownloaded(true);
      const localPath = await getLocalPath(currentVideo.id);
      setVideoPlaybackUri(localPath);
      Alert.alert('Downloaded', 'Video is now available for offline playback.');
    } catch (e) {
      setDownloadProgress(null);
      Alert.alert('Download failed', e?.message || 'Could not download video.');
    }
  };

  const onShare = async () => {
    if (!user?.id) {
      navigation.navigate('Login');
      return;
    }
    if (!currentVideo) return;
    try {
      recordShare(currentVideo.id);
      setCurrentVideo(prev =>
        prev ? { ...prev, shareCount: prev.shareCount + 1 } : null,
      );
      await Share.share({
        message: `Check out this video: ${currentVideo.title}`,
        url: currentVideo.videoUrl || '',
        title: currentVideo.title,
      });
    } catch (error) {
      Alert.alert(error?.message || 'Share failed');
    }
  };

  // Video player handlers - throttled to prevent re-render loops / Video remounts
  const handleVideoLoadStart = useCallback(() => {
    setVideoLoading(true);
    setVideoError(null);
    setIsBuffering(true);
  }, []);

  const handleVideoLoad = useCallback(data => {
    setVideoLoading(false);
    setVideoReady(true);
    setIsBuffering(false);
    setVideoProgress(p => ({ ...p, duration: data.duration || 0 }));
    setVideoPaused(false); // Autoplay when video is loaded
  }, []);

  const handleVideoProgress = useCallback(data => {
    if (data.currentTime === undefined) return;
    if (isSeekingRef.current) return;
    const now = Date.now();
    if (now - progressUpdateRef.current < 500) return;
    progressUpdateRef.current = now;
    setVideoProgress(p => ({
      currentTime: data.currentTime,
      duration: data.seekableDuration || data.duration || p.duration,
    }));
  }, []);

  const handleVideoBuffer = useCallback(data => {
    const buf = data.isBuffering || false;
    if (lastBufferRef.current === buf) return;
    lastBufferRef.current = buf;
    setIsBuffering(buf);
  }, []);

  const handleVideoError = useCallback(error => {
    setVideoLoading(false);
    setVideoReady(false);
    const errorMessage =
      error?.error?.localizedDescription ||
      error?.errorString ||
      'Failed to play video. The video format may not be supported or the URL is inaccessible.';
    setVideoError(errorMessage);
  }, []);

  const handleVideoReady = useCallback(() => {
    setVideoReady(true);
    setVideoLoading(false);
    setVideoPaused(false); // Autoplay when first frame is ready
  }, []);

  const handleRetryVideo = () => {
    setVideoError(null);
    setVideoLoading(true);
    setRetryCount(prev => prev + 1);
    // Force video to reload by toggling pause
    setVideoPaused(true);
    setTimeout(() => {
      setVideoPaused(false);
      setVideoPaused(true);
    }, 100);
  };

  const handleSeek = useCallback(
    seconds => {
      if (!videoRef.current || videoProgress.duration <= 0) return;
      const clamped = Math.max(0, Math.min(seconds, videoProgress.duration));
      isSeekingRef.current = true;
      videoRef.current.seek(clamped);
      setVideoProgress(p => ({ ...p, currentTime: clamped }));
      progressUpdateRef.current = Date.now();
      setTimeout(() => {
        isSeekingRef.current = false;
      }, 300);
    },
    [videoProgress.duration],
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#F97507" />
        <Text style={styles.loadingText}>Loading video...</Text>
      </View>
    );
  }

  if (error || !currentVideo) {
    return (
      <View style={[styles.container, styles.centered]}>
        <MaterialCommunityIcons
          name="video-off-outline"
          size={64}
          color="#999"
        />
        <Text style={styles.errorText}>{error || 'Video not found'}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.retryButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const formatTime = sec => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const displayTime = isSliding ? slidingValue : videoProgress.currentTime;
  const progressPct =
    videoProgress.duration > 0
      ? (displayTime / videoProgress.duration) * 100
      : 0;

  const togglePlayPause = () => {
    if (videoError) {
      handleRetryVideo();
      return;
    }
    setVideoPaused(p => !p);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.videoPlayer}>
        {currentVideo.videoUrl || videoPlaybackUri ? (
          <>
            <Video
              ref={videoRef}
              key={`video-${videoId}-${retryCount}`}
              source={{ uri: videoPlaybackUri || currentVideo.videoUrl }}
              poster={currentVideo.thumbnail}
              posterResizeMode="cover"
              style={styles.videoPlayerContent}
              resizeMode="contain"
              paused={videoPaused}
              repeat={false}
              controls={false}
              playInBackground={false}
              playWhenInactive={false}
              ignoreSilentSwitch="ignore"
              onLoadStart={handleVideoLoadStart}
              onLoad={handleVideoLoad}
              onProgress={handleVideoProgress}
              onBuffer={handleVideoBuffer}
              onError={handleVideoError}
              onReadyForDisplay={handleVideoReady}
            />
            {/* Loading indicator overlay */}
            {(videoLoading || isBuffering) && !videoError && (
              <View style={styles.loadingOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.loadingOverlayText}>
                  {videoLoading ? 'Loading video...' : 'Buffering...'}
                </Text>
              </View>
            )}
            {/* Error overlay */}
            {videoError && (
              <View style={styles.errorOverlay}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={48}
                  color="#fff"
                />
                <Text style={styles.errorOverlayText}>{videoError}</Text>
                <TouchableOpacity
                  style={styles.retryVideoButton}
                  onPress={handleRetryVideo}
                >
                  <MaterialCommunityIcons
                    name="refresh"
                    size={20}
                    color="#fff"
                  />
                  <Text style={styles.retryVideoText}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : (
          <Image
            source={{ uri: currentVideo.thumbnail }}
            style={styles.videoThumbnail}
          />
        )}
        <Pressable style={styles.videoOverlay} onPress={togglePlayPause}>
          <View style={styles.videoControlsTop} pointerEvents="box-none">
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <MaterialCommunityIcons
                name="chevron-down"
                size={32}
                color="#fff"
              />
            </TouchableOpacity>
            <View style={styles.topRightControls}>
              <MaterialCommunityIcons
                name="cast"
                size={24}
                color="#fff"
                style={styles.iconSpacing}
              />
              <MaterialCommunityIcons
                name="closed-caption"
                size={24}
                color="#fff"
                style={styles.iconSpacing}
              />
              <MaterialCommunityIcons name="cog" size={24} color="#fff" />
            </View>
          </View>
          {/* Only show play button when not loading and no error */}
          {!videoLoading && !isBuffering && !videoError && (
            <TouchableOpacity
              style={styles.playIconTouchable}
              onPress={togglePlayPause}
              activeOpacity={1}
              hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            >
              <MaterialCommunityIcons
                name={
                  videoPaused ? 'play-circle-outline' : 'pause-circle-outline'
                }
                size={72}
                color="rgba(255,255,255,0.95)"
                style={styles.playIcon}
              />
            </TouchableOpacity>
          )}
          <View
            style={styles.progressBarContainer}
            onStartShouldSetResponder={() => true}
            onResponderTerminationRequest={() => false}
          >
            <Slider
              style={styles.progressSlider}
              value={displayTime}
              minimumValue={0}
              maximumValue={Math.max(0.1, videoProgress.duration)}
              minimumTrackTintColor="#fff"
              maximumTrackTintColor="rgba(255,255,255,0.4)"
              thumbTintColor="#fff"
              onSlidingStart={() => {
                setIsSliding(true);
                setSlidingValue(videoProgress.currentTime);
              }}
              onValueChange={val => setSlidingValue(val)}
              onSlidingComplete={val => {
                handleSeek(val);
                setIsSliding(false);
              }}
            />
            <Text style={styles.timeText}>
              {formatTime(displayTime)} /{' '}
              {formatTime(videoProgress.duration) || currentVideo.duration}
            </Text>
            <MaterialCommunityIcons
              name="fullscreen"
              size={24}
              color="#fff"
              style={{ marginLeft: 8 }}
            />
          </View>
        </Pressable>
      </View>

      <View style={styles.infoContainer}>
        {/* Title */}
        <View style={styles.titleRow}>
          <Text style={styles.videoTitle}>{currentVideo.title}</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <MaterialCommunityIcons
              name="chevron-down"
              size={24}
              color="#212121"
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.viewCount}>
          {currentVideo.views} • {currentVideo.publishedAt}
        </Text>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <ActionButton
            icon={currentVideo.isLiked ? 'thumb-up' : 'thumb-up-outline'}
            label={formatCount(currentVideo.likeCount)}
            onPress={handleLike}
          />
          <ActionButton
            icon={currentVideo.isDisliked ? 'thumb-down' : 'thumb-down-outline'}
            label={formatCount(currentVideo.dislikeCount)}
            onPress={handleDislike}
          />
          <ActionButton
            icon="comment-text-outline"
            label={formatCount(
              currentVideo.topLevelCommentCount ?? currentVideo.commentCount,
            )}
            onPress={() => {
              if (!user?.id) {
                navigation.navigate('Login');
                return;
              }
              setCommentsModalVisible(true);
            }}
          />
          <ActionButton icon="share-outline" label="Share" onPress={onShare} />
          <ActionButton
            icon={isDownloaded ? 'check-circle' : 'download-outline'}
            label={
              downloadProgress !== null
                ? `${downloadProgress}%`
                : isDownloaded
                ? 'Downloaded'
                : 'Download'
            }
            onPress={handleDownload}
            disabled={downloadProgress !== null}
          />
          <ActionButton
            icon="plus-box-outline"
            label="Save"
            onPress={() => {
              if (!user?.id) {
                navigation.navigate('Login');
                return;
              }
              setSaveModalVisible(true);
            }}
          />
        </View>

        {/* Order Now / Visit Website / Message Now – owner (restaurant) or vendor (owner/admin can order from vendor) */}
        {((currentVideo?.user?.role === 'owner' || currentVideo?.creatorRole === 'owner') ||
          (currentVideo?.user?.role === 'vendor' || currentVideo?.creatorRole === 'vendor')) && (
          <View style={styles.ctaButtonsRow}>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => setProductDetailModalVisible(true)}
            >
              <Text style={styles.ctaButtonText}>Order Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => {
                // Visit Website - open creator website if available, else channel
                const website = currentVideo.creatorSocialLinks
                  ?.find(
                    l =>
                      (l?.type || '').toLowerCase() === 'website' &&
                      (l?.url || '').trim(),
                  )
                  ?.url?.trim();
                if (website) {
                  Linking.openURL(
                    website.startsWith('http') ? website : `https://${website}`,
                  );
                } else if (currentVideo.userId) {
                  navigation.navigate('Library', {
                    screen: 'ChannelDetailsScreen',
                    params: { userId: currentVideo.userId },
                  });
                }
              }}
            >
              <Text style={styles.ctaButtonText}>Visit Website</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.ctaButton}
              onPress={() => {
                // Message Now - open chat with channel / restaurant owner
                if (currentVideo.userId) {
                  navigation.navigate('ChatScreen', {
                    partnerId: currentVideo.userId,
                    partnerName: currentVideo.channelName || 'Channel',
                    partnerAvatar: currentVideo.channelAvatar,
                  });
                }
              }}
            >
              <Text style={styles.ctaButtonText}>Message Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Channel Info */}
        <View style={styles.channelRow}>
          <TouchableOpacity
            style={styles.channelInfo}
            onPress={() =>
              navigation.navigate('Library', {
                screen: 'ChannelDetailsScreen',
                params: { userId: currentVideo.userId },
              })
            }
            activeOpacity={0.7}
          >
            <Image
              source={{ uri: currentVideo.channelAvatar }}
              style={styles.channelAvatar}
            />
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.channelName}>
                  {currentVideo.channelName}
                </Text>
                <MaterialCommunityIcons
                  name="check-decagram"
                  size={12}
                  color="#3ea6ff"
                  style={{ marginLeft: 4 }}
                />
              </View>
              <Text style={styles.subscriberCount}>
                {channelSubscription.subscriberCount > 0
                  ? `${formatCount(
                      channelSubscription.subscriberCount,
                    )} subscribers`
                  : `${formatCount(currentVideo.viewCount)} views`}
              </Text>
            </View>
          </TouchableOpacity>
          {currentVideo.userId !== user?.id && user?.id ? (
            <TouchableOpacity
              style={[
                styles.subscribeButton,
                channelSubscription.isSubscribed && styles.subscribedButton,
              ]}
              onPress={handleSubscribe}
              disabled={subscribeLoading}
            >
              {subscribeLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.subscribeText,
                    channelSubscription.isSubscribed && styles.subscribedText,
                  ]}
                >
                  {channelSubscription.isSubscribed
                    ? 'Subscribed'
                    : 'Subscribe'}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Creator social links */}
        {currentVideo.creatorSocialLinks?.length > 0 &&
          currentVideo.creatorSocialLinks.filter(l => (l?.url || '').trim())
            .length > 0 && (
            <View style={styles.creatorSocialRow}>
              {currentVideo.creatorSocialLinks
                .filter(l => (l?.url || '').trim())
                .map((link, index) => (
                  <TouchableOpacity
                    key={`creator-${link.type}-${index}`}
                    style={styles.creatorSocialIconBtn}
                    onPress={() => {
                      const url = (link.url || '').trim();
                      if (url)
                        Linking.openURL(
                          url.startsWith('http') ? url : `https://${url}`,
                        );
                    }}
                  >
                    <MaterialCommunityIcons
                      name={getSocialIcon(link.type)}
                      size={24}
                      color="#F97507"
                    />
                  </TouchableOpacity>
                ))}
            </View>
          )}

        {/* Creator location map */}
        {currentVideo.creatorLatitude != null &&
          currentVideo.creatorLongitude != null && (
            <View style={styles.creatorLocationSection}>
              <Text style={styles.creatorLocationTitle}>Creator location</Text>
              {currentVideo.creatorAddress ? (
                <Text style={styles.creatorAddress}>
                  {currentVideo.creatorAddress}
                </Text>
              ) : null}
              <Image
                source={{
                  uri: `https://maps.googleapis.com/maps/api/staticmap?center=${
                    currentVideo.creatorLatitude
                  },${currentVideo.creatorLongitude}&zoom=14&size=${
                    width - 32
                  }x120&markers=${currentVideo.creatorLatitude},${
                    currentVideo.creatorLongitude
                  }&key=${config.googleMapsApiKey}`,
                }}
                style={styles.creatorMapImage}
                resizeMode="cover"
              />
            </View>
          )}

        {/* Comments Preview */}
        <TouchableOpacity
          style={styles.commentsPreview}
          onPress={() => {
            if (!user?.id) {
              navigation.navigate('Login');
              return;
            }
            setCommentsModalVisible(true);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>
              Comments{' '}
              <Text style={styles.commentsCount}>
                {formatCount(
                  currentVideo.topLevelCommentCount ??
                    currentVideo.commentCount,
                )}
              </Text>
            </Text>
            <MaterialCommunityIcons
              name="unfold-more-horizontal"
              size={24}
              color="#212121"
            />
          </View>
          <View style={styles.addCommentRow}>
            <Image
              source={{
                uri:
                  user?.photos?.[0] ||
                  (Array.isArray(user?.photos) && user?.photos[0]) ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    user?.nickname || user?.name || 'User',
                  )}&background=111&color=fff`,
              }}
              style={styles.userAvatarSmall}
            />
            <View style={styles.commentInputPlaceholder}>
              <TextInput
                placeholder="Add a comment..."
                placeholderTextColor="#606060"
                style={styles.commentInputText}
                editable={false}
              />
            </View>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {renderHeader()}
        {relatedVideos.map(item => (
          <VideoCard
            key={item.id}
            video={item}
            onPress={() =>
              navigation.push('VideoDetailsScreen', { videoId: item.id })
            }
          />
        ))}
      </ScrollView>
      <DescriptionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        video={currentVideo}
      />
      <SaveModal
        visible={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
        contentType="video"
        contentId={videoId}
      />
      <CommentsModal
        visible={commentsModalVisible}
        onClose={() => setCommentsModalVisible(false)}
        videoId={videoId}
        video={currentVideo}
        user={user}
        onCommentDeleted={(wasTopLevel, deletedCount) => {
          setCurrentVideo(prev => {
            if (!prev) return null;
            const next = {
              ...prev,
              commentCount: Math.max(0, prev.commentCount - deletedCount),
            };
            if (wasTopLevel) {
              next.topLevelCommentCount = Math.max(
                0,
                (prev.topLevelCommentCount ?? prev.commentCount) - 1,
              );
            }
            return next;
          });
        }}
        onCommentAdded={isReply => {
          setCurrentVideo(prev => {
            if (!prev) return null;
            const next = { ...prev, commentCount: prev.commentCount + 1 };
            if (!isReply) {
              next.topLevelCommentCount =
                (prev.topLevelCommentCount ?? prev.commentCount) + 1;
            }
            return next;
          });
        }}
      />
      <ProductDetailModal
        visible={productDetailModalVisible}
        onClose={() => setProductDetailModalVisible(false)}
        ownerUserId={currentVideo?.userId}
        token={user?.token}
      />
      <LiveChatModal
        visible={liveChatModalVisible}
        onClose={() => setLiveChatModalVisible(false)}
      />
    </SafeAreaView>
  );
};

export default VideoDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#606060',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#606060',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#F97507',
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  headerContainer: {
    marginBottom: 8,
  },
  videoPlayer: {
    width: width,
    height: (width * 9) / 16,
    backgroundColor: '#000',
    position: 'relative',
  },
  videoPlayerContent: {
    width: '100%',
    height: '100%',
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    padding: 10,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
  },
  errorOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorOverlayText: {
    color: '#fff',
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryVideoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryVideoText: {
    color: '#fff',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  videoControlsTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topRightControls: {
    flexDirection: 'row',
  },
  iconSpacing: {
    marginRight: 16,
  },
  playIconTouchable: {
    alignSelf: 'center',
    padding: 16,
  },
  playIcon: {
    alignSelf: 'center',
  },
  progressBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  progressSlider: {
    flex: 1,
    height: 40,
    marginRight: 8,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginRight: 10,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#fff',
  },
  timeText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 8,
  },
  infoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  videoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    flex: 1,
    marginRight: 8,
    lineHeight: 24,
  },
  viewCount: {
    fontSize: 12,
    color: '#424242',
    marginTop: 8,
  },
  actionsContainer: {
    marginTop: 16,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionButton: {
    alignItems: 'center',
  },
  actionText: {
    fontSize: 12,
    marginTop: 4,
    color: '#212121',
  },
  ctaButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  ctaButton: {
    flex: 1,
    backgroundColor: '#F97507',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13,
  },
  channelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e5e5',
  },
  channelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  channelAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    backgroundColor: '#111',
  },
  channelName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
  },
  subscriberCount: {
    fontSize: 12,
    color: '#424242',
  },
  subscribeButton: {
    backgroundColor: '#F97507',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  subscribedButton: {
    backgroundColor: '#f2f2f2',
  },
  subscribeText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  subscribedText: {
    color: '#606060',
  },
  creatorSocialRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderTopWidth: 1,
    borderColor: '#e5e5e5',
  },
  creatorSocialIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF4EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  creatorLocationSection: {
    marginTop: 12,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: '#e5e5e5',
  },
  creatorLocationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  creatorAddress: {
    fontSize: 12,
    color: '#606060',
    marginBottom: 8,
  },
  creatorMapImage: {
    width: width - 32,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#f2f2f2',
  },
  commentsPreview: {
    marginTop: 16,
  },
  commentsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  commentsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    lineHeight: 24,
  },
  commentsCount: {
    color: '#212121',
    fontWeight: '700',
    fontSize: 16,
    lineHeight: 24,
  },
  addCommentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  userAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 50,
    marginRight: 12,
  },
  commentInputPlaceholder: {
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 20,
    borderRadius: 40,
    flex: 1,
    height: 45,
    justifyContent: 'center',
  },
  commentInputText: {
    color: '#212121',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
});
