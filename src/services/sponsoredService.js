import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/sponsored`;

/**
 * Get all sponsored campaigns (no location check). Use for home feed.
 * Returns { sponsored: Array<{ id, videoId, video, user, areaName, ... }> }
 */
export const getSponsored = async () => {
  try {
    const res = await fetch(API_URL);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { sponsored: [] };
    const list = Array.isArray(data.sponsored) ? data.sponsored : [];
    return { sponsored: list };
  } catch (e) {
    return { sponsored: [] };
  }
};

/**
 * Get sponsored video for user's current location (when they select "Use my location").
 * Returns { sponsored: { video, areaName, ... } | null }
 */
export const getSponsoredByLocation = async (latitude, longitude) => {
  if (latitude == null || longitude == null) return { sponsored: null };
  try {
    const url = `${API_URL}/by-location?latitude=${latitude}&longitude=${longitude}`;
    const res = await fetch(url);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { sponsored: null };
    const sponsored = data.sponsored ?? data.data?.sponsored ?? null;
    return { sponsored: sponsored && sponsored.video ? sponsored : null };
  } catch (e) {
    return { sponsored: null };
  }
};

/**
 * List sponsored campaigns (admin: all, owner: own). Requires auth.
 */
export const getSponsoredList = async (token) => {
  const res = await fetch(`${API_URL}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load sponsored campaigns');
  return res.json();
};

/**
 * Create sponsored campaign. Requires auth (admin or owner).
 */
export const createSponsored = async (token, body) => {
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
    throw new Error(err.message || 'Failed to create sponsored campaign');
  }
  return res.json();
};

/**
 * Update sponsored campaign.
 */
export const updateSponsored = async (token, id, body) => {
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
 * Cancel sponsored campaign.
 */
export const deleteSponsored = async (token, id) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to cancel');
  return res.json();
};
