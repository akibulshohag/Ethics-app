import axios from 'axios';
import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/notification`;

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
 * Get notifications for the current user (recipient by userId)
 * Used for real-time notification list: likes, comments, orders, etc.
 */
export const getNotificationsByUserId = async userId => {
  try {
    const response = await axios.get(`${API_URL}/recipient/${userId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    if (error?.response?.status === 401) return [];
    throw error;
  }
};

/**
 * Mark a notification as read
 */
export const markNotificationRead = async notificationId => {
  try {
    const response = await axios.patch(
      `${API_URL}/${notificationId}`,
      { status: 'read' },
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error) {
    console.error('Error marking notification read:', error);
    throw error;
  }
};
