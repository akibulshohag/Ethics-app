import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  CategoryFeaturedHeroCard,
  CategoryTrendingCard,
} from '../components/CategoryFeedCards';
import { useDiscoveryData } from '../hooks/useDiscoveryData';
import { browseRestaurantsByCategory } from '../services/menuBrowseService';
import { getFeatured } from '../services/featuredService';
import {
  restaurantMatchesCategory,
  sortRestaurants,
} from '../utils/discoveryFilters';
import { matchRestaurantQuery } from '../services/discoveryService';
import { openDiscoveryMedia } from '../utils/openDiscoveryMedia';
import { safeImageUri } from '../utils/helper';
import {
  resolveCategoryChipNavigation,
  resolveDiscoveryCategoryFromFilter,
} from '../constants/menuDiscoveryCategories';
import { buildHomeMenuCategoryChips } from '../constants/homeMenuCategories';
import { UK_DEFAULT_RADIUS_KM } from '../utils/ukPostcode';
import logo from '../assets/logo.png';
import { HEADER_LOGO_STYLE } from '../constants/headerLogo';

const FEED_HORIZONTAL_PAD = 15;

const DEFAULT_IMG =
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600';

const formatViews = n => {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return '0 views';
  return `${new Intl.NumberFormat('en-US').format(x)} views`;
};

const formatOrders = n => {
  const x = Number(n);
  if (!Number.isFinite(x) || x <= 0) return '';
  return `${x} order${x === 1 ? '' : 's'}`;
};

const rowHasVideo = row =>
  row?.mediaType === 'short' || row?.mediaType === 'video';

const rowViewsLabel = row => {
  if (Number(row?.totalViews) > 0) return formatViews(row.totalViews);
  return formatOrders(row?.orderCount);
};

const rowLocationLabel = row => {
  const addr = String(row?.shortAddress || row?.address || '').trim();
  if (!addr) return '';
  return addr.split(',')[0]?.trim() || addr;
};

const rowMetaLine = (row, categoryLabel) => {
  const views = rowViewsLabel(row);
  const r = Number(row?.rating || 0);
  const rc = Number(row?.reviewCount || 0);
  return `${categoryLabel} · ${views || '0 views'} · ★ ${r.toFixed(1)} (${rc})`;
};

