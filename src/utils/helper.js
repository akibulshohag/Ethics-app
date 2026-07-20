import { createNavigationContainerRef } from '@react-navigation/native';
import { Image } from 'react-native';

export function validPhoneNumber(phone) {
  const p = String(phone || '').replace(/[\s\-().]/g, '');
  if (!p) return false;
  let n = p;
  if (n.startsWith('+44')) n = `0${n.slice(3)}`;
  else if (n.startsWith('0044')) n = `0${n.slice(4)}`;
  else if (n.startsWith('44') && n.length >= 12) n = `0${n.slice(2)}`;
  if (/^07\d{9}$/.test(n)) return true;
  if (/^0[1-9]\d{8,9}$/.test(n)) return true;
  return false;
}

export function validEmail(email) {
  const regex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regex.test(email);
}

export function fontSize(size) {
  const { Dimensions } = require('react-native');
  const { width } = Dimensions.get('window');
  if (width < 350) {
    return size - 2;
  } else {
    return size;
  }
}

let navigator;
export function updateNavigator(nav) {
  if (nav) {
    navigator = nav;
  }
  return navigator;
}

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  navigationRef?.current?.navigate(name, params);
}

/** Local grey fallback — never use via.placeholder.com in production. */
const resolvedImagePlaceholder = Image.resolveAssetSource(
  require('../assets/image-placeholder.png'),
);
const resolvedAvatarPlaceholder = Image.resolveAssetSource(
  require('../assets/avatar-placeholder.png'),
);

export const IMAGE_PLACEHOLDER =
  resolvedImagePlaceholder?.uri ||
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

export const AVATAR_PLACEHOLDER =
  resolvedAvatarPlaceholder?.uri || IMAGE_PLACEHOLDER;

export function avatarPlaceholder(name = 'Eatwaze') {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    String(name || 'Eatwaze').trim() || 'Eatwaze',
  )}&background=F1F2F4&color=666666&size=128`;
}

const DEFAULT_VIDEO_POSTER = IMAGE_PLACEHOLDER;

const VIDEO_FILE_EXT_RE = /\.(mp4|mov|m4v|webm|avi|mkv|3gp)(\?|$)/i;

/** True when URL points at a video file (not usable as Image source). */
export function looksLikeVideoMediaUrl(url) {
  const s = String(url || '')
    .trim()
    .toLowerCase();
  if (!s) return false;
  return VIDEO_FILE_EXT_RE.test(s) || s.includes('/videos/');
}

/**
 * Poster for feed cards: prefer thumbnail/cover; never use raw video URL in Image.
 */
export function resolveVideoPosterUri(
  thumbnailUrl,
  coverUrl,
  placeholder = DEFAULT_VIDEO_POSTER,
) {
  for (const candidate of [thumbnailUrl, coverUrl]) {
    const uri = safeImageUri(candidate, '');
    if (uri && !looksLikeVideoMediaUrl(uri)) return uri;
  }
  return placeholder;
}

/** Whether a menu item / menu file has a usable image URL. */
export function hasMenuImageUrl(url) {
  const s = String(url || '').trim();
  if (!s || s === 'null' || s === 'undefined') return false;
  if (/via\.placeholder\.com/i.test(s)) return false;
  return true;
}

/** Ensure Image source.uri is always a string (avoids "cannot cast ReadableNativeMap to String" crash) */
export function safeImageUri(val, placeholder = IMAGE_PLACEHOLDER) {
  if (typeof val === 'string' && val.trim().length > 0) {
    const trimmed = val.trim();
    if (/via\.placeholder\.com/i.test(trimmed)) return placeholder;
    return trimmed;
  }
  if (val != null && typeof val === 'object') {
    const s = val.src ?? val.uri;
    if (typeof s === 'string' && s.trim().length > 0) {
      const trimmed = s.trim();
      if (/via\.placeholder\.com/i.test(trimmed)) return placeholder;
      return trimmed;
    }
  }
  return placeholder;
}

/** Ensure local media paths work with RN multipart uploads. */
export function normalizeUploadUri(uri) {
  const raw = String(uri || '').trim();
  if (!raw) return raw;
  const lower = raw.toLowerCase();
  if (
    lower.startsWith('file://') ||
    lower.startsWith('content://') ||
    lower.startsWith('ph://') ||
    lower.startsWith('assets-library://') ||
    lower.startsWith('http://') ||
    lower.startsWith('https://')
  ) {
    return raw;
  }
  return `file://${raw}`;
}

/** True when URI must be uploaded (not a remote https URL stored on the server). */
export function isLocalMediaUri(uri) {
  const s = String(uri || '').trim();
  if (!s) return false;
  const lower = s.toLowerCase();
  if (lower.startsWith('https://') || lower.startsWith('http://')) {
    return false;
  }
  return (
    lower.startsWith('file://') ||
    lower.startsWith('content://') ||
    lower.startsWith('ph://') ||
    lower.startsWith('assets-library://') ||
    lower.startsWith('/private/') ||
    lower.startsWith('/var/') ||
    lower.startsWith('/tmp/')
  );
}
