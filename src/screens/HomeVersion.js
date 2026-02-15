import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  FlatList,
  Dimensions,
  Modal,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import TrendingView from './TrendingView';
import NotificationScreen from './NotificationScreen';
import SearchScreen from './SearchScreen';
import { shortsService } from '../services/shortsService';
import { getVideos } from '../services/videoService';

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

// --- Static Data ---
const CATEGORIES = ['Trending', 'All', 'For You', 'Live'];
const STORIES = ['Tomato Guy', 'Fire Baking', 'Tomato Girl'];

const REPORT_REASONS = [
  'Sexual Content',
  'Violent or Repulsive Content',
  'Hateful or Abusive Content',
  'Harmful or Dangerous Acts',
  'Spam or Misleading',
  'Child Abuse',
  'Others',
];

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

const HomeVersion = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('All');
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Sexual Content');
  const [shortsData, setShortsData] = useState([]);
  const [videosData, setVideosData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadFeed = useCallback(async () => {
    try {
      const [shortsRes, videosRes] = await Promise.all([
        shortsService.getShorts({ page: 1, limit: 20 }),
        getVideos({ page: 1, limit: 20 }),
      ]);
      const shorts = (shortsRes?.shorts || []).filter(s => s.videoUrl && String(s.videoUrl).trim());
      const videos = videosRes?.videos || [];
      setShortsData(shorts.map(mapShortToCard));
      setVideosData(videos.map(mapVideoToCard));
    } catch (e) {
      setShortsData([]);
      setVideosData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFeed();
  };

  const mainFeed = [
    { type: 'SHORTS', id: 'header-shorts', data: shortsData },
    ...videosData.slice(0, 2).map(v => ({ type: 'VIDEO', ...v })),
    { type: 'CONTINUE', id: 'continue-watching', data: videosData.slice(0, 3) },
    ...videosData.slice(2).map(v => ({ type: 'VIDEO', ...v })),
    { type: 'SHORTS', id: 'footer-shorts', data: shortsData },
  ];

  const StoryCircle = ({ label }) => (
    <View style={styles.storyContainer}>
      <View style={styles.storyBorder}>
        <Image
          source={{ uri: 'https://via.placeholder.com/100' }}
          style={styles.storyImage}
        />
      </View>
      <Text style={styles.storyLabel}>{label}</Text>
    </View>
  );

  const SectionHeader = ({ icon, title }) => (
    <View style={styles.feedHeaderRow}>
      <Icon name={icon} size={24} color={COLORS.primaryOrange} />
      <Text style={styles.feedHeaderText}>{title}</Text>
    </View>
  );

  const openReportModal = () => {
    setOptionsVisible(false);
    setTimeout(() => {
      setReportVisible(true);
    }, 100);
  };

  const handleShortPress = (shortId) => {
    navigation.getParent()?.navigate('Shorts');
  };

  const handleVideoPress = (videoId) => {
    navigation.navigate('VideoDetailsScreen', { videoId });
  };

  const renderItem = ({ item }) => {
    if (item.type === 'SHORTS') {
      const shorts = item.data || [];
      if (shorts.length === 0) return null;
      return (
        <View style={styles.whiteSection}>
          <SectionHeader icon="video-outline" title="Shorts" />
          <FlatList
            horizontal
            data={shorts}
            keyExtractor={s => s.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: SPACING.lg,
              paddingBottom: 20,
            }}
            renderItem={({ item: short }) => (
              <TouchableOpacity
                style={styles.shortCard}
                onPress={() => handleShortPress(short.id)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: short.image }}
                  style={styles.shortImage}
                />
                <View style={styles.shortOverlay}>
                  <Text style={styles.shortTitle} numberOfLines={2}>
                    {short.title}
                  </Text>
                  <Text style={styles.shortViews}>{short.views}</Text>
                </View>
                <TouchableOpacity
                  style={styles.moreIconShort}
                  onPress={() => setOptionsVisible(true)}
                >
                  <Icon name="dots-vertical" size={18} color="#fff" />
                </TouchableOpacity>
              </TouchableOpacity>
            )}
          />
        </View>
      );
    }

    if (item.type === 'CONTINUE') {
      const continueData = item.data || [];
      if (continueData.length === 0) return null;
      return (
        <View style={styles.continueSection}>
          <SectionHeader icon="video-vintage" title="Continue watching" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: SPACING.lg }}
          >
            {continueData.map(c => (
              <TouchableOpacity
                key={c.id}
                style={styles.continueCard}
                onPress={() => handleVideoPress(c.id)}
                activeOpacity={0.9}
              >
                <Image source={{ uri: c.thumbnail }} style={styles.continueImage} />
                <View style={styles.playButtonSmall}>
                  <Icon name="play" size={16} color="#fff" />
                </View>
                <View style={styles.progressBar} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      );
    }

    if (item.type === 'VIDEO')
      return (
        <TouchableOpacity
          style={styles.videoCard}
          onPress={() => handleVideoPress(item.id)}
          activeOpacity={1}
        >
          <View style={styles.thumbnailWrapper}>
            <Image
              source={{ uri: item.thumbnail }}
              style={styles.videoThumbnail}
            />
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{item.duration || '0:00'}</Text>
            </View>
          </View>
          <View style={styles.videoDetails}>
            <View style={styles.channelIcon} />
            <View style={styles.videoInfo}>
              <Text style={styles.videoTitleMerged}>{item.title}</Text>
              <Text style={styles.videoMetaMerged}>
                {item.author} • {item.views} • {item.time}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setOptionsVisible(true)}>
              <Icon name="dots-vertical" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    return null;
  };

  if (showSearch) {
    return <SearchScreen onBack={() => setShowSearch(false)} />;
  }

  if (showNotifications) {
    return <NotificationScreen onBack={() => setShowNotifications(false)} />;
  }

  if (activeTab === 'Trending') {
    return (
      <View style={styles.container}>
        <TrendingView
          onBack={() => setActiveTab('All')}
          videoData={mainFeed.filter(i => i.type === 'VIDEO')}
          renderVideoItem={renderItem}
        />
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={COLORS.primaryOrange} />
        <Text style={styles.loadingText}>Loading feed...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <View style={styles.navBar}>
          <Text style={styles.logoText}>
            eat<Text style={{ color: COLORS.primaryOrange }}>ix</Text>
          </Text>
          <View style={styles.navIcons}>
            <TouchableOpacity onPress={() => setShowSearch(true)}>
              <Icon
                name="magnify"
                size={26}
                color={COLORS.textPrimary}
                style={styles.iconSpaced}
              />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setShowNotifications(true)}>
              <Icon
                name="bell-outline"
                size={26}
                color={COLORS.textPrimary}
                style={styles.iconSpaced}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.profileMini}
              onPress={() =>
                navigation.navigate('Library', { screen: 'ProfileScreen' })
              }
              activeOpacity={0.7}
            />
          </View>
        </View>
      </SafeAreaView>

      <FlatList
        data={mainFeed}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primaryOrange]}
            tintColor={COLORS.primaryOrange}
          />
        }
        ListHeaderComponent={
          <>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
            >
              {CATEGORIES.map((cat, i) => (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setActiveTab(cat)}
                  style={[styles.chip, i === 0 && styles.chipActive]}
                >
                  <Text
                    style={[styles.chipText, i === 0 && styles.chipTextActive]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.storyScroll}
            >
              {STORIES.map(name => (
                <StoryCircle key={name} label={name} />
              ))}
            </ScrollView>
          </>
        }
      />

      <Modal
        animationType="slide"
        transparent
        visible={optionsVisible}
        onRequestClose={() => setOptionsVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setOptionsVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>More Option</Text>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.optionRow}>
              <Icon name="playlist-plus" size={24} color="#333" />
              <Text style={styles.optionText}>Save to Playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow}>
              <Icon name="clock-outline" size={24} color="#333" />
              <Text style={styles.optionText}>Save to Watch Later</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow}>
              <Icon name="download-outline" size={24} color="#333" />
              <Text style={styles.optionText}>Download Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow}>
              <Icon name="share-variant-outline" size={24} color="#333" />
              <Text style={styles.optionText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionRow}
              onPress={openReportModal}
            >
              <Icon
                name="alert-circle-outline"
                size={24}
                color={COLORS.primaryOrange}
              />
              <Text
                style={[styles.optionText, { color: COLORS.primaryOrange }]}
              >
                Report
              </Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      <Modal
        animationType="slide"
        transparent
        visible={reportVisible}
        onRequestClose={() => setReportVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setReportVisible(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Report</Text>
            <View style={styles.divider} />
            {REPORT_REASONS.map(reason => (
              <TouchableOpacity
                key={reason}
                activeOpacity={0.8}
                style={styles.reportOptionRow}
                onPress={() => setSelectedReason(reason)}
              >
                <Icon
                  name={
                    selectedReason === reason
                      ? 'radiobox-marked'
                      : 'radiobox-blank'
                  }
                  size={24}
                  color={COLORS.primaryOrange}
                />
                <Text style={styles.reportOptionText}>{reason}</Text>
              </TouchableOpacity>
            ))}
            <View style={styles.reportActionRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setReportVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => setReportVisible(false)}
              >
                <Text style={styles.submitButtonText}>Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.gray500,
  },
  safeArea: {
    backgroundColor: COLORS.white,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  logoText: { fontSize: FONTS.xxl, fontWeight: FONTS.bold },
  navIcons: { flexDirection: 'row', alignItems: 'center' },
  iconSpaced: { marginRight: SPACING.md },
  profileMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.gray300,
  },
  chipScroll: { marginVertical: SPACING.md, paddingLeft: SPACING.lg },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: COLORS.primaryOrange,
    marginRight: SPACING.md,
  },
  chipActive: { backgroundColor: COLORS.primaryOrange },
  chipText: { color: COLORS.primaryOrange, fontWeight: '600' },
  chipTextActive: { color: COLORS.white },
  storyScroll: { paddingLeft: SPACING.lg, marginBottom: SPACING.lg },
  storyContainer: { alignItems: 'center', marginRight: SPACING.md },
  storyBorder: {
    padding: 3,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: COLORS.primaryOrange,
  },
  storyImage: { width: 65, height: 65, borderRadius: 32.5 },
  storyLabel: { fontSize: 11, marginTop: 5, color: '#666' },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    marginVertical: 12,
  },
  feedHeaderText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
    color: '#000',
  },
  shortCard: {
    width: width * 0.45,
    height: 280,
    borderRadius: 15,
    overflow: 'hidden',
    marginHorizontal: 5,
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
  moreIconShort: { position: 'absolute', top: 10, right: 5, padding: 5 },
  continueSection: { backgroundColor: '#fff', paddingVertical: 10 },
  continueCard: {
    width: 170,
    height: 100,
    marginRight: 12,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  continueImage: { width: '100%', height: '100%' },
  playButtonSmall: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    backgroundColor: COLORS.primaryOrange,
    borderRadius: 4,
    padding: 2,
  },
  progressBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    height: 3,
    width: '70%',
    backgroundColor: COLORS.primaryOrange,
  },
  videoCard: { marginBottom: 15 },
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
  videoTitleMerged: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    lineHeight: 20,
  },
  videoMetaMerged: { fontSize: 12, color: '#606060', marginTop: 2 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 15,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 15,
  },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 15 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
    fontWeight: '500',
  },
  reportOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  reportOptionText: { fontSize: 16, color: '#333', marginLeft: 12 },
  reportActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 25,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFF5F0',
    paddingVertical: 15,
    borderRadius: 30,
    marginRight: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.primaryOrange,
    fontWeight: 'bold',
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
    backgroundColor: COLORS.primaryOrange,
    paddingVertical: 15,
    borderRadius: 30,
    marginLeft: 10,
    alignItems: 'center',
  },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});

export default HomeVersion;
