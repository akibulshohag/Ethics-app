import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { shortsService } from '../services/shortsService';

const mapShortItem = short => ({
  id: short?.id,
  title: short?.title || short?.description || 'Short',
  image: short?.thumbnailUrl || short?.videoUrl || '',
  views: short?.viewCount ?? short?._count?.views ?? 0,
  raw: short,
});

const HomeShortsExploreScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useSelector(s => s.app) || {};
  const title = route.params?.title || 'Shorts';
  const sort = route.params?.sort === 'trending' ? 'trending' : 'newest';

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = useCallback(
    async (pageNo, append) => {
      const params = {
        page: pageNo,
        limit: 20,
        sort,
        viewerUserId: user?.id,
        viewerRole: (user?.role || 'user').toLowerCase(),
      };
      const res = await shortsService.getShorts(params);
      const list = (res?.shorts || [])
        .filter(s => s?.videoUrl && String(s.videoUrl).trim())
        .map(mapShortItem);
      setItems(prev => (append ? [...prev, ...list] : list));
      const totalPages = Number(res?.pagination?.totalPages || 1);
      setHasMore(pageNo < totalPages && list.length > 0);
      setPage(pageNo);
    },
    [sort, user?.id, user?.role],
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    loadPage(1, false)
      .catch(() => mounted && setItems([]))
      .finally(() => mounted && setLoading(false));
    return () => {
      mounted = false;
    };
  }, [loadPage]);

  const onEndReached = async () => {
    if (loading || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await loadPage(page + 1, true);
    } finally {
      setLoadingMore(false);
    }
  };

  const empty = useMemo(
    () => (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>No shorts found.</Text>
      </View>
    ),
    [],
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="chevron-left" size={22} color="#1F1F1F" />
        </TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#D78500" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => String(item.id)}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={styles.row}
          onEndReachedThreshold={0.4}
          onEndReached={onEndReached}
          ListEmptyComponent={empty}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              activeOpacity={0.9}
              onPress={() =>
                navigation.navigate('ProductShortsVideo', { item: item.raw })
              }
            >
              <Image source={{ uri: item.image }} style={styles.image} />
              <View style={styles.overlay}>
                <Text numberOfLines={2} style={styles.cardTitle}>
                  {item.title}
                </Text>
                <Text style={styles.views}>{item.views} views</Text>
              </View>
            </TouchableOpacity>
          )}
          ListFooterComponent={
            loadingMore ? (
              <ActivityIndicator
                size="small"
                color="#D78500"
                style={{ marginVertical: 14 }}
              />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ECE9E3' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
  },
  title: { fontSize: 18, fontWeight: '700', color: '#1F1F1F' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  listContent: { paddingHorizontal: 12, paddingBottom: 20 },
  row: { justifyContent: 'space-between' },
  card: {
    width: '48.5%',
    height: 220,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    marginBottom: 12,
  },
  image: { width: '100%', height: '100%' },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 8,
    paddingVertical: 8,
    backgroundColor: 'rgba(0,0,0,0.42)',
  },
  cardTitle: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  views: { color: '#EAEAEA', fontSize: 11, marginTop: 2 },
  emptyWrap: { paddingTop: 40, alignItems: 'center' },
  emptyText: { color: '#666' },
});

export default HomeShortsExploreScreen;
