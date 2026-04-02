import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import CompactVideoCard from '../components/CompactVideoCard';
import { getLikedVideos } from '../services/videoService';
import { shortsService } from '../services/shortsService';
import { navigateToHomeOneLibraryDetail } from '../utils/navigateHomeLibraryDetail';

const formatCount = n => {
  if (!n || n < 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

const safeUri = val =>
  typeof val === 'string' && val.trim().length > 0 ? val.trim() : 'https://via.placeholder.com/100';

const formatDuration = seconds => {
  if (!seconds || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const formatTimeAgo = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return 'Recently';
};

const mapVideoApiToDisplay = v => {
  const user = v.user || {};
  const viewCount = v.viewCount ?? v._count?.views ?? 0;
  const channelName = user.nickname || user.name || 'Unknown';
  const pubAt = v.publishedAt || v.createdAt;
  return {
    id: v.id,
    type: 'video',
    title: v.title || 'Untitled',
    channelName,
    views: `${formatCount(viewCount)} views`,
    publishedAt: formatTimeAgo(pubAt),
    thumbnail: safeUri(v.thumbnailUrl || v.videoUrl) || 'https://via.placeholder.com/300',
    duration: formatDuration(v.duration),
  };
};

const mapShortApiToDisplay = s => {
  const user = s.user || {};
  const viewCount = s.viewCount ?? s._count?.views ?? 0;
  const pubAt = s.publishedAt || s.createdAt;
  const channelName = user.nickname || user.name || 'Unknown';
  return {
    id: s.id,
    type: 'short',
    title: (s.title || 'Untitled').slice(0, 80) + (s.title?.length > 80 ? '...' : ''),
    channelName,
    views: `${formatCount(viewCount)} views`,
    publishedAt: formatTimeAgo(pubAt),
    thumbnail: safeUri(s.thumbnailUrl || s.videoUrl) || 'https://via.placeholder.com/300',
    duration: s.duration ? formatDuration(s.duration) : 'SHORT',
  };
};

const LikedScreen = ({ navigation }) => {
  const { user: currentUser } = useSelector(state => state.app) || {};
  const [activeFilter, setActiveFilter] = useState('All');
  const [likedVideos, setLikedVideos] = useState([]);
  const [likedShorts, setLikedShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadLiked = useCallback(async () => {
    if (!currentUser?.id) {
      setLikedVideos([]);
      setLikedShorts([]);
      setLoading(false);
      return;
    }
    try {
      const [vRes, sRes] = await Promise.all([
        getLikedVideos(currentUser.id, 1, 100),
        shortsService.getLikedShorts(currentUser.id, 1, 100),
      ]);
      const videos = (vRes?.videos || []).map(mapVideoApiToDisplay);
      const shorts = (sRes?.shorts || []).map(mapShortApiToDisplay);
      setLikedVideos(videos);
      setLikedShorts(shorts);
    } catch (e) {
      console.error('Failed to load liked content:', e);
      setLikedVideos([]);
      setLikedShorts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    setLoading(true);
    loadLiked();
  }, [loadLiked]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadLiked();
  }, [loadLiked]);

  const handleItemPress = useCallback(
    item => {
      navigateToHomeOneLibraryDetail(navigation, item, { returnTo: 'liked' });
    },
    [navigation],
  );

  const listData =
    activeFilter === 'Videos'
      ? likedVideos
      : activeFilter === 'Shorts'
        ? likedShorts
        : [...likedVideos, ...likedShorts];

  if (!currentUser?.id) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Liked Videos</Text>
        </View>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="thumb-up-outline" size={64} color="#ccc" />
          <Text style={styles.emptyStateText}>Please log in to see your liked videos</Text>
          <Text style={styles.emptyStateSubtext}>
            Like videos and shorts to see them here
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Liked Videos</Text>
      </View>

      <View style={styles.filterWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <TouchableOpacity
            style={activeFilter === 'All' ? styles.filterChipActive : styles.filterChip}
            onPress={() => setActiveFilter('All')}
          >
            <Text
              style={activeFilter === 'All' ? styles.filterTextActive : styles.filterText}
            >
              All ({likedVideos.length + likedShorts.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={activeFilter === 'Videos' ? styles.filterChipActive : styles.filterChip}
            onPress={() => setActiveFilter('Videos')}
          >
            <Text
              style={activeFilter === 'Videos' ? styles.filterTextActive : styles.filterText}
            >
              Videos ({likedVideos.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={activeFilter === 'Shorts' ? styles.filterChipActive : styles.filterChip}
            onPress={() => setActiveFilter('Shorts')}
          >
            <Text
              style={activeFilter === 'Shorts' ? styles.filterTextActive : styles.filterText}
            >
              Shorts ({likedShorts.length})
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97507" />
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, index) => item.id || index.toString()}
          renderItem={({ item }) => (
            <CompactVideoCard video={item} onPress={() => handleItemPress(item)} />
          )}
          contentContainerStyle={[
            styles.listContent,
            listData.length === 0 && styles.emptyListContent,
          ]}
          ListEmptyComponent={
            listData.length === 0 ? (
              <View style={styles.emptyState}>
                <MaterialCommunityIcons name="thumb-up-outline" size={64} color="#FF7F0B" />
                <Text style={styles.emptyStateText}>No liked videos yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Like videos and shorts to see them here
                </Text>
              </View>
            ) : null
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
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
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: { padding: 5 },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#1a1a1a',
  },
  filterWrapper: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterScroll: { paddingHorizontal: 16 },
  filterChipActive: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5EE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F97507',
    marginRight: 8,
  },
  filterChip: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  filterTextActive: { color: '#F97507', fontWeight: 'bold', marginRight: 4 },
  filterText: { color: '#666' },
  listContent: { paddingTop: 10 },
  emptyListContent: { flexGrow: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default LikedScreen;
