import { config } from '../../config';
import { normalizeUkPhone } from '../utils/ukPhone';
import { fetchWithAuth } from './sessionService';

const API_URL = `${config.apiBaseUrl}/restaurant-orders`;

function formatOrderApiError(err, fallback = 'Failed to place order') {
  if (!err || typeof err !== 'object') return fallback;
  const errors = err.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0];
    const msg = first?.constraints && Object.values(first.constraints)[0];
    if (msg) {
      return `${msg}${first.property ? ` (${first.property})` : ''}`;
    }
  }
  if (typeof err.message === 'string' && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

function isValidationError(status, err) {
  if (status !== 400) return false;
  const msg = String(err?.message || '').toLowerCase();
  return msg.includes('validation') || Array.isArray(err?.errors);
}

/** Only DTO fields — avoids "Validation failed" on older API (forbidNonWhitelisted). */
function buildOrderPayload(body, { legacyApi = false } = {}) {
  const phone =
    normalizeUkPhone(body.customerPhone) ||
    String(body.customerPhone || '').trim();
  let deliveryAddress = String(body.deliveryAddress || '').trim();

  const payload = {
    ownerId: String(body.ownerId),
    items: (body.items || []).map(i => ({
      menuItemId: String(i.menuItemId),
      quantity: Math.max(1, Number(i.quantity) || 1),
    })),
    deliveryAddress,
  };

  if (legacyApi) {
    if (phone) {
      payload.deliveryAddress = deliveryAddress.includes('Phone:')
        ? deliveryAddress
        : `${deliveryAddress}\nPhone: ${phone}`;
    }
    if (body.promoCode) {
      payload.deliveryAddress += `\nPromo: ${String(body.promoCode)}`;
    }
  } else {
    if (phone) payload.customerPhone = phone;
    if (body.promoCode) payload.promoCode = String(body.promoCode);
    if (body.promotionId != null) {
      payload.promotionId = String(body.promotionId);
    }
    if (body.customerLatitude != null && body.customerLatitude !== '') {
      const lat = Number(body.customerLatitude);
      if (Number.isFinite(lat)) payload.customerLatitude = lat;
    }
    if (body.customerLongitude != null && body.customerLongitude !== '') {
      const lng = Number(body.customerLongitude);
      if (Number.isFinite(lng)) payload.customerLongitude = lng;
    }
    if (body.fulfillmentType) {
      payload.fulfillmentType = String(body.fulfillmentType);
    }
    if (body.paymentIntentId) {
      payload.paymentIntentId = String(body.paymentIntentId);
    }
  }

  return payload;
}

async function postRestaurantOrder(token, payload) {
  console.log('[Order] POST', API_URL);
  console.log('[Order] Payload:', JSON.stringify(payload, null, 2));

  const res = await fetchWithAuth(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    token,
  });

  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (_) {
    data = { message: raw || `HTTP ${res.status}` };
  }

  console.log('[Order] Response', res.status, JSON.stringify(data, null, 2));

  return { ok: res.ok, status: res.status, data };
}

/**
 * Create a restaurant order (customer).
 * Body: { ownerId, items, deliveryAddress?, customerPhone, promoCode?, promotionId? }
 */
export const createRestaurantOrder = async (token, body) => {
  const phone = normalizeUkPhone(body.customerPhone);
  console.log(
    '[Order] customerPhone input:',
    body.customerPhone,
    '→ normalized:',
    phone,
  );

  let { ok, status, data } = await postRestaurantOrder(
    token,
    buildOrderPayload(body, { legacyApi: false }),
  );

  if (!ok && isValidationError(status, data)) {
    console.warn(
      '[Order] Validation failed — retrying without customerPhone/promoId (phone in address)',
    );
    ({ ok, status, data } = await postRestaurantOrder(
      token,
      buildOrderPayload(body, { legacyApi: true }),
    ));
  }

  if (!ok) {
    throw new Error(formatOrderApiError(data));
  }
  return data;
};

export const getRestaurantOrders = async (token, params = {}) => {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.scope) q.set('scope', params.scope);
  if (params.page != null) q.set('page', String(params.page));
  if (params.limit != null) q.set('limit', String(params.limit));
  const url = q.toString() ? `${API_URL}?${q}` : API_URL;
  const res = await fetchWithAuth(url, { token });
  if (!res.ok) {
    throw new Error('Failed to load orders');
  }
  return res.json();
};

