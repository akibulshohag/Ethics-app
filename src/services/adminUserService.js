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

export const getUsers = async (params = {}) => {
  const response = await axios.get(API_URL, {
    params: { page: 1, perPage: 100, ...params },
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const updateUser = async (id, data) => {
  const response = await axios.patch(`${API_URL}/${id}`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const deleteUser = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/** Create user (register) - no auth required */
export const createUser = async (data) => {
  const response = await axios.post(`${API_URL}/register`, data, {
    headers: { 'Content-Type': 'application/json' },
  });
  return response.data;
};
