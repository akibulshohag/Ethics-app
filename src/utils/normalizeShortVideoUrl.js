/**
 * Mixkit retired `/videos/preview/...-large.mp4` (HTTP 403). Map to the
 * current public CDN path so App Review seed shorts still play.
 */
const MIXKIT_PREVIEW_RE =
  /^(https?:\/\/assets\.mixkit\.co\/videos\/preview\/)mixkit-.+-(\d+)(?:-large)?\.mp4(?:\?.*)?$/i;

export function normalizeShortVideoUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  const match = raw.match(MIXKIT_PREVIEW_RE);
  if (match) {
    const id = match[2];
    return `https://assets.mixkit.co/videos/${id}/${id}-720.mp4`;
  }
  return raw;
}
