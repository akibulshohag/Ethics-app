import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
  Keyboard,
  Dimensions,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../constants/theme';
import { shortsService } from '../services/shortsService';
import { getVideos } from '../services/videoService';

const { width } = Dimensions.get('window');

const TABS = ['Videos', 'Shorts'];

const SUGGESTED_SEARCHES = ['Food vlog', 'Food vlog Bangladesh', 'Food Challenge', 'Best Education Platform'];

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
    title: v.title || 'Untitled',
    author: user.nickname || user.name || 'Unknown',
    views: `${formatCount(viewCount)} views`,
    time: formatTimeAgo(pubAt),
    duration: formatDuration(v.duration),
    thumbnail: v.thumbnailUrl || v.videoUrl || 'https://via.placeholder.com/300',
  };
};

const SearchScreen = ({ onBack }) => {
  const navigation = useNavigation();
  const user = useSelector((state) => state?.app?.user);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Videos');
  const [videosData, setVideosData] = useState([]);
  const [shortsData, setShortsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const loadSearchResults = useCallback(async (overrideQuery) => {
    const q = ((overrideQuery ?? searchQuery) || '').trim();
    if (!q) {
      setVideosData([]);
      setShortsData([]);
      setHasSearched(false);
      return;
    }
    setLoading(true);
    setHasSearched(true);
    try {
      const params = { page: 1, limit: 50, search: q, viewerRole: user?.role || 'user' };
      const [videosRes, shortsRes] = await Promise.all([
        getVideos(params),
        shortsService.getShorts(params),
      ]);
      const videos = (videosRes?.videos || []).map(mapVideoToCard);
      const shorts = (shortsRes?.shorts || [])
        .filter((s) => s.videoUrl && String(s.videoUrl).trim())
        .map(mapShortToCard);
      setVideosData(videos);
      setShortsData(shorts);
    } catch (e) {
      console.error('Search error:', e);
      setVideosData([]);
      setShortsData([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, user?.role]);

  const handleSearch = () => {
    Keyboard.dismiss();
    loadSearchResults();
  };

  const handleShortPress = (shortId) => {
    navigation.navigate('ShortsVideoScreen', { shortId });
  };

  const handleVideoPress = (videoId) => {
    navigation.navigate('VideoDetailsScreen', { videoId });
  };

  const handleSuggestedPress = (term) => {
    setSearchQuery(term);
    loadSearchResults(term);
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

  const renderVideoCard = ({ item }) => (
    <TouchableOpacity
      style={styles.videoCard}
      onPress={() => handleVideoPress(item.id)}
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

  const renderResults = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryOrange} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      );
    }

    const videosCount = videosData.length;
    const shortsCount = shortsData.length;

    if (!hasSearched || !searchQuery.trim()) {
      return (
        <View style={styles.suggestionsContainer}>
          <Text style={styles.sectionTitle}>Suggested Searches</Text>
          {SUGGESTED_SEARCHES.map((item, index) => (
            <TouchableOpacity
              key={`suggest-${index}`}
              style={styles.suggestRow}
              onPress={() => handleSuggestedPress(item)}
              activeOpacity={0.7}
            >
              <Icon name="magnify" size={22} color="#999" style={{ marginRight: 12 }} />
              <Text style={styles.suggestText}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>
      );
    }

    if (videosCount === 0 && shortsCount === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Icon name="magnify-close" size={64} color="#ccc" />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>
            Try different keywords for videos and shorts
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.resultsWrapper}>
        <View style={styles.tabContainer}>
          {TABS.map((tab) => {
            const isActive = activeTab === tab;
            const count = tab === 'Videos' ? videosCount : shortsCount;
            return (
              <TouchableOpacity
                key={tab}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab)}
              >
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <FlatList
          key={activeTab}
          data={activeTab === 'Videos' ? videosData : shortsData}
          keyExtractor={(item) => item.id}
          renderItem={activeTab === 'Videos' ? renderVideoCard : renderShortCard}
          numColumns={activeTab === 'Shorts' ? 2 : 1}
          columnWrapperStyle={activeTab === 'Shorts' ? styles.row : undefined}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.tabEmpty}>
              <Text style={styles.tabEmptyText}>
                No {activeTab.toLowerCase()} found
              </Text>
            </View>
          }
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.backgroundLight} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="arrow-left" size={28} color="#333" />
        </TouchableOpacity>
        <View style={styles.searchBarWrapper}>
          <Icon name="magnify" size={24} color={COLORS.primaryOrange} style={styles.searchIcon} />
          <TextInput
            placeholder="Search videos and shorts"
            placeholderTextColor="#666"
            style={styles.input}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity onPress={handleSearch} style={styles.searchBtn}>
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>

      {renderResults()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundLight,
    paddingTop: SPACING.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginBottom: 10,
  },
  backBtn: { padding: 5, marginRight: 5 },
  searchBarWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingHorizontal: 15,
    height: 48,
    ...SHADOWS.small,
  },
  searchIcon: { marginRight: 8 },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  searchBtn: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primaryOrange,
    borderRadius: 20,
  },
  searchBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  suggestionsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  suggestText: {
    fontSize: 16,
    color: '#333',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  resultsWrapper: { flex: 1 },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.primaryOrange,
  },
  tabText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  tabTextActive: {
    color: COLORS.primaryOrange,
  },
  listContent: {
    padding: SPACING.lg,
    backgroundColor: COLORS.white,
    borderBottomLeftRadius: BORDER_RADIUS.xl,
    borderBottomRightRadius: BORDER_RADIUS.xl,
    minHeight: 420,
  },
  row: { justifyContent: 'space-between' },
  shortCard: {
    width: '48%',
    height: 220,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    marginBottom: 15,
    ...SHADOWS.small,
  },
  shortImage: { width: '100%', height: '100%' },
  shortOverlay: {
    position: 'absolute',
    bottom: 0,
    padding: 10,
    width: '100%',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  shortTitle: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  shortViews: { color: '#fff', fontSize: 11, marginTop: 4 },
  videoCard: {
    marginBottom: 15,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    ...SHADOWS.small,
  },
  thumbnailWrapper: { width: '100%', height: 200 },
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
    backgroundColor: COLORS.gray200 || '#e0e0e0',
  },
  videoInfo: { flex: 1, marginHorizontal: 12 },
  videoTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    lineHeight: 20,
  },
  videoMeta: { fontSize: 12, color: '#606060', marginTop: 2 },
  tabEmpty: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  tabEmptyText: {
    fontSize: 16,
    color: '#666',
  },
});

export default SearchScreen;
