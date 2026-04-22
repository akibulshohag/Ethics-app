import axios from 'axios';
import { DeviceEventEmitter } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { config } from '../../config';
import { isLocalMediaUri } from '../utils/helper';

// Shorts API: POST /v1/shorts/upload (not /videos - this is for shorts)
const API_URL = `${config.apiBaseUrl}/shorts`;
const SHORT_UPDATED_EVENT = 'shorts:updated';
const UPLOAD_TIMEOUT_MS = 1_800_000;
const UPLOAD_MAX_RETRIES = 2;

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

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const parseUploadFormDataParts = formData => {
  const out = { fields: {}, video: null, thumbnail: null };
  const parts = Array.isArray(formData?._parts) ? formData._parts : [];
  for (const part of parts) {
    const key = part?.[0];
    const value = part?.[1];
    if (!key) continue;
    if (key === 'files' && value && typeof value === 'object' && typeof value.uri === 'string') {
      const type = String(value.type || '').toLowerCase();
      if (type.startsWith('video/')) out.video = value;
      else if (type.startsWith('image/')) out.thumbnail = value;
      else if (!out.video) out.video = value;
      continue;
    }
    out.fields[key] = value;
  }
  return out;
};

const directPutUpload = async ({ putUrl, file }) => {
  const uri = normalizeUploadUri(file?.uri);
  if (!uri) throw new Error('Missing file uri for upload');
  const type = String(file?.type || 'application/octet-stream');
  let wrapTarget = uri;
  // Some Android pickers return content:// URIs. Resolve to a real file path when possible.
  if (uri.startsWith('content://')) {
    try {
      const st = await ReactNativeBlobUtil.fs.stat(uri);
      if (st?.path) wrapTarget = st.path;
      else if (st?.originalFilepath) wrapTarget = st.originalFilepath;
    } catch {}
  }
  if (wrapTarget.startsWith('file://')) wrapTarget = wrapTarget.replace('file://', '');
  const res = await ReactNativeBlobUtil.fetch(
    'PUT',
    putUrl,
    { 'Content-Type': type },
    ReactNativeBlobUtil.wrap(wrapTarget),
  );
  const status = res?.info?.().status;
  if (status >= 200 && status < 300) return true;
  throw new Error(`Direct upload failed (${status || 'unknown'})`);
};

const normalizeUploadUri = uri => {
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
  // RN multipart expects a URI scheme; plain device paths fail with "Network request failed".
  return `file://${raw}`;
};

const isRetryableUploadError = err => {
  const msg = String(err?.message || '').toLowerCase();
  if (err?.name === 'AbortError') return true;
  return /network request failed|network error|failed to fetch|timeout|timed out|econnaborted/.test(msg);
};

