import { createThumbnail } from 'react-native-create-thumbnail';

export const MIN_COVER_FRAMES = 6;
export const MAX_COVER_FRAMES = 12;

const DEFAULT_STAMPS_MS = [300, 800, 1500, 2500, 4000];

/**
 * Pick 6, 9, or 12 suggested frames based on video length (YouTube-style).
 */
export function resolveCoverFrameCount(durationSec, requested) {
  if (requested != null) {
    const n = Number(requested);
    if (Number.isFinite(n) && n > 0) {
      return Math.min(MAX_COVER_FRAMES, Math.max(MIN_COVER_FRAMES, Math.floor(n)));
    }
  }
  const d = Number(durationSec || 0);
  if (!Number.isFinite(d) || d <= 0) return MIN_COVER_FRAMES;
  if (d >= 45) return MAX_COVER_FRAMES;
  if (d >= 20) return 9;
  return MIN_COVER_FRAMES;
}

/**
 * Evenly spaced timestamps (ms) across the video for cover suggestions.
 */
export function buildCoverFrameTimestamps(durationSec, frameCount = MIN_COVER_FRAMES) {
  const count = Math.min(
    MAX_COVER_FRAMES,
    Math.max(1, Math.floor(frameCount || MIN_COVER_FRAMES)),
  );
  const duration = Number(durationSec || 0);
  if (!Number.isFinite(duration) || duration <= 0) {
    const step = 600;
    return Array.from({ length: count }, (_, i) => (i + 1) * step);
  }
  const safeDurationMs = Math.max(1000, Math.floor(duration * 1000));
  const startMs = Math.min(400, Math.floor(safeDurationMs * 0.04));
  const endMs = Math.max(startMs + 400, safeDurationMs - 150);
  const span = endMs - startMs;
  if (count === 1) return [startMs];
  const step = Math.max(1, Math.floor(span / (count - 1)));
  return Array.from({ length: count }, (_, i) => startMs + i * step);
}

/**
 * Generate multiple JPEG frames from a local video URI.
 */
export async function generateVideoCoverFrames(
  videoUri,
  {
    durationSec,
    frameCount,
    maxWidth = 540,
    maxHeight = 960,
  } = {},
) {
  const uri = String(videoUri || '').trim();
  if (!uri) return [];

  const count = resolveCoverFrameCount(durationSec, frameCount);
  const timestamps = buildCoverFrameTimestamps(durationSec, count);
  const cacheKey = Date.now();

  const reqs = timestamps.map((timeStamp, i) =>
    createThumbnail({
      url: uri,
      timeStamp,
      format: 'jpeg',
      cacheName: `eatix_cover_${cacheKey}_${i}`,
      maxWidth,
      maxHeight,
    })
      .then(shot =>
        shot?.path
          ? {
              id: `${timeStamp}-${i}`,
              uri: shot.path,
              timeStamp,
              type: 'image/jpeg',
              name: `cover_${i + 1}.jpg`,
              fileName: `cover_${i + 1}.jpg`,
            }
          : null,
      )
      .catch(() => null),
  );

  return (await Promise.all(reqs)).filter(Boolean);
}

/**
 * Generate a JPEG thumbnail from a local video URI (camera roll / file).
 * Tries several timestamps until one succeeds.
 */
export async function thumbnailFromVideoFrame(
  videoUri,
  { stampsMs = DEFAULT_STAMPS_MS, maxWidth = 1080, maxHeight = 1920 } = {},
) {
  const uri = String(videoUri || '').trim();
  if (!uri) return null;

  for (let i = 0; i < stampsMs.length; i += 1) {
    try {
      const shot = await createThumbnail({
        url: uri,
        timeStamp: stampsMs[i],
        format: 'jpeg',
        cacheName: `eatix_thumb_${Date.now()}_${i}`,
        maxWidth,
        maxHeight,
      });
      if (shot?.path) {
        return {
          uri: shot.path,
          type: 'image/jpeg',
          name: 'video-frame-thumb.jpg',
          fileName: 'video-frame-thumb.jpg',
        };
      }
    } catch {
      /* try next timestamp */
    }
  }
  return null;
}

/**
 * Ensure upload payload includes a thumbnail; auto-generate from video when missing.
 */
export async function ensureVideoThumbnailFields(payload = {}) {
  const videoUri = String(payload.videoUri || '').trim();
  const existing = String(payload.thumbnailUri || '').trim();
  if (existing) return payload;
  if (!videoUri) return payload;

  const generated = await thumbnailFromVideoFrame(videoUri);
  if (!generated?.uri) return payload;

  return {
    ...payload,
    thumbnailUri: generated.uri,
    thumbnailType: generated.type || 'image/jpeg',
    thumbnailName: generated.name || generated.fileName || 'thumbnail.jpg',
  };
}

export function frameToThumbnailAsset(frame) {
  if (!frame?.uri) return null;
  return {
    uri: frame.uri,
    type: frame.type || 'image/jpeg',
    name: frame.fileName || frame.name || 'cover.jpg',
    fileName: frame.fileName || frame.name || 'cover.jpg',
  };
}
