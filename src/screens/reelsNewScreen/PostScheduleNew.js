import React, { useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { shortsService } from '../../services/shortsService';
import { getSocialAccounts } from '../../services/postService';
import { normalizeAnchor } from '../../constants/overlayTextAnchor';
import { resolveReelUploadFilterId } from '../../constants/reelStylePresets';
import { thumbnailFromVideoFrame } from '../../utils/videoThumbnail';

const defaultScheduleTime = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + 10, 0, 0);
  return d;
};

const EXPORT_DIMS = {
  '720x1280': { w: 720, h: 1280 },
  '1080x1920': { w: 1080, h: 1920 },
};

const PLATFORM_TO_SWITCH = {
  facebook: 'fb',
  instagram: 'ig',
  tiktok: 'tk',
  youtube: 'yt',
};
const EDIT_PREFS_KEY_PREFIX = 'reel-edit-prefs-v1:';

const mapToSwitches = list => {
  const next = { fb: false, ig: false, tk: false, yt: false };
  (Array.isArray(list) ? list : []).forEach(p => {
    const pStr = String(p || '').toLowerCase();
    const key =
      PLATFORM_TO_SWITCH[pStr] ||
      (pStr === 'facebook'
        ? 'fb'
        : pStr === 'instagram'
        ? 'ig'
        : pStr === 'tiktok'
        ? 'tk'
        : pStr === 'youtube'
        ? 'yt'
        : null);
    if (key) next[key] = true;
  });
  return next;
};

const getPlatformsFromShort = short => {
  if (!short || typeof short !== 'object') return [];
  const fromArrays = Array.isArray(short?.platforms)
    ? short.platforms
    : Array.isArray(short?.selectedPlatforms)
    ? short.selectedPlatforms
    : [];
  if (fromArrays.length) return fromArrays;
  return [
    short?.facebookPageId ? 'facebook' : null,
    short?.instagramAccountId ? 'instagram' : null,
    short?.tiktokAccountId ? 'tiktok' : null,
    short?.youtubeChannelId ? 'youtube' : null,
  ].filter(Boolean);
};

const saveEditPrefs = async ({ shortId, platforms, scheduledPublishAt }) => {
  const id = String(shortId || '').trim();
  if (!id) return;
  const payload = {
    platforms: Array.isArray(platforms) ? platforms : [],
    scheduledPublishAt: scheduledPublishAt || null,
    updatedAt: new Date().toISOString(),
  };
  try {
    await AsyncStorage.setItem(
      `${EDIT_PREFS_KEY_PREFIX}${id}`,
      JSON.stringify(payload),
    );
  } catch {}
};

