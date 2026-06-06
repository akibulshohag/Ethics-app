import axios from 'axios';
import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/users`;

const getAuthHeaders = () => {
  try {
    const { store } = require('../redux');
    const token = store.getState()?.app?.user?.token;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch {}
  return {};
};

export const createOwnerRider = async (ownerId, data) => {
  const response = await axios.post(`${API_URL}/${ownerId}/riders`, data, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const listOwnerRiders = async ownerId => {
  const response = await axios.get(`${API_URL}/${ownerId}/riders`, {
    headers: getAuthHeaders(),
  });
  return response.data;
};

export const getOwnerRiderProfile = async (ownerId, riderId) => {
  const response = await axios.get(
    `${API_URL}/${ownerId}/riders/${riderId}`,
    { headers: getAuthHeaders() },
  );
  return response.data;
};

export const uploadOwnerRiderAvatar = async (ownerId, riderId, file) => {
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
  const response = await fetch(
    `${API_URL}/${ownerId}/riders/${riderId}/upload-avatar`,
    {
      method: 'POST',
      headers: { ...headers },
      body: formData,
    },
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const msg =
      data?.message ||
      (Array.isArray(data?.message) ? data.message.join(' ') : null) ||
      `Upload failed (${response.status})`;
    throw new Error(msg);
  }
  return data;
};
