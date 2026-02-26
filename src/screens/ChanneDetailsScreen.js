import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
} from 'react-native';

const { width } = Dimensions.get('window');
const SHORTS_CARD_WIDTH = (width - 48) / 2;
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import CustomHeader from '../components/CustomHeader';
import VideoCard from '../components/VideoCard';
import CompactVideoCard from '../components/CompactVideoCard';
import ShortsVideoCard from '../components/ShortsVideoCard';
import ChannelAbout from '../components/ChannelAbout';
import {
  getChannelProfile,
  updateChannelProfile,
  subscribeToChannel,
  unsubscribeFromChannel,
} from '../services/channelService';
import { getUserVideos } from '../services/videoService';
import { shortsService } from '../services/shortsService';

const TABS = ['Home', 'Videos', 'About'];
const FILTERS = ['Videos', 'Shorts'];

const formatCount = n => {
  if (!n || n < 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

// Ensure Image uri is always a string (avoids "cannot cast Boolean to String" crash)
const safeUri = val => (typeof val === 'string' && val.trim().length > 0 ? val.trim() : 'https://via.placeholder.com/100');

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
  const rawAvatar = user.photos?.[0]?.src ?? (Array.isArray(user.photos) && user.photos[0]?.src);
  const channelAvatar = safeUri(rawAvatar) === 'https://via.placeholder.com/100'
    ? `https://ui-avatars.com/api/?name=${encodeURIComponent(channelName)}&background=111&color=fff`
    : safeUri(rawAvatar);
  const pubAt = v.publishedAt || v.createdAt;
  return {
    id: v.id,
    title: v.title || 'Untitled',
    channelName,
    channelAvatar,
    views: `${formatCount(viewCount)} views`,
    publishedAt: formatTimeAgo(pubAt),
    thumbnail: safeUri(v.thumbnailUrl || v.videoUrl) || 'https://via.placeholder.com/300',
    duration: formatDuration(v.duration),
    userId: v.userId,
  };
};

const mapShortApiToDisplay = s => {
  const viewCount = s.viewCount ?? s._count?.views ?? 0;
  return {
    id: s.id,
    title: (s.title || 'Untitled').slice(0, 50) + (s.title?.length > 50 ? '...' : ''),
    views: `${formatCount(viewCount)} views`,
    thumbnail: safeUri(s.thumbnailUrl || s.videoUrl) || 'https://via.placeholder.com/300',
  };
};

const ChannelDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const { user: currentUser } = useSelector(state => state.app) || {};
  const userId = route.params?.userId;

  const [profile, setProfile] = useState(null);
  const [videos, setVideos] = useState([]);
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [videosLoading, setVideosLoading] = useState(false);
  const [shortsLoading, setShortsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('Home');
  const [activeFilter, setActiveFilter] = useState('Videos');
  const [subscribeLoading, setSubscribeLoading] = useState(false);

  const isOwnChannel = !!userId && !!currentUser?.id && currentUser.id === userId;

  const loadProfile = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await getChannelProfile(userId, currentUser?.id);
      setProfile(data);
    } catch (e) {
      console.error('Failed to load channel profile:', e);
    }
  }, [userId, currentUser?.id]);

  const loadVideos = useCallback(async () => {
    if (!userId) return;
    setVideosLoading(true);
    try {
      const res = await getUserVideos(userId, 1, 50);
      const list = Array.isArray(res.videos) ? res.videos : res?.data || [];
      setVideos(list.map(mapVideoApiToDisplay));
    } catch (e) {
      console.error('Failed to load videos:', e);
      setVideos([]);
    } finally {
      setVideosLoading(false);
    }
  }, [userId]);

  const loadShorts = useCallback(async () => {
    if (!userId) return;
    setShortsLoading(true);
    try {
      const res = await shortsService.getUserShorts(userId, 1, 50);
      const list = Array.isArray(res.shorts) ? res.shorts : res?.data || [];
      setShorts(list.map(mapShortApiToDisplay));
    } catch (e) {
      console.error('Failed to load shorts:', e);
      setShorts([]);
    } finally {
      setShortsLoading(false);
    }
  }, [userId]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadProfile(), loadVideos(), loadShorts()]);
    setRefreshing(false);
  }, [loadProfile, loadVideos, loadShorts]);

  useEffect(() => {
    if (!userId) return;
    const init = async () => {
      setLoading(true);
      await loadProfile();
      await loadVideos();
      await loadShorts();
      setLoading(false);
    };
    init();
  }, [userId, loadProfile, loadVideos, loadShorts]);

  const handleSaveChannel = async data => {
    if (!userId || !isOwnChannel) return;
    await updateChannelProfile(userId, data);
    await loadProfile();
  };

  const handleVideoPress = item => {
    navigation.navigate('VideoDetailsScreen', { videoId: item.id });
  };

  const handleShortPress = item => {
    navigation.navigate('ShortsVideoScreen', { shortId: item.id });
  };

  const goToAbout = () => setActiveTab('About');

  const handleSubscribe = async () => {
    if (!currentUser?.id || !userId || isOwnChannel) return;
    setSubscribeLoading(true);
    try {
      const isSub = profile?.isSubscribed ?? false;
      if (isSub) {
        await unsubscribeFromChannel(currentUser.id, userId);
        setProfile(prev =>
          prev
            ? {
                ...prev,
                isSubscribed: false,
                subscriberCount: Math.max(0, (prev.subscriberCount ?? 0) - 1),
              }
            : prev,
        );
      } else {
        await subscribeToChannel(currentUser.id, userId);
        setProfile(prev =>
          prev
            ? {
                ...prev,
                isSubscribed: true,
                subscriberCount: (prev.subscriberCount ?? 0) + 1,
              }
            : prev,
        );
      }
    } catch (e) {
      console.error('Subscribe error:', e);
    } finally {
      setSubscribeLoading(false);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.tabsContainer}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Home' && profile && (
        <View style={styles.profileContainer}>
          <Image source={{ uri: safeUri(profile.channelAvatar) }} style={styles.profileAvatar} />
          <View style={styles.nameContainer}>
            <Text style={styles.profileName}>{profile.channelName}</Text>
            <MaterialCommunityIcons name="check-decagram" size={16} color="#3ea6ff" style={styles.verifiedIcon} />
          </View>
          {!isOwnChannel && currentUser?.id && (
            <TouchableOpacity
              style={[
                styles.subscribeButton,
                profile.isSubscribed && styles.subscribedButton,
              ]}
              onPress={handleSubscribe}
              disabled={subscribeLoading}
            >
              {subscribeLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.subscribeText,
                    profile.isSubscribed && styles.subscribedText,
                  ]}
                >
                  {profile.isSubscribed ? 'Subscribed' : 'Subscribe'}
                </Text>
              )}
            </TouchableOpacity>
          )}
          <Text style={styles.statsText}>
            {profile.subscriberCount > 0
              ? `${formatCount(profile.subscriberCount)} subscribers  •  `
              : ''}
            {profile.videoCount} {profile.videoCount === 1 ? 'video' : 'videos'} & {profile.shortCount} {profile.shortCount === 1 ? 'short' : 'shorts'}
            {profile.totalViews > 0 ? `  •  ${formatCount(profile.totalViews)} views` : ''}
          </Text>
          <TouchableOpacity style={styles.moreInfoContainer} onPress={goToAbout}>
            <Text style={styles.moreInfoText}>More about this channel</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color="#616161" />
          </TouchableOpacity>
        </View>
      )}

      {(activeTab === 'Videos') && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersWrapper}
        >
          {FILTERS.map(filter => (
            <TouchableOpacity
              key={filter}
              style={[styles.filterChip, activeFilter === filter && styles.activeFilterChip]}
              onPress={() => setActiveFilter(filter)}
            >
              <Text style={[styles.filterChipText, activeFilter === filter && styles.activeFilterChipText]}>{filter}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );

  const renderItem = ({ item }) => {
    if (item._type === 'section') {
      return <Text style={styles.sectionTitle}>{item.title}</Text>;
    }
    if (item._type === 'shorts-grid') {
      return (
        <View style={styles.shortsGrid}>
          {item.items.map(s => (
            <View key={s.id} style={styles.shortsGridItem}>
              <ShortsVideoCard video={s} onPress={() => handleShortPress(s)} />
            </View>
          ))}
        </View>
      );
    }
    if (activeTab === 'Videos') {
      if (activeFilter === 'Shorts') {
        return <ShortsVideoCard video={item} onPress={() => handleShortPress(item)} />;
      }
      return <CompactVideoCard video={item} onPress={() => handleVideoPress(item)} />;
    }
    if (activeTab === 'About' && profile) {
      // For own channel, use currentUser location as fallback so map shows after "Use my location" on Home
      const lat = profile.latitude ?? (isOwnChannel ? currentUser?.latitude : undefined);
      const lng = profile.longitude ?? (isOwnChannel ? currentUser?.longitude : undefined);
      const addr = profile.address ?? (isOwnChannel ? currentUser?.address : undefined);
      console.log('[ChanneDetailsScreen] About tab – passing to ChannelAbout:', {
        'profile.lat': profile.latitude,
        'profile.lng': profile.longitude,
        'currentUser.lat': currentUser?.latitude,
        'currentUser.lng': currentUser?.longitude,
        isOwnChannel,
        passedLat: lat,
        passedLng: lng,
      });
      return (
        <ChannelAbout
          channelAbout={profile.channelAbout}
          channelName={profile.channelName}
          createdAt={profile.createdAt}
          totalViews={profile.totalViews}
          canEdit={isOwnChannel}
          onSave={handleSaveChannel}
          socialLinks={profile.socialLinks}
          address={addr}
          latitude={lat}
          longitude={lng}
        />
      );
    }
    if (item._type === 'video') {
      return <VideoCard video={item} onPress={() => handleVideoPress(item)} />;
    }
    return null;
  };

  const getData = () => {
    if (activeTab === 'Videos') {
      if (activeFilter === 'Shorts') return shorts;
      return videos;
    }
    if (activeTab === 'About') return [{ id: 'about' }];
    // Home tab: show both videos and shorts with section headers
    const items = [];
    items.push({ id: 'section-videos', _type: 'section', title: 'Videos' });
    videos.forEach(v => items.push({ ...v, _type: 'video' }));
    items.push({ id: 'section-shorts', _type: 'section', title: 'Shorts' });
    items.push({ id: 'shorts-grid', _type: 'shorts-grid', items: shorts });
    return items;
  };

  const getNumColumns = () => {
    if (activeTab === 'Home') return 1;
    return activeTab === 'Videos' && activeFilter === 'Shorts' ? 2 : 1;
  };

  const isLoadingData =
    (activeTab === 'Home' && (videosLoading || shortsLoading)) ||
    (activeTab === 'Videos' && activeFilter === 'Videos' && videosLoading) ||
    (activeTab === 'Videos' && activeFilter === 'Shorts' && shortsLoading);

  if (!userId) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <CustomHeader title="Channel" />
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Channel not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <CustomHeader title="Channel" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97507" />
        </View>
      </SafeAreaView>
    );
  }

  const headerTitle = profile?.channelName || 'Channel';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <CustomHeader title={headerTitle} />
      <FlatList
        key={activeFilter + activeTab}
        data={getData()}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          isLoadingData ? null : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>
                {activeTab === 'Videos' && activeFilter === 'Videos' && 'No videos yet'}
                {activeTab === 'Videos' && activeFilter === 'Shorts' && 'No shorts yet'}
                {activeTab === 'Home' && 'No videos or shorts yet'}
              </Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={['#F97507']} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.listContent, getData().length === 0 && styles.listContentEmpty]}
        numColumns={getNumColumns()}
        columnWrapperStyle={getNumColumns() === 2 ? styles.columnWrapper : null}
      />
      {isLoadingData && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#F97507" />
        </View>
      )}
    </SafeAreaView>
  );
};

