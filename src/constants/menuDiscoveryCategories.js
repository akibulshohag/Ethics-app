import { cuisineImageUriFromKey } from './cuisineCategoryImages';

/** Foodpanda / Foodi-style browse categories mapped to menu text from the API. */
export const DISCOVERY_MENU_CATEGORIES = [
  {
    key: 'bread',
    label: 'Bread',
    icon: 'bread-slice',
    keywords: ['bread', 'naan', 'roti', 'paratha', 'pita', 'baguette', 'loaf'],
  },
  {
    key: 'bangladeshi',
    label: 'Bangla Food',
    icon: 'rice',
    keywords: ['bangla', 'bangladeshi', 'bengali', 'bangla food'],
  },
  {
    key: 'burger',
    label: 'Burger',
    icon: 'hamburger',
    keywords: ['burger', 'hamburger', 'cheeseburger', 'smash burger'],
  },
  {
    key: 'biryani',
    label: 'Biryani',
    icon: 'rice',
    keywords: ['biryani', 'biriyani', 'pulao', 'pilaf', 'kacchi'],
  },
  {
    key: 'chicken',
    label: 'Chicken',
    icon: 'food-drumstick',
    keywords: [
      'chicken',
      'wings',
      'drumstick',
      'tandoori chicken',
      'fried chicken',
      'roast chicken',
    ],
  },
  {
    key: 'pizza',
    label: 'Pizza',
    icon: 'pizza',
    keywords: ['pizza', 'calzone', 'margherita', 'pepperoni'],
  },
  {
    key: 'indian',
    label: 'Indian Food',
    icon: 'silverware-variant',
    keywords: [
      'indian',
      'indian food',
      'curry',
      'tandoori',
      'masala',
      'naan',
      'samosa',
      'bhaji',
      'tikka',
      'korma',
      'vindaloo',
      'balti',
      'dosa',
    ],
  },
  {
    key: 'wok',
    label: 'Wok Food',
    icon: 'noodles',
    keywords: [
      'wok',
      'wok food',
      'stir fry',
      'stir-fry',
      'stir fried',
      'wok fried',
      'wok noodles',
      'wok rice',
    ],
  },
  {
    key: 'thai',
    label: 'Thai',
    icon: 'noodles',
    keywords: ['thai', 'pad thai', 'tom yum', 'green curry', 'basil'],
  },
  {
    key: 'chinese',
    label: 'Chinese',
    icon: 'noodles',
    keywords: [
      'chinese',
      'noodle',
      'dim sum',
      'fried rice',
      'chow mein',
      'dumpling',
    ],
  },
  {
    key: 'breakfast',
    label: 'Breakfast',
    icon: 'coffee-outline',
    keywords: [
      'breakfast',
      'pancake',
      'waffle',
      'omelette',
      'omelet',
      'egg',
      'croissant',
      'porridge',
      'cereal',
    ],
  },
  {
    key: 'pasta',
    label: 'Pasta',
    icon: 'pasta',
    keywords: ['pasta', 'spaghetti', 'lasagna', 'lasagne', 'penne', 'carbonara'],
  },
  {
    key: 'cakes',
    label: 'Cakes',
    icon: 'cupcake',
    keywords: [
      'cake',
      'cupcake',
      'pastry',
      'brownie',
      'cheesecake',
      'dessert',
      'muffin',
      'donut',
      'doughnut',
    ],
  },
  {
    key: 'seafood',
    label: 'Seafood',
    icon: 'fish',
    keywords: ['seafood', 'fish', 'prawn', 'shrimp', 'salmon', 'tuna', 'crab'],
  },
  {
    key: 'bbq',
    label: 'BBQ',
    icon: 'grill',
    keywords: ['bbq', 'barbecue', 'grill', 'kebab', 'skewer'],
  },
  {
    key: 'coffee',
    label: 'Coffee',
    icon: 'coffee',
    keywords: ['coffee', 'latte', 'cappuccino', 'espresso', 'cafe'],
  },
  {
    key: 'healthy',
    label: 'Healthy',
    icon: 'leaf',
    keywords: ['salad', 'vegan', 'vegetarian', 'healthy', 'bowl', 'smoothie'],
  },
];

export const normalizeDiscoveryText = value =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');

const readMenuCategoryName = item =>
  normalizeDiscoveryText(item?.category?.name || item?.categoryName || '');

const menuItemSearchBlob = item => {
  const parts = [
    item?.itemName,
    item?.description,
    readMenuCategoryName(item),
    ...(Array.isArray(item?.tags) ? item.tags : []),
  ];
  return normalizeDiscoveryText(parts.filter(Boolean).join(' '));
};

/** Map UI / menu category names to discovery keys */
export const DISCOVERY_CATEGORY_ALIASES = {
  'bangla food': 'bangladeshi',
  bangla: 'bangladeshi',
  bengali: 'bangladeshi',
  'bengali food': 'bangladeshi',
  bangladeshi: 'bangladeshi',
  'indian food': 'indian',
  indian: 'indian',
  'wok food': 'wok',
  wok: 'wok',
};

export const getDiscoveryCategoryByKey = key => {
  const k = normalizeDiscoveryText(key);
  const mapped = DISCOVERY_CATEGORY_ALIASES[k] || k;
  return DISCOVERY_MENU_CATEGORIES.find(c => c.key === mapped) || null;
};

