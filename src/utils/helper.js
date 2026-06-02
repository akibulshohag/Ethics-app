import {createNavigationContainerRef} from '@react-navigation/native';

export function validPhoneNumber(phone) {
  const regex = /(^(\+8801|8801|008801|01))(\d){9}$/;
  return regex.test(phone);
}

export function validEmail(email) {
  const regex =
    /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return regex.test(email);
}

export function fontSize(size) {
  const {Dimensions} = require('react-native');
  const {width} = Dimensions.get('window');
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

const DEFAULT_VIDEO_POSTER =
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600';

const VIDEO_FILE_EXT_RE = /\.(mp4|mov|m4v|webm|avi|mkv|3gp)(\?|$)/i;

/** True when URL points at a video file (not usable as Image source). */
export function looksLikeVideoMediaUrl(url) {
  const s = String(url || '').trim().toLowerCase();
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

/** Ensure Image source.uri is always a string (avoids "cannot cast ReadableNativeMap to String" crash) */
export function safeImageUri(val, placeholder = 'https://via.placeholder.com/200') {
  if (typeof val === 'string' && val.trim().length > 0) return val.trim();
  if (val != null && typeof val === 'object') {
    const s = val.src ?? val.uri;
    if (typeof s === 'string' && s.trim().length > 0) return s.trim();
  }
  return placeholder;
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