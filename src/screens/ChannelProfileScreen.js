import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import ShortsVideoCard from '../components/ShortsVideoCard';
import {
  getChannelProfile,
  subscribeToChannel,
  unsubscribeFromChannel,
} from '../services/channelService';
import { shortsService } from '../services/shortsService';
import { safeImageUri } from '../utils/helper';

const formatCount = n => {
  const num = Number(n) || 0;
  if (num < 0) return '0';
  if (num >= 1000000) return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(num);
};

const avatarFallback = name =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || 'Eatwaze',
  )}&background=F97507&color=fff`;

const mapShortToCard = s => {
  const viewCount = s.viewCount ?? s._count?.views ?? 0;
  const rawTitle = String(s.title || s.description || 'Untitled').trim();
  const title =
    rawTitle.length > 50 ? `${rawTitle.slice(0, 47)}...` : rawTitle;
  return {
    id: s.id,
    title,
    views: `${formatCount(viewCount)} views`,
    thumbnail: safeImageUri(
      s.thumbnailUrl || s.videoUrl,
      avatarFallback('Short'),
    ),
  };
};

const ChannelProfileScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const currentUser = useSelector(state => state.app?.user);
  const userId = route.params?.userId;

  const [profile, setProfile] = useState(null);
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [error, setError] = useState('');

  const isOwnChannel =
    !!userId && !!currentUser?.id && String(currentUser.id) === String(userId);

  const loadData = useCallback(async () => {
    if (!userId) {
      setError('This channel could not be found.');
      setProfile(null);
      setShorts([]);
      return;
    }
    setError('');
    try {
      const [profileData, shortsRes] = await Promise.all([
        getChannelProfile(userId, currentUser?.id),
        shortsService.getUserShorts(userId, 1, 50, currentUser?.id),
      ]);
      // channelService returns a tiny stub on 404 — treat that as missing.
      const hasRealProfile = !!(
        profileData?.id ||
        profileData?.channelName ||
        profileData?.nickname ||
        profileData?.name
      );
      if (!hasRealProfile) {
        setError('This channel could not be found.');
        setProfile(null);
        setShorts([]);
        return;
      }
      setProfile(profileData);
      const list = Array.isArray(shortsRes?.shorts)
        ? shortsRes.shorts
        : Array.isArray(shortsRes?.data)
          ? shortsRes.data
          : Array.isArray(shortsRes)
            ? shortsRes
            : [];
      setShorts(list.map(mapShortToCard));
    } catch (e) {
      setError(e?.message || 'Could not load this channel. Please try again.');
      setProfile(null);
      setShorts([]);
    }
  }, [userId, currentUser?.id]);

  useEffect(() => {
    let cancelled = false;
    const init = async () => {
      setLoading(true);
      await loadData();
      if (!cancelled) setLoading(false);
    };
    init();
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const channelName =
    profile?.channelName ||
    profile?.nickname ||
    profile?.name ||
    'Channel';
  const channelAvatar = safeImageUri(
    profile?.channelAvatar ||
      profile?.photos?.[0]?.src ||
      (Array.isArray(profile?.photos) && profile.photos[0]?.src),
    avatarFallback(channelName),
  );
  const subscriberCount = profile?.subscriberCount ?? 0;
  const shortCount = profile?.shortCount ?? shorts.length;
  const isSubscribed = !!profile?.isSubscribed;
  const isVerified = !!(profile?.isVerified || profile?.verified);

  const handleSubscribe = async () => {
    if (!currentUser?.id) {
      Alert.alert('Sign in required', 'Please sign in to subscribe to channels.');
      return;
    }
    if (!userId || isOwnChannel || subscribeLoading) return;
    setSubscribeLoading(true);
    try {
      if (isSubscribed) {
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
      Alert.alert('Error', e?.message || 'Could not update subscription.');
    } finally {
      setSubscribeLoading(false);
    }
  };

  const openFullChannel = () => {
    if (!userId) return;
    navigation.navigate('ChannelDetailsScreen', { userId });
  };

  const handleShortPress = item => {
    navigation.navigate('ShortsVideoScreen', { shortId: item.id });
  };

  const renderHeader = () => (
    <View>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={openFullChannel}
            accessibilityRole="button"
            accessibilityLabel="Open full channel"
          >
            <Ionicons
              name="ellipsis-horizontal-circle-outline"
              size={24}
              color="#000"
            />
          </TouchableOpacity>
        </View>
      </View>

      {profile ? (
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <Image source={{ uri: channelAvatar }} style={styles.avatar} />
          </View>

          <View style={styles.nameContainer}>
            <Text style={styles.name}>{channelName}</Text>
            {isVerified ? (
              <MaterialCommunityIcons
                name="check-decagram"
                size={18}
                color="#3ea6ff"
                style={styles.verifiedIcon}
              />
            ) : null}
          </View>

          {!isOwnChannel ? (
            <TouchableOpacity
              style={[
                styles.subscribeButton,
                isSubscribed && styles.subscribedButton,
              ]}
              onPress={handleSubscribe}
              disabled={subscribeLoading}
              activeOpacity={0.85}
            >
              {subscribeLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.subscribeText,
                    isSubscribed && styles.subscribedText,
                  ]}
                >
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}

          <Text style={styles.statsText}>
            {`${formatCount(subscriberCount)} subscribers  •  ${formatCount(
              shortCount,
            )} shorts`}
          </Text>

          <TouchableOpacity style={styles.aboutLink} onPress={openFullChannel}>
            <Text style={styles.aboutText}>More about this channel</Text>
            <Ionicons name="chevron-forward" size={14} color="#606060" />
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.divider} />
      {shorts.length > 0 ? (
        <Text style={styles.sectionTitle}>Shorts</Text>
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#F97507" />
        </View>
      </SafeAreaView>
    );
  }

  if (!userId || error) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorTitle}>Channel unavailable</Text>
          <Text style={styles.errorText}>
            {error || 'This channel could not be found.'}
          </Text>
          {userId ? (
            <TouchableOpacity style={styles.retryButton} onPress={onRefresh}>
              <Text style={styles.retryText}>Try again</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <FlatList
        data={shorts}
        keyExtractor={item => String(item.id)}
        renderItem={({ item }) => (
          <ShortsVideoCard video={item} onPress={() => handleShortPress(item)} />
        )}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyTitle}>No shorts yet</Text>
            <Text style={styles.emptyText}>
              This channel has not published any shorts.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={openFullChannel}>
              <Text style={styles.retryText}>View full channel</Text>
            </TouchableOpacity>
          </View>
        }
        columnWrapperStyle={shorts.length > 0 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F97507"
            colors={['#F97507']}
          />
        }
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 56,
  },
  headerRight: {
    flexDirection: 'row',
  },
  headerButton: {
    marginLeft: 20,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F2F4',
  },
  nameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginRight: 6,
  },
  verifiedIcon: {
    marginTop: 2,
  },
  subscribeButton: {
    backgroundColor: '#F97507',
    paddingHorizontal: 40,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 12,
    minWidth: 140,
    alignItems: 'center',
  },
  subscribedButton: {
    backgroundColor: '#E8E8E8',
  },
  subscribeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  subscribedText: {
    color: '#333',
  },
  statsText: {
    color: '#606060',
    fontSize: 14,
    marginBottom: 8,
  },
  aboutLink: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  aboutText: {
    color: '#606060',
    fontSize: 14,
    marginRight: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#e0e0e0',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
  },
  flatListContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  columnWrapper: {
    justifyContent: 'space-between',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#F97507',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default ChannelProfileScreen;
