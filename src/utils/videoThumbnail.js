import { createThumbnail } from 'react-native-create-thumbnail';

const DEFAULT_STAMPS_MS = [300, 800, 1500, 2500, 4000];

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
