/* eslint-disable react-native/no-inline-styles */
import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  TouchableOpacity,
  Image,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Share,
} from 'react-native';
import Video from 'react-native-video';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import CommentsModal from '../components/CommentsModal';
import SettingsModal from '../components/SettingsModal';
import CreateVideoModal from '../components/CreateVideoModal';
import SaveModal from '../components/SaveModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { shortsService } from '../services/shortsService';
import {
  getChannelProfile,
  subscribeToChannel,
  unsubscribeFromChannel,
} from '../services/channelService';
import { setPlaylist } from '../services/playlistService';
import { submitReport } from '../services/reportService';
import Toast from 'react-native-toast-message';

const { width, height: windowHeight } = Dimensions.get('window');

const formatCount = n => {
  if (!n || n < 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

const REPORT_REASONS = [
  'Sexual Content',
  'Violent or Repulsive Content',
  'Hateful or Abusive Content',
  'Harmful or Dangerous Acts',
  'Spam or Misleading',
  'Child Abuse',
  'Others',
];

// Fallback mock data when API has no shorts
const MOCK_VIDEOS = [
  {
    id: '1',
    videoUrl:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    user: {
      id: 'u1',
      username: 'Jenny Wilson',
      avatar: 'https://randomuser.me/api/portraits/women/44.jpg',
      isSubscribed: false,
    },
    description:
      'Hello everyone, in this video I will See one of my favorite Foods ❤️❤️',
    hashtags: ['#Foods', '#resturent', '#love', '#eat'],
    likes: '27.8K',
    likesDisplay: '27.8K',
    dislikes: '3.6K',
    comments: '2.4K',
    commentsDisplay: '2.4K',
    shares: '2.2K',
    sharesDisplay: '2.2K',
    isLiked: false,
  },
  {
    id: '2',
    videoUrl:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    user: {
      id: 'u2',
      username: 'Foodie Life',
      avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
      isSubscribed: true,
    },
    description: 'Best burger in town! You have to try this out. 🍔🍟',
    hashtags: ['#Burger', '#FoodPorn', '#Yummy'],
    likes: '125K',
    likesDisplay: '125K',
    dislikes: '1.2K',
    comments: '8K',
    commentsDisplay: '8K',
    shares: '15K',
    sharesDisplay: '15K',
    isLiked: false,
  },
  {
    id: '3',
    videoUrl:
      'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    user: {
      id: 'u3',
      username: 'Nature Lover',
      avatar: 'https://randomuser.me/api/portraits/women/68.jpg',
      isSubscribed: false,
    },
    description: 'The beauty of nature is unmatched. 🌲🍃',
    hashtags: ['#Nature', '#Peace', '#Forest'],
    likes: '50K',
    likesDisplay: '50K',
    dislikes: '200',
    comments: '500',
    commentsDisplay: '500',
    shares: '3K',
    sharesDisplay: '3K',
    isLiked: false,
  },
];

const VideoItem = ({
  item,
  isActive,
  index,
  screenHeight,
  onOpenComments,
  onOpenSettings,
  onOpenCreate,
  onLike,
  onDislike,
  onSubscribe,
  onShare,
  isSubscribed,
  navigation,
}) => {
  const [paused, setPaused] = useState(!isActive);
  const insets = useSafeAreaInsets();

  // Manage play/pause based on active state
  useEffect(() => {
    setPaused(!isActive);
  }, [isActive]);

  const togglePause = () => {
    setPaused(prev => !prev);
  };

  const hasValidVideo =
    item.videoUrl && String(item.videoUrl).trim().length > 0;

  return (
    <View
      style={[styles.videoContainer, { height: screenHeight, width: width }]}
    >
      {hasValidVideo ? (
        <Video
          source={{ uri: item.videoUrl }}
          style={styles.video}
          resizeMode="cover"
          repeat
          paused={paused}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
        />
      ) : (
        <View style={[styles.video, styles.videoPlaceholder]}>
          <Ionicons
            name="videocam-off-outline"
            size={64}
            color="rgba(255,255,255,0.5)"
          />
          <Text style={styles.videoPlaceholderText}>No video</Text>
        </View>
      )}

      {/* Transparent Touch Overlay for Play/Pause - ZIndex 1 */}
      <TouchableOpacity
        activeOpacity={1}
        onPress={togglePause}
        style={styles.touchOverlay}
      >
        {paused && (
          <View style={styles.pauseIconContainer}>
            <Ionicons name="play" size={50} color="rgba(255,255,255,0.6)" />
          </View>
        )}
      </TouchableOpacity>

      {/* Gradient Overlay - ZIndex 5 */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
        style={styles.gradient}
        pointerEvents="none"
      />

      {/* Top Right Icons - ZIndex 10 */}
      <View
        style={[styles.topRightIcons, { top: insets.top + 10 }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="search-outline" size={26} color="white" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.iconButton} onPress={onOpenCreate}>
          <Ionicons name="camera-outline" size={26} color="white" />
        </TouchableOpacity>
      </View>

      {/* Right Side Action Bar - ZIndex 10 */}
      <View
        style={[styles.rightSideBar, { bottom: 100 }]}
        pointerEvents="box-none"
      >
        {/* <TouchableOpacity style={styles.actionItem}>
                    <Ionicons name="flag-outline" size={28} color="white" style={styles.shadow} />
                </TouchableOpacity> */}

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => onLike?.(item)}
        >
          <Ionicons
            name={item.isLiked ? 'thumbs-up' : 'thumbs-up-outline'}
            size={30}
            color="white"
            style={styles.shadow}
          />
          <Text style={styles.actionText}>{item.likesDisplay}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => onDislike?.(item)}
        >
          <Ionicons
            name={item.isDisliked ? 'thumbs-down' : 'thumbs-down-outline'}
            size={30}
            color="white"
            style={styles.shadow}
          />
          <Text style={styles.actionText}>
            {item.dislikesDisplay ?? item.dislikes ?? '0'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={onOpenComments}>
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={28}
            color="white"
            style={styles.shadow}
          />
          <Text style={styles.actionText}>{item.commentsDisplay}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={() => onShare?.(item)}>
          <FontAwesome
            name="share"
            size={28}
            color="white"
            style={styles.shadow}
          />
          <Text style={styles.actionText}>{item.sharesDisplay}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={onOpenSettings}>
          <Ionicons
            name="ellipsis-horizontal"
            size={28}
            color="white"
            style={styles.shadow}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Info Section - ZIndex 10 */}
      <View
        style={[styles.bottomInfo, { bottom: 20 }]}
        pointerEvents="box-none"
      >
        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.descriptionText}>{item.description}</Text>
          <Text style={styles.hashtagsText}>
            {(item.hashtags || []).map((tag, idx) => (
              <Text key={idx} style={styles.hashtag}>
                {tag}{' '}
              </Text>
            ))}
          </Text>
        </View>

        {/* User Row */}
        <View style={styles.userRow}>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('ChannelProfileScreen', {
                channelUserId: item.user?.id,
              })
            }
          >
            <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              navigation.navigate('ChannelProfileScreen', {
                channelUserId: item.user?.id,
              })
            }
          >
            <Text style={styles.username}>{item.user.username}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.subscribeButton,
              isSubscribed && styles.subscribedButton,
            ]}
            onPress={() => onSubscribe?.(item)}
          >
            <Text style={styles.subscribeText}>
              {isSubscribed ? 'Subscribed' : 'Subscribe'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const mapShortToItem = s => {
  const likesCount = s._count?.likes ?? s.likeCount ?? 0;
  const dislikesCount = s.dislikeCount ?? 0;
  const commentsCount = s._count?.comments ?? s.commentCount ?? 0;
  const sharesCount = s.shareCount ?? 0;
  const user = s.user || {};
  const avatar =
    user.avatar ||
    (Array.isArray(user.photos) && user.photos[0]) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.name || user.nickname || 'User',
    )}&background=FF8C00&color=fff`;
  return {
    id: s.id,
    videoUrl: s.videoUrl,
    user: {
      id: user.id,
      username: user.nickname || user.name || 'Unknown',
      avatar,
      isSubscribed: false,
    },
    description: s.description || s.title || '',
    hashtags: Array.isArray(s.tags)
      ? s.tags.map(t => (String(t).startsWith('#') ? t : `#${t}`))
      : [],
    likesDisplay: formatCount(likesCount),
    _likeCount: likesCount,
    dislikesDisplay: formatCount(dislikesCount),
    _dislikeCount: dislikesCount,
    commentsDisplay: formatCount(commentsCount),
    _commentCount: commentsCount,
    sharesDisplay: formatCount(sharesCount),
    isLiked: s.isLiked ?? false,
    isDisliked: s.isDisliked ?? false,
  };
};

