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

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsRead = async userId => {
  try {
    const response = await axios.patch(
      `${API_URL}/recipient/${userId}/read-all`,
      {},
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error) {
    console.error('Error marking all notifications read:', error);
    throw error;
  }
};

/**
 * Get unread notification count for a user
 */
export const getUnreadNotificationCount = async userId => {
  try {
    const response = await axios.get(
      `${API_URL}/recipient/${userId}/unread-count`,
      { headers: getAuthHeaders() },
    );
    return response.data?.count ?? 0;
  } catch (error) {
    console.error('Error fetching unread count:', error);
    return 0;
  }
};
