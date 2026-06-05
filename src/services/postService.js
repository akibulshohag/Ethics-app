import axios from 'axios';
import { config } from '../../config';
import { ensureVideoThumbnailFields } from '../utils/videoThumbnail';

const API_URL = `${config.apiBaseUrl}/posts`;

const getAuthHeaders = () => {
  try {
    const { store } = require('../redux');
    const token = store.getState()?.app?.user?.token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch (e) {}
  return {};
};

const isFutureScheduledPost = item => {
  const raw =
    item?.scheduledPublishAt ||
    item?.scheduleAt ||
    item?.scheduleDate ||
    item?.scheduledAt ||
    item?.publishAt ||
    item?.publishedAt ||
    null;
  const d = raw ? new Date(raw) : null;
  return !!(d && Number.isFinite(d.getTime()) && d.getTime() > Date.now());
};

const filterPublicScheduledPosts = data => {
  if (!data || !Array.isArray(data.posts)) return data;
  return {
    ...data,
    posts: data.posts.filter(post => !isFutureScheduledPost(post)),
  };
};

/** IANA zone e.g. Asia/Dhaka — sent with upload for server logs / metadata. */
const getDeviceTimeZone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return '';
  }
};

export const getSocialAccounts = async userId => {
  const response = await axios.get(`${config.apiBaseUrl}/social-accounts`, {
    params: { userId },
    headers: getAuthHeaders(),
  });
  return response.data;
};

/**
 * Get posts with optional filters: userId (own/profile), nearbyLat, nearbyLng, radiusKm, viewerRole
 */
export const getPosts = async (params = {}) => {
  try {
    const response = await axios.get(API_URL, {
      params,
      headers: getAuthHeaders(),
    });
    return filterPublicScheduledPosts(response.data);
  } catch (error) {
    console.error('Error fetching posts:', error);
    throw error;
  }
};

/**
 * Get posts by nearby location (same as Video: by creator's User location).
 * Query: latitude, longitude, radiusKm (optional), page, limit.
 */
export const getNearbyPosts = async (latitude, longitude, params = {}) => {
  try {
    const { radiusKm = 50, page = 1, limit = 20, viewerRole } = params;
    const response = await axios.get(`${API_URL}/nearby`, {
      params: { latitude, longitude, radiusKm, page, limit, viewerRole },
      headers: getAuthHeaders(),
    });
    return filterPublicScheduledPosts(response.data);
  } catch (error) {
    console.error('Error fetching nearby posts:', error);
    throw error;
  }
};

/**
 * Get posts by user ID (for profile / own posts)
 */
