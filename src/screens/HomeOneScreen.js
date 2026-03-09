import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Pressable,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import Video from 'react-native-video';
import {
  useNavigation,
  useRoute,
  useFocusEffect,
} from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import {
  getCurrentPositionSafe,
  reverseGeocode,
  geocodeAddress,
  getPlaceSuggestions,
  getCoordsFromPlaceId,
  getFallbackCoordsForBDArea,
} from '../utils/geolocation';
import { getFeaturedByLocation } from '../services/featuredService';
import { getSponsoredByLocation } from '../services/sponsoredService';
import {
  getVideos,
  getVideoWatchHistory,
  getVideoById,
} from '../services/videoService';
import { shortsService } from '../services/shortsService';

const { width, height } = Dimensions.get('window');

const viewerRole = user =>
  (user?.role && String(user.role).toLowerCase()) || 'user';

// Same shape as VideoDetailsScreen currentVideo so selectedItem has all fields
const mapToDisplayItem = (v, type) => {
  const u = v.user || {};
  const channelName = u.nickname || u.name || 'Unknown';
  const viewCount = v.viewCount ?? v._count?.views ?? 0;
  const viewsStr =
    viewCount >= 1000
      ? `${(viewCount / 1000).toFixed(1)}K views`
      : `${viewCount} views`;
  return {
    id: v.id,
    type,
    title:
      v.title ||
      (type === 'short'
        ? (v.description || 'Short').substring(0, 50)
        : 'Untitled'),
    location: u.address || 'Near you',
    img:
      v.thumbnailUrl ||
      v.videoUrl ||
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
    videoUrl: v.videoUrl,
    user: v.user,
    userId: v.userId || u.id,
    creatorRole: u.role != null ? String(u.role).toLowerCase() : undefined,
    channelName,
    channelAvatar:
      u.photos?.[0] ||
      (Array.isArray(u.photos) && u.photos[0]) ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        channelName,
      )}&background=111&color=fff`,
    views: viewsStr,
    viewCount,
    likeCount: v.likeCount ?? 0,
    dislikeCount: v.dislikeCount ?? 0,
    commentCount: v.commentCount ?? 0,
    creatorAddress: u.address ?? undefined,
    creatorLatitude: u.latitude ?? undefined,
    creatorLongitude: u.longitude ?? undefined,
    creatorSocialLinks: Array.isArray(u.socialLinks) ? u.socialLinks : [],
  };
};

const HomeOneScreen = () => {
  const [isLanding, setIsLanding] = useState(true);
  const [isVideoDetail, setIsVideoDetail] = useState(false);
  const [isRestaurantDetail, setIsRestaurantDetail] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [addressText, setAddressText] = useState('');
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const debounceTimerRef = useRef(null);
  const [featuredVideo, setFeaturedVideo] = useState(null);
  const [sponsoredVideo, setSponsoredVideo] = useState(null);
  const [feedVideos, setFeedVideos] = useState([]);
  const [feedShorts, setFeedShorts] = useState([]);
  const [continueData, setContinueData] = useState([]);
  const [feedLoading, setFeedLoading] = useState(false);
  const [videoPaused, setVideoPaused] = useState(true);
  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const shortVideoRef = useRef(null);
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector(state => state.app?.user);

  useFocusEffect(
    React.useCallback(() => {
      const showRestaurant = route.params?.showRestaurantDetail;
      const restaurantItem = route.params?.restaurantItem;
      if (showRestaurant && restaurantItem) {
        setSelectedItem(restaurantItem);
        setIsRestaurantDetail(true);
        setIsLanding(false);
        navigation.setParams({
          showRestaurantDetail: undefined,
          restaurantItem: undefined,
        });
      }
    }, [route.params, navigation]),
  );

  const loadFeaturedAndFeed = useCallback(async () => {
    if (selectedLocation?.lat == null || selectedLocation?.lng == null) return;
    setFeedLoading(true);
    const lat = selectedLocation.lat;
    const lng = selectedLocation.lng;
    const role = viewerRole(user);
    const baseParams = { page: 1, limit: 50, sort: 'latest', viewerRole: role };
    const videoParams = {
      ...baseParams,
      nearbyLat: lat,
      nearbyLng: lng,
      radiusKm: 50,
      excludeSponsored: true,
      excludeFeatured: true,
    };
    const shortParams = {
      ...baseParams,
      nearbyLat: lat,
      nearbyLng: lng,
      radiusKm: 50,
    };
    try {
      const [featuredRes, sponsoredRes, videosRes, shortsRes] =
        await Promise.all([
          getFeaturedByLocation(lat, lng),
          getSponsoredByLocation(lat, lng),
          getVideos(videoParams),
          shortsService.getShorts(shortParams),
        ]);
      setFeaturedVideo(featuredRes?.featured || null);
      setSponsoredVideo(sponsoredRes?.sponsored || null);
      const videos = (videosRes?.videos || []).map(v =>
        mapToDisplayItem(v, 'video'),
      );
      const shorts = (shortsRes?.shorts || [])
        .filter(s => s.videoUrl && String(s.videoUrl).trim())
        .map(s => mapToDisplayItem(s, 'short'));
      setFeedVideos(videos);
      setFeedShorts(shorts);
    } catch (e) {
      console.error('HomeOne load feed:', e);
      setFeaturedVideo(null);
      setSponsoredVideo(null);
      setFeedVideos([]);
      setFeedShorts([]);
    } finally {
      setFeedLoading(false);
    }
  }, [selectedLocation, user]);

  const loadContinueWatching = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [vRes, sRes] = await Promise.all([
        getVideoWatchHistory(user.id, 1, 20),
        shortsService.getWatchHistory(user.id, 1, 20),
      ]);
      const vHistory = (vRes?.history || []).map(({ video, watchedAt }) => ({
        ...mapToDisplayItem(video || {}, 'video'),
        watchedAt: new Date(watchedAt).getTime(),
      }));
      const sHistory = (sRes?.history || []).map(({ short: s, watchedAt }) => ({
        ...mapToDisplayItem(s || {}, 'short'),
        watchedAt: new Date(watchedAt).getTime(),
      }));
      const merged = [...vHistory, ...sHistory]
        .filter(Boolean)
        .sort((a, b) => (b.watchedAt || 0) - (a.watchedAt || 0))
        .slice(0, 10);
      setContinueData(merged);
    } catch (e) {
      setContinueData([]);
    }
  }, [user?.id]);

  useEffect(() => {
    if (
      selectedLocation?.lat != null &&
      selectedLocation?.lng != null &&
      !isLanding
    ) {
      loadFeaturedAndFeed();
    }
  }, [
    selectedLocation?.lat,
    selectedLocation?.lng,
    isLanding,
    loadFeaturedAndFeed,
  ]);

  useEffect(() => {
    loadContinueWatching();
  }, [loadContinueWatching]);

  const useMyLocation = () => {
    setLocationLoading(true);
    setShowAddressSuggestions(false);
    getCurrentPositionSafe(
      async pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setSelectedLocation({ lat, lng });
        const addr = await reverseGeocode(lat, lng);
        setAddressText(addr || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
        setIsLanding(false);
        setLocationLoading(false);
      },
      err => {
        setLocationLoading(false);
        Alert.alert('Location', err || 'Could not get location.');
      },
    );
  };

  useEffect(() => {
    const trimmed = addressText.trim();
    if (!trimmed) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      setSuggestionsLoading(false);
      return;
    }
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(async () => {
      setSuggestionsLoading(true);
      setShowAddressSuggestions(true);
      const list = await getPlaceSuggestions(trimmed);
      setAddressSuggestions(list || []);
      setSuggestionsLoading(false);
      debounceTimerRef.current = null;
    }, 280);
    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [addressText]);

  const handleSelectSuggestion = async (description, placeId) => {
    setAddressText(description);
    setShowAddressSuggestions(false);
    setAddressSuggestions([]);
    setLocationLoading(true);
    try {
      let coords = placeId ? await getCoordsFromPlaceId(placeId) : null;
      if (!coords) coords = await geocodeAddress(description);
      if (!coords) coords = await geocodeAddress(description + ', Bangladesh');
      if (!coords) coords = getFallbackCoordsForBDArea(description);
      if (coords) {
        setSelectedLocation(coords);
        setIsLanding(false);
      } else {
        Alert.alert(
          'Address',
          'Could not get location for this address. Try "Use my location".',
        );
      }
    } catch (_) {
      const fallback = getFallbackCoordsForBDArea(description);
      if (fallback) {
        setSelectedLocation(fallback);
        setIsLanding(false);
      } else {
        Alert.alert('Address', 'Something went wrong. Try "Use my location".');
      }
    }
    setLocationLoading(false);
  };

  const handleAddressSubmit = async () => {
    setShowAddressSuggestions(false);
    const trimmed = addressText.trim();
    if (trimmed) {
      setLocationLoading(true);
      try {
        let coords = await geocodeAddress(trimmed);
        if (!coords) {
          const parts = trimmed
            .split(',')
            .map(p => p.trim())
            .filter(Boolean);
          if (parts.length >= 2) {
            coords = await geocodeAddress(parts.slice(-2).join(', '));
          }
          if (!coords && parts.length >= 1) {
            coords = await geocodeAddress(parts[parts.length - 1]);
          }
        }
        if (!coords) coords = await geocodeAddress(trimmed + ', Bangladesh');
        if (!coords) coords = getFallbackCoordsForBDArea(trimmed);
        if (coords) {
          setSelectedLocation(coords);
          setIsLanding(false);
        } else {
          Alert.alert(
            'Address',
            'Could not find that address. Try "Use my location" or check the address.',
          );
        }
      } catch (_) {
        const fallback = getFallbackCoordsForBDArea(trimmed);
        if (fallback) {
          setSelectedLocation(fallback);
          setIsLanding(false);
        } else {
          Alert.alert('Address', 'Could not find that address.');
        }
      }
      setLocationLoading(false);
      return;
    }
    useMyLocation();
  };

  const openShortDetail = item => {
    setSelectedItem(item);
    setVideoPaused(true);
    setVideoError(null);
    setVideoLoading(false);
    setIsVideoDetail(true);
    setIsRestaurantDetail(false);
    if (item?.id && item?.type === 'short') {
      shortsService
        .getShortById(item.id, user?.id, user?.role || 'user')
        .then(res => {
          const full = mapToDisplayItem(res, 'short');
          setSelectedItem(prev => ({ ...full, watchedAt: prev?.watchedAt }));
        })
        .catch(() => {});
    }
  };

  const openRestaurantDetail = item => {
    setSelectedItem(item);
    setVideoPaused(true);
    setVideoError(null);
    setVideoLoading(false);
    setIsVideoDetail(false);
    setIsRestaurantDetail(true);
    if (item?.id && (item?.type === 'video' || !item?.type)) {
      getVideoById(item.id, user?.id, user?.role || 'user')
        .then(res => {
          const full = mapToDisplayItem(res, item?.type || 'video');
          setSelectedItem(prev => ({ ...full, watchedAt: prev?.watchedAt }));
        })
        .catch(() => {});
    }
  };

  const handleFeedItemPress = item => {
    if (item?.type === 'short') {
      openShortDetail(item);
    } else {
      openRestaurantDetail(item);
    }
  };

  const featuredItem = featuredVideo?.video
    ? mapToDisplayItem(
        {
          ...featuredVideo.video,
          user: featuredVideo.video.user || featuredVideo.user,
        },
        'video',
      )
    : null;

  const sponsoredItem = sponsoredVideo?.video
    ? mapToDisplayItem(
        {
          ...sponsoredVideo.video,
          user: sponsoredVideo.video.user || sponsoredVideo.user,
        },
        'video',
      )
    : null;

  // Sectioned feed: sponsored → 2 shorts → 2 videos → continue (3) → 4 shorts → 4 videos → 6 → 6 ...
  const buildFeedSections = () => {
    const shorts = feedShorts || [];
    const videos = feedVideos || [];
    const sections = [];
    let sIdx = 0;
    let vIdx = 0;

    if (sponsoredItem) {
      sections.push({ type: 'SPONSORED', data: [sponsoredItem] });
    }

    const firstShorts = shorts.slice(sIdx, sIdx + 2);
    sIdx += firstShorts.length;
    if (firstShorts.length > 0) {
      sections.push({ type: 'SHORTS', data: firstShorts });
    }

    const firstVideos = videos.slice(vIdx, vIdx + 2);
    vIdx += firstVideos.length;
    if (firstVideos.length > 0) {
      sections.push({ type: 'VIDEOS', data: firstVideos });
    }

    if (continueData.length > 0) {
      sections.push({
        type: 'CONTINUE',
        data: continueData.slice(0, 3),
      });
    }

    let blockSize = 4;
    while (sIdx < shorts.length || vIdx < videos.length) {
      const blockShorts = shorts.slice(sIdx, sIdx + blockSize);
      sIdx += blockShorts.length;
      if (blockShorts.length > 0) {
        sections.push({ type: 'SHORTS', data: blockShorts });
      }
      const blockVideos = videos.slice(vIdx, vIdx + blockSize);
      vIdx += blockVideos.length;
      if (blockVideos.length > 0) {
        sections.push({ type: 'VIDEOS', data: blockVideos });
      }
      blockSize += 2;
    }
    return sections;
  };

  const feedSections = buildFeedSections();

  // --- RENDERING HELPERS ---

  const renderLanding = () => (
    <View style={styles.landingContainer}>
      <SafeAreaView style={styles.centerContent}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>
            eat<Text style={{ fontWeight: 'bold' }}>ix</Text>
          </Text>
        </View>
        <View style={styles.landingSearchBox}>
          <Icon name="magnify" size={22} color="#999" style={styles.landingSearchIcon} />
          <TextInput
            style={styles.landingSearchInput}
            placeholder="Search Your address"
            placeholderTextColor="#999"
            value={addressText}
            onChangeText={setAddressText}
            onSubmitEditing={handleAddressSubmit}
            returnKeyType="search"
            editable={!locationLoading}
          />
          <TouchableOpacity
            onPress={locationLoading ? undefined : handleAddressSubmit}
            style={styles.landingMapIcon}
            disabled={locationLoading}
            activeOpacity={0.7}
          >
            {locationLoading ? (
              <ActivityIndicator size="small" color="#F5A623" />
            ) : (
              <Icon name="map-marker-radius" size={26} color="#F5A623" />
            )}
          </TouchableOpacity>
        </View>
        {addressText.trim().length > 0 && (
          <View style={styles.suggestionsContainer}>
            {suggestionsLoading ? (
              <View style={styles.suggestionItem}>
                <ActivityIndicator size="small" color="#F5A623" />
                <Text style={styles.suggestionText}>Searching areas...</Text>
              </View>
            ) : addressSuggestions.length > 0 ? (
              <ScrollView
                style={styles.suggestionsScroll}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {addressSuggestions.slice(0, 8).map((item, idx) => (
                  <TouchableOpacity
                    key={item.place_id ? item.place_id : `fb-${idx}-${item.description}`}
                    style={styles.suggestionItem}
                    onPress={() =>
                      handleSelectSuggestion(item.description, item.place_id)
                    }
                    activeOpacity={0.7}
                  >
                    <Icon name="map-marker-outline" size={18} color="#666" />
                    <Text style={styles.suggestionText} numberOfLines={2}>
                      {item.description}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            ) : (
              <View style={styles.suggestionItem}>
                <Icon name="map-marker-outline" size={18} color="#999" />
                <Text style={styles.suggestionHint}>
                  No areas found. Type full address (e.g. Mirpur 10, Dhaka) or tap the location icon.
                </Text>
              </View>
            )}
          </View>
        )}
        <Text style={styles.slogan}>See it, Love it, order it</Text>
      </SafeAreaView>
    </View>
  );

  const renderResults = () => (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <View style={styles.navRow}>
          <TouchableOpacity
            onPress={() => setIsLanding(true)}
            style={styles.navBtn}
          >
            <Text style={styles.navBtnText}>{'<'} Home</Text>
          </TouchableOpacity>
          <Text style={styles.headerLogo}>eatix</Text>
          <TouchableOpacity
            style={[styles.navBtn, { backgroundColor: '#F5A623' }]}
          >
            <Text style={styles.navBtnText}>Login {'>'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.resultsTitle}>
          Your search results in {addressText || 'your area'}...
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.bannerWrapper}>
          <Image
            source={{
              uri:
                featuredItem?.img ||
                'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
            }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.featuredBadge}
            onPress={() => {
              if (featuredItem) {
                openRestaurantDetail(featuredItem);
              }
            }}
          >
            <Text style={styles.featuredText}>Featured</Text>
            <Icon name="chevron-right" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.locationSection}>
          <View style={styles.homeDropdown}>
            <Icon name="map-marker-radius" size={24} color="#FFF" />
            <Text style={styles.homeText}>Home</Text>
            <Icon name="chevron-down" size={24} color="#FFF" />
          </View>
          <Text style={styles.addressSubtext} numberOfLines={2}>
            {addressText || 'Set your address on home'}
          </Text>

          <View style={styles.innerSearchBox}>
            <Icon name="magnify" size={20} color="#999" />
            <TextInput placeholder="Food Search" style={styles.innerInput} />
          </View>
        </View>

        <View style={styles.feedPadding}>
          <Text style={styles.feedHint}>
            your search, served fresh... watch and choose
          </Text>

          {feedLoading ? (
            <View style={styles.feedLoading}>
              <ActivityIndicator size="large" color="#F5A623" />
              <Text style={styles.feedLoadingText}>Loading...</Text>
            </View>
          ) : (
            <>
              {feedSections.map((section, sectionIdx) => (
                <View key={`${section.type}-${sectionIdx}`}>
                  {section.type === 'SHORTS' && section.data.length > 0 && (
                    <Text style={styles.sectionTitle}>Shorts</Text>
                  )}
                  {section.type === 'VIDEOS' && section.data.length > 0 && (
                    <Text style={styles.sectionTitle}>Videos</Text>
                  )}
                  {section.type === 'CONTINUE' && section.data.length > 0 && (
                    <Text style={styles.sectionTitle}>Continue watching</Text>
                  )}
                  {section.type === 'SHORTS' ? (
                    <View style={styles.shortsGrid}>
                      {section.data.map((item, index) => (
                        <View
                          key={`${item.id}-${item.type}-${sectionIdx}-${index}`}
                          style={styles.shortsGridItem}
                        >
                          <ShortCard
                            title={item.title}
                            img={item.img}
                            views={item.views}
                            onPress={() => handleFeedItemPress(item)}
                          />
                        </View>
                      ))}
                    </View>
                  ) : (
                    section.data.map((item, index) => (
                      <FoodCard
                        key={`${item.id}-${item.type}-${sectionIdx}-${index}`}
                        title={item.title}
                        location={item.location}
                        isSponsored={section.type === 'SPONSORED'}
                        img={item.img}
                        onPress={() => handleFeedItemPress(item)}
                      />
                    ))
                  )}
                </View>
              ))}
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );

  const handleShortVideoLoad = () => {
    setVideoLoading(false);
    setVideoError(null);
    setVideoPaused(false);
  };

  const handleShortVideoError = e => {
    setVideoLoading(false);
    setVideoError(
      e?.error?.localizedDescription ||
        e?.errorString ||
        'Failed to play video.',
    );
  };

  const handleRetryShortVideo = () => {
    setVideoError(null);
    setVideoLoading(true);
    setVideoPaused(true);
    setTimeout(() => setVideoPaused(false), 100);
  };
  const renderVideoDetail = () => (
    <View style={styles.videoBackground}>
      <StatusBar hidden />
      {selectedItem?.videoUrl ? (
        <>
          <Video
            ref={shortVideoRef}
            source={{ uri: selectedItem.videoUrl }}
            poster={selectedItem?.img}
            posterResizeMode="cover"
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
            paused={videoPaused}
            repeat={false}
            controls={false}
            playInBackground={false}
            playWhenInactive={false}
            ignoreSilentSwitch="ignore"
            onLoadStart={() => {
              setVideoLoading(true);
              setVideoError(null);
            }}
            onLoad={handleShortVideoLoad}
            onError={handleShortVideoError}
            onReadyForDisplay={handleShortVideoLoad}
          />
          {(videoLoading || videoError) && (
            <View style={styles.shortVideoOverlay}>
              {videoLoading && <ActivityIndicator size="large" color="#FFF" />}
              {videoError && (
                <>
                  <Text style={styles.shortVideoErrorText}>{videoError}</Text>
                  <TouchableOpacity
                    style={styles.retryShortBtn}
                    onPress={handleRetryShortVideo}
                  >
                    <Icon name="refresh" size={20} color="#FFF" />
                    <Text style={styles.retryShortText}>Retry</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}
        </>
      ) : (
        <Image
          source={{ uri: selectedItem?.img }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}
      <Pressable
        style={styles.videoOverlay}
        onPress={() => !videoError && setVideoPaused(p => !p)}
      >
        <SafeAreaView style={styles.videoOverlayInner}>
          <View style={styles.videoHeader}>
            <TouchableOpacity
              onPress={() => setIsVideoDetail(false)}
              style={styles.backBtn}
            >
              <Icon name="chevron-left" size={24} color="#FFF" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <View style={styles.videoHeaderIcons}>
              <Icon
                name="magnify"
                size={26}
                color="#FFF"
                style={{ marginRight: 15 }}
              />
              <Icon name="dots-vertical" size={26} color="#FFF" />
            </View>
          </View>
          <View style={styles.rightActions}>
            <View style={styles.actionItem}>
              <View style={styles.iconCircle}>
                <Icon name="account-circle" size={30} color="#FFF" />
              </View>
              <Text style={styles.actionText}>100k</Text>
            </View>
            <View style={styles.actionItem}>
              <Icon name="heart" size={32} color="#FF4D4D" />
              <Text style={styles.actionText}>100k</Text>
            </View>
            <View style={styles.actionItem}>
              <Icon name="comment-text" size={32} color="#FFF" />
              <Text style={styles.actionText}>Com</Text>
            </View>
            <View style={styles.actionItem}>
              <Icon name="share" size={32} color="#FFF" />
              <Text style={styles.actionText}>Share</Text>
            </View>
          </View>
          {!videoLoading && !videoError && (
            <TouchableOpacity
              style={styles.shortPlayCenter}
              onPress={() => setVideoPaused(p => !p)}
              activeOpacity={1}
            >
              <Icon
                name={
                  videoPaused ? 'play-circle-outline' : 'pause-circle-outline'
                }
                size={72}
                color="rgba(255,255,255,0.95)"
              />
            </TouchableOpacity>
          )}
          <View style={styles.videoFooter}>
            <Text style={styles.videoUser}>
              @{(selectedItem?.title || '').toLowerCase().replace(/\s+/g, '')}
            </Text>
            <Text style={styles.videoDesc}>
              {selectedItem?.title || 'Description'}
            </Text>
            <View style={styles.footerRow}>
              <View style={styles.audioRow}>
                <Icon name="music" size={18} color="#FFF" />
                <Text style={styles.audioText}>Original Sound</Text>
              </View>
              {(selectedItem?.creatorRole === 'owner' ||
                selectedItem?.user?.role === 'owner' ||
                selectedItem?.userId ||
                selectedItem?.user?.id) &&
                (!user?.token ? (
                  <TouchableOpacity
                    style={styles.resOrderBtn}
                    onPress={() => {
                      const ownerId =
                        selectedItem?.user?.id ?? selectedItem?.userId ?? null;
                      navigation.navigate('HomeSevenScreen', {
                        returnToOrder: true,
                        ownerUserId: ownerId,
                      });
                    }}
                  >
                    <Text style={styles.resOrderText}>Login</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.resOrderBtn}
                    onPress={() => {
                      const ownerId =
                        selectedItem?.user?.id ?? selectedItem?.userId ?? null;
                      if (ownerId) {
                        navigation.navigate('HomeThreeScreen', {
                          ownerId,
                          title: selectedItem?.title,
                          location:
                            selectedItem?.location ||
                            selectedItem?.creatorAddress ||
                            '',
                        });
                      } else {
                        navigation.navigate('HomeThreeScreen');
                      }
                    }}
                  >
                    <Text style={styles.resOrderText}>Order Now</Text>
                  </TouchableOpacity>
                ))}
            </View>
            <View style={styles.bottomArrow}>
              <Icon name="chevron-down" size={40} color="#FFF" />
            </View>
          </View>
        </SafeAreaView>
      </Pressable>
    </View>
  );

  const renderRestaurantDetail = () => (
    <SafeAreaView style={styles.resContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.resHeader}>
          <TouchableOpacity
            onPress={() => setIsRestaurantDetail(false)}
            style={styles.resBackBtn}
          >
            <Icon name="chevron-left" size={20} color="#FFF" />
            <Text style={styles.resBackText}>Back</Text>
          </TouchableOpacity>
          <Icon name="dots-vertical" size={24} color="#666" />
        </View>

        <View style={styles.resTitleRow}>
          <View>
            <Text style={styles.resMainTitle}>{selectedItem?.title}</Text>
            <Text style={styles.resSubLoc}>{selectedItem?.location}</Text>
          </View>
          {(selectedItem?.creatorRole === 'owner' ||
            selectedItem?.user?.role === 'owner' ||
            selectedItem?.userId ||
            selectedItem?.user?.id) &&
            (!user?.token ? (
              <TouchableOpacity
                style={styles.resOrderBtn}
                onPress={() => {
                  const ownerId =
                    selectedItem?.user?.id ?? selectedItem?.userId ?? null;
                  navigation.navigate('HomeSevenScreen', {
                    returnToOrder: true,
                    ownerUserId: ownerId,
                  });
                }}
              >
                <Text style={styles.resOrderText}>Login</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.resOrderBtn}
                onPress={() => {
                  const ownerId =
                    selectedItem?.user?.id ?? selectedItem?.userId ?? null;
                  if (ownerId) {
                    navigation.navigate('HomeThreeScreen', {
                      ownerId,
                      title: selectedItem?.title,
                      location:
                        selectedItem?.location ||
                        selectedItem?.creatorAddress ||
                        '',
                    });
                  } else {
                    navigation.navigate('HomeThreeScreen');
                  }
                }}
              >
                <Text style={styles.resOrderText}>Order Now</Text>
              </TouchableOpacity>
            ))}
        </View>

        <View style={styles.resVideoCard}>
          {selectedItem?.videoUrl ? (
            <>
              <Video
                source={{ uri: selectedItem.videoUrl }}
                poster={selectedItem?.img}
                posterResizeMode="cover"
                style={styles.resVideoImg}
                resizeMode="cover"
                paused={videoPaused}
                repeat={false}
                controls={false}
                playInBackground={false}
                playWhenInactive={false}
                onLoadStart={() => setVideoLoading(true)}
                onLoad={() => {
                  setVideoLoading(false);
                  setVideoError(null);
                }}
                onError={e => {
                  setVideoLoading(false);
                  setVideoError(
                    e?.error?.localizedDescription ||
                      e?.errorString ||
                      'Playback failed',
                  );
                }}
              />
              {videoLoading && (
                <View style={styles.resVideoLoadingOverlay}>
                  <ActivityIndicator size="small" color="#F5A623" />
                </View>
              )}
              {videoError && (
                <View style={styles.resVideoErrorOverlay}>
                  <Text style={styles.resVideoErrorText} numberOfLines={2}>
                    {videoError}
                  </Text>
                </View>
              )}
              <Pressable
                style={styles.resPlayOverlay}
                onPress={() => setVideoPaused(p => !p)}
              >
                {!videoLoading && !videoError && (
                  <Icon
                    name={videoPaused ? 'play-circle' : 'pause-circle'}
                    size={60}
                    color="rgba(255,255,255,0.9)"
                  />
                )}
              </Pressable>
            </>
          ) : (
            <>
              <Image
                source={{ uri: selectedItem?.img }}
                style={styles.resVideoImg}
              />
              <View style={styles.resPlayOverlay}>
                <Icon
                  name="play-circle"
                  size={60}
                  color="rgba(255,255,255,0.8)"
                />
              </View>
            </>
          )}
        </View>

        <View style={styles.resSocialRow}>
          <View style={styles.resIconGroup}>
            {[
              { type: 'instagram', icon: 'instagram' },
              { type: 'facebook', icon: 'facebook' },
              { type: 'x', icon: 'twitter' },
              { type: 'website', icon: 'web' },
            ].map(({ type, icon }) => {
              const link = (selectedItem?.user?.socialLinks || selectedItem?.creatorSocialLinks || []).find(
                s => (s.type || '').toLowerCase() === type.toLowerCase(),
              );
              const url = link?.url || null;
              return (
                <TouchableOpacity
                  key={type}
                  onPress={() => url && Linking.openURL(url)}
                  style={styles.socialIconWrap}
                >
                  <Icon name={icon} size={24} color={url ? '#333' : '#ccc'} style={styles.socialIcon} />
                </TouchableOpacity>
              );
            })}
          </View>
          <View>
            <TouchableOpacity style={styles.bookNowBtn}>
              <Text style={styles.bookNowText}>Book Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.galleryBtn}>
              <Text style={styles.galleryText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.webText}>
          {(selectedItem?.user?.socialLinks || selectedItem?.creatorSocialLinks || []).find(
            s => (s.type || '').toLowerCase() === 'website',
          )?.url || (selectedItem?.user?.businessName ? `www.${String(selectedItem.user.businessName).toLowerCase().replace(/\s+/g, '')}.com` : null) || '—'}
        </Text>

        <View style={styles.descContainer}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.descBox}>
            <Text style={styles.descText}>
              {selectedItem?.user?.channelAbout || selectedItem?.description || 'A cozy restaurant serving fresh, delicious food made with quality ingredients. Enjoy great taste, warm service, and a comfortable dining experience.'}
            </Text>
          </View>
        </View>

        <View style={styles.contactContainer}>
          <Text style={styles.sectionTitle}>
            Contact :{' '}
            <Text style={{ fontWeight: 'normal' }}>
              {selectedItem?.user?.phone || '—'}
            </Text>
          </Text>
          <Text style={styles.contactEmail}>
            {selectedItem?.user?.email || '—'}
          </Text>
          <Text style={styles.contactAddr}>
            Address : {selectedItem?.location || selectedItem?.creatorAddress || selectedItem?.user?.address || '—'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#F5A623" />
      {isRestaurantDetail
        ? renderRestaurantDetail()
        : isVideoDetail
        ? renderVideoDetail()
        : isLanding
        ? renderLanding()
        : renderResults()}
    </View>
  );
};

// --- SUB-COMPONENT ---

// Two-per-row short card (HomeVersion-style): image, play overlay, bottom overlay with title + views
const ShortCard = ({ title, img, views, onPress }) => (
  <TouchableOpacity
    style={styles.shortCard}
    onPress={onPress}
    activeOpacity={0.9}
  >
    <Image source={{ uri: img }} style={styles.shortCardImage} />
    <View style={styles.shortPlayIconOverlay}>
      <Icon name="play-circle" size={40} color="rgba(255,255,255,0.8)" />
    </View>
    <View style={styles.shortCardOverlay}>
      <Text style={styles.shortCardTitle} numberOfLines={2}>
        {title}
      </Text>
      <Text style={styles.shortCardViews}>{views}</Text>
    </View>
  </TouchableOpacity>
);

const FoodCard = ({ title, location, isSponsored, img, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
    <View style={styles.cardImageContainer}>
      <Image source={{ uri: img }} style={styles.cardImage} />
      <View style={styles.playIconOverlay}>
        <Icon name="play-circle" size={50} color="rgba(255,255,255,0.8)" />
      </View>
      {isSponsored && (
        <View style={styles.sponsoredTag}>
          <Text style={styles.sponsoredTagText}>Sponsored</Text>
        </View>
      )}
    </View>
    <View style={styles.cardInfo}>
      <View>
        <Text style={styles.cardTitle}>{title}</Text>
      </View>
      <View style={styles.cardStats}>
        <Text style={styles.statSmall}>100k views</Text>
        <Text style={styles.statSmall}>1.2 Km</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // Landing/Feed Styles
  landingContainer: { flex: 1, backgroundColor: '#F5A623' },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoText: { fontSize: 80, color: '#FFF', letterSpacing: -3 },
  landingSearchBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    width: '100%',
    height: 55,
    borderRadius: 10,
    alignItems: 'center',
    paddingHorizontal: 12,
    elevation: 5,
    overflow: 'hidden',
  },
  landingSearchIcon: { marginRight: 8 },
  landingSearchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    color: '#333',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  landingMapIcon: { padding: 8, marginLeft: 4 },
  landingSearchPlaceholder: { color: '#999', fontSize: 16, marginLeft: 10 },
  suggestionsContainer: {
    width: '100%',
    marginTop: 8,
    backgroundColor: '#FFF',
    borderRadius: 10,
    maxHeight: 220,
    elevation: 4,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#eee',
    gap: 10,
  },
  suggestionText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  suggestionHint: {
    flex: 1,
    fontSize: 14,
    color: '#666',
  },
  suggestionsScroll: { maxHeight: 260 },
  slogan: { color: '#FFF', marginTop: 20, fontSize: 14, fontWeight: '500' },
  feedLoading: { paddingVertical: 40, alignItems: 'center' },
  feedLoadingText: { marginTop: 10, fontSize: 14, color: '#666' },
  mainContainer: { flex: 1, backgroundColor: '#FFF' },
  header: { backgroundColor: '#F5A623', padding: 15, paddingTop: 10 },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navBtn: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  navBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  headerLogo: { color: '#FFF', fontSize: 26, fontWeight: 'bold' },
  resultsTitle: {
    color: '#FFF',
    marginTop: 15,
    fontSize: 17,
    fontWeight: '500',
  },
  bannerWrapper: { width: '100%', height: 210, position: 'relative' },
  bannerImage: { width: '100%', height: '100%' },
  featuredBadge: {
    position: 'absolute',
    bottom: 20,
    left: 15,
    backgroundColor: '#FF7A00',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 25,
  },
  featuredText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 15,
    marginRight: 5,
  },
  locationSection: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 15,
    paddingBottom: 20,
    paddingTop: 10,
  },
  homeDropdown: { flexDirection: 'row', alignItems: 'center' },
  homeText: {
    color: '#FFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 10,
  },
  addressSubtext: {
    color: '#FFF',
    fontSize: 12,
    opacity: 0.9,
    marginBottom: 15,
  },
  innerSearchBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    height: 45,
    borderRadius: 8,
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  innerInput: { flex: 1, marginLeft: 10, fontSize: 15 },
  feedPadding: { padding: 15 },
  feedHint: {
    textAlign: 'center',
    fontSize: 11,
    color: '#777',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
    marginTop: 8,
  },
  shortsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -6,
    marginBottom: 10,
  },
  shortsGridItem: {
    width: '50%',
    padding: 6,
  },
  shortCard: {
    height: 200,
    borderRadius: 15,
    overflow: 'hidden',
    backgroundColor: '#222',
  },
  shortCardImage: { width: '100%', height: '100%' },
  shortPlayIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortCardOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  shortCardTitle: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 13,
  },
  shortCardViews: { color: '#fff', fontSize: 11, marginTop: 4 },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    marginBottom: 25,
    elevation: 3,
    overflow: 'hidden',
  },
  cardImageContainer: { height: 200, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  playIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sponsoredTag: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: '#F5A623',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
  },
  sponsoredTagText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  cardInfo: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  cardLocRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  cardLocText: { color: '#666', fontSize: 13, marginLeft: 5 },
  cardStats: { alignItems: 'flex-end' },
  statSmall: { fontSize: 12, color: '#999' },

  // Video Detail (short full-screen)
  videoBackground: {
    flex: 1,
    width: width,
    height: height,
    backgroundColor: '#000',
  },
  shortVideoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  shortVideoErrorText: {
    color: '#FFF',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  retryShortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  retryShortText: {
    color: '#FFF',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '600',
  },
  videoOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  videoOverlayInner: {
    flex: 1,
    justifyContent: 'space-between',
  },
  shortPlayCenter: {
    position: 'absolute',
    alignSelf: 'center',
    top: '35%',
  },
  videoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
  },
  backText: { color: '#FFF', fontWeight: 'bold', marginLeft: 5 },
  videoHeaderIcons: { flexDirection: 'row', alignItems: 'center' },
  rightActions: {
    position: 'absolute',
    right: 15,
    bottom: height * 0.25,
    alignItems: 'center',
  },
  actionItem: { alignItems: 'center', marginBottom: 20 },
  iconCircle: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: { color: '#FFF', fontSize: 12, marginTop: 5, fontWeight: '600' },
  videoFooter: { padding: 20, paddingBottom: 40 },
  videoUser: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  videoDesc: { color: '#FFF', fontSize: 15, marginBottom: 5 },
  videoHashtags: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  translationText: {
    color: '#FFF',
    fontSize: 13,
    textDecorationLine: 'underline',
    marginBottom: 15,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  audioRow: { flexDirection: 'row', alignItems: 'center' },
  audioText: { color: '#FFF', fontSize: 13, marginLeft: 5 },
  orderNowBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 10,
  },
  orderNowText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  bottomArrow: { alignItems: 'center', marginTop: 20 },

  // Restaurant Detail
  resContainer: { flex: 1, backgroundColor: '#FFF' },
  resHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    alignItems: 'center',
  },
  resBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resBackText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  resTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  resMainTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  resSubLoc: { fontSize: 14, color: '#999' },
  resOrderBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  resOrderText: { color: '#FFF', fontWeight: 'bold' },
  resVideoCard: {
    paddingHorizontal: 15,
    height: 220,
    position: 'relative',
    marginBottom: 20,
  },
  resVideoImg: { width: '100%', height: '100%', borderRadius: 15 },
  resVideoLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  resVideoErrorOverlay: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 8,
    borderRadius: 8,
  },
  resVideoErrorText: { color: '#FFF', fontSize: 12 },
  resPlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 15,
  },
  resSocialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    alignItems: 'flex-start',
  },
  resIconGroup: { flexDirection: 'row', flexWrap: 'wrap', width: '60%' },
  socialIconWrap: { marginRight: 15, marginBottom: 10 },
  socialIcon: {},
  bookNowBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
    marginBottom: 10,
  },
  bookNowText: { color: '#FFF', fontWeight: 'bold' },
  galleryBtn: {
    backgroundColor: '#222',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 20,
  },
  galleryText: { color: '#FFF', fontWeight: 'bold' },
  webText: {
    paddingHorizontal: 15,
    color: '#666',
    fontSize: 13,
    marginBottom: 20,
  },
  descContainer: { paddingHorizontal: 15, marginBottom: 20 },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  descBox: { backgroundColor: '#F0F0F0', padding: 15, borderRadius: 12 },
  descText: { fontSize: 14, color: '#555', lineHeight: 20 },
  contactContainer: { paddingHorizontal: 15, paddingBottom: 30 },
  contactEmail: { color: '#555', marginTop: 5 },
  contactAddr: { color: '#555', marginTop: 5 },
});

export default HomeOneScreen;
