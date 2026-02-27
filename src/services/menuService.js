import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/menu`;

/**
 * Get menu items for a user (e.g. video owner). Public, no auth.
 * Returns { menu: [{ id, userId, itemName, price, imageUrl, sortOrder }, ...] }
 */
export const getMenuByUserId = async (userId) => {
  if (!userId) return { menu: [] };
  try {
    const res = await fetch(`${API_URL}/by-user/${userId}`);
    const data = await res.json();
    return { menu: data.menu || [] };
  } catch (e) {
    return { menu: [] };
  }
};

/**
 * List menu items. Owner: own. Admin: ?userId= for any user. Requires auth.
 */
export const getMenuItems = async (token, userId = null) => {
  const url = userId ? `${API_URL}/items?userId=${userId}` : `${API_URL}/items`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load menu');
  return res.json();
};

/**
 * Add menu item. Owner: own. Admin: body can include userId. Requires auth.
 */
export const createMenuItem = async (token, body) => {
  const res = await fetch(`${API_URL}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to add menu item');
  }
  return res.json();
};

/**
 * Update menu item. Requires auth.
 */
export const updateMenuItem = async (token, id, body) => {
  const res = await fetch(`${API_URL}/items/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Failed to update');
  return res.json();
};

/**
 * Delete menu item. Requires auth.
 */
export const deleteMenuItem = async (token, id) => {
  const res = await fetch(`${API_URL}/items/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to delete');
  return res.json();
};

/**
 * Upload menu item image (file). Returns { imageUrl }. Requires auth.
 */
export const uploadMenuItemImage = async (token, formData) => {
  const res = await fetch(`${API_URL}/upload-image`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to upload image');
  }
  return res.json();
};

/**
 * Upload menu file (PDF or image). First step. Returns { fileUrl, fileType, id }. Requires auth.
 */
export const uploadMenuFile = async (token, formData) => {
  const res = await fetch(`${API_URL}/upload-file`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to upload file');
  }
  return res.json();
};

/**
 * List menu files (owner's PDF/image uploads). Requires auth.
 */
export const getMenuFiles = async (token, userId = null) => {
  const url = userId ? `${API_URL}/files?userId=${userId}` : `${API_URL}/files`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load menu files');
  return res.json();
};
