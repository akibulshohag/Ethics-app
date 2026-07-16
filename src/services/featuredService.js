import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/featured`;

/**
 * Get all featured campaigns (no location check). Use for home banner.
 * Returns { featured: Array<{ id, videoId, video, user, areaName, ... }> }
 */
export const getFeatured = async () => {
  try {
    const res = await fetch(API_URL);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { featured: [] };
    const raw = data.featured;
    // API may return featured as array or single object { id, video, user, ... }
    const list = Array.isArray(raw)
      ? raw
      : raw && (raw.video || raw.videoId)
        ? [raw]
        : [];
    return { featured: list };
  } catch (e) {
    return { featured: [] };
  }
};

/**
 * Get featured video for user's current location.
 * Returns { featured: { video, areaName, ... } | null }
 */
export const getFeaturedByLocation = async (latitude, longitude) => {
  if (latitude == null || longitude == null) return { featured: null };
  try {
    const res = await fetch(
      `${API_URL}/by-location?latitude=${latitude}&longitude=${longitude}`,
    );
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { featured: null };
    const featured = data.featured ?? data.data?.featured ?? null;
    return { featured: featured && featured.video ? featured : null };
  } catch (e) {
    return { featured: null };
  }
};

/**
 * List featured campaigns (admin: all, owner: own). Requires auth.
 */
export const getFeaturedList = async (token) => {
  const res = await fetch(`${API_URL}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load featured campaigns');
  return res.json();
};

/**
 * Create featured campaign. Requires auth (admin or owner).
 */
export const createFeatured = async (token, body) => {
  const res = await fetch(`${API_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.message || 'Failed to create featured campaign');
  }
  return res.json();
};

/**
 * Update featured campaign.
 */
export const updateFeatured = async (token, id, body) => {
  const res = await fetch(`${API_URL}/${id}`, {
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
 * Cancel featured campaign.
 */
export const deleteFeatured = async (token, id) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to cancel');
  return res.json();
};
