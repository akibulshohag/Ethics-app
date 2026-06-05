import axios from 'axios';
import { config } from '../../config';
import { ensureVideoThumbnailFields } from '../utils/videoThumbnail';

const API_URL = `${config.apiBaseUrl}/videos`;

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

const isFutureScheduledMedia = item => {
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

const filterPublicScheduledVideos = data => {
  if (!data || !Array.isArray(data.videos)) return data;
  return {
    ...data,
    videos: data.videos.filter(video => !isFutureScheduledMedia(video)),
  };
};

const filterUserVideosForViewer = (data, userId, viewerUserId) => {
  if (!data || !Array.isArray(data.videos)) return data;
  const viewerIsOwner =
    viewerUserId != null &&
    userId != null &&
    String(viewerUserId) === String(userId);
  if (viewerIsOwner) return data;
  return {
    ...data,
    videos: data.videos.filter(video => !isFutureScheduledMedia(video)),
  };
};

/**
 * Upload video with thumbnail - same approach as profile/gallery (fetch + FormData, no Content-Type).
 * React Native sends file URIs correctly this way.
 */
export const uploadVideo = async videoData => {
  if (!videoData?.userId) {
    throw new Error('User ID is required. Please log in to upload videos.');
  }
  if (!videoData?.videoUri) {
    throw new Error('Video is required.');
  }
  const prepared = await ensureVideoThumbnailFields(videoData);
  if (!prepared?.thumbnailUri) {
    throw new Error(
      'Could not create a preview image from this video. Pick a cover image or try another clip.',
    );
  }
  const formData = new FormData();
  formData.append('files', {
    uri: prepared.videoUri,
    type: prepared.videoType || 'video/mp4',
    name: prepared.videoName || 'video.mp4',
  });
  formData.append('files', {
    uri: prepared.thumbnailUri,
    type: prepared.thumbnailType || 'image/jpeg',
    name: prepared.thumbnailName || 'thumbnail.jpg',
  });
  formData.append('userId', prepared.userId);
  formData.append('title', prepared.title);
  if (prepared.description) {
    formData.append('description', prepared.description);
  }
  if (prepared.category) {
    formData.append('category', prepared.category);
  }
  if (prepared.tags && prepared.tags.length > 0) {
    formData.append('tags', JSON.stringify(prepared.tags));
  }
  if (prepared.visibility) {
    formData.append('visibility', prepared.visibility);
  }
  if (prepared.duration !== undefined && !isNaN(prepared.duration)) {
    formData.append('duration', String(Math.floor(Number(prepared.duration))));
  }
  if (prepared.width !== undefined && !isNaN(prepared.width) && prepared.width > 0) {
    formData.append('width', String(Math.floor(Number(prepared.width))));
  }
  if (prepared.height !== undefined && !isNaN(prepared.height) && prepared.height > 0) {
    formData.append('height', String(Math.floor(Number(prepared.height))));
  }
  if (prepared.scheduledPublishAt) {
    formData.append('scheduledPublishAt', String(prepared.scheduledPublishAt));
  }
  if (prepared.customPlaylistId) {
    formData.append('customPlaylistId', String(prepared.customPlaylistId));
  }

  const headers = getAuthHeaders();
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 min for video
    const response = await fetch(`${API_URL}/upload`, {
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
      console.error('[uploadVideo]', response.status, data);
      throw new Error(msg);
    }
    return data;
  } catch (err) {
    const msg =
      err.name === 'AbortError'
        ? 'Upload timed out. Try again.'
        : err.message || 'Network error. Check connection and try again.';
    console.error('[uploadVideo]', err.message, err);
    throw new Error(msg);
  }
};

/**
 * Get all videos with filters
 */
export const getVideos = async (params = {}) => {
  try {
    const response = await axios.get(API_URL, { params });
    return filterPublicScheduledVideos(response.data);
  } catch (error) {
    console.error('Error fetching videos:', error);
    throw error;
  }
};

/**
 * Get video by ID
 * viewerRole: when "user", vendor-uploaded videos return 404
 */
export const getVideoById = async (videoId, userId, viewerRole) => {
  try {
    const response = await axios.get(`${API_URL}/${videoId}`, {
      params: { userId, viewerRole },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching video:', error);
    throw error;
  }
};

/**
 * Update video details
 */
export const updateVideo = async (videoId, userId, updateData) => {
  try {
    const response = await axios.patch(`${API_URL}/${videoId}`, {
      userId,
      ...updateData,
    });
    return response.data;
  } catch (error) {
    console.error('Error updating video:', error);
    throw error;
  }
};

/**
 * Delete video
 */
export const deleteVideo = async (videoId, userId) => {
  try {
    const response = await axios.delete(`${API_URL}/${videoId}`, {
      data: { userId },
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting video:', error);
    throw error;
  }
};

/**
 * Like/Unlike video
 */
export const toggleLike = async (videoId, userId) => {
  try {
    const response = await axios.post(`${API_URL}/like`, {
      videoId,
      userId,
    });
    return response.data;
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
};

/**
 * Dislike/Undislike video
 */
export const toggleDislike = async (videoId, userId) => {
  try {
    const response = await axios.post(`${API_URL}/dislike`, {
      videoId,
      userId,
    });
    return response.data;
  } catch (error) {
    console.error('Error toggling dislike:', error);
    throw error;
  }
};

/**
 * Record video share (increments shareCount)
 */
export const recordShare = async videoId => {
  try {
    const response = await axios.post(`${API_URL}/share`, { videoId });
    return response.data;
  } catch (error) {
    // Non-critical: don't throw
  }
};

/**
 * Add comment to video
 */
export const addComment = async (videoId, userId, content, parentId = null) => {
  try {
    const response = await axios.post(`${API_URL}/comment`, {
      videoId,
      userId,
      content,
      parentId,
    });
    return response.data;
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

/**
 * Get comments for video
 */
export const getComments = async (videoId, page = 1, limit = 20, userId) => {
  try {
    const response = await axios.get(`${API_URL}/${videoId}/comments`, {
      params: { page, limit, userId },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
};

/**
 * Like/Unlike comment
 */
export const toggleCommentLike = async (commentId, userId) => {
  try {
    const response = await axios.post(`${API_URL}/comment/like`, {
      commentId,
      userId,
    });
    return response.data;
  } catch (error) {
    console.error('Error toggling comment like:', error);
    throw error;
  }
};

/**
 * Delete own comment or reply
 */
export const deleteComment = async (commentId, userId) => {
  try {
    const response = await axios.post(`${API_URL}/comment/delete`, {
      commentId,
      userId,
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
};

/**
 * Dislike/Undislike comment
 */
export const toggleCommentDislike = async (commentId, userId) => {
  try {
    const response = await axios.post(`${API_URL}/comment/dislike`, {
      commentId,
      userId,
    });
    return response.data;
  } catch (error) {
    console.error('Error toggling comment dislike:', error);
    throw error;
  }
};

/**
 * Record video view
 * Silently ignores errors - view tracking is non-critical for UX
 */
export const recordView = async (
  videoId,
  userId,
  watchTime = 0,
  completed = false,
) => {
  try {
    const body = {
      videoId,
      watchTime: Number(watchTime) || 0,
      completed: Boolean(completed),
    };
    if (userId) body.userId = userId;
    const response = await axios.post(`${API_URL}/view`, body);
    return response.data;
  } catch (error) {
    // Non-critical: don't throw or log to avoid disrupting video playback
  }
};

/**
 * Get user's uploaded videos
 */
export const getUserVideos = async (userId, page = 1, limit = 20, viewerUserId) => {
  try {
    const response = await axios.get(`${API_URL}/user/${userId}`, {
      params: { page, limit },
      headers: { ...getAuthHeaders() },
    });
    return filterUserVideosForViewer(response.data, userId, viewerUserId);
  } catch (error) {
    console.error('Error fetching user videos:', error);
    throw error;
  }
};

/**
 * Get user's liked videos
 */
export const getLikedVideos = async (userId, page = 1, limit = 50) => {
  try {
    const response = await axios.get(`${API_URL}/liked`, {
      params: { userId, page, limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching liked videos:', error);
    throw error;
  }
};

/**
 * Get user's video watch history
 */
export const getVideoWatchHistory = async (userId, page = 1, limit = 50) => {
  try {
    const response = await axios.get(`${API_URL}/history`, {
      params: { userId, page, limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching video watch history:', error);
    throw error;
  }
};

/**
 * Get all videos (public videos, no userId filter)
 */
export const getAllVideos = async (params = {}) => {
  try {
    const { page = 1, limit = 20, category, search } = params;
    const response = await axios.get(API_URL, {
      params: {
        page,
        limit,
        ...(category && { category }),
        ...(search && { search }),
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching all videos:', error);
    throw error;
  }
};
