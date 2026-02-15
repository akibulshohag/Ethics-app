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
 * Update channel profile (nickname, channelAbout) - only for own channel
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
