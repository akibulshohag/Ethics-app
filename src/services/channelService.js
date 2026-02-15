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
 * Get channel profile with stats (video count, short count, total views)
 */
export const getChannelProfile = async userId => {
  try {
    const response = await axios.get(
      `${API_URL}/${userId}/channel-profile`,
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error) {
    console.error('Error fetching channel profile:', error);
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
