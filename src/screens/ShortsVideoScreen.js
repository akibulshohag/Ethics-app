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
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Share,
} from 'react-native';
import Video from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
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
import { navigationRef } from '../utils/helper';
import { setShortsMuted } from '../redux/actions/appSlice';

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
    viewsDisplay: '100k',
    isLiked: false,
    creatorRole: 'owner',
    userId: 'u1',
    location: 'Near you',
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
    viewsDisplay: '125K',
    isLiked: false,
    creatorRole: 'owner',
    userId: 'u2',
    location: 'Near you',
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
    viewsDisplay: '50K',
    isLiked: false,
    creatorRole: 'user',
    userId: 'u3',
    location: 'Near you',
  },
];

const VideoItem = ({
  item,
  isActive,
  index,
  screenHeight,
  onBack,
  onOpenComments,
  onOpenSettings,
  onOpenCreate,
  onLike,
  onDislike,
  onSubscribe,
  onShare,
  onOrderNow,
  onLoginPress,
  isSubscribed,
  currentUser,
  navigation,
}) => {
  const [paused, setPaused] = useState(!isActive);
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const shortsMuted = useSelector(state => state.app?.shortsMuted);

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
          muted={!!shortsMuted}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
        />
      ) : (
        <View style={[styles.video, styles.videoPlaceholder]}>
          <Icon
            name="video-off-outline"
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
            <Icon
              name="play-circle-outline"
              size={72}
              color="rgba(255,255,255,0.9)"
            />
          </View>
        )}
      </TouchableOpacity>

      {/* Gradient Overlay - ZIndex 5 (same as HomeOneScreen renderVideoDetail feel) */}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.8)']}
        style={styles.gradient}
        pointerEvents="none"
      />

      {/* Top bar: Back left, Search + Camera right (exact HomeOneScreen) - ZIndex 10 */}
      <View
        style={[styles.topBar, { top: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onBack}
          activeOpacity={0.8}
        >
          <Icon name="chevron-left" size={24} color="#FFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.videoHeaderIcons}>
          <TouchableOpacity style={styles.iconButton}>
            <Icon name="magnify" size={26} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onOpenCreate}>
            <Icon name="camera-outline" size={26} color="#FFF" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconButton} onPress={onOpenSettings}>
            <Icon name="dots-vertical" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Right Side Action Bar - exact HomeOneScreen: eye (views), heart (like), comment, share; position & size match - ZIndex 10 */}
      <View
        style={[styles.rightSideBar, { bottom: screenHeight * 0.25 }]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.actionItem}
          onPress={() =>
            item.user?.id &&
            navigation.navigate('UserViewsScreen', { userId: item.user.id })
          }
        >
          <Icon
            name="eye-outline"
            size={28}
            color="#FFF"
            style={styles.shadow}
          />
          <Text style={styles.actionText}>{item.viewsDisplay ?? '0'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => onLike?.(item)}
        >
          <Icon
            name={item.isLiked ? 'heart' : 'heart-outline'}
            size={28}
            color={item.isLiked ? '#FF4D4D' : '#FFF'}
            style={styles.shadow}
          />
          <Text style={styles.actionText}>{item.likesDisplay}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionItem} onPress={onOpenComments}>
          <Icon
            name="comment-text-outline"
            size={28}
            color="#FFF"
            style={styles.shadow}
          />
          <Text style={styles.actionText}>{item.commentsDisplay}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionItem}
          onPress={() => onShare?.(item)}
        >
          <Icon
            name="share-outline"
            size={28}
            color="#FFF"
            style={styles.shadow}
          />
          <Text style={styles.actionText}>{item.sharesDisplay}</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom section - same as HomeOneScreen: @user, description, Original Sound + Order Now, chevron - ZIndex 10 */}
      <View
        style={[
          styles.videoFooter,
          { position: 'absolute', left: 15, right: 80, bottom: 20, zIndex: 10 },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            const ownerId = item.user?.id ?? item.userId ?? null;
            if (ownerId) {
              navigation.navigate('UserViewsScreen', { userId: ownerId });
            }
          }}
          disabled={!(item.user?.id || item.userId)}
        >
          <Text style={styles.videoUser}>
            @
            {(item.user?.username || item.description || 'short')
              .toLowerCase()
              .replace(/\s+/g, '')}
          </Text>
        </TouchableOpacity>
        <Text style={styles.videoDesc} numberOfLines={2}>
          {item.description || 'Description'}
        </Text>
        {(item.hashtags || []).length > 0 && (
          <Text style={styles.hashtagsText}>
            {(item.hashtags || []).map((tag, idx) => (
              <Text key={idx} style={styles.hashtag}>
                {tag}{' '}
              </Text>
            ))}
          </Text>
        )}
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.translationText}>See translation</Text>
        </TouchableOpacity>
        <View style={styles.footerRow}>
          <View style={styles.audioRow}>
            <Icon name="music" size={18} color="#FFF" />
            <Text style={styles.audioText}>Original Sound</Text>
            <TouchableOpacity
              style={styles.muteToggle}
              onPress={() => dispatch(setShortsMuted(!shortsMuted))}
              activeOpacity={0.8}
            >
              <Icon
                name={shortsMuted ? 'volume-off' : 'volume-high'}
                size={18}
                color="#FFF"
                style={{ marginLeft: 12 }}
              />
              <Text style={[styles.audioText, { marginLeft: 6 }]}>
                {shortsMuted ? 'Mute' : 'Unmute'}
              </Text>
            </TouchableOpacity>
          </View>
          {(item.creatorRole === 'owner' || item.user?.id || item.userId) &&
            (!currentUser?.token ? (
              <TouchableOpacity
                style={styles.resOrderBtn}
                onPress={() => {
                  const ownerId = item.user?.id ?? item.userId ?? null;
                  onLoginPress?.({ returnToOrder: true, ownerUserId: ownerId });
                }}
              >
                <Text style={styles.resOrderText}>Login</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.resOrderBtn}
                onPress={() => {
                  const ownerId = item.user?.id ?? item.userId ?? null;
                  if (ownerId) {
                    onOrderNow?.({
                      ownerId,
                      ownerName: item.user?.username || '',
                      title: item.description || item.user?.username || '',
                      location: item.location || '',
                    });
                  } else {
                    onOrderNow?.({});
                  }
                }}
              >
                <Text style={styles.resOrderText}>Order Now</Text>
              </TouchableOpacity>
            ))}
        </View>
        {/* bottom arrow removed */}
      </View>
    </View>
  );
};

