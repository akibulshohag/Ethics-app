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
  TextInput,
  Modal,
  TouchableWithoutFeedback,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import CompactVideoCard from '../components/CompactVideoCard';
import { getUserVideos, getVideoWatchHistory } from '../services/videoService';
import { shortsService } from '../services/shortsService';
import { getDownloadedVideos } from '../services/downloadService';

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

const HISTORY_DATA = [
  {
    id: '1',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    channelName: 'World of Music',
    views: '6.4M views',
    publishedAt: '2 days ago',
    thumbnail:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
    duration: '06:42',
  },
  {
    id: '2',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    channelName: 'World of Music',
    views: '6.4M views',
    publishedAt: '2 days ago',
    thumbnail:
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80',
    duration: '04:20',
  },
  {
    id: '3',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    channelName: 'World of Music',
    views: '6.4M views',
    publishedAt: '2 days ago',
    thumbnail:
      'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=400&q=80',
    duration: '08:15',
  },
  {
    id: '4',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    channelName: 'BBC Earth',
    views: '6.4M views',
    publishedAt: '2 days ago',
    thumbnail:
      'https://images.unsplash.com/photo-1484723091739-30a097e8f959?auto=format&fit=crop&w=400&q=80',
    duration: '05:30',
  },
];

const LibraryScreen = ({ navigation }) => {
  const { user: currentUser } = useSelector(state => state.app) || {};
  const [currentView, setCurrentView] = useState('library');
  const [modalVisible, setModalVisible] = useState(false);
  const [playlistTitle, setPlaylistTitle] = useState('Best Songs All The Time');
  const [userVideos, setUserVideos] = useState([]);
  const [userShorts, setUserShorts] = useState([]);
  const [yourVideosLoading, setYourVideosLoading] = useState(false);
  const [yourVideosRefreshing, setYourVideosRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Videos');
  const [watchHistory, setWatchHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyRefreshing, setHistoryRefreshing] = useState(false);
  const [historyFilter, setHistoryFilter] = useState('All'); // All | Videos | Shorts
  const [downloadedVideos, setDownloadedVideos] = useState([]);
  const [downloadsLoading, setDownloadsLoading] = useState(false);

  const loadYourVideos = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const [vRes, sRes] = await Promise.all([
        getUserVideos(currentUser.id, 1, 50),
        shortsService.getUserShorts(currentUser.id, 1, 50),
      ]);
      const vList = Array.isArray(vRes.videos) ? vRes.videos : vRes?.data || [];
      const sList = Array.isArray(sRes.shorts) ? sRes.shorts : sRes?.data || [];
      setUserVideos(vList.map(mapVideoApiToDisplay));
      setUserShorts(sList.map(mapShortApiToDisplay));
    } catch (e) {
      console.error('Failed to load your videos/shorts:', e);
      setUserVideos([]);
      setUserShorts([]);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentView === 'yourVideos' && currentUser?.id) {
      setYourVideosLoading(true);
      loadYourVideos().finally(() => setYourVideosLoading(false));
    }
  }, [currentView, currentUser?.id, loadYourVideos]);

  const onRefreshYourVideos = useCallback(async () => {
    if (!currentUser?.id) return;
    setYourVideosRefreshing(true);
    await loadYourVideos();
    setYourVideosRefreshing(false);
  }, [currentUser?.id, loadYourVideos]);

  const loadDownloads = useCallback(async () => {
    try {
      const list = await getDownloadedVideos();
      setDownloadedVideos(list);
    } catch {
      setDownloadedVideos([]);
    }
  }, []);

  useEffect(() => {
    if (currentView === 'downloads') {
      setDownloadsLoading(true);
      loadDownloads().finally(() => setDownloadsLoading(false));
    }
  }, [currentView, loadDownloads]);

  const handleVideoPress = useCallback(
    item => {
      if (item.type === 'short') {
        navigation?.navigate('ShortsVideoScreen', { shortId: item.id });
      } else {
        navigation?.navigate('VideoDetailsScreen', {
          videoId: item.id,
          offlineVideo: item.localPath ? item : undefined,
        });
      }
    },
    [navigation],
  );

  const loadHistory = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const [vRes, sRes] = await Promise.all([
        getVideoWatchHistory(currentUser.id, 1, 100),
        shortsService.getWatchHistory(currentUser.id, 1, 100),
      ]);
      const vHistory = Array.isArray(vRes.history) ? vRes.history : [];
      const sHistory = Array.isArray(sRes.history) ? sRes.history : [];
      const videoItems = vHistory.map(({ video, watchedAt }) => ({
        ...mapVideoApiToDisplay(video),
        watchedAt: new Date(watchedAt).getTime(),
      }));
      const shortItems = sHistory.map(({ short, watchedAt }) => ({
        ...mapShortApiToDisplay(short),
        watchedAt: new Date(watchedAt).getTime(),
      }));
      const merged = [...videoItems, ...shortItems].sort(
        (a, b) => (b.watchedAt || 0) - (a.watchedAt || 0),
      );
      setWatchHistory(merged);
    } catch (e) {
      console.error('Failed to load watch history:', e);
      setWatchHistory([]);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if ((currentView === 'history' || currentView === 'library') && currentUser?.id) {
      if (currentView === 'history') {
        setHistoryLoading(true);
      }
      loadHistory().finally(() => setHistoryLoading(false));
    }
  }, [currentView, currentUser?.id, loadHistory]);

  const onRefreshHistory = useCallback(async () => {
    if (!currentUser?.id) return;
    setHistoryRefreshing(true);
    await loadHistory();
    setHistoryRefreshing(false);
  }, [currentUser?.id, loadHistory]);

  const renderHeader = () => {
    const isLibrary = currentView === 'library';
    let title = 'Library';
    if (currentView === 'history') title = 'History';
    if (currentView === 'yourVideos') title = 'Your Videos';
    if (currentView === 'downloads') title = 'Downloads';
    if (currentView === 'watchLater') title = 'Watch Later';
    if (currentView === 'favorites') title = 'My Favorite Songs';

    return (
      <View style={styles.header}>
        <View style={styles.logoRow}>
          {!isLibrary ? (
            <TouchableOpacity onPress={() => setCurrentView('library')}>
              <MaterialCommunityIcons
                name="arrow-left"
                size={28}
                color="#333"
              />
            </TouchableOpacity>
          ) : (
            <MaterialCommunityIcons name="play-box" size={28} color="#F97507" />
          )}
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity>
            <MaterialCommunityIcons name="magnify" size={26} color="#333" />
          </TouchableOpacity>
          {!isLibrary ? (
            <TouchableOpacity style={styles.iconMargin}>
              <MaterialCommunityIcons
                name="dots-vertical"
                size={26}
                color="#333"
              />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.iconMargin}>
                <MaterialCommunityIcons
                  name="bell-outline"
                  size={26}
                  color="#333"
                />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation?.navigate('ProfileScreen')}>
                <Image
                  source={{ uri: 'https://i.pravatar.cc/100' }}
                  style={styles.profilePic}
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderNewPlaylistModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.modalHandle} />
              <Text style={styles.modalHeaderTitle}>New Playlist</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Playlist Title</Text>
                <TextInput
                  style={styles.modalInput}
                  value={playlistTitle}
                  onChangeText={setPlaylistTitle}
                />
              </View>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Privacy</Text>
                <TouchableOpacity style={styles.privacySelector}>
                  <View style={styles.privacyLeft}>
                    <MaterialCommunityIcons
                      name="lock-outline"
                      size={20}
                      color="#333"
                    />
                    <Text style={styles.privacyText}>Private</Text>
                  </View>
                  <MaterialCommunityIcons
                    name="menu-down"
                    size={24}
                    color="#333"
                  />
                </TouchableOpacity>
              </View>
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.createButtonText}>Create</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  const renderListView = (data, options = {}) => {
    const {
      isYourVideos = false,
      activeFilter: filter = 'Videos',
      setActiveFilter: setFilter,
      loading = false,
      refreshing = false,
      onRefresh,
      onPress,
      emptyTitle,
      emptySubtitle,
    } = options;

    const listData = isYourVideos
      ? filter === 'Videos'
        ? userVideos
        : userShorts
      : data;

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        {renderHeader()}
        {isYourVideos && (
          <View style={styles.filterWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterScroll}
            >
              <TouchableOpacity
                style={filter === 'Videos' ? styles.filterChipActive : styles.filterChip}
                onPress={() => setFilter?.('Videos')}
              >
                <Text
                  style={filter === 'Videos' ? styles.filterTextActive : styles.filterText}
                >
                  Videos ({userVideos.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={filter === 'Shorts' ? styles.filterChipActive : styles.filterChip}
                onPress={() => setFilter?.('Shorts')}
              >
                <Text
                  style={filter === 'Shorts' ? styles.filterTextActive : styles.filterText}
                >
                  Shorts ({userShorts.length})
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97507" />
          </View>
        ) : (
          <FlatList
            data={listData}
            keyExtractor={(item, index) =>
              `${item.id || 'item'}-${item.type || 'v'}-${index}`
            }
            renderItem={({ item }) => (
              <CompactVideoCard
                video={item}
                onPress={() => (onPress ? onPress(item) : null)}
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              listData.length === 0 && styles.emptyListContent,
            ]}
            ListEmptyComponent={
              listData.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name={
                      emptyTitle ? 'download-outline' : 'video-outline'
                    }
                    size={64}
                    color="#ccc"
                  />
                  <Text style={styles.emptyStateText}>
                    {emptyTitle ||
                      `No ${filter.toLowerCase()} yet`}
                  </Text>
                  <Text style={styles.emptyStateSubtext}>
                    {emptySubtitle ||
                      (filter === 'Videos'
                        ? 'Upload your first video to get started'
                        : 'Create your first short to get started')}
                  </Text>
                </View>
              ) : null
            }
            refreshControl={
              isYourVideos && onRefresh ? (
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#F97507']}
                />
              ) : undefined
            }
          />
        )}
      </SafeAreaView>
    );
  };

  if (currentView === 'history') {
    const historyList =
      historyFilter === 'Videos'
        ? watchHistory.filter(i => i.type === 'video')
        : historyFilter === 'Shorts'
          ? watchHistory.filter(i => i.type === 'short')
          : watchHistory;
    const videoCount = watchHistory.filter(i => i.type === 'video').length;
    const shortCount = watchHistory.filter(i => i.type === 'short').length;

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        {renderHeader()}
        <View style={styles.filterWrapper}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScroll}
          >
            <TouchableOpacity
              style={
                historyFilter === 'All' ? styles.filterChipActive : styles.filterChip
              }
              onPress={() => setHistoryFilter('All')}
            >
              <Text
                style={
                  historyFilter === 'All' ? styles.filterTextActive : styles.filterText
                }
              >
                All
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={
                historyFilter === 'Videos' ? styles.filterChipActive : styles.filterChip
              }
              onPress={() => setHistoryFilter('Videos')}
            >
              <Text
                style={
                  historyFilter === 'Videos' ? styles.filterTextActive : styles.filterText
                }
              >
                Videos ({videoCount})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={
                historyFilter === 'Shorts' ? styles.filterChipActive : styles.filterChip
              }
              onPress={() => setHistoryFilter('Shorts')}
            >
              <Text
                style={
                  historyFilter === 'Shorts' ? styles.filterTextActive : styles.filterText
                }
              >
                Shorts ({shortCount})
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        {historyLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#F97507" />
          </View>
        ) : (
          <FlatList
            data={historyList}
            keyExtractor={(item, index) =>
              `${item.id || 'item'}-${item.type || 'v'}-${index}`
            }
            renderItem={({ item }) => (
              <CompactVideoCard
                video={item}
                onPress={() => handleVideoPress(item)}
              />
            )}
            contentContainerStyle={[
              styles.listContent,
              historyList.length === 0 && styles.emptyListContent,
            ]}
            ListEmptyComponent={
              historyList.length === 0 ? (
                <View style={styles.emptyState}>
                  <MaterialCommunityIcons
                    name="history"
                    size={64}
                    color="#ccc"
                  />
                  <Text style={styles.emptyStateText}>No watch history yet</Text>
                  <Text style={styles.emptyStateSubtext}>
                    Videos and shorts you watch will appear here
                  </Text>
                </View>
              ) : null
            }
            refreshControl={
              currentUser?.id ? (
                <RefreshControl
                  refreshing={historyRefreshing}
                  onRefresh={onRefreshHistory}
                  colors={['#F97507']}
                />
              ) : undefined
            }
          />
        )}
      </SafeAreaView>
    );
  }

  if (currentView === 'yourVideos') {
    return renderListView([], {
      isYourVideos: true,
      activeFilter,
      setActiveFilter,
      loading: yourVideosLoading,
      refreshing: yourVideosRefreshing,
      onRefresh: onRefreshYourVideos,
      onPress: handleVideoPress,
    });
  }
  if (currentView === 'downloads') {
    return renderListView(downloadedVideos, {
      loading: downloadsLoading,
      onPress: handleVideoPress,
      emptyTitle: 'No downloads yet',
      emptySubtitle:
        'Download videos from the video details screen to watch offline',
    });
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}
      {renderNewPlaylistModal()}

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>History</Text>
          <TouchableOpacity onPress={() => setCurrentView('history')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.historyScroll}
        >
          {(watchHistory.length > 0 ? watchHistory.slice(0, 8) : []).map(
            (item, index) => (
            <TouchableOpacity
              key={`${item.id}-${item.type || 'v'}-${index}`}
              style={styles.historyCard}
              onPress={() => handleVideoPress(item)}
              activeOpacity={1}
            >
              <View>
                <Image
                  source={{ uri: item.thumbnail }}
                  style={styles.historyThumb}
                />
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{item.duration}</Text>
                </View>
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <View style={styles.historyMetaRow}>
                  <Text style={styles.historyChannel}>
                    {item.channelName || 'Channel'} • {item.publishedAt}
                  </Text>
                  <TouchableOpacity>
                    <MaterialCommunityIcons
                      name="dots-vertical"
                      size={16}
                      color="#666"
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.divider} />
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setCurrentView('yourVideos')}
        >
          <View style={styles.menuIconContainer}>
            <MaterialCommunityIcons
              name="play-circle"
              size={24}
              color="#F97507"
            />
          </View>
          <Text style={styles.menuText}>Your Videos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => setCurrentView('downloads')}
        >
          <View style={styles.menuIconContainer}>
            <MaterialCommunityIcons
              name="download-circle"
              size={24}
              color="#F97507"
            />
          </View>
          <Text style={styles.menuText}>Downloads</Text>
        </TouchableOpacity>
        <View style={styles.divider} />

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Playlists</Text>
          <TouchableOpacity style={styles.recentlyAdded}>
            <Text style={styles.sortText}>Recently Added</Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={20}
              color="#F97507"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.playlistItem}
          onPress={() => setModalVisible(true)}
        >
          <View style={styles.menuIconContainer}>
            <MaterialCommunityIcons name="plus" size={28} color="#F97507" />
          </View>
          <Text style={styles.menuText}>New Playlist</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playlistItem}
          onPress={() => navigation?.navigate('WatchLaterScreen')}
        >
          <View style={styles.menuIconContainer}>
            <MaterialCommunityIcons
              name="clock-outline"
              size={24}
              color="#F97507"
            />
          </View>
          <View>
            <Text style={styles.menuText}>Watch Later</Text>
            <Text style={styles.subText}>Videos and shorts saved to watch later</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playlistItem}
          onPress={() => navigation?.navigate('LikedScreen')}
        >
          <View style={styles.menuIconContainer}>
            <MaterialCommunityIcons name="thumb-up" size={24} color="#F97507" />
          </View>
          <View>
            <Text style={styles.menuText}>Liked Videos</Text>
            <Text style={styles.subText}>Videos and shorts you liked</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playlistItem}
          onPress={() => navigation?.navigate('FavoritesScreen')}
        >
          <View style={styles.menuIconContainer}>
            <MaterialCommunityIcons
              name="heart-outline"
              size={24}
              color="#F97507"
            />
          </View>
          <View>
            <Text style={styles.menuText}>Favorites</Text>
            <Text style={styles.subText}>Videos and shorts you saved</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  listContent: { paddingTop: 10 },
  emptyListContent: { flexGrow: 1 },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
    color: '#1a1a1a',
  },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconMargin: { marginHorizontal: 15 },
  profilePic: { width: 30, height: 30, borderRadius: 15 },
  searchSection: { padding: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 45,
  },
  searchInput: { flex: 1, marginHorizontal: 10, fontSize: 14, color: '#333' },
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
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  viewAllText: { color: '#F97507', fontWeight: '600' },
  historyScroll: { paddingLeft: 16, paddingVertical: 15 },
  historyCard: { width: 160, marginRight: 15 },
  historyThumb: { width: 160, height: 90, borderRadius: 8 },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  durationText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  historyInfo: { marginTop: 8 },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    lineHeight: 18,
  },
  historyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  historyChannel: { fontSize: 11, color: '#666' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuIconContainer: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#FFF5EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  menuText: { fontSize: 16, fontWeight: '600', color: '#333' },
  recentlyAdded: { flexDirection: 'row', alignItems: 'center' },
  sortText: { color: '#F97507', fontWeight: '600', marginRight: 4 },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  subText: { fontSize: 12, color: '#666', marginTop: 2 },

  playlistHeader: { padding: 16 },
  playlistActionRow: { flexDirection: 'row', justifyContent: 'space-between' },
  playAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97507',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    flex: 0.48,
    justifyContent: 'center',
  },
  playAllText: { color: '#fff', fontWeight: 'bold', marginLeft: 8 },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 25,
    flex: 0.48,
    justifyContent: 'center',
  },
  shuffleText: { color: '#333', fontWeight: 'bold', marginLeft: 8 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 20,
    paddingBottom: 40,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  modalHeaderTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#333',
  },
  inputContainer: { marginBottom: 20 },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  modalInput: {
    fontSize: 14,
    color: '#666',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  privacySelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingVertical: 10,
  },
  privacyLeft: { flexDirection: 'row', alignItems: 'center' },
  privacyText: { fontSize: 14, color: '#666', marginLeft: 10 },
  modalActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFF5EE',
    paddingVertical: 14,
    borderRadius: 25,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: { color: '#F97507', fontWeight: 'bold', fontSize: 16 },
  createButton: {
    flex: 1,
    backgroundColor: '#F97507',
    paddingVertical: 14,
    borderRadius: 25,
    marginLeft: 10,
    alignItems: 'center',
  },
  createButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default LibraryScreen;
