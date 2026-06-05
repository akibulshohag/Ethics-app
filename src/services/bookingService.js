import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/restaurant-bookings`;

const parseApiError = async (res, fallback) => {
  const raw = await res.text().catch(() => '');
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw };
  }
  return data?.message || fallback;
};

export const createRestaurantBooking = async (token, body) => {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ownerId: String(body.ownerId || ''),
      customerName: String(body.customerName || '').trim(),
      customerAddress: String(body.customerAddress || '').trim(),
      customerPhone: String(body.customerPhone || '').trim(),
      persons: Math.max(1, Number(body.persons) || 1),
      bookingDate: body.bookingDate,
      note: body.note ? String(body.note).trim() : undefined,
    }),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Failed to create booking'));
  }
  return res.json();
};

export const getRestaurantBookings = async (token, params = {}) => {
  const q = new URLSearchParams();
  if (params.status) q.set('status', params.status);
  if (params.scope) q.set('scope', params.scope);
  if (params.page != null) q.set('page', String(params.page));
  if (params.limit != null) q.set('limit', String(params.limit));
  const url = q.toString() ? `${API_URL}?${q}` : API_URL;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Failed to load bookings'));
  }
  return res.json();
};

export const updateRestaurantBookingStatus = async (token, bookingId, status) => {
  const res = await fetch(`${API_URL}/${bookingId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw new Error(await parseApiError(res, 'Failed to update booking'));
  }
  return res.json();
};