const mapShortToItem = s => {
  const likesCount = s._count?.likes ?? s.likeCount ?? 0;
  const dislikesCount = s.dislikeCount ?? 0;
  const commentsCount = s._count?.comments ?? s.commentCount ?? 0;
  const sharesCount = s.shareCount ?? 0;
  const viewCount = s.viewCount ?? s._count?.views ?? 0;
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
    _shareCount: sharesCount,
    viewsDisplay: formatCount(viewCount),
    _viewCount: viewCount,
    isLiked: s.isLiked ?? false,
    isDisliked: s.isDisliked ?? false,
    creatorRole:
      user.role != null ? String(user.role).toLowerCase() : undefined,
    userId: s.userId || user.id,
    location: user.address || 'Near you',
  };
};

const ShortsVideoScreen = ({ navigation }) => {
  const route = useRoute();
  const initialShortId = route.params?.initialShortId ?? route.params?.shortId;
  const user = useSelector(state => state?.app?.user);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const hasAppliedInitialShort = useRef(false);
  const [commentsVisible, setCommentsVisible] = useState(false);

  // HomeThreeScreen/HomeSevenScreen live in Home1 stack (tab). Use root ref so navigation works from any nested stack.
  const navigateToHomeScreen = (screenName, params) => {
    const payload = params != null ? { screen: screenName, params } : { screen: screenName };
    if (navigationRef.current?.isReady?.()) {
      navigationRef.current.navigate('Root', { screen: 'Home1', params: payload });
    } else {
      const tab = navigation.getParent?.();
      if (tab?.navigate) tab.navigate('Home1', payload);
      else navigation.getParent?.()?.getParent?.()?.navigate?.('Root', { screen: 'Home1', params: payload });
    }
  };

  // When user navigates away, pause all shorts so they don't keep playing in background
  useFocusEffect(
    React.useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false);
    }, []),
  );
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Sexual Content');
  const [subscriptionMap, setSubscriptionMap] = useState({});

  const screenHeight = windowHeight;
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
      const idx = videos.findIndex(
        v => String(v.id) === String(initialShortId),
      );
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
      const res = await shortsService.getShorts({
        page: 1,
        limit: 50,
        viewerRole: user?.role || 'user',
      });
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
      navigateToHomeScreen('HomeSevenScreen');
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
      navigateToHomeScreen('HomeSevenScreen');
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
      navigateToHomeScreen('HomeSevenScreen');
      return;
    }
    if (user.id === channelUserId) return; // can't subscribe to self
    const currentlySubscribed =
      subscriptionMap[channelUserId] ?? item.user?.isSubscribed;
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
      navigateToHomeScreen('HomeSevenScreen');
      return;
    }
    const short = item || activeItem;
    if (!short?.id) return;
    const shareUrl = `eatix://shorts/${short.id}`;
    const message = `${
      short.description || short.user?.username || 'Short'
    }\n${shareUrl}`;
    try {
      await Share.share({ message, title: short.description || 'Share Short' });
      setVideos(prev => {
        if (prev.length === 0) return prev;
        return prev.map(v => {
          if (v.id !== short.id) return v;
          const newCount = (v._shareCount ?? 0) + 1;
          return {
            ...v,
            _shareCount: newCount,
            sharesDisplay: formatCount(newCount),
          };
        });
      });
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
      navigateToHomeScreen('HomeSevenScreen');
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
      navigateToHomeScreen('HomeSevenScreen');
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
    if (
      !channelUserId ||
      !user?.id ||
      subscriptionMap[channelUserId] !== undefined
    )
      return;
    getChannelProfile(channelUserId, user.id)
      .then(data => {
        setSubscriptionMap(prev => ({
          ...prev,
          [channelUserId]: data?.isSubscribed ?? false,
        }));
      })
      .catch(() => {});
  }, [activeVideoIndex, displayVideos, user?.id]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      const { index, item } = viewableItems[0];
      setActiveVideoIndex(index);
      if (item?.id) {
        shortsService
          .recordView(item.id, user?.id || null)
          .then(() => {
            setVideos(prev => {
              if (prev.length === 0) return prev;
              return prev.map(v => {
                if (v.id !== item.id) return v;
                const newCount = (v._viewCount ?? 0) + 1;
                return {
                  ...v,
                  _viewCount: newCount,
                  viewsDisplay: formatCount(newCount),
                };
              });
            });
          })
          .catch(() => {});
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
              isActive={isScreenFocused && activeVideoIndex === index}
              index={index}
              screenHeight={screenHeight}
              onBack={() => navigation.goBack()}
              onOpenComments={() => {
                if (!user?.id) {
                  navigateToHomeScreen('HomeSevenScreen');
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
              onOrderNow={(params) => navigateToHomeScreen('HomeThreeScreen', params)}
              onLoginPress={(params) => navigateToHomeScreen('HomeSevenScreen', params)}
              isSubscribed={
                subscriptionMap[item.user?.id] ??
                item.user?.isSubscribed ??
                false
              }
              currentUser={user}
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
            navigateToHomeScreen('HomeSevenScreen');
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
  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    zIndex: 10,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  backText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 4,
  },
  topRightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  videoHeaderIcons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    marginLeft: 16,
    padding: 4,
  },
  rightSideBar: {
    position: 'absolute',
    right: 15,
    alignItems: 'center',
    zIndex: 10,
  },
  actionItem: {
    marginBottom: 20,
    alignItems: 'center',
  },
  iconCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: '#FFF',
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
  videoFooter: {
    paddingVertical: 8,
  },
  videoUser: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  videoDesc: {
    color: '#FFF',
    fontSize: 15,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  muteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  audioText: {
    color: '#FFF',
    fontSize: 13,
    marginLeft: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 6,
  },
  hashtagsText: {
    color: '#FFF',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 6,
  },
  hashtag: {
    fontWeight: 'bold',
    color: '#FFF',
  },
  translationText: {
    color: '#FFF',
    fontSize: 13,
    textDecorationLine: 'underline',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 6,
  },
  resOrderBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resOrderText: {
    color: '#FFF',
    fontWeight: 'bold',
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
