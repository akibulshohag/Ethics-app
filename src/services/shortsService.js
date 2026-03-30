import axios from 'axios';
import { DeviceEventEmitter } from 'react-native';
import { config } from '../../config';
import { isLocalMediaUri } from '../utils/helper';

// Shorts API: POST /v1/shorts/upload (not /videos - this is for shorts)
const API_URL = `${config.apiBaseUrl}/shorts`;
const SHORT_UPDATED_EVENT = 'shorts:updated';

const toUpdatedShortPayload = payload => {
  if (!payload) return null;
  if (payload.short && typeof payload.short === 'object') return payload.short;
  if (payload.data && typeof payload.data === 'object') return payload.data;
  if (typeof payload === 'object') return payload;
  return null;
};

const getAuthHeaders = () => {
  try {
    const {store} = require('../redux');
    const token = store.getState()?.app?.user?.token;
    if (token) {
      return {Authorization: `Bearer ${token}`};
    }
  } catch {}
  return {};
};

const shouldFallbackViewerParam = (error, params) =>
  !!(
    params &&
    params.viewerUserId &&
    error?.response?.status === 400
  );

export const shortsService = {
  /**
   * Upload short video with thumbnail and metadata.
   * formData must include userId (logged-in user ID).
   */
  async uploadShort(formData, userId) {
    if (!userId) {
      throw new Error('User ID is required. Please log in to upload shorts.');
    }
    const response = await axios.post(`${API_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000,
      onUploadProgress: (e) => {
        if (formData.onUploadProgress) {
          const pct = Math.round((e.loaded * 100) / (e.total || 1));
          formData.onUploadProgress(pct);
        }
      },
    });
    return response.data;
  },

  /**
   * Create live short (for Agora live streaming)
   */
  async createLiveShort(userId, channelName) {
    const response = await axios.post(`${API_URL}/live`, {
      userId,
      channelName,
    }, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Get all shorts with filters
   */
  async getShorts(params = {}) {
    try {
      const response = await axios.get(API_URL, {
        params,
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      if (!shouldFallbackViewerParam(error, params)) throw error;
      const fallbackParams = { ...params };
      delete fallbackParams.viewerUserId;
      const retry = await axios.get(API_URL, {
        params: fallbackParams,
        headers: getAuthHeaders(),
      });
      return retry.data;
    }
  },

  /**
   * Get short by ID
   * viewerRole: when "user", vendor-uploaded shorts return 404
   */
  async getShortById(shortId, userId, viewerRole) {
    const response = await axios.get(`${API_URL}/${shortId}`, {
      params: { userId, viewerRole },
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Update short
   */
  async updateShort(shortId, userId, data) {
    const response = await axios.patch(`${API_URL}/${shortId}`, {
      userId,
      ...data,
    }, {
      headers: getAuthHeaders(),
    });
    const updated = toUpdatedShortPayload(response.data);
    if (updated?.id || shortId) {
      DeviceEventEmitter.emit(SHORT_UPDATED_EVENT, {
        ...(updated || {}),
        id: String(updated?.id || shortId),
      });
    }
    return response.data;
  },

  /**
   * Upload new video and/or thumbnail for an existing short (multipart → R2).
   * Pass local file URIs only; omit a field if that asset was not changed.
   */
  async replaceShortMedia(shortId, userId, payload = {}) {
    if (!userId) {
      throw new Error('User ID is required');
    }
    const {
      videoUri,
      videoType,
      videoName,
      thumbnailUri,
      thumbnailType,
      thumbnailName,
    } = payload;
    const formData = new FormData();
    formData.append('userId', userId);
    let n = 0;
    if (videoUri && isLocalMediaUri(videoUri)) {
      formData.append('files', {
        uri: videoUri,
        type: videoType || 'video/mp4',
        name: videoName || 'short.mp4',
      });
      n += 1;
    }
    if (thumbnailUri && isLocalMediaUri(thumbnailUri)) {
      formData.append('files', {
        uri: thumbnailUri,
        type: thumbnailType || 'image/jpeg',
        name: thumbnailName || 'thumb.jpg',
      });
      n += 1;
    }
    if (n === 0) {
      throw new Error('No local video or thumbnail to upload');
    }
    const response = await axios.post(`${API_URL}/${shortId}/media`, formData, {
      headers: {
        ...getAuthHeaders(),
        'Content-Type': 'multipart/form-data',
      },
      timeout: 120000,
    });
    const updated = toUpdatedShortPayload(response.data);
    if (updated?.id || shortId) {
      DeviceEventEmitter.emit(SHORT_UPDATED_EVENT, {
        ...(updated || {}),
        id: String(updated?.id || shortId),
      });
    }
    return response.data;
  },

  onShortUpdated(callback) {
    if (typeof callback !== 'function') {
      return { remove: () => {} };
    }
    return DeviceEventEmitter.addListener(SHORT_UPDATED_EVENT, callback);
  },

  /**
   * Delete short
   */
  async deleteShort(shortId, userId) {
    const response = await axios.delete(`${API_URL}/${shortId}`, {
      data: {userId},
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Like/Unlike short
   */
  async toggleLike(shortId, userId) {
    const response = await axios.post(`${API_URL}/like`, {
      shortId,
      userId,
    }, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Dislike/Undislike short
   */
  async toggleDislike(shortId, userId) {
    const response = await axios.post(`${API_URL}/dislike`, {
      shortId,
      userId,
    }, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Add comment
   */
  async addComment(shortId, userId, content, parentId = null) {
    const response = await axios.post(`${API_URL}/comment`, {
      shortId,
      userId,
      content,
      parentId,
    }, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Get comments for short
   */
  async getComments(shortId, page = 1, limit = 20, userId) {
    const params = { page, limit };
    if (userId) params.userId = userId;
    const response = await axios.get(`${API_URL}/${shortId}/comments`, {
      params,
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Toggle comment like
   */
  async toggleCommentLike(commentId, userId) {
    const response = await axios.post(`${API_URL}/comment/like`, {
      commentId,
      userId,
    }, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Toggle comment dislike
   */
  async toggleCommentDislike(commentId, userId) {
    const response = await axios.post(`${API_URL}/comment/dislike`, {
      commentId,
      userId,
    }, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Record view
   */
  async recordView(shortId, userId, watchTime = 0, completed = false) {
    const response = await axios.post(`${API_URL}/view`, {
      shortId,
      userId,
      watchTime,
      completed,
    }, {
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Get user liked shorts
   */
  async getLikedShorts(userId, page = 1, limit = 50) {
    const response = await axios.get(`${API_URL}/liked`, {
      params: { userId, page, limit },
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Get user shorts watch history
   */
  async getWatchHistory(userId, page = 1, limit = 50) {
    const response = await axios.get(`${API_URL}/history`, {
      params: { userId, page, limit },
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Get user shorts
   */
  async getUserShorts(userId, page = 1, limit = 20, viewerUserId) {
    const params = {page, limit, viewerUserId};
    try {
      const response = await axios.get(`${API_URL}/user/${userId}`, {
        params,
        headers: getAuthHeaders(),
      });
      return response.data;
    } catch (error) {
      if (!shouldFallbackViewerParam(error, params)) throw error;
      const retry = await axios.get(`${API_URL}/user/${userId}`, {
        params: {page, limit},
        headers: getAuthHeaders(),
      });
      return retry.data;
    }
  },

  /**
   * Get sounds library for shorts
   */
  async getSounds(search, trending = false) {
    const response = await axios.get(`${API_URL}/sounds`, {
      params: {search, trending},
      headers: getAuthHeaders(),
    });
    return response.data;
  },

  /**
   * Get filters library for shorts
   */
  async getFilters(trending = false) {
    const response = await axios.get(`${API_URL}/filters`, {
      params: {trending},
      headers: getAuthHeaders(),
    });
    return response.data;
  },
};
