import React, { useCallback, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  FlatList,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { safeImageUri } from '../../utils/helper';
import {
  getChannelFollowers,
  getChannelProfile,
  subscribeToChannel,
  unsubscribeFromChannel,
} from '../../services/channelService';

const ChannelItem = ({ item, onPressMessage, onPressView }) => (
  <View style={styles.card}>
    <Image source={{ uri: item.image }} style={styles.avatar} />
    <View style={styles.infoContainer}>
      <View style={styles.nameRow}>
        <Text style={styles.channelName}>{item.name}</Text>
        <View style={styles.verifiedBadge}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>
      </View>
      <Text style={styles.statsText}>
        {item.subs} subscribers • {item.videos} videos • {item.shorts} shorts
      </Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.actionBtn}
          onPress={onPressMessage}
          activeOpacity={0.7}
        >
          <Text style={styles.actionBtnText}>Message</Text>
        </TouchableOpacity>
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

export default function FollowersListScreen({ navigation }) {
  const route = useRoute();
  const nav = useNavigation();
  const currentUser = useSelector(state => state.app?.user);
  const profileIdFromParams = route.params?.profileId || route.params?.userId;
  const channelUserId = profileIdFromParams || currentUser?.id;

  const [followers, setFollowers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);

  const loadFollowers = useCallback(
    async (refresh = false) => {
      if (!channelUserId) {
        setFollowers([]);
        setFollowerCount(0);
        return;
      }
      if (refresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await getChannelFollowers(
          channelUserId,
          currentUser?.id,
          1,
          50,
        );
        const rawList = Array.isArray(res?.items) ? res.items : [];
        const total =
          typeof res?.pagination?.total === 'number'
            ? res.pagination.total
            : rawList.length;
        setFollowerCount(total);

        // Base mapping
        let mapped = rawList.map(it => ({
          id: String(it.userId || it.id || it._id),
          userId: it.userId || it.id || it._id,
          name: it.channelName || it.nickname || it.name || 'Channel',
          image: safeImageUri(
            it.channelAvatar || it.avatar,
            'https://via.placeholder.com/100',
          ),
          // We don't have per-follower subscriber counts yet,
          // so keep using the header total here.
          subs: String(total),
          videos: '0',
          shorts: '0',
          isSubscribed: !!it.isSubscribed,
          isMessage: true,
          role: String(it.role || '').toLowerCase(),
        }));

        // Enrich each follower with their own videos + shorts counts
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
                  videos:
                    typeof profile?.videoCount === 'number'
                      ? String(profile.videoCount)
                      : '0',
                  shorts:
                    typeof profile?.shortCount === 'number'
                      ? String(profile.shortCount)
                      : '0',
                  role: String(profile?.role || ch.role || '').toLowerCase(),
                };
              } catch {
                return {
                  id: ch.id,
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

          mapped = mapped.map(ch => ({
            ...ch,
            videos: byId[ch.id]?.videos ?? ch.videos,
            shorts: byId[ch.id]?.shorts ?? ch.shorts,
            role: byId[ch.id]?.role ?? ch.role,
          }));
        } catch {
          // ignore enrichment errors; keep base list
        }

        setFollowers(mapped);
      } catch (e) {
        // fallback to count-only (same as BusinessProfileViewScreen)
        try {
          const profile = await getChannelProfile(
            channelUserId,
            currentUser?.id,
          );
          setFollowerCount(profile?.subscriberCount ?? 0);
        } catch (_) {
          setFollowerCount(0);
        }
        setFollowers([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [channelUserId, currentUser?.id],
  );

  useEffect(() => {
    loadFollowers();
  }, [loadFollowers]);

  const handleToggleSubscribe = async follower => {
    if (!currentUser?.id || !follower?.userId) return;
    const isSubscribed = !!follower.isSubscribed;
    try {
      if (isSubscribed) {
        await unsubscribeFromChannel(currentUser.id, follower.userId);
      } else {
        await subscribeToChannel(currentUser.id, follower.userId);
      }
      setFollowers(prev =>
        prev.map(f =>
          f.userId === follower.userId
            ? {
                ...f,
                isSubscribed: !isSubscribed,
              }
            : f,
        ),
      );
    } catch (e) {
      // ignore; keep previous UI state on error
    }
  };

  const handleMessage = follower => {
    if (!follower?.userId) return;
    nav.navigate('ChatScreen', {
      partnerId: follower.userId,
      partnerName: follower.name,
      partnerAvatar: follower.image,
    });
  };

  const handleViewChannel = follower => {
    if (!follower?.userId) return;
    const targetRole = String(follower?.role || '').toLowerCase();
    if (targetRole === 'user') {
      nav.navigate('Root', {
        screen: 'Home1',
        params: {
          screen: 'PromotionScreen',
          params: { userId: follower.userId },
        },
      });
      return;
    }
    nav.navigate('UserViewsScreen', { userId: follower.userId });
  };

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
        {/* <Text style={styles.moreIcon}>⋮</Text> */}
      </View>

      <Text style={styles.title}>Followers</Text>

      {typeof followerCount === 'number' && (
        <Text style={styles.countText}>
          {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
        </Text>
      )}

      <FlatList
        data={followers}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <ChannelItem
            item={item}
            onPressMessage={() => handleMessage(item)}
            onPressView={() => handleViewChannel(item)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshing={refreshing}
        onRefresh={() => loadFollowers(true)}
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
  moreIcon: { fontSize: 24, color: '#333' },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 20,
    marginVertical: 15,
    color: '#333',
  },
  countText: {
    fontSize: 14,
    color: '#666',
    paddingHorizontal: 20,
    marginBottom: 10,
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
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  channelName: {
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
  subscribedBtn: {
    backgroundColor: '#222',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
  },
  subscribedBtnText: { color: '#FFF', fontWeight: '600' },
  actionBtn: {
    borderWidth: 1.5,
    borderColor: '#F6A623',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    flex: 1,
    alignItems: 'center',
  },
  actionBtnText: { color: '#F6A623', fontWeight: '600' },
});
