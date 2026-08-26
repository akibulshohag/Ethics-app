import React from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Video from 'react-native-video';
import EatwazeWatermark from './EatwazeWatermark';
import MediaPlayTapOverlay from './MediaPlayTapOverlay';
import {
  clipsFromDraft,
  locateClipAtTime,
  timelineSecFromSource,
  totalTimelineDuration,
} from '../utils/postClips';

/**
 * Shared photo/video preview with tap-to-play, clip switching, music, watermark.
 */
export default function PostMediaPlayer({
  draft,
  clips: clipsProp,
  playing,
  onPlayingChange,
  isFocused = true,
  muted = false,
  volume = 1,
  selectedSoundUrl,
  musicVolume = 1,
  filterOverlay,
  beautyOverlay,
  onProgress,
  onLayout,
  style,
  children,
  showWatermark = true,
  videoRef: videoRefProp,
  musicRef: musicRefProp,
}) {
  const clips = React.useMemo(() => {
    if (Array.isArray(clipsProp) && clipsProp.length) return clipsProp;
    return clipsFromDraft(draft);
  }, [clipsProp, draft]);

  const totalDur = totalTimelineDuration(clips);
  const [timelineSec, setTimelineSec] = React.useState(0);
  const [controlsVisible, setControlsVisible] = React.useState(true);
  const hideTimerRef = React.useRef(null);
  const innerVideoRef = React.useRef(null);
  const innerMusicRef = React.useRef(null);
  const videoRef = videoRefProp || innerVideoRef;
  const musicRef = musicRefProp || innerMusicRef;
  const timelineRef = React.useRef(0);
  const photoTimerRef = React.useRef(null);
  const onProgressRef = React.useRef(onProgress);
  onProgressRef.current = onProgress;
  const loc = locateClipAtTime(clips, timelineSec);
  const activeClip = loc.clip;
  const isPhoto = activeClip?.type === 'photo';
  const actuallyPlaying = Boolean(playing && isFocused);

  React.useEffect(() => {
    timelineRef.current = timelineSec;
  }, [timelineSec]);

  React.useEffect(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (!actuallyPlaying) {
      setControlsVisible(true);
      return undefined;
    }
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 900);
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [actuallyPlaying, playing]);

  const seekMusic = React.useCallback(t => {
    try {
      musicRef.current?.seek?.(Math.max(0, Number(t) || 0));
    } catch {
      /* noop */
    }
  }, [musicRef]);

  const seekVideo = React.useCallback(
    sourceT => {
      try {
        videoRef.current?.seek?.(Math.max(0, Number(sourceT) || 0));
      } catch {
        /* noop */
      }
    },
    [videoRef],
  );

  React.useEffect(() => {
    if (!isPhoto && activeClip?.uri) {
      seekVideo(loc.sourceT);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeClip?.id, isPhoto]);

  React.useEffect(() => {
    if (photoTimerRef.current) {
      clearInterval(photoTimerRef.current);
      photoTimerRef.current = null;
    }
    if (!isPhoto || !actuallyPlaying) return undefined;
    photoTimerRef.current = setInterval(() => {
      setTimelineSec(prev => {
        const next = prev + 0.12;
        if (next >= totalDur - 0.05) {
          onProgressRef.current?.({ currentTime: 0, timelineSec: 0 });
          seekMusic(0);
          return 0;
        }
        onProgressRef.current?.({ currentTime: next, timelineSec: next });
        return next;
      });
    }, 120);
    return () => {
      if (photoTimerRef.current) clearInterval(photoTimerRef.current);
    };
  }, [isPhoto, actuallyPlaying, totalDur, seekMusic]);

  const locRef = React.useRef(loc);
  locRef.current = loc;
  const totalDurRef = React.useRef(totalDur);
  totalDurRef.current = totalDur;

  const advanceToNextClip = React.useCallback(() => {
    const current = locRef.current;
    const total = totalDurRef.current;
    const nextStart = current.startOnTimeline + current.duration;
    if (nextStart >= total - 0.08) {
      setTimelineSec(0);
      onProgressRef.current?.({ currentTime: 0, timelineSec: 0 });
      seekMusic(0);
      return;
    }
    setTimelineSec(nextStart + 0.02);
    onProgressRef.current?.({ currentTime: nextStart, timelineSec: nextStart });
  }, [seekMusic]);

  const togglePlay = React.useCallback(() => {
    setControlsVisible(true);
    onPlayingChange?.(!playing);
  }, [onPlayingChange, playing]);

  const onVideoProgress = React.useCallback(
    p => {
      const sourceT = Number(p?.currentTime || 0);
      if (!Number.isFinite(sourceT) || !activeClip) return;
      const end = Number(activeClip.trimEndSec || activeClip.durationSec);
      if (sourceT >= end - 0.12) {
        advanceToNextClip();
        return;
      }
      const global = timelineSecFromSource(clips, loc.index, sourceT);
      setTimelineSec(global);
      onProgressRef.current?.({ currentTime: global, timelineSec: global, sourceT });
    },
    [activeClip, advanceToNextClip, clips, loc.index],
  );

  if (!activeClip?.uri) {
    return <View style={[styles.box, style]} />;
  }

  return (
    <View style={[styles.box, style]} onLayout={onLayout}>
      {isPhoto ? (
        <Image source={{ uri: activeClip.uri }} style={styles.fill} resizeMode="cover" />
      ) : (
        <Video
          key={`${activeClip.id}-${loc.index}`}
          ref={videoRef}
          source={{ uri: activeClip.uri }}
          style={styles.fill}
          resizeMode="cover"
          paused={!actuallyPlaying}
          muted={muted || Number(activeClip.volume ?? 1) <= 0}
          volume={Math.max(0, Math.min(2, Number(volume) * Number(activeClip.volume ?? 1)))}
          rate={Number(activeClip.speedFactor) || 1}
          progressUpdateInterval={120}
          onLoad={meta => {
            const realDur = Number(meta?.duration);
            if (Number.isFinite(realDur) && realDur > 0.4) {
              const claimed = Number(activeClip.durationSec || 0);
              if (claimed > realDur * 1.5 || claimed < 0.4) {
                // Keep playing; trim end will naturally clamp via source progress.
              }
            }
            seekVideo(loc.sourceT);
            if (!playing) onPlayingChange?.(true);
          }}
          onError={e => {
            console.warn('PostMediaPlayer video error', e?.nativeEvent || e);
            onPlayingChange?.(false);
          }}
          onProgress={onVideoProgress}
          onEnd={advanceToNextClip}
          ignoreSilentSwitch="ignore"
        />
      )}
      {selectedSoundUrl && Number(musicVolume) > 0 ? (
        <Video
          ref={musicRef}
          source={{ uri: selectedSoundUrl }}
          style={styles.hiddenAudio}
          audioOnly
          repeat
          paused={!actuallyPlaying}
          muted={false}
          volume={Math.max(0, Math.min(2, Number(musicVolume) || 0))}
          ignoreSilentSwitch="ignore"
          onLoad={() => seekMusic(timelineRef.current)}
        />
      ) : null}
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
      {children}
      {showWatermark ? <EatwazeWatermark /> : null}
      <MediaPlayTapOverlay
        playing={actuallyPlaying}
        onToggle={togglePlay}
        visible={controlsVisible || !actuallyPlaying}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  hiddenAudio: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
});
