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

/**
 * Update channel profile (nickname, channelAbout, socialLinks, etc.) - only for own channel
 */
export const updateChannelProfile = async (userId, data) => {
  try {
    const response = await axios.patch(`${API_URL}/${userId}`, data, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error updating channel profile:', error);
    throw error;
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
 * Get user gallery photos
 */
export const getGallery = async userId => {
  const response = await axios.get(`${API_URL}/${userId}/gallery`, {
    headers: getAuthHeaders(),
  });
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