export const getPostsByUser = async (
  userId,
  page = 1,
  limit = 20,
  viewerUserId,
) => {
  try {
    const params = { page, limit };
    if (viewerUserId) params.viewerUserId = viewerUserId;
    const response = await axios.get(`${API_URL}/user/${userId}`, {
      params,
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user posts:', error);
    throw error;
  }
};

/**
 * Get single post by ID
 */
export const getPostById = async (postId, userId) => {
  try {
    const response = await axios.get(`${API_URL}/${postId}`, {
      params: userId ? { userId } : {},
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching post:', error);
    throw error;
  }
};

/**
 * Create post (title required; optional: description, mediaUrl, thumbnailUrl, mediaType, duration, website, hashtags)
 */
export const createPost = async (data) => {
  if (!data?.userId) {
    throw new Error('User ID is required. Please log in to create a post.');
  }
  try {
    const response = await axios.post(API_URL, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    // Facebook schedule is handled in POST /posts on the server when publishedAt is set.
    return response.data;
  } catch (error) {
    const msg =
      error.response?.data?.message ||
      (Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(' ')
        : null) ||
      error.message ||
      'Failed to create post';
    console.error('Error creating post:', error.response?.status, msg);
    throw new Error(msg);
  }
};

/**
 * Upload post with thumbnail (required) and optional video.
 * Same approach as profile/gallery: fetch + FormData so React Native sends file URIs correctly.
 */
export const uploadPost = async (data) => {
  if (!data?.userId) {
    throw new Error('User ID is required. Please log in to create a post.');
  }
  if (!data?.title?.trim()) {
    throw new Error('Title is required.');
  }
  const prepared = await ensureVideoThumbnailFields(data);
  if (!prepared?.thumbnailUri && !prepared?.videoUri) {
    throw new Error('Add a video or cover image for this post.');
  }
  if (!prepared?.thumbnailUri) {
    throw new Error(
      'Could not create a preview from this video. Pick a cover image or try another clip.',
    );
  }
  const formData = new FormData();
  formData.append('files', {
    uri: prepared.thumbnailUri,
    type: prepared.thumbnailType || 'image/jpeg',
    name: prepared.thumbnailName || 'thumbnail.jpg',
  });
  if (prepared.videoUri) {
    formData.append('files', {
      uri: prepared.videoUri,
      type: prepared.videoType || 'video/mp4',
      name: prepared.videoName || 'video.mp4',
    });
  }
  formData.append('userId', prepared.userId);
  formData.append('title', prepared.title.trim());
  if (prepared.description?.trim()) {
    formData.append('description', prepared.description.trim());
  }
  if (prepared.website?.trim()) {
    formData.append('website', prepared.website.trim());
  }
  if (prepared.hashtags?.length) {
    formData.append(
      'hashtags',
      Array.isArray(prepared.hashtags)
        ? JSON.stringify(prepared.hashtags)
        : String(prepared.hashtags),
    );
  }
  if (
    prepared.duration !== undefined &&
    prepared.duration != null &&
    !Number.isNaN(Number(prepared.duration))
  ) {
    formData.append('duration', String(Math.floor(Number(prepared.duration))));
  }
  if (prepared.scheduledPublishAt) {
    formData.append('scheduledPublishAt', String(prepared.scheduledPublishAt));
  }
  const plats = Array.isArray(prepared.platforms)
    ? prepared.platforms
    : ['facebook', 'instagram', 'tiktok'];
  formData.append('platforms', JSON.stringify(plats));
  if (prepared.facebookAccountId) {
    formData.append('facebookPageId', String(prepared.facebookAccountId));
  }
  if (prepared.instagramAccountId) {
    formData.append('instagramAccountId', String(prepared.instagramAccountId));
  }
  if (prepared.tiktokAccountId) {
    formData.append('tiktokAccountId', String(prepared.tiktokAccountId));
  }
  if (prepared.youtubeChannelId) {
    formData.append('youtubeChannelId', String(prepared.youtubeChannelId));
  }
  const tz = getDeviceTimeZone();
  if (tz) formData.append('deviceTimeZone', tz);
  const headers = getAuthHeaders();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: { ...headers },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg =
        resData?.message ||
        (Array.isArray(resData?.message) ? resData.message.join(' ') : null) ||
        `Upload failed (${response.status})`;
      console.error('[uploadPost]', response.status, resData);
      throw new Error(msg);
    }
    // Facebook / scheduled-content is created on the server with the post (no second request).
    return resData;
  } catch (err) {
    let msg =
      err.name === 'AbortError'
        ? 'Upload timed out. Try again.'
        : err.message || 'Failed to upload post';
    // RN fetch: no HTTP response — DNS, TLS, offline, firewall, wrong base URL, or server down.
    if (/network request failed|network error|failed to fetch/i.test(String(msg))) {
      const base = String(config.apiBaseUrl || '').replace(/\/$/, '');
      msg = `${msg}. Check Wi‑Fi/data, disable VPN if needed, and that the API is up (${base}).`;
    }
    console.error('[uploadPost]', config.apiBaseUrl, err.message, err);
    throw new Error(msg);
  }
};

/**
 * Update post (owner only)
 */
export const updatePost = async (postId, userId, updateData) => {
  try {
    const response = await axios.patch(`${API_URL}/${postId}`, {
      userId,
      ...updateData,
    }, { headers: getAuthHeaders() });
    return response.data;
  } catch (error) {
    console.error('Error updating post:', error);
    throw error;
  }
};

/**
 * Delete post (owner only)
 */
export const deletePost = async (postId, userId) => {
  try {
    const response = await axios.delete(`${API_URL}/${postId}`, {
      data: { userId },
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting post:', error);
    throw error;
  }
};

/**
 * Like/Unlike post
 */
export const togglePostLike = async (postId, userId) => {
  try {
    const response = await axios.post(
      `${API_URL}/like`,
      { postId, userId },
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error) {
    console.error('Error toggling post like:', error);
    throw error;
  }
};

/**
 * Dislike/Undislike post
 */
export const togglePostDislike = async (postId, userId) => {
  try {
    const response = await axios.post(
      `${API_URL}/dislike`,
      { postId, userId },
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error) {
    console.error('Error toggling post dislike:', error);
    throw error;
  }
};

/**
 * Record post share (increments shareCount)
 */
export const recordPostShare = async (postId) => {
  try {
    const response = await axios.post(
      `${API_URL}/share`,
      { postId },
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error) {
    // Non-critical
  }
};

/**
 * Add comment to post
 */
export const addPostComment = async (postId, userId, content, parentId = null) => {
  try {
    const response = await axios.post(
      `${API_URL}/comment`,
      { postId, userId, content, parentId },
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error) {
    console.error('Error adding post comment:', error);
    throw error;
  }
};

/**
 * Get comments for post
 */
export const getPostComments = async (postId, page = 1, limit = 20, userId) => {
  try {
    const response = await axios.get(`${API_URL}/${postId}/comments`, {
      params: { page, limit, userId },
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching post comments:', error);
    throw error;
  }
};

/**
 * Like/Unlike post comment
 */
export const togglePostCommentLike = async (commentId, userId) => {
  try {
    const response = await axios.post(
      `${API_URL}/comment/like`,
      { commentId, userId },
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error) {
    console.error('Error toggling post comment like:', error);
    throw error;
  }
};

/**
 * Dislike/Undislike post comment
 */
export const togglePostCommentDislike = async (commentId, userId) => {
  try {
    const response = await axios.post(
      `${API_URL}/comment/dislike`,
      { commentId, userId },
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error) {
    console.error('Error toggling post comment dislike:', error);
    throw error;
  }
};

/**
 * Delete own post comment
 */
export const deletePostComment = async (commentId, userId) => {
  try {
    const response = await axios.post(
      `${API_URL}/comment/delete`,
      { commentId, userId },
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error) {
    console.error('Error deleting post comment:', error);
    throw error;
  }
};
