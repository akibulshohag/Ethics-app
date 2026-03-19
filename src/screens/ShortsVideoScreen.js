/* eslint-disable react-native/no-inline-styles */
import React, { useRef, useState, useEffect, useCallback } from 'react';
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
  Linking,
  TextInput,
} from 'react-native';
import Video from 'react-native-video';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Slider from '@react-native-community/slider';
import { launchImageLibrary } from 'react-native-image-picker';
import CommentsModal from '../components/CommentsModal';
import ShortsMoreOptionsModal from '../components/ShortsMoreOptionsModal';
import ShortsReportModal from '../components/ShortsReportModal';
import CreateVideoModal from '../components/CreateVideoModal';
import SaveModal from '../components/SaveModal';
import SetVisibilityModal from '../components/SetVisibilityModal';
import SelectAudienceModal from '../components/SelectAudienceModal';
import CommentsSettingsModal from '../components/CommentsSettingsModal';
import VideoScheduleModal from '../components/VideoScheduleModal';
import { shortsService } from '../services/shortsService';
import {
  getChannelProfile,
  subscribeToChannel,
  unsubscribeFromChannel,
} from '../services/channelService';
import { setPlaylist } from '../services/playlistService';
import { submitReport } from '../services/reportService';
import Toast from 'react-native-toast-message';
import { navigationRef, safeImageUri } from '../utils/helper';
import { setShortsMuted } from '../redux/actions/appSlice';
import { listMySubscribersWhoOrderedFromOwner } from '../services/orderService';

const { width, height: windowHeight } = Dimensions.get('window');

