import {
  restaurantMatchesDiscoveryCategory,
  getDiscoveryCategoryByKey,
  menuItemMatchesDiscoveryCategory,
} from '../constants/menuDiscoveryCategories';

export const DEFAULT_DISCOVERY_FILTERS = {
  sort: 'default',
  dietary: 'all',
  highlyReordered: false,
};

export function normalizeDiscoveryFilters(raw = {}) {
  const sort =
    raw.sort === 'price_low' || raw.sort === 'price_high'
      ? raw.sort
      : 'default';
  const dietary =
    raw.dietary === 'veg' ||
    raw.dietary === 'egg' ||
    raw.dietary === 'non_veg'
      ? raw.dietary
      : 'all';
  return {
    sort,
    dietary,
    highlyReordered: !!raw.highlyReordered,
  };
}

export function filterMenuItems(menu = [], filters = DEFAULT_DISCOVERY_FILTERS) {
  const f = normalizeDiscoveryFilters(filters);
  let list = Array.isArray(menu) ? [...menu] : [];

  if (f.dietary !== 'all') {
    list = list.filter(it => String(it?.dietaryType || '') === f.dietary);
  }
  if (f.highlyReordered) {
    list = list.filter(it => Number(it?.timesOrdered || 0) > 0);
    list.sort(
      (a, b) => Number(b?.timesOrdered || 0) - Number(a?.timesOrdered || 0),
    );
  } else if (f.sort === 'price_low') {
    list.sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
  } else if (f.sort === 'price_high') {
    list.sort((a, b) => Number(b?.price || 0) - Number(a?.price || 0));
  }

  return list;
}

export function restaurantMatchesFilters(row, filters = DEFAULT_DISCOVERY_FILTERS) {
  const f = normalizeDiscoveryFilters(filters);
  const menu = Array.isArray(row?.menu) ? row.menu : [];
  const filtered = filterMenuItems(menu, f);
  if (f.dietary !== 'all' || f.highlyReordered) {
    return filtered.length > 0;
  }
  return true;
}

export function restaurantMatchesCategory(row, categoryKey) {
  const key = String(categoryKey || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
  if (!key) return true;

  if (getDiscoveryCategoryByKey(key)) {
    return restaurantMatchesDiscoveryCategory(row, key);
  }

  const menu = Array.isArray(row?.menu) ? row.menu : [];
  return menu.some(m => {
    if (menuItemMatchesDiscoveryCategory(m, key)) return true;
    const cat = String(m?.category?.name || m?.categoryName || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, ' ');
    const tags = (Array.isArray(m?.tags) ? m.tags : []).map(t =>
      String(t || '')
        .trim()
        .toLowerCase(),
    );
    const itemBlob = [
      m?.itemName,
      m?.description,
      ...(Array.isArray(m?.tags) ? m.tags : []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return (
      cat.includes(key) ||
      key.includes(cat) ||
      tags.some(t => t.includes(key)) ||
      itemBlob.includes(key)
    );
  });
}

export function sortRestaurants(rows = [], filters = DEFAULT_DISCOVERY_FILTERS) {
  const f = normalizeDiscoveryFilters(filters);
  const list = [...rows];
  if (f.highlyReordered) {
    list.sort((a, b) => Number(b?.orderCount || 0) - Number(a?.orderCount || 0));
    return list;
  }
  if (f.sort === 'price_low' || f.sort === 'price_high') {
    const minPrice = row => {
      const menu = filterMenuItems(row?.menu || [], {
        ...f,
        sort: 'default',
      });
      if (!menu.length) return f.sort === 'price_low' ? Infinity : -Infinity;
      const prices = menu.map(m => Number(m?.price || 0)).filter(Number.isFinite);
      if (!prices.length) return f.sort === 'price_low' ? Infinity : -Infinity;
      return f.sort === 'price_low' ? Math.min(...prices) : Math.max(...prices);
    };
    list.sort((a, b) => {
      const pa = minPrice(a);
      const pb = minPrice(b);
      return f.sort === 'price_low' ? pa - pb : pb - pa;
    });
    return list;
  }
  list.sort((a, b) => Number(b?.orderCount || 0) - Number(a?.orderCount || 0));
  return list;
}