const matchRowQuery = (row, query) => {
  const q = String(query || '').trim();
  if (!q) return true;
  if (Array.isArray(row?.menu) && row.menu.length > 0) {
    return matchRestaurantQuery(row, q);
  }
  const hay = [
    row?.name,
    row?.address,
    row?.shortAddress,
    ...(Array.isArray(row?.matchingItems)
      ? row.matchingItems.flatMap(m => [
          m?.itemName,
          m?.categoryName,
          m?.description,
        ])
      : []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q.toLowerCase());
};

const parseGlobalFeatured = raw => {
  const campaign = Array.isArray(raw?.featured)
    ? raw.featured.find(c => c?.video?.videoUrl || c?.video?.thumbnailUrl)
    : raw?.featured?.video
    ? raw.featured
    : null;
  if (!campaign?.video) return null;
  const video = campaign.video;
  const owner = campaign.user || video.user || {};
  const ownerId = String(owner?.id || video.userId || '').trim();
  if (!ownerId) return null;
  return {
    id: ownerId,
    name: owner.nickname || owner.name || 'Featured',
    address: owner.address || campaign.areaName || '',
    mediaType: 'video',
    mediaId: String(video.id || ''),
    mediaUrl: video.videoUrl || '',
    mediaThumb: video.thumbnailUrl || video.videoUrl || DEFAULT_IMG,
    totalViews: Number(video.viewCount || 0),
    rating: Number(owner.averageRating ?? owner.rating ?? 0),
    reviewCount: Number(owner.reviewCount ?? owner.ratingCount ?? 0),
  };
};

const getProfileImageUri = u => {
  const firstPhoto =
    u?.photos?.[0] ?? (Array.isArray(u?.photos) ? u.photos[0] : null);
  const photo =
    u?.avatar ||
    (typeof firstPhoto === 'string' ? firstPhoto : firstPhoto?.src) ||
    null;
  return typeof photo === 'string' && photo.trim() ? photo.trim() : null;
};

export default function HomeSearchCategoryScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector(state => state.app?.user);
  const browseLocation = useSelector(state => state.app?.browseLocation);

  const resolvedCategory = useMemo(() => {
    const nav = resolveCategoryChipNavigation({
      key: route.params?.categoryKey,
      label: route.params?.categoryLabel,
    });
    const discovery = resolveDiscoveryCategoryFromFilter(nav.categoryKey);
    return {
      categoryKey: discovery?.key || nav.categoryKey,
      categoryLabel:
        route.params?.categoryLabel || nav.categoryLabel || discovery?.label,
    };
  }, [route.params?.categoryKey, route.params?.categoryLabel]);

  const categoryKey = resolvedCategory.categoryKey;
  const categoryLabel = resolvedCategory.categoryLabel;
  const nearLabel = String(route.params?.nearLabel || '').trim();

  const primaryLoc = useMemo(() => {
    const fromNear = nearLabel ? nearLabel.split(',')[0].trim() : '';
    if (fromNear) return fromNear;
    const addr = String(user?.address || user?.location || '').trim();
    const areaShort = addr ? addr.split(',')[0].trim() : '';
    return areaShort || addr || 'Set your address';
  }, [nearLabel, user?.address, user?.location]);

  const locationOpts = useMemo(() => {
    const lat =
      route.params?.viewerLat ?? browseLocation?.lat ?? user?.latitude;
    const lng =
      route.params?.viewerLng ?? browseLocation?.lng ?? user?.longitude;
    if (lat == null || lng == null) return undefined;
    const viewerLat = Number(lat);
    const viewerLng = Number(lng);
    if (!Number.isFinite(viewerLat) || !Number.isFinite(viewerLng)) {
      return undefined;
    }
    return { viewerLat, viewerLng };
  }, [
    route.params?.viewerLat,
    route.params?.viewerLng,
    browseLocation?.lat,
    browseLocation?.lng,
    user?.latitude,
    user?.longitude,
  ]);

  const { restaurants: cachedRestaurants, loading: cacheLoading } =
    useDiscoveryData(locationOpts);

  const homeMenuCategories = useMemo(() => buildHomeMenuCategoryChips(), []);

  const [browseRows, setBrowseRows] = useState([]);
  const [browseLoading, setBrowseLoading] = useState(true);
  const [globalFeatured, setGlobalFeatured] = useState(null);
  const [searchQuery, setSearchQuery] = useState(
    String(route.params?.initialQuery || '').trim(),
  );

  useEffect(() => {
    let cancelled = false;
    getFeatured()
      .then(res => {
        if (cancelled) return;
        setGlobalFeatured(parseGlobalFeatured(res));
      })
      .catch(() => {
        if (!cancelled) setGlobalFeatured(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setBrowseLoading(true);
    browseRestaurantsByCategory({
      category: categoryKey || categoryLabel,
      limit: 100,
      ...(locationOpts
        ? {
            nearbyLat: locationOpts.viewerLat,
            nearbyLng: locationOpts.viewerLng,
            radiusKm: UK_DEFAULT_RADIUS_KM,
          }
        : {}),
    })
      .then(res => {
        if (cancelled) return;
        setBrowseRows(Array.isArray(res?.restaurants) ? res.restaurants : []);
      })
      .catch(() => {
        if (!cancelled) setBrowseRows([]);
      })
      .finally(() => {
        if (!cancelled) setBrowseLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [categoryKey, categoryLabel, locationOpts]);

  const fallbackRows = useMemo(() => {
    return sortRestaurants(
      cachedRestaurants.filter(r => restaurantMatchesCategory(r, categoryKey)),
    );
  }, [cachedRestaurants, categoryKey]);

  const categoryRows = useMemo(() => {
    if (browseRows.length > 0) {
      return [...browseRows].sort(
        (a, b) =>
          Number(b?.matchingItemCount || 0) -
            Number(a?.matchingItemCount || 0) ||
          Number(b?.orderCount || 0) - Number(a?.orderCount || 0),
      );
    }
    return fallbackRows;
  }, [browseRows, fallbackRows]);

  const searchTrimmed = searchQuery.trim();
  const isSearching = searchTrimmed.length > 0;

  const filteredCategoryRows = useMemo(() => {
    if (!isSearching) return categoryRows;
    return categoryRows.filter(r => matchRowQuery(r, searchTrimmed));
  }, [categoryRows, isSearching, searchTrimmed]);

  const showFeatured = useMemo(() => {
    if (!globalFeatured) return false;
    if (!isSearching) return true;
    return matchRowQuery(globalFeatured, searchTrimmed);
  }, [globalFeatured, isSearching, searchTrimmed]);

  const trendingRows = useMemo(() => {
    const featuredOwnerId =
      showFeatured && globalFeatured?.id ? String(globalFeatured.id) : '';
    return filteredCategoryRows.filter(r => String(r.id) !== featuredOwnerId);
  }, [filteredCategoryRows, showFeatured, globalFeatured?.id]);

  const openRestaurantOrder = useCallback(
    row => {
      if (!row?.id) return;
      if (!user?.token) {
        navigation.navigate('HomeSevenScreen', {
          returnToOrder: true,
          ownerUserId: row.id,
        });
        return;
      }
      navigation.navigate('HomeThreeScreen', {
        ownerId: row.id,
        ownerName: row.name,
        location: row.address,
        searchKeyword: categoryLabel,
        discoveryCategoryKey: categoryKey,
      });
    },
    [navigation, user?.token, categoryLabel, categoryKey],
  );

  const openMedia = useCallback(
    row => {
      openDiscoveryMedia(navigation, row, {
        onFallback: openRestaurantOrder,
      });
    },
    [navigation, openRestaurantOrder],
  );

  const onRowPress = useCallback(
    row => {
      if (rowHasVideo(row)) openMedia(row);
      else openRestaurantOrder(row);
    },
    [openMedia, openRestaurantOrder],
  );

  const switchCategory = useCallback(
    cat => {
      const nav = resolveCategoryChipNavigation(cat);
      navigation.replace('HomeSearchCategoryScreen', {
        categoryKey: nav.categoryKey,
        categoryLabel: cat.label || nav.categoryLabel,
        nearLabel,
        viewerLat: locationOpts?.viewerLat,
        viewerLng: locationOpts?.viewerLng,
      });
    },
    [navigation, nearLabel, locationOpts],
  );

  const showCategoryLoader =
    (browseLoading || cacheLoading) &&
    !filteredCategoryRows.length &&
    !showFeatured;

  const searchScreenParams = useMemo(
    () => ({
      nearLabel: nearLabel || primaryLoc,
      initialQuery: searchTrimmed || categoryLabel,
      viewerLat: locationOpts.viewerLat,
      viewerLng: locationOpts.viewerLng,
    }),
    [
      nearLabel,
      primaryLoc,
      searchTrimmed,
      categoryLabel,
      locationOpts.viewerLat,
      locationOpts.viewerLng,
    ],
  );

  const openFullSearch = useCallback(
    (opts = {}) => {
      navigation.navigate('HomeSearchScreen', {
        ...searchScreenParams,
        nearLabel: nearLabel || primaryLoc,
        autoFocus: opts.autoFocus !== false,
        openFilters: !!opts.openFilters,
      });
    },
    [navigation, searchScreenParams, nearLabel, primaryLoc],
  );

  const openAccount = useCallback(() => {
    const role = (user?.role || '').toLowerCase();
    if (role === 'owner' || role === 'vendor') {
      navigation.navigate('BusinessProfileViewScreen');
    } else if (role === 'user') {
      navigation.navigate('PromotionScreen');
    } else if (role === 'admin') {
      navigation.getParent()?.navigate('Admin');
    } else {
      navigation.getParent()?.navigate('Library', { screen: 'ProfileScreen' });
    }
  }, [navigation, user?.role]);

  const openLocationPicker = useCallback(() => {
    navigation.navigate('HomeOneScreen');
  }, [navigation]);

  const profileImageUri = getProfileImageUri(user);

  return (
    <SafeAreaView style={styles.safeTop} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#F5A623" />
      <View style={styles.header}>
        <View style={styles.navRow}>
          <View style={styles.navLeft}>
            <TouchableOpacity
              style={styles.headerBackBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="arrow-left" size={24} color="#FFF" />
            </TouchableOpacity>
            <View style={styles.headerLeftCol}>
              <Image
                source={logo}
                style={styles.logoImage}
                resizeMode="contain"
              />
              <TouchableOpacity
                style={styles.eatixLocationRow}
                activeOpacity={0.85}
                onPress={openLocationPicker}
              >
                <Icon name="map-marker-outline" size={17} color="#FFF" />
                <View style={styles.eatixLocationLabelWrap}>
                  <Text style={styles.eatixLocationText} numberOfLines={1}>
                    {primaryLoc}
                  </Text>
                  <Icon
                    name="chevron-down"
                    size={16}
                    color="#FFF"
                    style={styles.eatixLocationChevron}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>
          {!(user?.token || user?.id) ? (
            <TouchableOpacity
              style={styles.navBtn}
              onPress={() => navigation.navigate('HomeSevenScreen')}
            >
              <Text style={styles.navBtnText}>Login {'>'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={openAccount}>
              {profileImageUri ? (
                <Image
                  source={{ uri: safeImageUri(profileImageUri) }}
                  style={styles.profileAvatar}
                />
              ) : (
                <Icon name="account-outline" size={28} color="#FFF" />
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.eatixSearchBlock}>
          <Text style={styles.eatixSearchHint}>
            Watch what's popular near you, tap to get it
          </Text>
          <View style={styles.eatixSearchRow}>
            <View style={styles.eatixSearchInputWrap}>
              <Icon name="magnify" size={22} color="#9CA3AF" />
              <TextInput
                style={styles.eatixSearchInput}
                placeholder="Search for restaurants or dishes..."
                placeholderTextColor="#9CA3AF"
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                onSubmitEditing={() => openFullSearch({ autoFocus: false })}
                autoFocus={!!route.params?.autoFocus}
              />
            </View>
            <TouchableOpacity
              style={styles.eatixFilterBtn}
              activeOpacity={0.85}
              onPress={() =>
                openFullSearch({ openFilters: true, autoFocus: false })
              }
            >
              <Icon name="tune-variant" size={22} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>{categoryLabel}</Text>
          {isSearching ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {filteredCategoryRows.length} result
              {filteredCategoryRows.length === 1 ? '' : 's'} for “
              {searchTrimmed}”
            </Text>
          ) : null}

          {homeMenuCategories.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
              style={styles.categoryScroll}
            >
              {homeMenuCategories.map(cat => {
                const active = cat.key === categoryKey;
                return (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categoryChip,
                      active && styles.categoryChipActive,
                    ]}
                    onPress={() => switchCategory(cat)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.categoryIconWrap}>
                      <Image
                        source={{ uri: cat.imageUri }}
                        style={styles.categoryIcon}
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryLabel,
                        active && styles.categoryLabelActive,
                      ]}
                      numberOfLines={2}
                    >
                      {cat.label}
                    </Text>
                    {active ? <View style={styles.categoryUnderline} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}

          {showFeatured ? (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Featured Near You</Text>
              </View>
              <CategoryFeaturedHeroCard
                channelName={globalFeatured.name}
                metaLine={rowMetaLine(globalFeatured, categoryLabel)}
                img={globalFeatured.mediaThumb}
                showPlayIcon
                onPress={() => onRowPress(globalFeatured)}
                onOrderPress={() => openRestaurantOrder(globalFeatured)}
              />
            </>
          ) : null}

          {showCategoryLoader ? (
            <ActivityIndicator
              size="large"
              color="#F5A623"
              style={{ marginTop: 24 }}
            />
          ) : trendingRows.length === 0 && !showFeatured ? (
            <Text style={styles.empty}>
              {isSearching
                ? `No “${searchTrimmed}” matches in ${categoryLabel} yet.`
                : `No restaurants with “${categoryLabel}” on the menu yet. Try another category.`}
            </Text>
          ) : trendingRows.length > 0 ? (
            <>
              <View style={styles.trendingHeader}>
                <View>
                  <Text style={styles.sectionTitle}>
                    {isSearching ? 'Search results' : 'Trending Near You'}
                  </Text>
                  <Text style={styles.sectionSubtitle}>
                    {isSearching
                      ? `${trendingRows.length} restaurant${
                          trendingRows.length === 1 ? '' : 's'
                        } with ${categoryLabel}`
                      : `Restaurants with ${categoryLabel} on the menu`}
                  </Text>
                </View>
              </View>
              {trendingRows.map(row => (
                <CategoryTrendingCard
                  key={row.id}
                  channelName={row.name}
                  img={row.mediaThumb}
                  views={rowViewsLabel(row)}
                  locationLabel={rowLocationLabel(row)}
                  rating={row.rating}
                  showPlayIcon={rowHasVideo(row)}
                  onPress={() => onRowPress(row)}
                  onOrderPress={() => openRestaurantOrder(row)}
                />
              ))}
            </>
          ) : null}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: '#F5A623' },
  body: { flex: 1, backgroundColor: '#FFF' },
  header: { backgroundColor: '#F5A623', padding: 15 },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  navLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  headerBackBtn: { padding: 2, marginRight: 4 },
  navBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  profileAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  navBtnText: { color: '#424242', fontSize: 12, fontWeight: '600' },
  headerLeftCol: {
    flex: 1,
    alignItems: 'flex-start',
  },
  logoImage: HEADER_LOGO_STYLE,
  eatixLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  eatixLocationLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    marginLeft: 5,
  },
  eatixLocationText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
    flexShrink: 1,
  },
  eatixLocationChevron: { marginLeft: 2, marginTop: 1 },
  eatixSearchBlock: {
    backgroundColor: '#FFF',
    paddingHorizontal: FEED_HORIZONTAL_PAD,
    paddingTop: 14,
    paddingBottom: 16,
  },
  eatixSearchHint: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 10,
    lineHeight: 18,
  },
  eatixSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  eatixSearchInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  eatixSearchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: '#111827',
    paddingVertical: 0,
  },
  eatixFilterBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#2D2D2D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: FEED_HORIZONTAL_PAD, paddingBottom: 32 },
  title: { fontSize: 22, fontWeight: '700', color: '#111', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#6B7280', marginTop: 4, marginBottom: 8 },
  categoryScroll: { marginBottom: 8, marginHorizontal: -4 },
  categoryRow: { gap: 6, paddingRight: 6, paddingVertical: 2 },
  categoryChip: {
    alignItems: 'center',
    width: 68,
    paddingTop: 4,
    paddingBottom: 5,
    paddingHorizontal: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ECECEC',
    backgroundColor: '#FFF',
  },
  categoryChipActive: { borderColor: '#F5A623' },
  categoryIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#F3F4F6',
  },
  categoryIcon: { width: '100%', height: '100%' },
  categoryLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: '#4E4E4E',
    marginTop: 3,
    textAlign: 'center',
    lineHeight: 11,
    width: '100%',
  },
  categoryLabelActive: { color: '#F5A623', fontWeight: '700' },
  categoryUnderline: {
    marginTop: 2,
    width: 20,
    height: 2,
    borderRadius: 2,
    backgroundColor: '#F5A623',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  trendingHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 12,
    marginBottom: 10,
  },
  empty: {
    fontSize: 15,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 40,
    lineHeight: 22,
  },
});