const formatCount = n => {
  if (!n || n < 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

/** Current / total time next to seek bar (YouTube Shorts–style) */
const formatShortsTime = sec => {
  const s = Math.floor(Number(sec) || 0);
  if (!Number.isFinite(s) || s < 0) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  }
  return `${m}:${String(r).padStart(2, '0')}`;
};

const mapVisibilityForApi = v => {
  const x = String(v || 'Public').toLowerCase();
  if (x.includes('private')) return 'private';
  return 'public';
};

const mapCommentsForApi = c => {
  const x = String(c || '').toLowerCase();
  if (x.includes('disable')) return 'disable';
  if (x.includes('hold')) return 'hold';
  return 'allow';
};

const firstNameFromSubscriber = u => {
  const raw = String(u?.name || u?.nickname || u?.email || '').trim();
  if (!raw) return 'Someone';
  const word = raw.split(/\s+/)[0];
  if (!word) return 'Someone';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};

const buildSubscribersOrderLine = (firstDisplay, total) => {
  if (total == null || total < 1) return 'Subscribers Order';
  const name = firstDisplay || 'Someone';
  if (total === 1) return `${name} Ordered Here`;
  return `${name} & others Ordered Here`;
};

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
  onOpenMoreMenu,
  onOpenCreate,
  onLike,
  onDislike,
  onSubscribe,
  onShare,
  onOrderNow,
  onLoginPress,
  onSubscribersPress,
  isSubscribed,
  currentUser,
  navigation,
}) => {
  const [paused, setPaused] = useState(!isActive);
  const insets = useSafeAreaInsets();
  const dispatch = useDispatch();
  const shortsMuted = useSelector(state => state.app?.shortsMuted);
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const lastProgressUpdate = useRef(0);
  const lastTapMsRef = useRef(0);
  const singleTapTimerRef = useRef(null);

  const descText =
    (item.description && String(item.description).trim()) || 'Description';
  const [descExpanded, setDescExpanded] = useState(false);
  const [descNeedsMore, setDescNeedsMore] = useState(false);
  const [descMeasureWidth, setDescMeasureWidth] = useState(0);
  const [descFirstLine, setDescFirstLine] = useState('');
  const [descLayoutDone, setDescLayoutDone] = useState(false);
  const [ownerAvatarBroken, setOwnerAvatarBroken] = useState(false);

  useEffect(() => {
    setDescExpanded(false);
    setDescNeedsMore(false);
    setDescMeasureWidth(0);
    setDescFirstLine('');
    setDescLayoutDone(false);
    setOwnerAvatarBroken(false);
  }, [item.id]);

  // Manage play/pause based on active state
  useEffect(() => {
    setPaused(!isActive);
  }, [isActive]);

  const togglePause = () => {
    setPaused(prev => !prev);
  };

  const onOverlayTap = () => {
    const now = Date.now();
    const DOUBLE_TAP_MS = 260;
    if (now - lastTapMsRef.current < DOUBLE_TAP_MS) {
      lastTapMsRef.current = 0;
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      // Double tap: like only (no unlike)
      onLike?.(item, { forceLike: true });
      return;
    }
    lastTapMsRef.current = now;
    if (singleTapTimerRef.current) clearTimeout(singleTapTimerRef.current);
    singleTapTimerRef.current = setTimeout(() => {
      singleTapTimerRef.current = null;
      togglePause();
    }, DOUBLE_TAP_MS);
  };

  const hasValidVideo =
    item.videoUrl && String(item.videoUrl).trim().length > 0;
  const ownerId = item.user?.id ?? item.userId ?? null;
  const isOwnShort = !!(
    currentUser?.id &&
    ownerId &&
    currentUser.id === ownerId
  );
  const showFollowPlus = !!ownerId && !isOwnShort && !isSubscribed;
  const ownerAvatarFallbackUri = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    item.user?.username || 'User',
  )}&background=111&color=fff`;
  const ownerAvatarUri = safeImageUri(
    item.avatar ||
      item.user?.avatar ||
      item.user?.channelAvatar ||
      item.user?.profileImage ||
      item.user?.photoUrl ||
      (Array.isArray(item.user?.photos) && item.user.photos[0]
        ? typeof item.user.photos[0] === 'string'
          ? item.user.photos[0]
          : item.user.photos[0]?.src
        : null) ||
      null,
    ownerAvatarFallbackUri,
  );

  let descPreviewOneLine = '';
  if (!descExpanded && descNeedsMore && descMeasureWidth > 0) {
    const flat = descText.replace(/\n/g, ' ').trim();
    const approxCharPx = 6.8;
    const moreReservePx = 52;
    const maxChars = Math.max(
      12,
      Math.floor((descMeasureWidth - moreReservePx) / approxCharPx),
    );
    if (descFirstLine.length > 0) {
      let line = descFirstLine.trimEnd();
      const cut = Math.max(6, Math.ceil(moreReservePx / approxCharPx));
      if (line.length > cut + 8) {
        line = line
          .slice(0, line.length - cut)
          .replace(/\s+\S*$/, '')
          .trim();
      }
      descPreviewOneLine = line || flat.slice(0, maxChars).trim();
    } else {
      descPreviewOneLine =
        flat.length > maxChars
          ? flat
              .slice(0, maxChars)
              .replace(/\s+\S*$/, '')
              .trim()
          : flat.slice(0, Math.min(flat.length, maxChars));
    }
    if (!descPreviewOneLine) {
      descPreviewOneLine = flat.slice(0, maxChars);
    }
  }

  return (
    <View
      style={[styles.videoContainer, { height: screenHeight, width: width }]}
    >
      {hasValidVideo ? (
        <Video
          ref={videoRef}
          source={{ uri: item.videoUrl }}
          style={styles.video}
          resizeMode="cover"
          repeat
          paused={paused}
          muted={!!shortsMuted}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          onLoad={data => {
            const d = Number(data?.duration || 0);
            const api = Number(item?.duration);
            const use =
              Number.isFinite(d) && d > 0
                ? d
                : Number.isFinite(api) && api > 0
                ? api
                : 0;
            setDuration(use);
          }}
          onProgress={data => {
            if (!isActive || paused) return;
            if (isSeeking) return;
            const now = Date.now();
            if (now - lastProgressUpdate.current < 250) return;
            lastProgressUpdate.current = now;
            const t = Number(data?.currentTime || 0);
            setCurrentTime(Number.isFinite(t) ? t : 0);
          }}
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
        onPress={onOverlayTap}
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

      {/* YouTube-style progress bar + current / duration timers */}
      <View
        style={[
          styles.progressBarWrap,
          { bottom: Math.max(6, (insets?.bottom || 0) + 3) },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.progressRow}>
          <Text style={styles.progressTimeText}>
            {formatShortsTime(Math.min(currentTime, duration || 999999))}
          </Text>
          <Slider
            style={styles.progressSlider}
            value={Math.min(currentTime, Math.max(0.01, duration || 0.1))}
            minimumValue={0}
            maximumValue={Math.max(0.1, duration || 0.1)}
            minimumTrackTintColor="rgba(255,255,255,0.9)"
            maximumTrackTintColor="rgba(255,255,255,0.35)"
            thumbTintColor="rgba(255,255,255,0.95)"
            onSlidingStart={() => setIsSeeking(true)}
            onValueChange={val => setCurrentTime(val)}
            onSlidingComplete={val => {
              const max = Math.max(0.1, duration || 0.1);
              const v = Math.max(0, Math.min(Number(val) || 0, max));
              try {
                videoRef.current?.seek?.(v);
              } catch (_) {}
              setCurrentTime(v);
              setIsSeeking(false);
            }}
          />
          <Text style={styles.progressTimeText}>
            {duration > 0 ? formatShortsTime(duration) : '--:--'}
          </Text>
        </View>
      </View>

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
          {/* <TouchableOpacity style={styles.iconButton} onPress={onOpenCreate}>
            <Icon name="camera-outline" size={26} color="#FFF" />
          </TouchableOpacity> */}
          <TouchableOpacity
            style={styles.iconButton}
            onPress={() => onOpenMoreMenu?.(item)}
          >
            <Icon name="dots-vertical" size={26} color="#FFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Reels-style: vertical actions on the right, low above scrubber */}
      <View
        style={[
          styles.rightSideBar,
          { bottom: Math.max(10, (insets?.bottom || 0) + 46) },
        ]}
        pointerEvents="box-none"
      >
        <TouchableOpacity
          style={styles.ownerProfileAction}
          activeOpacity={0.85}
          onPress={() => {
            if (!ownerId) return;
            if (showFollowPlus) {
              onSubscribe?.(item);
              return;
            }
            navigation.navigate('UserViewsScreen', { userId: ownerId });
          }}
        >
          <View style={styles.ownerAvatarWrap}>
            <Image
              source={{
                uri: ownerAvatarBroken
                  ? ownerAvatarFallbackUri
                  : ownerAvatarUri,
              }}
              style={styles.ownerAvatar}
              onError={() => setOwnerAvatarBroken(true)}
            />
            {showFollowPlus ? (
              <View style={styles.ownerPlusBadge}>
                <Icon name="plus" size={12} color="#FFF" />
              </View>
            ) : null}
          </View>
        </TouchableOpacity>

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
          {
            position: 'absolute',
            left: 15,
            right: 72,
            bottom: Math.max(52, (insets?.bottom || 0) + 46),
            zIndex: 10,
          },
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
        <View
          style={styles.descBlock}
          onLayout={e => {
            const w = Math.round(e.nativeEvent.layout.width);
            if (w > 0 && w !== descMeasureWidth) {
              setDescMeasureWidth(w);
            }
          }}
        >
          {descMeasureWidth > 0 ? (
            <Text
              pointerEvents="none"
              style={[
                styles.videoDesc,
                styles.descMeasureHidden,
                { width: descMeasureWidth },
              ]}
              onTextLayout={ev => {
                const lines = ev.nativeEvent.lines || [];
                setDescNeedsMore(lines.length > 1);
                const t0 = lines[0]?.text;
                if (typeof t0 === 'string' && t0.length > 0) {
                  setDescFirstLine(t0.trimEnd());
                }
                setDescLayoutDone(true);
              }}
            >
              {descText}
            </Text>
          ) : null}
          {!descLayoutDone ? (
            <Text
              style={styles.videoDesc}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {descText}
            </Text>
          ) : descExpanded ? (
            <>
              <Text style={[styles.videoDesc, styles.videoDescExpanded]}>
                {descText}
              </Text>
              {descNeedsMore ? (
                <Text
                  style={styles.viewLessLink}
                  onPress={() => setDescExpanded(false)}
                >
                  View less
                </Text>
              ) : null}
            </>
          ) : descNeedsMore ? (
            <Text style={styles.videoDesc} numberOfLines={1}>
              {descPreviewOneLine}
              <Text style={styles.descEllipsisSameLine}>...</Text>
              <Text
                style={styles.moreInlineTap}
                onPress={() => setDescExpanded(true)}
              >
                more
              </Text>
            </Text>
          ) : (
            <Text style={styles.videoDesc} numberOfLines={1}>
              {descText}
            </Text>
          )}
        </View>
        {(item.hashtags || []).length > 0 && (
          <Text style={styles.hashtagsText}>
            {(item.hashtags || []).map((tag, idx) => (
              <Text key={idx} style={styles.hashtag}>
                {tag}{' '}
              </Text>
            ))}
          </Text>
        )}
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            const ownerId = item.user?.id ?? item.userId ?? null;
            if (ownerId) onSubscribersPress?.(ownerId);
          }}
          disabled={!(item.user?.id || item.userId)}
        >
          <Text style={styles.translationText}>Subscribers Order</Text>
        </TouchableOpacity>
        <View style={styles.footerRow}>
          <View style={styles.audioRow}>
            <Icon name="music" size={18} color="#FFF" />
            <Text
              style={[styles.audioText, styles.audioTitleFlex]}
              numberOfLines={1}
            >
              Original Sound
            </Text>
            <TouchableOpacity
              style={styles.muteToggle}
              onPress={() => dispatch(setShortsMuted(!shortsMuted))}
              activeOpacity={0.8}
            >
              <Icon
                name={shortsMuted ? 'volume-off' : 'volume-high'}
                size={18}
                color="#FFF"
                style={{ marginLeft: 10 }}
              />
              <Text style={[styles.audioText, { marginLeft: 6 }]}>
                {shortsMuted ? 'Unmute' : 'Mute'}
              </Text>
            </TouchableOpacity>
          </View>
          {(item.creatorRole === 'owner' || item.user?.id || item.userId) &&
            (!currentUser?.token ? (
              <TouchableOpacity
                style={[styles.resOrderBtn, styles.resOrderBtnFooter]}
                onPress={() => {
                  const ownerId = item.user?.id ?? item.userId ?? null;
                  onLoginPress?.({ returnToOrder: true, ownerUserId: ownerId });
                }}
              >
                <Text style={styles.resOrderText}>Login</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.resOrderBtn, styles.resOrderBtnFooter]}
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
  const firstPhoto =
    Array.isArray(user.photos) && user.photos.length > 0
      ? user.photos[0]
      : null;
  const firstTopPhoto =
    Array.isArray(s.photos) && s.photos.length > 0 ? s.photos[0] : null;
  const channelAvatarObj = s.channelAvatar;
  const avatar =
    s.avatar ||
    (typeof channelAvatarObj === 'string'
      ? channelAvatarObj
      : channelAvatarObj?.src || channelAvatarObj?.uri) ||
    s.profileImage ||
    s.photoUrl ||
    (typeof firstTopPhoto === 'string' ? firstTopPhoto : firstTopPhoto?.src) ||
    user.avatar ||
    user.channelAvatar ||
    user.profileImage ||
    user.photoUrl ||
    (typeof firstPhoto === 'string' ? firstPhoto : firstPhoto?.src) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      user.nickname ||
        user.name ||
        s.channelName ||
        s.nickname ||
        s.name ||
        s.username ||
        'User',
    )}&background=FF8C00&color=fff`;
  const username =
    user.nickname ||
    user.name ||
    s.channelName ||
    s.nickname ||
    s.name ||
    s.username ||
    'Unknown';
  return {
    id: s.id,
    videoUrl: s.videoUrl,
    user: {
      id: user.id || s.userId,
      username,
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
    duration:
      s.duration != null && Number.isFinite(Number(s.duration))
        ? Number(s.duration)
        : null,
  };
};