export const shortsService = {
  /**
   * Upload short video with thumbnail and metadata.
   * formData must include userId (logged-in user ID).
   */
  async uploadShort(formData, userId) {
    if (!userId) {
      throw new Error('User ID is required. Please log in to upload shorts.');
    }

    // Prefer direct-to-R2 upload when backend supports it (bypasses Cloudflare upload limits).
    let directAttempted = false;
    try {
      const { fields, video, thumbnail } = parseUploadFormDataParts(formData);
      if (video?.uri && isLocalMediaUri(video.uri)) {
        directAttempted = true;
        const presignRes = await fetch(`${API_URL}/upload-url`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            userId: String(userId),
            videoName: String(video?.name || 'short.mp4'),
            videoType: String(video?.type || 'video/mp4'),
            ...(thumbnail?.uri
              ? {
                  thumbnailName: String(thumbnail?.name || 'thumb.jpg'),
                  thumbnailType: String(thumbnail?.type || 'image/jpeg'),
                }
              : {}),
          }),
        });
        if (!presignRes.ok) {
          const errData = await presignRes.json().catch(() => ({}));
          const msg =
            errData?.message ||
            (Array.isArray(errData?.message) ? errData.message.join('\n') : null) ||
            `upload-url failed (${presignRes.status})`;
          throw new Error(msg);
        }
        const presign = await presignRes.json().catch(() => null);
        if (!presign?.video?.putUrl || !presign?.video?.key) {
          throw new Error('upload-url response is missing video putUrl/key');
        }
        await directPutUpload({ putUrl: presign.video.putUrl, file: video });
        if (thumbnail?.uri && presign?.thumbnail?.putUrl && presign?.thumbnail?.key) {
          await directPutUpload({ putUrl: presign.thumbnail.putUrl, file: thumbnail });
        }
        const completeRes = await fetch(`${API_URL}/complete-upload`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({
            ...fields,
            userId: String(userId),
            videoKey: String(presign.video.key),
            thumbnailKey: presign?.thumbnail?.key ? String(presign.thumbnail.key) : undefined,
            videoMimeType: String(video?.type || 'video/mp4'),
          }),
        });
        const completeData = await completeRes.json().catch(() => ({}));
        if (!completeRes.ok) {
          const msg =
            completeData?.message ||
            (Array.isArray(completeData?.message) ? completeData.message.join('\n') : null) ||
            `complete-upload failed (${completeRes.status})`;
          const error = new Error(msg);
          error.response = { status: completeRes.status, data: completeData };
          throw error;
        }
        return completeData;
      }
    } catch (e) {
      const m = String(e?.message || '');
      // If direct flow exists but fails, surface the real reason (don't hide under generic fallback).
      if (directAttempted && !/upload-url failed \(404\)|upload-url failed \(405\)/i.test(m)) {
        throw new Error(`Direct upload failed: ${m}`);
      }
      // Fallback to legacy multipart upload below only when presign endpoint isn't available.
    }

    // RN FormData isn't a real iterable; normalize via internal _parts when present.
    // If _parts is not present, fall back to sending original FormData unchanged.
    let bodyFormData = formData;
    if (formData && Array.isArray(formData._parts)) {
      const normalized = new FormData();
      for (const part of formData._parts) {
        const key = part?.[0];
        const value = part?.[1];
        if (!key) continue;
        if (value && typeof value === 'object' && typeof value.uri === 'string') {
          normalized.append(key, { ...value, uri: normalizeUploadUri(value.uri) });
        } else {
          normalized.append(key, value);
        }
      }
      bodyFormData = normalized;
    }

    for (let attempt = 0; attempt <= UPLOAD_MAX_RETRIES; attempt += 1) {
      let timeoutId;
      try {
        const controller = new AbortController();
        // Long videos + FFmpeg processing can take many minutes.
        timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
        const response = await fetch(`${API_URL}/upload`, {
          method: 'POST',
          headers: {
            ...getAuthHeaders(),
            // Do not set Content-Type manually for FormData; RN adds boundary.
          },
          body: bodyFormData,
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          const msg = Array.isArray(data?.message)
            ? data.message.join('\n')
            : data?.message ||
              data?.error ||
              `Upload failed (${response.status})`;
          const error = new Error(msg);
          error.response = { status: response.status, data };
          throw error;
        }
        return data;
      } catch (err) {
        const isAbort = err?.name === 'AbortError';
        const msg = String(err?.message || '');
        if (attempt < UPLOAD_MAX_RETRIES && isRetryableUploadError(err)) {
          await sleep(1000 * (attempt + 1));
          continue;
        }
        if (isAbort) {
          throw new Error(
            'Upload timed out. Long videos need more time—use Wi‑Fi and try again.',
          );
        }
        if (/network request failed|network error|failed to fetch/i.test(msg)) {
          throw new Error(
            'Network error—check your connection and make sure the API is reachable. If your API is behind Cloudflare, uploads over ~100MB or ~100s may be terminated.',
          );
        }
        throw err;
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }
    }
    throw new Error('Upload failed');
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
        uri: normalizeUploadUri(videoUri),
        type: videoType || 'video/mp4',
        name: videoName || 'short.mp4',
      });
      n += 1;
    }
    if (thumbnailUri && isLocalMediaUri(thumbnailUri)) {
      formData.append('files', {
        uri: normalizeUploadUri(thumbnailUri),
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
