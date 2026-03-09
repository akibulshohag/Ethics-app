import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import UserProfileCard from '../../components/UserProfileCard';
import VideoCard from '../../components/VideoCard';
import CompactVideoCard from '../../components/CompactVideoCard';
import BusinessVideoCard from '../../components/BusinessVideoCard';
import PromotionCard from '../../components/PromotionCard';
import { useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { safeImageUri } from '../../utils/helper';
import { getUserVideos } from '../../services/videoService';
import { getPostsByUser } from '../../services/postService';
import { getChannelProfile, getGallery } from '../../services/channelService';

const { width } = Dimensions.get('window');

const TABS = ['Home', 'Posts', 'Gallery', 'Videos', 'Playlists'];

const MOCK_PLAYLISTS = [
  {
    id: '1',
    title: 'Dance Competition 2022',
    price: 'World of Music\n\n120 videos', // Repurposing price field for multi-line subtitle as seen in image
    image: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '120',
  },
  {
    id: '2',
    title: 'Top Music of All Time',
    price: 'World of Music\n\n250 videos',
    image: 'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '250',
  },
  {
    id: '3',
    title: 'Most Listened Songin Century',
    price: 'World of Music\n\n300 videos',
    image: 'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '300',
  },
];

const formatCount = n => {
  const num = Number(n || 0);
  if (!Number.isFinite(num) || num <= 0) return '0';
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(Math.floor(num));
};

const formatDuration = seconds => {
  const s = Number(seconds);
  if (!Number.isFinite(s) || s <= 0) return '';
  const mm = Math.floor(s / 60);
  const ss = Math.floor(s % 60);
  return `${mm}:${String(ss).padStart(2, '0')}`;
};

const timeAgo = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  if (diffYears > 0) return `${diffYears}y ago`;
  if (diffMonths > 0) return `${diffMonths}mo ago`;
  if (diffDays > 0) return `${diffDays}d ago`;
  return 'Recently';
};

const mapVideoToCard = (v, profile) => {
  const name =
    profile?.channelName || profile?.nickname || profile?.name || 'Unknown';
  const avatar = safeImageUri(
    profile?.photos?.[0]?.src || profile?.photos?.[0],
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=111&color=fff`,
  );
  const viewCount = v?.viewCount ?? v?._count?.views ?? 0;
  return {
    id: v.id,
    title: v.title || 'Untitled',
    channelName: name,
    channelAvatar: avatar,
    publishedAt: timeAgo(v.publishedAt || v.createdAt),
    thumbnail: safeImageUri(
      v.thumbnailUrl || v.videoUrl,
      'https://via.placeholder.com/600',
    ),
    duration: formatDuration(v.duration),
    views: `${formatCount(viewCount)} views`,
  };
};

const mapPostToCard = (p, profile) => {
  const name =
    profile?.channelName || profile?.nickname || profile?.name || 'Unknown';
  const avatar = safeImageUri(
    profile?.photos?.[0]?.src || profile?.photos?.[0],
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=111&color=fff`,
  );
  return {
    id: p.id,
    postId: p.id,
    title: p.title || 'Untitled',
    channelName: name,
    channelAvatar: avatar,
    publishedAt: timeAgo(p.publishedAt || p.createdAt),
    thumbnail: safeImageUri(
      p.thumbnailUrl || p.mediaUrl,
      'https://via.placeholder.com/600',
    ),
    duration:
      p.mediaType === 'video' && p.duration != null ? formatDuration(p.duration) : '',
    likes: formatCount(p.likeCount ?? 0),
    dislikes: formatCount(p.dislikeCount ?? 0),
    comments: formatCount(p.commentCount ?? 0),
    shares: formatCount(p.shareCount ?? 0),
    website: p.website || '',
    hashtags: Array.isArray(p.hashtags) ? p.hashtags : [],
  };
};

const UserViewsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Home');
  const route = useRoute();
  const currentUser = useSelector(state => state.app?.user);
  const profileUserId = route.params?.userId || currentUser?.id || null;

  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [rawVideos, setRawVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(false);

  const [rawPosts, setRawPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);

  const [galleryPhotos, setGalleryPhotos] = useState([]);
  const [galleryLoading, setGalleryLoading] = useState(false);

  const headerTitle = useMemo(() => {
    return (
      profile?.channelName ||
      profile?.nickname ||
      profile?.name ||
      'User'
    );
  }, [profile]);

  const videos = useMemo(() => {
    return (rawVideos || []).map(v => mapVideoToCard(v, profile));
  }, [rawVideos, profile]);

  const posts = useMemo(() => {
    return (rawPosts || []).map(p => mapPostToCard(p, profile));
  }, [rawPosts, profile]);

  const loadProfile = useCallback(async () => {
    if (!profileUserId) return;
    setProfileLoading(true);
    try {
      const data = await getChannelProfile(profileUserId, currentUser?.id);
      setProfile(data);
    } catch (e) {
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  }, [profileUserId, currentUser?.id]);

  const loadVideos = useCallback(async () => {
    if (!profileUserId) return;
    setVideosLoading(true);
    try {
      const res = await getUserVideos(profileUserId, 1, 50);
      setRawVideos(res?.videos || []);
    } catch (e) {
      setRawVideos([]);
    } finally {
      setVideosLoading(false);
    }
  }, [profileUserId]);

  const loadPosts = useCallback(async () => {
    if (!profileUserId) return;
    setPostsLoading(true);
    try {
      const res = await getPostsByUser(profileUserId, 1, 50);
      setRawPosts(res?.posts || []);
    } catch (e) {
      setRawPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [profileUserId]);

  const loadGallery = useCallback(async () => {
    if (!profileUserId) return;
    setGalleryLoading(true);
    try {
      const res = await getGallery(profileUserId);
      setGalleryPhotos(res?.photos ?? []);
    } catch (e) {
      setGalleryPhotos([]);
    } finally {
      setGalleryLoading(false);
    }
  }, [profileUserId]);

  useEffect(() => {
    if (!profileUserId) return;
    loadProfile();
    // Load Home tab data right away
    loadVideos();
  }, [profileUserId, loadProfile, loadVideos]);

  useEffect(() => {
    if (!profileUserId) return;
    if (activeTab === 'Posts') loadPosts();
    if (activeTab === 'Gallery') loadGallery();
    if (activeTab === 'Videos') loadVideos();
  }, [activeTab, profileUserId, loadPosts, loadGallery, loadVideos]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Navigation - OUTSIDE the image */}
      <View style={styles.topNavigation}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
          <View style={styles.backButtonInner}>
            <MaterialCommunityIcons name="chevron-left" size={16} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreIcon}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <UserProfileCard profile={profile} loading={profileLoading} />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map(tab => {
          const isGrid = tab === 'Gallery';
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabItem,
                isActive && styles.activeTabItem,
                isGrid && styles.gridTabItem
              ]}
              onPress={() => setActiveTab(tab)}
            >
              {isGrid ? (
                <MaterialCommunityIcons
                  name="view-grid"
                  size={22}
                  color={isActive ? "#FF7F0B" : "#444"}
                />
              ) : (
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                  {tab}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const getListData = () => {
    switch (activeTab) {
      case 'Home': return videos;
      case 'Posts': return posts;
      case 'Gallery': return galleryPhotos.map(p => ({ id: p.id, image: p.src }));
      case 'Videos': return videos;
      case 'Playlists': return MOCK_PLAYLISTS;
      default: return [];
    }
  };

  const renderContentItem = ({ item }) => {
    if (activeTab === 'Home') return <VideoCard video={item} />;
    if (activeTab === 'Posts') return <BusinessVideoCard video={item} />;
    if (activeTab === 'Gallery') {
      return (
        <View style={styles.gridImageContainer}>
          <Image source={{ uri: item.image }} style={styles.gridImage} />
        </View>
      );
    }
    if (activeTab === 'Videos') return <CompactVideoCard video={item} />;
    if (activeTab === 'Playlists') return (
      <View style={{ position: 'relative' }}>
        <PromotionCard item={item} />
        {/* Inject dots menu over the promotion card right side since promotion card doesn't have it natively */}
        <TouchableOpacity style={{ position: 'absolute', top: 12, right: 16, padding: 4 }}>
          <MaterialCommunityIcons name="dots-vertical" size={20} color="#333" />
        </TouchableOpacity>
      </View>
    );
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      {!profileUserId ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Login required</Text>
          <Text style={styles.emptyText}>Please login to view this profile.</Text>
        </View>
      ) : null}
      <FlatList
        key={activeTab === 'Gallery' ? 'grid-3-col' : `list-1-col-${activeTab}`}
        data={getListData()}
        keyExtractor={item => String(item.id)}
        renderItem={renderContentItem}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        numColumns={activeTab === 'Gallery' ? 3 : 1}
        columnWrapperStyle={activeTab === 'Gallery' ? styles.gridColumnWrapper : undefined}
        ListEmptyComponent={() => {
          const loading =
            (activeTab === 'Home' && videosLoading) ||
            (activeTab === 'Videos' && videosLoading) ||
            (activeTab === 'Posts' && postsLoading) ||
            (activeTab === 'Gallery' && galleryLoading);
          if (loading) {
            return (
              <View style={styles.loadingWrap}>
                <ActivityIndicator size="large" color="#FFAD33" />
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            );
          }
          return (
            <View style={styles.loadingWrap}>
              <Text style={styles.loadingText}>No data found.</Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingBottom: 20,
  },
  headerContainer: {
    paddingBottom: 0,
  },
  topNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  moreIcon: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Distribute evenly
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginVertical: 5,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 50,
    alignItems: 'center',
  },
  activeTabItem: {
    borderBottomWidth: 3,
    borderBottomColor: '#FFAD33', // Orange active border
  },
  gridTabItem: {
    paddingBottom: 8, // slight adjustment for icon centering
  },
  tabText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFAD33',
    fontWeight: '600',
  },
  gridColumnWrapper: {
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    gap: 8,
  },
  gridImageContainer: {
    width: (width - 32 - 16) / 3, // Full width minus horizontal padding (16*2) minus inner gaps (8*2)
    aspectRatio: 0.8, // Slightly taller than square exactly as done before
    marginBottom: 8,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  loadingWrap: { paddingVertical: 30, alignItems: 'center' },
  loadingText: { marginTop: 10, color: '#666' },
  emptyState: { padding: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  emptyText: { marginTop: 6, color: '#666' },
});

export default UserViewsScreen;