const ShortsVideoScreen = ({ navigation }) => {
  const route = useRoute();
  const initialShortId = route.params?.initialShortId ?? route.params?.shortId;
  const user = useSelector(state => state?.app?.user);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const hasAppliedInitialShort = useRef(false);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Sexual Content');
  const [subscriptionMap, setSubscriptionMap] = useState({});

  const tabHeight = Platform.OS === 'ios' ? 82 : 68;
  const screenHeight = windowHeight - tabHeight;
  const displayVideos = videos.length > 0 ? videos : MOCK_VIDEOS;

  useEffect(() => {
    loadShorts();
  }, []);

  // When opened from Home with a specific short, put that short first
  useEffect(() => {
    if (!initialShortId) return;
    hasAppliedInitialShort.current = false;
  }, [initialShortId]);

  useEffect(() => {
    if (
      !loading &&
      videos.length > 0 &&
      initialShortId &&
      !hasAppliedInitialShort.current
    ) {
      const idx = videos.findIndex(v => String(v.id) === String(initialShortId));
      if (idx > 0) {
        const clicked = videos[idx];
        const rest = videos.filter((_, i) => i !== idx);
        setVideos([clicked, ...rest]);
        setActiveVideoIndex(0);
      } else if (idx === 0) {
        setActiveVideoIndex(0);
      }
      hasAppliedInitialShort.current = true;
    }
  }, [loading, videos, initialShortId]);

  const loadShorts = async () => {
    try {
      setLoading(true);
      const res = await shortsService.getShorts({ page: 1, limit: 50 });
      if (res?.shorts?.length > 0) {
        const filtered = res.shorts.filter(
          s => s.videoUrl && String(s.videoUrl).trim(),
        );
        setVideos(filtered.map(mapShortToItem));
      } else {
        setVideos(MOCK_VIDEOS);
      }
    } catch (e) {
      setVideos(MOCK_VIDEOS);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async item => {
    if (!user?.id) {
      navigation.navigate('Login');
      return;
    }
    try {
      await shortsService.toggleLike(item.id, user.id);
      setVideos(prev =>
        prev.map(v => {
          if (v.id !== item.id) return v;
          const newLiked = !v.isLiked;
          const delta = newLiked ? 1 : -1;
          const newCount = Math.max(0, (v._likeCount ?? 0) + delta);
          return {
            ...v,
            isLiked: newLiked,
            _likeCount: newCount,
            likesDisplay: formatCount(newCount),
          };
        }),
      );
    } catch (e) {}
  };

  const handleDislike = async item => {
    if (!user?.id) {
      navigation.navigate('Login');
      return;
    }
    try {
      await shortsService.toggleDislike(item.id, user.id);
      setVideos(prev =>
        prev.map(v => {
          if (v.id !== item.id) return v;
          const newDisliked = !v.isDisliked;
          const delta = newDisliked ? 1 : -1;
          const newCount = Math.max(0, (v._dislikeCount ?? 0) + delta);
          return {
            ...v,
            isDisliked: newDisliked,
            _dislikeCount: newCount,
            dislikesDisplay: formatCount(newCount),
          };
        }),
      );
    } catch (e) {}
  };

  const handleSubscribe = async item => {
    const channelUserId = item.user?.id;
    if (!channelUserId) return;
    if (!user?.id) {
      navigation.navigate('Login');
      return;
    }
    if (user.id === channelUserId) return; // can't subscribe to self
    const currentlySubscribed = subscriptionMap[channelUserId] ?? item.user?.isSubscribed;
    try {
      if (currentlySubscribed) {
        await unsubscribeFromChannel(user.id, channelUserId);
        setSubscriptionMap(prev => ({ ...prev, [channelUserId]: false }));
      } else {
        await subscribeToChannel(user.id, channelUserId);
        setSubscriptionMap(prev => ({ ...prev, [channelUserId]: true }));
      }
    } catch (e) {
      Alert.alert('Error', 'Could not update subscription.');
    }
  };

  const activeItem = displayVideos[activeVideoIndex];

  const handleShare = async item => {
    if (!user?.id) {
      navigation.navigate('Login');
      return;
    }
    const short = item || activeItem;
    if (!short?.id) return;
    const shareUrl = `eatix://shorts/${short.id}`;
    const message = `${short.description || short.user?.username || 'Short'}\n${shareUrl}`;
    try {
      await Share.share({ message, title: short.description || 'Share Short' });
    } catch (e) {
      if (e?.message !== 'User did not share') {
        Toast.show({ type: 'error', text1: 'Share failed' });
      }
    }
  };

  const handleSaveToWatchLater = async () => {
    if (!user?.id || !activeItem?.id) {
      Toast.show({ type: 'info', text1: 'Please log in to save' });
      setSettingsVisible(false);
      navigation.navigate('Login');
      return;
    }
    try {
      await setPlaylist(user.id, 'watch_later', 'short', activeItem.id, true);
      Toast.show({ type: 'success', text1: 'Saved to Watch Later' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to save' });
    }
  };

  const openReportModal = () => {
    setSettingsVisible(false);
    if (!user?.id) {
      navigation.navigate('Login');
      return;
    }
    setTimeout(() => setReportVisible(true), 100);
  };

  const handleReportSubmit = async () => {
    if (!activeItem?.id) {
      setReportVisible(false);
      return;
    }
    try {
      await submitReport({
        contentType: 'short',
        contentId: activeItem.id,
        reporterId: user?.id,
        reason: selectedReason,
      });
      Toast.show({ type: 'success', text1: 'Report submitted' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to submit report' });
    }
    setReportVisible(false);
  };

  useEffect(() => {
    const active = displayVideos[activeVideoIndex];
    const channelUserId = active?.user?.id;
    if (!channelUserId || !user?.id || subscriptionMap[channelUserId] !== undefined) return;
    getChannelProfile(channelUserId, user.id)
      .then(data => {
        setSubscriptionMap(prev => ({ ...prev, [channelUserId]: data?.isSubscribed ?? false }));
      })
      .catch(() => {});
  }, [activeVideoIndex, displayVideos, user?.id]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      const { index, item } = viewableItems[0];
      setActiveVideoIndex(index);
      if (item?.id) {
        shortsService.recordView(item.id, user?.id || null).catch(() => {});
      }
    }
  }).current;

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 80,
  }).current;

  return (
    <View style={[styles.container, { height: screenHeight }]}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      {loading ? (
        <View style={[styles.centerContent, { height: screenHeight }]}>
          <ActivityIndicator size="large" color="#FF8C00" />
        </View>
      ) : (
        <FlatList
          data={displayVideos}
          renderItem={({ item, index }) => (
            <VideoItem
              item={item}
              isActive={activeVideoIndex === index}
              index={index}
              screenHeight={screenHeight}
              onOpenComments={() => {
                if (!user?.id) {
                  navigation.navigate('Login');
                  return;
                }
                setCommentsVisible(true);
              }}
              onOpenSettings={() => setSettingsVisible(true)}
              onOpenCreate={() => setCreateVisible(true)}
              onLike={handleLike}
              onDislike={handleDislike}
              onSubscribe={handleSubscribe}
              onShare={handleShare}
              isSubscribed={subscriptionMap[item.user?.id] ?? item.user?.isSubscribed ?? false}
              navigation={navigation}
            />
          )}
          keyExtractor={item => item.id}
          pagingEnabled
          vertical
          showsVerticalScrollIndicator={false}
          snapToInterval={screenHeight}
          snapToAlignment="center"
          decelerationRate="fast"
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          initialNumToRender={2} // Increased
          maxToRenderPerBatch={3} // Increased
          windowSize={10} // Increased to keep more videos ready
          removeClippedSubviews={false} // Disabled for Android reliability
          extraData={activeVideoIndex}
          getItemLayout={(data, index) => ({
            length: screenHeight,
            offset: screenHeight * index,
            index,
          })}
        />
      )}
      <CommentsModal
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
        contentType="short"
        contentId={displayVideos[activeVideoIndex]?.id}
        video={{
          commentCount:
            displayVideos[activeVideoIndex]?._commentCount ??
            displayVideos[activeVideoIndex]?.commentsDisplay ??
            0,
        }}
        user={user}
      />
      <SettingsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onSaveToPlaylist={() => {
          if (!user?.id) {
            setSettingsVisible(false);
            navigation.navigate('Login');
            return;
          }
          setSaveModalVisible(true);
        }}
        onSaveToWatchLater={handleSaveToWatchLater}
        onReport={openReportModal}
        onShare={() => handleShare(activeItem)}
      />
      <SaveModal
        visible={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
        contentType="short"
        contentId={displayVideos[activeVideoIndex]?.id}
      />
      <CreateVideoModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
      />

      <Modal
        animationType="slide"
        transparent
        visible={reportVisible}
        onRequestClose={() => setReportVisible(false)}
      >
        <Pressable
          style={styles.reportOverlay}
          onPress={() => setReportVisible(false)}
        >
          <View style={styles.reportModalContent}>
            <View style={styles.reportHandle} />
            <Text style={styles.reportTitle}>Report</Text>
            <View style={styles.reportDivider} />
            {REPORT_REASONS.map(reason => (
              <TouchableOpacity
                key={reason}
                activeOpacity={0.8}
                style={styles.reportOptionRow}
                onPress={() => setSelectedReason(reason)}
              >
                <MaterialCommunityIcons
                  name={
                    selectedReason === reason
                      ? 'radiobox-marked'
                      : 'radiobox-blank'
                  }
                  size={24}
                  color="#FF8C00"
                />
                <Text style={styles.reportOptionText}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.reportActionRow}>
              <TouchableOpacity
                style={styles.reportCancelButton}
                onPress={() => setReportVisible(false)}
              >
                <Text style={styles.reportCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reportSubmitButton}
                onPress={handleReportSubmit}
              >
                <Text style={styles.reportSubmitText}>Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    position: 'relative',
    backgroundColor: 'black',
    overflow: 'hidden',
  },
  touchOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  pauseIconContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 20,
    borderRadius: 50,
  },
  video: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    zIndex: 0,
  },
  videoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  videoPlaceholderText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 14,
    marginTop: 8,
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 300,
    zIndex: 5,
  },
  topRightIcons: {
    position: 'absolute',
    right: 15,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 10,
  },
  iconButton: {
    marginLeft: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  rightSideBar: {
    position: 'absolute',
    right: 10,
    alignItems: 'center',
    zIndex: 10,
  },
  actionItem: {
    marginBottom: 20,
    alignItems: 'center',
  },
  actionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  shadow: {
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  bottomInfo: {
    position: 'absolute',
    left: 15,
    right: 80,
    justifyContent: 'flex-end',
    zIndex: 10,
  },
  descriptionContainer: {
    marginBottom: 15,
  },
  descriptionText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
    marginBottom: 5,
  },
  hashtagsText: {
    color: 'white',
    fontSize: 14,
    lineHeight: 20,
  },
  hashtag: {
    fontWeight: 'bold',
    color: '#fff',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'white',
    marginRight: 10,
  },
  username: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  subscribeButton: {
    backgroundColor: '#cc0000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  subscribedButton: {
    backgroundColor: '#666',
  },
  subscribeText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
  },
  reportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  reportModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
  },
  reportHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 15,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 15,
  },
  reportDivider: {
    height: 1,
    backgroundColor: '#eee',
    marginBottom: 15,
  },
  reportOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  reportOptionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 12,
  },
  reportActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
  },
  reportCancelButton: {
    flex: 1,
    backgroundColor: '#FFF5F0',
    paddingVertical: 15,
    borderRadius: 30,
    marginRight: 10,
    alignItems: 'center',
  },
  reportCancelText: {
    color: '#FF8C00',
    fontWeight: 'bold',
    fontSize: 16,
  },
  reportSubmitButton: {
    flex: 1,
    backgroundColor: '#FF8C00',
    paddingVertical: 15,
    borderRadius: 30,
    marginLeft: 10,
    alignItems: 'center',
  },
  reportSubmitText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});

export default ShortsVideoScreen;
