import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/menu`;

/**
 * Browse restaurants by food category (Foodpanda-style).
 * GET /menu/browse?category=biryani&page=1&limit=20
 */
export async function browseRestaurantsByCategory({
  category,
  page = 1,
  limit = 20,
  nearbyLat,
  nearbyLng,
  radiusKm,
} = {}) {
  const cat = String(category || '').trim();
  if (!cat) {
    return { restaurants: [], page: 1, limit, total: 0 };
  }
  const q = new URLSearchParams({
    category: cat,
    page: String(page),
    limit: String(limit),
  });
  if (nearbyLat != null) q.set('nearbyLat', String(nearbyLat));
  if (nearbyLng != null) q.set('nearbyLng', String(nearbyLng));
  if (radiusKm != null) q.set('radiusKm', String(radiusKm));
  const res = await fetch(`${API_URL}/browse?${q.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to load category restaurants');
  }
  return res.json();
}

export default browseRestaurantsByCategory;
