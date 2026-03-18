import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  StatusBar,
  Dimensions,
  FlatList,
  ActivityIndicator,
  useWindowDimensions,
  Share,
  Image,
  Linking,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Video from 'react-native-video';
import { shortsService } from '../../services/shortsService';
import CommentsModal from '../../components/CommentsModal';
import ShortsMoreOptionsModal from '../../components/ShortsMoreOptionsModal';
import ShortsReportModal from '../../components/ShortsReportModal';
import SaveModal from '../../components/SaveModal';
import { setShortsMuted } from '../../redux/actions/appSlice';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { safeImageUri } from '../../utils/helper';
import { listMySubscribersWhoOrderedFromOwner } from '../../services/orderService';
import { setPlaylist } from '../../services/playlistService';
import { submitReport } from '../../services/reportService';
import Toast from 'react-native-toast-message';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const formatCount = n => {
  if (n == null || n < 0) return '0';
  if (n >= 1000000) return `${(n / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
};

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

const firstNameFromSubscriber = u => {
  const raw = String(u?.name || u?.nickname || u?.email || '').trim();
  if (!raw) return 'Someone';
  const word = raw.split(/\s+/)[0];
  if (!word) return 'Someone';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
};

const subsOrderPreviewFromItems = items => {
  const arr = Array.isArray(items) ? items : [];
  if (!arr.length) return { firstDisplay: '', total: 0 };
  return { firstDisplay: firstNameFromSubscriber(arr[0]), total: arr.length };
};

/** e.g. "Pino & others Ordered Here" or "Pino Ordered Here" */
const buildSubscribersOrderLine = (firstDisplay, total) => {
  if (total == null || total < 1) return 'Subscribers Order';
  const name = firstDisplay || 'Someone';
  if (total === 1) return `${name} Ordered Here`;
  return `${name} & others Ordered Here`;
};

const normalizeShort = s => {
  const viewCount = s.viewCount ?? s._count?.views ?? 0;
  const likeCount = s.likeCount ?? s._count?.likes ?? 0;
  const commentCount = s.commentCount ?? s._count?.comments ?? 0;
  const shareCount = s.shareCount ?? 0;
  return {
    id: s.id || String(Math.random()),
    videoUrl: s.videoUrl || s.mediaUrl || '',
    title: s.title || 'Short',
    user:
      s.user?.nickname ||
      s.user?.name ||
      (typeof s.user === 'string' ? s.user : '') ||
      'user',
    userId: s.user?.id ?? s.userId,
    userObj: s.user,
    desc: s.description || s.title || s.desc || 'Description',
    viewCount,
    views: formatCount(viewCount) || '0',
    likeCount,
    likes: formatCount(likeCount) || '0',
    isLiked: s.isLiked ?? false,
    commentCount,
    comments: formatCount(commentCount) || '0',
    shareCount,
    shares: formatCount(shareCount) || '0',
    hashtags: s.hashtags || '#shorts',
    audio: s.audio || 'Original Sound',
    duration:
      s.duration != null && Number.isFinite(Number(s.duration))
        ? Number(s.duration)
        : null,
  };
};

const DUMMY_VIDEOS = [
  {
    id: '1',
    title: 'Tandoori Planet',
    location: 'Birmingham, UK',
    videoUrl:
      'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    user: 'tandooriplanet',
    desc: 'Description goes here',
    hashtags: '#hashtags #music #dance',
    likes: '100k',
    comments: 'Com',
    shares: 'Share',
    audio: 'Original Sound',
  },
  {
    id: '2',
    title: 'Abbots Burger',
    location: 'Birmingham, UK',
    videoUrl:
      'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
    user: 'abbotsburger',
    desc: 'Description goes here',
    hashtags: '#food #burger #yummy',
    likes: '250k',
    comments: '99k+',
    shares: 'Share',
    audio: 'Original Sound',
  },
  {
    id: '3',
    title: 'Pizza Hut',
    location: 'London, UK',
    videoUrl:
      'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
    user: 'pizzahut',
    desc: 'Best pizza in town',
    hashtags: '#pizza #cheese #party',
    likes: '1.2M',
    comments: '10k',
    shares: '1k',
    audio: 'Trending Sound',
  },
];

const ProductShortsVideo = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector(state => state?.app?.user);
  const shortsMuted = useSelector(state => state?.app?.shortsMuted);
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const initialItem = route.params?.item;

  const { width, height } = useWindowDimensions();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [commentsVisible, setCommentsVisible] = useState(false);
  const [subsModalOpen, setSubsModalOpen] = useState(false);
  const [subsLoading, setSubsLoading] = useState(false);
  const [subsUsers, setSubsUsers] = useState([]);
  const [subsError, setSubsError] = useState('');
  /** per ownerId: { firstDisplay, total } for footer + modal title */
  const [subsOrderByOwner, setSubsOrderByOwner] = useState({});
  const subsPreviewFetchedRef = useRef(new Set());
  const [moreMenuVisible, setMoreMenuVisible] = useState(false);
  const [moreMenuItem, setMoreMenuItem] = useState(null);
  const [reportVisible, setReportVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false);
    }, []),
  );

  useEffect(() => {
    subsPreviewFetchedRef.current.clear();
    setSubsOrderByOwner({});
  }, [user?.token]);

  const currentShortId = initialItem?.id;
  const ownerId =
    initialItem?.user?.id ??
    initialItem?.userId ??
    initialItem?.userObj?.id ??
    initialItem?.userId;

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      try {
        const currentNormalized = initialItem
          ? normalizeShort({
              ...initialItem,
              user: initialItem.user ?? {
                id: ownerId,
                nickname: initialItem.title?.toLowerCase().replace(/\s+/g, ''),
              },
            })
          : null;

        if (!ownerId && !initialItem) {
          const res = await shortsService.getShorts({
            page: 1,
            limit: 30,
            viewerRole: user?.role || 'user',
          });
          const list = (res?.shorts || []).filter(
            s => s.videoUrl && String(s.videoUrl).trim(),
          );
          if (!cancelled) setVideos(list.map(normalizeShort));
          return;
        }

        if (ownerId && currentNormalized) {
          const [userRes, feedRes] = await Promise.all([
            shortsService.getUserShorts(ownerId, 1, 30),
            shortsService.getShorts({
              page: 1,
              limit: 30,
              viewerRole: user?.role || 'user',
            }),
          ]);
          const sameUserRaw = (userRes?.shorts || []).filter(
            s => s.videoUrl && String(s.videoUrl).trim(),
          );
          const sameUserOther = sameUserRaw
            .filter(s => String(s.id) !== String(currentShortId))
            .map(normalizeShort);
          const feedRaw = (feedRes?.shorts || []).filter(
            s => s.videoUrl && String(s.videoUrl).trim(),
          );
          const seen = new Set([
            currentShortId,
            ...sameUserOther.map(v => v.id),
          ]);
          const others = feedRaw
            .filter(s => !seen.has(String(s.id)))
            .map(normalizeShort);
          if (!cancelled)
            setVideos([currentNormalized, ...sameUserOther, ...others]);
          return;
        }

        if (currentNormalized) {
          const res = await shortsService.getShorts({
            page: 1,
            limit: 30,
            viewerRole: user?.role || 'user',
          });
          const list = (res?.shorts || []).filter(
            s => s.videoUrl && String(s.videoUrl).trim(),
          );
          const others = list
            .filter(s => String(s.id) !== String(currentShortId))
            .map(normalizeShort);
          if (!cancelled) setVideos([currentNormalized, ...others]);
          return;
        }

        const res = await shortsService.getShorts({
          page: 1,
          limit: 30,
          viewerRole: user?.role || 'user',
        });
        const list = (res?.shorts || []).filter(
          s => s.videoUrl && String(s.videoUrl).trim(),
        );
        if (!cancelled) setVideos(list.map(normalizeShort));
      } catch (_) {
        if (!cancelled && initialItem) {
          setVideos([
            normalizeShort({
              ...initialItem,
              user: initialItem.user ?? {
                id: ownerId,
                nickname: initialItem.title?.toLowerCase().replace(/\s+/g, ''),
              },
            }),
          ]);
        } else if (!cancelled) {
          setVideos(DUMMY_VIDEOS);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [currentShortId, ownerId, !!initialItem, user?.role]);

  const userRef = useRef(user);
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const onViewableItemsChanged = useRef(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      const { index, item } = viewableItems[0];
      setCurrentIndex(index);
      if (item?.id) {
        shortsService
          .recordView(item.id, userRef.current?.id || null)
          .then(() => {
            setVideos(prev => {
              if (prev.length === 0) return prev;
              return prev.map(v => {
                if (v.id !== item.id) return v;
                const newCount = (v.viewCount ?? 0) + 1;
                return {
                  ...v,
                  viewCount: newCount,
                  views: formatCount(newCount),
                };
              });
            });
          })
          .catch(() => {});
      }
    }
  }).current;

  const handleLike = async (item, opts = {}) => {
    if (!user?.id || !item?.id) {
      navigation.navigate('HomeSevenScreen');
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
          const newCount = Math.max(0, (v.likeCount ?? 0) + delta);
          return {
            ...v,
            isLiked: newLiked,
            likeCount: newCount,
            likes: formatCount(newCount),
          };
        }),
      );
    } catch (_) {}
  };

  const handleShare = async item => {
    if (!item?.id) return;
    const message = `${item.title || item.desc || 'Short'}\neatix://shorts/${
      item.id
    }`;
    try {
      await Share.share({ message, title: item.title || 'Share Short' });
      setVideos(prev =>
        prev.map(v => {
          if (v.id !== item.id) return v;
          const newCount = (v.shareCount ?? 0) + 1;
          return { ...v, shareCount: newCount, shares: formatCount(newCount) };
        }),
      );
    } catch (e) {
      if (e?.message !== 'User did not share') {
        // ignore
      }
    }
  };

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  });

  const VideoItem = ({
    item,
    index,
    currentIndex,
    onLike,
    onShare,
    onOpenComments,
    onOpenMoreMenu,
    isScreenFocused: focused,
    subscribersOrderLine,
  }) => {
    const isCurrentlyViewable = currentIndex === index;
    const [isPausedLocally, setIsPausedLocally] = useState(false);
    const videoRef = useRef(null);
    const [duration, setDuration] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [isSeeking, setIsSeeking] = useState(false);
    const lastProgressUpdate = useRef(0);
    const lastTapMsRef = useRef(0);
    const singleTapTimerRef = useRef(null);

    useEffect(() => {
      if (!isCurrentlyViewable) {
        setIsPausedLocally(false);
      } else {
        setIsPausedLocally(false); // Force autoplay when coming back into view
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

    const isPaused = !focused || !isCurrentlyViewable || isPausedLocally;

    return (
      <View style={[styles.videoContainer, { height: height }]}>
        <Video
          ref={videoRef}
          source={{ uri: item.videoUrl }}
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
          }}
          onProgress={data => {
            if (!isCurrentlyViewable || isPaused) return;
            if (isSeeking) return;
            const now = Date.now();
            if (now - lastProgressUpdate.current < 250) return;
            lastProgressUpdate.current = now;
            const t = Number(data?.currentTime || 0);
            setCurrentTime(Number.isFinite(t) ? t : 0);
          }}
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

          <View style={styles.rightActions}>
            <View style={styles.actionItem}>
              <Icon name="eye-outline" size={24} color="#FFF" />
              <Text style={styles.actionText}>{item.views ?? '0'}</Text>
            </View>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => onLike?.(item)}
            >
              <Icon
                name={item.isLiked ? 'heart' : 'heart-outline'}
                size={24}
                color={item.isLiked ? '#FF4D4D' : '#FFF'}
              />
              <Text style={styles.actionText}>{item.likes ?? '0'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => {
                if (!user?.id) {
                  navigation.navigate('HomeSevenScreen');
                  return;
                }
                onOpenComments?.();
              }}
            >
              <Icon name="comment-text-outline" size={24} color="#FFF" />
              <Text style={styles.actionText}>{item.comments ?? '0'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => onShare?.(item)}
            >
              <Icon name="share-outline" size={24} color="#FFF" />
              <Text style={styles.actionText}>{item.shares ?? '0'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.videoFooter}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                const ownerId = item?.userObj?.id ?? item?.userId ?? null;
                if (ownerId) {
                  navigation.navigate('UserViewsScreen', { userId: ownerId });
                }
              }}
              disabled={!(item?.userObj?.id || item?.userId)}
            >
              <Text style={styles.videoUser}>
                @{item.user || item.title?.toLowerCase().replace(' ', '')}
              </Text>
            </TouchableOpacity>
            <Text style={styles.videoDesc}>
              {item.desc || 'Description goes here'}
            </Text>
            <Text style={styles.videoHashtags}>
              {item.hashtags || '#hashtags #music #dance'}
            </Text>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                const itemOwnerId = item?.userId ?? item?.userObj?.id ?? null;
                if (itemOwnerId) openSubscribersModal(itemOwnerId);
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
                <Text style={styles.audioText}>
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
                    style={{ marginLeft: 15 }}
                  />
                  <Text style={styles.audioText}>
                    {shortsMuted ? 'Unmute' : ' Mute'}
                  </Text>
                </TouchableOpacity>
              </View>
              {!user?.id ? (
                <TouchableOpacity
                  style={styles.orderNowBtn}
                  onPress={() => navigation.navigate('HomeSevenScreen')}
                >
                  <Text style={styles.orderNowText}>Login</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.orderNowBtn}
                  onPress={() => {
                    const itemOwnerId =
                      item?.userId ?? item?.userObj?.id ?? null;
                    if (itemOwnerId) {
                      navigation.navigate('HomeThreeScreen', {
                        ownerId: itemOwnerId,
                        title: item?.title,
                        location: item?.location || item?.creatorAddress || '',
                      });
                    } else {
                      navigation.navigate('HomeThreeScreen');
                    }
                  }}
                >
                  <Text style={styles.orderNowText}>Order Now</Text>
                </TouchableOpacity>
              )}
            </View>
            {/* bottom arrow removed */}
          </View>
        </View>
      </View>
    );
  };

  const getItemLayout = (_, index) => ({
    length: height,
    offset: height * index,
    index,
  });

  const handleOpenComments = () => setCommentsVisible(true);

  const openSubscribersModal = async ownerIdToLoad => {
    if (!user?.token) {
      navigation.navigate('HomeSevenScreen');
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
      const items = Array.isArray(res?.items) ? res.items : [];
      setSubsUsers(items);
      const { firstDisplay, total } = subsOrderPreviewFromItems(items);
      setSubsOrderByOwner(prev => ({
        ...prev,
        [String(ownerIdToLoad)]: { firstDisplay, total },
      }));
      subsPreviewFetchedRef.current.add(String(ownerIdToLoad));
    } catch (e) {
      setSubsUsers([]);
      setSubsError(e?.message || 'Failed to load subscribers');
    } finally {
      setSubsLoading(false);
    }
  };

  const listData = videos.length > 0 ? videos : DUMMY_VIDEOS;

  const menuTargetProduct = () =>
    moreMenuItem || listData[currentIndex] || null;

  const handleSaveToWatchLaterProduct = async () => {
    const t = menuTargetProduct();
    if (!user?.id || !t?.id) {
      Toast.show({ type: 'info', text1: 'Please log in to save' });
      navigation.navigate('HomeSevenScreen');
      return;
    }
    try {
      await setPlaylist(user.id, 'watch_later', 'short', t.id, true);
      Toast.show({ type: 'success', text1: 'Saved to Watch Later' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to save' });
    }
  };

  const handleDownloadProduct = async () => {
    const t = menuTargetProduct();
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

  const handleNotInterestedProduct = () => {
    const t = menuTargetProduct();
    if (!t?.id) return;
    setVideos(prev => {
      const next = prev.filter(v => String(v.id) !== String(t.id));
      return next.length > 0 ? next : prev;
    });
    Toast.show({ type: 'info', text1: "Got it — we'll show fewer like this" });
  };

  const openReportFromMenuProduct = () => {
    if (!user?.id) {
      navigation.navigate('HomeSevenScreen');
      return;
    }
    setReportVisible(true);
  };

  const handleReportSubmitProduct = async reason => {
    const t = menuTargetProduct();
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

  const subsPreviewOwnerId =
    listData[currentIndex]?.userId ??
    listData[currentIndex]?.userObj?.id ??
    null;

  useEffect(() => {
    if (!user?.token || !subsPreviewOwnerId) return;
    const key = String(subsPreviewOwnerId);
    if (subsPreviewFetchedRef.current.has(key)) return;
    subsPreviewFetchedRef.current.add(key);
    let cancelled = false;
    listMySubscribersWhoOrderedFromOwner(user.token, subsPreviewOwnerId)
      .then(res => {
        if (cancelled) return;
        const items = Array.isArray(res?.items) ? res.items : [];
        const { firstDisplay, total } = subsOrderPreviewFromItems(items);
        setSubsOrderByOwner(prev => ({
          ...prev,
          [key]: { firstDisplay, total },
        }));
      })
      .catch(() => {
        subsPreviewFetchedRef.current.delete(key);
      });
    return () => {
      cancelled = true;
    };
  }, [subsPreviewOwnerId, user?.token]);
  const currentShortForComments = listData[currentIndex];

  const handleCommentAdded = () => {
    if (!currentShortForComments?.id) return;
    setVideos(prev =>
      prev.map(v => {
        if (String(v.id) !== String(currentShortForComments.id)) return v;
        const newCount = (v.commentCount ?? 0) + 1;
        return {
          ...v,
          commentCount: newCount,
          comments: formatCount(newCount),
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
        const newCount = Math.max(0, (v.commentCount ?? 0) - dec);
        return {
          ...v,
          commentCount: newCount,
          comments: formatCount(newCount),
        };
      }),
    );
  };

  const renderItem = ({ item, index }) => {
    const oid = String(item?.userId ?? item?.userObj?.id ?? '');
    const preview = oid ? subsOrderByOwner[oid] : null;
    const line =
      preview && preview.total >= 1
        ? buildSubscribersOrderLine(preview.firstDisplay, preview.total)
        : 'Subscribers Order';
    return (
      <VideoItem
        item={item}
        index={index}
        currentIndex={currentIndex}
        onLike={handleLike}
        onShare={handleShare}
        onOpenComments={handleOpenComments}
        onOpenMoreMenu={itemIn => {
          setMoreMenuItem(itemIn);
          setMoreMenuVisible(true);
        }}
        isScreenFocused={isScreenFocused}
        subscribersOrderLine={line}
      />
    );
  };

  if (loading && videos.length === 0) {
    return (
      <View style={[styles.container, styles.centered]}>
        <StatusBar hidden />
        <ActivityIndicator size="large" color="#F5A623" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <CommentsModal
        visible={commentsVisible}
        onClose={() => setCommentsVisible(false)}
        contentType="short"
        contentId={currentShortForComments?.id}
        video={{
          commentCount: currentShortForComments?.commentCount ?? 0,
        }}
        user={user}
        onCommentAdded={handleCommentAdded}
        onCommentDeleted={handleCommentDeleted}
      />
      <ShortsMoreOptionsModal
        visible={moreMenuVisible}
        onClose={() => setMoreMenuVisible(false)}
        onSaveToPlaylist={() => {
          if (!user?.id) {
            navigation.navigate('HomeSevenScreen');
            return;
          }
          setSaveModalVisible(true);
        }}
        onSaveToWatchLater={handleSaveToWatchLaterProduct}
        onDownload={handleDownloadProduct}
        onShare={() => handleShare(menuTargetProduct())}
        onNotInterested={handleNotInterestedProduct}
        onReport={openReportFromMenuProduct}
      />
      <SaveModal
        visible={saveModalVisible}
        onClose={() => setSaveModalVisible(false)}
        contentType="short"
        contentId={menuTargetProduct()?.id}
      />
      <ShortsReportModal
        visible={reportVisible}
        onClose={() => setReportVisible(false)}
        onSubmit={handleReportSubmitProduct}
      />
      <Modal
        visible={subsModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setSubsModalOpen(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSubsModalOpen(false)}>
          <View style={styles.subsBackdrop} />
        </TouchableWithoutFeedback>
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
                        navigation.navigate('UserViewsScreen', {
                          userId: u.id,
                        });
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
      <FlatList
        data={listData}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
        snapToInterval={height}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig.current}
        getItemLayout={getItemLayout}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={10}
        removeClippedSubviews={false}
        extraData={currentIndex}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  videoContainer: { width: '100%', position: 'relative' },
  videoBackground: { ...StyleSheet.absoluteFillObject },
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
  videoOverlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingBottom: 20,
    zIndex: 10,
    marginTop: -10,
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    marginTop: 40,
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 5,
  },
  backText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 5 },
  videoHeaderIcons: { flexDirection: 'row', alignItems: 'center' },
  rightActions: {
    position: 'absolute',
    right: 15,
    bottom: SCREEN_HEIGHT * 0.25,
    alignItems: 'center',
  },
  actionItem: { alignItems: 'center', marginBottom: 20 },
  actionText: { color: '#FFF', fontSize: 12, marginTop: 5, fontWeight: '600' },
  // Extra bottom padding so progress bar doesn't overlap footer row
  videoFooter: { padding: 20, paddingBottom: 52 },
  videoUser: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  videoDesc: { color: '#FFF', fontSize: 14, marginBottom: 5 },
  videoHashtags: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  translationText: {
    color: '#FFF',
    fontSize: 14,
    textDecorationLine: 'underline',
    marginBottom: 15,
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
    maxHeight: SCREEN_HEIGHT * 0.55,
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
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: -20,
  },
  audioRow: { flexDirection: 'row', alignItems: 'center' },
  muteBtn: { flexDirection: 'row', alignItems: 'center' },
  progressBarWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    paddingHorizontal: 8,
    zIndex: 50,
    elevation: 50,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressTimeText: {
    color: '#FFF',
    fontSize: 11,
    fontVariant: ['tabular-nums'],
    minWidth: 36,
    textAlign: 'center',
    textShadowColor: 'rgba(0,0,0,0.75)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  progressSlider: {
    flex: 1,
    height: 32,
  },
  audioText: { color: '#FFF', fontSize: 13, marginLeft: 5 },
  orderNowBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  orderNowText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
});

export default ProductShortsVideo;
