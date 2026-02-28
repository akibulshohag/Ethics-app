import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/vendor-sponsored`;

/**
 * Get vendor sponsored video for user's current location.
 * Returns { sponsored: { video, vendor, areaName, ... } | null }
 */
export const getVendorSponsoredByLocation = async (latitude, longitude) => {
  if (latitude == null || longitude == null) return { sponsored: null };
  try {
    const res = await fetch(
      `${API_URL}/by-location?latitude=${latitude}&longitude=${longitude}`,
    );
    const data = await res.json();
    return { sponsored: data.sponsored || null };
  } catch (e) {
    return { sponsored: null };
  }
};

/**
 * List vendor sponsored campaigns (admin only). Requires auth.
 */
export const getVendorSponsoredList = async (token) => {
  const res = await fetch(`${API_URL}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load vendor sponsored campaigns');
  return res.json();
};

/**
 * Create vendor sponsored campaign (admin only).
 */
export const createVendorSponsored = async (token, body) => {
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
    throw new Error(err.message || 'Failed to create vendor sponsored campaign');
  }
  return res.json();
};

/**
 * Cancel vendor sponsored campaign.
 */
export const deleteVendorSponsored = async (token, id) => {
  const res = await fetch(`${API_URL}/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to cancel');
  return res.json();
};
