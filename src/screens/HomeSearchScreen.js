import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import DiscoveryFilterSheet from '../components/DiscoveryFilterSheet';
import DiscoveryTrendingCard from '../components/DiscoveryTrendingCard';
import { useDiscoveryData } from '../hooks/useDiscoveryData';
import {
  DEFAULT_DISCOVERY_FILTERS,
  normalizeDiscoveryFilters,
  restaurantMatchesFilters,
  sortRestaurants,
} from '../utils/discoveryFilters';
import {
  getRecentSearches,
  addRecentSearch,
} from '../utils/searchRecentStorage';
import { matchRestaurantQuery } from '../services/discoveryService';
import { openDiscoveryMedia } from '../utils/openDiscoveryMedia';
import { resolveCategoryChipNavigation } from '../constants/menuDiscoveryCategories';

const formatViews = n => {
  const x = Number(n);
  if (!Number.isFinite(x) || x < 0) return '0 views';
  return `${new Intl.NumberFormat('en-US').format(x)} views`;
};

export default function HomeSearchScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector(state => state.app?.user);
  const nearLabel = String(route.params?.nearLabel || '').trim();
  const locationOpts = useMemo(
    () => ({
      viewerLat: route.params?.viewerLat ?? user?.latitude,
      viewerLng: route.params?.viewerLng ?? user?.longitude,
    }),
    [
      route.params?.viewerLat,
      route.params?.viewerLng,
      user?.latitude,
      user?.longitude,
    ],
  );
  const {
    restaurants,
    popularItems,
    categories,
    loading,
    refreshing,
  } = useDiscoveryData(locationOpts);

  const [query, setQuery] = useState(String(route.params?.initialQuery || ''));
  const [filters, setFilters] = useState(
    normalizeDiscoveryFilters(route.params?.filters || DEFAULT_DISCOVERY_FILTERS),
  );
  const [filterVisible, setFilterVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (route.params?.openFilters) {
        setFilterVisible(true);
        navigation.setParams({ openFilters: undefined });
      }
    }, [navigation, route.params?.openFilters]),
  );
  const [recentSearches, setRecentSearches] = useState([]);

  useEffect(() => {
    getRecentSearches().then(setRecentSearches);
  }, []);

  const popularRestaurants = useMemo(() => {
    let list = restaurants.filter(r => restaurantMatchesFilters(r, filters));
    list = sortRestaurants(list, filters);
    return list.slice(0, 6);
  }, [restaurants, filters]);

  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    let list = restaurants.filter(
      r => matchRestaurantQuery(r, q) && restaurantMatchesFilters(r, filters),
    );
    list = sortRestaurants(list, filters);
    return list;
  }, [restaurants, query, filters]);

  const openCategory = useCallback(
    category => {
      const nav = resolveCategoryChipNavigation(category);
      navigation.navigate('HomeSearchCategoryScreen', {
        categoryKey: nav.categoryKey,
        categoryLabel: nav.categoryLabel,
        nearLabel,
        filters,
        viewerLat: locationOpts.viewerLat,
        viewerLng: locationOpts.viewerLng,
      });
    },
    [navigation, nearLabel, filters, locationOpts],
  );

  const openRestaurantOrder = useCallback(
    (row, searchKeyword = '') => {
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
        searchKeyword: String(searchKeyword || query).trim(),
        discoverySort: filters.sort,
        discoveryDietary: filters.dietary,
        discoveryHighlyReordered: filters.highlyReordered,
      });
    },
    [navigation, user?.token, query, filters],
  );

  const openPopularItem = useCallback(
    item => {
      const kw = item?.itemName || '';
      if (query.trim().length < 2) {
        setQuery(kw);
      }
      openRestaurantOrder(
        {
          id: item.ownerId,
          name: item.ownerName,
          address: item.ownerAddress,
        },
        kw,
      );
    },
    [openRestaurantOrder, query],
  );

  const submitSearch = useCallback(
    async text => {
      const q = String(text ?? query).trim();
      if (q.length >= 2) {
        await addRecentSearch(q);
        const next = await getRecentSearches();
        setRecentSearches(next);
      }
    },
    [query],
  );

  const onRecentTap = useCallback(
    term => {
      setQuery(term);
      submitSearch(term);
    },
    [submitSearch],
  );

  const openMedia = useCallback(
    row => {
      openDiscoveryMedia(navigation, row, {
        onFallback: openRestaurantOrder,
      });
    },
    [navigation, openRestaurantOrder],
  );

  const showBrowse = !query.trim();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={24} color="#111" />
        </TouchableOpacity>
        <View style={styles.searchRow}>
          <Icon name="magnify" size={22} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for restaurants or dishes..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => submitSearch()}
            autoFocus={!!route.params?.autoFocus}
          />
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setFilterVisible(true)}
        >
          <Icon name="tune-variant" size={22} color="#FFF" />
        </TouchableOpacity>
      </View>

      {nearLabel ? (
        <Text style={styles.nearHint} numberOfLines={1}>
          Near {nearLabel.split(',')[0]}
        </Text>
      ) : null}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {(loading || refreshing) && showBrowse && !restaurants.length ? (
          <ActivityIndicator
            size="large"
            color="#F5A623"
            style={{ marginVertical: 24 }}
          />
        ) : null}

        {showBrowse ? (
          <>
            <Text style={styles.sectionTitle}>Most Popular</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.popularRow}
            >
              {popularRestaurants.length === 0 && !loading ? (
                <Text style={styles.emptyHint}>No restaurants yet</Text>
              ) : (
                popularRestaurants.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.popularCard}
                    activeOpacity={0.9}
                    onPress={() => openRestaurantOrder(r)}
                  >
                    <Image
                      source={{ uri: r.mediaThumb }}
                      style={styles.popularImage}
                    />
                    <Text style={styles.popularName} numberOfLines={1}>
                      {r.name}
                    </Text>
                    <Text style={styles.popularMeta} numberOfLines={1}>
                      {r.orderCount > 0
                        ? `${r.orderCount} orders`
                        : formatViews(r.totalViews)}
                    </Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>

            {popularItems.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Most Ordered Dishes</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.popularRow}
                >
                  {popularItems.map(item => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.dishCard}
                      onPress={() => openPopularItem(item)}
                    >
                      <Image
                        source={{
                          uri:
                            item.imageUrl ||
                            'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
                        }}
                        style={styles.dishImage}
                      />
                      <Text style={styles.dishName} numberOfLines={2}>
                        {item.itemName}
                      </Text>
                      <Text style={styles.dishMeta}>
                        {item.timesOrdered} orders
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </>
            ) : null}

            {recentSearches.length > 0 ? (
              <>
                <Text style={styles.sectionTitle}>Recent Search</Text>
                <View style={styles.recentWrap}>
                  {recentSearches.map(term => (
                    <TouchableOpacity
                      key={term}
                      style={styles.recentChip}
                      onPress={() => onRecentTap(term)}
                    >
                      <Icon name="history" size={16} color="#6B7280" />
                      <Text style={styles.recentText}>{term}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : null}

            <Text style={styles.sectionTitle}>Browse by Menu</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.categoryRow}
            >
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.key}
                  style={styles.categoryTile}
                  activeOpacity={0.85}
                  onPress={() => openCategory(cat)}
                >
                  <View style={styles.categoryIconWrap}>
                    <Image
                      source={{ uri: cat.imageUri }}
                      style={styles.categoryIcon}
                    />
                    {cat.icon ? (
                      <View style={styles.categoryIconBadge}>
                        <Icon name={cat.icon} size={10} color="#FFF" />
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.categoryLabel} numberOfLines={2}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {categories.length === 0 && !loading ? (
              <Text style={styles.emptyHint}>
                Categories appear when restaurants add menus nearby.
              </Text>
            ) : null}
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>
              Results for “{query.trim()}”
            </Text>
            {searchResults.length === 0 && !loading ? (
              <Text style={styles.emptyHint}>No matches. Try another search.</Text>
            ) : (
              searchResults.map((r, idx) => (
                <DiscoveryTrendingCard
                  key={r.id}
                  name={r.name}
                  subtitle={r.shortAddress || r.address}
                  imageUri={r.mediaThumb}
                  viewsLabel={formatViews(r.totalViews)}
                  rating={r.rating}
                  featured={idx === 0}
                  onPress={() => openMedia(r)}
                  onOrderPress={() => {
                    submitSearch();
                    openRestaurantOrder(r);
                  }}
                />
              ))
            )}
          </>
        )}
      </ScrollView>

      <DiscoveryFilterSheet
        visible={filterVisible}
        initialFilters={filters}
        onClose={() => setFilterVisible(false)}
        onApply={next => setFilters(normalizeDiscoveryFilters(next))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  backBtn: { padding: 4 },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#111', padding: 0 },
  filterBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nearHint: {
    fontSize: 13,
    color: '#6B7280',
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 32 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    marginTop: 16,
    marginBottom: 12,
  },
  popularRow: { gap: 12, paddingRight: 8 },
  popularCard: { width: 140 },
  popularImage: {
    width: 140,
    height: 100,
    borderRadius: 12,
    backgroundColor: '#E5E7EB',
  },
  popularName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111',
    marginTop: 6,
  },
  popularMeta: { fontSize: 12, color: '#6B7280', marginTop: 2 },
  dishCard: { width: 120 },
  dishImage: {
    width: 120,
    height: 90,
    borderRadius: 10,
    backgroundColor: '#E5E7EB',
  },
  dishName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111',
    marginTop: 6,
  },
  dishMeta: { fontSize: 11, color: '#F5A623', marginTop: 2 },
  recentWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recentChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
  },
  recentText: { fontSize: 14, color: '#374151' },
  categoryRow: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 6,
    paddingBottom: 4,
  },
  categoryTile: {
    width: 68,
    alignItems: 'center',
  },
  categoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFF',
  },
  categoryIcon: { width: '100%', height: '100%' },
  categoryIconBadge: {
    position: 'absolute',
    right: 1,
    bottom: 1,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(31, 41, 55, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: {
    fontSize: 9,
    color: '#374151',
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '600',
    lineHeight: 11,
    width: '100%',
  },
  emptyHint: {
    fontSize: 14,
    color: '#9CA3AF',
    marginBottom: 16,
  },
});
