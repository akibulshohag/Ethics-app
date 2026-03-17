import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/restaurant-orders`;

/**
 * Create a restaurant order (customer). Body: { ownerId, items: [{ menuItemId, quantity }], deliveryAddress? }
 */
export const createRestaurantOrder = async (token, body) => {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to place order');
  }
  return res.json();
};

/**
 * List orders. User: my orders. Owner: my restaurant orders. Admin: all. Query: status?, page?, limit?
 */
export const getRestaurantOrders = async (token, params = {}) => {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.page != null) q.set('page', String(params.page));
  if (params.limit != null) q.set('limit', String(params.limit));
  const url = q.toString() ? `${API_URL}?${q}` : API_URL;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load orders');
  return res.json();
};

/**
 * Get one order by ID.
 */
export const getRestaurantOrderById = async (token, orderId) => {
  const res = await fetch(`${API_URL}/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error('Order not found');
    throw new Error('Failed to load order');
  }
  return res.json();
};

/**
 * Update order status (owner or admin). Body: { status }
 */
export const updateRestaurantOrderStatus = async (token, orderId, status) => {
  const res = await fetch(`${API_URL}/${orderId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update order');
  }
  return res.json();
};

/**
 * Owner earnings: completed orders count, total earning, withdrawals. Requires owner role.
 */
export const getRestaurantEarnings = async (token) => {
  const res = await fetch(`${API_URL}/earnings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load earnings');
  }
  return res.json();
};

// =========================
// Order reviews (per order)
// =========================

export const getRestaurantOrderReview = async (token, orderId) => {
  const res = await fetch(`${API_URL}/${orderId}/review`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to load review');
  }
  return res.json();
};

export const upsertRestaurantOrderReview = async (token, orderId, body) => {
  const res = await fetch(`${API_URL}/${orderId}/review`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to submit review');
  }
  return res.json();
};

export const deleteRestaurantOrderReview = async (token, orderId) => {
  const res = await fetch(`${API_URL}/${orderId}/review`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete review');
  }
  return res.json();
};

// Admin
export const listRestaurantOrderReviews = async (token, params = {}) => {
  const q = new URLSearchParams();
  if (params.page != null) q.set('page', String(params.page));
  if (params.perPage != null) q.set('perPage', String(params.perPage));
  const url = q.toString() ? `${API_URL}/reviews?${q}` : `${API_URL}/reviews`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load order reviews');
  return res.json();
};