export const resolveDiscoveryCategoryFromFilter = filterKey => {
  const k = normalizeDiscoveryText(filterKey);
  if (!k) return null;
  const mappedKey = DISCOVERY_CATEGORY_ALIASES[k] || k;
  return (
    getDiscoveryCategoryByKey(mappedKey) ||
    DISCOVERY_MENU_CATEGORIES.find(
      cat => normalizeDiscoveryText(cat.label) === k,
    ) ||
    null
  );
};

/** Resolve navigation target for a cuisine chip (key may be raw menu category name). */
export const resolveCategoryChipNavigation = chip => {
  const label = String(chip?.label || '').trim();
  const key = String(chip?.key || label).trim();
  const discovery =
    resolveDiscoveryCategoryFromFilter(key) ||
    resolveDiscoveryCategoryFromFilter(label);
  if (discovery) {
    return { categoryKey: discovery.key, categoryLabel: discovery.label };
  }
  return {
    categoryKey: key,
    categoryLabel: label || key,
  };
};

export const getDiscoveryKeysForMenuItem = item =>
  DISCOVERY_MENU_CATEGORIES.filter(cat =>
    menuItemMatchesDiscoveryCategory(item, cat.key),
  ).map(cat => cat.key);

/** All normalized cuisine tags for an owner's menu (API categories + discovery keys). */
export function buildMenuCuisineTags(menuRows = [], ownerCategories = []) {
  const tags = new Set();
  (ownerCategories || []).forEach(cat => {
    const c = normalizeDiscoveryText(cat);
    if (c) tags.add(c);
  });
  (menuRows || []).forEach(item => {
    const catName = normalizeDiscoveryText(
      item?.categoryName || item?.category?.name,
    );
    if (catName) tags.add(catName);
    (Array.isArray(item?.tags) ? item.tags : []).forEach(tag => {
      const t = normalizeDiscoveryText(tag);
      if (t) tags.add(t);
    });
    getDiscoveryKeysForMenuItem(item).forEach(k => tags.add(k));
  });
  return Array.from(tags);
}

/** Match a home-feed cuisine chip against an owner's cached menu rows. */
export function ownerMenuMatchesCuisineFilter(
  menuRows = [],
  ownerCategories = [],
  filterKey,
) {
  const key = normalizeDiscoveryText(filterKey);
  if (!key) return true;

  const discovery = resolveDiscoveryCategoryFromFilter(key);
  if (discovery) {
    return (menuRows || []).some(item =>
      menuItemMatchesDiscoveryCategory(item, discovery.key),
    );
  }

  for (const cat of ownerCategories || []) {
    const c = normalizeDiscoveryText(cat);
    if (c && (c === key || c.includes(key) || key.includes(c))) return true;
  }

  return (menuRows || []).some(item => {
    const blob = menuItemSearchBlob(item);
    return blob.includes(key);
  });
}

export function buildDiscoveryCategoriesFromMenuCaches(menuByOwner = {}) {
  const restaurants = Object.entries(menuByOwner).map(([id, menu]) => ({
    id,
    menu: Array.isArray(menu) ? menu : [],
  }));
  return buildDiscoveryCategoriesFromRestaurants(restaurants);
}

export const menuItemMatchesDiscoveryCategory = (item, categoryKey) => {
  const category = getDiscoveryCategoryByKey(categoryKey);
  if (!category) return false;
  const blob = menuItemSearchBlob(item);
  if (!blob) return false;
  return category.keywords.some(kw => {
    const needle = normalizeDiscoveryText(kw);
    return needle && blob.includes(needle);
  });
};

export const restaurantMatchesDiscoveryCategory = (row, categoryKey) => {
  const menu = Array.isArray(row?.menu) ? row.menu : [];
  return menu.some(item => menuItemMatchesDiscoveryCategory(item, categoryKey));
};

/**
 * Build Foodpanda-style categories from loaded restaurant menus.
 * Only returns categories that match at least one menu item nearby.
 */
export function buildDiscoveryCategoriesFromRestaurants(restaurants = []) {
  const rows = Array.isArray(restaurants) ? restaurants : [];
  const stats = new Map();

  DISCOVERY_MENU_CATEGORIES.forEach(cat => {
    stats.set(cat.key, { itemCount: 0, restaurantIds: new Set() });
  });

  rows.forEach(r => {
    const menu = Array.isArray(r?.menu) ? r.menu : [];
    const matchedKeys = new Set();
    menu.forEach(item => {
      DISCOVERY_MENU_CATEGORIES.forEach(cat => {
        if (menuItemMatchesDiscoveryCategory(item, cat.key)) {
          matchedKeys.add(cat.key);
          const s = stats.get(cat.key);
          s.itemCount += 1;
        }
      });
    });
    matchedKeys.forEach(key => {
      if (r?.id) stats.get(key).restaurantIds.add(String(r.id));
    });
  });

  return DISCOVERY_MENU_CATEGORIES.map(cat => {
    const s = stats.get(cat.key);
    return {
      key: cat.key,
      label: cat.label,
      icon: cat.icon,
      count: s.itemCount,
      restaurantCount: s.restaurantIds.size,
      imageUri: cuisineImageUriFromKey(cat.key),
    };
  })
    .filter(c => c.count > 0)
    .sort((a, b) => b.restaurantCount - a.restaurantCount || b.count - a.count);
}
