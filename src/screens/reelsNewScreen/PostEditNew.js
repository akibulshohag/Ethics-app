import React from 'react';
import { IMAGE_PLACEHOLDER } from '../../utils/helper';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  PanResponder,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  TextInput,
  Modal,
  Pressable,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useIsFocused, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import Video from 'react-native-video';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import SoundsModal from '../../components/SoundsModal';
import FilterModal from '../../components/FilterModal';
import {
  FILTER_EFFECTS,
  getBeautyOverlayStyle,
  getFilterOverlayStyle,
} from '../../constants/filterEffects';
import { REEL_STYLE_PRESETS } from '../../constants/reelStylePresets';
import {
  computeOverlayPositionStyle,
  normalizeAnchor,
} from '../../constants/overlayTextAnchor';

const { width, height: SCREEN_H } = Dimensions.get('window');
const EDIT_DRAFT_STORAGE_KEY = 'reel-editor-draft-v2';
const EDIT_DRAFT_LIST_KEY = 'reel-editor-draft-list-v1';
const EDIT_DRAFT_ITEM_PREFIX = 'reel-editor-draft-item-v1:';
const TEXT_COLORS = ['#FFFFFF', '#F5A623', '#00E5FF', '#FF4D6D', '#A3FF12'];
const MIN_TRIM_GAP = 0.35;
const NONE_FILTER = {
  id: 'none',
  name: 'None',
  overlayColor: 'transparent',
  overlayOpacity: 0,
};

const STYLE_PRESETS = REEL_STYLE_PRESETS;
const EXPORT_RES_PRESETS = [
  { id: '720x1280', label: '720p · 9:16' },
  { id: '1080x1920', label: '1080p · 9:16' },
];
const EXPORT_FPS_OPTIONS = [24, 30, 60];

const ANCHOR_GRID_ROWS = [
  ['tl', 'tc', 'tr'],
  ['cl', 'cc', 'cr'],
  ['bl', 'bc', 'br'],
];

const formatScrubTime = value => {
  const x = Math.max(0, Number(value) || 0);
  const m = Math.floor(x / 60);
  const s = x - m * 60;
  const intS = Math.floor(s);
  const dec = Math.min(9, Math.round((s - intS) * 10));
  return `${m}:${String(intS).padStart(2, '0')}.${dec}`;
};

const overlayLayerWrapBase = {
  position: 'absolute',
  maxWidth: '96%',
};

/**
 * Each text layer gets its own pan responder so users can drag any visible layer
 * without pre-selecting it in the Text panel (selection updates on touch).
 * Position uses anchor (tl…br) so edges/corners match FFmpeg ASS burn-in.
 */
function DraggableOverlayLayer({
  layer,
  videoW,
  videoH,
  isActive,
  onSelect,
  onDrag,
  children,
}) {
  const anchor = normalizeAnchor(layer.anchor);
  const [textBox, setTextBox] = React.useState({ w: 0, h: 0 });
  const posRef = React.useRef({
    x: Number(layer.xPct ?? 0.5),
    y: Number(layer.yPct ?? 0.78),
  });
  React.useEffect(() => {
    posRef.current = {
      x: Number(layer.xPct ?? 0.5),
      y: Number(layer.yPct ?? 0.78),
    };
  }, [layer.xPct, layer.yPct]);

  const dragOriginRef = React.useRef({ x: 0, y: 0 });
  const onSelectRef = React.useRef(onSelect);
  const onDragRef = React.useRef(onDrag);
  onSelectRef.current = onSelect;
  onDragRef.current = onDrag;

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragOriginRef.current = { ...posRef.current };
          onSelectRef.current(layer.id);
        },
        onPanResponderMove: (_evt, g) => {
          const w = Math.max(1, videoW);
          const h = Math.max(1, videoH);
          const nx = Math.max(
            0,
            Math.min(1, dragOriginRef.current.x + g.dx / w),
          );
          const ny = Math.max(
            0,
            Math.min(1, dragOriginRef.current.y + g.dy / h),
          );
          onDragRef.current(layer.id, nx, ny);
        },
      }),
    [layer.id, videoW, videoH],
  );

  const { left, top } = computeOverlayPositionStyle({
    anchor,
    xPct: layer.xPct,
    yPct: layer.yPct,
    videoW,
    videoH,
    layoutW: textBox.w,
    layoutH: textBox.h,
  });

  return (
    <View
      style={[
        overlayLayerWrapBase,
        {
          left,
          top,
          borderWidth: isActive ? 1 : 0,
          borderColor: '#F5A623',
          borderRadius: 6,
          paddingHorizontal: 2,
        },
      ]}
      {...panResponder.panHandlers}
    >
      <View
        onLayout={e => {
          const { width, height } = e.nativeEvent.layout;
          setTextBox(prev =>
            prev.w === width && prev.h === height ? prev : { w: width, h: height },
          );
        }}
      >
        {children}
      </View>
    </View>
  );
}

const EditReelScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const isFocused = useIsFocused();
  const incomingDraft = route.params?.draft || {};
  const [draft, setDraft] = React.useState(incomingDraft);
  const [soundsVisible, setSoundsVisible] = React.useState(false);
  const [filterVisible, setFilterVisible] = React.useState(false);
  const [selectedSound, setSelectedSound] = React.useState(
    incomingDraft?.edits?.selectedSound || null,
  );
  const [selectedFilter, setSelectedFilter] = React.useState(
    incomingDraft?.edits?.selectedFilter || null,
  );
  const [speedFactor, setSpeedFactor] = React.useState(
    Number(incomingDraft?.edits?.speedFactor || 1),
  );
  const [overlayText, setOverlayText] = React.useState(
    String(incomingDraft?.edits?.overlayText || ''),
  );
  const [overlayTextSize, setOverlayTextSize] = React.useState(
    Number(incomingDraft?.edits?.overlayTextSize || 30),
  );
  const [overlayPosPct, setOverlayPosPct] = React.useState({
    x: Number(incomingDraft?.edits?.overlayTextXPct ?? 0.5),
    y: Number(incomingDraft?.edits?.overlayTextYPct ?? 0.78),
  });
  const [originalVolume, setOriginalVolume] = React.useState(
    Number(incomingDraft?.edits?.originalVolume ?? 1),
  );
  const [musicVolume, setMusicVolume] = React.useState(
    Number(incomingDraft?.edits?.musicVolume ?? 1),
  );
  const [previewMuteOriginal, setPreviewMuteOriginal] = React.useState(
    Boolean(
      incomingDraft?.edits?.previewMuteOriginal ??
        Number(incomingDraft?.edits?.originalVolume ?? 1) <= 0,
    ),
  );
  const [overlayLayers, setOverlayLayers] = React.useState(() => {
    const fromDraft = Array.isArray(incomingDraft?.edits?.overlayLayers)
      ? incomingDraft.edits.overlayLayers
      : [];
    if (fromDraft.length > 0) {
      return fromDraft.map((layer, idx) => ({
        id: String(layer?.id || `layer-${Date.now()}-${idx}`),
        text: String(layer?.text || ''),
        size: Number(layer?.size || 30),
        color: String(layer?.color || '#FFFFFF'),
        rotateDeg: Number(layer?.rotateDeg || 0),
        shadowPreset: String(layer?.shadowPreset || 'soft'),
        anchor: normalizeAnchor(layer?.anchor),
        xPct: Number(layer?.xPct ?? 0.5),
        yPct: Number(layer?.yPct ?? 0.78),
        startSec: Number(layer?.startSec ?? 0),
        endSec: Number(layer?.endSec ?? Number(incomingDraft?.video?.durationSec || 30)),
      }));
    }
    const legacyText = String(incomingDraft?.edits?.overlayText || '').trim();
    return legacyText
      ? [
          {
            id: `layer-${Date.now()}`,
            text: legacyText,
            size: Number(incomingDraft?.edits?.overlayTextSize || 30),
            color: String(incomingDraft?.edits?.overlayTextColor || '#FFFFFF'),
            rotateDeg: Number(incomingDraft?.edits?.overlayRotateDeg || 0),
            shadowPreset: String(
              incomingDraft?.edits?.overlayShadowPreset || 'soft',
            ),
            anchor: 'tl',
            xPct: Number(incomingDraft?.edits?.overlayTextXPct ?? 0.5),
            yPct: Number(incomingDraft?.edits?.overlayTextYPct ?? 0.78),
            startSec: 0,
            endSec: Number(incomingDraft?.video?.durationSec || 30),
          },
        ]
      : [];
  });
  const [activeLayerId, setActiveLayerId] = React.useState(
    () => overlayLayers[0]?.id || null,
  );
  const [overlayTextColor, setOverlayTextColor] = React.useState(
    String(incomingDraft?.edits?.overlayTextColor || '#FFFFFF'),
  );
  const [overlayRotateDeg, setOverlayRotateDeg] = React.useState(
    Number(incomingDraft?.edits?.overlayRotateDeg || 0),
  );
  const [overlayShadowPreset, setOverlayShadowPreset] = React.useState(
    String(incomingDraft?.edits?.overlayShadowPreset || 'soft'),
  );
  const [trimStartSec, setTrimStartSec] = React.useState(
    Number(incomingDraft?.edits?.trimStartSec || 0),
  );
  const [trimEndSec, setTrimEndSec] = React.useState(
    Number(incomingDraft?.edits?.trimEndSec || 0),
  );
  const [previewSec, setPreviewSec] = React.useState(0);
  const [isScrubbing, setIsScrubbing] = React.useState(false);
  const [savedDrafts, setSavedDrafts] = React.useState([]);
  const [playing, setPlaying] = React.useState(true);
  const resumePlayingRef = React.useRef(true);
  const [activePanel, setActivePanel] = React.useState(null);
  const [timelineTrackW, setTimelineTrackW] = React.useState(1);
  const [scrubBarW, setScrubBarW] = React.useState(1);
  const [selectedStylePreset, setSelectedStylePreset] = React.useState(
    String(incomingDraft?.edits?.stylePresetId || 'food-promo'),
  );
  const [splitPoints, setSplitPoints] = React.useState(() => {
    const sp = incomingDraft?.edits?.splitPoints;
    return Array.isArray(sp)
      ? sp.map(Number).filter(Number.isFinite).sort((a, b) => a - b)
      : [];
  });
  const [exportResolution, setExportResolution] = React.useState(
    String(incomingDraft?.edits?.exportQuality?.preset || '1080x1920'),
  );
  const [exportFps, setExportFps] = React.useState(
    Number(incomingDraft?.edits?.exportQuality?.fps || 30),
  );
  const [transitionId, setTransitionId] = React.useState(
    String(incomingDraft?.edits?.transitionId || 'none'),
  );
  const [transitionDurationSec, setTransitionDurationSec] = React.useState(
    Number(incomingDraft?.edits?.transitionDurationSec ?? 0.25),
  );
  const [beautyLevel, setBeautyLevel] = React.useState(
    Number(incomingDraft?.edits?.beautyLevel ?? 0),
  );
  const videoRef = React.useRef(null);
  const musicRef = React.useRef(null);
  const trimDragRef = React.useRef({ start: 0, end: 0 });
  const scrubGrantRef = React.useRef(0);
  const previewSecRef = React.useRef(previewSec);
  const trimStartRef = React.useRef(trimStartSec);
  const trimEndRef = React.useRef(trimEndSec);
  React.useEffect(() => {
    previewSecRef.current = previewSec;
  }, [previewSec]);
  React.useEffect(() => {
    trimStartRef.current = trimStartSec;
  }, [trimStartSec]);
  React.useEffect(() => {
    trimEndRef.current = trimEndSec;
  }, [trimEndSec]);

  React.useEffect(() => {
    if (isFocused) {
      setPlaying(Boolean(resumePlayingRef.current));
      return;
    }
    resumePlayingRef.current = playing;
    setPlaying(false);
  }, [isFocused, playing]);
  const steps = ['Upload', 'Edit', 'Caption', 'Preview', 'Schedule'];

  const videoUri = draft?.video?.uri;
  const thumbnailUri = draft?.thumbnail?.uri;
  const selectedSoundUrl = React.useMemo(
    () =>
      String(
        selectedSound?.soundUrl || selectedSound?.previewUrl || selectedSound?.url || '',
      ).trim(),
    [selectedSound],
  );
  const durationSec = Math.max(1, Number(draft?.video?.durationSec || 30));
  const filterOverlay = getFilterOverlayStyle(selectedFilter);
  const beautyOverlay = getBeautyOverlayStyle(beautyLevel);
  const trimLoopActive =
    trimStartSec > 0.08 || trimEndSec < durationSec - 0.08;
  const [videoBoxSize, setVideoBoxSize] = React.useState({
    width: width * 0.65,
    height: width * 0.8,
  });
  const lastOriginalVolumeRef = React.useRef(
    Math.max(0.1, Number(incomingDraft?.edits?.originalVolume ?? 1)),
  );
  const lastMusicVolumeRef = React.useRef(
    Math.max(0.1, Number(incomingDraft?.edits?.musicVolume ?? 1)),
  );

  React.useEffect(() => {
    if (!trimEndSec || trimEndSec > durationSec) {
      setTrimEndSec(durationSec);
    }
  }, [durationSec, trimEndSec]);

  React.useEffect(() => {
    setPreviewSec(prev => Math.max(0, Math.min(durationSec, prev)));
  }, [durationSec]);

  React.useEffect(() => {
    if (Number(originalVolume) > 0.01) {
      lastOriginalVolumeRef.current = Number(originalVolume);
    }
  }, [originalVolume]);

  React.useEffect(() => {
    if (Number(musicVolume) > 0.01) {
      lastMusicVolumeRef.current = Number(musicVolume);
    }
  }, [musicVolume]);

  React.useEffect(() => {
    setPreviewSec(prev => {
      const lo = Math.min(trimStartSec, trimEndSec - 0.01);
      const hi = trimEndSec;
      const clamped = Math.min(hi, Math.max(lo, prev));
      return clamped;
    });
  }, [trimStartSec, trimEndSec]);

  React.useEffect(() => {
    setSplitPoints(prev =>
      prev.filter(
        p =>
          p > trimStartSec + 0.08 &&
          p < trimEndSec - 0.08,
      ),
    );
  }, [trimStartSec, trimEndSec]);

  const seekVideo = React.useCallback(t => {
    const x = Math.max(0, Number(t) || 0);
    try {
      videoRef.current?.seek?.(x);
    } catch {
      /* noop */
    }
    try {
      musicRef.current?.seek?.(x);
    } catch {
      /* noop */
    }
  }, []);

  React.useEffect(() => {
    if (!videoUri || !trimLoopActive) return;
    seekVideo(trimStartSec);
    setPreviewSec(trimStartSec);
  }, [trimLoopActive, seekVideo, trimStartSec, trimEndSec, videoUri]);

  const formatSec = value => {
    const v = Math.max(0, Math.floor(Number(value || 0)));
    const mm = Math.floor(v / 60);
    const ss = String(v % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };
  const toggleOriginalAudio = React.useCallback(() => {
    setPreviewMuteOriginal(prev => {
      const nextMuted = !prev;
      if (!nextMuted && Number(originalVolume) <= 0.01) {
        const restored = Math.max(0.1, Number(lastOriginalVolumeRef.current || 1));
        setOriginalVolume(restored);
      }
      return nextMuted;
    });
  }, [originalVolume]);

  const toggleMusicAudio = React.useCallback(() => {
    if (!selectedSoundUrl) {
      setSoundsVisible(true);
      return;
    }
    if (Number(musicVolume) <= 0.01) {
      const restored = Math.max(0.1, Number(lastMusicVolumeRef.current || 1));
      setMusicVolume(restored);
      return;
    }
    setMusicVolume(0);
  }, [musicVolume, selectedSoundUrl]);

  const removeSelectedMusic = React.useCallback(() => {
    setSelectedSound(null);
    setMusicVolume(0);
  }, []);

  const buildDraftPayload = React.useCallback(
    () => ({
      ...draft,
      edits: {
        ...draft?.edits,
        selectedSound: selectedSound
          ? {
              ...selectedSound,
              soundUrl: selectedSoundUrl || selectedSound.soundUrl || '',
            }
          : null,
        selectedFilter,
        speedFactor,
        trimStartSec,
        trimEndSec,
        overlayLayers,
        originalVolume,
        musicVolume,
        previewMuteOriginal,
        splitPoints,
        stylePresetId: selectedStylePreset,
        exportQuality: { preset: exportResolution, fps: exportFps },
        transitionId,
        transitionDurationSec,
        beautyLevel: Math.round(Number(beautyLevel) || 0),
      },
    }),
    [
      beautyLevel,
      draft,
      exportFps,
      exportResolution,
      musicVolume,
      originalVolume,
      overlayLayers,
      previewMuteOriginal,
      selectedFilter,
      selectedSound,
      selectedStylePreset,
      speedFactor,
      splitPoints,
      transitionDurationSec,
      transitionId,
      trimEndSec,
      trimStartSec,
    ],
  );

  const applyPersistedDraft = React.useCallback((parsed, keepCurrentVideo = false) => {
    if (!parsed) return;
    if (!keepCurrentVideo && parsed?.video?.uri) {
      setDraft(parsed);
    } else if (keepCurrentVideo) {
      setDraft(prev => ({
        ...parsed,
        video: prev?.video || parsed?.video,
        thumbnail: prev?.thumbnail || parsed?.thumbnail,
      }));
    }
    const ed = parsed.edits || {};
    setSelectedSound(ed.selectedSound || null);
    setSelectedFilter(ed.selectedFilter || null);
    setSpeedFactor(Number(ed.speedFactor || 1));
    setTrimStartSec(Number(ed.trimStartSec || 0));
    setTrimEndSec(Number(ed.trimEndSec || Number(parsed?.video?.durationSec || 30)));
    setOriginalVolume(Number(ed.originalVolume ?? 1));
    setMusicVolume(Number(ed.musicVolume ?? 1));
    setPreviewMuteOriginal(
      Boolean(ed.previewMuteOriginal ?? Number(ed.originalVolume ?? 1) <= 0),
    );
    const layers = Array.isArray(ed.overlayLayers)
      ? ed.overlayLayers.map((layer, idx) => ({
          id: String(layer?.id || `layer-${Date.now()}-${idx}`),
          text: String(layer?.text || ''),
          size: Number(layer?.size || 30),
          color: String(layer?.color || '#FFFFFF'),
          rotateDeg: Number(layer?.rotateDeg || 0),
          shadowPreset: String(layer?.shadowPreset || 'soft'),
          anchor: normalizeAnchor(layer?.anchor),
          xPct: Number(layer?.xPct ?? 0.5),
          yPct: Number(layer?.yPct ?? 0.78),
          startSec: Number(layer?.startSec ?? 0),
          endSec: Number(layer?.endSec ?? Number(parsed?.video?.durationSec || 30)),
        }))
      : [];
    setOverlayLayers(layers);
    setActiveLayerId(layers[0]?.id || null);
    const sp = parsed?.edits?.splitPoints;
    setSplitPoints(
      Array.isArray(sp)
        ? sp.map(Number).filter(Number.isFinite).sort((a, b) => a - b)
        : [],
    );
    setSelectedStylePreset(String(parsed?.edits?.stylePresetId || 'food-promo'));
    setExportResolution(String(parsed?.edits?.exportQuality?.preset || '1080x1920'));
    setExportFps(Number(parsed?.edits?.exportQuality?.fps || 30));
    setTransitionId(String(parsed?.edits?.transitionId || 'none'));
    setTransitionDurationSec(Number(parsed?.edits?.transitionDurationSec ?? 0.25));
    setBeautyLevel(Number(parsed?.edits?.beautyLevel ?? 0));
  }, []);

  const activeLayer = React.useMemo(
    () => overlayLayers.find(x => x.id === activeLayerId) || null,
    [activeLayerId, overlayLayers],
  );

  React.useEffect(() => {
    if (!activeLayer) return;
    setOverlayText(String(activeLayer.text || ''));
    setOverlayTextSize(Number(activeLayer.size || 30));
    setOverlayTextColor(String(activeLayer.color || '#FFFFFF'));
    setOverlayRotateDeg(Number(activeLayer.rotateDeg || 0));
    setOverlayShadowPreset(String(activeLayer.shadowPreset || 'soft'));
    setOverlayPosPct({
      x: Number(activeLayer.xPct ?? 0.5),
      y: Number(activeLayer.yPct ?? 0.78),
    });
  }, [activeLayerId]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const hydrate = async () => {
      if (incomingDraft?.video?.uri) return;
      try {
        const raw = await AsyncStorage.getItem(EDIT_DRAFT_STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (!parsed?.video?.uri) return;
        applyPersistedDraft(parsed);
      } catch {
        // ignore bad persisted draft
      }
    };
    hydrate();
  }, [applyPersistedDraft, incomingDraft?.video?.uri]);

  React.useEffect(() => {
    const payload = buildDraftPayload();
    AsyncStorage.setItem(EDIT_DRAFT_STORAGE_KEY, JSON.stringify(payload)).catch(
      () => {},
    );
  }, [buildDraftPayload]);

  const loadSavedDraftList = React.useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(EDIT_DRAFT_LIST_KEY);
      if (!raw) {
        setSavedDrafts([]);
        return;
      }
      const parsed = JSON.parse(raw);
      const list = Array.isArray(parsed) ? parsed : [];
      setSavedDrafts(list);
    } catch {
      setSavedDrafts([]);
    }
  }, []);

  React.useEffect(() => {
    loadSavedDraftList();
  }, [loadSavedDraftList]);

  const saveAsDraftSlot = React.useCallback(async () => {
    try {
      const id = `d-${Date.now()}`;
      const title = (overlayText || draft?.caption || 'Untitled draft').trim().slice(0, 28);
      const meta = {
        id,
        title: title || 'Untitled draft',
        updatedAt: new Date().toISOString(),
      };
      const payload = buildDraftPayload();
      await AsyncStorage.setItem(
        `${EDIT_DRAFT_ITEM_PREFIX}${id}`,
        JSON.stringify(payload),
      );
      const nextList = [meta, ...savedDrafts].slice(0, 12);
      await AsyncStorage.setItem(EDIT_DRAFT_LIST_KEY, JSON.stringify(nextList));
      setSavedDrafts(nextList);
      Alert.alert('Saved', 'Draft saved to library.');
    } catch {
      Alert.alert('Save failed', 'Could not save this draft.');
    }
  }, [buildDraftPayload, draft?.caption, overlayText, savedDrafts]);

  const loadDraftSlot = React.useCallback(
    async id => {
      try {
        const raw = await AsyncStorage.getItem(`${EDIT_DRAFT_ITEM_PREFIX}${id}`);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        applyPersistedDraft(parsed, true);
        Alert.alert('Loaded', 'Draft loaded to editor.');
      } catch {
        Alert.alert('Load failed', 'Could not load selected draft.');
      }
    },
    [applyPersistedDraft],
  );

  const deleteDraftSlot = React.useCallback(
    async id => {
      try {
        await AsyncStorage.removeItem(`${EDIT_DRAFT_ITEM_PREFIX}${id}`);
        const nextList = savedDrafts.filter(item => item.id !== id);
        await AsyncStorage.setItem(EDIT_DRAFT_LIST_KEY, JSON.stringify(nextList));
        setSavedDrafts(nextList);
      } catch {
        // ignore
      }
    },
    [savedDrafts],
  );
  const handleOverlayLayerDrag = React.useCallback((layerId, nx, ny) => {
    setOverlayPosPct({ x: nx, y: ny });
    setOverlayLayers(prev =>
      prev.map(l =>
        l.id === layerId ? { ...l, xPct: nx, yPct: ny } : l,
      ),
    );
  }, []);

  const handleOverlayLayerSelect = React.useCallback(layerId => {
    setActiveLayerId(layerId);
  }, []);

  const leftTrimPan = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          trimDragRef.current.start = trimStartRef.current;
        },
        onPanResponderMove: (_e, g) => {
          const W = Math.max(1, timelineTrackW);
          const d = (g.dx / W) * durationSec;
          const end = trimEndRef.current;
          const next = Math.max(
            0,
            Math.min(trimDragRef.current.start + d, end - MIN_TRIM_GAP),
          );
          setTrimStartSec(next);
        },
      }),
    [durationSec, timelineTrackW],
  );

  const rightTrimPan = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          trimDragRef.current.end = trimEndRef.current;
        },
        onPanResponderMove: (_e, g) => {
          const W = Math.max(1, timelineTrackW);
          const d = (g.dx / W) * durationSec;
          const start = trimStartRef.current;
          const next = Math.max(
            start + MIN_TRIM_GAP,
            Math.min(trimDragRef.current.end + d, durationSec),
          );
          setTrimEndSec(next);
        },
      }),
    [durationSec, timelineTrackW],
  );

  const scrubBarPan = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          scrubGrantRef.current = previewSecRef.current;
          setIsScrubbing(true);
        },
        onPanResponderMove: (_e, g) => {
          const W = Math.max(1, scrubBarW);
          const d = (g.dx / W) * durationSec;
          const next = Math.max(0, Math.min(durationSec, scrubGrantRef.current + d));
          setPreviewSec(next);
          seekVideo(next);
        },
        onPanResponderRelease: () => setIsScrubbing(false),
        onPanResponderTerminate: () => setIsScrubbing(false),
      }),
    [durationSec, scrubBarW, seekVideo],
  );

  const splitAtPlayhead = React.useCallback(() => {
    const t = previewSec;
    const min = trimStartSec + MIN_TRIM_GAP;
    const max = trimEndSec - MIN_TRIM_GAP;
    if (t <= min || t >= max) {
      Alert.alert(
        'Split',
        'Move the playhead inside the orange trim range (not on the edges).',
      );
      return;
    }
    const collides = splitPoints.some(p => Math.abs(p - t) < 0.22);
    if (collides) {
      Alert.alert('Split', 'Too close to another cut. Scrub slightly and try again.');
      return;
    }
    setSplitPoints(prev => [...prev, t].sort((a, b) => a - b));
  }, [previewSec, splitPoints, trimEndSec, trimStartSec]);

  const applyStylePreset = React.useCallback(presetId => {
    setSelectedStylePreset(presetId);
    const preset = STYLE_PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    if (preset.filterId) {
      const fx = FILTER_EFFECTS.find(f => String(f.id) === String(preset.filterId));
      setSelectedFilter(fx ? { ...fx } : NONE_FILTER);
    }
    // Presets without filterId (e.g. food-promo): keep the user's Effect choice so
    // switching style rows does not strip FFmpeg color grade on upload.
    setSpeedFactor(Number(preset.speed || 1));
  }, []);

  const pickVideo = () => {
    launchImageLibrary(
      { mediaType: 'video', videoMaxDuration: 180, quality: 1 },
      res => {
        if (res.didCancel) return;
        if (res.errorCode) {
          Alert.alert('Error', res.errorMessage || 'Failed to pick video');
          return;
        }
        const a = res.assets?.[0];
        if (!a?.uri) return;
        setDraft(prev => ({
          ...prev,
          video: {
            uri: a.uri,
            type: a.type || 'video/mp4',
            name: a.fileName || 'reel.mp4',
            durationSec:
              a.duration != null ? Math.max(0, Math.round(Number(a.duration))) : 0,
            width: a.width || 0,
            height: a.height || 0,
          },
        }));
      },
    );
  };

  /** Cap preview height so timeline + toolbar stay on screen (tall 9:16 was collapsing the ScrollView). */
  const maxPreviewH = Math.max(200, Math.min(SCREEN_H * 0.36, SCREEN_H - 320));
  let previewW = Math.min(width - 20, width * 0.88);
  let previewH = Math.round((previewW * 16) / 9);
  if (previewH > maxPreviewH) {
    previewH = Math.floor(maxPreviewH);
    previewW = Math.round((previewH * 9) / 16);
  }
  const thumbFallback =
    thumbnailUri ||
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=400';

  return (
    <SafeAreaView style={styles.safeTop} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" color="white" size={28} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Edit Reel</Text>
          <Text style={styles.headerSubtitle}>
            Upload, edit and Publish to all platforms
          </Text>
        </View>
        <Image
          source={{ uri: IMAGE_PLACEHOLDER }}
          style={styles.profilePic}
        />
        </View>

        <View style={styles.stepperContainer}>
          {steps.map((label, index) => (
            <View key={label} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  index === 1 && styles.activeStepCircle,
                  index === 1 && styles.activeStepCircleFilled,
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    index === 1 && styles.activeStepText,
                    index === 1 && styles.activeStepNumberOnPrimary,
                  ]}
                >
                  {index + 1}
                </Text>
              </View>
              <Text style={[styles.stepLabel, index === 1 && styles.activeLabel]}>
                {label}
              </Text>
            </View>
          ))}
          <View style={styles.stepperLine} />
        </View>

        <View style={styles.editorContainer}>
        <View
          style={[
            styles.videoPreviewContainer,
            { width: previewW, height: previewH },
          ]}
          onLayout={e => {
            const { width: w, height: h } = e.nativeEvent.layout;
            if (w > 0 && h > 0) setVideoBoxSize({ width: w, height: h });
          }}
        >
          {videoUri ? (
            <>
              <Video
                ref={videoRef}
                source={{ uri: videoUri }}
                style={styles.mainVideo}
                resizeMode="cover"
                repeat={!trimLoopActive}
                muted={previewMuteOriginal || Number(originalVolume) <= 0}
                volume={Math.max(0, Math.min(2, Number(originalVolume) || 0))}
                paused={!playing || !isFocused}
                rate={Number(speedFactor) || 1}
                progressUpdateInterval={120}
                onProgress={p => {
                  if (isScrubbing) return;
                  const t = Number(p?.currentTime || 0);
                  if (!Number.isFinite(t)) return;
                  if (trimLoopActive && t >= trimEndSec - 0.1) {
                    seekVideo(trimStartSec);
                    setPreviewSec(trimStartSec);
                    return;
                  }
                  setPreviewSec(t);
                }}
              />
              {selectedSoundUrl && Number(musicVolume) > 0 ? (
                <Video
                  ref={musicRef}
                  source={{ uri: selectedSoundUrl }}
                  style={styles.hiddenAudioTrack}
                  audioOnly
                  repeat
                  paused={!playing || !isFocused}
                  volume={Math.max(0, Math.min(2, Number(musicVolume) || 0))}
                  muted={false}
                  ignoreSilentSwitch="ignore"
                  onLoad={() => {
                    try {
                      const t = Math.max(0, Number(previewSecRef.current || 0));
                      musicRef.current?.seek?.(t);
                    } catch {
                      /* noop */
                    }
                  }}
                  onError={e => {
                    const err = e?.nativeEvent || e;
                    console.warn('PostEditNew music playback error:', err);
                  }}
                />
              ) : null}
            </>
          ) : (
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1547584370-2cc98b8b8dc8?q=80&w=600',
              }}
              style={styles.mainVideo}
              resizeMode="cover"
            />
          )}
          {filterOverlay ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: filterOverlay.backgroundColor,
                  opacity: filterOverlay.opacity,
                },
              ]}
            />
          ) : null}
          {beautyOverlay ? (
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: beautyOverlay.backgroundColor,
                  opacity: beautyOverlay.opacity,
                },
              ]}
            />
          ) : null}
          <View style={styles.playOverlay} pointerEvents="box-none">
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setPlaying(p => !p)}
              style={styles.pauseCircle}
            >
              <Icon name={playing ? 'pause' : 'play'} color="#222" size={28} />
            </TouchableOpacity>
          </View>
          <View style={styles.audioToggleColumn} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.audioTogglePill}
              activeOpacity={0.85}
              onPress={toggleOriginalAudio}
            >
              <Icon
                name={previewMuteOriginal || Number(originalVolume) <= 0 ? 'volume-off' : 'volume-high'}
                size={16}
                color="#fff"
              />
              <Text style={styles.audioTogglePillText}>
                {previewMuteOriginal || Number(originalVolume) <= 0 ? 'Original off' : 'Original on'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.audioTogglePill}
              activeOpacity={0.85}
              onPress={toggleMusicAudio}
            >
              <Icon
                name={
                  selectedSoundUrl && Number(musicVolume) > 0
                    ? 'music-note'
                    : 'music-note-off'
                }
                size={16}
                color="#fff"
              />
              <Text style={styles.audioTogglePillText}>
                {selectedSoundUrl
                  ? Number(musicVolume) > 0
                    ? 'Music on'
                    : 'Music off'
                  : 'Add music'}
              </Text>
            </TouchableOpacity>
            {selectedSoundUrl ? (
              <TouchableOpacity
                style={styles.audioTogglePillDanger}
                activeOpacity={0.85}
                onPress={removeSelectedMusic}
              >
                <Icon name="close-circle-outline" size={16} color="#fff" />
                <Text style={styles.audioTogglePillText}>Remove music</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          {overlayLayers
            .filter(layer => {
              const start = Number(layer?.startSec ?? 0);
              const end = Number(layer?.endSec ?? durationSec);
              return previewSec >= start && previewSec <= end;
            })
            .map(layer => (
              <DraggableOverlayLayer
                key={layer.id}
                layer={layer}
                videoW={videoBoxSize.width}
                videoH={videoBoxSize.height}
                isActive={layer.id === activeLayerId}
                onSelect={handleOverlayLayerSelect}
                onDrag={handleOverlayLayerDrag}
              >
                <Text
                  style={[
                    styles.overlayText,
                    {
                      fontSize: Number(layer.size || 30),
                      color: String(layer.color || '#FFFFFF'),
                      transform: [{ rotate: `${Number(layer.rotateDeg || 0)}deg` }],
                    },
                    layer.shadowPreset === 'none'
                      ? styles.shadowNone
                      : layer.shadowPreset === 'hard'
                        ? styles.shadowHard
                        : styles.shadowSoft,
                  ]}
                  numberOfLines={2}
                >
                  {layer.text}
                </Text>
              </DraggableOverlayLayer>
            ))}
        </View>

        <ScrollView
          style={styles.editorScroll}
          contentContainerStyle={styles.editorScrollContent}
          showsVerticalScrollIndicator={true}
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
        >
        <View style={styles.timelineRow}>
          <Text style={styles.scrubTimeMain}>{formatScrubTime(previewSec)}</Text>
          <View
            style={styles.scrubBarWrap}
            onLayout={e => setScrubBarW(e.nativeEvent.layout.width)}
            {...scrubBarPan.panHandlers}
          >
            <View style={styles.scrubBarTrack}>
              <View
                style={[
                  styles.scrubBarFill,
                  {
                    width: `${durationSec > 0 ? Math.min(100, (previewSec / durationSec) * 100) : 0}%`,
                  },
                ]}
              />
            </View>
            <View
              pointerEvents="none"
              style={[
                styles.scrubPlayhead,
                {
                  left: `${durationSec > 0 ? (previewSec / durationSec) * 100 : 0}%`,
                  marginLeft: -7,
                },
              ]}
            />
          </View>
          <TouchableOpacity style={styles.addButton} onPress={pickVideo}>
            <Icon name="plus" color="white" size={12} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.filmstripSection}>
          <View
            style={styles.filmstripTrack}
            onLayout={e => {
              const w = e.nativeEvent.layout.width;
              if (w > 0) setTimelineTrackW(w);
            }}
          >
            <View style={styles.filmstripThumbs}>
              {Array.from({ length: 10 }).map((_, i) => (
                <Image
                  key={`t-${i}`}
                  source={{ uri: thumbFallback }}
                  style={styles.filmstripThumbTile}
                />
              ))}
            </View>
            <View style={styles.trimRow} pointerEvents="none">
              <View
                style={[
                  styles.trimDim,
                  { flex: Math.max(0.02, trimStartSec) },
                ]}
              />
              <View
                style={[
                  styles.trimHighlight,
                  { flex: Math.max(0.02, trimEndSec - trimStartSec) },
                ]}
              />
              <View
                style={[
                  styles.trimDim,
                  { flex: Math.max(0.02, durationSec - trimEndSec) },
                ]}
              />
            </View>
            {splitPoints.map(p => (
              <View
                key={`cut-${p}`}
                pointerEvents="none"
                style={[
                  styles.splitLine,
                  {
                    left: `${durationSec > 0 ? (p / durationSec) * 100 : 0}%`,
                    marginLeft: -1,
                  },
                ]}
              />
            ))}
            <View
              pointerEvents="none"
              style={[
                styles.filmPlayhead,
                {
                  left: `${durationSec > 0 ? (previewSec / durationSec) * 100 : 0}%`,
                  marginLeft: -1,
                },
              ]}
            />
            <View
              style={[
                styles.trimHandleGrab,
                {
                  left: `${durationSec > 0 ? (trimStartSec / durationSec) * 100 : 0}%`,
                  marginLeft: -13,
                },
              ]}
              {...leftTrimPan.panHandlers}
            >
              <Icon name="chevron-double-right" size={16} color="#fff" />
            </View>
            <View
              style={[
                styles.trimHandleGrab,
                {
                  left: `${durationSec > 0 ? (trimEndSec / durationSec) * 100 : 0}%`,
                  marginLeft: -13,
                },
              ]}
              {...rightTrimPan.panHandlers}
            >
              <Icon name="chevron-double-left" size={16} color="#fff" />
            </View>
          </View>
        </View>

        <View style={styles.rulerRow}>
          <Text style={styles.rulerText}>00</Text>
          <Text style={styles.rulerTextCenter}>
            {formatScrubTime(durationSec * 0.5)}
          </Text>
          <Text style={styles.rulerText}>{formatScrubTime(durationSec)}</Text>
        </View>
        <View style={styles.timeMarkers}>
          <Text style={styles.markerText}>in {formatSec(trimStartSec)}</Text>
          <Text style={styles.markerText}>
            out {formatSec(trimEndSec)} · {formatSec(trimEndSec - trimStartSec)}
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.presetsScroll}
        >
          {STYLE_PRESETS.map(preset => {
            const active = selectedStylePreset === preset.id;
            return (
              <TouchableOpacity
                key={preset.id}
                style={active ? styles.activePreset : styles.inactivePreset}
                onPress={() => applyStylePreset(preset.id)}
                activeOpacity={0.85}
              >
                <Text style={active ? styles.activePresetText : styles.inactivePresetText}>
                  {preset.label}
                </Text>
                {active ? (
                  <Icon name="arrow-right" color="#fff" size={16} style={{ marginLeft: 8 }} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        </ScrollView>

        <View style={styles.toolbar}>
          <ToolbarItem
            iconName="magic-staff"
            label="Quality"
            active={activePanel === 'quality'}
            onPress={() =>
              setActivePanel(activePanel === 'quality' ? null : 'quality')
            }
          />
          <ToolbarItem iconName="content-cut" label="Split" onPress={splitAtPlayhead} />
          <ToolbarItem
            iconName="music"
            label="Music"
            active={soundsVisible}
            onPress={() => setSoundsVisible(true)}
          />
          <ToolbarItem
            iconName="microphone"
            label="Audio"
            active={activePanel === 'audio'}
            onPress={() =>
              setActivePanel(activePanel === 'audio' ? null : 'audio')
            }
          />
          <ToolbarItem
            iconName="format-text"
            label="Text"
            active={activePanel === 'text'}
            onPress={() =>
              setActivePanel(activePanel === 'text' ? null : 'text')
            }
          />
          <ToolbarItem
            iconName="chart-bubble"
            label="Effect"
            active={filterVisible}
            onPress={() => setFilterVisible(true)}
          />
        </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() =>
              navigation.navigate('PostCaptionNew', {
                draft: {
                  ...draft,
                  edits: {
                    ...draft.edits,
                    selectedSound,
                    selectedFilter,
                    speedFactor,
                    trimStartSec,
                    trimEndSec,
                    overlayText: overlayText.trim(),
                    overlayTextSize: Math.round(overlayTextSize),
                    overlayTextColor,
                    overlayRotateDeg,
                    overlayShadowPreset,
                    overlayTextXPct: Number(overlayPosPct.x.toFixed(4)),
                    overlayTextYPct: Number(overlayPosPct.y.toFixed(4)),
                    overlayLayers,
                    originalVolume,
                    musicVolume,
                    previewMuteOriginal,
                    splitPoints,
                    stylePresetId: selectedStylePreset,
                    exportQuality: { preset: exportResolution, fps: exportFps },
                    transitionId,
                    transitionDurationSec,
                    beautyLevel: Math.round(Number(beautyLevel) || 0),
                  },
                },
              })
            }
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Icon name="arrow-right" color="white" size={20} />
          </TouchableOpacity>
          <View style={styles.safetyFooter}>
            <Icon name="lock-outline" size={14} color="#AAA" />
            <Text style={styles.safetyText}>
              Your content is safe and only visible to you
            </Text>
          </View>
        </View>

        <Modal
          visible={activePanel != null}
          animationType="slide"
          transparent
          onRequestClose={() => setActivePanel(null)}
        >
          <View style={styles.modalRoot}>
            <Pressable style={styles.modalBackdrop} onPress={() => setActivePanel(null)} />
            <View style={styles.panelSheet}>
              <View style={styles.panelGrab}>
                <View style={styles.panelGrabBar} />
              </View>
              <View style={styles.panelHeaderRow}>
                <Text style={styles.panelTitle}>
                  {activePanel === 'quality' && 'Quality'}
                  {activePanel === 'audio' && 'Audio & speed'}
                  {activePanel === 'text' && 'Text & captions'}
                </Text>
                <TouchableOpacity
                  onPress={() => setActivePanel(null)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Icon name="close" size={22} color="#bbb" />
                </TouchableOpacity>
              </View>
              <ScrollView
                style={styles.panelScroll}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                {activePanel === 'quality' ? (
                  <View>
                    <Text style={styles.panelSectionLabel}>Export resolution</Text>
                    <View style={styles.chipRow}>
                      {EXPORT_RES_PRESETS.map(r => (
                        <TouchableOpacity
                          key={r.id}
                          style={[
                            styles.optChip,
                            exportResolution === r.id && styles.optChipOn,
                          ]}
                          onPress={() => setExportResolution(r.id)}
                        >
                          <Text
                            style={[
                              styles.optChipText,
                              exportResolution === r.id && styles.optChipTextOn,
                            ]}
                          >
                            {r.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.panelSectionLabel}>Frame rate</Text>
                    <View style={styles.chipRow}>
                      {EXPORT_FPS_OPTIONS.map(f => (
                        <TouchableOpacity
                          key={f}
                          style={[
                            styles.optChip,
                            exportFps === f && styles.optChipOn,
                          ]}
                          onPress={() => setExportFps(f)}
                        >
                          <Text
                            style={[
                              styles.optChipText,
                              exportFps === f && styles.optChipTextOn,
                            ]}
                          >
                            {f} fps
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.panelSectionLabel}>Beauty (soft glow)</Text>
                    <Text style={styles.sliderLabel}>
                      Level: {Math.round(beautyLevel)} — preview only; baked on upload
                    </Text>
                    <Slider
                      value={beautyLevel}
                      minimumValue={0}
                      maximumValue={100}
                      step={1}
                      onValueChange={setBeautyLevel}
                      minimumTrackTintColor="#F5A623"
                      maximumTrackTintColor="#555"
                      thumbTintColor="#fff"
                    />
                    <Text style={styles.panelSectionLabel}>
                      Between segments (after Split)
                    </Text>
                    <View style={styles.chipRow}>
                      <TouchableOpacity
                        style={[
                          styles.optChip,
                          transitionId === 'none' && styles.optChipOn,
                        ]}
                        onPress={() => setTransitionId('none')}
                      >
                        <Text
                          style={[
                            styles.optChipText,
                            transitionId === 'none' && styles.optChipTextOn,
                          ]}
                        >
                          Hard cut
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.optChip,
                          transitionId === 'fade' && styles.optChipOn,
                        ]}
                        onPress={() => setTransitionId('fade')}
                      >
                        <Text
                          style={[
                            styles.optChipText,
                            transitionId === 'fade' && styles.optChipTextOn,
                          ]}
                        >
                          Crossfade
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {transitionId === 'fade' ? (
                      <View style={styles.chipRow}>
                        {[0.2, 0.35, 0.5].map(d => (
                          <TouchableOpacity
                            key={d}
                            style={[
                              styles.optChip,
                              Math.abs(transitionDurationSec - d) < 0.03 &&
                                styles.optChipOn,
                            ]}
                            onPress={() => setTransitionDurationSec(d)}
                          >
                            <Text
                              style={[
                                styles.optChipText,
                                Math.abs(transitionDurationSec - d) < 0.03 &&
                                  styles.optChipTextOn,
                              ]}
                            >
                              {d}s blend
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    ) : null}
                    <Text style={styles.panelHint}>
                      Server FFmpeg bakes trim, splits, transitions, resolution, and fps
                      into the uploaded MP4 when you publish.
                    </Text>
                  </View>
                ) : null}

                {activePanel === 'audio' ? (
                  <View>
                    <Text style={styles.panelSectionLabel}>Sound track</Text>
                    <View style={styles.audioActionRow}>
                      <TouchableOpacity
                        style={styles.audioActionButton}
                        onPress={() => setSoundsVisible(true)}
                      >
                        <Icon name="music" size={14} color="#F5A623" />
                        <Text style={styles.audioActionButtonText}>
                          {selectedSound?.title ? 'Change music' : 'Add music'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.audioActionButton,
                          !selectedSoundUrl && styles.audioActionButtonDisabled,
                        ]}
                        onPress={removeSelectedMusic}
                        disabled={!selectedSoundUrl}
                      >
                        <Icon name="close" size={14} color="#F5A623" />
                        <Text style={styles.audioActionButtonText}>Remove music</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={styles.panelHintCompact}>
                      {selectedSound?.title
                        ? `Selected: ${selectedSound.title}${selectedSound?.artist ? ` — ${selectedSound.artist}` : ''}`
                        : 'No music selected'}
                    </Text>
                    <Text style={styles.sliderLabel}>
                      Playback speed: {speedFactor.toFixed(2)}×
                    </Text>
                    <Slider
                      value={speedFactor}
                      minimumValue={0.5}
                      maximumValue={2}
                      step={0.05}
                      onValueChange={setSpeedFactor}
                      minimumTrackTintColor="#F5A623"
                      maximumTrackTintColor="#555"
                      thumbTintColor="#fff"
                    />
                    <Text style={styles.sliderLabel}>
                      Original audio: {originalVolume.toFixed(2)}×
                    </Text>
                    <Slider
                      value={originalVolume}
                      minimumValue={0}
                      maximumValue={2}
                      step={0.05}
                      onValueChange={setOriginalVolume}
                      minimumTrackTintColor="#F5A623"
                      maximumTrackTintColor="#555"
                      thumbTintColor="#fff"
                    />
                    <Text style={styles.sliderLabel}>
                      Music bed: {musicVolume.toFixed(2)}×
                    </Text>
                    <Slider
                      value={musicVolume}
                      minimumValue={0}
                      maximumValue={2}
                      step={0.05}
                      onValueChange={setMusicVolume}
                      minimumTrackTintColor="#F5A623"
                      maximumTrackTintColor="#555"
                      thumbTintColor="#fff"
                    />
                    <View style={styles.previewMuteRow}>
                      <Text style={styles.previewMuteLabel}>Preview original sound</Text>
                      <Switch
                        value={!previewMuteOriginal}
                        onValueChange={val => setPreviewMuteOriginal(!val)}
                        trackColor={{ false: '#666', true: '#F5A623' }}
                        thumbColor="#fff"
                      />
                    </View>
                    <Text style={styles.panelHint}>
                      Timeline cuts: {splitPoints.length}. Use Split on the toolbar at the
                      playhead to add another.
                    </Text>
                  </View>
                ) : null}

                {activePanel === 'text' ? (
                  <View>
                    <View style={styles.layerRow}>
                      <Text style={styles.sliderLabel}>Layers</Text>
                      <TouchableOpacity
                        style={styles.layerAddBtn}
                        onPress={() => {
                          const next = {
                            id: `layer-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
                            text: 'New text',
                            size: 30,
                            color: '#FFFFFF',
                            rotateDeg: 0,
                            shadowPreset: 'soft',
                            anchor: 'bc',
                            xPct: 0.5,
                            yPct: 0.88,
                            startSec: 0,
                            endSec: durationSec,
                          };
                          setOverlayLayers(prev => [...prev, next]);
                          setActiveLayerId(next.id);
                        }}
                      >
                        <Icon name="plus" color="white" size={14} />
                        <Text style={styles.layerAddText}>Add</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.layerActionRow}>
                      <TouchableOpacity
                        style={styles.layerActionBtn}
                        disabled={!activeLayerId}
                        onPress={() => {
                          if (!activeLayerId) return;
                          setOverlayLayers(prev => {
                            const idx = prev.findIndex(x => x.id === activeLayerId);
                            if (idx <= 0) return prev;
                            const copy = [...prev];
                            const [item] = copy.splice(idx, 1);
                            copy.splice(idx - 1, 0, item);
                            return copy;
                          });
                        }}
                      >
                        <Icon name="arrow-down-bold" size={14} color="#DDD" />
                        <Text style={styles.layerActionText}>Back</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.layerActionBtn}
                        disabled={!activeLayerId}
                        onPress={() => {
                          if (!activeLayerId) return;
                          setOverlayLayers(prev => {
                            const idx = prev.findIndex(x => x.id === activeLayerId);
                            if (idx < 0 || idx === prev.length - 1) return prev;
                            const copy = [...prev];
                            const [item] = copy.splice(idx, 1);
                            copy.splice(idx + 1, 0, item);
                            return copy;
                          });
                        }}
                      >
                        <Icon name="arrow-up-bold" size={14} color="#DDD" />
                        <Text style={styles.layerActionText}>Front</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.layerActionRow}>
                      <TouchableOpacity
                        style={styles.layerActionBtn}
                        onPress={saveAsDraftSlot}
                      >
                        <Icon name="content-save" size={14} color="#DDD" />
                        <Text style={styles.layerActionText}>Save draft</Text>
                      </TouchableOpacity>
                    </View>
                    {savedDrafts.length ? (
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.layerScroll}
                      >
                        {savedDrafts.map(item => (
                          <TouchableOpacity
                            key={item.id}
                            style={styles.savedDraftChip}
                            onPress={() => loadDraftSlot(item.id)}
                            onLongPress={() => deleteDraftSlot(item.id)}
                          >
                            <Text style={styles.savedDraftChipText}>{item.title}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    ) : null}
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.layerScroll}
                    >
                      {overlayLayers.map((layer, idx) => (
                        <TouchableOpacity
                          key={layer.id}
                          style={[
                            styles.layerChip,
                            layer.id === activeLayerId && styles.layerChipActive,
                          ]}
                          onPress={() => setActiveLayerId(layer.id)}
                          onLongPress={() => {
                            if (overlayLayers.length <= 1) return;
                            setOverlayLayers(prev => prev.filter(x => x.id !== layer.id));
                            if (activeLayerId === layer.id) {
                              const first = overlayLayers.find(x => x.id !== layer.id);
                              if (first) setActiveLayerId(first.id);
                            }
                          }}
                        >
                          <Text
                            style={[
                              styles.layerChipText,
                              layer.id === activeLayerId && styles.layerChipTextActive,
                            ]}
                          >
                            {`T${idx + 1}`}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                    <Text style={styles.sliderLabel}>Overlay text</Text>
                    <TextInput
                      style={styles.overlayInput}
                      placeholder="Type on your reel…"
                      placeholderTextColor="#999"
                      value={overlayText}
                      onChangeText={value => {
                        setOverlayText(value);
                        if (!activeLayerId) return;
                        setOverlayLayers(prev =>
                          prev.map(layer =>
                            layer.id === activeLayerId ? { ...layer, text: value } : layer,
                          ),
                        );
                      }}
                      maxLength={80}
                    />
                    <Text style={styles.sliderLabel}>
                      Size: {Math.round(overlayTextSize)}
                    </Text>
                    <Slider
                      value={overlayTextSize}
                      minimumValue={16}
                      maximumValue={56}
                      step={1}
                      onValueChange={value => {
                        setOverlayTextSize(value);
                        if (!activeLayerId) return;
                        setOverlayLayers(prev =>
                          prev.map(layer =>
                            layer.id === activeLayerId ? { ...layer, size: value } : layer,
                          ),
                        );
                      }}
                      minimumTrackTintColor="#F5A623"
                      maximumTrackTintColor="#555"
                      thumbTintColor="#fff"
                    />
                    <Text style={styles.sliderLabel}>Color</Text>
                    <View style={styles.colorRow}>
                      {TEXT_COLORS.map(color => (
                        <TouchableOpacity
                          key={color}
                          style={[
                            styles.colorChip,
                            { backgroundColor: color },
                            overlayTextColor === color && styles.colorChipActive,
                          ]}
                          onPress={() => {
                            setOverlayTextColor(color);
                            if (!activeLayerId) return;
                            setOverlayLayers(prev =>
                              prev.map(layer =>
                                layer.id === activeLayerId ? { ...layer, color } : layer,
                              ),
                            );
                          }}
                        />
                      ))}
                    </View>
                    <Text style={styles.sliderLabel}>
                      Rotate: {Math.round(overlayRotateDeg)}°
                    </Text>
                    <Slider
                      value={overlayRotateDeg}
                      minimumValue={-45}
                      maximumValue={45}
                      step={1}
                      onValueChange={value => {
                        setOverlayRotateDeg(value);
                        if (!activeLayerId) return;
                        setOverlayLayers(prev =>
                          prev.map(layer =>
                            layer.id === activeLayerId
                              ? { ...layer, rotateDeg: value }
                              : layer,
                          ),
                        );
                      }}
                      minimumTrackTintColor="#F5A623"
                      maximumTrackTintColor="#555"
                      thumbTintColor="#fff"
                    />
                    <Text style={styles.sliderLabel}>Shadow</Text>
                    <View style={styles.shadowRow}>
                      {['none', 'soft', 'hard'].map(preset => (
                        <TouchableOpacity
                          key={preset}
                          style={[
                            styles.shadowChip,
                            overlayShadowPreset === preset && styles.shadowChipActive,
                          ]}
                          onPress={() => {
                            setOverlayShadowPreset(preset);
                            if (!activeLayerId) return;
                            setOverlayLayers(prev =>
                              prev.map(layer =>
                                layer.id === activeLayerId
                                  ? { ...layer, shadowPreset: preset }
                                  : layer,
                              ),
                            );
                          }}
                        >
                          <Text
                            style={[
                              styles.shadowChipText,
                              overlayShadowPreset === preset && styles.shadowChipTextActive,
                            ]}
                          >
                            {preset}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.sliderLabel}>
                      Anchor (where the dot sticks on the frame)
                    </Text>
                    <View style={styles.anchorGrid}>
                      {ANCHOR_GRID_ROWS.map((row, ri) => (
                        <View key={`ar-${ri}`} style={styles.anchorRow}>
                          {row.map(aid => {
                            const active =
                              normalizeAnchor(activeLayer?.anchor) === aid;
                            return (
                              <TouchableOpacity
                                key={aid}
                                style={[
                                  styles.anchorCell,
                                  active && styles.anchorCellActive,
                                ]}
                                disabled={!activeLayerId}
                                onPress={() => {
                                  if (!activeLayerId) return;
                                  setOverlayLayers(prev =>
                                    prev.map(layer =>
                                      layer.id === activeLayerId
                                        ? { ...layer, anchor: aid }
                                        : layer,
                                    ),
                                  );
                                }}
                              >
                                <Text
                                  style={[
                                    styles.anchorCellText,
                                    active && styles.anchorCellTextActive,
                                  ]}
                                >
                                  {aid.toUpperCase()}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                    <Text style={styles.sliderLabel}>
                      Visible from {formatSec(Number(activeLayer?.startSec || 0))}
                    </Text>
                    <Slider
                      value={Number(activeLayer?.startSec || 0)}
                      minimumValue={0}
                      maximumValue={Math.max(
                        0,
                        Number(activeLayer?.endSec ?? durationSec) - 0.1,
                      )}
                      step={0.1}
                      onValueChange={value => {
                        if (!activeLayerId) return;
                        setOverlayLayers(prev =>
                          prev.map(layer =>
                            layer.id === activeLayerId
                              ? { ...layer, startSec: value }
                              : layer,
                          ),
                        );
                      }}
                      minimumTrackTintColor="#F5A623"
                      maximumTrackTintColor="#555"
                      thumbTintColor="#fff"
                    />
                    <Text style={styles.sliderLabel}>
                      Visible until {formatSec(Number(activeLayer?.endSec || durationSec))}
                    </Text>
                    <Slider
                      value={Number(activeLayer?.endSec || durationSec)}
                      minimumValue={Math.min(
                        durationSec,
                        Number(activeLayer?.startSec || 0) + 0.1,
                      )}
                      maximumValue={durationSec}
                      step={0.1}
                      onValueChange={value => {
                        if (!activeLayerId) return;
                        setOverlayLayers(prev =>
                          prev.map(layer =>
                            layer.id === activeLayerId ? { ...layer, endSec: value } : layer,
                          ),
                        );
                      }}
                      minimumTrackTintColor="#F5A623"
                      maximumTrackTintColor="#555"
                      thumbTintColor="#fff"
                    />
                    <Text style={styles.panelHint}>
                      Drag text to move; use the anchor grid so left, right, top, bottom,
                      and corners align the way they will in the exported video. Long-press
                      a layer chip to delete.
                    </Text>
                  </View>
                ) : null}
              </ScrollView>
            </View>
          </View>
        </Modal>

        <SoundsModal
          visible={soundsVisible}
          onClose={() => setSoundsVisible(false)}
          onSelect={sound => {
            const normalizedSoundUrl = String(
              sound?.soundUrl || sound?.previewUrl || sound?.url || '',
            ).trim();
            setSelectedSound({
              ...(sound || {}),
              soundUrl: normalizedSoundUrl,
            });
            if (Number(musicVolume) <= 0.01) {
              setMusicVolume(Math.max(0.1, Number(lastMusicVolumeRef.current || 1)));
            }
            setPlaying(true);
            setSoundsVisible(false);
          }}
          selectedSoundId={selectedSound?.id}
        />
        <FilterModal
          visible={filterVisible}
          onClose={() => setFilterVisible(false)}
          onSelect={setSelectedFilter}
          onPreviewChange={setSelectedFilter}
          selectedFilter={selectedFilter}
        />
      </View>
    </SafeAreaView>
  );
};

const ToolbarItem = ({ iconName, label, onPress, active }) => (
  <TouchableOpacity
    style={[styles.toolbarItem, active && styles.toolbarItemActive]}
    onPress={onPress}
  >
    <Icon name={iconName} size={24} color={active ? '#F5A623' : '#FFFFFF'} />
    <Text style={[styles.toolbarLabel, active && styles.toolbarLabelActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: '#F5A623' },
  container: { flex: 1, backgroundColor: 'white', minHeight: 0 },
  header: {
    backgroundColor: '#F5A623',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleContainer: { flex: 1, marginLeft: 15 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: 'white', fontSize: 12, opacity: 0.9 },
  profilePic: { width: 40, height: 40, borderRadius: 20 },

  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: 'white',
    position: 'relative',
  },
  stepperLine: {
    position: 'absolute',
    top: 27,
    left: 28,
    right: 28,
    height: 1,
    backgroundColor: '#EEE',
    zIndex: 0,
  },
  stepItem: { alignItems: 'center', flex: 1, zIndex: 1 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStepCircle: { borderColor: '#F5A623', borderWidth: 2, padding: 2 },
  activeStepCircleFilled: {
    backgroundColor: '#F5A623',
    borderColor: '#F5A623',
    padding: 0,
  },
  stepNumber: { color: '#AAA', fontSize: 12 },
  activeStepText: { color: '#F5A623', fontWeight: 'bold' },
  activeStepNumberOnPrimary: { color: '#fff', fontWeight: 'bold' },
  stepLabel: { fontSize: 11, marginTop: 4, color: '#AAA' },
  activeLabel: { color: '#F5A623', fontWeight: 'bold' },

  editorContainer: { flex: 1, backgroundColor: '#1a1a1a', paddingTop: 8, minHeight: 0 },
  editorScroll: { flex: 1, flexShrink: 1, minHeight: 0 },
  editorScrollContent: { paddingBottom: 10, flexGrow: 1 },
  videoPreviewContainer: {
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  mainVideo: { width: '100%', height: '100%' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlayTextWrap: {
    position: 'absolute',
    maxWidth: '96%',
  },
  overlayText: {
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  shadowNone: {
    textShadowColor: 'transparent',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 0,
  },
  shadowSoft: {
    textShadowColor: 'rgba(0,0,0,0.65)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  shadowHard: {
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 1, height: 2 },
    textShadowRadius: 4,
  },

  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
  },
  scrubTimeMain: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    width: 76,
  },
  scrubBarWrap: {
    flex: 1,
    height: 32,
    justifyContent: 'center',
    position: 'relative',
  },
  scrubBarTrack: {
    height: 5,
    marginHorizontal: 2,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  scrubBarFill: { height: '100%', backgroundColor: '#F5A623' },
  scrubPlayhead: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#fff',
    top: '50%',
    marginTop: -7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.35,
    shadowRadius: 2,
    elevation: 2,
  },
  filmstripSection: { marginHorizontal: 16, marginTop: 14 },
  filmstripTrack: {
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },
  filmstripThumbs: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  filmstripThumbTile: { flex: 1, height: '100%' },
  splitLine: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.92)',
    zIndex: 2,
  },
  filmPlayhead: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: 'rgba(255,255,255,0.85)',
    zIndex: 3,
  },
  trimHandleGrab: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 26,
    backgroundColor: '#F5A623',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 3,
  },
  rulerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 22,
    marginTop: 8,
  },
  rulerText: { color: '#888', fontSize: 10, fontWeight: '600', minWidth: 28 },
  rulerTextCenter: {
    color: '#666',
    fontSize: 10,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  musicLane: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#262626',
    marginHorizontal: 16,
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  musicLaneIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: '#F5A623',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  musicLaneTitle: { color: '#fff', fontSize: 13, fontWeight: '700' },
  musicLaneSub: { color: '#888', fontSize: 11, marginTop: 2 },
  voiceLane: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#222',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2f2f2f',
  },
  voiceLaneText: { color: '#aaa', fontSize: 12, flex: 1, marginLeft: 10 },
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  panelSheet: {
    backgroundColor: '#1e1e1e',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 28,
    maxHeight: '72%',
  },
  panelGrab: { alignItems: 'center', paddingTop: 10 },
  panelGrabBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#444' },
  panelHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 8,
  },
  panelTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  panelScroll: { paddingHorizontal: 18, maxHeight: 420 },
  panelSectionLabel: {
    color: '#eee',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 12,
    marginBottom: 8,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#2d2d2d',
    borderWidth: 1,
    borderColor: '#444',
    marginRight: 8,
    marginBottom: 8,
  },
  optChipOn: {
    borderColor: '#F5A623',
    backgroundColor: 'rgba(245,166,35,0.15)',
  },
  optChipText: { color: '#ccc', fontSize: 13, fontWeight: '600' },
  optChipTextOn: { color: '#F5A623' },
  panelHint: {
    color: '#777',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 16,
    marginBottom: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 10,
  },
  addButtonText: { color: 'white', fontSize: 10, marginLeft: 4 },
  sliderWrap: {
    marginTop: 8,
    paddingHorizontal: 20,
  },
  sliderLabel: {
    color: '#BBB',
    fontSize: 11,
    marginTop: 6,
  },
  previewMuteRow: {
    marginTop: 8,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  previewMuteLabel: {
    color: '#BBB',
    fontSize: 12,
  },
  hiddenAudioTrack: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  audioToggleColumn: {
    position: 'absolute',
    right: 10,
    top: 10,
    alignItems: 'flex-end',
  },
  audioTogglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6,
  },
  audioTogglePillDanger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(170,40,40,0.78)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginBottom: 6,
  },
  audioTogglePillText: {
    color: '#fff',
    fontSize: 11,
    marginLeft: 6,
    fontWeight: '700',
  },
  audioActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
  },
  audioActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#292929',
    marginRight: 8,
  },
  audioActionButtonDisabled: {
    opacity: 0.45,
  },
  audioActionButtonText: {
    color: '#E4E4E4',
    marginLeft: 5,
    fontSize: 12,
    fontWeight: '600',
  },
  panelHintCompact: {
    color: '#8D8D8D',
    fontSize: 11,
    lineHeight: 15,
    marginTop: 6,
    marginBottom: 4,
  },
  layerRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  layerAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5A623',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  layerAddText: {
    color: '#fff',
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '700',
  },
  layerActionRow: {
    marginTop: 6,
    flexDirection: 'row',
    columnGap: 8,
  },
  layerActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#2b2b2b',
  },
  layerActionText: {
    color: '#DDD',
    marginLeft: 4,
    fontSize: 11,
    fontWeight: '700',
  },
  layerScroll: {
    marginTop: 6,
    maxHeight: 34,
  },
  layerChip: {
    borderWidth: 1,
    borderColor: '#777',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
  },
  layerChipActive: {
    borderColor: '#F5A623',
    backgroundColor: 'rgba(245,166,35,0.18)',
  },
  layerChipText: {
    color: '#DDD',
    fontSize: 11,
    fontWeight: '700',
  },
  layerChipTextActive: {
    color: '#F5A623',
  },
  savedDraftChip: {
    borderWidth: 1,
    borderColor: '#4f4f4f',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 8,
    backgroundColor: '#272727',
  },
  savedDraftChipText: {
    color: '#d8d8d8',
    fontSize: 11,
    fontWeight: '600',
  },
  speedText: {
    color: '#DDD',
    fontSize: 12,
    marginTop: 8,
  },
  overlayInput: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
    backgroundColor: '#2d2d2d',
    fontSize: 13,
  },
  colorRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: 8,
  },
  colorChip: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#666',
  },
  colorChipActive: {
    borderWidth: 2,
    borderColor: '#F5A623',
  },
  shadowRow: {
    marginTop: 6,
    flexDirection: 'row',
    columnGap: 8,
  },
  shadowChip: {
    borderWidth: 1,
    borderColor: '#666',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#2b2b2b',
  },
  shadowChipActive: {
    borderColor: '#F5A623',
    backgroundColor: 'rgba(245,166,35,0.18)',
  },
  shadowChipText: {
    color: '#DDD',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  shadowChipTextActive: {
    color: '#F5A623',
  },

  anchorGrid: {
    marginTop: 8,
    marginBottom: 4,
    alignSelf: 'stretch',
  },
  anchorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    columnGap: 6,
  },
  anchorCell: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
  },
  anchorCellActive: {
    borderColor: '#F5A623',
    backgroundColor: 'rgba(245,166,35,0.2)',
  },
  anchorCellText: {
    color: '#AAA',
    fontSize: 10,
    fontWeight: '800',
  },
  anchorCellTextActive: {
    color: '#F5A623',
  },

  trimRow: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'row',
  },
  trimDim: {
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  trimHighlight: {
    borderTopWidth: 2,
    borderBottomWidth: 2,
    borderColor: '#F5A623',
    backgroundColor: 'rgba(245,166,35,0.12)',
  },
  timeMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    marginTop: 6,
  },
  markerText: { color: '#777', fontSize: 10 },

  presetsScroll: { maxHeight: 44, marginTop: 14, paddingHorizontal: 12 },
  activePreset: {
    backgroundColor: '#F5A623',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 12,
    marginRight: 10,
  },
  activePresetText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  inactivePreset: {
    backgroundColor: '#333',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 10,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#444',
  },
  inactivePresetText: { color: '#EEE', fontSize: 12, fontWeight: '600' },

  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 6,
    marginHorizontal: 10,
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: '#252525',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
    flexShrink: 0,
  },
  toolbarItem: { alignItems: 'center', flex: 1 },
  toolbarItemActive: {},
  toolbarLabel: { color: '#ccc', fontSize: 10, marginTop: 5, fontWeight: '600' },
  toolbarLabelActive: { color: '#F5A623' },

  footer: { padding: 20, backgroundColor: 'white' },
  nextButton: {
    backgroundColor: '#F5A623',
    flexDirection: 'row',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 10,
  },
  safetyFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  safetyText: { fontSize: 11, color: '#AAA', marginLeft: 5 },
});

export default EditReelScreen;
