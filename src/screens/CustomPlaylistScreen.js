import React, { useState, useCallback, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import CompactVideoCard from '../components/CompactVideoCard';
import { getCustomPlaylistItems } from '../services/playlistService';
import { navigateToHomeOneLibraryDetail } from '../utils/navigateHomeLibraryDetail';

const mapItemToCard = item => ({
  id: item.id,
  type: item.type,
  title: item.title || (item.type === 'short' ? 'Short' : 'Video'),
  channelName: item.user?.nickname || item.user?.name || 'Channel',
  views: `${item.viewCount ?? item._count?.views ?? 0} views`,
  publishedAt: '',
  thumbnail:
    item.thumbnailUrl || item.videoUrl || 'https://via.placeholder.com/300',
  duration: item.duration
    ? `${Math.floor(item.duration / 60)}:${String(item.duration % 60).padStart(2, '0')}`
    : '',
});

const CustomPlaylistScreen = ({ navigation }) => {
  const route = useRoute();
  const playlistId = route.params?.playlistId;
  const titleParam = route.params?.title;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plName, setPlName] = useState(titleParam || 'Playlist');
  const [loadError, setLoadError] = useState(null);
  const loadGenRef = useRef(0);

  const load = useCallback(
    async (isRefresh = false) => {
      const pid =
        playlistId != null && playlistId !== ''
          ? String(playlistId).trim()
          : '';
      if (!pid) {
        setItems([]);
        setLoading(false);
        setRefreshing(false);
        setLoadError('Missing playlist');
        return;
      }
      const gen = ++loadGenRef.current;
      if (!isRefresh) setLoading(true);
      setLoadError(null);
      try {
        const res = await getCustomPlaylistItems(pid, 1, 100);
        if (gen !== loadGenRef.current) return;
        setPlName(res?.playlist?.name || titleParam || 'Playlist');
        const raw = Array.isArray(res?.items) ? res.items : [];
        setItems(raw.map(mapItemToCard));
      } catch (e) {
        if (gen !== loadGenRef.current) return;
        setItems([]);
        setLoadError(e?.message || 'Could not load playlist');
      } finally {
        if (gen === loadGenRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [playlistId, titleParam],
  );

  useFocusEffect(
    useCallback(() => {
      load(false);
      return () => {
        loadGenRef.current += 1;
      };
    }, [load]),
  );

  const onPressItem = item => {
    navigateToHomeOneLibraryDetail(navigation, item, {
      returnTo: 'library',
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {plName}
        </Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#F97507" />
        </View>
      ) : loadError && items.length === 0 ? (
        <View style={styles.empty}>
          <MaterialCommunityIcons name="alert-circle-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>{loadError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => load(false)}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          key={String(playlistId)}
          data={items}
          keyExtractor={(it, i) => `${String(playlistId)}-${it.id}-${it.type}-${i}`}
          renderItem={({ item }) => (
            <CompactVideoCard
              video={item}
              onPress={() => onPressItem(item)}
            />
          )}
          contentContainerStyle={[
            styles.list,
            items.length === 0 && styles.emptyList,
          ]}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="playlist-plus" size={56} color="#ddd" />
              <Text style={styles.emptyTitle}>No videos yet</Text>
              <Text style={styles.emptySub}>
                Save videos from the Save button on any video or short.
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load(true);
              }}
              colors={['#F97507']}
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backBtn: { padding: 8 },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingBottom: 24 },
  emptyList: { flexGrow: 1 },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { marginTop: 16, fontSize: 17, fontWeight: '700', color: '#333' },
  emptySub: {
    marginTop: 8,
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 10,
    backgroundColor: '#F97507',
    borderRadius: 20,
  },
  retryText: { color: '#fff', fontWeight: '700' },
});

export default CustomPlaylistScreen;
