import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING } from '../constants/theme';
import { shortsService } from '../services/shortsService';

const formatCount = (n) => {
  if (!n || n < 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

const mapShortToCard = (s) => {
  const raw = s.title || s.description || 'Untitled';
  const title = raw.length > 50 ? raw.substring(0, 47) + '...' : raw;
  return {
    id: s.id,
    title,
    views: `${formatCount(s.viewCount ?? s._count?.views ?? 0)} views`,
    image: s.thumbnailUrl || s.videoUrl || 'https://via.placeholder.com/200',
  };
};

const LiveShortsScreen = () => {
  const navigation = useNavigation();
  const [shortsData, setShortsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load ALL users' shorts (no userId filter) - for Live tab
  const loadShorts = useCallback(async () => {
    try {
      const params = {
        page: 1,
        limit: 100,
        sort: 'latest',
        // IMPORTANT: No userId - fetches shorts from ALL users
      };
      const res = await shortsService.getShorts(params);
      const shorts = (res?.shorts || []).filter(
        (s) => s.videoUrl && String(s.videoUrl).trim(),
      );
      setShortsData(shorts.map(mapShortToCard));
    } catch (e) {
      console.error('Error loading shorts:', e);
      setShortsData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    loadShorts();
  }, [loadShorts]);

  const onRefresh = () => {
    setRefreshing(true);
    loadShorts();
  };

  const handleShortPress = (shortId) => {
    navigation.navigate('ShortsVideoScreen', { shortId });
  };

  const renderShortCard = ({ item }) => (
    <TouchableOpacity
      style={styles.shortCard}
      onPress={() => handleShortPress(item.id)}
      activeOpacity={0.9}
    >
      <Image source={{ uri: item.image }} style={styles.shortImage} />
      <View style={styles.shortOverlay}>
        <Text style={styles.shortTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.shortViews}>{item.views}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Live Shorts</Text>
        <View style={styles.rightIcons}>
          <TouchableOpacity onPress={() => navigation.navigate('SearchScreen')}>
            <Icon name="magnify" size={26} color="#000" style={{ marginRight: 15 }} />
          </TouchableOpacity>
          <TouchableOpacity>
            <Icon name="dots-vertical" size={26} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryOrange} />
        </View>
      ) : (
        <FlatList
          data={shortsData}
          keyExtractor={(item) => item.id}
          renderItem={renderShortCard}
          numColumns={2}
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="video-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No shorts found</Text>
            </View>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: { padding: 5 },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 15,
    flex: 1,
    color: '#000',
  },
  rightIcons: { flexDirection: 'row', alignItems: 'center' },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: { padding: SPACING.lg },
  row: { justifyContent: 'space-between' },
  shortCard: {
    width: '48%',
    height: 280,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
  },
  shortImage: { width: '100%', height: '100%' },
  shortOverlay: {
    position: 'absolute',
    bottom: 0,
    padding: 10,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  shortTitle: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  shortViews: { color: '#fff', fontSize: 11, marginTop: 4 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 16,
  },
});

export default LiveShortsScreen;