const ShortsVideoScreen = ({ navigation }) => {
  const route = useRoute();
  const initialShortId = route.params?.initialShortId ?? route.params?.shortId;
  const initialShortItem = route.params?.initialShortItem || null;
  const user = useSelector(state => state?.app?.user);
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const hasAppliedInitialShort = useRef(false);
  const [commentsVisible, setCommentsVisible] = useState(false);

  // HomeThreeScreen/HomeSevenScreen live in Home1 stack (tab). Use root ref so navigation works from any nested stack.
  const navigateToHomeScreen = (screenName, params) => {
    const payload =
      params != null ? { screen: screenName, params } : { screen: screenName };
    if (navigationRef.current?.isReady?.()) {
      navigationRef.current.navigate('Root', {
        screen: 'Home1',
        params: payload,
      });
    } else {
      const tab = navigation.getParent?.();
      if (tab?.navigate) tab.navigate('Home1', payload);
      else
        navigation
          .getParent?.()
          ?.getParent?.()
          ?.navigate?.('Root', { screen: 'Home1', params: payload });
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
  const [shortsMenuItem, setShortsMenuItem] = useState(null);
  const [subscriptionMap, setSubscriptionMap] = useState({});
  const [subsModalOpen, setSubsModalOpen] = useState(false);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsUsers, setSubsUsers] = useState([]);
  const [subsError, setSubsError] = useState('');
  const [editShortVisible, setEditShortVisible] = useState(false);
  const [editShortTitle, setEditShortTitle] = useState('');
  const [editShortText, setEditShortText] = useState('');
  const [editShortTargetId, setEditShortTargetId] = useState(null);
  const [editShortThumbnailUri, setEditShortThumbnailUri] = useState('');
  const [editShortVideoUri, setEditShortVideoUri] = useState('');
  const [editShortVisibility, setEditShortVisibility] = useState('Public');
  const [editShortAudience, setEditShortAudience] = useState({
    madeForKids: null,
    ageRestricted: null,
  });
  const [editShortComments, setEditShortComments] = useState(
    'Allow all comments',
  );
  const [editShortScheduleDate, setEditShortScheduleDate] = useState(null);
  const [editVisibilityModalVisible, setEditVisibilityModalVisible] =
    useState(false);
  const [editAudienceModalVisible, setEditAudienceModalVisible] =
    useState(false);
  const [editCommentsModalVisible, setEditCommentsModalVisible] =
    useState(false);
  const [editScheduleModalVisible, setEditScheduleModalVisible] =
    useState(false);
  const [editShortSubmitting, setEditShortSubmitting] = useState(false);

  const hasAvatarInShort = useCallback(shortItem => {
    const s = shortItem || {};
    const u = s.user && typeof s.user === 'object' ? s.user : {};
    const p0 =
      Array.isArray(u.photos) && u.photos.length > 0 ? u.photos[0] : null;
    const sp0 =
      Array.isArray(s.photos) && s.photos.length > 0 ? s.photos[0] : null;
    const sCa = s.channelAvatar;
    return !!(
      s.avatar ||
      (typeof sCa === 'string' ? sCa : sCa?.src || sCa?.uri) ||
      s.profileImage ||
      s.photoUrl ||
      (typeof sp0 === 'string' ? sp0 : sp0?.src) ||
      u.avatar ||
      u.channelAvatar ||
      u.profileImage ||
      u.photoUrl ||
      (typeof p0 === 'string' ? p0 : p0?.src)
    );
  }, []);

  const enrichShortsWithProfile = useCallback(
    async rawShorts => {
      const arr = Array.isArray(rawShorts) ? rawShorts : [];
      const missingOwnerIds = Array.from(
        new Set(
          arr
            .filter(s => !hasAvatarInShort(s))
            .map(s => s?.userId || s?.user?.id)
            .filter(Boolean)
            .map(String),
        ),
      );
      if (!missingOwnerIds.length) return arr;

      const profileById = {};
      await Promise.allSettled(
        missingOwnerIds.map(async oid => {
          try {
            profileById[oid] = await getChannelProfile(oid, user?.id);
          } catch (_) {
            profileById[oid] = null;
          }
        }),
      );

      return arr.map(s => {
        if (hasAvatarInShort(s)) return s;
        const oid = String(s?.userId || s?.user?.id || '');
        const p = profileById[oid];
        if (!p) return s;
        const p0 =
          Array.isArray(p?.photos) && p.photos.length > 0 ? p.photos[0] : null;
        const pPhoto =
          typeof p0 === 'string'
            ? p0
            : p0?.src || p?.channelAvatar || p?.profileImage || null;
        const u = s?.user && typeof s.user === 'object' ? s.user : {};
        return {
          ...s,
          userId: s?.userId || u?.id || p?.id,
          user: {
            ...u,
            id: u?.id || s?.userId || p?.id,
            nickname: u?.nickname || p?.nickname || p?.name || s?.nickname,
            name: u?.name || p?.name || p?.nickname || s?.name,
            avatar: u?.avatar || pPhoto,
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
          },
        };
      });
    },
    [hasAvatarInShort, user?.id],
  );

  const screenHeight = windowHeight;
  const displayVideos = videos.length > 0 ? videos : MOCK_VIDEOS;

  useEffect(() => {
    loadShorts();
  }, []);

  // When opened from Home with a specific short, put that short first
  useEffect(() => {
    if (!initialShortId) return;
    hasAppliedInitialShort.current = false;
  }, [initialShortId, initialShortItem]);

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
        const patchedClicked =
          initialShortItem && String(initialShortItem.id) === String(clicked.id)
            ? mapShortToItem({
                ...clicked,
                ...initialShortItem,
                user: {
                  ...(clicked?.user && typeof clicked.user === 'object'
                    ? clicked.user
                    : {}),
                  ...(initialShortItem?.user &&
                  typeof initialShortItem.user === 'object'
                    ? initialShortItem.user
                    : {}),
                },
                id: clicked.id,
              })
            : clicked;
        const rest = videos.filter((_, i) => i !== idx);
        setVideos([patchedClicked, ...rest]);
        setActiveVideoIndex(0);
      } else if (idx === 0) {
        if (
          initialShortItem &&
          String(initialShortItem.id) === String(videos[0]?.id)
        ) {
          const patched = mapShortToItem({
            ...videos[0],
            ...initialShortItem,
            user: {
              ...(videos[0]?.user && typeof videos[0].user === 'object'
                ? videos[0].user
                : {}),
              ...(initialShortItem?.user &&
              typeof initialShortItem.user === 'object'
                ? initialShortItem.user
                : {}),
            },
            id: videos[0].id,
          });
          const rest = videos.slice(1);
          setVideos([patched, ...rest]);
        }
        setActiveVideoIndex(0);
      } else if (initialShortItem) {
        const patched = mapShortToItem(initialShortItem);
        setVideos([patched, ...videos]);
        setActiveVideoIndex(0);
      }
      hasAppliedInitialShort.current = true;
    }
  }, [loading, videos, initialShortId, initialShortItem]);

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
        const enriched = await enrichShortsWithProfile(filtered);
        setVideos(enriched.map(mapShortToItem));
      } else {
        setVideos(MOCK_VIDEOS);
      }
    } catch (e) {
      setVideos(MOCK_VIDEOS);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (item, opts = {}) => {
    if (!user?.id) {
      navigateToHomeScreen('HomeSevenScreen');
      return;
    }
    const forceLike = opts?.forceLike === true;
    if (forceLike && item?.isLiked) return;
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

  const menuTargetShort = () => shortsMenuItem || activeItem;
  const isOwnMenuTargetShort = (() => {
    const t = menuTargetShort();
    const ownerId = t?.user?.id ?? t?.userId ?? null;
    return !!(user?.id && ownerId && String(user.id) === String(ownerId));
  })();

  const handleSaveToWatchLater = async () => {
    const t = menuTargetShort();
    if (!user?.id || !t?.id) {
      Toast.show({ type: 'info', text1: 'Please log in to save' });
      setSettingsVisible(false);
      navigateToHomeScreen('HomeSevenScreen');
      return;
    }
    try {
      await setPlaylist(user.id, 'watch_later', 'short', t.id, true);
      Toast.show({ type: 'success', text1: 'Saved to Watch Later' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to save' });
    }
  };

  const handleDownloadShort = async () => {
    const t = menuTargetShort();
    const url = t?.videoUrl;
    if (!url || !String(url).trim()) {
      Toast.show({ type: 'info', text1: 'No video link available' });
      return;
    }
    try {
      await Share.share({ message: String(url), url: String(url) });
    } catch (e) {
      if (e?.message !== 'User did not share') {
        try {
          await Linking.openURL(String(url));
        } catch (_) {
          Toast.show({ type: 'error', text1: 'Could not open video' });
        }
      }
    }
  };

  const handleNotInterestedShort = () => {
    const t = menuTargetShort();
    if (!t?.id) return;
    setVideos(prev => {
      const next = prev.filter(v => String(v.id) !== String(t.id));
      return next.length > 0 ? next : prev;
    });
    Toast.show({ type: 'info', text1: "Got it — we'll show fewer like this" });
  };

  const openReportFromMenu = () => {
    if (!user?.id) {
      navigateToHomeScreen('HomeSevenScreen');
      return;
    }
    setReportVisible(true);
  };

  const openEditShortFromMenu = () => {
    const t = menuTargetShort();
    if (!user?.id || !t?.id) {
      navigateToHomeScreen('HomeSevenScreen');
      return;
    }
    const ownerId = t?.user?.id ?? t?.userId ?? null;
    if (!ownerId || String(ownerId) !== String(user.id)) return;
    setEditShortTargetId(String(t.id));
    setEditShortTitle(String(t?.title || t?.description || '').trim());
    setEditShortText(String(t?.description || t?.title || '').trim());
    setEditShortThumbnailUri(
      String(t?.thumbnailUrl || t?.thumbnail || t?.coverUrl || '').trim(),
    );
    setEditShortVideoUri(String(t?.videoUrl || t?.mediaUrl || '').trim());
    setEditShortVisibility(
      String(t?.visibility || '').toLowerCase() === 'private'
        ? 'Private'
        : 'Public',
    );
    setEditShortComments(
      String(t?.commentSetting || '').toLowerCase() === 'disable'
        ? 'Disable comments'
        : String(t?.commentSetting || '').toLowerCase() === 'hold'
          ? 'Hold potentially inappropriate comments'
          : 'Allow all comments',
    );
    setEditShortAudience({
      madeForKids:
        typeof t?.madeForKids === 'boolean' ? Boolean(t.madeForKids) : null,
      ageRestricted:
        typeof t?.ageRestricted === 'boolean' ? Boolean(t.ageRestricted) : null,
    });
    setEditShortScheduleDate(
      t?.scheduledPublishAt ? new Date(t.scheduledPublishAt) : null,
    );
    setEditShortVisible(true);
  };

  const pickEditShortThumbnail = async () => {
    const res = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.9,
      selectionLimit: 1,
    });
    const asset = res?.assets?.[0];
    if (asset?.uri) setEditShortThumbnailUri(asset.uri);
  };

  const pickEditShortVideo = async () => {
    const res = await launchImageLibrary({
      mediaType: 'video',
      quality: 1,
      selectionLimit: 1,
    });
    const asset = res?.assets?.[0];
    if (asset?.uri) setEditShortVideoUri(asset.uri);
  };

  const submitEditShortFromMenu = async () => {
    if (!editShortTargetId || !user?.id) return;
    const nextTitle = String(editShortTitle || '').trim();
    const nextText = String(editShortText || '').trim();
    if (!nextTitle && !nextText) {
      Toast.show({ type: 'info', text1: 'Add title or description' });
      return;
    }
    try {
      setEditShortSubmitting(true);
      await shortsService.updateShort(editShortTargetId, user.id, {
        title: nextTitle || undefined,
        description: nextText || undefined,
        thumbnailUrl: String(editShortThumbnailUri || '').trim() || undefined,
        videoUrl: String(editShortVideoUri || '').trim() || undefined,
        mediaUrl: String(editShortVideoUri || '').trim() || undefined,
        visibility: mapVisibilityForApi(editShortVisibility),
        commentSetting: mapCommentsForApi(editShortComments),
        ...(editShortAudience?.madeForKids != null && {
          madeForKids: Boolean(editShortAudience.madeForKids),
        }),
        ...(editShortAudience?.ageRestricted != null && {
          ageRestricted: Boolean(editShortAudience.ageRestricted),
        }),
        ...(editShortScheduleDate instanceof Date && {
          scheduledPublishAt: editShortScheduleDate.toISOString(),
        }),
      });
      setVideos(prev =>
        prev.map(v =>
          String(v.id) === String(editShortTargetId)
            ? {
                ...v,
                description: nextText || v.description,
                title: nextTitle || v.title,
                thumbnailUrl: editShortThumbnailUri || v.thumbnailUrl,
                thumbnail: editShortThumbnailUri || v.thumbnail,
                coverUrl: editShortThumbnailUri || v.coverUrl,
                videoUrl: editShortVideoUri || v.videoUrl,
                mediaUrl: editShortVideoUri || v.mediaUrl,
                visibility: mapVisibilityForApi(editShortVisibility),
                commentSetting: mapCommentsForApi(editShortComments),
                madeForKids:
                  editShortAudience?.madeForKids != null
                    ? Boolean(editShortAudience.madeForKids)
                    : v.madeForKids,
                ageRestricted:
                  editShortAudience?.ageRestricted != null
                    ? Boolean(editShortAudience.ageRestricted)
                    : v.ageRestricted,
                scheduledPublishAt:
                  editShortScheduleDate instanceof Date
                    ? editShortScheduleDate.toISOString()
                    : v.scheduledPublishAt,
              }
            : v,
        ),
      );
      Toast.show({ type: 'success', text1: 'Short updated' });
      setEditShortVisible(false);
      setEditShortTargetId(null);
    } catch (e) {
      Toast.show({
        type: 'error',
        text1: e?.message || 'Failed to update short',
      });
    } finally {
      setEditShortSubmitting(false);
    }
  };

  const handleDeleteShortFromMenu = () => {
    const t = menuTargetShort();
    if (!user?.id || !t?.id) {
      navigateToHomeScreen('HomeSevenScreen');
      return;
    }
    const ownerId = t?.user?.id ?? t?.userId ?? null;
    if (!ownerId || String(ownerId) !== String(user.id)) return;
    Alert.alert('Delete Short', 'Are you sure you want to delete this short?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await shortsService.deleteShort(t.id, user.id);
            setVideos(prev => prev.filter(v => String(v.id) !== String(t.id)));
            setActiveVideoIndex(prev => Math.max(0, prev - 1));
            Toast.show({ type: 'success', text1: 'Short deleted' });
          } catch (e) {
            Toast.show({
              type: 'error',
              text1: e?.message || 'Failed to delete short',
            });
          }
        },
      },
    ]);
  };

  const openSubscribersModal = async ownerIdToLoad => {
    if (!user?.token) {
      navigateToHomeScreen('HomeSevenScreen');
      return;
    }
    if (!ownerIdToLoad) return;
    setSubsModalOpen(true);
    setSubsLoading(true);
    setSubsError('');
    try {
      const res = await listMySubscribersWhoOrderedFromOwner(
        user.token,
        ownerIdToLoad,
      );
      setSubsUsers(Array.isArray(res?.items) ? res.items : []);
    } catch (e) {
      setSubsUsers([]);
      setSubsError(e?.message || 'Failed to load subscribers');
    } finally {
      setSubsLoading(false);
    }
  };

  const handleReportSubmit = async reason => {
    const t = menuTargetShort();
    if (!t?.id) {
      setReportVisible(false);
      return;
    }
    try {
      await submitReport({
        contentType: 'short',
        contentId: t.id,
        reason,
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
              onOpenMoreMenu={item => {
                setShortsMenuItem(item);
                setSettingsVisible(true);
              }}
              onOpenCreate={() => setCreateVisible(true)}
              onLike={handleLike}
              onDislike={handleDislike}
              onSubscribe={handleSubscribe}
              onShare={handleShare}
              onOrderNow={params =>
                navigateToHomeScreen('HomeThreeScreen', params)
              }
              onLoginPress={params =>
                navigateToHomeScreen('HomeSevenScreen', params)
              }
              onSubscribersPress={openSubscribersModal}
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
      <Modal
        animationType="slide"
        transparent
        visible={subsModalOpen}
        onRequestClose={() => setSubsModalOpen(false)}
      >
        <Pressable
          style={styles.subsBackdrop}
          onPress={() => setSubsModalOpen(false)}
        />
        <View
          style={[
            styles.subsSheet,
            { paddingBottom: Math.max(16, (insets?.bottom || 0) + 10) },
          ]}
        >
          <View style={styles.subsHandle} />
          <View style={styles.subsHeaderRow}>
            <Text style={styles.subsTitle} numberOfLines={2}>
              {!subsLoading && subsUsers.length > 0
                ? buildSubscribersOrderLine(
                    firstNameFromSubscriber(subsUsers[0]),
                    subsUsers.length,
                  )
                : 'Subscribers Order'}
            </Text>
            <TouchableOpacity
              onPress={() => setSubsModalOpen(false)}
              style={styles.subsCloseBtn}
            >
              <Icon name="close" size={20} color="#111" />
            </TouchableOpacity>
          </View>

          {subsLoading ? (
            <View style={styles.subsLoadingWrap}>
              <ActivityIndicator size="small" color="#111" />
              <Text style={styles.subsHint}>Loading…</Text>
            </View>
          ) : subsError ? (
            <Text style={styles.subsErrorText}>{subsError}</Text>
          ) : subsUsers.length === 0 ? (
            <Text style={styles.subsHint}>
              No subscribers ordered from this restaurant yet.
            </Text>
          ) : (
            <FlatList
              data={subsUsers}
              keyExtractor={(u, idx) => String(u?.id || idx)}
              renderItem={({ item: u }) => {
                const displayName =
                  u?.name || u?.nickname || u?.email || 'User';
                const avatar = safeImageUri(
                  u?.avatar,
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(
                    displayName,
                  )}&background=111&color=fff`,
                );
                return (
                  <TouchableOpacity
                    style={styles.subsRow}
                    activeOpacity={0.85}
                    onPress={() => {
                      setSubsModalOpen(false);
                      if (u?.id)
                        navigation.navigate('UserViewsScreen', {
                          userId: u.id,
                        });
                    }}
                  >
                    <Image source={{ uri: avatar }} style={styles.subsAvatar} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subsName} numberOfLines={1}>
                        {displayName}
                      </Text>
                      {!!u?.email ? (
                        <Text style={styles.subsSubText} numberOfLines={1}>
                          {u.email}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              }}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
            />
          )}
        </View>
      </Modal>
      <ShortsMoreOptionsModal
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onSaveToPlaylist={() => {
          if (!user?.id) {
            navigateToHomeScreen('HomeSevenScreen');
            return;
          }
          setSaveModalVisible(true);
        }}
        onSaveToWatchLater={handleSaveToWatchLater}
        onDownload={handleDownloadShort}
        onShare={() => handleShare(menuTargetShort())}
        onNotInterested={handleNotInterestedShort}
        onReport={openReportFromMenu}
        onEdit={openEditShortFromMenu}
        onDelete={handleDeleteShortFromMenu}
        hideNotInterested={isOwnMenuTargetShort}
        hideReport={isOwnMenuTargetShort}
        showOwnerActions={isOwnMenuTargetShort}
      />
      <Modal
        animationType="slide"
        transparent={false}
        visible={editShortVisible}
        onRequestClose={() => setEditShortVisible(false)}
      >
        <View style={styles.editFullContainer}>
          <View style={styles.editHeader}>
            <TouchableOpacity
              onPress={() => setEditShortVisible(false)}
              style={styles.editHeaderBtn}
            >
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.editHeaderTitle}>Add Details</Text>
            <TouchableOpacity style={styles.editHeaderBtn}>
              <Ionicons
                name="ellipsis-horizontal-circle-outline"
                size={24}
                color="#000"
              />
            </TouchableOpacity>
          </View>
          <View style={styles.editContent}>
            <View style={styles.editTopSection}>
              <TouchableOpacity
                style={styles.editCoverContainer}
                onPress={pickEditShortThumbnail}
              >
                <Image
                  source={{
                    uri: safeImageUri(
                      editShortThumbnailUri,
                      'https://images.unsplash.com/photo-1611162616475-46b635cb6868?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80',
                    ),
                  }}
                  style={styles.editCoverImage}
                />
                <View style={styles.editSelectCoverOverlay}>
                  <Text style={styles.editSelectCoverText}>Select Cover</Text>
                </View>
              </TouchableOpacity>
              <View style={styles.editCaptionContainer}>
                <TextInput
                  value={editShortText}
                  onChangeText={setEditShortText}
                  style={styles.editCaptionInput}
                  placeholder="Caption your shorts..."
                  placeholderTextColor="#999"
                  multiline
                  editable={!editShortSubmitting}
                />
              </View>
            </View>
            <TextInput
              value={editShortTitle}
              onChangeText={setEditShortTitle}
              style={styles.editTitleInput}
              placeholder="Title"
              placeholderTextColor="#999"
              editable={!editShortSubmitting}
            />
            {editShortVideoUri ? (
              <View style={styles.editVideoSelectedRow}>
                <Ionicons name="checkmark-circle" size={20} color="#12B76A" />
                <Text style={styles.editVideoSelectedText}>Video selected</Text>
              </View>
            ) : null}
            <View style={styles.editOptionsList}>
              <TouchableOpacity
                style={styles.editOptionItem}
                onPress={() => setEditVisibilityModalVisible(true)}
              >
                <View style={styles.editOptionLeft}>
                  <Ionicons name="eye-outline" size={22} color="#333" />
                  <Text style={styles.editOptionLabel}>Visibility</Text>
                </View>
                <View style={styles.editOptionRight}>
                  <Text style={styles.editOptionValue}>{editShortVisibility}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#333" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editOptionItem}
                onPress={() => setEditAudienceModalVisible(true)}
              >
                <View style={styles.editOptionLeft}>
                  <Ionicons name="people-outline" size={22} color="#333" />
                  <Text style={styles.editOptionLabel}>Select Audience</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editOptionItem}
                onPress={() => setEditScheduleModalVisible(true)}
              >
                <View style={styles.editOptionLeft}>
                  <Ionicons name="calendar-outline" size={22} color="#333" />
                  <Text style={styles.editOptionLabel}>Schedule</Text>
                </View>
                <View style={styles.editOptionRight}>
                  <Text style={styles.editOptionValue}>
                    {editShortScheduleDate instanceof Date
                      ? editShortScheduleDate.toLocaleDateString()
                      : 'Now'}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#333" />
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editOptionItem}
                onPress={() => setEditCommentsModalVisible(true)}
              >
                <View style={styles.editOptionLeft}>
                  <Ionicons
                    name="chatbubble-ellipses-outline"
                    size={22}
                    color="#333"
                  />
                  <Text style={styles.editOptionLabel}>Comments</Text>
                </View>
                <View style={styles.editOptionRight}>
                  <Text style={styles.editOptionValue} numberOfLines={1}>
                    {editShortComments}
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="#333" />
                </View>
              </TouchableOpacity>
            </View>
            <View style={styles.editMediaRow}>
              <TouchableOpacity
                style={styles.editMediaBtn}
                onPress={pickEditShortThumbnail}
                disabled={editShortSubmitting}
              >
                <Text style={styles.editMediaBtnText}>Change Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editMediaBtn}
                onPress={pickEditShortVideo}
                disabled={editShortSubmitting}
              >
                <Text style={styles.editMediaBtnText}>Change Video</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.editFooter}>
            <TouchableOpacity
              style={styles.editUploadBtn}
              onPress={submitEditShortFromMenu}
              disabled={editShortSubmitting}
            >
              <Text style={styles.editUploadBtnText}>
                {editShortSubmitting ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>
          <SetVisibilityModal
            visible={editVisibilityModalVisible}
            onClose={() => setEditVisibilityModalVisible(false)}
            initialValue={editShortVisibility}
            onApply={v => setEditShortVisibility(v)}
          />
          <SelectAudienceModal
            visible={editAudienceModalVisible}
            onClose={() => setEditAudienceModalVisible(false)}
            initialValue={editShortAudience}
            onApply={v => setEditShortAudience(v)}
          />
          <CommentsSettingsModal
            visible={editCommentsModalVisible}
            onClose={() => setEditCommentsModalVisible(false)}
            initialValue={editShortComments}
            onApply={v => setEditShortComments(v)}
          />
          <VideoScheduleModal
            visible={editScheduleModalVisible}
            onClose={() => setEditScheduleModalVisible(false)}
            initialDate={editShortScheduleDate}
            onSelectNow={() => setEditShortScheduleDate(null)}
            onConfirmDate={d => setEditShortScheduleDate(d)}
          />
        </View>
      </Modal>
      <SaveModal
        visible={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
        contentType="short"
        contentId={menuTargetShort()?.id}
      />
      <CreateVideoModal
        visible={createVisible}
        onClose={() => setCreateVisible(false)}
      />

      <ShortsReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        onSubmit={handleReportSubmit}
      />
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
  ownerProfileAction: {
    marginBottom: 14,
    alignItems: 'center',
  },
  ownerAvatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#FFF',
    overflow: 'visible',
    backgroundColor: '#222',
  },
  ownerAvatar: {
    width: '100%',
    height: '100%',
    borderRadius: 21,
  },
  ownerPlusBadge: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -10,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF2D55',
    borderWidth: 1.5,
    borderColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionItem: {
    marginBottom: 12,
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
    paddingBottom: 22,
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
    marginBottom: 0,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 10,
  },
  descBlock: {
    width: '100%',
    marginBottom: 8,
    position: 'relative',
  },
  descMeasureHidden: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    top: 0,
    zIndex: -1,
  },
  videoDescExpanded: { marginBottom: 4 },
  descEllipsisSameLine: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 15,
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 8,
  },
  moreInlineTap: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 8,
  },
  viewLessLink: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    textDecorationLine: 'underline',
    textShadowColor: 'rgba(0, 0, 0, 0.75)',
    textShadowOffset: { width: -1, height: 1 },
    textShadowRadius: 6,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
  audioTitleFlex: {
    flex: 1,
    minWidth: 0,
    marginLeft: 5,
    marginRight: 4,
  },
  muteToggle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 6,
    zIndex: 50,
    elevation: 50,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  progressTimeText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    minWidth: 38,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  progressSlider: {
    flex: 1,
    height: 36,
  },
  audioText: {
    color: '#FFF',
    fontSize: 13,
    marginLeft: 5,
    marginRight: 10,
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
  subsBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  subsSheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    maxHeight: windowHeight * 0.55,
    backgroundColor: '#FFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  subsHandle: {
    alignSelf: 'center',
    width: 46,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#E0E0E0',
    marginBottom: 10,
  },
  subsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  subsTitle: { fontSize: 16, fontWeight: '800', color: '#111' },
  subsCloseBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4F4F4',
  },
  subsLoadingWrap: { paddingVertical: 18, alignItems: 'center', gap: 8 },
  subsHint: {
    color: '#666',
    fontSize: 13,
    paddingVertical: 10,
    textAlign: 'center',
  },
  subsErrorText: {
    color: '#D32F2F',
    fontSize: 13,
    paddingVertical: 10,
    textAlign: 'center',
  },
  subsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  subsAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEE',
  },
  subsName: { color: '#111', fontSize: 14, fontWeight: '700' },
  subsSubText: { color: '#777', fontSize: 12, marginTop: 2 },
  resOrderBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 8,
    flexShrink: 0,
  },
  /** Clears Reels-style icon column on the right */
  resOrderBtnFooter: {
    marginRight: 54,
  },
  resOrderText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  editFullContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  editHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  editHeaderBtn: {
    padding: 4,
  },
  editHeaderTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  editContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  editTopSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  editCoverContainer: {
    width: 100,
    height: 150,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#f2f2f2',
  },
  editCoverImage: {
    width: '100%',
    height: '100%',
  },
  editSelectCoverOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    paddingVertical: 4,
  },
  editSelectCoverText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  editCaptionContainer: {
    flex: 1,
    marginLeft: 12,
    minHeight: 150,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 10,
  },
  editCaptionInput: {
    color: '#222',
    fontSize: 14,
    textAlignVertical: 'top',
    minHeight: 120,
  },
  editTitleInput: {
    borderWidth: 1,
    borderColor: '#E6E6E6',
    borderRadius: 10,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#222',
  },
  editVideoSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  editVideoSelectedText: {
    color: '#12B76A',
    marginLeft: 6,
    fontSize: 14,
  },
  editOptionsList: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  editOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f4f4f4',
  },
  editOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editOptionLabel: {
    color: '#222',
    fontSize: 16,
    fontWeight: '500',
  },
  editOptionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '60%',
  },
  editOptionValue: {
    color: '#666',
    fontSize: 14,
    marginRight: 8,
  },
  editMediaRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  editMediaBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#FFD5A0',
    backgroundColor: '#FFF5E8',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  editMediaBtnText: {
    color: '#E26A00',
    fontWeight: '700',
    fontSize: 12,
  },
  editFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  editUploadBtn: {
    backgroundColor: '#FF8C00',
    borderRadius: 26,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editUploadBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ShortsVideoScreen;
