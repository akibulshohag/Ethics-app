import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/menu`;

/**
 * Get menu items and categories for a user (e.g. video owner). Public, no auth.
 * Returns { menu: [...], categories: [{ id, name, sortOrder, itemCount? }, ...] }
 */
export const getMenuByUserId = async (userId) => {
  if (!userId) return { menu: [], categories: [] };
  try {
    const res = await fetch(`${API_URL}/by-user/${userId}`);
    const data = await res.json();
    return {
      menu: data.menu || [],
      categories: data.categories || [],
    };
  } catch (e) {
    return { menu: [], categories: [] };
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
 * Upload CSV file and bulk-create menu items/categories. Requires auth.
 */
export const uploadMenuCsv = async (token, formData) => {
  const res = await fetch(`${API_URL}/upload-csv`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to import CSV');
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

/**
 * Delete uploaded menu file (PDF/image). Requires auth.
 */
export const deleteMenuFile = async (token, id) => {
  const res = await fetch(`${API_URL}/files/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    let message = 'Failed to delete menu file';
    try {
      const err = await res.json();
      message = err?.message || message;
    } catch (_) {}
    throw new Error(message);
  }
  return res.json();
};

/**
 * List menu categories. Owner: own. Admin: ?userId=. Requires auth.
 * Returns { categories: [{ id, name, sortOrder, itemCount }, ...] }
 */
export const getMenuCategories = async (token, userId = null) => {
  const url = userId ? `${API_URL}/categories?userId=${userId}` : `${API_URL}/categories`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load menu categories');
  return res.json();
};

/**
 * Create menu category. Owner: own. Admin: ?userId=. Requires auth.
 */
export const createMenuCategory = async (token, body, userId = null) => {
  const url = userId ? `${API_URL}/categories?userId=${userId}` : `${API_URL}/categories`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to create category');
  }
  return res.json();
};

/**
 * Update menu category. Requires auth.
 */
export const updateMenuCategory = async (token, id, body) => {
  const res = await fetch(`${API_URL}/categories/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to update category');
  }
  return res.json();
};

/**
 * Delete menu category. Items in that category become uncategorized. Requires auth.
 */
export const deleteMenuCategory = async (token, id) => {
  const res = await fetch(`${API_URL}/categories/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to delete category');
  }
  return res.json();
};
