import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Share,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BusinessProfileCard from '../../components/BusinessProfileCard';
import PromotionCard from '../../components/PromotionCard';
import BusinessVideoCard from '../../components/BusinessVideoCard';
import BusinessVideoTabCard from '../../components/BusinessVideoTabCard';
import CommentsModal from '../../components/CommentsModal';
import CreatePostModal from '../../components/CreatePostModal';
import {
  getPostsByUser,
  togglePostLike,
  togglePostDislike,
  recordPostShare,
} from '../../services/postService';
import { getChannelProfile, updateChannelProfile } from '../../services/channelService';
import { appSetUser } from '../../redux/actions/appSlice';

const { width } = Dimensions.get('window');

const formatCount = n => {
  if (n == null || n < 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

const formatTimeAgo = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
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

const mapPostToCard = (post, user) => {
  const u = post.user || user || {};
  const channelName = u.nickname || u.name || 'Unknown';
  const avatar =
    u.photos?.[0] ||
    (Array.isArray(u.photos) && u.photos[0]) ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(
      channelName,
    )}&background=111&color=fff`;
  const duration =
    post.mediaType === 'video' && post.duration != null
      ? `${Math.floor(post.duration / 60)}:${String(
          post.duration % 60,
        ).padStart(2, '0')}`
      : '';
  return {
    id: post.id,
    postId: post.id,
    title: post.title || 'Untitled',
    channelName,
    channelAvatar: avatar,
    publishedAt: formatTimeAgo(post.publishedAt || post.createdAt),
    thumbnail:
      post.thumbnailUrl || post.mediaUrl || 'https://via.placeholder.com/300',
    duration,
    likes: formatCount(post.likeCount ?? 0),
    dislikes: formatCount(post.dislikeCount ?? 0),
    comments: formatCount(post.commentCount ?? 0),
    shares: formatCount(post.shareCount ?? 0),
    website: post.website || '',
    hashtags: Array.isArray(post.hashtags) ? post.hashtags : [],
  };
};

const TABS = ['Posts', 'Promotions', 'Grid', 'Video', 'Notification'];
// ... (I will handle the rest in the next edit chunk for the render function to avoid giant replaces)

const MOCK_POSTS = [
  {
    id: '1',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    channelName: 'Dalchini',
    channelAvatar: 'https://via.placeholder.com/100',
    publishedAt: '5 months ago',
    thumbnail:
      'https://images.pexels.com/photos/2641886/pexels-photo-2641886.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    duration: '15:27',
    views: '3.2K',
    likes: '3.2K',
    dislikes: '368',
    comments: '675',
    shares: '675',
    website: 'www.tandoriplanet.com',
    hashtags: ['steak', 'food', 'fries'],
  },
  {
    id: '2',
    title: 'Special Beef Burger - Homemade Style',
    channelName: 'Dalchini',
    channelAvatar: 'https://via.placeholder.com/100',
    publishedAt: '2 months ago',
    thumbnail:
      'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    duration: '10:15',
    views: '5.1K',
    likes: '4.2K',
    dislikes: '120',
    comments: '890',
    shares: '450',
    website: 'www.tandoriplanet.com',
    hashtags: ['burger', 'beef', 'fastfood'],
  },
  {
    id: '3',
    title: 'Fresh Garden Salad with Lemon Dressing',
    channelName: 'Dalchini',
    channelAvatar: 'https://via.placeholder.com/100',
    publishedAt: '1 month ago',
    thumbnail:
      'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    duration: '05:45',
    views: '1.2K',
    likes: '900',
    dislikes: '15',
    comments: '120',
    shares: '80',
    website: 'www.tandoriplanet.com',
    hashtags: ['salad', 'healthy', 'vegan'],
  },
];

const MOCK_PROMOTIONS = [
  {
    id: '1',
    title: '10 Rice Bag',
    price: '$100',
    image:
      'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '120',
  },
  {
    id: '2',
    title: '10 Rice Bag',
    price: '$100',
    image:
      'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '120',
  },
  {
    id: '3',
    title: '10 Rice Bag',
    price: '$100',
    image:
      'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '120',
  },
];

const MOCK_GRID_IMAGES = [
  {
    id: '1',
    image:
      'https://images.pexels.com/photos/2641886/pexels-photo-2641886.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    id: '2',
    image:
      'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    id: '3',
    image:
      'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    id: '4',
    image:
      'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    id: '5',
    image:
      'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    id: '6',
    image:
      'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    id: '7',
    image:
      'https://images.pexels.com/photos/699953/pexels-photo-699953.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    id: '8',
    image:
      'https://images.pexels.com/photos/718742/pexels-photo-718742.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
  {
    id: '9',
    image:
      'https://images.pexels.com/photos/675951/pexels-photo-675951.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
  },
];

const MOCK_VIDEOS = [
  {
    id: '1',
    title: 'Tandoori Planet',
    thumbnail:
      'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '100k',
    location: 'Birmingham, UK',
    distance: '12 Km',
  },
  {
    id: '2',
    title: 'Spicy Burger House',
    thumbnail:
      'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '85k',
    location: 'London, UK',
    distance: '5 Km',
  },
];

const BusinessProfileViewScreen = ({ navigation }) => {
  const route = useRoute();
  const dispatch = useDispatch();
  const currentUser = useSelector(state => state.app?.user);
  const profileUserId = route.params?.userId ?? currentUser?.id;
  const isOwnProfile = profileUserId === currentUser?.id;

  const [activeTab, setActiveTab] = useState('Posts');
  const [posts, setPosts] = useState([]);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsRefreshing, setPostsRefreshing] = useState(false);
  const [createPostModalVisible, setCreatePostModalVisible] = useState(false);
  const [commentsModalPostId, setCommentsModalPostId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editNickname, setEditNickname] = useState('');
  const [editChannelAbout, setEditChannelAbout] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const loadPosts = useCallback(
    async (refresh = false) => {
      if (!profileUserId) {
        setPosts([]);
        return;
      }
      if (refresh) setPostsRefreshing(true);
      else setPostsLoading(true);
      try {
        const res = await getPostsByUser(profileUserId, 1, 50);
        const list = (res?.posts || []).map(p => mapPostToCard(p, p.user));
        setPosts(list);
      } catch (e) {
        setPosts([]);
      } finally {
        setPostsLoading(false);
        setPostsRefreshing(false);
      }
    },
    [profileUserId],
  );

  useEffect(() => {
    if (activeTab === 'Posts' && profileUserId) {
      loadPosts();
    }
  }, [activeTab, profileUserId, loadPosts]);

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

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const openEditProfile = () => {
    setEditName(profile?.name ?? currentUser?.name ?? '');
    setEditNickname(profile?.nickname ?? profile?.channelName ?? currentUser?.nickname ?? '');
    setEditChannelAbout(profile?.channelAbout ?? currentUser?.channelAbout ?? '');
    setEditPhone(currentUser?.phone ?? '');
    setEditAddress(profile?.address ?? currentUser?.address ?? '');
    setEditProfileVisible(true);
  };

  const saveProfile = async () => {
    if (!profileUserId || profileUserId !== currentUser?.id) return;
    setSavingProfile(true);
    try {
      await updateChannelProfile(profileUserId, {
        name: editName.trim() || undefined,
        nickname: editNickname.trim() || undefined,
        channelAbout: editChannelAbout.trim() || undefined,
        phone: editPhone.trim() || undefined,
        address: editAddress.trim() || undefined,
      });
      await loadProfile();
      if (currentUser?.id === profileUserId) {
        dispatch(appSetUser({
          ...currentUser,
          name: editName.trim() || currentUser.name,
          nickname: editNickname.trim() || currentUser.nickname,
          channelAbout: editChannelAbout.trim() || currentUser.channelAbout,
          phone: editPhone.trim() || currentUser.phone,
          address: editAddress.trim() || currentUser.address,
        }));
      }
      setEditProfileVisible(false);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const updatePostInList = useCallback((postId, updater) => {
    setPosts(prev =>
      prev.map(p => (p.postId === postId || p.id === postId ? updater(p) : p)),
    );
  }, []);

  const handlePostLike = useCallback(
    async postId => {
      if (!currentUser?.id) return;
      const post = posts.find(p => p.postId === postId || p.id === postId);
      if (!post) return;
      const prevLikes = post.likes;
      updatePostInList(postId, p => ({
        ...p,
        likes: String(Math.max(0, Number(p.likes) + 1)),
      }));
      try {
        const res = await togglePostLike(postId, currentUser.id);
        const delta = res?.liked ? 1 : -1;
        updatePostInList(postId, p => ({
          ...p,
          likes: String(Math.max(0, Number(prevLikes) + delta)),
        }));
      } catch {
        updatePostInList(postId, p => ({ ...p, likes: prevLikes }));
      }
    },
    [currentUser?.id, posts, updatePostInList],
  );

  const handlePostDislike = useCallback(
    async postId => {
      if (!currentUser?.id) return;
      const post = posts.find(p => p.postId === postId || p.id === postId);
      if (!post) return;
      const prevDislikes = post.dislikes;
      updatePostInList(postId, p => ({
        ...p,
        dislikes: String(Math.max(0, Number(p.dislikes) + 1)),
      }));
      try {
        const res = await togglePostDislike(postId, currentUser.id);
        const delta = res?.disliked ? 1 : -1;
        updatePostInList(postId, p => ({
          ...p,
          dislikes: String(Math.max(0, Number(prevDislikes) + delta)),
        }));
      } catch {
        updatePostInList(postId, p => ({ ...p, dislikes: prevDislikes }));
      }
    },
    [currentUser?.id, posts, updatePostInList],
  );

  const handlePostShare = useCallback(
    async postId => {
      const post = posts.find(p => p.postId === postId || p.id === postId);
      if (!post) return;
      try {
        await Share.share({
          message: `${post.title}\neatix://post/${postId}`,
          title: post.title,
        });
        await recordPostShare(postId);
        updatePostInList(postId, p => ({
          ...p,
          shares: String(Number(p.shares || 0) + 1),
        }));
      } catch (e) {
        if (e?.message !== 'User did not share') {
          // ignore
        }
      }
    },
    [posts, updatePostInList],
  );

  const handlePostCommentAdded = useCallback(
    (_, delta = 1) => {
      if (commentsModalPostId) {
        updatePostInList(commentsModalPostId, p => ({
          ...p,
          comments: String(Number(p.comments || 0) + delta),
        }));
      }
    },
    [commentsModalPostId, updatePostInList],
  );

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Navigation - OUTSIDE the image */}
      <View style={styles.topNavigation}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation?.goBack()}
        >
          <View style={styles.backButtonInner}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={16}
              color="#fff"
            />
            <Text style={styles.backText}>Back</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreIcon}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <BusinessProfileCard
        profile={profile}
        isOwnProfile={isOwnProfile}
        onEditProfile={openEditProfile}
      />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map(tab => {
            const isGrid = tab === 'Grid';
            const isActive = activeTab === tab;

            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tabItem,
                  activeTab === tab && styles.activeTabItem,
                ]}
                onPress={() => setActiveTab(tab)}
              >
                {isGrid ? (
                  <MaterialCommunityIcons
                    name="view-grid"
                    size={22}
                    color={isActive ? '#FF7F0B' : '#444'}
                  />
                ) : (
                  <Text
                    style={[styles.tabText, isActive && styles.activeTabText]}
                  >
                    {tab}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {activeTab === 'Grid'
            ? 'Gallery'
            : activeTab === 'Video'
            ? 'Videos'
            : activeTab}
        </Text>
        {activeTab === 'Posts' && profileUserId === currentUser?.id ? (
          <TouchableOpacity onPress={() => setCreatePostModalVisible(true)}>
            <MaterialCommunityIcons name="plus" size={24} color="#333" />
          </TouchableOpacity>
        ) : (
          <View style={styles.plusPlaceholder} />
        )}
      </View>
    </View>
  );

  const getListData = () => {
    switch (activeTab) {
      case 'Posts':
        return posts;
      case 'Promotions':
        return MOCK_PROMOTIONS;
      case 'Grid':
        return MOCK_GRID_IMAGES;
      case 'Video':
        return MOCK_VIDEOS;
      default:
        return [];
    }
  };

  const renderContentItem = ({ item }) => {
    if (activeTab === 'Posts') {
      const postId = item.postId || item.id;
      return (
        <BusinessVideoCard
          video={item}
          postId={postId}
          onPress={undefined}
          onLike={currentUser?.id ? () => handlePostLike(postId) : undefined}
          onDislike={
            currentUser?.id ? () => handlePostDislike(postId) : undefined
          }
          onCommentPress={() => {
            setCommentsModalPostId(postId);
          }}
          onShare={() => handlePostShare(postId)}
        />
      );
    }
    if (activeTab === 'Promotions') return <PromotionCard item={item} />;
    if (activeTab === 'Grid') {
      return (
        <View style={styles.gridImageContainer}>
          <Image source={{ uri: item.image }} style={styles.gridImage} />
        </View>
      );
    }
    if (activeTab === 'Video') return <BusinessVideoTabCard item={item} />;
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      {activeTab === 'Posts' && postsLoading && posts.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#FF7F0B" />
          <Text style={styles.loadingText}>Loading posts...</Text>
        </View>
      ) : null}
      <FlatList
        key={activeTab === 'Grid' ? 'grid-3-col' : `list-1-col-${activeTab}`}
        data={getListData()}
        keyExtractor={item => item.id}
        renderItem={renderContentItem}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        numColumns={activeTab === 'Grid' ? 3 : 1}
        columnWrapperStyle={
          activeTab === 'Grid' ? styles.gridColumnWrapper : undefined
        }
        refreshControl={
          activeTab === 'Posts' && profileUserId ? (
            <RefreshControl
              refreshing={postsRefreshing}
              onRefresh={() => loadPosts(true)}
              colors={['#FF7F0B']}
              tintColor="#FF7F0B"
            />
          ) : undefined
        }
      />
      <CommentsModal
        visible={!!commentsModalPostId}
        onClose={() => setCommentsModalPostId(null)}
        contentType="post"
        contentId={commentsModalPostId}
        user={currentUser}
        onCommentAdded={handlePostCommentAdded}
        onCommentDeleted={(_topLevel, count) =>
          handlePostCommentAdded(null, -(count || 1))
        }
      />
      <CreatePostModal
        visible={createPostModalVisible}
        onClose={() => setCreatePostModalVisible(false)}
        onSuccess={() => loadPosts(true)}
        userId={currentUser?.id}
      />

      <Modal
        visible={editProfileVisible}
        animationType="slide"
        transparent
        onRequestClose={() => !savingProfile && setEditProfileVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.editModalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.editModalBackdrop} />
          <View style={styles.editModalBox}>
            <View style={styles.editModalHeader}>
              <Text style={styles.editModalTitle}>Edit Profile</Text>
              <TouchableOpacity
                onPress={() => !savingProfile && setEditProfileVisible(false)}
                disabled={savingProfile}
              >
                <MaterialCommunityIcons name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.editModalScroll} keyboardShouldPersistTaps="handled">
              <Text style={styles.editLabel}>Name</Text>
              <TextInput
                style={styles.editInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Name"
                placeholderTextColor="#999"
              />
              <Text style={styles.editLabel}>Nickname (display name)</Text>
              <TextInput
                style={styles.editInput}
                value={editNickname}
                onChangeText={setEditNickname}
                placeholder="Nickname"
                placeholderTextColor="#999"
              />
              <Text style={styles.editLabel}>About</Text>
              <TextInput
                style={[styles.editInput, styles.editInputMultiline]}
                value={editChannelAbout}
                onChangeText={setEditChannelAbout}
                placeholder="About your channel"
                placeholderTextColor="#999"
                multiline
                numberOfLines={3}
              />
              <Text style={styles.editLabel}>Phone</Text>
              <TextInput
                style={styles.editInput}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Phone"
                placeholderTextColor="#999"
                keyboardType="phone-pad"
              />
              <Text style={styles.editLabel}>Address</Text>
              <TextInput
                style={styles.editInput}
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="Address"
                placeholderTextColor="#999"
              />
            </ScrollView>
            <TouchableOpacity
              style={[styles.editSaveBtn, savingProfile && styles.editSaveBtnDisabled]}
              onPress={saveProfile}
              disabled={savingProfile}
            >
              <Text style={styles.editSaveBtnText}>
                {savingProfile ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  loadingText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
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
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  coverArea: {
    width: '100%',
    height: 400,
    backgroundColor: '#eee',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgeContainer: {
    position: 'absolute',
    top: 15,
    right: 15,
    alignItems: 'flex-end',
  },
  twoPartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIconPart: {
    backgroundColor: '#fff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  badgeTextPart: {
    backgroundColor: '#FFAD33',
    paddingLeft: 20,
    paddingRight: 15,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: -16,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  profileOverlayBox: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(184, 115, 0, 0.65)',
    borderRadius: 20,
    padding: 15,
  },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
  },
  profileAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#333',
  },
  avatarEditIcon: {
    position: 'absolute',
    top: 5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
  },
  profileNameGroup: {
    marginLeft: 15,
  },
  businessName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 5,
  },
  dotSeparator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginLeft: 8,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editProfileBtnLarge: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 12,
    flex: 1,
  },
  editBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  squareIconBtn: {
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBottomPart: {
    backgroundColor: '#dcdcdc',
    paddingTop: 15,
    paddingBottom: 20,
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusMsgContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingTop: 15,
    paddingHorizontal: 20,
  },
  statusMsg: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginVertical: 10,
    paddingHorizontal: 16,
  },
  tabItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 5,
  },
  activeTabItem: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF7F0B',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FF7F0B',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  plusPlaceholder: {
    width: 24,
    height: 24,
  },
  gridColumnWrapper: {
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    gap: 8,
  },
  gridImageContainer: {
    width: (width - 24 - 16) / 3, // Full width minus horizontal padding minus inner gaps
    aspectRatio: 0.8, // Slightly taller than square as per Figma
    marginBottom: 8,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
  editModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  editModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  editModalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    paddingBottom: 24,
  },
  editModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  editModalScroll: {
    maxHeight: 400,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  editLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  editInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  editInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  editSaveBtn: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: '#FF7F0B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  editSaveBtnDisabled: {
    opacity: 0.7,
  },
  editSaveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BusinessProfileViewScreen;
