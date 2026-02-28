import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/vendor-featured`;

/**
 * Get vendor featured video for user's current location.
 * Returns { featured: { video, vendor, areaName, ... } | null }
 */
export const getVendorFeaturedByLocation = async (latitude, longitude) => {
  if (latitude == null || longitude == null) return { featured: null };
  try {
    const res = await fetch(
      `${API_URL}/by-location?latitude=${latitude}&longitude=${longitude}`,
    );
    const data = await res.json();
    return { featured: data.featured || null };
  } catch (e) {
    return { featured: null };
  }
};

/**
 * List vendor featured campaigns (admin only). Requires auth.
 */
export const getVendorFeaturedList = async (token) => {
  const res = await fetch(`${API_URL}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load vendor featured campaigns');
  return res.json();
};

/**
 * Create vendor featured campaign (admin only).
 */
export const createVendorFeatured = async (token, body) => {
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
    throw new Error(err.message || 'Failed to create vendor featured campaign');
  }
  return res.json();
};

/**
 * Cancel vendor featured campaign.
 */
export const deleteVendorFeatured = async (token, id) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to cancel');
  return res.json();
};
