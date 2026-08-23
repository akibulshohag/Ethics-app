import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  SectionList,
  StatusBar,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { IMAGE_PLACEHOLDER, safeImageUri } from '../../utils/helper';
import {
  getChannelFollowing,
  getChannelProfile,
  getSuggestedFollowingOwners,
  subscribeToChannel,
} from '../../services/channelService';
import { recordRecentChatPartner } from '../../services/chatRecentStorage';

const ORANGE = '#F6A421';
const SUGGESTIONS_PAGE_SIZE = 20;

const mapChannelRow = (it, extras = {}) => ({
  id: String(it.userId || it.id),
  userId: it.userId || it.id,
  name:
    it.channelName ||
    it.nickname ||
    it.name ||
    'Channel',
  image: safeImageUri(it.channelAvatar || it.image, IMAGE_PLACEHOLDER),
  subs: String(it.subs ?? '0'),
  videos: String(it.videos ?? '0'),
  shorts: String(it.shorts ?? '0'),
  role: String(it.role || extras.role || 'owner').toLowerCase(),
  isSubscribed: !!it.isSubscribed,
  ...extras,
});

const mapSuggestionRow = it =>
  mapChannelRow(
    {
      ...it,
      image: it.channelAvatar,
      subs: it.subscriberCount,
      videos: it.videoCount,
      shorts: it.shortCount,
    },
    { role: 'owner', isSubscribed: false },
  );

const ChannelItem = ({
  item,
  onPressMessage,
  onPressView,
  onPressFollow,
  showFollow = false,
  followLoading = false,
}) => (
  <View style={styles.card}>
    <Image source={{ uri: item.image }} style={styles.avatar} />
    <View style={styles.infoContainer}>
      <View style={styles.nameRow}>
        <Text style={styles.channelName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.verifiedBadge}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>
      </View>
      <Text style={styles.statsText}>
        {item.subs} subscribers • {item.videos} videos • {item.shorts} shorts
      </Text>

      <View style={styles.buttonRow}>
        {showFollow ? (
          <TouchableOpacity
            style={[styles.followBtn, followLoading && styles.followBtnDisabled]}
            onPress={onPressFollow}
            activeOpacity={0.7}
            disabled={followLoading}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.followBtnText}>Follow</Text>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={onPressMessage}
            activeOpacity={0.7}
          >
            <Text style={styles.actionBtnText}>Message</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onPressView}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnText}>View Channel</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

