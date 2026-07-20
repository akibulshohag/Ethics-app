import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Share,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Video from 'react-native-video';
import Slider from '@react-native-community/slider';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  getVideoById,
  toggleLike,
  toggleDislike,
  recordView,
  recordShare,
  deleteVideo,
} from '../services/videoService';
import { shortsService } from '../services/shortsService';
import CommentsModal from './CommentsModal';
import SaveModal from './SaveModal';
import {IMAGE_PLACEHOLDER, safeImageUri} from '../utils/helper';

const { width: W } = Dimensions.get('window');
const PLAYER_H = Math.min(260, W * 0.56);

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
  if (diffMonths > 0) return `${diffMonths}mo ago`;
  if (diffDays > 0) return `${diffDays}d ago`;
  return 'Recently';
};

/** Sibling rows from profile gallery mix videos + shorts; "More videos" lists full videos only. */
const isSiblingShort = it => {
  if (it?.isShort) return true;
  const t = String(it?.type || it?._type || it?.contentType || '').toLowerCase();
  if (t === 'short' || t === 'shorts') return true;
  if (/\/shorts?\//i.test(String(it?.videoUrl || it?.mediaUrl || '')))
    return true;
  return false;
};

/** List API shape varies; build a detail-like object until getVideoById fills in. */
const siblingToPartialDetail = item => {
  const user = item.user || {};
  const channelName = user.nickname || user.name || 'Channel';
  const channelAvatarRaw =
    user.photos?.[0] || (Array.isArray(user.photos) && user.photos[0]) || null;
  const channelAvatar =
    typeof channelAvatarRaw === 'string' && channelAvatarRaw.trim()
      ? channelAvatarRaw.trim()
      : channelAvatarRaw &&
        typeof channelAvatarRaw === 'object' &&
        (channelAvatarRaw.src || channelAvatarRaw.uri)
      ? channelAvatarRaw.src || channelAvatarRaw.uri
      : 'https://ui-avatars.com/api/?name=' +
        encodeURIComponent(channelName) +
        '&background=111&color=fff';
  const rawDur = item.duration;
  const durSec =
    typeof rawDur === 'number'
      ? rawDur
      : typeof rawDur === 'string' && /^\d+:\d+/.test(rawDur)
        ? null
        : Number(rawDur) || 0;
  const durationLabel =
    typeof rawDur === 'string' && rawDur.includes(':')
      ? rawDur
      : formatDuration(durSec || 0);
  const vc = item.viewCount ?? item.views;
  const viewCount =
    typeof vc === 'number'
      ? vc
      : typeof vc === 'string' && /^\d+$/.test(vc.trim())
        ? Number(vc)
        : 0;
  return {
    id: item.id,
    title: item.title || 'Untitled',
    channelName,
    channelAvatar,
    viewCount,
    likeCount: item.likeCount ?? item._count?.likes ?? 0,
    dislikeCount: item.dislikeCount ?? 0,
    commentCount: item.commentCount ?? item._count?.comments ?? 0,
    topLevelCommentCount:
      item.topLevelCommentCount ?? item.commentCount ?? item._count?.comments ?? 0,
    shareCount: item.shareCount ?? 0,
    publishedAt: formatTimeAgo(item.publishedAt || item.createdAt),
    thumbnail: item.thumbnailUrl || item.thumbnail || item.videoUrl || '',
    videoUrl: item.videoUrl,
    duration: durationLabel,
    durationSeconds: durSec || item.durationSeconds || 0,
    description: String(item.description || '').trim(),
    userId: item.userId,
    isLiked: item.isLiked ?? false,
    isDisliked: item.isDisliked ?? false,
    user: item.user,
  };
};

const mapVideoRes = v => {
  const user = v.user || {};
  const viewCount = v.viewCount ?? v._count?.views ?? 0;
  const commentCount = v.commentCount ?? v._count?.comments ?? 0;
  const channelName = user.nickname || user.name || 'Unknown';
  const channelAvatarRaw =
    user.photos?.[0] || (Array.isArray(user.photos) && user.photos[0]) || null;
  const channelAvatar =
    typeof channelAvatarRaw === 'string' && channelAvatarRaw.trim()
      ? channelAvatarRaw.trim()
      : channelAvatarRaw &&
        typeof channelAvatarRaw === 'object' &&
        (channelAvatarRaw.src || channelAvatarRaw.uri)
      ? channelAvatarRaw.src || channelAvatarRaw.uri
      : 'https://ui-avatars.com/api/?name=' +
        encodeURIComponent(channelName) +
        '&background=111&color=fff';
  return {
    id: v.id,
    title: v.title || 'Untitled',
    channelName,
    channelAvatar,
    viewCount,
    likeCount: v.likeCount ?? v._count?.likes ?? 0,
    dislikeCount: v.dislikeCount ?? 0,
    commentCount,
    topLevelCommentCount: v.topLevelCommentCount ?? commentCount,
    shareCount: v.shareCount ?? 0,
    publishedAt: formatTimeAgo(v.publishedAt || v.createdAt),
    thumbnail: v.thumbnailUrl || v.videoUrl || IMAGE_PLACEHOLDER,
    videoUrl: v.videoUrl,
    duration: formatDuration(v.duration),
    durationSeconds: v.duration || 0,
    description: v.description || '',
    userId: v.userId,
    isLiked: v.isLiked ?? false,
    isDisliked: v.isDisliked ?? false,
    user: v.user,
  };
};

const mapShortRes = v => {
  const base = mapVideoRes({
    ...v,
    title: v.title || (v.description || 'Short').slice(0, 80),
    thumbnailUrl: v.thumbnailUrl || v.coverUrl,
    duration: v.duration,
  });
  return { ...base, id: v.id };
};

const ActionBtn = ({
  icon,
  label,
  onPress,
  color,
  disabled,
  btnStyle,
  iconSize = 20,
}) => (
  <TouchableOpacity
    style={[
      styles.actionBtn,
      btnStyle,
      disabled && styles.actionBtnDisabled,
    ]}
    onPress={onPress}
    disabled={disabled}
  >
    <MaterialCommunityIcons
      name={icon}
      size={iconSize}
      color={color || '#212121'}
    />
    <Text style={styles.actionLabel} numberOfLines={1}>
      {label}
    </Text>
  </TouchableOpacity>
);

const DESC_PREVIEW_LEN = 20;

/** Long descriptions: show first N characters, then View more / View less. */
const ExpandableDescription = ({ text, maxLen = DESC_PREVIEW_LEN }) => {
  const [expanded, setExpanded] = useState(false);
  const raw = String(text || '').trim();
  if (!raw) return null;
  const needsToggle = raw.length > maxLen;
  const displayText =
    !needsToggle || expanded ? raw : `${raw.slice(0, maxLen)}…`;
  return (
    <View>
      <Text style={styles.descText}>{displayText}</Text>
      {needsToggle && (
        <TouchableOpacity
          onPress={() => setExpanded(e => !e)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <Text style={styles.viewMoreLink}>
            {expanded ? 'View less' : 'View more'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

/**
 * Full-screen detail for a video or short opened from profile Gallery (no stack navigation).
 */
const GalleryVideoDetailModal = ({
  visible,
  onClose,
  contentId,
  contentKind = 'video',
  profileUserId,
  currentUser,
  navigation,
  siblingItems = [],
  onContentDeleted,
}) => {
  const [activeId, setActiveId] = useState(null);
  const [activeKind, setActiveKind] = useState('video');
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [videoPaused, setVideoPaused] = useState(true);
  const [videoProgress, setVideoProgress] = useState({ currentTime: 0, duration: 0 });
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const videoRef = useRef(null);
  const isSeekingRef = useRef(false);
  const seekResetTimerRef = useRef(null);
  const [isSliding, setIsSliding] = useState(false);
  const [slidingValue, setSlidingValue] = useState(0);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [saveOpen, setSaveOpen] = useState(false);
  /** Full detail per related video id (from getVideoById); merged on like/switch. */
  const [relatedDetails, setRelatedDetails] = useState({});
  /** Which video id CommentsModal is for (defaults to active when null). */
  const [commentsVideoId, setCommentsVideoId] = useState(null);
  /** Save target; null means current active video. */
  const [saveTargetId, setSaveTargetId] = useState(null);
  const [ownerActionsVisible, setOwnerActionsVisible] = useState(false);

  const isOwnContent = useMemo(() => {
    if (!profileUserId || !currentUser?.id) return false;
    return String(profileUserId) === String(currentUser.id);
  }, [profileUserId, currentUser?.id]);

  useEffect(() => {
    if (visible && contentId) {
      setActiveId(String(contentId));
      setActiveKind(contentKind === 'short' ? 'short' : 'video');
    }
  }, [visible, contentId, contentKind]);

  useEffect(() => {
    if (!visible || !activeId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setDetail(null);
      try {
        const role =
          (currentUser?.role && String(currentUser.role).toLowerCase()) || 'user';
        let next;
        if (activeKind === 'short') {
          const res = await shortsService.getShortById(
            activeId,
            currentUser?.id,
            role,
          );
          if (cancelled) return;
          next = mapShortRes(res);
        } else {
          const res = await getVideoById(activeId, currentUser?.id, role);
          if (cancelled) return;
          next = mapVideoRes(res);
        }
        setDetail(next);
        if (activeKind === 'video') {
          recordView(activeId, currentUser?.id).then(() => {
            if (!cancelled) {
              setDetail(prev =>
                prev ? { ...prev, viewCount: (prev.viewCount ?? 0) + 1 } : prev,
              );
            }
          });
        } else {
          shortsService.recordView(activeId, currentUser?.id, 0, false).then(() => {
            if (!cancelled) {
              setDetail(prev =>
                prev ? { ...prev, viewCount: (prev.viewCount ?? 0) + 1 } : prev,
              );
            }
          });
        }
      } catch (e) {
        if (!cancelled) {
          setError(e?.response?.data?.message || e?.message || 'Failed to load');
          setDetail(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setVideoPaused(false);
          setVideoProgress({ currentTime: 0, duration: 0 });
          setVideoError(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, activeId, activeKind, currentUser?.id, currentUser?.role]);

  useEffect(() => {
    if (!visible) {
      setCommentsOpen(false);
      setSaveOpen(false);
      setVideoPaused(true);
      setRelatedDetails({});
      setCommentsVideoId(null);
      setSaveTargetId(null);
      setOwnerActionsVisible(false);
    }
  }, [visible]);

  useEffect(() => {
    return () => {
      if (seekResetTimerRef.current) {
        clearTimeout(seekResetTimerRef.current);
        seekResetTimerRef.current = null;
      }
    };
  }, []);

  const moreVideoIdsKey = useMemo(
    () =>
      (siblingItems || [])
        .filter(
          it =>
            String(it.id) !== String(activeId) && !isSiblingShort(it),
        )
        .map(it => String(it.id))
        .sort()
        .join(','),
    [siblingItems, activeId],
  );

  useEffect(() => {
    if (!visible || activeKind !== 'video' || !moreVideoIdsKey) return;
    const role =
      (currentUser?.role && String(currentUser.role).toLowerCase()) || 'user';
    const ids = moreVideoIdsKey.split(',').filter(Boolean);
    let cancelled = false;
    (async () => {
      await Promise.all(
        ids.map(async id => {
          try {
            const res = await getVideoById(id, currentUser?.id, role);
            if (cancelled) return;
            setRelatedDetails(prev =>
              prev[id] ? prev : { ...prev, [id]: mapVideoRes(res) },
            );
          } catch (_) {
            /* list row still shows via siblingToPartialDetail */
          }
        }),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, moreVideoIdsKey, activeKind, currentUser?.id, currentUser?.role]);

  const openLogin = () => {
    try {
      navigation.navigate('Login');
    } catch (_) {}
  };

  const handleLike = async () => {
    if (!currentUser?.id) {
      openLogin();
      return;
    }
    if (!detail) return;
    try {
      if (activeKind === 'short') {
        await shortsService.toggleLike(detail.id, currentUser.id);
      } else {
        await toggleLike(detail.id, currentUser.id);
      }
      setDetail(prev => {
        if (!prev) return prev;
        const unliking = prev.isLiked;
        return {
          ...prev,
          isLiked: !unliking,
          isDisliked: unliking ? prev.isDisliked : false,
          likeCount: prev.likeCount + (unliking ? -1 : 1),
          dislikeCount:
            !unliking && prev.isDisliked
              ? Math.max(0, prev.dislikeCount - 1)
              : prev.dislikeCount,
        };
      });
    } catch (_) {}
  };

  const handleDislike = async () => {
    if (!currentUser?.id) {
      openLogin();
      return;
    }
    if (!detail) return;
    try {
      if (activeKind === 'short') {
        await shortsService.toggleDislike(detail.id, currentUser.id);
      } else {
        await toggleDislike(detail.id, currentUser.id);
      }
      setDetail(prev => {
        if (!prev) return prev;
        const undis = prev.isDisliked;
        return {
          ...prev,
          isDisliked: !undis,
          isLiked: undis ? prev.isLiked : false,
          dislikeCount: prev.dislikeCount + (undis ? -1 : 1),
          likeCount:
            !undis && prev.isLiked ? Math.max(0, prev.likeCount - 1) : prev.likeCount,
        };
      });
    } catch (_) {}
  };

  const handleShare = async () => {
    if (!detail) return;
    try {
      if (activeKind === 'video') {
        await recordShare(detail.id);
        setDetail(prev =>
          prev ? { ...prev, shareCount: (prev.shareCount ?? 0) + 1 } : prev,
        );
      }
      await Share.share({
        message: `${detail.title}\n${detail.videoUrl || ''}`,
        url: detail.videoUrl || '',
      });
    } catch (e) {
      if (e?.message !== 'User did not share') {
        /* ignore */
      }
    }
  };

  const handleSeek = useCallback(
    sec => {
      if (!videoRef.current || videoProgress.duration <= 0) return;
      const clamped = Math.max(0, Math.min(sec, videoProgress.duration));
      isSeekingRef.current = true;
      videoRef.current.seek(clamped);
      setVideoProgress(p => ({ ...p, currentTime: clamped }));
      if (seekResetTimerRef.current) {
        clearTimeout(seekResetTimerRef.current);
      }
      seekResetTimerRef.current = setTimeout(() => {
        isSeekingRef.current = false;
        seekResetTimerRef.current = null;
      }, 300);
    },
    [videoProgress.duration],
  );

  const formatTime = sec => {
    if (!sec || isNaN(sec)) return '0:00';
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  const displayTime = isSliding ? slidingValue : videoProgress.currentTime;
  const moreVideos = (siblingItems || []).filter(
    it =>
      String(it.id) !== String(activeId) && !isSiblingShort(it),
  );

  const rowDetailFor = useCallback(
    item => {
      const id = String(item.id);
      return relatedDetails[id] || siblingToPartialDetail(item);
    },
    [relatedDetails],
  );

  const findSiblingById = useCallback(
    vid =>
      (siblingItems || []).find(it => String(it.id) === String(vid)) || null,
    [siblingItems],
  );

  const selectSibling = item => {
    const kind = item.type === 'short' ? 'short' : 'video';
    if (detail?.id && activeKind === 'video') {
      const pid = String(detail.id);
      setRelatedDetails(r => (r[pid] ? r : { ...r, [pid]: detail }));
    }
    setActiveId(String(item.id));
    setActiveKind(kind);
  };

  const handleRelatedLike = async item => {
    if (!currentUser?.id) {
      openLogin();
      return;
    }
    const id = String(item.id);
    const cur = rowDetailFor(item);
    try {
      await toggleLike(id, currentUser.id);
      const patch = base => {
        if (!base) return base;
        const unliking = base.isLiked;
        return {
          ...base,
          isLiked: !unliking,
          isDisliked: unliking ? base.isDisliked : false,
          likeCount: base.likeCount + (unliking ? -1 : 1),
          dislikeCount:
            !unliking && base.isDisliked
              ? Math.max(0, base.dislikeCount - 1)
              : base.dislikeCount,
        };
      };
      setRelatedDetails(prev => ({
        ...prev,
        [id]: patch(prev[id] || cur),
      }));
      if (String(activeId) === id) {
        setDetail(prev => patch(prev));
      }
    } catch (_) {}
  };

  const handleRelatedDislike = async item => {
    if (!currentUser?.id) {
      openLogin();
      return;
    }
    const id = String(item.id);
    const cur = rowDetailFor(item);
    try {
      await toggleDislike(id, currentUser.id);
      const patch = base => {
        if (!base) return base;
        const undis = base.isDisliked;
        return {
          ...base,
          isDisliked: !undis,
          isLiked: undis ? base.isLiked : false,
          dislikeCount: base.dislikeCount + (undis ? -1 : 1),
          likeCount:
            !undis && base.isLiked
              ? Math.max(0, base.likeCount - 1)
              : base.likeCount,
        };
      };
      setRelatedDetails(prev => ({
        ...prev,
        [id]: patch(prev[id] || cur),
      }));
      if (String(activeId) === id) {
        setDetail(prev => patch(prev));
      }
    } catch (_) {}
  };

  const handleRelatedShare = async item => {
    const cur = rowDetailFor(item);
    try {
      await recordShare(item.id);
      setRelatedDetails(prev => {
        const id = String(item.id);
        const base = prev[id] || cur;
        return {
          ...prev,
          [id]: { ...base, shareCount: (base.shareCount ?? 0) + 1 },
        };
      });
      if (String(activeId) === String(item.id)) {
        setDetail(prev =>
          prev ? { ...prev, shareCount: (prev.shareCount ?? 0) + 1 } : prev,
        );
      }
      await Share.share({
        message: `${cur.title}\n${cur.videoUrl || ''}`,
        url: cur.videoUrl || '',
      });
    } catch (e) {
      if (e?.message !== 'User did not share') {
        /* ignore */
      }
    }
  };

  const openCommentsFor = vidId => {
    if (!currentUser?.id) {
      openLogin();
      return;
    }
    setCommentsVideoId(String(vidId));
    setCommentsOpen(true);
  };

  const openSaveFor = vidId => {
    if (!currentUser?.id) {
      openLogin();
      return;
    }
    setSaveTargetId(vidId ? String(vidId) : null);
    setSaveOpen(true);
  };

  const commentsResolvedId =
    commentsVideoId != null ? commentsVideoId : activeId;
  const commentsResolvedVideo = useMemo(() => {
    if (!commentsResolvedId) return detail;
    if (String(commentsResolvedId) === String(activeId)) {
      return detail;
    }
    const k = String(commentsResolvedId);
    return (
      relatedDetails[k] ||
      siblingToPartialDetail(findSiblingById(k) || { id: k })
    );
  }, [
    commentsResolvedId,
    activeId,
    detail,
    relatedDetails,
    findSiblingById,
  ]);

  const commentsTargetIsShort = useMemo(
    () =>
      String(commentsResolvedId) === String(activeId) &&
      activeKind === 'short',
    [commentsResolvedId, activeId, activeKind],
  );

  const openChat = () => {
    if (!currentUser?.id) {
      openLogin();
      return;
    }
    const partnerId = profileUserId || detail?.userId;
    if (!partnerId) return;
    try {
      navigation.navigate('ChatScreen', {
        partnerId,
        partnerName: detail?.channelName || 'Channel',
        partnerAvatar: detail?.channelAvatar,
      });
    } catch (_) {
      Alert.alert('Chat', 'Unable to open chat.');
    }
  };

  const handleDeleteContent = useCallback(() => {
    if (!isOwnContent || !activeId || !currentUser?.id) return;
    setOwnerActionsVisible(false);
    const label = activeKind === 'short' ? 'short' : 'video';
    Alert.alert(
      `Delete ${label}`,
      `Are you sure you want to delete this ${label}? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (activeKind === 'short') {
                await shortsService.deleteShort(activeId, currentUser.id);
              } else {
                await deleteVideo(activeId, currentUser.id);
              }
              onContentDeleted?.({
                contentId: activeId,
                contentKind: activeKind,
              });
              onClose?.();
            } catch (e) {
              Alert.alert(
                'Error',
                e?.response?.data?.message ||
                  e?.message ||
                  `Failed to delete ${label}`,
              );
            }
          },
        },
      ],
    );
  }, [
    isOwnContent,
    activeId,
    activeKind,
    currentUser?.id,
    onContentDeleted,
    onClose,
  ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.root} edges={['top']}>
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onClose}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <MaterialCommunityIcons name="arrow-left" size={24} color="#111" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          {isOwnContent ? (
            <TouchableOpacity
              style={styles.ownerMenuBtn}
              onPress={() => setOwnerActionsVisible(true)}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <MaterialCommunityIcons
                name="dots-vertical"
                size={24}
                color="#111"
              />
            </TouchableOpacity>
          ) : null}
        </View>

        {loading && !detail ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#F97507" />
            <Text style={styles.muted}>Loading…</Text>
          </View>
        ) : error && !detail ? (
          <View style={styles.centered}>
            <Text style={styles.errText}>{error}</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={onClose}>
              <Text style={styles.retryBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <View style={styles.playerWrap}>
              {detail?.videoUrl ? (
                <>
                  <Video
                    ref={videoRef}
                    key={`${activeKind}-${activeId}`}
                    source={{
                      uri: String(detail.videoUrl).trim(),
                    }}
                    style={styles.video}
                    resizeMode="contain"
                    paused={videoPaused}
                    repeat={false}
                    controls={false}
                    onLoadStart={() => {
                      setVideoLoading(true);
                      setVideoError(null);
                    }}
                    onLoad={data => {
                      setVideoLoading(false);
                      setVideoProgress(p => ({
                        ...p,
                        duration: data.duration || p.duration,
                      }));
                      setVideoPaused(false);
                    }}
                    onProgress={data => {
                      if (isSeekingRef.current || data.currentTime === undefined)
                        return;
                      setVideoProgress(p => ({
                        currentTime: data.currentTime,
                        duration:
                          data.seekableDuration || data.duration || p.duration,
                      }));
                    }}
                    onError={e => {
                      setVideoLoading(false);
                      setVideoError(
                        e?.error?.localizedDescription || 'Playback error',
                      );
                    }}
                  />
                  {videoLoading && !videoError && (
                    <View style={styles.bufferOverlay}>
                      <ActivityIndicator color="#fff" size="large" />
                    </View>
                  )}
                  {videoError && (
                    <View style={styles.bufferOverlay}>
                      <Text style={styles.videoErr}>{videoError}</Text>
                    </View>
                  )}
                  <View style={styles.playCenter} pointerEvents="box-none">
                    <TouchableOpacity
                      onPress={() => setVideoPaused(p => !p)}
                      activeOpacity={0.85}
                      hitSlop={{ top: 24, bottom: 24, left: 24, right: 24 }}
                    >
                      <MaterialCommunityIcons
                        name={videoPaused ? 'play-circle' : 'pause-circle'}
                        size={56}
                        color="rgba(255,255,255,0.9)"
                      />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.sliderRow}>
                    <Slider
                      style={styles.slider}
                      value={displayTime}
                      minimumValue={0}
                      maximumValue={Math.max(0.1, videoProgress.duration)}
                      minimumTrackTintColor="#F97507"
                      maximumTrackTintColor="rgba(255,255,255,0.35)"
                      thumbTintColor="#fff"
                      onSlidingStart={() => {
                        setIsSliding(true);
                        setSlidingValue(videoProgress.currentTime);
                      }}
                      onValueChange={setSlidingValue}
                      onSlidingComplete={val => {
                        handleSeek(val);
                        setIsSliding(false);
                      }}
                    />
                    <Text style={styles.timeLbl}>
                      {formatTime(displayTime)} /{' '}
                      {formatTime(videoProgress.duration) || detail?.duration || '0:00'}
                    </Text>
                  </View>
                </>
              ) : (
                <Image
                  source={{
                    uri: safeImageUri(
                      detail?.thumbnail,
                      IMAGE_PLACEHOLDER,
                    ),
                  }}
                  style={styles.video}
                  resizeMode="cover"
                />
              )}
            </View>

            <View style={styles.body}>
              <Text style={styles.title}>{detail?.title}</Text>
              <Text style={styles.meta}>
                {formatCount(detail?.viewCount ?? 0)} views • {detail?.publishedAt}
              </Text>

              <View style={styles.engageBlock}>
                <View style={styles.engageRowSingle}>
                  <ActionBtn
                    btnStyle={styles.engageCell7}
                    icon={detail?.isLiked ? 'thumb-up' : 'thumb-up-outline'}
                    label={formatCount(detail?.likeCount ?? 0)}
                    color={detail?.isLiked ? '#F97507' : '#212121'}
                    onPress={handleLike}
                  />
                  <ActionBtn
                    btnStyle={styles.engageCell7}
                    icon={
                      detail?.isDisliked ? 'thumb-down' : 'thumb-down-outline'
                    }
                    label={formatCount(detail?.dislikeCount ?? 0)}
                    color={detail?.isDisliked ? '#F97507' : '#212121'}
                    onPress={handleDislike}
                  />
                  <ActionBtn
                    btnStyle={styles.engageCell7}
                    icon="comment-text-outline"
                    label={formatCount(
                      detail?.topLevelCommentCount ??
                        detail?.commentCount ??
                        0,
                    )}
                    onPress={() => openCommentsFor(activeId)}
                  />
                  <ActionBtn
                    btnStyle={styles.engageCell7}
                    icon="message-text-outline"
                    label="Chat"
                    onPress={openChat}
                  />
                  <ActionBtn
                    btnStyle={styles.engageCell7}
                    icon="share-variant-outline"
                    label="Share"
                    onPress={handleShare}
                  />
                  <ActionBtn
                    btnStyle={styles.engageCell7}
                    icon="bookmark-outline"
                    label="Save"
                    onPress={() => openSaveFor(null)}
                  />
                  <ActionBtn
                    btnStyle={styles.engageCell7}
                    icon="eye-outline"
                    label={formatCount(detail?.viewCount ?? 0)}
                    onPress={() => {}}
                  />
                </View>
              </View>

              {!!detail?.description?.trim() && (
                <View style={styles.descBox}>
                  <Text style={styles.descTitle}>Description</Text>
                  <ExpandableDescription text={detail.description} />
                </View>
              )}

              {moreVideos.length > 0 && (
                <View style={styles.moreSection}>
                  <Text style={styles.moreTitle}>More videos</Text>
                  {moreVideos.map(item => {
                    const rd = rowDetailFor(item);
                    return (
                      <View
                        key={String(item.id)}
                        style={styles.relatedFeedBlock}
                      >
                        <TouchableOpacity
                          activeOpacity={0.9}
                          onPress={() => selectSibling(item)}
                        >
                          <View style={styles.relatedThumbWrap}>
                            <Image
                              source={{
                                uri: safeImageUri(
                                  rd.thumbnail,
                                  IMAGE_PLACEHOLDER,
                                ),
                              }}
                              style={styles.relatedHeroThumb}
                            />
                            <View style={styles.relatedPlayOverlay}>
                              <MaterialCommunityIcons
                                name="play-circle"
                                size={44}
                                color="rgba(255,255,255,0.95)"
                              />
                            </View>
                          </View>
                          <View style={styles.relatedTitleBlock}>
                            <Text style={styles.title}>
                              {rd.title || 'Video'}
                            </Text>
                            <Text style={styles.meta}>
                              {formatCount(rd.viewCount ?? 0)} views •{' '}
                              {rd.publishedAt}
                            </Text>
                          </View>
                        </TouchableOpacity>

                        <View style={styles.engageBlock}>
                          <View style={styles.engageRowSingle}>
                            <ActionBtn
                              btnStyle={styles.engageCell7}
                              icon={
                                rd.isLiked ? 'thumb-up' : 'thumb-up-outline'
                              }
                              label={formatCount(rd.likeCount ?? 0)}
                              color={rd.isLiked ? '#F97507' : '#212121'}
                              onPress={() => handleRelatedLike(item)}
                            />
                            <ActionBtn
                              btnStyle={styles.engageCell7}
                              icon={
                                rd.isDisliked
                                  ? 'thumb-down'
                                  : 'thumb-down-outline'
                              }
                              label={formatCount(rd.dislikeCount ?? 0)}
                              color={rd.isDisliked ? '#F97507' : '#212121'}
                              onPress={() => handleRelatedDislike(item)}
                            />
                            <ActionBtn
                              btnStyle={styles.engageCell7}
                              icon="comment-text-outline"
                              label={formatCount(
                                rd.topLevelCommentCount ??
                                  rd.commentCount ??
                                  0,
                              )}
                              onPress={() => openCommentsFor(item.id)}
                            />
                            <ActionBtn
                              btnStyle={styles.engageCell7}
                              icon="message-text-outline"
                              label="Chat"
                              onPress={openChat}
                            />
                            <ActionBtn
                              btnStyle={styles.engageCell7}
                              icon="share-variant-outline"
                              label="Share"
                              onPress={() => handleRelatedShare(item)}
                            />
                            <ActionBtn
                              btnStyle={styles.engageCell7}
                              icon="bookmark-outline"
                              label="Save"
                              onPress={() => openSaveFor(String(item.id))}
                            />
                            <ActionBtn
                              btnStyle={styles.engageCell7}
                              icon="eye-outline"
                              label={formatCount(rd.viewCount ?? 0)}
                              onPress={() => {}}
                            />
                          </View>
                        </View>

                        {!!String(rd.description || '').trim() && (
                          <View style={styles.descBox}>
                            <Text style={styles.descTitle}>Description</Text>
                            <ExpandableDescription text={rd.description} />
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </ScrollView>
        )}

        <CommentsModal
          visible={commentsOpen}
          onClose={() => {
            setCommentsOpen(false);
            setCommentsVideoId(null);
          }}
          contentType={commentsTargetIsShort ? 'short' : 'video'}
          contentId={
            commentsTargetIsShort ? String(commentsResolvedId) : undefined
          }
          videoId={
            !commentsTargetIsShort ? String(commentsResolvedId) : undefined
          }
          video={commentsResolvedVideo}
          user={currentUser}
          totalComments={
            commentsResolvedVideo
              ? Number(
                  commentsResolvedVideo.topLevelCommentCount ??
                    commentsResolvedVideo.commentCount ??
                    0,
                )
              : undefined
          }
          onCommentAdded={isReply => {
            const targetId = String(commentsResolvedId);
            const patch = prev => {
              if (!prev) return prev;
              const next = {
                ...prev,
                commentCount: (prev.commentCount ?? 0) + 1,
              };
              if (!isReply) {
                next.topLevelCommentCount =
                  (prev.topLevelCommentCount ?? prev.commentCount ?? 0) + 1;
              }
              return next;
            };
            if (String(targetId) === String(activeId)) {
              setDetail(patch);
            }
            setRelatedDetails(prev => {
              const base =
                prev[targetId] ||
                siblingToPartialDetail(
                  findSiblingById(targetId) || { id: targetId },
                );
              return { ...prev, [targetId]: patch(base) };
            });
          }}
          onCommentDeleted={(wasTop, deletedCount) => {
            const targetId = String(commentsResolvedId);
            const patch = prev => {
              if (!prev) return prev;
              const next = {
                ...prev,
                commentCount: Math.max(
                  0,
                  (prev.commentCount ?? 0) - deletedCount,
                ),
              };
              if (wasTop) {
                next.topLevelCommentCount = Math.max(
                  0,
                  (prev.topLevelCommentCount ?? prev.commentCount ?? 0) - 1,
                );
              }
              return next;
            };
            if (String(targetId) === String(activeId)) {
              setDetail(patch);
            }
            setRelatedDetails(prev => {
              const base =
                prev[targetId] ||
                siblingToPartialDetail(
                  findSiblingById(targetId) || { id: targetId },
                );
              return { ...prev, [targetId]: patch(base) };
            });
          }}
        />

        <SaveModal
          visible={saveOpen}
          onClose={() => {
            setSaveOpen(false);
            setSaveTargetId(null);
          }}
          contentType={
            saveTargetId != null
              ? 'video'
              : activeKind === 'short'
                ? 'short'
                : 'video'
          }
          contentId={saveTargetId ?? activeId}
        />

        <Modal
          visible={ownerActionsVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setOwnerActionsVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={styles.ownerSheetBackdrop}
            onPress={() => setOwnerActionsVisible(false)}
          >
            <View style={styles.ownerSheetBox}>
              <Text style={styles.ownerSheetTitle}>
                {detail?.title || 'Video options'}
              </Text>
              <TouchableOpacity
                style={styles.ownerSheetRow}
                onPress={handleDeleteContent}
              >
                <MaterialCommunityIcons
                  name="delete-outline"
                  size={22}
                  color="#E53935"
                />
                <Text style={styles.ownerSheetDeleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  ownerMenuBtn: { padding: 4 },
  backText: { marginLeft: 4, fontSize: 16, fontWeight: '600', color: '#111' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  muted: { marginTop: 8, color: '#888' },
  errText: { color: '#c00', textAlign: 'center', marginBottom: 12 },
  retryBtn: {
    backgroundColor: '#F97507',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryBtnText: { color: '#fff', fontWeight: '700' },
  scrollContent: { paddingBottom: 32 },
  playerWrap: {
    width: '100%',
    height: PLAYER_H,
    backgroundColor: '#000',
    position: 'relative',
  },
  video: { width: '100%', height: '100%' },
  bufferOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  videoErr: { color: '#fff', paddingHorizontal: 16, textAlign: 'center' },
  playCenter: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingBottom: 8,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  slider: { width: '100%', height: 36 },
  timeLbl: { color: '#fff', fontSize: 11, marginTop: -4, marginBottom: 4 },
  body: { paddingHorizontal: 16, paddingTop: 12 },
  title: { fontSize: 17, fontWeight: '800', color: '#111' },
  meta: { marginTop: 6, fontSize: 13, color: '#666' },
  engageBlock: {
    marginTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    paddingVertical: 4,
  },
  engageRowSingle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    flexWrap: 'nowrap',
  },
  actionBtn: {
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 0,
  },
  engageCell7: {
    flex: 1,
    minWidth: 0,
  },
  actionBtnDisabled: { opacity: 0.45 },
  actionLabel: {
    fontSize: 9,
    marginTop: 4,
    color: '#333',
    fontWeight: '600',
    textAlign: 'center',
  },
  descBox: { marginTop: 16, padding: 12, backgroundColor: '#f6f6f6', borderRadius: 10 },
  descTitle: { fontSize: 13, fontWeight: '700', marginBottom: 6, color: '#111' },
  descText: { fontSize: 13, color: '#444', lineHeight: 18 },
  viewMoreLink: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '700',
    color: '#F97507',
  },
  moreSection: { marginTop: 20 },
  moreTitle: { fontSize: 16, fontWeight: '800', color: '#111', marginBottom: 12 },
  relatedFeedBlock: {
    marginBottom: 24,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8e8e8',
  },
  relatedThumbWrap: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  relatedHeroThumb: {
    width: '100%',
    height: '100%',
  },
  relatedPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedTitleBlock: {
    marginTop: 10,
    paddingHorizontal: 0,
  },
  ownerSheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  ownerSheetBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 28,
    paddingTop: 12,
  },
  ownerSheetTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 16,
  },
  ownerSheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  ownerSheetDeleteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#E53935',
  },
});

export default GalleryVideoDetailModal;
