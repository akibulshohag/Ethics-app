import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
} from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
} from 'react-native';
import Video from 'react-native-video';
import Slider from '@react-native-community/slider';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { subscribeToChannel, getChannelProfile } from '../../services/channelService';
import { setShortsMuted } from '../../redux/actions/appSlice';
import { safeImageUri } from '../../utils/helper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import EatwazeWatermark from '../../components/EatwazeWatermark';

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

/**
 * Stable list row (module scope) — avoids re-creating a component type on every parent render,
 * which was slowing FlatList scrolling vs ShortsVideoScreen.
 */
function ProductShortsVideoRow({
  item,
  index,
  currentIndex,
  onLike,
  onDoubleTapRecordView,
  onShare,
  onOpenComments,
  onOpenMoreMenu,
  isScreenFocused: focused,
  subscribersOrderLine,
  navigation,
  user,
  height,
  onSubscribersPress,
  onOrderNowPress,
  styles,
}) {
  const dispatch = useDispatch();
  const shortsMuted = useSelector(state => state?.app?.shortsMuted);
  const insets = useSafeAreaInsets();

  const isCurrentlyViewable = currentIndex === index;
  const [isPausedLocally, setIsPausedLocally] = useState(false);
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const lastProgressUpdate = useRef(0);
  const lastTapMsRef = useRef(0);
  const singleTapTimerRef = useRef(null);

  const descText = (item.desc && String(item.desc).trim()) || '';
  const [descExpanded, setDescExpanded] = useState(false);
  const [descNeedsMore, setDescNeedsMore] = useState(false);
  const [descMeasureWidth, setDescMeasureWidth] = useState(0);
  const [descFirstLine, setDescFirstLine] = useState('');
  const [descLayoutDone, setDescLayoutDone] = useState(false);
  const [subscribedLocal, setSubscribedLocal] = useState(
    !!item?.userObj?.isSubscribed,
  );
  const [ownerAvatarBroken, setOwnerAvatarBroken] = useState(false);

  const locationLine =
    item.creatorAddress ||
    item.userObj?.address ||
    (item.location && item.location !== 'Near you' ? item.location : '');

  useEffect(() => {
    setDescExpanded(false);
    setDescNeedsMore(false);
    setDescMeasureWidth(0);
    setDescFirstLine('');
    setDescLayoutDone(false);
    setSubscribedLocal(!!item?.userObj?.isSubscribed);
    setOwnerAvatarBroken(false);
  }, [item.id]);

  useEffect(() => {
    if (!isCurrentlyViewable) {
      setIsPausedLocally(false);
    } else {
      setIsPausedLocally(false);
    }
  }, [isCurrentlyViewable]);

  const togglePause = () => {
    if (isCurrentlyViewable) {
      setIsPausedLocally(!isPausedLocally);
    }
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

  const isPaused = !focused || !isCurrentlyViewable || isPausedLocally;
  const shouldRenderVideo = focused && Math.abs(currentIndex - index) <= 1;
  const hasValidVideo =
    item?.videoUrl && String(item.videoUrl).trim().length > 0;
  const ownerId = item?.userId ?? item?.userObj?.id ?? null;
  const isOwnShort = !!(
    user?.id &&
    ownerId &&
    String(user.id) === String(ownerId)
  );

  const videoSource = useMemo(
    () => ({ uri: item?.videoUrl }),
    [item?.videoUrl],
  );

  useEffect(() => {
    if (!isCurrentlyViewable) return;
    if (isSeeking) return;
    const t = currentTimeRef.current;
    if (!(t > 0.5)) return;
    const seekNow = () => {
      try {
        videoRef.current?.seek?.(t);
        setCurrentTime(t);
      } catch (_) {}
    };
    seekNow();
    const tid = setTimeout(seekNow, 120);
    return () => clearTimeout(tid);
  }, [shortsMuted, isCurrentlyViewable, isSeeking]);

  useEffect(() => {
    let cancelled = false;
    const apiSubscribed = item?.userObj?.isSubscribed;
    if (typeof apiSubscribed === 'boolean') {
      setSubscribedLocal(apiSubscribed);
    }
    if (!user?.id || !ownerId || isOwnShort) return;
    getChannelProfile(ownerId, user.id)
      .then(profile => {
        if (cancelled) return;
        if (typeof profile?.isSubscribed === 'boolean') {
          setSubscribedLocal(profile.isSubscribed);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item?.id, item?.userObj?.isSubscribed, isOwnShort, ownerId, user?.id]);

  const showFollowPlus = !!ownerId && !isOwnShort && !subscribedLocal;
  const ownerAvatarFallbackUri = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    item?.user || 'User',
  )}&background=111&color=fff`;
  const ownerAvatarUri = safeImageUri(
    item?.avatar ||
      item?.userObj?.avatar ||
      item?.userObj?.channelAvatar ||
      item?.userObj?.profileImage ||
      item?.userObj?.photoUrl ||
      (Array.isArray(item?.userObj?.photos) && item.userObj.photos[0]
        ? typeof item.userObj.photos[0] === 'string'
          ? item.userObj.photos[0]
          : item.userObj.photos[0]?.src
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
    <View style={[styles.videoContainer, { height }]}>
      {hasValidVideo && shouldRenderVideo ? (
        <Video
          ref={videoRef}
          source={videoSource}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
          repeat={true}
          paused={isPaused}
          muted={!!shortsMuted}
          playInBackground={false}
          playWhenInactive={false}
          ignoreSilentSwitch="ignore"
          controls={false}
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

            const t = currentTimeRef.current;
            if (typeof t === 'number' && t > 0.5) {
              const seekNow = () => {
                try {
                  videoRef.current?.seek?.(t);
                  setCurrentTime(t);
                } catch (_) {}
              };
              seekNow();
              setTimeout(seekNow, 120);
            }
          }}
          onProgress={data => {
            const now = Date.now();
            if (now - lastProgressUpdate.current < 250) return;
            lastProgressUpdate.current = now;
            const t = Number(data?.currentTime || 0);
            const nextT = Number.isFinite(t) ? t : 0;

            if (nextT > 0.5) {
              currentTimeRef.current = nextT;
            }

            if (!isCurrentlyViewable || isPaused) return;
            if (isSeeking) return;
            setCurrentTime(nextT);
          }}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, { backgroundColor: '#000' }]} />
      )}

      <EatwazeWatermark
        size={72}
        top={(insets?.top || 0) + 52}
        right={12}
      />

      <View
        style={[
          styles.progressBarWrap,
          { bottom: Math.max(6, (insets?.bottom || 0) + 4) },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.progressRow}>
          <Text style={styles.progressTimeText}>
            {formatShortsTime(currentTime)}
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
              if (v > 0.5) currentTimeRef.current = v;
              setCurrentTime(v);
              setIsSeeking(false);
            }}
          />
          <Text style={styles.progressTimeText}>
            {duration > 0 ? formatShortsTime(duration) : '--:--'}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        activeOpacity={1}
        onPress={onOverlayTap}
        style={styles.touchOverlay}
      >
        {isPausedLocally && isCurrentlyViewable && (
          <View style={styles.pauseIconContainer}>
            <Icon name="play" size={50} color="rgba(255,255,255,0.6)" />
          </View>
        )}
      </TouchableOpacity>

      <View style={styles.videoOverlay} pointerEvents="box-none">
        <View style={styles.videoHeader}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backBtn}
          >
            <Icon name="chevron-left" size={20} color="#FFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.videoHeaderIcons}>
            <Icon
              name="magnify"
              size={20}
              color="#FFF"
              style={{ marginRight: 15 }}
            />
            <TouchableOpacity
              onPress={() => onOpenMoreMenu?.(item)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="dots-vertical" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <View
          style={[
            styles.rightActionsColumn,
            { bottom: Math.max(10, (insets?.bottom || 0) + 36) },
          ]}
          pointerEvents="box-none"
        >
          <TouchableOpacity
            style={styles.ownerProfileAction}
            activeOpacity={0.85}
            onPress={async () => {
              if (!ownerId) return;
              if (showFollowPlus) {
                if (!user?.id) {
                  navigation.navigate('HomeSevenScreen');
                  return;
                }
                try {
                  await subscribeToChannel(user.id, ownerId);
                  setSubscribedLocal(true);
                } catch (_) {}
                return;
              }
              const targetRole = String(
                item?.creatorRole ||
                  item?.userObj?.role ||
                  item?.user?.role ||
                  '',
              ).toLowerCase();
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
          <View style={styles.actionItemCol}>
            <Icon name="eye-outline" size={26} color="#FFF" />
            <Text style={styles.actionTextCol}>{item.views ?? '0'}</Text>
          </View>
          <TouchableOpacity
            style={styles.actionItemCol}
            onPress={() => onLike?.(item)}
          >
            <Icon
              name={item.isLiked ? 'heart' : 'heart-outline'}
              size={28}
              color={item.isLiked ? '#FF4D4D' : '#FFF'}
            />
            <Text style={styles.actionTextCol}>{item.likes ?? '0'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionItemCol}
            onPress={() => {
              if (!user?.id) {
                navigation.navigate('HomeSevenScreen');
                return;
              }
              onOpenComments?.();
            }}
          >
            <Icon name="comment-text-outline" size={26} color="#FFF" />
            <Text style={styles.actionTextCol}>{item.comments ?? '0'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionItemCol}
            onPress={() => onShare?.(item)}
          >
            <Icon name="share-outline" size={26} color="#FFF" />
            <Text style={styles.actionTextCol}>{item.shares ?? '0'}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.videoFooter}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => {
              const oid = item?.userObj?.id ?? item?.userId ?? null;
              if (oid) {
                const targetRole = String(
                  item?.creatorRole ||
                    item?.userObj?.role ||
                    item?.user?.role ||
                    '',
                ).toLowerCase();
                if (targetRole === 'user') {
                  navigation.navigate('Root', {
                    screen: 'Home1',
                    params: {
                      screen: 'PromotionScreen',
                      params: { userId: oid },
                    },
                  });
                } else {
                  navigation.navigate('UserViewsScreen', { userId: oid });
                }
              }
            }}
            disabled={!(item?.userObj?.id || item?.userId)}
          >
            <Text style={styles.videoUser}>
              @
              {(
                item.ownerName ||
                (typeof item.user === 'string' ? item.user : '') ||
                item.title ||
                'short'
              )
                .toLowerCase()
                .replace(/\s+/g, '')}
            </Text>
          </TouchableOpacity>
          {locationLine ? (
            <Text style={styles.videoLocation} numberOfLines={2}>
              {locationLine}
            </Text>
          ) : null}
          {descText ? (
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
          ) : null}
          {item.hashtags && String(item.hashtags).trim() ? (
            <Text style={styles.videoHashtags}>{item.hashtags}</Text>
          ) : null}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => {
              const itemOwnerId = item?.userId ?? item?.userObj?.id ?? null;
              if (itemOwnerId) onSubscribersPress?.(itemOwnerId);
            }}
            disabled={!(item?.userId || item?.userObj?.id)}
          >
            <Text style={styles.translationText} numberOfLines={2}>
              {subscribersOrderLine || 'Subscribers Order'}
            </Text>
          </TouchableOpacity>
          <View style={styles.footerRow}>
            <View style={styles.audioRow}>
              <Icon name="music" size={18} color="#FFF" />
              <Text
                style={[
                  styles.audioText,
                  !user?.id ||
                  String(item?.creatorRole || item?.userObj?.role || '')
                    .toLowerCase() === 'owner'
                    ? styles.audioTitleFlex
                    : styles.audioTitleInline,
                ]}
                numberOfLines={1}
              >
                {item.audio || 'Original Sound'}
              </Text>
              <TouchableOpacity
                style={styles.muteBtn}
                onPress={() => dispatch(setShortsMuted(!shortsMuted))}
                activeOpacity={0.8}
              >
                <Icon
                  name={shortsMuted ? 'volume-off' : 'volume-high'}
                  size={18}
                  color="#FFF"
                  style={{ marginLeft: 10 }}
                />
                <Text style={styles.audioText}>
                  {shortsMuted ? 'Unmute' : 'Mute'}
                </Text>
              </TouchableOpacity>
            </View>
            {!user?.id ? (
              <TouchableOpacity
                style={styles.orderNowBtnFooter}
                onPress={() => onOrderNowPress?.(item)}
              >
                <Text style={styles.orderNowText}>Order Now</Text>
              </TouchableOpacity>
            ) : String(item?.creatorRole || item?.userObj?.role || '')
                .toLowerCase() === 'owner' && !isOwnShort ? (
              <TouchableOpacity
                style={styles.orderNowBtnFooter}
                onPress={() => onOrderNowPress?.(item)}
              >
                <Text style={styles.orderNowText}>Order Now</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

export default React.memo(ProductShortsVideoRow);
