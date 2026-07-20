/**
 * Vendor / restaurant profile shell — safe for App Review (no Lorem / fake content).
 * Tabs stay off in BottomTabNavigation until this UX is finished; keep this
 * file as the base for a future vendor-profile tab.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import { getChannelProfile } from '../services/channelService';
import { shortsService } from '../services/shortsService';
import { safeImageUri } from '../utils/helper';

const TABS = ['Home', 'Gallery', 'Promotions', 'About'];

const avatarFallback = name =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name || 'Eatwaze',
  )}&background=F97507&color=fff`;

const formatCount = n => {
  const num = Number(n) || 0;
  if (num >= 1000000) return `${(num / 1000000).toFixed(1).replace(/\.0$/, '')}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1).replace(/\.0$/, '')}K`;
  return String(num);
};

const VendorProfileScreen = () => {
  const navigation = useNavigation();
  const user = useSelector(state => state.app?.user);

  const [activeTab, setActiveTab] = useState('Home');
  const [profile, setProfile] = useState(null);
  const [shorts, setShorts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const displayName =
    profile?.channelName ||
    profile?.nickname ||
    profile?.name ||
    user?.channelName ||
    user?.nickname ||
    user?.name ||
    user?.email ||
    'Restaurant profile';

  const avatarUri = safeImageUri(
    profile?.avatar ||
      profile?.profileImage ||
      user?.avatar ||
      user?.profileImage,
    avatarFallback(displayName),
  );

  const bio = String(
    profile?.bio || profile?.description || user?.bio || user?.description || '',
  ).trim();
  const location = String(
    profile?.location || profile?.city || user?.location || user?.city || '',
  ).trim();

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setShorts([]);
      return;
    }
    try {
      const [profileData, shortsRes] = await Promise.all([
        getChannelProfile(user.id, user.id).catch(() => null),
        shortsService.getUserShorts(user.id, 1, 40, user.id),
      ]);
      setProfile(profileData || null);
      const list = Array.isArray(shortsRes?.shorts)
        ? shortsRes.shorts
        : Array.isArray(shortsRes?.data)
          ? shortsRes.data
          : Array.isArray(shortsRes)
            ? shortsRes
            : [];
      setShorts(list);
    } catch (_) {
      setProfile(null);
      setShorts([]);
    }
  }, [user?.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      await loadData();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
  };

  const openBusinessChannel = () => {
    if (!user?.id) return;
    // Profile stack is isolated; open the real channel via the Home tab stack.
    const parent = navigation.getParent?.();
    if (parent?.navigate) {
      parent.navigate('Home1', {
        screen: 'BusinessProfileViewScreen',
        params: { userId: user.id },
      });
      return;
    }
    navigation.navigate('BusinessProfileViewScreen', { userId: user.id });
  };

  const openShort = item => {
    if (!item?.id) return;
    navigation.navigate('ShortsVideoScreen', {
      initialShortId: item.id,
      userId: user?.id,
    });
  };

  const renderEmpty = (title, icon = 'storefront-outline') => (
    <View style={styles.emptyBox}>
      <MaterialCommunityIcons name={icon} size={40} color={COLORS.gray400} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptySub}>
        Nothing here yet — add content from your restaurant tools when ready.
      </Text>
    </View>
  );

  const renderAbout = () => (
    <View style={styles.sectionPad}>
      <Text style={styles.sectionTitle}>About</Text>
      {bio ? (
        <Text style={styles.bodyText}>{bio}</Text>
      ) : (
        <Text style={styles.muted}>No description yet.</Text>
      )}
      {location ? (
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={20}
            color={COLORS.gray600}
          />
          <Text style={styles.bodyText}>{location}</Text>
        </View>
      ) : null}
    </View>
  );

  const renderHomeList = () => {
    if (loading) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator color={COLORS.primaryOrange} />
        </View>
      );
    }
    if (!shorts.length) {
      return renderEmpty('No videos yet', 'video-outline');
    }
    return (
      <FlatList
        data={shorts}
        keyExtractor={item => String(item.id)}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.listPad}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item }) => {
          const title = String(item.title || item.description || 'Untitled').trim();
          const views = formatCount(item.viewCount ?? item._count?.views ?? 0);
          const thumb = safeImageUri(
            item.thumbnailUrl || item.videoUrl,
            avatarFallback('Short'),
          );
          return (
            <TouchableOpacity
              style={styles.gridItem}
              onPress={() => openShort(item)}
              activeOpacity={0.85}
            >
              <Image source={{ uri: thumb }} style={styles.gridThumb} />
              <Text style={styles.videoTitle} numberOfLines={2}>
                {title}
              </Text>
              <Text style={styles.muted}>{views} views</Text>
            </TouchableOpacity>
          );
        }}
      />
    );
  };

  if (!user?.id) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.topNav}>
          <TouchableOpacity onPress={goBack} hitSlop={12}>
            <Ionicons name="arrow-back" size={24} color={COLORS.black} />
          </TouchableOpacity>
        </View>
        {renderEmpty('Sign in as a restaurant to manage this profile')}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.topNav}>
        <TouchableOpacity onPress={goBack} hitSlop={12}>
          <Ionicons name="arrow-back" size={24} color={COLORS.black} />
        </TouchableOpacity>
        <TouchableOpacity onPress={openBusinessChannel} hitSlop={12}>
          <Text style={styles.linkAction}>Full channel</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.header}>
        <Image source={{ uri: avatarUri }} style={styles.avatar} />
        <Text style={styles.name}>{displayName}</Text>
        <Text style={styles.muted}>
          {formatCount(shorts.length)} video{shorts.length === 1 ? '' : 's'}
        </Text>
      </View>

      <View style={styles.tabBar}>
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
          >
            <Text
              style={[
                styles.tabLabel,
                activeTab === tab && styles.tabLabelActive,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Home' && renderHomeList()}
      {activeTab === 'Gallery' && renderEmpty('No gallery items yet', 'image-multiple-outline')}
      {activeTab === 'Promotions' &&
        renderEmpty('No promotions yet', 'tag-outline')}
      {activeTab === 'About' && (
        <FlatList
          data={[]}
          ListHeaderComponent={renderAbout}
          keyExtractor={() => 'about'}
          renderItem={null}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
};

export default VendorProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  linkAction: {
    fontSize: 14,
    fontWeight: FONTS.semiBold,
    color: COLORS.primaryOrange,
  },
  header: {
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.gray200,
    marginBottom: SPACING.sm,
  },
  name: {
    fontSize: 20,
    fontWeight: FONTS.bold,
    color: COLORS.black,
    textAlign: 'center',
  },
  muted: {
    fontSize: 13,
    color: COLORS.gray600,
    marginTop: 4,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.gray200,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primaryOrange,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: FONTS.medium,
    color: COLORS.gray500,
  },
  tabLabelActive: {
    color: COLORS.primaryOrange,
  },
  listPad: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: SPACING.md,
  },
  gridThumb: {
    width: '100%',
    height: 110,
    borderRadius: 10,
    backgroundColor: COLORS.gray200,
    marginBottom: 6,
  },
  videoTitle: {
    fontSize: 13,
    fontWeight: FONTS.semiBold,
    color: COLORS.black,
  },
  sectionPad: {
    padding: SPACING.lg,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: FONTS.bold,
    color: COLORS.black,
    marginBottom: SPACING.sm,
  },
  bodyText: {
    fontSize: 14,
    color: COLORS.gray800,
    lineHeight: 20,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: SPACING.md,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
  },
  emptyBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: 48,
  },
  emptyTitle: {
    marginTop: SPACING.sm,
    fontSize: 16,
    fontWeight: FONTS.semiBold,
    color: COLORS.black,
    textAlign: 'center',
  },
  emptySub: {
    marginTop: 6,
    fontSize: 13,
    color: COLORS.gray600,
    textAlign: 'center',
  },
});
