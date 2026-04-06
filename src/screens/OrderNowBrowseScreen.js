import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getTopRestaurantsByOrders } from '../services/orderService';
import { getChannelProfile } from '../services/channelService';
import { getMenuByUserId } from '../services/menuService';

const DEFAULT_IMG =
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600';

const toNum = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const starsText = rating => {
  const r = Math.max(0, Math.min(5, Math.round(toNum(rating))));
  return '★★★★★'.slice(0, r) + '☆☆☆☆☆'.slice(0, 5 - r);
};

export default function OrderNowBrowseScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const initialQuery = String(route.params?.initialQuery || '').trim();
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const top = await getTopRestaurantsByOrders({ page: 1, limit: 60 });
      const base = Array.isArray(top?.restaurants) ? top.restaurants : [];
      const enriched = await Promise.all(
        base.map(async r => {
          const ownerId = r?.id ? String(r.id) : '';
          if (!ownerId) return null;
          let profile = null;
          let menu = [];
          try {
            profile = await getChannelProfile(ownerId, null);
          } catch (_) {}
          try {
            const m = await getMenuByUserId(ownerId);
            menu = Array.isArray(m?.menu) ? m.menu : [];
          } catch (_) {}
          const p0 = Array.isArray(profile?.photos) ? profile.photos[0] : null;
          const photo =
            (typeof p0 === 'string' ? p0 : p0?.src) ||
            profile?.channelAvatar ||
            profile?.profileImage ||
            DEFAULT_IMG;
          return {
            id: ownerId,
            name: profile?.nickname || profile?.name || r?.nickname || r?.name || 'Restaurant',
            address: profile?.address || r?.address || 'Near you',
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
            photo,
            menu,
          };
        }),
      );
      setRows(enriched.filter(Boolean));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const withMeta = rows.map(r => {
      const menuMatches = q
        ? r.menu.filter(m =>
            [m?.itemName, m?.description, ...(Array.isArray(m?.tags) ? m.tags : [])]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(q),
          )
        : [];
      const hay = [
        r.name,
        r.address,
        ...r.menu.map(m => [m?.itemName, m?.description].filter(Boolean).join(' ')),
      ]
        .join(' ')
        .toLowerCase();
      const textMatch = q ? hay.includes(q) : true;
      return { ...r, _menuMatches: menuMatches, _match: textMatch };
    });
    const visible = withMeta.filter(r => (q ? r._match : true));
    visible.sort((a, b) => {
      const aHas = a._menuMatches.length > 0 ? 1 : 0;
      const bHas = b._menuMatches.length > 0 ? 1 : 0;
      if (aHas !== bHas) return bHas - aHas;
      const ra = toNum(a.rating);
      const rb = toNum(b.rating);
      if (rb !== ra) return rb - ra;
      return toNum(b.orderCount) - toNum(a.orderCount);
    });
    return visible;
  }, [rows, query]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5A623" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={18} color="#FFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Now</Text>
      </View>
      <View style={styles.searchBox}>
        <Icon name="magnify" size={20} color="#999" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by food"
          placeholderTextColor="#999"
        />
      </View>
      <Text style={styles.subTitle}>
        {query ? `Results for "${query}"` : 'Nearby restaurants near you'}
      </Text>
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#F5A623" />
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {filtered.map(r => {
            const topMatch = r._menuMatches?.[0];
            const dish = topMatch?.itemName || (query ? `${query} available` : '');
            return (
              <View key={r.id} style={styles.card}>
                <Image source={{ uri: r.photo || DEFAULT_IMG }} style={styles.avatar} />
                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {dish || r.address}
                  </Text>
                  <Text style={styles.rating}>
                    {starsText(r.rating)} {toNum(r.rating).toFixed(1)} ({toNum(r.reviewCount)})
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.orderBtn}
                  onPress={() =>
                    navigation.navigate('HomeThreeScreen', {
                      ownerId: r.id,
                      ownerName: r.name,
                      location: r.address,
                      searchKeyword: query.trim(),
                    })
                  }
                >
                  <Text style={styles.orderText}>Order Now</Text>
                </TouchableOpacity>
              </View>
            );
          })}
          {!filtered.length ? (
            <Text style={styles.emptyText}>No restaurants match this search.</Text>
          ) : null}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { backgroundColor: '#F5A623', paddingHorizontal: 12, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  backBtn: { backgroundColor: '#1E1E1E', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#FFF', marginLeft: 4, fontWeight: '700', fontSize: 12 },
  headerTitle: { color: '#FFF', fontSize: 18, fontWeight: '700', marginLeft: 10 },
  searchBox: { margin: 12, borderWidth: 1, borderColor: '#E4E4E4', borderRadius: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF' },
  searchInput: { flex: 1, height: 44, marginLeft: 8, color: '#222' },
  subTitle: { marginHorizontal: 12, marginBottom: 8, color: '#222', fontWeight: '700', fontSize: 20 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1, paddingHorizontal: 12 },
  card: { borderWidth: 1, borderColor: '#ECECEC', borderRadius: 12, padding: 8, flexDirection: 'row', alignItems: 'center', marginBottom: 10, backgroundColor: '#FFF' },
  avatar: { width: 96, height: 96, borderRadius: 10, backgroundColor: '#EEE' },
  info: { flex: 1, marginLeft: 10, marginRight: 8 },
  name: { fontSize: 25, fontWeight: '700', color: '#222' },
  meta: { color: '#666', marginTop: 2, fontSize: 13 },
  rating: { color: '#444', marginTop: 4, fontSize: 12 },
  orderBtn: { backgroundColor: '#F5A623', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  orderText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#777' },
});
