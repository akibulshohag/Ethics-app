/**
 * Optional TikTok-style backdrop music while recording (react-native-nitro-sound).
 * Final muxing of music into the file is expected server-side via soundUrl metadata.
 */

let Sound = null;
try {
  Sound = require('react-native-nitro-sound').default;
} catch {
  Sound = null;
}

export const isShortsSoundAvailable = () => !!Sound;

export async function stopShortsBackdrop() {
  if (!Sound) return;
  try {
    await Sound.stopPlayer();
  } catch {
    /* noop */
  }
}

export async function playShortsBackdrop(url) {
  if (!Sound || !url) return;
  try {
    await Sound.stopPlayer();
    await Sound.startPlayer(url);
    await Sound.setVolume(1);
  } catch (e) {
    console.warn('[shortsBackdropSound] play failed', e?.message);
  }
}

/**
 * Loop preview while `isRecordingRef.current` is true.
 * Returns cleanup (remove listener + stop).
 */
export function bindShortsBackdropLoop(url, isRecordingRef) {
  if (!Sound || !url || !isRecordingRef) {
    return () => {};
  }
  const onEnd = () => {
    if (isRecordingRef.current && url) {
      Sound.startPlayer(url).catch(() => {});
    }
  };
  try {
    Sound.addPlaybackEndListener(onEnd);
  } catch {
    return () => {};
  }
  return () => {
    try {
      Sound.removePlaybackEndListener();
    } catch {
      /* noop */
    }
    stopShortsBackdrop();
  };
}
