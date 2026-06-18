import axios from 'axios';
import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/users`;

const getAuthHeaders = () => {
  try {
    const { store } = require('../redux');
    const token = store.getState()?.app?.user?.token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch {}
  return {};
};

/**
 * Get channel profile with stats (video count, short count, total views, subscribers, isSubscribed)
 * @param {string} channelUserId - Channel user ID
 * @param {string} [currentUserId] - Logged-in user ID (for isSubscribed)
 */
export const getChannelProfile = async (channelUserId, currentUserId) => {
  try {
    const params = currentUserId ? { currentUserId } : {};
    const response = await axios.get(
      `${API_URL}/${channelUserId}/channel-profile`,
      { params, headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error) {
    // 404 is expected for mock users or users without channel-profile
    if (error?.response?.status === 404) {
      return { isSubscribed: false, subscriberCount: 0 };
    }
    console.error('Error fetching channel profile:', error);
    throw error;
  }
};

/**
 * Paginated restaurant order reviews for a channel (owner).
 * GET /users/:channelUserId/channel-reviews?page=&limit=
 */
export const getChannelOrderReviews = async (
  channelUserId,
  page = 1,
  limit = 30,
) => {
  const response = await axios.get(
    `${API_URL}/${channelUserId}/channel-reviews`,
    {
      params: { page, limit },
      headers: getAuthHeaders(),
    },
  );
  return response.data;
};

/**
 * Logged-in customers within the owner's delivery radius (owner only).
 * GET /users/:ownerId/delivery-area-users?page=&limit=
 */
export const getDeliveryAreaUsers = async (ownerId, page = 1, limit = 50) => {
  try {
    const response = await axios.get(
      `${API_URL}/${ownerId}/delivery-area-users`,
      {
        params: { page, limit },
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    const status = error?.response?.status;
    const rawMsg = error?.response?.data?.message ?? error?.message;
    const message = Array.isArray(rawMsg)
      ? rawMsg.join(', ')
      : String(rawMsg || '').trim();
    if (status === 404 || status === 501) {
      return {
        items: [],
        total: 0,
        radiusKm: null,
        message:
          message ||
          'Delivery area users is not available yet. Deploy the latest backend.',
      };
    }
    if (status === 403) {
      return {
        items: [],
        total: 0,
        radiusKm: null,
        message: message || 'You can only view area users on your own profile.',
      };
    }
    throw new Error(message || 'Could not load delivery area users');
  }
};

/**
 * List followers (subscribers) for a given channel/user.
 * GET /users/:channelUserId/followers?currentUserId=&page=&limit=
 */
export const getChannelFollowers = async (
  channelUserId,
  currentUserId,
  page = 1,
  limit = 50,
) => {
  try {
    const params = { page, limit };
    if (currentUserId) params.currentUserId = currentUserId;
    const response = await axios.get(`${API_URL}/${channelUserId}/followers`, {
      params,
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching channel followers:', error);
    throw error;
  }
};

/**
 * List channels this user is following.
 * GET /users/:userId/following?currentUserId=&page=&limit=
 */
export const getChannelFollowing = async (
  userId,
  currentUserId,
  page = 1,
  limit = 50,
) => {
  try {
    const params = { page, limit };
    if (currentUserId) params.currentUserId = currentUserId;
    const response = await axios.get(`${API_URL}/${userId}/following`, {
      params,
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching channel following:', error);
    throw error;
  }
};

/**
 * Subscribe to a channel
 */
export const subscribeToChannel = async (subscriberId, channelUserId) => {
  try {
    const response = await axios.post(
      `${API_URL}/channel/subscribe`,
      { subscriberId, channelUserId },
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error) {
    console.error('Error subscribing:', error);
    throw error;
  }
};

/**
 * Unsubscribe from a channel
 */
export const unsubscribeFromChannel = async (subscriberId, channelUserId) => {
  try {
    const response = await axios.post(
      `${API_URL}/channel/unsubscribe`,
      { subscriberId, channelUserId },
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error) {
    console.error('Error unsubscribing:', error);
    throw error;
  }
};

/**
 * List channels (users with videos or shorts) - for Stories
 */
export const getChannelsList = async (limit = 20) => {
  try {
    const response = await axios.get(`${API_URL}/channels/list`, {
      params: { limit },
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching channels list:', error);
    throw error;
  }
};

/**
 * Get feed from subscribed channels (For You tab)
 */
export const getSubscribedFeed = async (userId, page = 1, limit = 30) => {
  try {
    const response = await axios.get(`${API_URL}/subscribed-feed`, {
      params: { userId, page, limit },
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching subscribed feed:', error);
    throw error;
  }
};

const FB_OAUTH_SCOPES_CORE =
  'public_profile,business_management,pages_show_list,pages_read_engagement,pages_manage_posts';
const FB_OAUTH_SCOPES_INSTAGRAM_DEFAULT =
  'instagram_basic,instagram_content_publish';

const getFacebookOAuthScopesString = (forInstagram = false) => {
  if (forInstagram || config.facebookIncludeInstagramScopes === true) {
    const custom = String(config.facebookInstagramLoginScopes || '').trim();
    const ig = custom || FB_OAUTH_SCOPES_INSTAGRAM_DEFAULT;
    return `${FB_OAUTH_SCOPES_CORE},${ig}`;
  }
  return FB_OAUTH_SCOPES_CORE;
};

/** Build OAuth dialog URL; must match backend `SocialAuthService.getFacebookConnectUrl`. */
export const buildFacebookConnectUrl = (userId, appId, forInstagram = false) => {
  const uid = String(userId || '').trim();
  const id = String(appId || '').trim();
  if (!uid || !id) return '';
  const base = String(config.apiBaseUrl || '').replace(/\/$/, '');
  const redirectUri = `${base}/social-auth/facebook/callback`;
  const state = encodeURIComponent(JSON.stringify({ userId: uid }));
  const scopes = encodeURIComponent(getFacebookOAuthScopesString(forInstagram));
  return (
    `https://www.facebook.com/v21.0/dialog/oauth?client_id=${encodeURIComponent(
      id,
    )}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}` +
    `&response_type=code` +
    `&scope=${scopes}`
  );
};

const parseAxiosApiError = err => {
  let data = err?.response?.data;
  const status = err?.response?.status;
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data);
    } catch {
      const s = data.trim();
      if (s) return s.length > 400 ? `${s.slice(0, 400)}…` : s;
    }
  }
  let msg = '';
  if (data && typeof data === 'object') {
    const m = data.message;
    if (typeof m === 'string') msg = m.trim();
    else if (Array.isArray(m)) msg = m.map(String).filter(Boolean).join(', ');
  }
  if (!msg && data && typeof data === 'object' && typeof data.error === 'string') {
    const e = data.error.trim();
    if (e && e !== 'Bad Request') msg = e;
  }
  if (!msg && status) {
    msg = `Server error (${status}). Add FACEBOOK_APP_ID (and APP_URL) on the Eatwaze API server, or set facebookAppId in app config.js.`;
  }
  if (!msg) msg = String(err?.message || 'Request failed');
  return msg;
};

/**
 * Get connect URL for Facebook OAuth flow.
 * Uses API when possible; if the request fails and `config.facebookAppId` is set, builds the same URL locally.
 */
const TIKTOK_OAUTH_SCOPES =
  'user.info.basic,user.info.profile,video.publish';

/** Build TikTok Login Kit URL; must match backend `SocialAuthService.getTikTokConnectUrl`. */
export const buildTikTokConnectUrl = (userId, clientKey) => {
  const uid = String(userId || '').trim();
  const key = String(clientKey || '').trim();
  if (!uid || !key) return '';
  const base = String(config.apiBaseUrl || '').replace(/\/$/, '');
  const redirectUri = `${base}/social-auth/tiktok/callback`;
  const state = encodeURIComponent(JSON.stringify({ userId: uid }));
  const scope = encodeURIComponent(TIKTOK_OAUTH_SCOPES);
  return (
    `https://www.tiktok.com/v2/auth/authorize/?client_key=${encodeURIComponent(
      key,
    )}` +
    `&response_type=code&scope=${scope}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&state=${state}`
  );
};

/**
 * TikTok OAuth connect URL (Content Posting). Requires TIKTOK_CLIENT_KEY on API.
 */
export const getTikTokConnectUrl = async userId => {
  const uid = String(userId ?? '').trim();
  if (!uid) {
    throw new Error('Sign in required to connect TikTok.');
  }
  try {
    const response = await axios.get(
      `${config.apiBaseUrl}/social-auth/tiktok/connect`,
      {
        params: { userId: uid },
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    const localKey = String(config.tiktokClientKey || '').trim();
    if (localKey) {
      const url = buildTikTokConnectUrl(uid, localKey);
      if (url) return { url };
    }
    throw new Error(parseAxiosApiError(error));
  }
};

const YOUTUBE_VERIFY_SCOPES =
  'https://www.googleapis.com/auth/youtube.readonly';

/** Build Google OAuth URL; must match backend `SocialAuthService.getYouTubeConnectUrl`. */
export const buildYouTubeConnectUrl = (userId, clientId, mode = 'verify') => {
  const uid = String(userId || '').trim();
  const id = String(clientId || '').trim();
  if (!uid || !id) return '';
  const base = String(config.apiBaseUrl || '').replace(/\/$/, '');
  const redirectUri = `${base}/social-auth/youtube/callback`;
  const state = encodeURIComponent(JSON.stringify({ userId: uid, mode }));
  const scope = encodeURIComponent(YOUTUBE_VERIFY_SCOPES);
  return (
    `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      id,
    )}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&scope=${scope}` +
    `&state=${state}` +
    `&access_type=offline` +
    `&prompt=consent` +
    `&include_granted_scopes=true`
  );
};

/**
 * Preferred: native Google Sign-In (avoids browser OAuth redirect issues on mobile).
 */
export const connectYouTubeAccount = async userId => {
  const { connectYouTubeWithGoogleSignIn } = require('./socialAuthService');
  return connectYouTubeWithGoogleSignIn(userId);
};

/**
 * YouTube OAuth connect URL. Requires GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET on API.
 */
export const getYouTubeConnectUrl = async (userId, mode = 'verify') => {
  const uid = String(userId ?? '').trim();
  if (!uid) {
    throw new Error('Sign in required to connect YouTube.');
  }
  try {
    const response = await axios.get(
      `${config.apiBaseUrl}/social-auth/youtube/connect`,
      {
        params: { userId: uid, mode },
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    const localId = String(config.googleClientId || '').trim();
    if (localId) {
      const url = buildYouTubeConnectUrl(uid, localId, mode);
      if (url) return { url, mode };
    }
    throw new Error(parseAxiosApiError(error));
  }
};

/**
 * Instagram Business link status for each connected Facebook Page + saved IG accounts.
 */
export const getInstagramLinkStatus = async (userId, sync = true) => {
  const uid = String(userId ?? '').trim();
  if (!uid) throw new Error('userId required');
  const response = await axios.get(
    `${config.apiBaseUrl}/social-accounts/instagram-status`,
    {
      params: { userId: uid, sync: sync ? '1' : '0' },
      headers: getAuthHeaders(),
    },
  );
  return response.data;
};

export const getFacebookConnectUrl = async (userId, options = {}) => {
  const uid = String(userId ?? '').trim();
  const forInstagram = options?.forInstagram === true;
  if (!uid) {
    throw new Error('Sign in required to connect Facebook.');
  }
  try {
    const response = await axios.get(
      `${config.apiBaseUrl}/social-auth/facebook/connect`,
      {
        params: { userId: uid, ...(forInstagram ? { instagram: '1' } : {}) },
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    const localAppId = String(config.facebookAppId || '').trim();
    if (localAppId) {
      const url = buildFacebookConnectUrl(uid, localAppId, forInstagram);
      if (url) return { url };
    }
    throw new Error(parseAxiosApiError(error));
  }
};

/**
 * List user's connected social accounts/pages.
 */
export const getSocialAccounts = async userId => {
  const response = await axios.get(`${config.apiBaseUrl}/social-accounts`, {
    params: { userId },
    headers: getAuthHeaders(),
  });
  return response.data;
};

function extractPatchProfileError(error) {
  const data = error?.response?.data;
  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message.trim();
  }
  if (Array.isArray(data?.message)) {
    return data.message.join(', ');
  }
  const firstErr = Array.isArray(data?.errors) ? data.errors[0] : null;
  const constraint = firstErr?.constraints
    ? Object.values(firstErr.constraints)[0]
    : null;
  if (constraint) {
    return `${constraint}${firstErr.property ? ` (${firstErr.property})` : ''}`;
  }
  return error?.message || 'Failed to update profile';
}

/** Ensure lat/lng are numbers for API validation (not strings). */
function normalizeProfilePatchBody(data) {
  if (!data || typeof data !== 'object') return data;
  const body = { ...data };
  if (body.latitude != null && body.latitude !== '') {
    const lat = Number(body.latitude);
    if (Number.isFinite(lat)) body.latitude = lat;
    else delete body.latitude;
  }
  if (body.longitude != null && body.longitude !== '') {
    const lng = Number(body.longitude);
    if (Number.isFinite(lng)) body.longitude = lng;
    else delete body.longitude;
  }
  [
    'contentAreaKm',
    'pickupAreaKm',
    'deliveryAreaKm',
    'taxCharge0To10Km',
    'taxCharge11To20Km',
    'taxCharge21To30Km',
    'vendorMinOrderQty',
    'vendorMaxOrderQty',
  ].forEach(field => {
    if (body[field] === null || body[field] === '') {
      body[field] = null;
      return;
    }
    if (body[field] != null && body[field] !== '') {
      const n = Number(body[field]);
      if (Number.isFinite(n)) body[field] = Math.floor(n);
      else delete body[field];
    }
  });
  return body;
}

/**
 * Update channel profile (nickname, channelAbout, socialLinks, etc.) - only for own channel
 */
export const updateChannelProfile = async (userId, data) => {
  const patch = async body =>
    axios.patch(`${API_URL}/${userId}`, normalizeProfilePatchBody(body), {
      headers: getAuthHeaders(),
    });

  try {
    const response = await patch(data);
    return response.data;
  } catch (error) {
    const status = error?.response?.status;
    const postcode = data?.postcode;
    if (status === 400 && postcode) {
      try {
        const { postcode: _pc, ...rest } = data;
        let address = String(rest.address || '').trim();
        const pc = String(postcode).trim();
        if (pc) {
          const compactAddr = address.replace(/\s/g, '').toUpperCase();
          const compactPc = pc.replace(/\s/g, '').toUpperCase();
          if (!compactAddr.includes(compactPc)) {
            address = address ? `${address}, ${pc}` : pc;
          }
        }
        const response = await patch({
          ...rest,
          address: address || rest.address,
        });
        return response.data;
      } catch (retryErr) {
        console.error('Error updating channel profile (retry):', retryErr);
        throw new Error(extractPatchProfileError(retryErr));
      }
    }
    console.error('Error updating channel profile:', error);
    throw new Error(extractPatchProfileError(error));
  }
};

/**
 * Upload profile avatar - only for own profile
 * Uses fetch so React Native correctly sends file from URI (avoids axios FormData issues).
 */
export const uploadProfilePhoto = async (userId, file) => {
  if (!file?.uri) {
    throw new Error('Image is required');
  }
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.type || 'image/jpeg',
    name: file.name || 'avatar.jpg',
  });
  const headers = getAuthHeaders();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const response = await fetch(`${API_URL}/${userId}/upload-avatar`, {
      method: 'POST',
      headers: { ...headers },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg =
        data?.message ||
        (Array.isArray(data?.message) ? data.message.join(' ') : null) ||
        `Upload failed (${response.status})`;
      console.error('[uploadProfilePhoto]', response.status, data);
      throw new Error(msg);
    }
    return data;
  } catch (err) {
    const msg =
      err.name === 'AbortError'
        ? 'Upload timed out. Try again.'
        : err.message || 'Network error. Check connection and try again.';
    console.error('[uploadProfilePhoto]', err.message, err);
    throw new Error(msg);
  }
};

/**
 * Upload cover image - only for own profile.
 * Backend should store and return coverUrl/coverImage in channel profile.
 */
export const uploadCoverImage = async (userId, file) => {
  if (!file?.uri) {
    throw new Error('Image is required');
  }
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    type: file.type || 'image/jpeg',
    name: file.name || 'cover.jpg',
  });
  const headers = getAuthHeaders();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const response = await fetch(`${API_URL}/${userId}/upload-cover`, {
      method: 'POST',
      headers: { ...headers },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg =
        data?.message ||
        (Array.isArray(data?.message) ? data.message.join(' ') : null) ||
        `Upload failed (${response.status})`;
      console.error('[uploadCoverImage]', response.status, data);
      throw new Error(msg);
    }
    return data;
  } catch (err) {
    const msg =
      err.name === 'AbortError'
        ? 'Upload timed out. Try again.'
        : err.message || 'Network error. Check connection and try again.';
    console.error('[uploadCoverImage]', err.message, err);
    throw new Error(msg);
  }
};

/**
 * Get user gallery photos (optional viewerId for isLiked / isDisliked)
 */
export const getGallery = async (userId, viewerId) => {
  const params = viewerId ? { viewerId } : {};
  const response = await axios.get(`${API_URL}/${userId}/gallery`, {
    params,
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const toggleGalleryPhotoLike = async (
  channelUserId,
  photoId,
  userId,
) => {
  const response = await axios.post(
    `${API_URL}/${channelUserId}/gallery/${photoId}/like`,
    { userId },
    { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } },
  );
  return response.data;
};

export const toggleGalleryPhotoDislike = async (
  channelUserId,
  photoId,
  userId,
) => {
  const response = await axios.post(
    `${API_URL}/${channelUserId}/gallery/${photoId}/dislike`,
    { userId },
    { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } },
  );
  return response.data;
};

export const recordGalleryPhotoShare = async (channelUserId, photoId) => {
  const response = await axios.post(
    `${API_URL}/${channelUserId}/gallery/${photoId}/share`,
    {},
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const getGalleryPhotoComments = async (
  channelUserId,
  photoId,
  page = 1,
  limit = 20,
) => {
  const response = await axios.get(
    `${API_URL}/${channelUserId}/gallery/${photoId}/comments`,
    { params: { page, limit }, headers: getAuthHeaders() },
  );
  return response.data;
};

export const addGalleryPhotoComment = async (
  channelUserId,
  photoId,
  userId,
  content,
) => {
  const response = await axios.post(
    `${API_URL}/${channelUserId}/gallery/${photoId}/comments`,
    { userId, content },
    { headers: { 'Content-Type': 'application/json', ...getAuthHeaders() } },
  );
  return response.data;
};

export const deleteGalleryPhotoComment = async commentId => {
  const response = await axios.delete(
    `${API_URL}/gallery-comment/${commentId}`,
    { headers: getAuthHeaders() },
  );
  return response.data;
};

/**
 * Upload multiple gallery photos (owner only)
 * Uses fetch so React Native correctly sends files from URIs.
 */
export const uploadGallery = async (userId, files) => {
  if (!files?.length) throw new Error('Select at least one image');
  const formData = new FormData();
  files.forEach((f, i) => {
    formData.append('files', {
      uri: f.uri,
      type: f.type || 'image/jpeg',
      name: f.name || `photo-${i}.jpg`,
    });
  });
  const headers = getAuthHeaders();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const response = await fetch(`${API_URL}/${userId}/gallery/upload`, {
      method: 'POST',
      headers: { ...headers },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg =
        data?.message ||
        (Array.isArray(data?.message) ? data.message.join(' ') : null) ||
        `Upload failed (${response.status})`;
      console.error('[uploadGallery]', response.status, data);
      throw new Error(msg);
    }
    return data;
  } catch (err) {
    const msg =
      err.name === 'AbortError'
        ? 'Upload timed out. Try again.'
        : err.message || 'Network error. Check connection and try again.';
    console.error('[uploadGallery]', err.message, err);
    throw new Error(msg);
  }
};

/**
 * Delete one gallery photo (owner only)
 */
export const deleteGalleryPhoto = async (userId, photoId) => {
  const response = await axios.delete(
    `${API_URL}/${userId}/gallery/${photoId}`,
    { headers: getAuthHeaders() },
  );
  return response.data;
};
