import axios from 'axios';
import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/playlists`;

const getAuthHeaders = () => {
  try {
    const { store } = require('../redux');
    const token = store.getState()?.app?.user?.token;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch (_) {}
  return {};
};

/**
 * Get playlist status for a video or short
 */
export const getPlaylistStatus = async (userId, contentType, contentId) => {
  try {
    const response = await axios.get(API_URL + '/status', {
      params: { userId, contentType, contentId },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching playlist status:', error);
    return { inWatchLater: false, inFavorites: false };
  }
};

/**
 * Add or remove from playlist
 */
export const setPlaylist = async (userId, playlistType, contentType, contentId, add) => {
  try {
    const response = await axios.post(API_URL + '/set', {
      userId,
      playlistType,
      contentType,
      contentId,
      add,
    });
    return response.data;
  } catch (error) {
    console.error('Error setting playlist:', error);
    throw error;
  }
};

/**
 * Get watch later list (videos + shorts)
 */
export const getWatchLater = async (userId, page = 1, limit = 50) => {
  try {
    const response = await axios.get(API_URL + '/watch-later', {
      params: { userId, page, limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching watch later:', error);
    return { items: [], videos: [], shorts: [] };
  }
};

/**
 * Get favorites list (videos + shorts)
 */
export const getFavorites = async (userId, page = 1, limit = 50) => {
  try {
    const response = await axios.get(API_URL + '/favorites', {
      params: { userId, page, limit },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return { items: [], videos: [], shorts: [] };
  }
};

/** Save modal: watch later, favorites, custom playlist membership for one content */
export const getSaveMembership = async (contentType, contentId) => {
  try {
    const response = await axios.get(`${API_URL}/save-membership`, {
      params: { contentType, contentId },
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error getSaveMembership:', error);
    return {
      inWatchLater: false,
      inFavorites: false,
      customPlaylistIds: [],
      playlists: [],
    };
  }
};

export const listCustomPlaylists = async (userId) => {
  try {
    const response = await axios.get(`${API_URL}/custom/user/${userId}`, {
      headers: getAuthHeaders(),
    });
    return response.data?.playlists || [];
  } catch (error) {
    console.error('Error listCustomPlaylists:', error);
    return [];
  }
};

export const createCustomPlaylist = async (name) => {
  const response = await axios.post(
    `${API_URL}/custom`,
    { name },
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const deleteCustomPlaylist = async (playlistId) => {
  await axios.delete(`${API_URL}/custom/${playlistId}`, {
    headers: getAuthHeaders(),
  });
};

export const renameCustomPlaylist = async (playlistId, name) => {
  await axios.patch(
    `${API_URL}/custom/${playlistId}`,
    { name },
    { headers: getAuthHeaders() },
  );
};

export const setCustomPlaylistItem = async (
  playlistId,
  contentType,
  contentId,
  add,
) => {
  await axios.post(
    `${API_URL}/custom/${playlistId}/item`,
    { contentType, contentId, add },
    { headers: getAuthHeaders() },
  );
};

export const getCustomPlaylistItems = async (playlistId, page = 1, limit = 50) => {
  const id = encodeURIComponent(String(playlistId || '').trim());
  if (!id || id === 'undefined' || id === 'null') {
    throw new Error('Invalid playlist');
  }
  const response = await axios.get(`${API_URL}/custom/${id}/items`, {
    params: { page, limit },
    headers: getAuthHeaders(),
  });
  const body = response.data;
  const items = Array.isArray(body?.items) ? body.items : [];
  return {
    ...body,
    items,
    playlist: body?.playlist,
    pagination: body?.pagination,
  };
};