export default function FollowingListScreen({ navigation }) {
  const route = useRoute();
  const nav = useNavigation();
  const currentUser = useSelector(state => state.app?.user);
  const browseLocation = useSelector(state => state.app?.browseLocation);
  const profileIdFromParams = route.params?.profileId || route.params?.userId;
  const userId = profileIdFromParams || currentUser?.id;
  const isOwnList =
    !!currentUser?.id &&
    (!profileIdFromParams || String(profileIdFromParams) === String(currentUser.id));

  const [channels, setChannels] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsLoadingMore, setSuggestionsLoadingMore] = useState(false);
  const [suggestionsPage, setSuggestionsPage] = useState(1);
  const [hasMoreSuggestions, setHasMoreSuggestions] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [followLoadingId, setFollowLoadingId] = useState(null);

  const enrichChannels = useCallback(
    async mapped => {
      if (!mapped.length) return mapped;
      try {
        const profiles = await Promise.all(
          mapped.map(async ch => {
            try {
              const profile = await getChannelProfile(
                ch.userId,
                currentUser?.id,
              );
              return {
                id: ch.id,
                subs:
                  typeof profile?.subscriberCount === 'number'
                    ? String(profile.subscriberCount)
                    : ch.subs,
                videos:
                  typeof profile?.videoCount === 'number'
                    ? String(profile.videoCount)
                    : ch.videos,
                shorts:
                  typeof profile?.shortCount === 'number'
                    ? String(profile.shortCount)
                    : ch.shorts,
                role: String(profile?.role || ch.role || '').toLowerCase(),
              };
            } catch {
              return {
                id: ch.id,
                subs: ch.subs,
                videos: ch.videos,
                shorts: ch.shorts,
                role: ch.role,
              };
            }
          }),
        );
        const byId = profiles.reduce((acc, p) => {
          acc[p.id] = p;
          return acc;
        }, {});
        return mapped.map(ch => ({
          ...ch,
          subs: byId[ch.id]?.subs ?? ch.subs,
          videos: byId[ch.id]?.videos ?? ch.videos,
          shorts: byId[ch.id]?.shorts ?? ch.shorts,
          role: byId[ch.id]?.role ?? ch.role,
        }));
      } catch {
        return mapped;
      }
    },
    [currentUser?.id],
  );

  const loadSuggestions = useCallback(
    async ({ page = 1, append = false } = {}) => {
      if (!isOwnList || !currentUser?.id) {
        setSuggestions([]);
        setHasMoreSuggestions(false);
        return;
      }
      if (append) setSuggestionsLoadingMore(true);
      else setSuggestionsLoading(true);
      try {
        const lat =
          browseLocation?.lat != null ? Number(browseLocation.lat) : null;
        const lng =
          browseLocation?.lng != null ? Number(browseLocation.lng) : null;
        const params = {
          page,
          limit: SUGGESTIONS_PAGE_SIZE,
        };
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          params.nearbyLat = lat;
          params.nearbyLng = lng;
        }

        const res = await getSuggestedFollowingOwners(currentUser.id, params);
        const rawList = Array.isArray(res?.items) ? res.items : [];
        const mapped = rawList.map(mapSuggestionRow);
        setSuggestions(prev => (append ? [...prev, ...mapped] : mapped));
        setSuggestionsPage(page);
        const totalPages = res?.pagination?.totalPages ?? 0;
        setHasMoreSuggestions(page < totalPages);
      } catch {
        if (!append) setSuggestions([]);
        setHasMoreSuggestions(false);
      } finally {
        setSuggestionsLoading(false);
        setSuggestionsLoadingMore(false);
      }
    },
    [
      isOwnList,
      currentUser?.id,
      browseLocation?.lat,
      browseLocation?.lng,
    ],
  );

  const loadFollowing = useCallback(
    async (refresh = false) => {
      if (!userId) {
        setChannels([]);
        setSuggestions([]);
        return;
      }
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await getChannelFollowing(userId, currentUser?.id, 1, 50);
        const rawList = Array.isArray(res?.items) ? res.items : [];
        let mapped = rawList.map(it =>
          mapChannelRow({
            ...it,
            image: it.channelAvatar,
          }),
        );
        mapped = await enrichChannels(mapped);
        setChannels(mapped);
        await loadSuggestions({ page: 1, append: false });
      } catch (e) {
        setChannels([]);
        if (isOwnList) {
          await loadSuggestions({ page: 1, append: false });
        } else {
          setSuggestions([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [userId, currentUser?.id, enrichChannels, loadSuggestions, isOwnList],
  );

  useEffect(() => {
    loadFollowing();
  }, [loadFollowing]);

  const handleMessage = channel => {
    if (!channel?.userId) return;
    recordRecentChatPartner({
      partnerId: channel.userId,
      partnerName: channel.name,
      partnerAvatar: channel.image,
      partnerRole: channel.role,
    });
    nav.navigate('ChatScreen', {
      partnerId: channel.userId,
      partnerName: channel.name,
      partnerAvatar: channel.image,
    });
  };

  const handleViewChannel = channel => {
    if (!channel?.userId) return;
    const targetRole = String(channel?.role || '').toLowerCase();
    if (targetRole === 'user') {
      nav.navigate('Root', {
        screen: 'Home1',
        params: {
          screen: 'PromotionScreen',
          params: { userId: channel.userId },
        },
      });
      return;
    }
    nav.navigate('UserViewsScreen', { userId: channel.userId });
  };

  const loadMoreSuggestions = useCallback(() => {
    if (
      suggestionsLoading ||
      suggestionsLoadingMore ||
      !hasMoreSuggestions ||
      !isOwnList
    ) {
      return;
    }
    loadSuggestions({ page: suggestionsPage + 1, append: true });
  }, [
    suggestionsLoading,
    suggestionsLoadingMore,
    hasMoreSuggestions,
    isOwnList,
    suggestionsPage,
    loadSuggestions,
  ]);

  const handleFollowSuggestion = async channel => {
    if (!currentUser?.id || !channel?.userId) return;
    const ownerId = String(channel.userId);
    if (followLoadingId === ownerId) return;
    setFollowLoadingId(ownerId);
    try {
      await subscribeToChannel(currentUser.id, ownerId);
      setSuggestions(prev =>
        prev.filter(item => String(item.userId) !== ownerId),
      );
      setChannels(prev => [
        { ...channel, isSubscribed: true },
        ...prev.filter(item => String(item.userId) !== ownerId),
      ]);
    } catch {
      // keep list unchanged on error
    } finally {
      setFollowLoadingId(null);
    }
  };

  const sections = useMemo(() => {
    const next = [{ key: 'following', title: null, data: channels }];
    if (isOwnList) {
      next.push({
        key: 'suggestions',
        title: 'You May Know',
        data: suggestions,
      });
    }
    return next;
  }, [channels, suggestions, isOwnList]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>◀ Back</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Following</Text>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => `${item.id}-${index}`}
        renderItem={({ item, section }) => (
          <ChannelItem
            item={item}
            showFollow={section.key === 'suggestions'}
            followLoading={followLoadingId === String(item.userId)}
            onPressFollow={() => handleFollowSuggestion(item)}
            onPressMessage={() => handleMessage(item)}
            onPressView={() => handleViewChannel(item)}
          />
        )}
        renderSectionHeader={({ section }) => {
          if (!section.title) return null;
          if (
            section.key === 'suggestions' &&
            !suggestionsLoading &&
            section.data.length === 0
          ) {
            return null;
          }
          return (
            <View style={styles.sectionHeaderWrap}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              {suggestionsLoading && section.data.length === 0 ? (
                <ActivityIndicator size="small" color={ORANGE} />
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          !loading ? (
            <Text style={styles.emptyText}>
              You are not following anyone yet.
            </Text>
          ) : null
        }
        ListFooterComponent={
          suggestionsLoadingMore ? (
            <ActivityIndicator
              style={styles.footerLoader}
              size="small"
              color={ORANGE}
            />
          ) : null
        }
        onEndReached={loadMoreSuggestions}
        onEndReachedThreshold={0.35}
        contentContainerStyle={styles.listContent}
        refreshing={refreshing}
        onRefresh={() => loadFollowing(true)}
        stickySectionHeadersEnabled={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 10,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#333',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  backText: { color: '#FFF', fontWeight: 'bold' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginVertical: 15,
    color: '#333',
  },
  listContent: {
    paddingBottom: 20,
    flexGrow: 1,
  },
  sectionHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFF',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  emptyText: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    color: '#888',
    fontSize: 14,
  },
  footerLoader: {
    paddingVertical: 16,
  },
  card: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 25,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 15,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  channelName: {
    flexShrink: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  verifiedBadge: {
    backgroundColor: '#4A90E2',
    borderRadius: 10,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 5,
  },
  checkIcon: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  statsText: {
    color: '#666',
    fontSize: 13,
    marginBottom: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    borderWidth: 1.5,
    borderColor: ORANGE,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
  },
  actionBtnText: { color: ORANGE, fontWeight: '600' },
  followBtn: {
    backgroundColor: ORANGE,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 34,
  },
  followBtnDisabled: {
    opacity: 0.7,
  },
  followBtnText: { color: '#FFF', fontWeight: '700' },
});
