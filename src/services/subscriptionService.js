import axios from 'axios';
import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/subscription`;

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

export const getPackages = async () => {
  try {
    const response = await axios.get(`${API_URL}/packages`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching packages:', error);
    throw error;
  }
};

export const getUserSubscription = async userId => {
  try {
    const response = await axios.get(`${API_URL}/user/${userId}`, {
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching user subscription:', error);
    throw error;
  }
};

export const purchasePackage = async (userId, packageId) => {
  try {
    const response = await axios.post(
      `${API_URL}/purchase`,
      { userId, packageId },
      { headers: getAuthHeaders() },
    );
    return response.data;
  } catch (error) {
    console.error('Error purchasing package:', error);
    throw error;
  }
};
