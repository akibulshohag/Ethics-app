import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Dimensions,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getMenuByUserId } from '../services/menuService';
import { useSelector } from 'react-redux';
import { getChannelProfile } from '../services/channelService';

const { width } = Dimensions.get('window');
const DEFAULT_IMAGE =
  'https://img.freepik.com/free-photo/delicious-burger-with-fire-flames_23-2151846510.jpg';

const DAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const parseTimeToMinutes = raw => {
  if (!raw) return null;
  const s = String(raw).trim().toUpperCase();
  // supports: 10AM, 10 AM, 10:30AM, 10.30AM, 12.00PM
  const m = s.match(/^(\d{1,2})(?::|\.|)?(\d{2})?\s*(AM|PM)$/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] != null ? parseInt(m[2], 10) : 0;
  const ap = m[3];
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  if (h === 12) h = 0;
  if (ap === 'PM') h += 12;
  return h * 60 + min;
};

const minutesToLabel = mins => {
  if (mins == null) return '';
  const h24 = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  const ap = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, '0')}${ap}`;
};

const normalizeOpeningHours = raw => {
  const arr = Array.isArray(raw) ? raw : [];
  return arr
    .map(h => ({
      day: String(h?.day || '').trim(),
      open: h?.open || h?.opening || h?.start,
      close: h?.close || h?.closing || h?.end,
    }))
    .filter(h => h.day);
};

const HomeThreeScreen = ({ onBack }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector(state => state?.app?.user);
  const ownerId = route.params?.ownerId;
  const resTitle =
    route.params?.ownerName || route.params?.title || 'Restaurant';
  const resLocation = route.params?.location || '';
  const searchKeyword = String(route.params?.searchKeyword || '').trim();
  const searchKeywordLower = searchKeyword.toLowerCase();
  const singleMenuItem = route.params?.singleMenuItem;
  const promotionMenuItems = route.params?.promotionMenuItems;
  const searchInitAppliedRef = useRef(false);

  const [menuItems, setMenuItems] = useState([]);
  const [menuCategoriesFromApi, setMenuCategoriesFromApi] = useState([]);
  const [menuLoading, setMenuLoading] = useState(
    !!ownerId &&
      !singleMenuItem &&
      !(Array.isArray(promotionMenuItems) && promotionMenuItems.length > 0),
  );
  const [selectedItems, setSelectedItems] = useState({});
  const [staticQuantities, setStaticQuantities] = useState({
    0: 1,
    1: 1,
    2: 1,
  });
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [filterSortModalVisible, setFilterSortModalVisible] = useState(false);
  const [appliedSort, setAppliedSort] = useState('default'); // default | price_low | price_high
  const [appliedDietary, setAppliedDietary] = useState('all'); // all | veg | egg | non_veg
  const [appliedHighlyReordered, setAppliedHighlyReordered] = useState(false);
  const [draftSort, setDraftSort] = useState('default');
  const [draftDietary, setDraftDietary] = useState('all');
  const [draftHighlyReordered, setDraftHighlyReordered] = useState(false);
  /** Quick bar: desserts (static) | bestseller (by sales) | rated (by reviews) — one at a time */
  const [quickFilter, setQuickFilter] = useState(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [openingHours, setOpeningHours] = useState([]);
  const [restaurantAvgRating, setRestaurantAvgRating] = useState(0);
  const [restaurantReviewCount, setRestaurantReviewCount] = useState(0);
  const [nowTick, setNowTick] = useState(0);
  const insets = useSafeAreaInsets();

  // Sync cart qty from checkout screen (HomeFour) when coming back.
  useEffect(() => {
    const syncedAt = route.params?.syncedAt;
    const syncedOwnerId = route.params?.syncedOwnerId;
    const syncedItems = route.params?.syncedCheckoutItems;
    if (!syncedAt) return;
    if (!ownerId || String(syncedOwnerId || '') !== String(ownerId)) return;
    if (!Array.isArray(syncedItems)) return;

    const nextSelected = {};
    syncedItems.forEach(it => {
      const id = it?.menuItemId;
      const q = Math.max(0, Number(it?.quantity) || 0);
      if (id && q > 0) nextSelected[id] = q;
    });
    setSelectedItems(nextSelected);
  }, [route.params?.syncedAt, route.params?.syncedOwnerId, ownerId]);

  useEffect(() => {
    // Tick every minute so the banner updates automatically
    const t = setInterval(() => setNowTick(v => v + 1), 60 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!ownerId) return;
    const viewerId = user?.id || null;
    getChannelProfile(ownerId, viewerId)
      .then(p => {
        setOpeningHours(normalizeOpeningHours(p?.openingHours));
        const avgRaw =
          p?.averageRating ?? p?.ratingAverage ?? p?.ratingAvg ?? p?.rating;
        const countRaw =
          p?.reviewCount ??
          p?.reviewsCount ??
          p?.totalReviews ??
          p?.ratingCount;
        const avg = Number(avgRaw);
        const count = Number(countRaw);
        setRestaurantAvgRating(Number.isFinite(avg) ? Math.max(0, avg) : 0);
        setRestaurantReviewCount(
          Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0,
        );
      })
      .catch(() => {
        setOpeningHours([]);
        setRestaurantAvgRating(0);
        setRestaurantReviewCount(0);
      });
  }, [ownerId, user?.id]);

  const ratingText = useMemo(
    () => (restaurantAvgRating > 0 ? restaurantAvgRating.toFixed(1) : '0.0'),
    [restaurantAvgRating],
  );
  const ratingCountText = useMemo(() => {
    const c = restaurantReviewCount;
    if (c >= 1000000)
      return `${(c / 1000000).toFixed(1).replace(/\.0$/, '')}M ratings`;
    if (c >= 1000)
      return `${(c / 1000).toFixed(1).replace(/\.0$/, '')}k ratings`;
    return `${c} rating${c === 1 ? '' : 's'}`;
  }, [restaurantReviewCount]);

  const openCloseBannerText = useMemo(() => {
    // depend on nowTick so it refreshes
    void nowTick;
    if (!Array.isArray(openingHours) || openingHours.length === 0) return '';
    const now = new Date();
    const todayName = DAY_NAMES[now.getDay()];
    const today = openingHours.find(
      h => String(h.day).toLowerCase() === String(todayName).toLowerCase(),
    );

    const nowMins = now.getHours() * 60 + now.getMinutes();
    const openMins = parseTimeToMinutes(today?.open);
    const closeMins = parseTimeToMinutes(today?.close);

    const findNextOpen = () => {
      for (let i = 0; i < 7; i++) {
        const d = new Date(now);
        d.setDate(now.getDate() + i);
        const name = DAY_NAMES[d.getDay()];
        const row = openingHours.find(
          h => String(h.day).toLowerCase() === String(name).toLowerCase(),
        );
        const o = parseTimeToMinutes(row?.open);
        if (o == null) continue;
        if (i === 0) {
          // today: only if in future
          if (o > nowMins) return { mins: o, dayOffset: 0 };
        } else {
          return { mins: o, dayOffset: i };
        }
      }
      return null;
    };

    if (openMins == null || closeMins == null) {
      const nxt = findNextOpen();
      if (!nxt) return '';
      const when = minutesToLabel(nxt.mins);
      return `This restaurant will be open at ${when}${
        nxt.dayOffset === 1 ? ' (tomorrow)' : ''
      }`;
    }

    // handle overnight windows (e.g. 8PM -> 2AM)
    const crossesMidnight = closeMins <= openMins;
    const isOpen = crossesMidnight
      ? nowMins >= openMins || nowMins < closeMins
      : nowMins >= openMins && nowMins < closeMins;

    if (isOpen) {
      const closeLabel = minutesToLabel(closeMins);
      return `This restaurant will be close at ${closeLabel}`;
    }

    const nxt = findNextOpen();
    const openLabel =
      !crossesMidnight && nowMins < openMins
        ? minutesToLabel(openMins)
        : minutesToLabel(nxt?.mins);
    if (!openLabel) return '';
    return `This restaurant will be open at ${openLabel}${
      nxt?.dayOffset === 1 ? ' (tomorrow)' : ''
    }`;
  }, [openingHours, nowTick]);

  // Dynamic categories: from API (owner-created) with item counts; or single "All" when none
  const menuCategories = useMemo(() => {
    if (
      Array.isArray(menuCategoriesFromApi) &&
      menuCategoriesFromApi.length > 0
    ) {
      return menuCategoriesFromApi.map(c => ({
        id: c.id,
        label: c.name || c.label || c.id,
        count:
          c.itemCount ??
          menuItems.filter(it => (it.categoryId || it.category?.id) === c.id)
            .length,
      }));
    }
    // No categories from API: show single "All" / "Most Ordered" with full count
    return [{ id: 'all', label: 'Most Ordered', count: menuItems.length }];
  }, [menuCategoriesFromApi, menuItems]);

  // Default selected category when categories load (first category or "all")
  useEffect(() => {
    if (menuCategories.length > 0 && selectedCategoryId === null) {
      setSelectedCategoryId(menuCategories[0].id);
    }
  }, [menuCategories.length]);

  useEffect(() => {
    searchInitAppliedRef.current = false;
  }, [ownerId, searchKeywordLower]);

  // Menu items to display: filter by selected category when using API categories
  const displayedMenuItems = useMemo(() => {
    if (!selectedCategoryId || selectedCategoryId === 'all') return menuItems;
    return menuItems.filter(
      it => (it.categoryId || it.category?.id) === selectedCategoryId,
    );
  }, [menuItems, selectedCategoryId]);

  const isDessertItem = useCallback(
    item => {
      const cid = item.categoryId || item.category?.id;
      const cat = (menuCategoriesFromApi || []).find(c => c.id === cid);
      if (
        cat &&
        /dessert|sweets?|pastry|cake|pudding|mousse/i.test(
          String(cat.name || ''),
        )
      ) {
        return true;
      }
      const n = String(item.itemName || '').toLowerCase();
      return [
        'dessert',
        'cake',
        'sweet',
        'ice cream',
        'pudding',
        'brownie',
        'pastry',
        'tiramisu',
        'cheesecake',
        'mousse',
        'waffle',
        'cookie',
      ].some(k => n.includes(k));
    },
    [menuCategoriesFromApi],
  );

  const filteredMenuForDisplay = useMemo(() => {
    let list = [...displayedMenuItems];
    if (quickFilter === 'desserts') {
      list = list.filter(isDessertItem);
    }
    if (appliedDietary !== 'all') {
      list = list.filter(it => String(it.dietaryType || '') === appliedDietary);
    }
    if (appliedHighlyReordered) {
      const ordered = list.filter(it => (Number(it.timesOrdered) || 0) > 0);
      list = ordered;
    }

    const bySales = (a, b) =>
      (Number(b.timesOrdered) || 0) - (Number(a.timesOrdered) || 0);
    const byRating = (a, b) => {
      const ar = Number(a.avgRating) || 0;
      const br = Number(b.avgRating) || 0;
      if (br !== ar) return br - ar;
      return (Number(b.ratingCount) || 0) - (Number(a.ratingCount) || 0);
    };
    const byPriceLo = (a, b) => Number(a.price || 0) - Number(b.price || 0);
    const byPriceHi = (a, b) => Number(b.price || 0) - Number(a.price || 0);
    const bySortOrder = (a, b) =>
      (Number(a.sortOrder) || 0) - (Number(b.sortOrder) || 0);

    if (appliedSort === 'price_low') {
      list.sort(byPriceLo);
    } else if (appliedSort === 'price_high') {
      list.sort(byPriceHi);
    } else if (appliedHighlyReordered && list.length > 0) {
      list.sort(bySales);
    } else if (quickFilter === 'bestseller') {
      list.sort(bySales);
    } else if (quickFilter === 'rated') {
      list.sort(byRating);
    } else {
      list.sort(bySortOrder);
    }
    return list;
  }, [
    displayedMenuItems,
    quickFilter,
    isDessertItem,
    appliedDietary,
    appliedHighlyReordered,
    appliedSort,
  ]);

  const searchMatchedMenuItems = useMemo(() => {
    if (!searchKeywordLower) return [];
    return menuItems.filter(it => {
      const haystack = [
        it?.itemName,
        it?.description,
        ...(Array.isArray(it?.tags) ? it.tags : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(searchKeywordLower);
    });
  }, [menuItems, searchKeywordLower]);

  const orderMoreMenuItems = useMemo(() => {
    if (!searchKeywordLower) return filteredMenuForDisplay;
    if (searchMatchedMenuItems.length === 0) return menuItems;
    const matchedIds = new Set(searchMatchedMenuItems.map(it => String(it.id)));
    return menuItems.filter(it => !matchedIds.has(String(it.id)));
  }, [filteredMenuForDisplay, menuItems, searchKeywordLower, searchMatchedMenuItems]);

  useEffect(() => {
    if (!ownerId || !searchKeywordLower || searchInitAppliedRef.current) return;
    if (!Array.isArray(menuItems) || menuItems.length === 0) return;
    const matched = menuItems.filter(it => {
      const haystack = [
        it?.itemName,
        it?.description,
        ...(Array.isArray(it?.tags) ? it.tags : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(searchKeywordLower);
    });
    if (matched.length === 0) return;
    searchInitAppliedRef.current = true;
    setSelectedItems(prev => {
      const hasSelected = Object.values(prev || {}).some(v => Number(v) > 0);
      if (hasSelected) return prev;
      const first = matched[0];
      if (!first?.id) return prev;
      return { [first.id]: 1 };
    });
    // Keep full menu visible for "Order More"; do not force a single category.
  }, [ownerId, menuItems, searchKeywordLower]);

  const filterActiveCount = useMemo(() => {
    let n = 0;
    if (appliedSort !== 'default') n += 1;
    if (appliedDietary !== 'all') n += 1;
    if (appliedHighlyReordered) n += 1;
    return n;
  }, [appliedSort, appliedDietary, appliedHighlyReordered]);

  const openFilterModal = () => {
    setDraftSort(appliedSort);
    setDraftDietary(appliedDietary);
    setDraftHighlyReordered(appliedHighlyReordered);
    setFilterSortModalVisible(true);
  };

  const applyFilterModal = () => {
    setAppliedSort(draftSort);
    setAppliedDietary(draftDietary);
    setAppliedHighlyReordered(draftHighlyReordered);
    setFilterSortModalVisible(false);
  };

  const clearAllFilters = () => {
    setDraftSort('default');
    setDraftDietary('all');
    setDraftHighlyReordered(false);
    setAppliedSort('default');
    setAppliedDietary('all');
    setAppliedHighlyReordered(false);
    setQuickFilter(null);
    setFilterSortModalVisible(false);
  };

  const toggleQuick = key => {
    setQuickFilter(prev => (prev === key ? null : key));
    if (key === 'bestseller' || key === 'rated') {
      setAppliedHighlyReordered(false);
    }
  };

  const listSectionTitle = useMemo(() => {
    if (quickFilter === 'desserts') return 'Desserts';
    if (quickFilter === 'bestseller') return 'Best sellers';
    if (quickFilter === 'rated') return 'Top rated';
    if (selectedCategoryId && selectedCategoryId !== 'all') {
      return (
        menuCategories.find(c => c.id === selectedCategoryId)?.label || 'Menu'
      );
    }
    return 'Most Ordered';
  }, [quickFilter, selectedCategoryId, menuCategories]);

  // Sections for modal: all categories with their items, then uncategorized
  const menuSectionsForModal = useMemo(() => {
    const uncategorized = menuItems.filter(
      i => !i.categoryId && !i.category?.id,
    );
    const sections = [];
    if (
      Array.isArray(menuCategoriesFromApi) &&
      menuCategoriesFromApi.length > 0
    ) {
      menuCategoriesFromApi.forEach(cat => {
        const data = menuItems.filter(
          i => (i.categoryId || i.category?.id) === cat.id,
        );
        if (data.length > 0) {
          sections.push({ id: cat.id, title: cat.name, data });
        }
      });
    }
    if (uncategorized.length > 0) {
      sections.push({
        id: 'uncategorized',
        title: 'Uncategorized',
        data: uncategorized,
      });
    }
    if (sections.length === 0 && menuItems.length > 0) {
      sections.push({ id: 'all', title: 'Most Ordered', data: menuItems });
    }
    return sections;
  }, [menuItems, menuCategoriesFromApi]);

  // Category options for modal first screen: All + each section (or just one if single "Most Ordered")
  const menuModalCategoryOptions = useMemo(() => {
    if (menuItems.length === 0) return [];
    if (
      menuSectionsForModal.length === 1 &&
      menuSectionsForModal[0].id === 'all'
    ) {
      return [{ id: 'all', title: 'Most Ordered', count: menuItems.length }];
    }
    const options = [{ id: 'all', title: 'All', count: menuItems.length }];
    menuSectionsForModal.forEach(s => {
      options.push({ id: s.id, title: s.title, count: s.data.length });
    });
    return options;
  }, [menuSectionsForModal, menuItems.length]);

  useEffect(() => {
    if (Array.isArray(promotionMenuItems) && promotionMenuItems.length > 0) {
      setMenuItems(promotionMenuItems);
      setMenuLoading(false);
      // Still fetch owner categories so the category modal/filter works for promotions
      if (ownerId) {
        getMenuByUserId(ownerId)
          .then(({ categories }) => setMenuCategoriesFromApi(categories || []))
          .catch(() => setMenuCategoriesFromApi([]));
      } else {
        setMenuCategoriesFromApi([]);
      }
      const initial = {};
      promotionMenuItems.forEach((m, idx) => {
        if (m?.id) initial[m.id] = idx === 0 ? 1 : 0;
      });
      setSelectedItems(initial);
      return;
    }
    if (singleMenuItem && singleMenuItem.id) {
      setMenuItems([singleMenuItem]);
      setMenuLoading(false);
      setSelectedItems({ [singleMenuItem.id]: 1 });
      return;
    }
    if (!ownerId) return;
    setMenuLoading(true);
    setSelectedItems({});
    getMenuByUserId(ownerId)
      .then(({ menu, categories }) => {
        setMenuItems(menu || []);
        setMenuCategoriesFromApi(categories || []);
      })
      .catch(() => {
        setMenuItems([]);
        setMenuCategoriesFromApi([]);
      })
      .finally(() => setMenuLoading(false));
  }, [ownerId, singleMenuItem?.id, promotionMenuItems]);

  const FilterBar = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.filterContainer}
      contentContainerStyle={styles.filterContent}
    >
      <TouchableOpacity
        style={[
          styles.filterChip,
          filterActiveCount > 0 && styles.filterChipActive,
        ]}
        onPress={openFilterModal}
      >
        <Icon
          name="tune"
          size={18}
          color={filterActiveCount > 0 ? '#F5A623' : '#444'}
        />
        <Text
          style={[
            styles.filterText,
            filterActiveCount > 0 && styles.filterTextActive,
          ]}
        >
          Filters{filterActiveCount > 0 ? ` (${filterActiveCount})` : ''}
        </Text>
        <Icon
          name="chevron-down"
          size={18}
          color={filterActiveCount > 0 ? '#F5A623' : '#444'}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterChip,
          quickFilter === 'desserts' && styles.filterChipActive,
        ]}
        onPress={() => toggleQuick('desserts')}
      >
        <Icon
          name="cupcake"
          size={18}
          color={quickFilter === 'desserts' ? '#F5A623' : '#444'}
        />
        <Text
          style={[
            styles.filterText,
            quickFilter === 'desserts' && styles.filterTextActive,
          ]}
        >
          Desserts
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterChip,
          quickFilter === 'bestseller' && styles.filterChipActive,
        ]}
        onPress={() => toggleQuick('bestseller')}
      >
        <Icon
          name="trending-up"
          size={18}
          color={quickFilter === 'bestseller' ? '#F5A623' : '#444'}
        />
        <Text
          style={[
            styles.filterText,
            quickFilter === 'bestseller' && styles.filterTextActive,
          ]}
        >
          BestSeller
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.filterChip,
          quickFilter === 'rated' && styles.filterChipActive,
        ]}
        onPress={() => toggleQuick('rated')}
      >
        <Icon
          name="star"
          size={18}
          color={quickFilter === 'rated' ? '#FFC107' : '#444'}
        />
        <Text
          style={[
            styles.filterText,
            quickFilter === 'rated' && styles.filterTextActive,
          ]}
        >
          Rated
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );

  const setItemQty = (id, qty) => {
    const n = Math.max(
      0,
      typeof qty === 'function' ? qty(selectedItems[id] || 0) : qty,
    );
    setSelectedItems(prev =>
      n === 0 ? { ...prev, [id]: undefined } : { ...prev, [id]: n },
    );
  };

  const totalCount = Object.values(selectedItems).reduce(
    (a, b) => a + (b || 0),
    0,
  );
  const staticTotal = Object.values(staticQuantities).reduce(
    (a, b) => a + (b || 0),
    0,
  );

  const setStaticQty = (idx, deltaOrVal) => {
    setStaticQuantities(prev => {
      const cur = prev[idx] ?? 0;
      const next =
        typeof deltaOrVal === 'function'
          ? Math.max(0, deltaOrVal(cur))
          : Math.max(0, deltaOrVal);
      if (next === 0 && cur === 0) return prev;
      return { ...prev, [idx]: next };
    });
  };

  const handleAddToCart = () => {
    const menuMap = new Map(menuItems.map(m => [m.id, m]));
    const items = Object.entries(selectedItems)
      .filter(([, q]) => q > 0)
      .map(([menuItemId, quantity]) => {
        const menuItem = menuMap.get(menuItemId);
        return {
          menuItemId,
          itemName: menuItem?.itemName || 'Item',
          price: menuItem?.price ?? 0,
          quantity,
          currency: 'GBP',
          imageUrl: menuItem?.imageUrl,
        };
      });
    if (items.length === 0) {
      Alert.alert('Add items', 'Select at least one item and quantity.');
      return;
    }
    if (!ownerId) return;
    navigation.navigate('CartDetailsScreen', {
      ownerId,
      items,
      ownerName: resTitle,
    });
  };

  const hasDynamicMenu = ownerId && menuItems.length > 0;
  /** Real restaurant page but API returned no menu — never use demo static counts here */
  const ownerHasNoMenu = !!ownerId && !hasDynamicMenu;

  const getItemsForHomeFour = () => {
    if (hasDynamicMenu) {
      const menuMap = new Map(menuItems.map(m => [m.id, m]));
      return Object.entries(selectedItems)
        .filter(([, q]) => q > 0)
        .map(([menuItemId, quantity]) => {
          const menuItem = menuMap.get(menuItemId);
          return {
            menuItemId,
            itemName: menuItem?.itemName || 'Item',
            price: menuItem?.price ?? 0,
            quantity,
            currency: 'GBP',
            imageUrl: menuItem?.imageUrl,
          };
        });
    }
    if (ownerId) {
      return [];
    }
    return [0, 1, 2]
      .filter(idx => (staticQuantities[idx] ?? 0) > 0)
      .map(idx => ({
        menuItemId: `static-${idx}`,
        itemName: 'Tandoori Chicken',
        price: 12.99,
        quantity: staticQuantities[idx] ?? 0,
        currency: 'GBP',
      }));
  };

  const itemsForCheckout = getItemsForHomeFour();
  const displayCount = hasDynamicMenu
    ? totalCount
    : ownerId
    ? totalCount
    : staticTotal;
  const cartBarDisabled = ownerHasNoMenu;

  const renderMenuItemCard = item => {
    const qty = selectedItems[item.id] || 0;
    const to = Number(item.timesOrdered) || 0;
    return (
      <View key={item.id} style={styles.menuItemCard}>
        <View style={styles.itemInfo}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemTitle}>{item.itemName}</Text>
            {item.dietaryType === 'veg' ? (
              <View style={[styles.dietDot, styles.dietDotVeg]} />
            ) : item.dietaryType === 'egg' ? (
              <Icon name="egg" size={16} color="#C4A000" />
            ) : item.dietaryType === 'non_veg' ? (
              <View style={[styles.dietDot, styles.dietDotNonVeg]} />
            ) : null}
          </View>
          <Text style={styles.itemPrice}>
            £{Number(item.price || 0).toFixed(2)}
            {to > 0 ? (
              <Text style={styles.timesOrderedBadge}> · {to}x sold</Text>
            ) : null}
            {item.avgRating != null && Number(item.avgRating) > 0 ? (
              <Text style={styles.avgRatingBadge}>
                {' '}
                ★ {Number(item.avgRating).toFixed(1)}
                {Number(item.ratingCount) > 0 ? ` (${item.ratingCount})` : ''}
              </Text>
            ) : null}
          </Text>
          {item.description ? (
            <Text style={styles.itemDesc} numberOfLines={3}>
              {item.description}
            </Text>
          ) : null}
        </View>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.imageUrl || DEFAULT_IMAGE }}
            style={styles.itemImage}
          />
          <View style={styles.stepperContainer}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setItemQty(item.id, n => n - 1)}
              disabled={qty === 0}
            >
              <Icon
                name="minus"
                size={18}
                color={qty === 0 ? '#fff' : '#FFF'}
              />
            </TouchableOpacity>
            <Text style={styles.stepperVal}>{qty}</Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => setItemQty(item.id, n => n + 1)}
            >
              <Icon name="plus" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => (onBack ? onBack() : navigation.goBack())}
          style={styles.backBtn}
        >
          <Icon name="chevron-left" size={20} color="#FFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        {/* <Icon name="dots-vertical" size={24} color="#666" /> */}
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.resInfoSection}>
          <View style={styles.resTitleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.resTitle}>{resTitle}</Text>
              <Text style={styles.resSubTitle}>{resLocation || '—'}</Text>
            </View>

            {/* Right side container to stack badge and text */}
            <View style={styles.ratingContainer}>
              <View style={styles.ratingBadge}>
                <Text style={styles.ratingText}>{ratingText}</Text>
                <Icon name="star" size={14} color="#FFF" />
              </View>
              <Text style={styles.ratingCount}>{ratingCountText}</Text>
            </View>
          </View>
          <View style={styles.divider} />
        </View>

        <FilterBar />

        {!!openCloseBannerText && (
          <View style={styles.openCloseBanner}>
            <Text style={styles.openCloseBannerText} numberOfLines={2}>
              {openCloseBannerText}
            </Text>
          </View>
        )}

        {menuLoading ? (
          <View style={styles.menuLoading}>
            <ActivityIndicator size="large" color="#F5A623" />
            <Text style={styles.menuLoadingText}>Loading menu...</Text>
          </View>
        ) : hasDynamicMenu ? (
          <>
            <Text style={styles.sectionHeading}>{listSectionTitle}</Text>
            {filteredMenuForDisplay.length === 0 ? (
              <View style={styles.emptyFilterWrap}>
                <Text style={styles.emptyFilterText}>
                  {quickFilter === 'desserts'
                    ? 'No dessert-style items here. Use “Menu” to browse all categories, or clear Desserts.'
                    : appliedHighlyReordered
                    ? 'No items with order history yet. Try turning off “Highly reordered”.'
                    : appliedDietary !== 'all'
                    ? 'No items match this dietary filter.'
                    : 'No items in this category.'}
                </Text>
              </View>
            ) : null}
            {searchKeywordLower && searchMatchedMenuItems.length > 0 ? (
              <>
                <Text style={styles.subSectionHeading}>
                  Search match: "{searchKeyword}"
                </Text>
                {searchMatchedMenuItems.map(renderMenuItemCard)}
                <View style={styles.sectionDividerWrap}>
                  <View style={styles.sectionDividerLine} />
                </View>
              </>
            ) : null}
            {searchKeywordLower && orderMoreMenuItems.length > 0 ? (
              <>
                <Text style={styles.subSectionHeading}>Order More</Text>
                {orderMoreMenuItems.map(renderMenuItemCard)}
              </>
            ) : !searchKeywordLower ? (
              filteredMenuForDisplay.map(renderMenuItemCard)
            ) : null}
          </>
        ) : ownerId ? (
          <View style={styles.emptyMenu}>
            <Text style={styles.emptyMenuText}>
              No menu items yet. Restaurant owner can add menu in profile.
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionHeading}>Most Ordered</Text>
            {[0, 1, 2].map(idx => {
              const qty = staticQuantities[idx] ?? 0;
              return (
                <View key={idx} style={styles.menuItemCard}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemTitle}>Tandoori Chicken</Text>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Icon key={s} name="star" size={16} color="#F5A623" />
                      ))}
                    </View>
                    <Text style={styles.itemPrice}>$12.99</Text>
                    <Text style={styles.itemDesc} numberOfLines={3}>
                      A cozy restaurant serving fresh, delicious food.
                    </Text>
                  </View>
                  <View style={styles.imageContainer}>
                    <Image
                      source={{
                        uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
                      }}
                      style={styles.itemImage}
                    />
                    <View style={styles.stepperContainer}>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => setStaticQty(idx, n => n - 1)}
                        disabled={qty === 0}
                      >
                        <Icon
                          name="minus"
                          size={18}
                          color={qty === 0 ? '#999' : '#FFF'}
                        />
                      </TouchableOpacity>
                      <Text style={styles.stepperVal}>{qty}</Text>
                      <TouchableOpacity
                        style={styles.stepperBtn}
                        onPress={() => setStaticQty(idx, n => n + 1)}
                      >
                        <Icon name="plus" size={18} color="#FFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </>
        )}

        <View style={styles.bottomSpace} />
      </ScrollView>

      <View style={styles.footerOverlay}>
        <View style={styles.arrowContainer}>
          <Icon name="chevron-down" size={40} color="#333" />
        </View>
        <TouchableOpacity
          style={[styles.cartBar, cartBarDisabled && styles.cartBarDisabled]}
          disabled={cartBarDisabled}
          onPress={() => {
            if (cartBarDisabled) return;
            navigation.navigate('HomeFourScreen', {
              ownerId: hasDynamicMenu ? ownerId : null,
              items: itemsForCheckout,
              ownerName: resTitle,
              returnToKey: route.key,
            });
          }}
        >
          <Text
            style={[
              styles.cartText,
              cartBarDisabled && styles.cartTextDisabled,
            ]}
          >
            {ownerHasNoMenu
              ? '0 item added'
              : displayCount > 0
              ? `${displayCount} item${displayCount !== 1 ? 's' : ''} added`
              : 'Add to Cart'}
          </Text>
          <View style={styles.cartIconCircle}>
            <Icon name="arrow-right" size={18} color="#F5A623" />
          </View>
        </TouchableOpacity>
        <View style={styles.searchRow}>
          {/* <View style={styles.bottomSearch}>
            <Icon name="magnify" size={22} color="#999" />
            <TextInput
              placeholder={"Search 'prawns curry'"}
              style={styles.bottomInput}
            />
          </View> */}
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => setMenuModalVisible(true)}
          >
            <Icon name="magnify" size={20} color="#FFF" />
            <Text style={styles.menuBtnText}>Menu</Text>
          </TouchableOpacity>
        </View>
        {searchKeyword ? (
          <Text style={styles.searchHintText}>
            Showing menu matches for "{searchKeyword}".
          </Text>
        ) : null}
      </View>

      {/* Menu modal: category list only – tap one to filter main screen and close */}
      <Modal
        visible={menuModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setMenuModalVisible(false)}
      >
        <Pressable
          style={styles.menuModalOverlay}
          onPress={() => setMenuModalVisible(false)}
        >
          <Pressable
            style={styles.menuModalSheet}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.menuModalHandle} />
            <ScrollView
              style={styles.menuModalScroll}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.menuModalScrollContent}
            >
              {menuModalCategoryOptions.length === 0 ||
              menuItems.length === 0 ? (
                <Text style={styles.menuModalEmpty}>No menu items yet.</Text>
              ) : (
                <>
                  {menuModalCategoryOptions.map(opt => (
                    <TouchableOpacity
                      key={opt.id}
                      style={styles.menuModalRow}
                      onPress={() => {
                        setSelectedCategoryId(opt.id);
                        setMenuModalVisible(false);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.menuModalRowLabel} numberOfLines={1}>
                        {opt.title}
                      </Text>
                      <Text style={styles.menuModalRowCount}>{opt.count}</Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
            <View style={styles.menuModalFooter}>
              <TouchableOpacity
                style={styles.menuModalCloseBtn}
                onPress={() => setMenuModalVisible(false)}
              >
                <Icon name="close" size={20} color="#FFF" />
                <Text style={styles.menuModalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={filterSortModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFilterSortModalVisible(false)}
      >
        <Pressable
          style={styles.filterModalOverlay}
          onPress={() => setFilterSortModalVisible(false)}
        >
          <Pressable
            style={[
              styles.filterModalSheet,
              { paddingBottom: Math.max(20, insets.bottom + 16) },
            ]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.menuModalHandle} />
            <Text style={styles.filterModalTitle}>Filters and Sorting</Text>

            <View style={styles.filterSectionCard}>
              <Text style={styles.filterSectionHeading}>Sort by</Text>
              <View style={styles.filterChipsRow}>
                {[
                  { id: 'price_low', label: 'Price · low to high' },
                  { id: 'price_high', label: 'Price · high to low' },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.filterOptionChip,
                      draftSort === opt.id && styles.filterOptionChipOn,
                    ]}
                    onPress={() => {
                      setDraftSort(draftSort === opt.id ? 'default' : opt.id);
                      if (opt.id) setDraftHighlyReordered(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.filterOptionChipText,
                        draftSort === opt.id && styles.filterOptionChipTextOn,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSectionCard}>
              <Text style={styles.filterSectionHeading}>
                Veg / Non-veg preference
              </Text>
              <View style={styles.filterChipsRow}>
                {[
                  {
                    id: 'veg',
                    label: 'Veg',
                    icon: 'circle',
                    iconColor: '#2E7D32',
                  },
                  {
                    id: 'egg',
                    label: 'Egg',
                    icon: 'egg',
                    iconColor: '#C4A000',
                  },
                  {
                    id: 'non_veg',
                    label: 'Non-veg',
                    icon: 'triangle',
                    iconColor: '#C62828',
                  },
                ].map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.filterOptionChip,
                      draftDietary === opt.id && styles.filterOptionChipOn,
                    ]}
                    onPress={() =>
                      setDraftDietary(draftDietary === opt.id ? 'all' : opt.id)
                    }
                  >
                    <Icon
                      name={opt.icon}
                      size={18}
                      color={draftDietary === opt.id ? '#FFF' : opt.iconColor}
                    />
                    <Text
                      style={[
                        styles.filterOptionChipText,
                        draftDietary === opt.id &&
                          styles.filterOptionChipTextOn,
                      ]}
                    >
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.filterSectionCard}>
              <Text style={styles.filterSectionHeading}>Top picks</Text>
              <View style={styles.filterChipsRow}>
                <TouchableOpacity
                  style={[
                    styles.filterOptionChip,
                    draftHighlyReordered && styles.filterOptionChipGreen,
                  ]}
                  onPress={() => {
                    setDraftHighlyReordered(v => !v);
                    if (!draftHighlyReordered) {
                      setDraftSort('default');
                    }
                  }}
                >
                  <Icon
                    name="repeat"
                    size={18}
                    color={draftHighlyReordered ? '#FFF' : '#2E7D32'}
                  />
                  <Text
                    style={[
                      styles.filterOptionChipText,
                      draftHighlyReordered && styles.filterOptionChipTextOn,
                    ]}
                  >
                    Highly reordered
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.filterModalActions}>
              <TouchableOpacity
                style={styles.filterClearBtn}
                onPress={clearAllFilters}
              >
                <Text style={styles.filterClearBtnText}>Clear all</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.filterApplyBtn}
                onPress={applyFilterModal}
              >
                <Text style={styles.filterApplyBtnText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  backText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  resInfoSection: { paddingHorizontal: 15, marginTop: 10 },
  resTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  resTitle: { fontSize: 24, fontWeight: 'bold', color: '#222' },
  resSubTitle: { fontSize: 14, color: '#666', marginTop: 4 },
  ratingContainer: {
    alignItems: 'flex-end',
    marginLeft: 10,
  },
  ratingBadge: {
    backgroundColor: '#10793F',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  ratingText: {
    color: '#FFF',
    fontWeight: 'bold',
    marginRight: 4,
    fontSize: 14,
  },
  ratingCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 2,
  },
  divider: {
    height: 4,
    backgroundColor: '#F0F4F7',
    width: '100%',
    marginTop: 15,
    borderRadius: 2,
  },
  menuLoading: { paddingVertical: 40, alignItems: 'center' },
  menuLoadingText: { marginTop: 12, fontSize: 14, color: '#666' },
  emptyMenu: { padding: 20, alignItems: 'center' },
  emptyMenuText: { fontSize: 14, color: '#666', textAlign: 'center' },
  // NEW FILTER STYLES
  filterContainer: {
    marginVertical: 15,
    paddingLeft: 15,
  },
  filterContent: {
    paddingRight: 30,
    alignItems: 'center',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: '#FFF',
  },
  filterText: {
    fontSize: 14,
    color: '#444',
    marginHorizontal: 6,
  },
  filterTextActive: { color: '#F5A623', fontWeight: '700' },
  filterChipActive: {
    borderColor: '#F5A623',
    backgroundColor: 'rgba(245,166,35,0.08)',
  },
  emptyFilterWrap: { paddingHorizontal: 20, paddingVertical: 24 },
  emptyFilterText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  dietDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
    borderWidth: 1.5,
  },
  dietDotVeg: {
    borderColor: '#2E7D32',
    backgroundColor: '#E8F5E9',
  },
  dietDotNonVeg: {
    borderColor: '#C62828',
    backgroundColor: '#FFEBEE',
  },
  timesOrderedBadge: { fontSize: 13, color: '#2E7D32', fontWeight: '600' },
  avgRatingBadge: { fontSize: 13, color: '#F5A623', fontWeight: '600' },
  filterModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  filterModalSheet: {
    backgroundColor: '#F5F5F5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    maxHeight: '85%',
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
    marginBottom: 16,
  },
  filterSectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  filterSectionHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 10,
  },
  filterChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  filterOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FFF',
  },
  filterOptionChipOn: {
    borderColor: '#F5A623',
    backgroundColor: '#F5A623',
  },
  filterOptionChipGreen: {
    borderColor: '#2E7D32',
    backgroundColor: '#2E7D32',
  },
  filterOptionChipText: { fontSize: 14, color: '#222', fontWeight: '500' },
  filterOptionChipTextOn: { color: '#FFF', fontWeight: '700' },
  filterModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  filterClearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#FFE4CC',
    alignItems: 'center',
  },
  filterClearBtnText: { fontSize: 16, fontWeight: '700', color: '#F5A623' },
  filterApplyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F5A623',
    alignItems: 'center',
  },
  filterApplyBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  openCloseBanner: {
    marginHorizontal: 15,
    marginTop: -4,
    marginBottom: 12,
    backgroundColor: '#F5A623',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  openCloseBannerText: {
    color: '#111',
    fontSize: 13,
    fontWeight: '700',
  },
  sectionHeading: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#222',
    paddingHorizontal: 15,
    marginVertical: 15,
  },
  subSectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#222',
    paddingHorizontal: 15,
    marginTop: 4,
    marginBottom: 12,
  },
  sectionDividerWrap: {
    paddingHorizontal: 15,
    marginTop: 4,
    marginBottom: 10,
  },
  sectionDividerLine: {
    height: 1,
    backgroundColor: '#E6E6E6',
  },
  menuItemCard: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 25,
    justifyContent: 'space-between',
  },
  itemInfo: { width: '60%' },
  itemTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  starsRow: { flexDirection: 'row', marginVertical: 5 },
  itemPrice: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 5,
  },
  itemDesc: { fontSize: 13, color: '#777', lineHeight: 18 },
  imageContainer: { width: '35%', alignItems: 'center' },
  itemImage: {
    width: '100%',
    height: 110,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F5A623',
  },
  stepperContainer: {
    position: 'absolute',
    bottom: -12,
    flexDirection: 'row',
    backgroundColor: '#F5A623',
    borderRadius: 8,
    alignItems: 'center',
    padding: 4,
    elevation: 3,
  },
  stepperBtn: { paddingHorizontal: 5 },
  stepperVal: {
    color: '#FFF',
    fontWeight: 'bold',
    marginHorizontal: 8,
  },
  bottomSpace: { height: 180 },
  footerOverlay: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#FFF',
    paddingHorizontal: 15,
    paddingBottom: 20,
  },
  arrowContainer: { alignItems: 'center', marginBottom: 10 },
  cartBarDisabled: {
    opacity: 0.55,
  },
  cartTextDisabled: {
    opacity: 0.9,
  },
  cartBar: {
    backgroundColor: '#F5A623',
    height: 55,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  cartText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  cartIconCircle: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    marginLeft: 15,
    padding: 2,
  },
  searchRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  searchHintText: {
    marginTop: 8,
    color: '#6B4A00',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomSearch: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F0F0',
    height: 45,
    borderRadius: 10,
    paddingHorizontal: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  bottomInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  menuBtn: {
    backgroundColor: '#424242',
    flexDirection: 'row',
    alignItems: 'center',
    height: 45,
    paddingHorizontal: 15,
    borderRadius: 10,
  },
  menuBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 5 },
  // Menu modal (bottom sheet)
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  menuModalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '88%',
    minHeight: 280,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  menuModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#DDD',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  menuModalScroll: {
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  menuModalScrollContent: { paddingBottom: 16 },
  menuModalSection: { marginBottom: 16 },
  menuModalSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    paddingLeft: 4,
  },
  menuModalItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#F8F8F8',
    borderRadius: 10,
    marginBottom: 6,
  },
  menuModalItemThumb: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#EEE',
  },
  menuModalItemInfo: { flex: 1, marginLeft: 12 },
  menuModalItemName: { fontSize: 15, fontWeight: '600', color: '#222' },
  menuModalItemPrice: { fontSize: 14, color: '#666', marginTop: 2 },
  menuModalStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5A623',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  menuModalStepperBtn: { paddingHorizontal: 6 },
  menuModalStepperVal: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 14,
    minWidth: 20,
    textAlign: 'center',
  },
  menuModalEmpty: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    paddingVertical: 24,
  },
  menuModalBackRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    backgroundColor: '#F8F8F8',
  },
  menuModalBackText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginLeft: 4,
  },
  menuModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  menuModalRowSelected: {
    backgroundColor: 'rgba(233, 30, 99, 0.08)',
  },
  menuModalRowLabel: {
    fontSize: 16,
    color: '#444',
    flex: 1,
  },
  menuModalRowLabelSelected: {
    color: '#E91E63',
    fontWeight: '600',
  },
  menuModalRowCount: {
    fontSize: 15,
    color: '#666',
    marginLeft: 8,
  },
  menuModalRowCountSelected: {
    color: '#E91E63',
    fontWeight: '600',
  },
  menuModalRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuModalFooter: {
    paddingHorizontal: 20,
    paddingTop: 16,
    alignItems: 'flex-end',
  },
  menuModalCloseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#424242',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  menuModalCloseText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default HomeThreeScreen;
