import axios from 'axios';
import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/videos`;

/**
 * Upload video with thumbnail
 */
export const uploadVideo = async videoData => {
  if (!videoData?.userId) {
    throw new Error('User ID is required. Please log in to upload videos.');
  }
  try {
    const formData = new FormData();

    // Add video file
    formData.append('files', {
      uri: videoData.videoUri,
      type: videoData.videoType,
      name: videoData.videoName,
    });

    // Add thumbnail file
    formData.append('files', {
      uri: videoData.thumbnailUri,
      type: videoData.thumbnailType,
      name: videoData.thumbnailName,
    });

    // Add video metadata
    formData.append('userId', videoData.userId);
    formData.append('title', videoData.title);
    if (videoData.description) {
      formData.append('description', videoData.description);
    }
    if (videoData.category) {
      formData.append('category', videoData.category);
    }
    if (videoData.tags && videoData.tags.length > 0) {
      formData.append('tags', JSON.stringify(videoData.tags));
    }
    if (videoData.visibility) {
      formData.append('visibility', videoData.visibility);
    }
    // Only append numeric values if they are valid numbers
    if (videoData.duration !== undefined && !isNaN(videoData.duration)) {
      formData.append(
        'duration',
        String(Math.floor(Number(videoData.duration))),
      );
    }
    if (
      videoData.width !== undefined &&
      !isNaN(videoData.width) &&
      videoData.width > 0
    ) {
      formData.append('width', String(Math.floor(Number(videoData.width))));
    }
    if (
      videoData.height !== undefined &&
      !isNaN(videoData.height) &&
      videoData.height > 0
    ) {
      formData.append('height', String(Math.floor(Number(videoData.height))));
    }

    const response = await axios.post(`${API_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: progressEvent => {
        if (videoData.onUploadProgress) {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total,
          );
          videoData.onUploadProgress(percentCompleted);
        }
      },
    });

    return response.data;
  } catch (error) {
    const data = error.response?.data;
    const msg = Array.isArray(data?.message)
      ? data.message.join(' ')
      : data?.message || error.message || 'Failed to upload video';
    console.error('Error uploading video:', error.response?.status, msg, data);
    const err = new Error(msg);
    err.response = error.response;
    throw err;
  }
};

/**
 * Get all videos with filters
 */
export const getVideos = async (params = {}) => {
  try {
    const response = await axios.get(API_URL, { params });
    return response.data;
  } catch (error) {
    console.error('Error fetching videos:', error);
    throw error;
  }
};

/**
 * Get video by ID
 */
export const getVideoById = async (videoId, userId) => {
  try {
    const response = await axios.get(`${API_URL}/${videoId}`, {
      params: { userId },
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
export const getUserVideos = async (userId, page = 1, limit = 20) => {
  try {
    const response = await axios.get(`${API_URL}/user/${userId}`, {
      params: { page, limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user videos:', error);
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
