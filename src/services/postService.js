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
export const getPostsByUser = async (userId, page = 1, limit = 20) => {
  try {
    const response = await axios.get(`${API_URL}/user/${userId}`, {
      params: { page, limit },
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
 * Pass: userId, title, thumbnailUri/thumbnailType/thumbnailName,
 * optional: videoUri/videoType/videoName, description, website, hashtags (array or comma string), duration (seconds), onUploadProgress.
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
  try {
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
    const response = await axios.post(`${API_URL}/upload`, formData, {
      headers: getAuthHeaders(),
      onUploadProgress:
        data.onUploadProgress &&
        (progressEvent => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            data.onUploadProgress(percent);
          }
        }),
    });
    return response.data;
  } catch (error) {
    const msg =
      error.response?.data?.message ||
      (Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(' ')
        : null) ||
      error.message ||
      'Failed to upload post';
    console.error('Error uploading post:', error.response?.status, msg);
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
