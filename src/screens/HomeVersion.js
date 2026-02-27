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
  Share,
  Alert,
} from 'react-native';
import { getCurrentPositionSafe, reverseGeocode } from '../utils/geolocation';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useSelector, useDispatch } from 'react-redux';
import { appSetUser } from '../redux/actions/appSlice';
import { config } from '../../config';
import { navigationRef } from '../utils/helper';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import NotificationScreen from './NotificationScreen';
import { shortsService } from '../services/shortsService';
import { getVideos, getVideoWatchHistory, recordShare } from '../services/videoService';
import { getChannelsList } from '../services/channelService';
import { getSponsoredByLocation } from '../services/sponsoredService';
import { getFeaturedByLocation } from '../services/featuredService';
import { setPlaylist } from '../services/playlistService';
import { downloadVideo } from '../services/downloadService';
import { submitReport } from '../services/reportService';
import SaveModal from '../components/SaveModal';
import Toast from 'react-native-toast-message';

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

// --- Categories: Live=shorts, Trending=most views, All=random, For You=subscribed, Nearby=by location ---
const CATEGORIES = ['All', 'Trending', 'Live', 'For You', 'Nearby'];

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
    type: 'short',
    title,
    views: `${formatCount(s.viewCount ?? s._count?.views ?? 0)} views`,
    image: s.thumbnailUrl || s.videoUrl || 'https://via.placeholder.com/200',
    thumbnail: s.thumbnailUrl || s.videoUrl || 'https://via.placeholder.com/200',
    videoUrl: s.videoUrl,
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
    videoUrl: v.videoUrl,
  };
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const HomeVersion = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user: currentUser } = useSelector((state) => state.app) || {};
  const [activeTab, setActiveTab] = useState('All');
  const [showNotifications, setShowNotifications] = useState(false);
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Sexual Content');
  const [selectedItem, setSelectedItem] = useState(null); // { id, type: 'video'|'short', title, videoUrl?, ... }
  const [shortsData, setShortsData] = useState([]);
  const [videosData, setVideosData] = useState([]);
  const [continueData, setContinueData] = useState([]);
  const [channelsData, setChannelsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(null); // { lat, lng } for Nearby
  const [locationLoading, setLocationLoading] = useState(false);
  const [sponsoredVideo, setSponsoredVideo] = useState(null); // { video, areaName, ... } when user has location
  const [featuredVideo, setFeaturedVideo] = useState(null); // { video, areaName, ... } when user has location

  const loadChannels = useCallback(async () => {
    try {
      const res = await getChannelsList(20);
      setChannelsData(res?.channels || []);
    } catch (e) {
      setChannelsData([]);
    }
  }, []);

  const loadContinueWatching = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      const [vRes, sRes] = await Promise.all([
        getVideoWatchHistory(currentUser.id, 1, 20),
        shortsService.getWatchHistory(currentUser.id, 1, 20),
      ]);
      const vHistory = (vRes?.history || []).map(({ video, watchedAt }) => ({
        ...mapVideoToCard(video),
        watchedAt: new Date(watchedAt).getTime(),
      }));
      const sHistory = (sRes?.history || []).map(({ short: s, watchedAt }) => ({
        ...mapShortToCard(s),
        watchedAt: new Date(watchedAt).getTime(),
      }));
      const merged = [...vHistory, ...sHistory]
        .sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0))
        .slice(0, 10);
      setContinueData(merged);
    } catch (e) {
      setContinueData([]);
    }
  }, [currentUser?.id]);

  // Nearby feed uses TWO API calls: (1) GET /sponsored/by-location + GET /featured/by-location (see useEffect below)
  // for sponsored/featured at top; (2) GET /videos?nearbyLat&nearbyLng&excludeSponsored&excludeFeatured for
  // regular nearby videos. Sponsored/featured are shown in header and first feed items; regular videos in baseFeed.
  const loadFeed = useCallback(async () => {
    const isNearby = activeTab === 'Nearby' && selectedLocation?.lat != null && selectedLocation?.lng != null;
    const baseParams = { page: 1, limit: 100, sort: 'latest' };
    const videoParams = isNearby
      ? {
          ...baseParams,
          nearbyLat: selectedLocation.lat,
          nearbyLng: selectedLocation.lng,
          radiusKm: 50,
          // Exclude sponsored and featured from the videos list in Nearby (so they don't appear twice).
          // IMPORTANT: do NOT send this param to shorts API (it can 400).
          excludeSponsored: true,
          excludeFeatured: true,
        }
      : baseParams;
    const shortParams = isNearby
      ? { ...baseParams, nearbyLat: selectedLocation.lat, nearbyLng: selectedLocation.lng, radiusKm: 50 }
      : baseParams;
    try {
      const [shortsRes, videosRes] = await Promise.all([
        shortsService.getShorts(shortParams),
        getVideos(videoParams),
      ]);
      const shorts = (shortsRes?.shorts || []).filter(
        (s) => s.videoUrl && String(s.videoUrl).trim(),
      );
      const videos = videosRes?.videos || [];
      if (!isNearby) {
        const shuffledShorts = shuffle(shorts).map(mapShortToCard);
        const shuffledVideos = shuffle(videos).map(mapVideoToCard);
        setShortsData(shuffledShorts);
        setVideosData(shuffledVideos);
      } else {
        setShortsData(shorts.map(mapShortToCard));
        setVideosData(videos.map(mapVideoToCard));
      }
    } catch (e) {
      console.error('Error loading feed:', e);
      setShortsData([]);
      setVideosData([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab, selectedLocation]);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  // When switching to Nearby, use profile location if available and none set
  useEffect(() => {
    if (activeTab === 'Nearby' && !selectedLocation && currentUser?.latitude != null && currentUser?.longitude != null) {
      setSelectedLocation({ lat: currentUser.latitude, lng: currentUser.longitude });
    }
  }, [activeTab, currentUser?.latitude, currentUser?.longitude]);

  // Fetch sponsored and featured videos for current location (area-wise)
  useEffect(() => {
    if (activeTab !== 'Nearby' || !selectedLocation?.lat || !selectedLocation?.lng) {
      setSponsoredVideo(null);
      setFeaturedVideo(null);
      return;
    }
    const lat = selectedLocation.lat;
    const lng = selectedLocation.lng;
    if (__DEV__) console.log('[HomeVersion] Fetching sponsored/featured for', lat, lng);
    getSponsoredByLocation(lat, lng)
      .then(({ sponsored }) => {
        if (__DEV__) console.log('[HomeVersion] Sponsored result', { hasSponsored: !!sponsored, hasVideo: !!sponsored?.video });
        setSponsoredVideo(sponsored || null);
      })
      .catch((err) => {
        console.warn('[HomeVersion] Sponsored fetch error', err?.message || err);
        setSponsoredVideo(null);
      });
    getFeaturedByLocation(lat, lng)
      .then(({ featured }) => setFeaturedVideo(featured || null))
      .catch(() => setFeaturedVideo(null));
  }, [activeTab, selectedLocation?.lat, selectedLocation?.lng]);

  const handleUseMyLocationForNearby = () => {
    setLocationLoading(true);
    getCurrentPositionSafe(
      async pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelectedLocation({ lat, lng });
        // Fetch sponsored and featured for this location so they show at top right away
        Promise.all([
          getSponsoredByLocation(lat, lng).then(({ sponsored }) => sponsored || null).catch(() => null),
          getFeaturedByLocation(lat, lng).then(({ featured }) => featured || null).catch(() => null),
        ]).then(([sponsored, featured]) => {
          setSponsoredVideo(sponsored);
          setFeaturedVideo(featured);
        }).finally(() => {
          setLocationLoading(false);
        });
        // Save to user profile (with address from reverse geocode so address is not null)
        if (currentUser?.id && currentUser?.token) {
          try {
            const address = await reverseGeocode(lat, lng);
            const response = await fetch(`${config.apiBaseUrl}/users/${currentUser.id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${currentUser.token}`,
              },
              body: JSON.stringify({
                latitude: lat,
                longitude: lng,
                ...(address ? { address } : {}),
              }),
            });
            if (response.ok) {
              const data = await response.json();
              const updated = data.userUpdate || {};
              dispatch(appSetUser({
                ...currentUser,
                latitude: updated.latitude ?? lat,
                longitude: updated.longitude ?? lng,
                ...(updated.address != null ? { address: updated.address } : address ? { address } : {}),
              }));
            }
          } catch (e) {
            // Location still used for Nearby; profile update is best-effort
          }
        }
      },
      err => {
        setLocationLoading(false);
        Toast.show({ type: 'error', text1: err || 'Could not get location' });
      },
    );
  };

  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  useEffect(() => {
    loadContinueWatching();
  }, [loadContinueWatching]);

  const onRefresh = () => {
    setRefreshing(true);
    loadFeed();
    loadChannels();
    loadContinueWatching();
    if (activeTab === 'Nearby' && selectedLocation?.lat != null && selectedLocation?.lng != null) {
      getSponsoredByLocation(selectedLocation.lat, selectedLocation.lng)
        .then(({ sponsored }) => setSponsoredVideo(sponsored || null))
        .catch(() => setSponsoredVideo(null));
      getFeaturedByLocation(selectedLocation.lat, selectedLocation.lng)
        .then(({ featured }) => setFeaturedVideo(featured || null))
        .catch(() => setFeaturedVideo(null));
    }
  };

  const buildMainFeed = () => {
    const shorts = shortsData || [];
    const videos = videosData || [];
    const feed = [];
    let sIdx = 0;
    let vIdx = 0;

    console.log('Building feed - shorts:', shorts.length, 'videos:', videos.length);

    // 1) First block: 2 shorts
    const firstShorts = shorts.slice(sIdx, sIdx + 2);
    sIdx += firstShorts.length;
    if (firstShorts.length > 0) {
      feed.push({ type: 'SHORTS', id: 's-2', data: firstShorts });
    }

    // 2) Then 2 videos
    const firstVideos = videos.slice(vIdx, vIdx + 2);
    vIdx += firstVideos.length;
    if (firstVideos.length > 0) {
      firstVideos.forEach(v => {
        feed.push({ ...v, type: 'VIDEO' }); // Ensure type is VIDEO (uppercase) after spread
      });
      console.log('Added first 2 videos to feed');
    } else {
      console.log('No videos available to add');
    }

    // 3) Continue watching block
    if (continueData.length > 0) {
      feed.push({
        type: 'CONTINUE',
        id: 'continue-watching',
        data: continueData.slice(0, 3),
      });
    }

    // 4) Then blocks that grow: 4, 6, 8, ... shorts/videos
    let blockSize = 4;
    while (sIdx < shorts.length || vIdx < videos.length) {
      const blockShorts = shorts.slice(sIdx, sIdx + blockSize);
      sIdx += blockShorts.length;
      if (blockShorts.length > 0) {
        feed.push({
          type: 'SHORTS',
          id: `s-${sIdx}`,
          data: blockShorts,
        });
      }

      const blockVideos = videos.slice(vIdx, vIdx + blockSize);
      vIdx += blockVideos.length;
      if (blockVideos.length > 0) {
        blockVideos.forEach(v => {
          feed.push({ ...v, type: 'VIDEO' }); // Ensure type is VIDEO (uppercase) after spread
        });
        console.log(`Added ${blockVideos.length} videos (block size ${blockSize})`);
      }

      blockSize += 2;
    }

    const videoCount = feed.filter(f => f.type === 'VIDEO').length;
    const shortsCount = feed.filter(f => f.type === 'SHORTS').length;
    console.log('Final feed - videos:', videoCount, 'shorts blocks:', shortsCount, 'total items:', feed.length);
    return feed;
  };

  const baseFeed = buildMainFeed();
  if (__DEV__ && activeTab === 'Nearby' && selectedLocation) {
    console.log('[HomeVersion] Sponsored card', { hasSponsored: !!sponsoredVideo?.video, sponsoredVideo: sponsoredVideo ? 'set' : 'null' });
  }
  const sponsoredCard =
    activeTab === 'Nearby' &&
    selectedLocation &&
    sponsoredVideo?.video
      ? (() => {
          const v = sponsoredVideo.video;
          const owner = sponsoredVideo.user || v.user || {};
          const viewCount = v.viewCount ?? v._count?.views ?? 0;
          const pubAt = v.publishedAt || v.createdAt;
          return {
            id: v.id,
            type: 'video',
            title: v.title || 'Untitled',
            author: owner.nickname || owner.name || 'Unknown',
            views: `${formatCount(viewCount)} views`,
            time: formatTimeAgo(pubAt),
            duration: formatDuration(v.duration),
            thumbnail: v.thumbnailUrl || v.videoUrl || 'https://via.placeholder.com/300',
            videoUrl: v.videoUrl,
            isSponsored: true,
          };
        })()
      : null;
  const featuredCard =
    activeTab === 'Nearby' &&
    selectedLocation &&
    featuredVideo?.video
      ? (() => {
          const v = featuredVideo.video;
          const owner = featuredVideo.user || v.user || {};
          const viewCount = v.viewCount ?? v._count?.views ?? 0;
          const pubAt = v.publishedAt || v.createdAt;
          return {
            id: v.id,
            type: 'video',
            title: v.title || 'Untitled',
            author: owner.nickname || owner.name || 'Unknown',
            views: `${formatCount(viewCount)} views`,
            time: formatTimeAgo(pubAt),
            duration: formatDuration(v.duration),
            thumbnail: v.thumbnailUrl || v.videoUrl || 'https://via.placeholder.com/300',
            videoUrl: v.videoUrl,
            isFeatured: true,
          };
        })()
      : null;
  const mainFeed =
    featuredCard != null ? [{ ...featuredCard, type: 'VIDEO' }, ...baseFeed] : baseFeed;

  const StoryCircle = ({ channel }) => (
    <TouchableOpacity
      style={styles.storyContainer}
      onPress={() =>
        channel?.id &&
        navigation.navigate('ChannelDetailsScreen', { userId: channel.id })
      }
      activeOpacity={0.8}
    >
      <View style={styles.storyBorder}>
        <Image
          source={{ uri: channel?.avatar || 'https://via.placeholder.com/100' }}
          style={styles.storyImage}
        />
      </View>
      <Text style={styles.storyLabel} numberOfLines={1}>
        {channel?.name || 'Channel'}
      </Text>
    </TouchableOpacity>
  );

  const SectionHeader = ({ icon, title }) => (
    <View style={styles.feedHeaderRow}>
      <Icon name={icon} size={24} color={COLORS.primaryOrange} />
      <Text style={styles.feedHeaderText}>{title}</Text>
    </View>
  );

  const openOptions = (item) => {
    setSelectedItem(item);
    setOptionsVisible(true);
  };

  const closeOptions = () => {
    setOptionsVisible(false);
    setSelectedItem(null);
  };

  const openSaveModal = () => {
    if (!selectedItem?.id) return;
    if (!currentUser) {
      closeOptions();
      Toast.show({ type: 'info', text1: 'Please log in to save to playlist' });
      navigationRef.current?.navigate('Login');
      return;
    }
    setOptionsVisible(false);
    setTimeout(() => setSaveModalVisible(true), 100);
  };

  const openReportModal = () => {
    setOptionsVisible(false);
    if (!currentUser) {
      closeOptions();
      Toast.show({ type: 'info', text1: 'Please log in to report' });
      navigationRef.current?.navigate('Login');
      return;
    }
    setTimeout(() => setReportVisible(true), 100);
  };

  const handleSaveToWatchLater = async () => {
    if (!currentUser?.id || !selectedItem?.id) {
      Toast.show({ type: 'info', text1: 'Please log in to save' });
      closeOptions();
      navigationRef.current?.navigate('Login');
      return;
    }
    const contentType = selectedItem.type === 'short' ? 'short' : 'video';
    try {
      await setPlaylist(currentUser.id, 'watch_later', contentType, selectedItem.id, true);
      Toast.show({ type: 'success', text1: 'Saved to Watch Later' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Failed to save' });
    }
    closeOptions();
  };

  const handleDownload = async () => {
    if (!selectedItem) return;
    const isVideo = selectedItem.type === 'video' || selectedItem.type === 'VIDEO';
    if (!isVideo || !selectedItem.videoUrl) {
      Toast.show({ type: 'info', text1: 'Download is only available for videos' });
      closeOptions();
      return;
    }
    const video = {
      id: selectedItem.id,
      title: selectedItem.title,
      videoUrl: selectedItem.videoUrl,
      thumbnail: selectedItem.thumbnail,
      channelName: selectedItem.author,
      duration: selectedItem.duration,
    };
    try {
      await downloadVideo(video, (pct) => {});
      Toast.show({ type: 'success', text1: 'Video downloaded' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Download failed' });
    }
    closeOptions();
  };

  const handleShare = async () => {
    if (!selectedItem) return;
    if (!currentUser) {
      closeOptions();
      Toast.show({ type: 'info', text1: 'Please log in to share' });
      navigationRef.current?.navigate('Login');
      return;
    }
    const shareUrl =
      selectedItem.type === 'short'
        ? `eatix://shorts/${selectedItem.id}`
        : `eatix://video/${selectedItem.id}`;
    const message = `${selectedItem.title || 'Video'}\n${shareUrl}`;
    try {
      await Share.share({ message, title: selectedItem.title || 'Share' });
      if (selectedItem.type === 'video') {
        recordShare(selectedItem.id).catch(() => {});
      }
    } catch (e) {
      if (e?.message !== 'User did not share') {
        Toast.show({ type: 'error', text1: 'Share failed' });
      }
    }
    closeOptions();
  };

  const handleShortPress = (shortId) => {
    navigation.getParent()?.navigate('Shorts', {
      screen: 'ShortsVideoScreen',
      params: { initialShortId: shortId },
    });
  };

  const handleVideoPress = (videoId) => {
    navigation.navigate('VideoDetailsScreen', { videoId });
  };

  const handleContinuePress = (item) => {
    if (item?.type === 'short') {
      navigation.navigate('ShortsVideoScreen', { shortId: item.id });
    } else {
      navigation.navigate('VideoDetailsScreen', { videoId: item.id });
    }
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
            keyExtractor={(s, idx) => `${s.id}-${idx}`}
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
                  onPress={() => openOptions(short)}
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
      const continueItems = item.data || [];
      if (continueItems.length === 0) return null;
      return (
        <View style={styles.continueSection}>
          <SectionHeader icon="video-vintage" title="Continue watching" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: SPACING.lg }}
          >
            {continueItems.map((c, idx) => (
              <TouchableOpacity
                key={`${c.id}-${c.type || 'v'}-${idx}`}
                style={styles.continueCard}
                onPress={() => handleContinuePress(c)}
                activeOpacity={0.9}
              >
                <Image
                  source={{ uri: c.thumbnail || c.image }}
                  style={styles.continueImage}
                />
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
            {item.isSponsored && (
              <View style={styles.sponsoredBadge}>
                <Text style={styles.sponsoredBadgeText}>Sponsored</Text>
              </View>
            )}
            {item.isFeatured && (
              <View style={[styles.sponsoredBadge, styles.featuredBadge]}>
                <Text style={styles.sponsoredBadgeText}>Featured</Text>
              </View>
            )}
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
            <TouchableOpacity onPress={() => openOptions(item)}>
              <Icon name="dots-vertical" size={20} color={COLORS.textPrimary} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    return null;
  };

  useEffect(() => {
    if (activeTab === 'Trending') {
      navigation.navigate('TrendingScreen');
      setActiveTab('All');
    } else if (activeTab === 'Live') {
      navigation.navigate('LiveShortsScreen');
      setActiveTab('All');
    } else if (activeTab === 'For You') {
      navigation.navigate('ForYouScreen');
      setActiveTab('All');
    }
  }, [activeTab, navigation]);

  if (showNotifications) {
    return <NotificationScreen onBack={() => setShowNotifications(false)} />;
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
            <TouchableOpacity onPress={() => navigation.navigate('SearchScreen')}>
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
              onPress={() => {
                if (!currentUser) {
                  navigationRef.current?.navigate('Login');
                  return;
                }
                navigation.navigate('Library', { screen: 'ProfileScreen' });
              }}
              activeOpacity={0.7}
            />
          </View>
        </View>
      </SafeAreaView>

      <FlatList
        data={mainFeed}
        keyExtractor={(item, index) => {
          if (item.type === 'VIDEO') return `video-${item.id || index}-${index}`;
          if (item.type === 'SHORTS') return `${item.id || `s-${index}`}-${index}`;
          if (item.type === 'CONTINUE') return `${item.id || 'cont'}-${index}`;
          return `${item.type || 'item'}-${index}`;
        }}
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
          <React.Fragment key={`header-${activeTab}-${selectedLocation?.lat ?? ''}-${sponsoredVideo?.video?.id ?? 'n'}-${featuredVideo?.video?.id ?? 'n'}`}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipScroll}
            >
              {CATEGORIES.map((cat) => {
                const isActive = activeTab === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    onPress={() => setActiveTab(cat)}
                    style={[styles.chip, isActive && styles.chipActive]}
                  >
                    <Text
                      style={[styles.chipText, isActive && styles.chipTextActive]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {activeTab === 'Nearby' && (
              <View style={styles.nearbyLocationBar}>
                <Text style={styles.nearbyLocationLabel}>
                  {selectedLocation
                    ? 'Showing content near your location'
                    : 'Set location to see nearby videos & shorts'}
                </Text>
                <TouchableOpacity
                  style={styles.nearbyLocationButton}
                  onPress={handleUseMyLocationForNearby}
                  disabled={locationLoading}
                >
                  {locationLoading ? (
                    <ActivityIndicator size="small" color={COLORS.primaryOrange} />
                  ) : (
                    <Icon name="map-marker" size={18} color={COLORS.primaryOrange} />
                  )}
                  <Text style={styles.nearbyLocationButtonText}>
                    {locationLoading ? 'Getting location...' : 'Use my location'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {activeTab === 'Nearby' && sponsoredCard && (
              <View style={styles.whiteSection}>
                <SectionHeader icon="star-circle-outline" title="Sponsored near you" />
                {renderItem({ item: { ...sponsoredCard, type: 'VIDEO' } })}
              </View>
            )}

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.storyScroll}
            >
              {channelsData.map((ch) => (
                <StoryCircle key={ch.id} channel={ch} />
              ))}
            </ScrollView>
          </React.Fragment>
        }
      />

      <Modal
        animationType="slide"
        transparent
        visible={optionsVisible}
        onRequestClose={closeOptions}
      >
        <Pressable style={styles.modalOverlay} onPress={closeOptions}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>More Option</Text>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.optionRow} onPress={openSaveModal}>
              <Icon name="playlist-plus" size={24} color="#333" />
              <Text style={styles.optionText}>Save to Playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow} onPress={handleSaveToWatchLater}>
              <Icon name="clock-outline" size={24} color="#333" />
              <Text style={styles.optionText}>Save to Watch Later</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow} onPress={handleDownload}>
              <Icon name="download-outline" size={24} color="#333" />
              <Text style={styles.optionText}>Download Video</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow} onPress={handleShare}>
              <Icon name="share-variant-outline" size={24} color="#333" />
              <Text style={styles.optionText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionRow} onPress={openReportModal}>
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
                onPress={async () => {
                  if (!selectedItem?.id) {
                    setReportVisible(false);
                    return;
                  }
                  try {
                    await submitReport({
                      contentType: selectedItem.type === 'short' ? 'short' : 'video',
                      contentId: selectedItem.id,
                      reporterId: currentUser?.id,
                      reason: selectedReason,
                    });
                    Toast.show({ type: 'success', text1: 'Report submitted' });
                  } catch (e) {
                    Toast.show({ type: 'error', text1: 'Failed to submit report' });
                  }
                  setReportVisible(false);
                  setSelectedItem(null);
                }}
              >
                <Text style={styles.submitButtonText}>Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      <SaveModal
        visible={saveModalVisible}
        onClose={() => {
          setSaveModalVisible(false);
          setSelectedItem(null);
        }}
        contentType={selectedItem?.type === 'short' ? 'short' : 'video'}
        contentId={selectedItem?.id}
      />
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
  nearbyLocationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
    backgroundColor: '#FFF8F2',
    marginHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
  },
  nearbyLocationLabel: { fontSize: 12, color: COLORS.gray700, flex: 1 },
  nearbyLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primaryOrange,
  },
  nearbyLocationButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.primaryOrange },
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
  sponsoredBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: COLORS.primaryOrange,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  sponsoredBadgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  featuredBadge: { backgroundColor: '#c9a227' },
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
