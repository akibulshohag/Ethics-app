import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Alert,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { shortsService } from '../../services/shortsService';
import CommentsModal from '../../components/CommentsModal';
import ShortsMoreOptionsModal from '../../components/ShortsMoreOptionsModal';
import ShortsReportModal from '../../components/ShortsReportModal';
import SaveModal from '../../components/SaveModal';
import SetVisibilityModal from '../../components/SetVisibilityModal';
import SelectAudienceModal from '../../components/SelectAudienceModal';
import CommentsSettingsModal from '../../components/CommentsSettingsModal';
import VideoScheduleModal from '../../components/VideoScheduleModal';
import VideoCoverPickerModal from '../../components/VideoCoverPickerModal';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  safeImageUri,
  navigationRef,
  isLocalMediaUri,
} from '../../utils/helper';
import { buildContentShareMessage } from '../../utils/contentLinks';
import ProductShortsVideoRow from './ProductShortsVideoRow';
import { listMySubscribersWhoOrderedFromOwner } from '../../services/orderService';
import { setPlaylist } from '../../services/playlistService';
import { downloadVideo } from '../../services/downloadService';
import { submitReport } from '../../services/reportService';
import { getChannelProfile } from '../../services/channelService';
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
  const userObj = s.user && typeof s.user === 'object' ? s.user : {};
  const firstPhoto =
    Array.isArray(userObj?.photos) && userObj.photos.length > 0
      ? userObj.photos[0]
      : null;
  const firstTopPhoto =
    Array.isArray(s?.photos) && s.photos.length > 0 ? s.photos[0] : null;
  const channelAvatarObj = s?.channelAvatar;
  const avatar =
    s.avatar ||
    (typeof channelAvatarObj === 'string'
      ? channelAvatarObj
      : channelAvatarObj?.src || channelAvatarObj?.uri) ||
    s.profileImage ||
    s.photoUrl ||
    (typeof firstTopPhoto === 'string' ? firstTopPhoto : firstTopPhoto?.src) ||
    userObj?.avatar ||
    userObj?.channelAvatar ||
    userObj?.profileImage ||
    userObj?.photoUrl ||
    (typeof firstPhoto === 'string' ? firstPhoto : firstPhoto?.src) ||
    null;
  const displayUser =
    userObj?.nickname ||
    userObj?.name ||
    s?.channelName ||
    s?.nickname ||
    s?.name ||
    s?.username ||
    (typeof s?.user === 'string' ? s.user : '') ||
    'user';
  const ownerAddress =
    userObj?.address || s?.address || s?.location || s?.creatorAddress || '';
  const roleRaw =
    userObj?.role != null
      ? userObj.role
      : s?.creatorRole != null
      ? s.creatorRole
      : s?.user?.role;
  return {
    id: s.id || String(Math.random()),
    videoUrl: s.videoUrl || s.mediaUrl || '',
    title: s.title || 'Short',
    user: displayUser,
    /** Same intent as ShortsVideoScreen mapShortToItem — used for HomeThreeScreen header + Order flow */
    ownerName: displayUser,
    userId: s.user?.id ?? s.userId,
    userObj: {
      ...userObj,
      avatar,
      address: userObj?.address || s?.address || undefined,
      role: roleRaw,
      isSubscribed:
        typeof userObj?.isSubscribed === 'boolean'
          ? userObj.isSubscribed
          : !!s?.isSubscribed,
    },
    avatar,
    desc: s.description || s.title || s.desc || 'Description',
    location: ownerAddress || 'Near you',
    creatorAddress: ownerAddress,
    creatorRole: roleRaw != null ? String(roleRaw).toLowerCase() : undefined,
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

  /** HomeThreeScreen / HomeSevenScreen live under Home1 tab — same as ShortsVideoScreen */
  const navigateToHomeScreen = useCallback(
    (screenName, params) => {
      const payload =
        params != null
          ? { screen: screenName, params }
          : { screen: screenName };
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
    },
    [navigation],
  );

  /** Match ShortsVideoScreen / UserViewsScreen params so restaurant name + address match on HomeThreeScreen */
  const handleOrderNowPress = useCallback(
    item => {
      if (!item) return;
      if (!user?.id) {
        navigateToHomeScreen('HomeSevenScreen', {
          returnToOrder: true,
          ownerUserId: item?.userId ?? item?.userObj?.id ?? null,
        });
        return;
      }
      const oid = item?.userId ?? item?.userObj?.id ?? null;
      if (!oid) {
        navigateToHomeScreen('HomeThreeScreen');
        return;
      }
      const ownerName =
        item.ownerName ||
        item.userObj?.nickname ||
        item.userObj?.name ||
        (typeof item.user === 'string' ? item.user : '') ||
        '';
      const title = item.desc || item.title || ownerName || '';
      const location =
        item.creatorAddress ||
        item.userObj?.address ||
        (item.location && item.location !== 'Near you' ? item.location : '') ||
        '';
      navigateToHomeScreen('HomeThreeScreen', {
        ownerId: oid,
        ownerName,
        title,
        location,
      });
    },
    [user?.id, navigateToHomeScreen],
  );

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
            role: u?.role ?? p?.role,
            address: u?.address || p?.address,
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
            viewerUserId: user?.id,
          });
          const list = (res?.shorts || []).filter(
            s => s.videoUrl && String(s.videoUrl).trim(),
          );
          const enriched = await enrichShortsWithProfile(list);
          if (!cancelled) setVideos(enriched.map(normalizeShort));
          return;
        }

        if (ownerId && currentNormalized) {
          const [userRes, feedRes] = await Promise.all([
            shortsService.getUserShorts(ownerId, 1, 30, user?.id),
            shortsService.getShorts({
              page: 1,
              limit: 30,
              viewerRole: user?.role || 'user',
              viewerUserId: user?.id,
            }),
          ]);
          const sameUserRaw = (userRes?.shorts || []).filter(
            s => s.videoUrl && String(s.videoUrl).trim(),
          );
          const feedRaw = (feedRes?.shorts || []).filter(
            s => s.videoUrl && String(s.videoUrl).trim(),
          );
          const [sameUserEnriched, feedEnriched] = await Promise.all([
            enrichShortsWithProfile(sameUserRaw),
            enrichShortsWithProfile(feedRaw),
          ]);
          const sameUserOther = sameUserEnriched
            .filter(s => String(s.id) !== String(currentShortId))
            .map(normalizeShort);
          const seen = new Set([
            currentShortId,
            ...sameUserOther.map(v => v.id),
          ]);
          const others = feedEnriched
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
            viewerUserId: user?.id,
          });
          const list = (res?.shorts || []).filter(
            s => s.videoUrl && String(s.videoUrl).trim(),
          );
          const enriched = await enrichShortsWithProfile(list);
          const others = enriched
            .filter(s => String(s.id) !== String(currentShortId))
            .map(normalizeShort);
          if (!cancelled) setVideos([currentNormalized, ...others]);
          return;
        }

        const res = await shortsService.getShorts({
          page: 1,
          limit: 30,
          viewerRole: user?.role || 'user',
          viewerUserId: user?.id,
        });
        const list = (res?.shorts || []).filter(
          s => s.videoUrl && String(s.videoUrl).trim(),
        );
        const enriched = await enrichShortsWithProfile(list);
        if (!cancelled) setVideos(enriched.map(normalizeShort));
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
  }, [
    currentShortId,
    ownerId,
    !!initialItem,
    user?.role,
    user?.id,
    enrichShortsWithProfile,
  ]);

  const applyViewIncrement = useCallback(shortId => {
    if (!shortId) return;
    setVideos(prev => {
      if (prev.length === 0) return prev;
      return prev.map(v => {
        if (String(v.id) !== String(shortId)) return v;
        const newCount = (v.viewCount ?? 0) + 1;
        return { ...v, viewCount: newCount, views: formatCount(newCount) };
      });
    });
  }, []);

  const applyViewDecrement = useCallback(shortId => {
    if (!shortId) return;
    setVideos(prev => {
      if (prev.length === 0) return prev;
      return prev.map(v => {
        if (String(v.id) !== String(shortId)) return v;
        const newCount = Math.max(0, (v.viewCount ?? 0) - 1);
        return { ...v, viewCount: newCount, views: formatCount(newCount) };
      });
    });
  }, []);

  /** Optimistic +1 on every visible event (including revisits). */
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

  /** Each double tap should also increment view count (not deduped). */
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

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }) => {
      if (viewableItems && viewableItems.length > 0) {
        const { index, item } = viewableItems[0];
        setCurrentIndex(index);
        if (item?.id) recordShortViewAndBumpUI(item.id);
      }
    },
    [recordShortViewAndBumpUI],
  );

  const handleLike = useCallback(
    async (item, opts = {}) => {
      if (!user?.id || !item?.id) {
        navigation.navigate('HomeSevenScreen');
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
            if (v.id !== item.id) return v;
            const newCount = Math.max(0, (v.likeCount ?? 0) + delta);
            return {
              ...v,
              isLiked: nextLiked,
              likeCount: newCount,
              likes: formatCount(newCount),
            };
          }),
        );
        await shortsService.toggleLike(item.id, user.id);
      } catch (_) {
        setVideos(prev =>
          prev.map(v => {
            if (v.id !== item.id) return v;
            const rollbackCount = Math.max(0, (v.likeCount ?? 0) - delta);
            return {
              ...v,
              isLiked: previousLiked,
              likeCount: rollbackCount,
              likes: formatCount(rollbackCount),
            };
          }),
        );
      }
    },
    [user?.id, navigation],
  );

  const handleShare = useCallback(async item => {
    if (!item?.id) return;
    const message = buildContentShareMessage({
      type: 'short',
      id: item.id,
      title: item.title || item.desc || 'Short',
    });
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
  }, []);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const getItemLayout = useCallback(
    (_, index) => ({
      length: height,
      offset: height * index,
      index,
    }),
    [height],
  );

  const handleOpenComments = useCallback(() => setCommentsVisible(true), []);

  const openSubscribersModal = useCallback(
    async ownerIdToLoad => {
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
    },
    [user?.token, navigation],
  );

  const listData = videos.length > 0 ? videos : DUMMY_VIDEOS;

  const menuTargetProduct = () =>
    moreMenuItem || listData[currentIndex] || null;
  const isOwnMenuTargetProduct = (() => {
    const t = menuTargetProduct();
    const ownerId = t?.userId ?? t?.userObj?.id ?? null;
    return !!(user?.id && ownerId && String(user.id) === String(ownerId));
  })();

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
      await downloadVideo({
        id: t?.id,
        title: t?.title || t?.desc || 'Short',
        videoUrl: String(url),
        thumbnail: t?.thumbnailUrl || t?.thumbnail || t?.coverUrl || '',
        channelName: t?.userObj?.name || t?.userObj?.nickname || 'Channel',
        duration: Number(t?.duration || 0),
      });
      Toast.show({ type: 'success', text1: 'Video downloaded' });
    } catch (e) {
      Toast.show({ type: 'error', text1: e?.message || 'Download failed' });
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

  const openEditShortFromMenuProduct = async () => {
    const t = menuTargetProduct();
    if (!user?.id || !t?.id) {
      navigation.navigate('HomeSevenScreen');
      return;
    }
    const ownerId = t?.userId ?? t?.userObj?.id ?? null;
    if (!ownerId || String(ownerId) !== String(user.id)) return;
    let sourceShort = t;
    try {
      const detailRes = await shortsService.getShortById(
        t.id,
        user.id,
        String(user?.role || '').toLowerCase() || undefined,
      );

      console.log('=== EDIT SHORT DEBUG ===');
      console.log('Short ID:', t.id);
      console.log(
        'detailRes (full response):',
        JSON.stringify(detailRes, null, 2),
      );

      const resolved =
        detailRes?.short && typeof detailRes.short === 'object'
          ? detailRes.short
          : detailRes?.data && typeof detailRes.data === 'object'
          ? detailRes.data
          : detailRes;

      console.log('resolved short object:', JSON.stringify(resolved, null, 2));
      console.log('resolved.platforms:', resolved?.platforms);
      console.log('resolved.selectedPlatforms:', resolved?.selectedPlatforms);
      console.log('resolved.scheduledPublishAt:', resolved?.scheduledPublishAt);
      console.log('resolved.scheduleAt:', resolved?.scheduleAt);
      console.log('resolved.publishedAt:', resolved?.publishedAt);
      console.log('========================');

      if (resolved && typeof resolved === 'object') {
        sourceShort = { ...t, ...resolved };
      }
    } catch (err) {
      console.error('Error fetching short details:', err);
    }
    const pubAtRaw =
      sourceShort?.publishedAt ||
      sourceShort?.publishAt ||
      sourceShort?.postedAt ||
      null;
    const schedAtRaw =
      sourceShort?.scheduledPublishAt ||
      sourceShort?.scheduleAt ||
      sourceShort?.scheduleDate ||
      sourceShort?.scheduledAt ||
      null;
    const pubAt = pubAtRaw ? new Date(pubAtRaw) : null;
    const schedAt = schedAtRaw ? new Date(schedAtRaw) : null;
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
        caption: String(
          sourceShort?.desc ||
            sourceShort?.description ||
            sourceShort?.title ||
            '',
        ).trim(),
        title: String(
          sourceShort?.title ||
            sourceShort?.desc ||
            sourceShort?.description ||
            '',
        ).trim(),
        video: {
          uri: String(
            sourceShort?.videoUrl || sourceShort?.mediaUrl || '',
          ).trim(),
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

  const openEditCoverFromVideoProduct = () => {
    const vid = String(editShortVideoUri || '').trim();
    const fromItem = String(
      menuTargetProduct()?.videoUrl || menuTargetProduct()?.mediaUrl || '',
    ).trim();
    if (!vid && !fromItem) {
      Alert.alert('No video', 'Add or keep a video first.');
      return;
    }
    setEditCoverPickerVisible(true);
  };

  const pickEditShortThumbnailProduct = async () => {
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

  const pickEditShortVideoProduct = async () => {
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

  const submitEditShortFromMenuProduct = async () => {
    if (!editShortTargetId || !user?.id) return;
    const nextTitle = String(editShortTitle || '').trim();
    const nextText = String(editShortText || '').trim();
    let thumbOut = String(editShortThumbnailUri || '').trim();
    let vidOut = String(editShortVideoUri || '').trim();
    const needUpload = isLocalMediaUri(thumbOut) || isLocalMediaUri(vidOut);
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
            vidOut = String(
              mediaResult.videoUrl || mediaResult.mediaUrl || vidOut,
            ).trim();
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
                vidOut = String(
                  fresh?.videoUrl || fresh?.mediaUrl || vidOut,
                ).trim();
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
            throw new Error(
              'Updated video upload did not complete. Please retry.',
            );
          }
          if (needsThumbCheck && !isRemoteMediaUri(thumbOut)) {
            throw new Error(
              'Updated thumbnail upload did not complete. Please retry.',
            );
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
      const savedVideo = String(
        saved?.videoUrl || saved?.mediaUrl || vidOut || '',
      ).trim();

      setVideos(prev =>
        prev.map(v =>
          String(v.id) === String(editShortTargetId)
            ? {
                ...v,
                desc: nextText || v.desc,
                description: nextText || v.description,
                title: nextTitle || v.title,
                thumbnailUrl: savedThumb || v.thumbnailUrl,
                thumbnail: savedThumb || v.thumbnail,
                coverUrl: savedThumb || v.coverUrl,
                videoUrl: savedVideo || v.videoUrl,
                mediaUrl: savedVideo || v.mediaUrl,
                ng: mapCommentsForApi(editShortComments),
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

  const handleDeleteShortFromMenuProduct = () => {
    const t = menuTargetProduct();
    if (!user?.id || !t?.id) {
      navigation.navigate('HomeSevenScreen');
      return;
    }
    const ownerId = t?.userId ?? t?.userObj?.id ?? null;
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
            setCurrentIndex(prev => Math.max(0, prev - 1));
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

  const renderItem = useCallback(
    ({ item, index }) => {
      const oid = String(item?.userId ?? item?.userObj?.id ?? '');
      const preview = oid ? subsOrderByOwner[oid] : null;
      const line =
        preview && preview.total >= 1
          ? buildSubscribersOrderLine(preview.firstDisplay, preview.total)
          : 'Subscribers Order';
      return (
        <ProductShortsVideoRow
          item={item}
          index={index}
          currentIndex={currentIndex}
          onLike={handleLike}
          onDoubleTapRecordView={recordShortViewFromDoubleTap}
          onShare={handleShare}
          onOpenComments={handleOpenComments}
          onOpenMoreMenu={itemIn => {
            setMoreMenuItem(itemIn);
            setMoreMenuVisible(true);
          }}
          isScreenFocused={isScreenFocused && !editShortVisible}
          subscribersOrderLine={line}
          navigation={navigation}
          user={user}
          height={height}
          onSubscribersPress={openSubscribersModal}
          onOrderNowPress={handleOrderNowPress}
          styles={styles}
        />
      );
    },
    [
      currentIndex,
      isScreenFocused,
      editShortVisible,
      subsOrderByOwner,
      handleLike,
      handleShare,
      handleOpenComments,
      handleOrderNowPress,
      navigation,
      user,
      height,
      openSubscribersModal,
    ],
  );

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
        onEdit={openEditShortFromMenuProduct}
        onDelete={handleDeleteShortFromMenuProduct}
        hideNotInterested={isOwnMenuTargetProduct}
        hideReport={isOwnMenuTargetProduct}
        showOwnerActions={isOwnMenuTargetProduct}
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
                onPress={openEditCoverFromVideoProduct}
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
              onPress={pickEditShortThumbnailProduct}
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
                      if (!Number.isFinite(ms) || ms <= Date.now() + 60_000) {
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
                onPress={pickEditShortThumbnailProduct}
                disabled={editShortSubmitting}
              >
                <Text style={styles.editMediaBtnText}>Change Image</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editMediaBtn}
                onPress={pickEditShortVideoProduct}
                disabled={editShortSubmitting}
              >
                <Text style={styles.editMediaBtnText}>Change Video</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.editFooter}>
            <TouchableOpacity
              style={styles.editUploadBtn}
              onPress={submitEditShortFromMenuProduct}
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
              menuTargetProduct()?.videoUrl ||
              menuTargetProduct()?.mediaUrl
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
                        const targetRole = String(
                          u?.role || u?.userRole || u?.creatorRole || '',
                        ).toLowerCase();
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
        snapToAlignment="center"
        snapToInterval={height}
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={getItemLayout}
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        removeClippedSubviews={true}
        extraData={{
          currentIndex,
          editShortVisible,
          subsOrderByOwner,
          headViews: videos[0]?.viewCount,
          headId: videos[0]?.id,
        }}
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
  /** Reels-style: stacked actions on the right */
  rightActionsColumn: {
    position: 'absolute',
    right: 10,
    alignItems: 'center',
    zIndex: 12,
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
  actionItemCol: {
    alignItems: 'center',
    marginBottom: 12,
  },
  actionTextCol: {
    color: '#FFF',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  audioTitleFlex: { flex: 1, minWidth: 0, marginLeft: 5 },
  audioTitleInline: { marginLeft: 5, marginRight: 8 },
  /** Sits left of the right Reels column so it doesn’t overlap icons */
  orderNowBtnFooter: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    flexShrink: 0,
    marginRight: 54,
  },
  // Caption block stays left of the action rail
  videoFooter: {
    padding: 20,
    paddingRight: 72,
    paddingBottom: 56,
    maxWidth: '100%',
  },
  videoUser: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  videoLocation: {
    color: 'rgba(255,255,255,0.88)',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 6,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  descBlock: {
    width: '100%',
    marginBottom: 5,
    position: 'relative',
  },
  descMeasureHidden: {
    position: 'absolute',
    opacity: 0,
    left: 0,
    top: 0,
    zIndex: -1,
  },
  videoDesc: { color: '#FFF', fontSize: 14, marginBottom: 0 },
  videoDescExpanded: { marginBottom: 4 },
  descEllipsisSameLine: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 14,
  },
  moreInlineTap: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  viewLessLink: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
    textDecorationLine: 'underline',
  },
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
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    marginRight: 6,
  },
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
  editInputSingle: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111',
    marginBottom: 10,
  },
  editInput: {
    minHeight: 100,
    maxHeight: 180,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#111',
    textAlignVertical: 'top',
    marginBottom: 12,
  },
  editMediaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
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

export default ProductShortsVideo;
