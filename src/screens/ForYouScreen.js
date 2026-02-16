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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { COLORS, SPACING } from '../constants/theme';
import { getSubscribedFeed } from '../services/channelService';

const { width } = Dimensions.get('window');

const formatCount = (n) => {
  if (!n || n < 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

const formatDuration = (seconds) => {
  if (!seconds || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const formatTimeAgo = (dateStr) => {
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

const mapShortToCard = (s) => {
  const raw = s.title || s.description || 'Untitled';
  const title = raw.length > 50 ? raw.substring(0, 47) + '...' : raw;
  return {
    id: s.id,
    type: 'short',
    title,
    views: `${formatCount(s.viewCount ?? s._count?.views ?? 0)} views`,
    image: s.thumbnailUrl || s.videoUrl || 'https://via.placeholder.com/200',
  };
};

const mapVideoToCard = (v) => {
  const user = v.user || {};
  const viewCount = v.viewCount ?? v._count?.views ?? 0;
  const pubAt = v.publishedAt || v.createdAt;
  return {
    id: v.id,
    type: 'video',
    title: v.title || 'Untitled',
    author: user.nickname || user.name || 'Unknown',
    views: `${formatCount(viewCount)} views`,
    time: formatTimeAgo(pubAt),
    duration: formatDuration(v.duration),
    thumbnail: v.thumbnailUrl || v.videoUrl || 'https://via.placeholder.com/300',
  };
};

const ForYouScreen = () => {
  const navigation = useNavigation();
  const { user: currentUser } = useSelector((state) => state.app) || {};
  const [feedData, setFeedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Load ONLY subscribed channels' videos/shorts - for "For You" tab
  // IMPORTANT: This is different from All/Trending/Live - only shows content from channels user subscribed to
  const loadFeed = useCallback(async () => {
    if (!currentUser?.id) {
      setFeedData([]);
      setLoading(false);
      return;
    }
    try {
      // Uses getSubscribedFeed which filters by subscribed channels only
      const res = await getSubscribedFeed(currentUser.id, 1, 100);
      const videos = (res?.videos || []).map(mapVideoToCard);
      const shorts = (res?.shorts || [])
        .filter((s) => s.videoUrl && String(s.videoUrl).trim())
        .map(mapShortToCard);
      const all = [...videos, ...shorts];
      setFeedData(all);
    } catch (e) {
      setFeedData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    setLoading(true);
    loadFeed();
  }, [loadFeed]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFeed();
  };

  const handleItemPress = (item) => {
    if (item.type === 'short') {
      navigation.navigate('ShortsVideoScreen', { shortId: item.id });
    } else {
      navigation.navigate('VideoDetailsScreen', { videoId: item.id });
    }
  };

  const renderShortCard = ({ item }) => (
    <TouchableOpacity
      style={styles.shortCard}
      onPress={() => handleItemPress(item)}
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

  const renderVideoCard = ({ item }) => (
    <TouchableOpacity
      style={styles.videoCard}
      onPress={() => handleItemPress(item)}
      activeOpacity={1}
    >
      <View style={styles.thumbnailWrapper}>
        <Image source={{ uri: item.thumbnail }} style={styles.videoThumbnail} />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{item.duration || '0:00'}</Text>
        </View>
      </View>
      <View style={styles.videoDetails}>
        <View style={styles.channelIcon} />
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.videoMeta}>
            {item.author} • {item.views} • {item.time}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderItem = ({ item, index }) => {
    if (item.type === 'video') {
      return <View style={{ width: '100%' }}>{renderVideoCard({ item })}</View>;
    }
    const shorts = feedData.filter((i) => i.type === 'short');
    const shortIndex = shorts.findIndex((s) => s.id === item.id);
    if (shortIndex % 2 === 0) {
      const nextShort = shorts[shortIndex + 1];
      return (
        <View style={styles.row}>
          {renderShortCard({ item })}
          {nextShort ? renderShortCard({ item: nextShort }) : <View style={{ width: '48%' }} />}
        </View>
      );
    }
    return null;
  };

  if (!currentUser?.id) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-left" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.title}>For You</Text>
        </View>
        <View style={styles.emptyState}>
          <Icon name="account-plus-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Please log in to see your feed</Text>
          <Text style={styles.emptySubtext}>
            Subscribe to channels to see their content here
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>For You</Text>
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
          data={feedData}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon name="heart-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No content yet</Text>
              <Text style={styles.emptySubtext}>
                Subscribe to channels to see their videos and shorts here
              </Text>
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
  videoCard: { marginBottom: 15, width: width - SPACING.lg * 2 },
  thumbnailWrapper: { width: '100%', height: 220 },
  videoThumbnail: { width: '100%', height: '100%' },
  durationBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 5,
    borderRadius: 4,
  },
  durationText: { color: '#fff', fontSize: 12 },
  videoDetails: { flexDirection: 'row', padding: 12 },
  channelIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray200,
  },
  videoInfo: { flex: 1, marginHorizontal: 12 },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    lineHeight: 20,
  },
  videoMeta: { fontSize: 12, color: '#606060', marginTop: 2 },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
});

export default ForYouScreen;
