/* eslint-disable react-native/no-inline-styles */
import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Platform,
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
import VideoCoverPickerModal from '../components/VideoCoverPickerModal';
import { shortsService } from '../services/shortsService';
import {
  getChannelProfile,
  subscribeToChannel,
  unsubscribeFromChannel,
} from '../services/channelService';
import { setPlaylist } from '../services/playlistService';
import { downloadVideo } from '../services/downloadService';
import { submitReport } from '../services/reportService';
import Toast from 'react-native-toast-message';
import { navigationRef, safeImageUri, isLocalMediaUri } from '../utils/helper';
import { buildContentShareMessage } from '../utils/contentLinks';
import { setShortsMuted } from '../redux/actions/appSlice';
import { listMySubscribersWhoOrderedFromOwner } from '../services/orderService';
import { normalizeShortVideoUrl } from '../utils/normalizeShortVideoUrl';
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

const extractShortPayload = payload => {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.short && typeof payload.short === 'object') return payload.short;
  if (payload.data && typeof payload.data === 'object') return payload.data;
  return payload;
};

const isRemoteMediaUri = uri => {
  const raw = String(uri || '')
    .trim()
    .toLowerCase();
  return raw.startsWith('http://') || raw.startsWith('https://');
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

// No mock/sample shorts — empty feed shows a real empty state.

const VideoItem = ({
  item,
  isActive,
  shouldRenderVideo,
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
  onDoubleTapRecordView,
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
  const [videoError, setVideoError] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);
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
    setVideoError(null);
    setDuration(0);
    setCurrentTime(0);
  }, [item.id]);

  // Manage play/pause based on active state
  useEffect(() => {
    setPaused(!isActive);
  }, [isActive]);

  useEffect(() => {
    if (isActive) setVideoError(null);
  }, [isActive, item.videoUrl]);

  useEffect(() => {
    return () => {
      if (singleTapTimerRef.current) {
        clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
    };
  }, []);

  const togglePause = () => {
    setPaused(prev => !prev);
  };

  const retryVideo = () => {
    setVideoError(null);
    setDuration(0);
    setCurrentTime(0);
    setReloadToken(t => t + 1);
    setPaused(false);
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
      // Double tap: like + record an extra view (scroll dedupe does not apply)
      onLike?.(item, { forceLike: true });
      onDoubleTapRecordView?.(item);
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
  const playUri = normalizeShortVideoUrl(item.videoUrl);
  const posterUri = safeImageUri(
    item.thumbnailUrl || item.coverUrl || item.thumb || item.img || null,
    null,
  );
  const ownerId = item.user?.id ?? item.userId ?? null;
  const isOwnShort = !!(
    currentUser?.id &&
    ownerId &&
    String(currentUser.id) === String(ownerId)
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
      {hasValidVideo && shouldRenderVideo ? (
        <Video
          key={`${item.id}-${reloadToken}`}
          ref={videoRef}
          source={{ uri: playUri }}
          poster={posterUri || undefined}
          posterResizeMode="cover"
          style={styles.video}
          resizeMode="cover"
          repeat
          paused={paused || !!videoError}
          muted={!!shortsMuted}
          controls={false}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          onLoadStart={() => {
            setVideoError(null);
          }}
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
            setVideoError(null);
          }}
          onError={e => {
            const msg =
              e?.error?.errorString ||
              e?.error?.localizedDescription ||
              e?.error?.errorException ||
              'Video failed to load';
            setVideoError(String(msg));
          }}
          onProgress={data => {
            if (!isActive || paused || videoError) return;
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

      {!!videoError && hasValidVideo && shouldRenderVideo && (
        <View style={styles.videoErrorOverlay} pointerEvents="box-none">
          <Text style={styles.videoErrorText}>Video unavailable</Text>
          <TouchableOpacity
            style={styles.videoRetryBtn}
            onPress={retryVideo}
            activeOpacity={0.85}
          >
            <Icon name="refresh" size={18} color="#FFF" />
            <Text style={styles.videoRetryText}>Retry</Text>
          </TouchableOpacity>
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
          onPress={async () => {
            if (!ownerId) return;
            if (showFollowPlus) {
              onSubscribe?.(item);
              return;
            }
            let targetRole = String(
              item?.creatorRole || item?.user?.role || '',
            ).toLowerCase();
            if (!targetRole) {
              try {
                const p = await getChannelProfile(ownerId, user?.id);
                targetRole = String(p?.role || '').toLowerCase();
              } catch (_) {}
            }
            if (targetRole === 'user') {
              navigation.navigate('Root', {
                screen: 'Home1',
                params: {
                  screen: 'PromotionScreen',
                  params: { userId: ownerId },
                },
              });
            } else {
              navigation.navigate('UserViewsScreen', { userId: ownerId });
            }
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
          onPress={async () => {
            const ownerId = item.user?.id ?? item.userId ?? null;
            if (ownerId) {
              let targetRole = String(
                item?.creatorRole || item?.user?.role || '',
              ).toLowerCase();
              if (!targetRole) {
                try {
                  const p = await getChannelProfile(ownerId, user?.id);
                  targetRole = String(p?.role || '').toLowerCase();
                } catch (_) {}
              }
              if (targetRole === 'user') {
                navigation.navigate('Root', {
                  screen: 'Home1',
                  params: {
                    screen: 'PromotionScreen',
                    params: { userId: ownerId },
                  },
                });
              } else {
                navigation.navigate('UserViewsScreen', { userId: ownerId });
              }
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
              style={[
                styles.audioText,
                !currentUser?.token || item.creatorRole === 'owner'
                  ? styles.audioTitleFlex
                  : styles.audioTitleInline,
              ]}
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
          {!currentUser?.token ? (
            <TouchableOpacity
              style={[styles.resOrderBtn, styles.resOrderBtnFooter]}
              onPress={() => {
                onLoginPress?.();
              }}
            >
              <Text style={styles.resOrderText}>Order Now</Text>
            </TouchableOpacity>
          ) : item.creatorRole === 'owner' && !isOwnShort ? (
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
          ) : null}
        </View>
        {/* bottom arrow removed */}
      </View>
    </View>
  );
};

/** Prefer UI-mapped fields so re-merge (after optimistic updates) does not reset counts */
const mapShortToItem = s => {
  const likesCount =
    s._likeCount != null && Number.isFinite(Number(s._likeCount))
      ? Number(s._likeCount)
      : s._count?.likes ?? s.likeCount ?? 0;
  const dislikesCount =
    s._dislikeCount != null && Number.isFinite(Number(s._dislikeCount))
      ? Number(s._dislikeCount)
      : s.dislikeCount ?? 0;
  const commentsCount =
    s._commentCount != null && Number.isFinite(Number(s._commentCount))
      ? Number(s._commentCount)
      : s._count?.comments ?? s.commentCount ?? 0;
  const sharesCount =
    s._shareCount != null && Number.isFinite(Number(s._shareCount))
      ? Number(s._shareCount)
      : s.shareCount ?? 0;
  const viewCount =
    s._viewCount != null && Number.isFinite(Number(s._viewCount))
      ? Number(s._viewCount)
      : s.viewCount ?? s._count?.views ?? 0;
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
    videoUrl: normalizeShortVideoUrl(s.videoUrl || s.mediaUrl || ''),
    thumbnailUrl: s.thumbnailUrl || s.coverUrl || s.thumb || s.img || '',
    user: {
      id: user.id || s.userId,
      username,
      avatar,
      isSubscribed:
        typeof user.isSubscribed === 'boolean'
          ? user.isSubscribed
          : !!s.isSubscribed,
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
  const playerSessionId = route.params?.playerSessionId;
  /** When 'owner' + scopedShortsFeed, vertical feed is only that channel's shorts (profile / promotion / user view). */
  const shortsFeedMode = route.params?.shortsFeedMode;
  const scopedShortsFeedParam = route.params?.scopedShortsFeed;
  const returnTo = route.params?.returnTo;
  const returnUserId = route.params?.returnUserId;
  const user = useSelector(state => state?.app?.user);

  const handleShortsBack = useCallback(() => {
    if (navigation.canGoBack?.()) {
      navigation.goBack();
      return;
    }
    if (returnTo === 'user_views' && returnUserId) {
      navigation.navigate('UserViewsScreen', { userId: returnUserId });
      return;
    }
    if (returnTo === 'business_profile' && returnUserId) {
      navigation.navigate('BusinessProfileViewScreen', {
        userId: returnUserId,
      });
      return;
    }
    // This screen can be the first route when opened from a deep link or the
    // Shorts tab. In that case GO_BACK is unhandled, so return to Home instead.
    if (navigationRef.current?.isReady?.()) {
      navigationRef.current.navigate('Root', {
        screen: 'Home1',
        params: { screen: 'HomeScreen' },
      });
      return;
    }
    navigation.getParent?.()?.navigate?.('Home1', { screen: 'HomeScreen' });
  }, [navigation, returnTo, returnUserId]);
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  /** Bumps each time we focus with a deep-linked short so record effect re-runs (same id reopen from Promotion). */
  const [deepLinkVisitSeq, setDeepLinkVisitSeq] = useState(0);
  const hasAppliedInitialShort = useRef(false);
  const listRef = useRef(null);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const SHORTS_PAGE_SIZE = 10;
  const [shortsPage, setShortsPage] = useState(1);
  const [hasMoreShorts, setHasMoreShorts] = useState(true);
  const [loadingMoreShorts, setLoadingMoreShorts] = useState(false);
  const loadingMoreShortsRef = useRef(false);

  const putInitialShortFirst = useCallback((mapped, targetId, seedItem) => {
    const list = Array.isArray(mapped) ? mapped : [];
    const tid = String(targetId || '').trim();
    const seedUrl = String(seedItem?.videoUrl || seedItem?.mediaUrl || '').trim();
    if (list.length === 0) return list;
    if (!tid && !seedUrl) return list;

    let idx = tid
      ? list.findIndex(v => String(v.id) === tid)
      : -1;
    if (idx < 0 && seedUrl) {
      idx = list.findIndex(
        v => String(v?.videoUrl || v?.mediaUrl || '').trim() === seedUrl,
      );
    }
    if (idx > 0) {
      const clicked = list[idx];
      const patchedClicked =
        seedItem && String(seedItem.id) === String(clicked.id)
          ? mapShortToItem({
              ...seedItem,
              ...clicked,
              user: {
                ...(seedItem?.user && typeof seedItem.user === 'object'
                  ? seedItem.user
                  : {}),
                ...(clicked?.user && typeof clicked.user === 'object'
                  ? clicked.user
                  : {}),
              },
              id: clicked.id,
            })
          : clicked;
      return [patchedClicked, ...list.filter((_, i) => i !== idx)];
    }
    if (idx === 0 && seedItem && String(seedItem.id) === String(list[0]?.id)) {
      const patched = mapShortToItem({
        ...seedItem,
        ...list[0],
        user: {
          ...(seedItem?.user && typeof seedItem.user === 'object'
            ? seedItem.user
            : {}),
          ...(list[0]?.user && typeof list[0].user === 'object'
            ? list[0].user
            : {}),
        },
        id: list[0].id,
      });
      return [patched, ...list.slice(1)];
    }
    if (idx < 0 && seedItem?.videoUrl) {
      return [mapShortToItem(seedItem), ...list];
    }
    return list;
  }, []);

  const applyViewIncrement = useCallback(shortId => {
    if (!shortId) return;
    setVideos(prev => {
      if (prev.length === 0) return prev;
      return prev.map(v => {
        if (String(v.id) !== String(shortId)) return v;
        const newCount = (v._viewCount ?? 0) + 1;
        return {
          ...v,
          _viewCount: newCount,
          viewsDisplay: formatCount(newCount),
        };
      });
    });
  }, []);

  const applyViewDecrement = useCallback(shortId => {
    if (!shortId) return;
    setVideos(prev => {
      if (prev.length === 0) return prev;
      return prev.map(v => {
        if (String(v.id) !== String(shortId)) return v;
        const newCount = Math.max(0, (v._viewCount ?? 0) - 1);
        return {
          ...v,
          _viewCount: newCount,
          viewsDisplay: formatCount(newCount),
        };
      });
    });
  }, []);

  /** Optimistic +1 on each time a short becomes visible (including revisits). */
  const recordShortViewAndBumpUI = useCallback(
    shortId => {
      if (!shortId) return;
      const sid = String(shortId);
      applyViewIncrement(sid);
      shortsService.recordView(sid, user?.id || null, 0, false).catch(() => {
        applyViewDecrement(sid);
      });
    },
    [user?.id, applyViewIncrement, applyViewDecrement],
  );

  /** Each double-tap: bump views (not deduped with scroll/open — user expects visible feedback) */
  const recordShortViewFromDoubleTap = useCallback(
    item => {
      if (!item?.id) return;
      const sid = String(item.id);
      applyViewIncrement(sid);
      shortsService.recordView(sid, user?.id || null, 0, false).catch(() => {
        applyViewDecrement(sid);
      });
    },
    [user?.id, applyViewIncrement, applyViewDecrement],
  );

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

  // When leaving this screen (pop), allow merge again on next entry with same navigator instance
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', () => {
      hasAppliedInitialShort.current = false;
    });
    return sub;
  }, [navigation]);

  // Each focus with a deep-linked short re-triggers view record (deps); tab switch does not clear dedupe so we do not double-count
  useFocusEffect(
    React.useCallback(() => {
      setIsScreenFocused(true);
      if (initialShortId) {
        setDeepLinkVisitSeq(s => s + 1);
      }
      return () => {
        setIsScreenFocused(false);
      };
    }, [initialShortId]),
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
  const [editShortComments, setEditShortComments] =
    useState('Allow all comments');
  const [editShortScheduleDate, setEditShortScheduleDate] = useState(null);
  const [editInitialHadFutureSchedule, setEditInitialHadFutureSchedule] =
    useState(false);
  const [editCoverPickerVisible, setEditCoverPickerVisible] = useState(false);
  const [editShortDurationSec, setEditShortDurationSec] = useState(15);
  const [editLocalThumbMeta, setEditLocalThumbMeta] = useState(null);
  const [editVideoPickMeta, setEditVideoPickMeta] = useState(null);
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
  const displayVideos = videos;
  const firstRowShortId = videos[0]?.id;

  // Keep only 1 short per user — like TikTok/Reels (each swipe = different user)
  const dedupeOnePerUser = useCallback((list, pinnedId) => {
    const seen = new Set();
    const result = [];
    for (const v of list) {
      const uid = String(v.userId || v.user?.id || v.id);
      if (String(v.id) === String(pinnedId ?? '')) {
        result.push(v);
        seen.add(uid);
        continue;
      }
      if (!seen.has(uid)) {
        seen.add(uid);
        result.push(v);
      }
    }
    return result;
  }, []);

  const loadShorts = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError('');
      setShortsPage(1);
      setHasMoreShorts(true);
      loadingMoreShortsRef.current = false;
      setLoadingMoreShorts(false);
      const useOwnerFeed =
        shortsFeedMode === 'owner' &&
        Array.isArray(scopedShortsFeedParam) &&
        scopedShortsFeedParam.length > 0;
      if (useOwnerFeed) {
        const filtered = scopedShortsFeedParam.filter(
          s => s?.videoUrl && String(s.videoUrl).trim(),
        );
        if (filtered.length === 0) {
          setVideos([]);
          setHasMoreShorts(false);
        } else {
          const enriched = await enrichShortsWithProfile(filtered);
          let mapped = enriched.map(mapShortToItem);
          if (initialShortId) {
            mapped = putInitialShortFirst(
              mapped,
              initialShortId,
              initialShortItem,
            );
          }
          setVideos(mapped);
          setActiveVideoIndex(0);
          hasAppliedInitialShort.current = true;
          setHasMoreShorts(false);
        }
      } else {
        const res = await shortsService.getShorts({
          page: 1,
          limit: SHORTS_PAGE_SIZE,
          viewerRole: user?.role || 'user',
          viewerUserId: user?.id,
        });
        if (res?.shorts?.length > 0) {
          const filtered = res.shorts.filter(
            s => s.videoUrl && String(s.videoUrl).trim(),
          );
          const enriched = await enrichShortsWithProfile(filtered);
          let mapped = enriched.map(mapShortToItem);
          if (initialShortId) {
            mapped = putInitialShortFirst(
              mapped,
              initialShortId,
              initialShortItem,
            );
          }
          // One short per user — like TikTok/Reels feed
          mapped = dedupeOnePerUser(mapped, initialShortId);
          setVideos(mapped);
          setActiveVideoIndex(0);
          hasAppliedInitialShort.current = !!initialShortId;
          const totalPages = Number(res?.pagination?.totalPages || 0);
          const pageNow = Number(res?.pagination?.page || 1);
          setShortsPage(pageNow);
          setHasMoreShorts(
            totalPages > 0
              ? pageNow < totalPages
              : filtered.length >= SHORTS_PAGE_SIZE,
          );
        } else {
          setVideos([]);
          setHasMoreShorts(false);
        }
      }
    } catch (e) {
      setVideos([]);
      setHasMoreShorts(false);
      setLoadError(
        e?.message ||
          'Could not load shorts right now. Please check your connection and try again.',
      );
    } finally {
      setLoading(false);
    }
  }, [
    enrichShortsWithProfile,
    initialShortId,
    initialShortItem,
    putInitialShortFirst,
    shortsFeedMode,
    scopedShortsFeedParam,
    user?.id,
    user?.role,
  ]);

  const loadMoreShorts = useCallback(async () => {
    if (
      shortsFeedMode === 'owner' ||
      !hasMoreShorts ||
      loading ||
      loadingMoreShortsRef.current
    ) {
      return;
    }
    loadingMoreShortsRef.current = true;
    setLoadingMoreShorts(true);
    const nextPage = shortsPage + 1;
    try {
      const res = await shortsService.getShorts({
        page: nextPage,
        limit: SHORTS_PAGE_SIZE,
        viewerRole: user?.role || 'user',
        viewerUserId: user?.id,
      });
      const incoming = (res?.shorts || []).filter(
        s => s.videoUrl && String(s.videoUrl).trim(),
      );
      if (incoming.length === 0) {
        setHasMoreShorts(false);
        return;
      }
      const enriched = await enrichShortsWithProfile(incoming);
      const mapped = enriched.map(mapShortToItem);
      setVideos(prev => {
        // Dedupe by short id AND by userId — one short per user across entire feed
        const seenIds = new Set(prev.map(v => String(v.id)));
        const seenUsers = new Set(
          prev.map(v => String(v.userId || v.user?.id || v.id)),
        );
        const unique = mapped.filter(v => {
          const vid = String(v.id);
          const uid = String(v.userId || v.user?.id || v.id);
          if (seenIds.has(vid) || seenUsers.has(uid)) return false;
          seenIds.add(vid);
          seenUsers.add(uid);
          return true;
        });
        return unique.length ? [...prev, ...unique] : prev;
      });
      const totalPages = Number(res?.pagination?.totalPages || 0);
      const pageNow = Number(res?.pagination?.page || nextPage);
      setShortsPage(pageNow);
      setHasMoreShorts(
        totalPages > 0
          ? pageNow < totalPages
          : incoming.length >= SHORTS_PAGE_SIZE,
      );
    } catch (_) {
      // Keep hasMore so user can retry by scrolling again.
    } finally {
      loadingMoreShortsRef.current = false;
      setLoadingMoreShorts(false);
    }
  }, [
    enrichShortsWithProfile,
    hasMoreShorts,
    loading,
    shortsFeedMode,
    shortsPage,
    user?.id,
    user?.role,
  ]);

  useEffect(() => {
    loadShorts();
  }, [loadShorts, playerSessionId]);

  // Prefetch next page when user is near the end of the vertical reel.
  useEffect(() => {
    if (!hasMoreShorts || loading || loadingMoreShorts) return;
    if (videos.length < 3) return;
    if (activeVideoIndex >= videos.length - 3) {
      loadMoreShorts();
    }
  }, [
    activeVideoIndex,
    videos.length,
    hasMoreShorts,
    loading,
    loadingMoreShorts,
    loadMoreShorts,
  ]);

  useEffect(() => {
    if (!initialShortId) return;
    hasAppliedInitialShort.current = false;
    setActiveVideoIndex(0);
  }, [initialShortId, playerSessionId, shortsFeedMode, scopedShortsFeedParam]);

  useEffect(() => {
    if (loading || !initialShortId) return;
    listRef.current?.scrollToOffset?.({ offset: 0, animated: false });
    setActiveVideoIndex(0);
  }, [loading, initialShortId, playerSessionId, videos.length]);

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
                ...initialShortItem,
                ...clicked,
                user: {
                  ...(initialShortItem?.user &&
                  typeof initialShortItem.user === 'object'
                    ? initialShortItem.user
                    : {}),
                  ...(clicked?.user && typeof clicked.user === 'object'
                    ? clicked.user
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
            ...initialShortItem,
            ...videos[0],
            user: {
              ...(initialShortItem?.user &&
              typeof initialShortItem.user === 'object'
                ? initialShortItem.user
                : {}),
              ...(videos[0]?.user && typeof videos[0].user === 'object'
                ? videos[0].user
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
  }, [loading, videos, initialShortId, initialShortItem, playerSessionId]);

  const handleLike = async (item, opts = {}) => {
    if (!user?.id) {
      navigateToHomeScreen('HomeSevenScreen');
      return;
    }
    const forceLike = opts?.forceLike === true;
    if (forceLike && item?.isLiked) return;
    const previousLiked = !!item?.isLiked;
    const nextLiked = forceLike ? true : !previousLiked;
    if (nextLiked === previousLiked) return;
    const delta = nextLiked ? 1 : -1;
    try {
      setVideos(prev =>
        prev.map(v => {
          if (String(v.id) !== String(item.id)) return v;
          const newCount = Math.max(0, (v._likeCount ?? 0) + delta);
          return {
            ...v,
            isLiked: nextLiked,
            _likeCount: newCount,
            likesDisplay: formatCount(newCount),
          };
        }),
      );
      await shortsService.toggleLike(item.id, user.id);
      const newCount = Math.max(0, (item._likeCount ?? 0) + delta);
      shortsService.publishShortEngagement(item.id, {
        isLiked: nextLiked,
        likeCount: newCount,
      });
    } catch (e) {
      setVideos(prev =>
        prev.map(v => {
          if (String(v.id) !== String(item.id)) return v;
          const rollbackCount = Math.max(0, (v._likeCount ?? 0) - delta);
          return {
            ...v,
            isLiked: previousLiked,
            _likeCount: rollbackCount,
            likesDisplay: formatCount(rollbackCount),
          };
        }),
      );
    }
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
          if (String(v.id) !== String(item.id)) return v;
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
  const currentShortForComments = displayVideos[activeVideoIndex];

  const handleCommentAdded = () => {
    if (!currentShortForComments?.id) return;
    setVideos(prev =>
      prev.map(v => {
        if (String(v.id) !== String(currentShortForComments.id)) return v;
        const newCount = (v._commentCount ?? 0) + 1;
        return {
          ...v,
          _commentCount: newCount,
          commentsDisplay: formatCount(newCount),
        };
      }),
    );
  };

  const handleCommentDeleted = (_wasTopLevel, deletedCount) => {
    const dec = deletedCount || 1;
    if (!currentShortForComments?.id) return;
    setVideos(prev =>
      prev.map(v => {
        if (String(v.id) !== String(currentShortForComments.id)) return v;
        const newCount = Math.max(0, (v._commentCount ?? 0) - dec);
        return {
          ...v,
          _commentCount: newCount,
          commentsDisplay: formatCount(newCount),
        };
      }),
    );
  };

  const handleShare = async item => {
    if (!user?.id) {
      navigateToHomeScreen('HomeSevenScreen');
      return;
    }
    const short = item || activeItem;
    if (!short?.id) return;
    const message = buildContentShareMessage({
      type: 'short',
      id: short.id,
      title: short.description || short.title || short.user?.username || 'Short',
    });
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
    if (!user?.id) {
      navigateToHomeScreen('HomeSevenScreen');
      return;
    }
    const t = menuTargetShort();
    const url = t?.videoUrl;
    if (!url || !String(url).trim()) {
      Toast.show({ type: 'info', text1: 'No video link available' });
      return;
    }
    try {
      await downloadVideo({
        id: t?.id,
        title: t?.title || t?.description || 'Short',
        videoUrl: String(url),
        thumbnail:
          t?.thumbnailUrl || t?.thumbnail || t?.coverUrl || t?.poster || '',
        channelName: t?.user?.name || t?.user?.username || 'Channel',
        duration: Number(t?.duration || 0),
      });
      Toast.show({ type: 'success', text1: 'Video downloaded' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e?.message || 'Download failed' });
    }
  };

  const handleNotInterestedShort = () => {
    if (!user?.id) {
      navigateToHomeScreen('HomeSevenScreen');
      return;
    }
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

  const openEditShortFromMenu = async () => {
    const t = menuTargetShort();
    if (!user?.id || !t?.id) {
      navigateToHomeScreen('HomeSevenScreen');
      return;
    }
    const ownerId = t?.user?.id ?? t?.userId ?? null;
    if (!ownerId || String(ownerId) !== String(user.id)) return;
    let sourceShort = t;
    try {
      const detailRes = await shortsService.getShortById(
        t.id,
        user.id,
        String(user?.role || '').toLowerCase() || undefined,
      );
      const resolved =
        detailRes?.short && typeof detailRes.short === 'object'
          ? detailRes.short
          : detailRes?.data && typeof detailRes.data === 'object'
          ? detailRes.data
          : detailRes;
      if (resolved && typeof resolved === 'object') {
        sourceShort = { ...t, ...resolved };
      }
    } catch {}
    const pubAt = sourceShort?.publishedAt ? new Date(sourceShort.publishedAt) : null;
    const schedAt = sourceShort?.scheduledPublishAt
      ? new Date(sourceShort.scheduledPublishAt)
      : null;
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
      shortId: String(sourceShort?.id || t.id),
      short: sourceShort,
      editDraft: {
        source: 'short-edit',
        shortId: String(sourceShort?.id || t.id),
        caption: String(sourceShort?.description || sourceShort?.title || '').trim(),
        title: String(sourceShort?.title || sourceShort?.description || '').trim(),
        video: {
          uri: String(sourceShort?.videoUrl || sourceShort?.mediaUrl || '').trim(),
          type: 'video/mp4',
          name: `short-${sourceShort?.id || t.id}.mp4`,
          durationSec:
            Number.isFinite(durationNum) && durationNum > 0 ? durationNum : 15,
        },
        thumbnail: {
          uri: String(
            sourceShort?.thumbnailUrl ||
              sourceShort?.thumbnail ||
              sourceShort?.coverUrl ||
              '',
          ).trim(),
          type: 'image/jpeg',
          name: `short-cover-${sourceShort?.id || t.id}.jpg`,
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
  };

  const openEditCoverFromVideo = () => {
    const vid = String(editShortVideoUri || '').trim();
    const fromItem = String(
      menuTargetShort()?.videoUrl || menuTargetShort()?.mediaUrl || '',
    ).trim();
    if (!vid && !fromItem) {
      Alert.alert('No video', 'Add or keep a video first.');
      return;
    }
    setEditCoverPickerVisible(true);
  };

  const pickEditShortThumbnail = async () => {
    const res = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.9,
      selectionLimit: 1,
    });
    const asset = res?.assets?.[0];
    if (asset?.uri) {
      setEditShortThumbnailUri(asset.uri);
      setEditLocalThumbMeta({
        type: asset.type || 'image/jpeg',
        name: asset.fileName || 'thumb.jpg',
      });
    }
  };

  const pickEditShortVideo = async () => {
    const res = await launchImageLibrary({
      mediaType: 'video',
      quality: 1,
      selectionLimit: 1,
    });
    const asset = res?.assets?.[0];
    if (asset?.uri) {
      setEditShortVideoUri(asset.uri);
      setEditVideoPickMeta({
        type: asset.type || 'video/mp4',
        name: asset.fileName || 'short.mp4',
      });
      const d = Number(asset?.duration);
      if (Number.isFinite(d) && d > 0) {
        setEditShortDurationSec(d);
      }
    }
  };

  const submitEditShortFromMenu = async () => {
    if (!editShortTargetId || !user?.id) return;
    const nextTitle = String(editShortTitle || '').trim();
    const nextText = String(editShortText || '').trim();
    let thumbOut = String(editShortThumbnailUri || '').trim();
    let vidOut = String(editShortVideoUri || '').trim();
    const needUpload =
      isLocalMediaUri(thumbOut) || isLocalMediaUri(vidOut);
    const scheduleMs =
      editShortScheduleDate instanceof Date
        ? editShortScheduleDate.getTime()
        : NaN;
    const isFutureSchedule =
      Number.isFinite(scheduleMs) && scheduleMs > Date.now() + 60_000;

    try {
      setEditShortSubmitting(true);
      if (needUpload) {
        try {
          const mediaResponse = await shortsService.replaceShortMedia(
            editShortTargetId,
            user.id,
            {
              videoUri: isLocalMediaUri(vidOut) ? vidOut : null,
              videoType: editVideoPickMeta?.type,
              videoName: editVideoPickMeta?.name,
              thumbnailUri: isLocalMediaUri(thumbOut) ? thumbOut : null,
              thumbnailType: editLocalThumbMeta?.type,
              thumbnailName: editLocalThumbMeta?.name,
            },
          );
          const mediaResult = extractShortPayload(mediaResponse) || {};
          if (mediaResult?.thumbnailUrl || mediaResult?.coverUrl) {
            thumbOut = String(
              mediaResult.thumbnailUrl || mediaResult.coverUrl || thumbOut,
            ).trim();
          }
          if (mediaResult?.videoUrl || mediaResult?.mediaUrl) {
            vidOut = String(mediaResult.videoUrl || mediaResult.mediaUrl || vidOut).trim();
          }
          const needsVideoCheck = isLocalMediaUri(editShortVideoUri);
          const needsThumbCheck = isLocalMediaUri(editShortThumbnailUri);
          if (
            (needsVideoCheck && !isRemoteMediaUri(vidOut)) ||
            (needsThumbCheck && !isRemoteMediaUri(thumbOut))
          ) {
            try {
              const freshRes = await shortsService.getShortById(
                editShortTargetId,
                user.id,
                String(user?.role || '').toLowerCase() || undefined,
              );
              const fresh = extractShortPayload(freshRes) || {};
              if (needsVideoCheck && !isRemoteMediaUri(vidOut)) {
                vidOut = String(fresh?.videoUrl || fresh?.mediaUrl || vidOut).trim();
              }
              if (needsThumbCheck && !isRemoteMediaUri(thumbOut)) {
                thumbOut = String(
                  fresh?.thumbnailUrl || fresh?.coverUrl || thumbOut,
                ).trim();
              }
            } catch {
              // keep previous values
            }
          }
          if (needsVideoCheck && !isRemoteMediaUri(vidOut)) {
            throw new Error('Updated video upload did not complete. Please retry.');
          }
          if (needsThumbCheck && !isRemoteMediaUri(thumbOut)) {
            throw new Error('Updated thumbnail upload did not complete. Please retry.');
          }
        } catch (mediaErr) {
          const msg = String(
            mediaErr?.response?.data?.message || mediaErr?.message || '',
          );
          const unsupported =
            mediaErr?.response?.status === 404 ||
            msg.includes('Cannot POST') ||
            msg.includes('/media');
          if (unsupported) {
            throw new Error(
              'Media update route is not available on backend. Please update backend and try again.',
            );
          }
          throw mediaErr;
        }
      }

      const patch = {
        title: nextTitle || undefined,
        description: nextText || undefined,
        thumbnailUrl: thumbOut || undefined,
        coverUrl: thumbOut || undefined,
        videoUrl: vidOut || undefined,
        mediaUrl: vidOut || undefined,
        visibility: mapVisibilityForApi(editShortVisibility),
        commentSetting: mapCommentsForApi(editShortComments),
        ...(editShortAudience?.madeForKids != null && {
          madeForKids: Boolean(editShortAudience.madeForKids),
        }),
        ...(editShortAudience?.ageRestricted != null && {
          ageRestricted: Boolean(editShortAudience.ageRestricted),
        }),
      };
      if (isFutureSchedule) {
        patch.scheduledPublishAt = editShortScheduleDate.toISOString();
      } else if (editInitialHadFutureSchedule) {
        patch.publishImmediately = true;
      }

      const savedResponse = await shortsService.updateShort(
        editShortTargetId,
        user.id,
        patch,
      );
      const saved = extractShortPayload(savedResponse) || {};
      const savedThumb = String(
        saved?.thumbnailUrl || saved?.coverUrl || thumbOut || '',
      ).trim();
      const savedVideo = String(saved?.videoUrl || saved?.mediaUrl || vidOut || '').trim();

      setVideos(prev =>
        prev.map(v =>
          String(v.id) === String(editShortTargetId)
            ? {
                ...v,
                description: nextText || v.description,
                title: nextTitle || v.title,
                thumbnailUrl: savedThumb || v.thumbnailUrl,
                thumbnail: savedThumb || v.thumbnail,
                coverUrl: savedThumb || v.coverUrl,
                videoUrl: savedVideo || v.videoUrl,
                mediaUrl: savedVideo || v.mediaUrl,
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
                publishedAt: saved.publishedAt ?? v.publishedAt,
                scheduledPublishAt: isFutureSchedule
                  ? editShortScheduleDate.toISOString()
                  : editInitialHadFutureSchedule
                    ? null
                    : v.scheduledPublishAt,
              }
            : v,
        ),
      );
      Toast.show({ type: 'success', text1: 'Short updated' });
      setEditShortVisible(false);
      setEditShortTargetId(null);
    } catch (e) {
      const apiMsg =
        e?.response?.data?.message ||
        (typeof e?.response?.data?.errors === 'object'
          ? 'Validation failed'
          : null);
      Toast.show({
        type: 'error',
        text1: apiMsg || e?.message || 'Failed to update short',
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

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }) => {
      if (viewableItems && viewableItems.length > 0) {
        const { index, item } = viewableItems[0];
        setActiveVideoIndex(index);
        if (item?.id) {
          recordShortViewAndBumpUI(item.id);
        }
      }
    },
    [recordShortViewAndBumpUI],
  );

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
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
      ) : displayVideos.length === 0 ? (
        <View style={[styles.centerContent, styles.emptyWrap, { height: screenHeight }]}>
          <TouchableOpacity
            style={[styles.emptyBackBtn, { top: Math.max(insets.top, 12) }]}
            onPress={handleShortsBack}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Icon name="play-box-multiple-outline" size={48} color="#FF8C00" />
          <Text style={styles.emptyTitle}>
            {loadError ? 'Shorts unavailable' : 'No shorts yet'}
          </Text>
          <Text style={styles.emptyText}>
            {loadError ||
              'There are no food shorts to show right now. Check back soon.'}
          </Text>
          <TouchableOpacity
            style={styles.emptyPrimaryBtn}
            onPress={loadShorts}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyPrimaryBtnText}>Try again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.emptySecondaryBtn}
            onPress={handleShortsBack}
            activeOpacity={0.85}
          >
            <Text style={styles.emptySecondaryBtnText}>Go back</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          ref={listRef}
          key={`shorts-feed-${playerSessionId || initialShortId || 'default'}`}
          data={displayVideos}
          renderItem={({ item, index }) => (
            <VideoItem
              item={item}
              isActive={
                isScreenFocused &&
                activeVideoIndex === index &&
                !editShortVisible
              }
              shouldRenderVideo={
                isScreenFocused &&
                !editShortVisible &&
                Math.abs(activeVideoIndex - index) <= 1
              }
              index={index}
              screenHeight={screenHeight}
              onBack={handleShortsBack}
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
              onDoubleTapRecordView={recordShortViewFromDoubleTap}
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
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          removeClippedSubviews={false}
          extraData={{
            activeVideoIndex,
            editShortVisible,
            deepLinkVisitSeq,
            headViews: videos[0]?._viewCount,
            headId: videos[0]?.id,
          }}
          getItemLayout={(data, index) => ({
            length: screenHeight,
            offset: screenHeight * index,
            index,
          })}
          onEndReachedThreshold={0.8}
          onEndReached={() => {
            if (hasMoreShorts && !loadingMoreShorts) loadMoreShorts();
          }}
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
        onCommentAdded={handleCommentAdded}
        onCommentDeleted={handleCommentDeleted}
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
                      if (u?.id) {
                        const go = async () => {
                          let targetRole = String(
                            u?.role || u?.user?.role || '',
                          ).toLowerCase();
                          if (!targetRole) {
                            try {
                              const p = await getChannelProfile(u.id, user?.id);
                              targetRole = String(p?.role || '').toLowerCase();
                            } catch (_) {}
                          }
                          if (targetRole === 'user') {
                            navigation.navigate('Root', {
                              screen: 'Home1',
                              params: {
                                screen: 'PromotionScreen',
                                params: { userId: u.id },
                              },
                            });
                          } else {
                            navigation.navigate('UserViewsScreen', {
                              userId: u.id,
                            });
                          }
                        };
                        go();
                      }
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
            <View style={styles.editHeaderBtn} />
          </View>
          <View style={styles.editContent}>
            <View style={styles.editTopSection}>
              <TouchableOpacity
                style={styles.editCoverContainer}
                onPress={openEditCoverFromVideo}
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
                  <Text style={styles.editSelectCoverText}>
                    Select Cover From Video
                  </Text>
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
            <TouchableOpacity
              style={styles.editCoverGalleryBtn}
              onPress={pickEditShortThumbnail}
              disabled={editShortSubmitting}
            >
              <Text style={styles.editCoverGalleryText}>
                Or pick cover photo from gallery
              </Text>
            </TouchableOpacity>
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
                  <Text style={styles.editOptionValue}>
                    {editShortVisibility}
                  </Text>
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
                    {(() => {
                      const d = editShortScheduleDate;
                      if (!(d instanceof Date)) return 'Now';
                      const ms = d.getTime();
                      if (
                        !Number.isFinite(ms) ||
                        ms <= Date.now() + 60_000
                      ) {
                        return 'Now';
                      }
                      return d.toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      });
                    })()}
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
          <VideoCoverPickerModal
            visible={editCoverPickerVisible}
            onClose={() => setEditCoverPickerVisible(false)}
            videoUri={
              editShortVideoUri ||
              menuTargetShort()?.videoUrl ||
              menuTargetShort()?.mediaUrl
            }
            durationSec={editShortDurationSec}
            onSelect={frame => {
              if (frame?.uri) {
                setEditShortThumbnailUri(frame.uri);
                setEditLocalThumbMeta({
                  type: frame.type || 'image/jpeg',
                  name: frame.fileName || 'thumb.jpg',
                });
              }
              setEditCoverPickerVisible(false);
            }}
            title="Select short cover"
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
  emptyWrap: {
    paddingHorizontal: 28,
  },
  emptyBackBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 2,
    padding: 8,
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 10,
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(255,255,255,0.72)',
    textAlign: 'center',
  },
  emptyPrimaryBtn: {
    marginTop: 22,
    backgroundColor: '#F97507',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
  emptyPrimaryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  emptySecondaryBtn: {
    marginTop: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  emptySecondaryBtnText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '600',
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
  videoErrorOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  videoErrorText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  videoRetryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FF8C00',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
  },
  videoRetryText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
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
  audioTitleInline: {
    marginLeft: 5,
    marginRight: 8,
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
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  editCoverGalleryBtn: {
    marginTop: 8,
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  editCoverGalleryText: {
    fontSize: 13,
    color: '#666',
    textDecorationLine: 'underline',
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
