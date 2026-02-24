import axios from 'axios';
import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/roles`;

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

/** Public: list roles for signup dropdown (id, name only) */
export const getRolesList = async () => {
  const response = await axios.get(`${API_URL}/list`);
  return response.data;
};

/** Get all roles (paginated, requires auth) */
export const getRoles = async (page = 1, perPage = 100) => {
  const response = await axios.get(API_URL, {
    params: { page, perPage },
    headers: getAuthHeaders(),
  });
  return response.data;
};

/** Create role (requires auth) */
export const createRole = async (data) => {
  const response = await axios.post(API_URL, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/** Update role (requires auth) */
export const updateRole = async (id, data) => {
  const response = await axios.put(`${API_URL}/${id}`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

/** Delete role (requires auth) */
export const deleteRole = async (id) => {
  const response = await axios.delete(`${API_URL}/${id}`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};
