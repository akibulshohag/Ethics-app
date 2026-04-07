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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { getTopRestaurantsByOrders } from '../services/orderService';
import { getChannelProfile } from '../services/channelService';
import { getMenuByUserId } from '../services/menuService';
import { getUserVideos } from '../services/videoService';
import { shortsService } from '../services/shortsService';
import logo from '../assets/logo.png';

const DEFAULT_IMG =
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600';

const toNum = v => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const formatK = n => {
  const x = toNum(n);
  if (x >= 1000000) return `${(x / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (x >= 1000) return `${(x / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(x);
};

const starsText = rating => {
  const r = Math.max(0, Math.min(5, Math.round(toNum(rating))));
  return '★★★★★'.slice(0, r) + '☆☆☆☆☆'.slice(0, 5 - r);
};

const safeUri = x => String(x || '').trim();
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
  const firstPart = raw.split(',')[0]?.trim();
  return firstPart || raw;
};
const compactTag = tag => {
  const raw = String(tag || '').trim().toLowerCase();
  if (!raw) return '';
  const first = raw.split(/\s+/)[0] || raw;
  return first.length > 10 ? `${first.slice(0, 10)}` : first;
};

export default function OrderNowBrowseScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const currentUser = useSelector(state => state.app?.user);
  const initialQuery = String(route.params?.initialQuery || '').trim();
  const nearLabel = String(route.params?.nearLabel || '').trim();
  const shortNearLabel = nearLabel ? nearLabel.split(',')[0].trim() : '';
  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const top = await getTopRestaurantsByOrders({ page: 1, limit: 30 });
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
            profile = await getChannelProfile(ownerId, currentUser?.id || null);
          } catch (_) {}
          try {
            const m = await getMenuByUserId(ownerId);
            menu = Array.isArray(m?.menu) ? m.menu : [];
          } catch (_) {}
          try {
            const [vRes, sRes] = await Promise.all([
              getUserVideos(ownerId, 1, 12),
              shortsService.getUserShorts(ownerId, 1, 12),
            ]);
            videos = Array.isArray(vRes?.videos) ? vRes.videos : [];
            shorts = Array.isArray(sRes?.shorts) ? sRes.shorts : [];
          } catch (_) {}

          const p0 = Array.isArray(profile?.photos) ? profile.photos[0] : null;
          const profilePhoto =
            safeUri(typeof p0 === 'string' ? p0 : p0?.src) ||
            safeUri(profile?.channelAvatar) ||
            safeUri(profile?.profileImage) ||
            DEFAULT_IMG;

          const firstVideo = videos.find(v => safeUri(v?.videoUrl));
          const firstShort = shorts.find(s => safeUri(s?.videoUrl));
          const mediaType = firstVideo
            ? 'video'
            : firstShort
            ? 'short'
            : 'none';
          const mediaId = String(firstVideo?.id || firstShort?.id || '').trim();
          const mediaThumb =
            safeUri(firstVideo?.thumbnailUrl) ||
            safeUri(firstShort?.thumbnailUrl) ||
            safeUri(firstShort?.coverUrl) ||
            safeUri(firstVideo?.videoUrl) ||
            safeUri(firstShort?.videoUrl) ||
            profilePhoto;

          const totalViews =
            videos.reduce((sum, v) => sum + toNum(v?.viewCount), 0) +
            shorts.reduce((sum, s) => sum + toNum(s?.viewCount), 0);

          const tags = Array.from(
            new Set(
              (menu || [])
                .flatMap(m => [
                  m?.category?.name,
                  m?.categoryName,
                  ...(Array.isArray(m?.tags) ? m.tags : []),
                ])
                .map(x =>
                  String(x || '')
                    .trim()
                    .toLowerCase(),
                )
                .filter(Boolean),
            ),
          ).slice(0, 2);

          return {
            id: ownerId,
            name:
              profile?.nickname ||
              profile?.name ||
              r?.nickname ||
              r?.name ||
              'Restaurant',
            address: profile?.address || r?.address || 'Near you',
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
            mediaThumb,
            totalViews,
            tags,
          };
        }),
      );
      setRows(enriched.filter(Boolean));
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const withMeta = rows.map(r => {
      const menuMatches = q
        ? r.menu.filter(m =>
            [
              m?.itemName,
              m?.description,
              m?.category?.name,
              ...(Array.isArray(m?.tags) ? m.tags : []),
            ]
              .filter(Boolean)
              .join(' ')
              .toLowerCase()
              .includes(q),
          )
        : [];
      const hay = [
        r.name,
        r.address,
        ...r.menu.map(m =>
          [
            m?.itemName,
            m?.description,
            m?.category?.name,
            ...(Array.isArray(m?.tags) ? m.tags : []),
          ]
            .filter(Boolean)
            .join(' '),
        ),
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
      return toNum(b.totalViews) - toNum(a.totalViews);
    });
    return visible;
  }, [rows, query]);

  const openMedia = useCallback(
    row => {
      if (!row?.mediaId || row?.mediaType === 'none') return;
      if (row.mediaType === 'video') {
        navigation.navigate('VideoDetailsScreen', { videoId: row.mediaId });
        return;
      }
      navigation.navigate('ProductShortsVideo', {
        item: {
          id: row.mediaId,
          type: 'short',
          videoUrl: row.mediaThumb,
          userId: row.id,
          title: row.name,
        },
      });
    },
    [navigation],
  );

  const profileAvatar =
    safeUri(currentUser?.photos?.[0]?.src) ||
    safeUri(currentUser?.photos?.[0]) ||
    safeUri(currentUser?.channelAvatar);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <StatusBar barStyle="light-content" backgroundColor="#F5A623" />
      <View
        style={[
          styles.topHeader,
          {
            paddingBottom: 14,
          },
        ]}
      >
        <Image source={logo} style={styles.brandLogo} resizeMode="contain" />
        {profileAvatar ? (
          <Image source={{ uri: profileAvatar }} style={styles.topAvatar} />
        ) : (
          <View style={styles.topAvatarPlaceholder} />
        )}
      </View>

      <View style={styles.searchBox}>
        <Icon name="magnify" size={22} color="#777" />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Search by food"
          placeholderTextColor="#9A9A9A"
        />
      </View>

      <Text style={styles.subTitle}>
        {query
          ? `Result for “${query}”${shortNearLabel ? ` near ${shortNearLabel}` : ''}`
          : `Nearby restaurant near${shortNearLabel ? ` ${shortNearLabel}` : ''}`}
      </Text>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#F5A623" />
        </View>
      ) : (
        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {filtered.map(r => {
            const topMatch = r._menuMatches?.[0];
          const dish =
            topMatch?.itemName ||
            (query ? `${query} available` : r.shortAddress || r.address);
            const viewsText = `(${new Intl.NumberFormat('en-US').format(
              toNum(r.totalViews),
            )} views)`;
            return (
              <View key={r.id} style={styles.card}>
                <View style={styles.mediaWrap}>
                  <Image
                    source={{ uri: r.mediaThumb || DEFAULT_IMG }}
                    style={styles.avatar}
                  />
                  {r.mediaType !== 'none' ? (
                    <TouchableOpacity
                      style={styles.playOverlay}
                      activeOpacity={0.85}
                      onPress={() => openMedia(r)}
                    >
                      <Icon name="play-circle" size={30} color="#FFFFFFEC" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                <View style={styles.info}>
                  <Text style={styles.name} numberOfLines={1}>
                    {r.name}
                  </Text>
                  <Text style={styles.meta} numberOfLines={1}>
                    {dish}
                  </Text>
                  <View style={styles.ratingRow}>
                    <Text style={styles.stars}>{starsText(r.rating)}</Text>
                    <Text style={styles.ratingRight}>
                      {toNum(r.rating).toFixed(1)} ★ ({formatK(r.reviewCount)})
                    </Text>
                  </View>
                  <View style={styles.viewsRow}>
                    <Icon name="eye-outline" size={12} color="#6A6A6A" />
                    <Text style={styles.viewsText}>{viewsText}</Text>
                  </View>
                  <View style={styles.bottomRow}>
                    <View style={styles.tagsRow}>
                      {(r.tags || [])
                        .map(compactTag)
                        .filter(Boolean)
                        .slice(0, 2)
                        .map(tag => (
                        <Text key={`${r.id}-${tag}`} style={styles.tagChip} numberOfLines={1}>
                          #{tag}
                        </Text>
                      ))}
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
                </View>
              </View>
            );
          })}

          {!filtered.length ? (
            <Text style={styles.emptyText}>
              No restaurants match this search.
            </Text>
          ) : null}
          <View style={{ height: 24 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F7F7' },
  topHeader: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 20,

    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 182,
  },
  brandLogo: {
    width: 98,
    height: 30,
  },
  topAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFF3',
  },
  topAvatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#FFFFFF55',
  },
  searchBox: {
    marginHorizontal: 20,
    marginTop: '-16%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 10,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  searchInput: {
    flex: 1,
    height: 42,
    marginLeft: 8,
    color: '#222',
    fontSize: 15,
  },
  subTitle: {
    marginHorizontal: 20,
    marginBottom: 10,
    marginTop: 20,
    color: '#2A2A2A',
    fontWeight: '700',
    fontSize: 15,
  },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1, paddingHorizontal: 20 },
  card: {
    borderWidth: 1,
    borderColor: '#D8D8D8',
    borderRadius: 12,
    flexDirection: 'row',
    marginBottom: 10,
    backgroundColor: '#FFF',
    overflow: 'hidden',
  },
  mediaWrap: { width: 100, height: 100, position: 'relative' },
  avatar: { width: '100%', height: '100%', backgroundColor: '#EEE' },
  playOverlay: {
    position: 'absolute',
    left: 6,
    top: 6,
    right: 6,
    bottom: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1, paddingHorizontal: 8, paddingVertical: 6 },
  name: { fontSize: 14, fontWeight: '600', color: '#202020' },
  meta: { color: '#555', marginTop: 2, fontSize: 12 },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 3 },
  stars: { color: '#F5A623', fontSize: 13, marginRight: 6 },
  ratingRight: { color: '#666', fontSize: 12 },
  viewsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  viewsText: { color: '#666', marginLeft: 4, fontSize: 12 },
  bottomRow: {
    marginTop: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tagsRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 6 },
  tagChip: {
    backgroundColor: '#EFEFEF',
    color: '#333',
    fontSize: 11,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: 4,
    overflow: 'hidden',
    maxWidth: 68,
  },
  orderBtn: {
    backgroundColor: '#F5A623',
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    paddingVertical: 5,
  },
  orderText: { color: '#FFF', fontWeight: '700', fontSize: 11 },
  emptyText: { textAlign: 'center', marginTop: 30, color: '#777' },
});
