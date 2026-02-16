import axios from 'axios';
import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/playlists`;

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
