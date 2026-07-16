import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/app-rating`;

export const getMyAppRating = async (token) => {
  const res = await fetch(`${API_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error('Failed to load rating');
  }
  return res.json();
};

export const upsertMyAppRating = async (token, body) => {
  const res = await fetch(`${API_URL}/me`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to submit rating');
  }
  return res.json();
};

export const deleteMyAppRating = async (token) => {
  const res = await fetch(`${API_URL}/me`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete rating');
  }
  return res.json();
};

// Admin
export const listAppRatings = async (token, params = {}) => {
  const q = new URLSearchParams();
  if (params.page != null) q.set('page', String(params.page));
  if (params.perPage != null) q.set('perPage', String(params.perPage));
  const url = q.toString() ? `${API_URL}?${q}` : API_URL;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load ratings');
  return res.json();
};

export const deleteAppRatingById = async (token, id) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to delete rating');
  }
  return res.json();
};

export const updateAppRatingById = async (token, id, body) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to update rating');
  }
  return res.json();
};