const loadEditPrefs = async shortId => {
  const id = String(shortId || '').trim();
  if (!id) return null;
  try {
    const raw = await AsyncStorage.getItem(`${EDIT_PREFS_KEY_PREFIX}${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
};

const extractShortFromResponse = payload => {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.short && typeof payload.short === 'object') return payload.short;
  if (payload.data && typeof payload.data === 'object') return payload.data;
  return payload;
};

const isLocalMediaUri = uri => {
  const raw = String(uri || '')
    .trim()
    .toLowerCase();
  if (!raw) return false;
  return !raw.startsWith('http://') && !raw.startsWith('https://');
};

const isRemoteMediaUri = uri => {
  const raw = String(uri || '')
    .trim()
    .toLowerCase();
  return raw.startsWith('http://') || raw.startsWith('https://');
};

const parseValidDate = raw => {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isFinite(d.getTime()) ? d : null;
};

const mapVisibilityForApi = v => {
  const x = String(v || '').toLowerCase();
  if (x.includes('private')) return 'private';
  if (x.includes('public')) return 'public';
  return 'public';
};

const mapCommentsForApi = c => {
  const x = String(c || '').toLowerCase();
  if (x.includes('disable')) return 'disable';
  if (x.includes('hold')) return 'hold';
  return 'allow';
};

function formatReelUploadError(err) {
  const code = err?.code;
  const msg = String(err?.message || '');
  if (code === 'ECONNABORTED' || /timeout/i.test(msg)) {
    return 'Upload timed out. Long videos need more time—use Wi‑Fi, wait, and try again, or trim to a shorter clip.';
  }
  if (msg === 'Network Error' || /network/i.test(msg)) {
    let base = '';
    try {
      // Lazy require to avoid circular deps; config lives at repo root.
      // eslint-disable-next-line global-require
      const { config } = require('../../../config');
      base = String(config?.apiBaseUrl || '').replace(/\/$/, '');
    } catch {}
    return `Network error—check your connection. If the video is long, stay on Wi‑Fi until the upload finishes.${
      base ? `\n\nAPI: ${base}` : ''
    }`;
  }
  const data = err?.response?.data;
  if (data?.message) {
    if (Array.isArray(data.message)) return data.message.join('\n');
    return String(data.message);
  }
  if (Array.isArray(data?.errors) && data.errors.length) {
    const parts = data.errors.map(e => {
      const detail = e.constraints
        ? Object.values(e.constraints).join(', ')
        : 'invalid';
      return `${e.property || 'field'}: ${detail}`;
    });
    return `Request validation: ${parts.join('; ')}`;
  }
  if (err?.response?.status === 403 || /status code 403|forbidden/i.test(msg)) {
    return 'Video processing failed on server (403). This can happen with heavy edits or restricted audio links. Try again, trim shorter, or remove added music.';
  }
  return msg || 'Could not publish reel';
}

const ScheduleScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector(state => state?.app?.user);
  const draft = route.params?.draft || {};
  const [switches, setSwitches] = useState({
    fb: false,
    ig: false,
    tk: false,
    yt: false,
  });
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [socialResolved, setSocialResolved] = useState(false);
  const [postNow, setPostNow] = useState(true);
  const [scheduleAt, setScheduleAt] = useState(defaultScheduleTime);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStage, setUploadStage] = useState('');
  const [hasPlatformPrefill, setHasPlatformPrefill] = useState(false);
  const [prefilledFromDraft, setPrefilledFromDraft] = useState(false);
  const [prefilledFromBackend, setPrefilledFromBackend] = useState(false);
  const [prefilledFromCache, setPrefilledFromCache] = useState(false);
  const editShortId = String(
    draft?.shortId || route.params?.shortId || route.params?.short?.id || '',
  ).trim();
  const isEditFlow = Boolean(route.params?.isEdit || editShortId);

  const platforms = [
    {
      id: 'fb',
      name: 'Facebook',
      icon: 'https://cdn-icons-png.flaticon.com/512/124/124010.png',
    },
    {
      id: 'ig',
      name: 'Instagram',
      icon: 'https://cdn-icons-png.flaticon.com/512/174/174855.png',
    },
    {
      id: 'tk',
      name: 'Tiktok',
      icon: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png',
    },
    {
      id: 'yt',
      name: 'Youtube',
      icon: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png',
    },
  ];

  useEffect(() => {
    if (prefilledFromDraft) return;

    // DEBUG: Log what draft data we're receiving
    console.log('=== PostScheduleNew DEBUG ===');
    console.log('draft:', JSON.stringify(draft, null, 2));
    console.log('route.params:', JSON.stringify(route.params, null, 2));
    console.log('isEditFlow:', isEditFlow);
    console.log('editShortId:', editShortId);

    const ed = draft?.edits || {};
    const explicitScheduleRaw =
      draft?.scheduledPublishAt ||
      draft?.scheduleAt ||
      draft?.scheduleDate ||
      draft?.scheduledAt ||
      ed?.scheduledPublishAt ||
      ed?.scheduleAt ||
      ed?.scheduleDate ||
      ed?.scheduledAt ||
      null;

    console.log('explicitScheduleRaw:', explicitScheduleRaw);

    const candidateSchedule =
      parseValidDate(explicitScheduleRaw) ||
      parseValidDate(draft?.publishAt) ||
      parseValidDate(draft?.publishedAt) ||
      null;
    const isFutureCandidate =
      candidateSchedule instanceof Date &&
      candidateSchedule.getTime() > Date.now() + 60_000;

    console.log('candidateSchedule:', candidateSchedule);
    console.log('isFutureCandidate:', isFutureCandidate);

    if (candidateSchedule) {
      setScheduleAt(candidateSchedule);
      if (explicitScheduleRaw || isFutureCandidate) {
        setPostNow(false);
        console.log('Setting postNow=false (has schedule)');
      }
    } else if (isEditFlow && !explicitScheduleRaw) {
      // For edit flow, if no explicit schedule, keep postNow true
      setPostNow(true);
      console.log('Setting postNow=true (edit flow, no schedule)');
    }

    const selectedRaw =
      (Array.isArray(draft?.platforms) && draft.platforms) ||
      (Array.isArray(draft?.selectedPlatforms) && draft.selectedPlatforms) ||
      (Array.isArray(ed?.platforms) && ed.platforms) ||
      (Array.isArray(ed?.selectedPlatforms) && ed.selectedPlatforms) ||
      [];

    console.log('selectedRaw platforms:', selectedRaw);

    if (selectedRaw.length) {
      const next = mapToSwitches(selectedRaw);
      console.log('Platform switches from draft:', next);
      if (Object.values(next).some(Boolean)) {
        setSwitches(next);
        setHasPlatformPrefill(true);
      }
    }

    console.log('=== END DEBUG ===');
    setPrefilledFromDraft(true);
  }, [draft, prefilledFromDraft, isEditFlow, editShortId, route.params]);

  useEffect(() => {
    let cancelled = false;
    const loadFromCache = async () => {
      if (prefilledFromCache || !isEditFlow || !editShortId) {
        if (!prefilledFromCache) setPrefilledFromCache(true);
        return;
      }
      const cached = await loadEditPrefs(editShortId);
      if (cancelled) return;
      if (cached && typeof cached === 'object') {
        const cachedPlatforms = Array.isArray(cached?.platforms)
          ? cached.platforms
          : [];
        if (cachedPlatforms.length) {
          const next = mapToSwitches(cachedPlatforms);
          if (Object.values(next).some(Boolean)) {
            setSwitches(next);
            setHasPlatformPrefill(true);
          }
        }
        const cachedDate = parseValidDate(cached?.scheduledPublishAt);
        if (cachedDate) {
          setScheduleAt(cachedDate);
          setPostNow(false);
        } else if (cached?.scheduledPublishAt === null) {
          setPostNow(true);
        }
      }
      setPrefilledFromCache(true);
    };
    loadFromCache();
    return () => {
      cancelled = true;
    };
  }, [editShortId, isEditFlow, prefilledFromCache]);

  useEffect(() => {
    let cancelled = false;
    const loadFromBackend = async () => {
      if (prefilledFromBackend || !isEditFlow || !editShortId || !user?.id) {
        if (
          !prefilledFromBackend &&
          (!isEditFlow || !editShortId || !user?.id)
        ) {
          setPrefilledFromBackend(true);
        }
        return;
      }
      try {
        const res = await shortsService.getShortById(
          editShortId,
          user.id,
          String(user?.role || '').toLowerCase() || undefined,
        );
        if (cancelled) return;
        const short = extractShortFromResponse(res);
        if (!short || typeof short !== 'object') {
          setPrefilledFromBackend(true);
          return;
        }

        const schedRaw =
          short?.scheduledPublishAt ||
          short?.scheduleAt ||
          short?.scheduleDate ||
          short?.scheduledAt ||
          short?.publishAt ||
          null;
        const explicitSchedRaw =
          short?.scheduledPublishAt ||
          short?.scheduleAt ||
          short?.scheduleDate ||
          short?.scheduledAt ||
          null;
        const d = parseValidDate(schedRaw);
        const isFutureCandidate =
          d instanceof Date && d.getTime() > Date.now() + 60_000;
        if (d) {
          setScheduleAt(d);
          if (explicitSchedRaw || isFutureCandidate) {
            setPostNow(false);
          }
        }

        const platformList = getPlatformsFromShort(short);
        if (platformList.length) {
          const next = mapToSwitches(platformList);
          if (Object.values(next).some(Boolean)) {
            setSwitches(next);
            setHasPlatformPrefill(true);
          }
        } else {
          const next = {
            fb: !!short?.facebookPageId,
            ig: !!short?.instagramAccountId,
            tk: !!short?.tiktokAccountId,
            yt: !!short?.youtubeChannelId,
          };
          if (Object.values(next).some(Boolean)) {
            setSwitches(next);
            setHasPlatformPrefill(true);
          }
        }
      } catch {
        // keep draft-hydrated values if backend detail fetch fails
      } finally {
        if (!cancelled) setPrefilledFromBackend(true);
      }
    };
    loadFromBackend();
    return () => {
      cancelled = true;
    };
  }, [editShortId, isEditFlow, prefilledFromBackend, user?.id, user?.role]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      try {
        const rows = await getSocialAccounts(user.id);
        if (!cancelled) setSocialAccounts(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setSocialAccounts([]);
      } finally {
        if (!cancelled) setSocialResolved(true);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const accountByPlatform = useMemo(() => {
    const out = Object.create(null);
    for (const row of socialAccounts) {
      const p = String(row?.platform || '').toLowerCase();
      if (!out[p]) out[p] = row;
    }
    return out;
  }, [socialAccounts]);

  useEffect(() => {
    if (!socialResolved) return;
    const waitingForEditPrefill =
      isEditFlow &&
      Boolean(user?.id) &&
      (!prefilledFromDraft || !prefilledFromBackend || !prefilledFromCache);
    if (waitingForEditPrefill) return;
    setSwitches(prev => {
      const next = {
        fb: accountByPlatform.facebook ? prev.fb : false,
        ig: accountByPlatform.instagram ? prev.ig : false,
        tk: accountByPlatform.tiktok ? prev.tk : false,
        yt: accountByPlatform.youtube ? prev.yt : false,
      };
      if (!hasPlatformPrefill) {
        next.fb = accountByPlatform.facebook ? true : false;
        next.ig = accountByPlatform.instagram ? true : false;
        next.tk = accountByPlatform.tiktok ? true : false;
        next.yt = accountByPlatform.youtube ? prev.yt : false;
      }
      return next;
    });
  }, [
    accountByPlatform,
    socialResolved,
    hasPlatformPrefill,
    isEditFlow,
    user?.id,
    prefilledFromDraft,
    prefilledFromBackend,
    prefilledFromCache,
  ]);

  const selectedPlatforms = useMemo(() => {
    const m = { fb: 'facebook', ig: 'instagram', tk: 'tiktok', yt: 'youtube' };
    return Object.keys(switches)
      .filter(k => switches[k])
      .map(k => m[k]);
  }, [switches]);

  const dateLabel = scheduleAt.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const timeLabel = scheduleAt.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const onPublish = async () => {
    if (uploading) return;
    if (!user?.id) {
      Alert.alert('Login required', 'Please log in first.');
      return;
    }
    if (!draft?.video?.uri) {
      Alert.alert('Video required', 'Please select or record a reel first.');
      return;
    }
    if (!postNow && scheduleAt.getTime() <= Date.now() + 60_000) {
      Alert.alert('Schedule time', 'Pick a future date/time.');
      return;
    }

    // 🔍 DEBUG: Log when Schedule Post button is clicked
    console.log('=== ONPUBLISH TRIGGERED ===');
    console.log('postNow:', postNow);
    console.log('scheduleAt:', scheduleAt);
    console.log('scheduleAt ISO:', scheduleAt.toISOString());
    console.log('selectedPlatforms:', selectedPlatforms);
    console.log('switches:', switches);
    console.log('isEditFlow:', isEditFlow);
    console.log('editShortId:', editShortId);
    console.log('draft.title:', draft?.title);
    console.log('draft.caption:', draft?.caption);
    console.log('===========================');

    const byPlatform = Object.create(null);
    for (const row of socialAccounts) {
      const p = String(row?.platform || '').toLowerCase();
      if (!byPlatform[p] && row?.accountId)
        byPlatform[p] = String(row.accountId);
    }
    const missingConnections = selectedPlatforms.filter(p => !byPlatform[p]);
    if (missingConnections.length > 0) {
      Alert.alert(
        'Account not connected',
        `Connect these accounts first: ${missingConnections.join(', ')}`,
      );
      return;
    }
    const buildUploadFormData = ({
      simplifiedProcessing = false,
      draftSource = draft,
    } = {}) => {
      const formData = new FormData();
      formData.append('files', {
        uri: draftSource.video.uri,
        type: draftSource.video.type || 'video/mp4',
        name: draftSource.video.name || 'reel.mp4',
      });
      if (draftSource?.thumbnail?.uri) {
        formData.append('files', {
          uri: draftSource.thumbnail.uri,
          type: draftSource.thumbnail.type || 'image/jpeg',
          name: draftSource.thumbnail.name || 'thumb.jpg',
        });
      }
      formData.append('userId', String(user.id));
      formData.append('title', (draft.caption || 'Untitled Reel').trim());
      formData.append('description', (draft.caption || '').trim());
      if (draft?.hashtags?.length) {
        const clean = draft.hashtags
          .map(x =>
            String(x || '')
              .replace(/^#/, '')
              .trim(),
          )
          .filter(Boolean);
        if (clean.length) formData.append('hashtags', JSON.stringify(clean));
      }
      const sourceDur = Math.max(0.05, Number(draft?.video?.durationSec || 30));
      formData.append('duration', String(Math.floor(sourceDur)));

      const ed = draft?.edits || {};
      const trimStart = ed.trimStartSec != null ? Number(ed.trimStartSec) : 0;
      let trimEnd = ed.trimEndSec != null ? Number(ed.trimEndSec) : sourceDur;
      formData.append(
        'trimStartSec',
        !Number.isFinite(trimStart) || trimStart < 0 ? '0' : String(trimStart),
      );
      if (!Number.isFinite(trimEnd) || trimEnd <= trimStart)
        trimEnd = sourceDur;
      formData.append('trimEndSec', String(trimEnd));

      const speedVal = ed.speedFactor != null ? Number(ed.speedFactor) : 1;
      if (Number.isFinite(speedVal) && speedVal > 0) {
        formData.append('speedFactor', String(speedVal));
      }
      const filterId = resolveReelUploadFilterId({
        stylePresetId: draft?.edits?.stylePresetId,
        selectedFilter: draft?.edits?.selectedFilter,
      });
      formData.append('filterId', filterId);
      if (draft?.edits?.selectedFilter?.name) {
        formData.append('filterName', String(draft.edits.selectedFilter.name));
      }

      const selectedSoundUrl = String(
        draft?.edits?.selectedSound?.soundUrl ||
          draft?.edits?.selectedSound?.previewUrl ||
          draft?.edits?.selectedSound?.url ||
          '',
      ).trim();
      if (
        !simplifiedProcessing &&
        (draft?.edits?.selectedSound?.id || selectedSoundUrl)
      ) {
        if (draft?.edits?.selectedSound?.id) {
          formData.append('soundId', String(draft.edits.selectedSound.id));
        }
        formData.append(
          'soundTitle',
          String(draft?.edits?.selectedSound?.title || ''),
        );
        formData.append(
          'soundArtist',
          String(draft?.edits?.selectedSound?.artist || ''),
        );
        if (selectedSoundUrl) {
          formData.append('soundUrl', selectedSoundUrl);
        }
      }
      if (!simplifiedProcessing && draft?.edits?.overlayText) {
        const xPct = Math.max(
          0,
          Math.min(1, Number(draft?.edits?.overlayTextXPct ?? 0.5)),
        );
        const yPct = Math.max(
          0,
          Math.min(1, Number(draft?.edits?.overlayTextYPct ?? 0.78)),
        );
        formData.append('overlayText', String(draft.edits.overlayText));
        formData.append(
          'overlayTextSize',
          String(Math.round(Number(draft?.edits?.overlayTextSize || 30))),
        );
        formData.append(
          'overlayTextColor',
          String(draft?.edits?.overlayTextColor || '#FFFFFF'),
        );
        formData.append('overlayTextX', `(${xPct.toFixed(4)}*(w-text_w))`);
        formData.append('overlayTextY', `(${yPct.toFixed(4)}*(h-text_h))`);
      }
      if (
        !simplifiedProcessing &&
        Array.isArray(draft?.edits?.overlayLayers) &&
        draft.edits.overlayLayers.length
      ) {
        const overlayItems = draft.edits.overlayLayers
          .map(layer => {
            const text = String(layer?.text || '').trim();
            if (!text) return null;
            const xPct = Math.max(0, Math.min(1, Number(layer?.xPct ?? 0.5)));
            const yPct = Math.max(0, Math.min(1, Number(layer?.yPct ?? 0.78)));
            const startSec = Math.max(0, Number(layer?.startSec ?? 0));
            const endSec = Math.max(
              startSec,
              Number(layer?.endSec ?? draft?.video?.durationSec ?? 0),
            );
            return {
              text,
              color: String(layer?.color || '#FFFFFF'),
              size: Math.round(Number(layer?.size || 30)),
              xPct,
              yPct,
              x: `(${xPct.toFixed(4)}*(w-text_w))`,
              y: `(${yPct.toFixed(4)}*(h-text_h))`,
              startSec,
              endSec,
              rotateDeg: Number(layer?.rotateDeg || 0),
              shadowPreset: String(layer?.shadowPreset || 'soft'),
              anchor: normalizeAnchor(layer?.anchor),
            };
          })
          .filter(Boolean);
        if (overlayItems.length) {
          formData.append('overlayItems', JSON.stringify(overlayItems));
        }
      }
      if (draft?.edits?.originalVolume != null) {
        formData.append(
          'originalVolume',
          String(Number(draft.edits.originalVolume)),
        );
      }
      if (draft?.edits?.musicVolume != null && !simplifiedProcessing) {
        formData.append('musicVolume', String(Number(draft.edits.musicVolume)));
      }
      if (
        !simplifiedProcessing &&
        Array.isArray(draft?.edits?.splitPoints) &&
        draft.edits.splitPoints.length > 0
      ) {
        formData.append(
          'splitPoints',
          JSON.stringify(
            draft.edits.splitPoints.map(Number).filter(Number.isFinite),
          ),
        );
      }
      if (!simplifiedProcessing) {
        const transId = String(
          draft?.edits?.transitionId || 'none',
        ).toLowerCase();
        if (transId && transId !== 'none') {
          formData.append('transitionId', transId);
          if (draft?.edits?.transitionDurationSec != null) {
            formData.append(
              'transitionDurationSec',
              String(Number(draft.edits.transitionDurationSec)),
            );
          }
        }
        const preset = draft?.edits?.exportQuality?.preset;
        const exportFps = Number(draft?.edits?.exportQuality?.fps);
        const dims = preset ? EXPORT_DIMS[preset] : null;
        if (dims?.w && dims?.h) {
          formData.append('exportWidth', String(dims.w));
          formData.append('exportHeight', String(dims.h));
        }
        if (Number.isFinite(exportFps) && exportFps > 0) {
          formData.append('exportFps', String(exportFps));
        }
        if (draft?.edits?.beautyLevel != null) {
          const bl = Math.round(Number(draft.edits.beautyLevel));
          if (Number.isFinite(bl) && bl >= 0)
            formData.append('beautyLevel', String(bl));
        }
      }
      formData.append('platforms', JSON.stringify(selectedPlatforms));
      if (!postNow)
        formData.append('scheduledPublishAt', scheduleAt.toISOString());
      if (switches.fb && byPlatform.facebook)
        formData.append('facebookPageId', byPlatform.facebook);
      if (switches.ig && byPlatform.instagram)
        formData.append('instagramAccountId', byPlatform.instagram);
      if (switches.tk && byPlatform.tiktok)
        formData.append('tiktokAccountId', byPlatform.tiktok);
      if (switches.yt && byPlatform.youtube)
        formData.append('youtubeChannelId', byPlatform.youtube);
      return formData;
    };

    try {
      setUploading(true);
      let createdOrUpdatedShort = null;
      const publishScheduleIso = postNow ? null : scheduleAt.toISOString();
      if (isEditFlow && editShortId) {
        setUploadStage('Saving changes...');
        const hadFutureSchedule = Boolean(
          draft?.edits?.hadFutureSchedule ||
            draft?.edits?.scheduledPublishAt ||
            draft?.scheduledPublishAt,
        );
        const patch = {
          title: String(
            draft?.title || draft?.caption || 'Untitled Reel',
          ).trim(),
          description: String(draft?.caption || '').trim(),
          ...(draft?.video?.uri &&
            !isLocalMediaUri(draft.video.uri) && {
              videoUrl: String(draft.video.uri).trim(),
            }),
          ...(draft?.thumbnail?.uri &&
            !isLocalMediaUri(draft.thumbnail.uri) && {
              thumbnailUrl: String(draft.thumbnail.uri).trim(),
            }),
          visibility: mapVisibilityForApi(draft?.edits?.visibility),
          commentSetting: mapCommentsForApi(draft?.edits?.comments),
          ...(draft?.edits?.madeForKids != null && {
            madeForKids: Boolean(draft.edits.madeForKids),
          }),
          ...(draft?.edits?.ageRestricted != null && {
            ageRestricted: Boolean(draft.edits.ageRestricted),
          }),
        };
        if (selectedPlatforms.length > 0) {
          patch.platforms = selectedPlatforms;
        }
        // Keep edit PATCH conservative to avoid backend DTO validation mismatches.
        if (!postNow) {
          patch.scheduledPublishAt = scheduleAt.toISOString();
        } else if (hadFutureSchedule) {
          patch.scheduledPublishAt = null;
          patch.publishImmediately = true;
        }

        const videoUri = String(draft?.video?.uri || '').trim();
        const thumbnailUri = String(draft?.thumbnail?.uri || '').trim();
        const shouldReplaceMedia =
          (videoUri && isLocalMediaUri(videoUri)) ||
          (thumbnailUri && isLocalMediaUri(thumbnailUri));
        if (shouldReplaceMedia) {
          setUploadStage('Uploading updated media...');
          const replaceRes = await shortsService.replaceShortMedia(editShortId, user.id, {
            videoUri:
              videoUri && isLocalMediaUri(videoUri) ? videoUri : undefined,
            videoType: draft?.video?.type,
            videoName: draft?.video?.name,
            thumbnailUri:
              thumbnailUri && isLocalMediaUri(thumbnailUri)
                ? thumbnailUri
                : undefined,
            thumbnailType: draft?.thumbnail?.type,
            thumbnailName: draft?.thumbnail?.name,
          });
          const replaced = extractShortFromResponse(replaceRes) || {};
          let mediaCheckVideo = String(
            replaced?.videoUrl || replaced?.mediaUrl || '',
          ).trim();
          let mediaCheckThumb = String(
            replaced?.thumbnailUrl || replaced?.coverUrl || '',
          ).trim();
          const needsVideoCheck = videoUri && isLocalMediaUri(videoUri);
          const needsThumbCheck = thumbnailUri && isLocalMediaUri(thumbnailUri);
          if (
            (needsVideoCheck && !isRemoteMediaUri(mediaCheckVideo)) ||
            (needsThumbCheck && !isRemoteMediaUri(mediaCheckThumb))
          ) {
            try {
              const freshRes = await shortsService.getShortById(
                editShortId,
                user.id,
                String(user?.role || '').toLowerCase() || undefined,
              );
              const fresh = extractShortFromResponse(freshRes) || {};
              mediaCheckVideo = String(
                fresh?.videoUrl || fresh?.mediaUrl || mediaCheckVideo || '',
              ).trim();
              mediaCheckThumb = String(
                fresh?.thumbnailUrl || fresh?.coverUrl || mediaCheckThumb || '',
              ).trim();
            } catch {
              // keep original replace response values
            }
          }
          if (needsVideoCheck && !isRemoteMediaUri(mediaCheckVideo)) {
            throw new Error('Edited video upload was not saved. Please try again.');
          }
          if (needsThumbCheck && !isRemoteMediaUri(mediaCheckThumb)) {
            throw new Error('Edited thumbnail upload was not saved. Please try again.');
          }
          // Force final PATCH to carry verified media URLs so backend cannot keep stale media.
          if (isRemoteMediaUri(mediaCheckVideo)) {
            patch.videoUrl = mediaCheckVideo;
          }
          if (isRemoteMediaUri(mediaCheckThumb)) {
            patch.thumbnailUrl = mediaCheckThumb;
            patch.coverUrl = mediaCheckThumb;
          }
        }
        let updateRes;
        try {
          updateRes = await shortsService.updateShort(editShortId, user.id, patch);
        } catch (updateErr) {
          const msg = String(updateErr?.message || '');
          const status = Number(updateErr?.response?.status || 0);
          const rawMessage = updateErr?.response?.data?.message;
          const normalizedMessage = Array.isArray(rawMessage)
            ? rawMessage.join(' ')
            : String(rawMessage || '');
          const looksLikeValidation =
            status === 400 ||
            /validation/i.test(msg) ||
            /validation/i.test(normalizedMessage);
          if (
            !looksLikeValidation ||
            !Object.prototype.hasOwnProperty.call(patch, 'platforms')
          ) {
            throw updateErr;
          }
          const retryPatch = { ...patch };
          delete retryPatch.platforms;
          updateRes = await shortsService.updateShort(editShortId, user.id, retryPatch);
        }
        createdOrUpdatedShort = extractShortFromResponse(updateRes);
        const updatedDraft = {
          ...draft,
          platforms: selectedPlatforms,
          selectedPlatforms,
          scheduledPublishAt: publishScheduleIso,
          edits: {
            ...(draft?.edits || {}),
            platforms: selectedPlatforms,
            selectedPlatforms,
            scheduledPublishAt: publishScheduleIso,
          },
        };
        navigation.setParams?.({ draft: updatedDraft });
      } else {
        setUploadStage('Preparing upload...');
        let uploadDraft = draft;
        if (
          uploadDraft?.video?.uri &&
          !String(uploadDraft?.thumbnail?.uri || '').trim()
        ) {
          setUploadStage('Generating thumbnail...');
          try {
            const thumb = await thumbnailFromVideoFrame(uploadDraft.video.uri);
            if (thumb) uploadDraft = { ...uploadDraft, thumbnail: thumb };
          } catch (_) {
            // backend can auto-generate if client frame grab fails
          }
        }
        const fullPayload = buildUploadFormData({ draftSource: uploadDraft });
        setUploadStage('Uploading reel...');
        const uploadRes = await shortsService.uploadShort(fullPayload, user.id);
        createdOrUpdatedShort = extractShortFromResponse(uploadRes);
      }
      await saveEditPrefs({
        shortId: editShortId || createdOrUpdatedShort?.id,
        platforms: selectedPlatforms,
        scheduledPublishAt: publishScheduleIso,
      });
      Alert.alert(
        'Success',
        isEditFlow
          ? 'Reel updated successfully'
          : postNow
          ? 'Reel posted successfully'
          : 'Reel scheduled successfully',
        [
          {
            text: 'OK',
            onPress: () => navigation.navigate('Root'),
          },
        ],
      );
    } catch (e) {
      console.log(
        '[PostScheduleNew] update/upload failed:',
        JSON.stringify(
          {
            status: e?.response?.status || null,
            message: e?.message || null,
            data: e?.response?.data || null,
          },
          null,
          2,
        ),
      );
      const status = e?.response?.status;
      const msg = String(e?.message || '');
      const shouldTrySafeMode =
        !isEditFlow &&
        (status === 403 ||
          /status code 403|forbidden|video processing failed/i.test(msg));
      if (shouldTrySafeMode) {
        try {
          setUploadStage('Retrying with safe mode...');
          await shortsService.uploadShort(
            buildUploadFormData({ simplifiedProcessing: true }),
            user.id,
          );
          Alert.alert(
            'Success',
            `${
              postNow ? 'Reel posted' : 'Reel scheduled'
            } with safe mode (music/effects trimmed for compatibility).`,
            [{ text: 'OK', onPress: () => navigation.navigate('Root') }],
          );
          return;
        } catch (fallbackError) {
          Alert.alert('Upload failed', formatReelUploadError(fallbackError));
          return;
        }
      }
      Alert.alert('Upload failed', formatReelUploadError(e));
    } finally {
      setUploading(false);
      setUploadStage('');
    }
  };

  return (
    <SafeAreaView style={styles.safeTop} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-left" color="white" size={28} />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Post & Schedule</Text>
            <Text style={styles.headerSubtitle}>Preview & post everywhere</Text>
          </View>
          <Image
            source={{ uri: 'https://via.placeholder.com/40' }}
            style={styles.profilePic}
          />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.stepperContainer}>
            {[1, 2, 3, 4, 5].map(num => (
              <View key={num} style={styles.stepItem}>
                <View
                  style={[
                    styles.stepCircle,
                    num === 5 && styles.activeStepCircle,
                  ]}
                >
                  <Text
                    style={[
                      styles.stepNumber,
                      num === 5 && styles.activeStepText,
                    ]}
                  >
                    {num}
                  </Text>
                </View>
                <Text
                  style={[styles.stepLabel, num === 5 && styles.activeLabel]}
                >
                  {
                    ['Upload', 'Edit', 'Caption', 'Preview', 'Schedule'][
                      num - 1
                    ]
                  }
                </Text>
              </View>
            ))}
            <View style={styles.stepperLine} />
          </View>

          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Auto-Post Platforms</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Max 4</Text>
              </View>
            </View>
            <View style={styles.separator} />
            {platforms.map(p => (
              <View key={p.id} style={styles.platformRow}>
                <View style={styles.platformInfo}>
                  <Image source={{ uri: p.icon }} style={styles.platformIcon} />
                  <View>
                    <Text style={styles.platformName}>{p.name}</Text>
                    <Text style={styles.platformAccount}>
                      {String(
                        accountByPlatform[
                          p.id === 'fb'
                            ? 'facebook'
                            : p.id === 'ig'
                            ? 'instagram'
                            : p.id === 'tk'
                            ? 'tiktok'
                            : 'youtube'
                        ]?.accountName ||
                          accountByPlatform[
                            p.id === 'fb'
                              ? 'facebook'
                              : p.id === 'ig'
                              ? 'instagram'
                              : p.id === 'tk'
                              ? 'tiktok'
                              : 'youtube'
                          ]?.accountId ||
                          'Not connected',
                      )}
                    </Text>
                  </View>
                </View>
                <Switch
                  trackColor={{ false: '#EEE', true: '#F5A623' }}
                  thumbColor="white"
                  value={switches[p.id]}
                  disabled={
                    !accountByPlatform[
                      p.id === 'fb'
                        ? 'facebook'
                        : p.id === 'ig'
                        ? 'instagram'
                        : p.id === 'tk'
                        ? 'tiktok'
                        : 'youtube'
                    ]
                  }
                  onValueChange={val =>
                    setSwitches({ ...switches, [p.id]: val })
                  }
                />
              </View>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>When do You want to post?</Text>
            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => setPostNow(true)}
            >
              <View style={styles.radioButton}>
                {postNow ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={styles.radioLabel}>Post Now</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.radioRow}
              onPress={() => setPostNow(false)}
            >
              <View style={styles.radioButton}>
                {!postNow ? <View style={styles.radioInner} /> : null}
              </View>
              <Text style={styles.radioLabel}>Schedule</Text>
            </TouchableOpacity>
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={styles.dateTimeInput}
                onPress={() => setShowDatePicker(true)}
                disabled={postNow}
              >
                <Icon name="calendar-month-outline" size={16} color="#777" />
                <Text style={styles.inputText}>{dateLabel}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dateTimeInput}
                onPress={() => setShowTimePicker(true)}
                disabled={postNow}
              >
                <Icon name="clock-outline" size={16} color="#777" />
                <Text style={styles.inputText}>{timeLabel}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Future boost feature: keep hidden until local boost targeting is ready.
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Boost Your Reach</Text>
            <View style={styles.boostBox}>
              <View style={styles.boostContent}>
                <View style={styles.boostHeader}>
                  <Icon name="fire" size={20} color="#FF6B00" />
                  <Text style={styles.boostTitle}>Starter Boost</Text>
                </View>
                <Text style={styles.boostSub}>
                  Ranked popular near you by eatix
                </Text>
                <Text style={styles.boostPrice}>Stating from GBP7-GBP30</Text>
              </View>
              <TouchableOpacity style={styles.boostBtn}>
                <Text style={styles.boostBtnText}>Boost Locally</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.targetSection}>
            <View style={styles.targetHeader}>
              <Icon name="map-marker-outline" size={16} color="#AAA" />
              <Text style={styles.targetText}>
                Target within <Text style={styles.targetMiles}>3 miles</Text> in
                east London & nearby
              </Text>
            </View>
            <View style={styles.sliderContainer}>
              <View style={styles.sliderLine} />
              <View style={styles.sliderFill} />
              <View style={styles.sliderHandle} />
            </View>
          </View>
          */}

          <TouchableOpacity
            style={[styles.mainButton, uploading && styles.mainButtonDisabled]}
            onPress={onPublish}
            disabled={uploading}
          >
            {uploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Text style={styles.mainButtonText}>
                  {postNow ? 'Post Locally' : 'Schedule Post'}
                </Text>
                <Icon name="arrow-right" color="white" size={20} />
              </>
            )}
          </TouchableOpacity>
          {uploading && uploadStage ? (
            <Text style={styles.uploadStageText}>{uploadStage}</Text>
          ) : null}

          <View style={styles.footerNote}>
            <Icon name="shield-check" size={14} color="#AAA" />
            <Text style={styles.footerNoteText}>
              Your post can be auto-published to selected platforms
            </Text>
          </View>
          {showDatePicker ? (
            <DateTimePicker
              value={scheduleAt}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (!date) return;
                const n = new Date(scheduleAt);
                n.setFullYear(
                  date.getFullYear(),
                  date.getMonth(),
                  date.getDate(),
                );
                setScheduleAt(n);
              }}
            />
          ) : null}
          {showTimePicker ? (
            <DateTimePicker
              value={scheduleAt}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowTimePicker(false);
                if (!date) return;
                const n = new Date(scheduleAt);
                n.setHours(date.getHours(), date.getMinutes(), 0, 0);
                setScheduleAt(n);
              }}
            />
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: '#F5A623' },
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  header: {
    backgroundColor: '#F5A623',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleContainer: { flex: 1, marginLeft: 15 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: 'white', fontSize: 13 },
  profilePic: { width: 40, height: 40, borderRadius: 20 },

  scrollContent: { paddingBottom: 40, backgroundColor: '#F9F9F9' },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    position: 'relative',
  },
  stepperLine: {
    position: 'absolute',
    top: 36,
    left: 40,
    right: 40,
    height: 1,
    backgroundColor: '#DDD',
    zIndex: -1,
  },
  stepItem: { alignItems: 'center', width: 60 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStepCircle: { borderColor: '#F5A623', borderWidth: 2 },
  stepNumber: { fontSize: 12, color: '#AAA' },
  activeStepText: { color: '#F5A623', fontWeight: 'bold' },
  stepLabel: { fontSize: 10, marginTop: 4, color: '#AAA' },
  activeLabel: { color: '#F5A623', fontWeight: 'bold' },

  card: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  badge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  badgeText: { fontSize: 11, color: '#777' },
  separator: { height: 1, backgroundColor: '#EEE', marginBottom: 10 },

  platformRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  platformInfo: { flexDirection: 'row', alignItems: 'center' },
  platformIcon: { width: 24, height: 24, borderRadius: 6, marginRight: 12 },
  platformName: { fontSize: 15, color: '#555' },
  platformAccount: {
    fontSize: 11,
    color: '#8A8A8A',
    marginTop: 1,
    maxWidth: 200,
  },

  radioRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#F5A623',
    marginRight: 10,
  },
  radioLabel: { fontSize: 16, color: '#333' },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F5A623',
    alignSelf: 'center',
    marginTop: 3,
  },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateTimeInput: {
    flex: 0.48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    padding: 10,
    borderRadius: 8,
  },
  inputText: { fontSize: 12, color: '#555', marginLeft: 8 },

  boostBox: {
    borderWidth: 1,
    borderColor: '#F5A623',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#FFFDF9',
  },
  boostContent: { flex: 1 },
  boostHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  boostTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#333',
  },
  boostSub: { fontSize: 11, color: '#777' },
  boostPrice: { fontSize: 13, color: '#555', marginTop: 4 },
  boostBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  boostBtnText: { color: 'white', fontSize: 11, fontWeight: 'bold' },

  targetSection: { paddingHorizontal: 20, marginTop: 15 },
  targetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  targetText: { fontSize: 13, color: '#888', marginLeft: 5 },
  targetMiles: { color: '#F5A623' },
  sliderContainer: { height: 30, justifyContent: 'center' },
  sliderLine: { height: 4, backgroundColor: '#FFEBCD', borderRadius: 2 },
  sliderFill: {
    position: 'absolute',
    height: 4,
    width: '60%',
    backgroundColor: '#F5A623',
    borderRadius: 2,
  },
  sliderHandle: {
    position: 'absolute',
    left: '60%',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDD',
  },

  mainButton: {
    backgroundColor: '#F5A623',
    margin: 15,
    height: 50,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainButtonDisabled: {
    opacity: 0.7,
  },
  mainButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  footerNote: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerNoteText: { fontSize: 11, color: '#AAA', marginLeft: 6 },
  uploadStageText: {
    textAlign: 'center',
    color: '#777',
    fontSize: 12,
    marginTop: -4,
    marginBottom: 8,
  },
});

export default ScheduleScreen;