export const getRestaurantOrderById = async (token, orderId) => {
  const res = await fetch(`${API_URL}/${orderId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error('Order not found');
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load order');
  }
  return res.json();
};

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

export const assignRiderToOrder = async (token, orderId, riderId) => {
  const res = await fetch(`${API_URL}/${orderId}/assign-rider`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ riderId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to assign rider');
  }
  return res.json();
};

export const rejectRiderAssignment = async (token, orderId) => {
  const res = await fetch(`${API_URL}/${orderId}/reject-assignment`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to reject assignment');
  }
  return res.json();
};

export const getRestaurantOrderCounts = async token => {
  const res = await fetch(`${API_URL}/counts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    return { pending: 0, inProgress: 0, completed: 0, rejected: 0 };
  }
  return res.json();
};

export const getRestaurantEarnings = async token => {
  const res = await fetch(`${API_URL}/earnings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load earnings');
  }
  return res.json();
};

export const getTopRestaurantsByOrders = async (params = {}) => {
  const q = new URLSearchParams();
  if (params.page != null) q.set('page', String(params.page));
  if (params.limit != null) q.set('limit', String(params.limit));
  if (params.nearbyLat != null) q.set('nearbyLat', String(params.nearbyLat));
  if (params.nearbyLng != null) q.set('nearbyLng', String(params.nearbyLng));
  if (params.radiusKm != null) q.set('radiusKm', String(params.radiusKm));
  const url = q.toString()
    ? `${API_URL}/top-restaurants?${q}`
    : `${API_URL}/top-restaurants`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error('Failed to load top restaurants');
  }
  return res.json();
};

export const getTopMenuItemsByOrders = async (params = {}) => {
  const q = new URLSearchParams();
  if (params.page != null) q.set('page', String(params.page));
  if (params.limit != null) q.set('limit', String(params.limit));
  const url = q.toString()
    ? `${API_URL}/top-items?${q}`
    : `${API_URL}/top-items`;
  const res = await fetch(url);
  if (!res.ok) {
    return { items: [] };
  }
  const data = await res.json();
  const items = Array.isArray(data?.items)
    ? data.items
    : Array.isArray(data?.menuItems)
      ? data.menuItems
      : [];
  return { ...data, items };
};

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

export const listRestaurantOrderReviews = async (token, params = {}) => {
  const q = new URLSearchParams();
  if (params.page != null) q.set('page', String(params.page));
  if (params.perPage != null) q.set('perPage', String(params.perPage));
  const url = q.toString() ? `${API_URL}/reviews?${q}` : `${API_URL}/reviews`;
  const res = await fetchWithAuth(url, { token });
  if (!res.ok) {
    throw new Error('Failed to load order reviews');
  }
  return res.json();
};

export const getRestaurantOrderRiderReview = async (token, orderId) => {
  const res = await fetch(`${API_URL}/${orderId}/rider-review`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to load rider review');
  }
  return res.json();
};

export const upsertRestaurantOrderRiderReview = async (token, orderId, body) => {
  const res = await fetch(`${API_URL}/${orderId}/rider-review`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to submit rider review');
  }
  return res.json();
};

export const deleteRestaurantOrderRiderReview = async (token, orderId) => {
  const res = await fetch(`${API_URL}/${orderId}/rider-review`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete rider review');
  }
  return res.json();
};

export const listRiderReviews = async (token, params = {}) => {
  const q = new URLSearchParams();
  if (params.page != null) q.set('page', String(params.page));
  if (params.perPage != null) q.set('perPage', String(params.perPage));
  const url = q.toString()
    ? `${API_URL}/rider-reviews?${q}`
    : `${API_URL}/rider-reviews`;
  const res = await fetchWithAuth(url, { token });
  if (!res.ok) {
    throw new Error('Failed to load rider reviews');
  }
  return res.json();
};

export const listMySubscribersWhoOrderedFromOwner = async (token, ownerId) => {
  const q = new URLSearchParams();
  if (ownerId) q.set('ownerId', String(ownerId));
  const res = await fetch(`${API_URL}/subscribers-who-ordered?${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to load subscribers');
  }
  return res.json();
};
