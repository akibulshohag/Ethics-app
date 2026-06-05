import {
  getTopRestaurantsByOrders,
  getTopMenuItemsByOrders,
} from './orderService';
import { getChannelProfile } from './channelService';
import { getMenuByUserId } from './menuService';
import { getUserVideos } from './videoService';
import { shortsService } from './shortsService';
import { UK_DEFAULT_RADIUS_KM } from '../utils/ukPostcode';
import {
  buildDiscoveryCategoriesFromRestaurants,
  getDiscoveryCategoryByKey,
  restaurantMatchesDiscoveryCategory,
  DISCOVERY_MENU_CATEGORIES,
} from '../constants/menuDiscoveryCategories';

const DEFAULT_IMG =
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600';

const toNum = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const safeUri = x => String(x || '').trim();

const resolveDiscoveryCategoryFromQuery = query => {
  const q = String(query || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!q) return null;
  return (
    getDiscoveryCategoryByKey(q) ||
    DISCOVERY_MENU_CATEGORIES.find(
      cat => cat.label.toLowerCase() === q || cat.key === q,
    ) ||
    null
  );
};

const shortLocation = (profile, fallbackAddress) => {
  const city =
    String(profile?.city || '').trim() ||
    String(profile?.town || '').trim() ||
    String(profile?.state || '').trim();
  const country = String(profile?.country || '').trim();
  if (city && country) return `${city}, ${country}`;
  if (city) return city;
  const raw = String(fallbackAddress || '').trim();
  if (!raw) return 'Near you';
  return raw.split(',')[0]?.trim() || raw;
};

export async function loadDiscoveryRestaurants({
  currentUserId = null,
  page = 1,
  limit = 40,
  locationOpts = null,
} = {}) {
  const lat = locationOpts?.viewerLat ?? locationOpts?.lat;
  const lng = locationOpts?.viewerLng ?? locationOpts?.lng;
  const hasNearby =
    lat != null &&
    lng != null &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng));

  const top = await getTopRestaurantsByOrders({
    page,
    limit,
    ...(hasNearby
      ? {
          nearbyLat: Number(lat),
          nearbyLng: Number(lng),
          radiusKm: locationOpts?.radiusKm ?? UK_DEFAULT_RADIUS_KM,
        }
      : {}),
  });
  const base = Array.isArray(top?.restaurants) ? top.restaurants : [];
  const enriched = await Promise.all(
    base.map(async r => {
      const ownerId = r?.id ? String(r.id) : '';
      if (!ownerId) return null;
      let profile = null;
      let menu = [];
      let videos = [];
      let shorts = [];

      try {
        profile = await getChannelProfile(ownerId, currentUserId);
      } catch (_) {}
      try {
        const m = await getMenuByUserId(ownerId);
        menu = Array.isArray(m?.menu) ? m.menu : [];
      } catch (_) {}
      try {
        const [vRes, sRes] = await Promise.all([
          getUserVideos(ownerId, 1, 8),
          shortsService.getUserShorts(ownerId, 1, 8),
        ]);
        videos = Array.isArray(vRes?.videos) ? vRes.videos : [];
        shorts = Array.isArray(sRes?.shorts) ? sRes.shorts : [];
      } catch (_) {}

      const p0 = Array.isArray(profile?.photos) ? profile.photos[0] : null;
      const profilePhoto =
        safeUri(typeof p0 === 'string' ? p0 : p0?.src) ||
        safeUri(profile?.channelAvatar) ||
        DEFAULT_IMG;

      const firstShort = shorts.find(s => safeUri(s?.videoUrl));
      const firstVideo = videos.find(v => safeUri(v?.videoUrl));
      const mediaType = firstShort ? 'short' : firstVideo ? 'video' : 'none';
      const mediaId = String(firstShort?.id || firstVideo?.id || '').trim();
      const mediaUrl = safeUri(firstShort?.videoUrl || firstVideo?.videoUrl);
      const mediaThumb = firstShort
        ? safeUri(firstShort?.thumbnailUrl) ||
          safeUri(firstShort?.coverUrl) ||
          profilePhoto
        : safeUri(firstVideo?.thumbnailUrl) || profilePhoto;

      const totalViews =
        videos.reduce((sum, v) => sum + toNum(v?.viewCount), 0) +
        shorts.reduce((sum, s) => sum + toNum(s?.viewCount), 0);

      return {
        id: ownerId,
        name:
          profile?.nickname ||
          profile?.name ||
          r?.nickname ||
          r?.name ||
          'Restaurant',
        address: profile?.address || r?.address || 'Near you',
        postcode: profile?.postcode || r?.postcode || '',
        latitude: profile?.latitude ?? r?.latitude ?? null,
        longitude: profile?.longitude ?? r?.longitude ?? null,
        distanceKm: r?.distanceKm ?? null,
        shortAddress: shortLocation(profile, profile?.address || r?.address),
        rating:
          profile?.averageRating ??
          profile?.ratingAverage ??
          profile?.rating ??
          0,
        reviewCount:
          profile?.reviewCount ??
          profile?.reviewsCount ??
          profile?.ratingCount ??
          0,
        orderCount: toNum(r?.orderCount),
        menu,
        mediaType,
        mediaId,
        mediaUrl,
        mediaThumb,
        totalViews,
      };
    }),
  );
  return enriched.filter(Boolean);
}

export function buildCategoryOptionsFromRestaurants(restaurants = []) {
  return buildDiscoveryCategoriesFromRestaurants(restaurants);
}

export async function fetchPopularMenuItemsFromApi(limit = 12) {
  try {
    const res = await getTopMenuItemsByOrders({ page: 1, limit });
    const raw = Array.isArray(res?.items) ? res.items : [];
    if (!raw.length) return [];
    return raw.map(m => ({
      id: `${m.ownerId || m.userId}-${m.id}`,
      menuItemId: m.id,
      itemName: m.itemName || m.name || 'Dish',
      price: m.price,
      imageUrl: m.imageUrl,
      timesOrdered: toNum(m.timesOrdered || m.orderCount),
      dietaryType: m.dietaryType,
      ownerId: String(m.ownerId || m.userId || ''),
      ownerName: m.ownerName || m.restaurantName || 'Restaurant',
      ownerAddress: m.ownerAddress || '',
    }));
  } catch {
    return [];
  }
}

export function buildPopularMenuItems(restaurants = [], limit = 12) {
  const items = [];
  restaurants.forEach(r => {
    (r?.menu || []).forEach(m => {
      const orders = toNum(m?.timesOrdered);
      if (orders <= 0) return;
      items.push({
        id: `${r.id}-${m.id}`,
        menuItemId: m.id,
        itemName: m.itemName || 'Dish',
        price: m.price,
        imageUrl: m.imageUrl,
        timesOrdered: orders,
        dietaryType: m.dietaryType,
        ownerId: r.id,
        ownerName: r.name,
        ownerAddress: r.address,
      });
    });
  });
  items.sort((a, b) => b.timesOrdered - a.timesOrdered);
  return items.slice(0, limit);
}

export function matchRestaurantQuery(row, query) {
  const q = String(query || '')
    .trim()
    .toLowerCase();
  if (!q) return true;

  const discoveryCategory = resolveDiscoveryCategoryFromQuery(q);
  if (discoveryCategory) {
    return restaurantMatchesDiscoveryCategory(row, discoveryCategory.key);
  }

  const hay = [
    row?.name,
    row?.address,
    ...(row?.menu || []).flatMap(m => [
      m?.itemName,
      m?.description,
      m?.category?.name,
      m?.categoryName,
      ...(Array.isArray(m?.tags) ? m.tags : []),
    ]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}