export default ChannelDetailsScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  listContent: { paddingBottom: 20 },
  listContentEmpty: { flexGrow: 1 },
  headerContent: { backgroundColor: '#fff' },
  tabsContainer: {
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f2f2f2',
    flexDirection: 'row',
    justifyContent: 'flex-start',
  },
  tabItem: { marginRight: 24, paddingVertical: 8, paddingHorizontal: 8 },
  activeTabItem: { borderBottomWidth: 2, borderBottomColor: '#F97507' },
  tabText: { fontSize: 16, color: '#616161', fontWeight: '500' },
  activeTabText: { color: '#F97507', fontWeight: '600' },
  profileContainer: { alignItems: 'center', paddingVertical: 24 },
  profileAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#111',
    marginBottom: 12,
  },
  nameContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  profileName: { fontSize: 20, fontWeight: '700', color: '#212121' },
  verifiedIcon: { marginLeft: 4 },
  subscribeButton: {
    backgroundColor: '#F97507',
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 12,
  },
  subscribedButton: {
    backgroundColor: '#f2f2f2',
  },
  subscribeText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  subscribedText: { color: '#606060' },
  statsText: { fontSize: 12, color: '#616161', marginBottom: 8 },
  moreInfoContainer: { flexDirection: 'row', alignItems: 'center' },
  moreInfoText: { fontSize: 12, color: '#616161', marginRight: 4 },
  filtersWrapper: { paddingHorizontal: 16, paddingVertical: 12, alignItems: 'center', backgroundColor: '#fff', flexDirection: 'row' },
  filterChip: {
    marginRight: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#F97507',
  },
  activeFilterChip: { backgroundColor: '#F97507' },
  filterChipText: { color: '#F97507', fontWeight: '500', fontSize: 14 },
  activeFilterChipText: { color: '#fff' },
  columnWrapper: { justifyContent: 'space-between', paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginTop: 20,
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  shortsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  shortsGridItem: {
    width: SHORTS_CARD_WIDTH,
    paddingRight: 16,
    marginBottom: 16,
  },
  emptyState: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#616161' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
