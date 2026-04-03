import axios from 'axios';
import { config } from '../../config';

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
    return response.data;
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
    return response.data;
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
  if (!data?.thumbnailUri) {
    throw new Error('Thumbnail image is required.');
  }
  const formData = new FormData();
  formData.append('files', {
    uri: data.thumbnailUri,
    type: data.thumbnailType || 'image/jpeg',
    name: data.thumbnailName || 'thumbnail.jpg',
  });
  if (data.videoUri) {
    formData.append('files', {
      uri: data.videoUri,
      type: data.videoType || 'video/mp4',
      name: data.videoName || 'video.mp4',
    });
  }
  formData.append('userId', data.userId);
  formData.append('title', data.title.trim());
  if (data.description?.trim()) {
    formData.append('description', data.description.trim());
  }
  if (data.website?.trim()) {
    formData.append('website', data.website.trim());
  }
  if (data.hashtags?.length) {
    formData.append(
      'hashtags',
      Array.isArray(data.hashtags) ? JSON.stringify(data.hashtags) : String(data.hashtags),
    );
  }
  if (data.duration !== undefined && data.duration != null && !Number.isNaN(Number(data.duration))) {
    formData.append('duration', String(Math.floor(Number(data.duration))));
  }
  if (data.scheduledPublishAt) {
    formData.append('scheduledPublishAt', String(data.scheduledPublishAt));
  }
  const plats = Array.isArray(data.platforms) ? data.platforms : ['facebook'];
  formData.append('platforms', JSON.stringify(plats));
  if (data.facebookAccountId) {
    formData.append('facebookPageId', String(data.facebookAccountId));
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
    const msg =
      err.name === 'AbortError'
        ? 'Upload timed out. Try again.'
        : err.message || 'Failed to upload post';
    console.error('[uploadPost]', err.message, err);
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
