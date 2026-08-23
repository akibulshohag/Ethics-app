import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import profileCardBg from '../assets/img/bg.png';
import { safeImageUri } from '../utils/helper';
import { formatShortProfileLocationLine, formatCityCountryPostcodeLine } from '../utils/locationFormat';
import { getConversations } from '../services/chatService';
import UserProfileCard from './UserProfileCard';

const CARD_INSET = 12;
const SHEET_OVERLAP = 88;
const SHEET_GAP = 12;
const PROFILE_AVATAR_TOP_GAP = 20;
/** Rounded top where hero meets orange app header — 0 so no white corner gap under nav */
const HERO_TOP_RADIUS = 0;
const HEADER_ORANGE = '#F6B041';
const STATS_SECTION_BG = '#FFFFFF';
const BIO_SECTION_GRADIENT = {
  colors: ['#F6E0BC', '#FBEACB', '#FFFFFF'],
  locations: [0, 0.5, 1],
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
};

const HERO_TO_SHEET_GRADIENT = [
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.18)',
  'rgba(255,255,255,0.45)',
];

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1552566626-52f8b828add9';

const formatCount = n => {
  const num = Number(n || 0);
  if (!Number.isFinite(num) || num <= 0) return '0';
  if (num >= 1000000)
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(Math.floor(num));
};

const BusinessProfileCard = ({
  profile,
  isOwnProfile,
  isOwnerOrVendor = false,
  onEditProfile,
  onAvatarPress,
  onCoverPress,
  coverUploading = false,
  onSubscribe,
  subscribeLoading = false,
  onOrderNowPress,
  onBookNowPress,
}) => {
  const navigation = useNavigation();
  const currentUser = useSelector(s => s?.app?.user);
  const token = currentUser?.token;
  const [msgCount, setMsgCount] = useState(0);
  const [msgLoading, setMsgLoading] = useState(false);

  const displayName =
    profile?.channelName || profile?.nickname || profile?.name || '—';
  const subtitle =
    String(profile?.nickname || profile?.channelName || '').trim() ||
    formatCityCountryPostcodeLine({
      address: profile?.address,
      postcode: profile?.postcode,
    }) ||
    formatShortProfileLocationLine(profile?.address) ||
    '—';

  const avatarUri = safeImageUri(profile?.channelAvatar, '');
  const coverUri = safeImageUri(
    profile?.coverUrl || profile?.coverImage,
    DEFAULT_COVER,
  );

  const heroSource = useMemo(() => {
    if (coverUri && coverUri !== DEFAULT_COVER) return { uri: coverUri };
    return profileCardBg;
  }, [coverUri]);

  const followerCount =
    profile?.subscriberCount ?? profile?.followersCount ?? 0;
  const followingCount = profile?.followingCount ?? 0;
  const channelAbout =
    (profile?.channelAbout && String(profile.channelAbout).trim()) ||
    'No status yet.';

  useEffect(() => {
    let mounted = true;
    const loadCount = async () => {
      if (!isOwnProfile || !token) {
        if (mounted) setMsgCount(0);
        return;
      }
      try {
        if (mounted) setMsgLoading(true);
        const list = await getConversations(token, currentUser?.id);
        if (mounted) setMsgCount(Array.isArray(list) ? list.length : 0);
      } catch {
        if (mounted) setMsgCount(0);
      } finally {
        if (mounted) setMsgLoading(false);
      }
    };
    loadCount();
    return () => {
      mounted = false;
    };
  }, [isOwnProfile, token, currentUser?.id]);

  if (!isOwnProfile || !isOwnerOrVendor) {
    return (
      <UserProfileCard
        profile={profile}
        canEdit={!!isOwnProfile}
        onEditProfile={isOwnProfile ? onEditProfile : undefined}
        onAvatarPress={isOwnProfile ? onAvatarPress : undefined}
        showSubscribe={!isOwnProfile}
        onSubscribe={onSubscribe}
        subscribeLoading={subscribeLoading}
        onOrderNowPress={onOrderNowPress}
        onBookNowPress={onBookNowPress}
        onPressFollowers={() =>
          navigation.navigate('FollowersListScreen', {
            profileId: profile?.id,
          })
        }
        onPressFollowing={() =>
          navigation.navigate('FollowingListScreen', {
            profileId: profile?.id,
          })
        }
        onMessagePress={() => navigation.navigate('MessageList')}
      />
    );
  }

  return (
    <View style={styles.heroShell}>
      <View style={styles.root}>
        <View style={styles.backdrop} pointerEvents="none">
          <Image
            source={heroSource}
            style={styles.backdropImage}
            resizeMode="cover"
            blurRadius={Platform.OS === 'ios' ? 16 : 10}
          />
          <View style={styles.backdropDim} />
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.05)',
              'rgba(0,0,0,0.12)',
              'rgba(0,0,0,0.22)',
            ]}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          <LinearGradient
            colors={HERO_TO_SHEET_GRADIENT}
            locations={[0, 0.55, 1]}
            style={styles.backdropBottomFade}
          />
        </View>

        {coverUploading ? (
          <View style={styles.coverLoadingOverlay} pointerEvents="none">
            <ActivityIndicator size="large" color="#FFF" />
            <Text style={styles.coverLoadingText}>Updating cover...</Text>
          </View>
        ) : null}

        <View style={styles.profileTop}>
          <TouchableOpacity
            style={styles.avatarWrap}
            onPress={onAvatarPress}
            activeOpacity={0.9}
            disabled={!onAvatarPress}
          >
            <View style={styles.profileAvatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <Icon name="account" size={44} color="#F5A623" />
              )}
            </View>
            <View style={styles.avatarEditBadge}>
              <Icon name="pencil-outline" size={11} color="#666" />
            </View>
          </TouchableOpacity>

          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileSubtitle}>{subtitle}</Text>

          <View style={styles.heroActionRow}>
            <TouchableOpacity
              style={styles.editProfileBtn}
              onPress={onEditProfile}
              activeOpacity={0.85}
            >
              <Text style={styles.editProfileBtnText}>Edit Profile</Text>
              <Icon name="pencil-outline" size={18} color="#FFFFFF" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroIconBtn}
              onPress={onCoverPress}
              disabled={!onCoverPress || coverUploading}
              activeOpacity={0.85}
            >
              <Icon name="camera-outline" size={22} color="#111" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroIconBtn}
              onPress={() => navigation.navigate('MessageList')}
              activeOpacity={0.85}
            >
              <Icon name="email-outline" size={22} color="#111" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.profileSheetWrap}>
          <View style={styles.statsSection}>
            <TouchableOpacity
              style={styles.profileStatItem}
              onPress={() =>
                navigation.navigate('FollowersListScreen', {
                  profileId: profile?.id,
                })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.profileStatValue}>
                {formatCount(followerCount)}
              </Text>
              <Text style={styles.profileStatLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileStatItem}
              onPress={() =>
                navigation.navigate('FollowingListScreen', {
                  profileId: profile?.id,
                })
              }
              activeOpacity={0.8}
            >
              <Text style={styles.profileStatValue}>
                {formatCount(followingCount)}
              </Text>
              <Text style={styles.profileStatLabel}>Following</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileStatItem}
              onPress={() => navigation.navigate('MessageList')}
              activeOpacity={0.75}
            >
              <Text style={styles.profileStatValue}>
                {msgLoading ? '…' : formatCount(msgCount)}
              </Text>
              <Text style={styles.profileStatLabel}>MSG</Text>
            </TouchableOpacity>
          </View>

          <LinearGradient
            colors={BIO_SECTION_GRADIENT.colors}
            locations={BIO_SECTION_GRADIENT.locations}
            start={BIO_SECTION_GRADIENT.start}
            end={BIO_SECTION_GRADIENT.end}
            style={styles.bioSectionWrap}
          >
            <View style={styles.bioSection}>
              <Text style={styles.profileBioText}>{channelAbout}</Text>

              {isOwnerOrVendor ? (
                <View style={styles.ordersWalletRow}>
                  <TouchableOpacity
                    style={styles.splitBadge}
                    onPress={() => navigation.navigate('OrdersList')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.splitBadgeIconSlot}>
                      <Icon
                        name="clipboard-list-outline"
                        size={18}
                        color="#222222"
                      />
                    </View>
                    <View style={styles.splitBadgeOrdersLabel}>
                      <Text style={styles.splitBadgeLabelText}>Orders</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.splitBadge}
                    onPress={() => navigation.navigate('Earnings')}
                    activeOpacity={0.85}
                  >
                    <View style={styles.splitBadgeIconSlot}>
                      <Icon name="wallet-outline" size={18} color="#222222" />
                    </View>
                    <View style={styles.splitBadgeWalletLabel}>
                      <Text style={styles.splitBadgeLabelText}>Wallet</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
};

export default BusinessProfileCard;

const styles = StyleSheet.create({
  heroShell: {
    width: '100%',
    backgroundColor: HEADER_ORANGE,
  },
  root: {
    width: '100%',
    position: 'relative',
    borderTopLeftRadius: HERO_TOP_RADIUS,
    borderTopRightRadius: HERO_TOP_RADIUS,
    overflow: 'hidden',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#8A6B3F',
  },
  backdropImage: {
    width: '100%',
    height: '100%',
  },
  backdropDim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(246,176,65,0.10)',
  },
  backdropBottomFade: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '48%',
  },
  coverLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverLoadingText: {
    color: '#FFF',
    marginTop: 8,
    fontSize: 14,
  },
  profileTop: {
    alignItems: 'center',
    paddingTop: PROFILE_AVATAR_TOP_GAP,
    paddingBottom: SHEET_OVERLAP + 8,
    paddingHorizontal: 16,
    zIndex: 1,
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 10,
  },
  profileAvatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    backgroundColor: '#2B2B2B',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: -2,
    top: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 11,
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    elevation: 2,
  },
  profileName: {
    color: '#FFFFFF',
    fontSize: 21,
    fontWeight: '800',
    textAlign: 'center',
  },
  profileSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginTop: 2,
    marginBottom: 14,
    textAlign: 'center',
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    gap: 8,
  },
  editProfileBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5A623',
    borderRadius: 8,
    paddingVertical: 11,
    paddingHorizontal: 12,
    gap: 6,
    minHeight: 44,
  },
  editProfileBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  heroIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSheetWrap: {
    marginTop: -SHEET_OVERLAP,
    marginHorizontal: CARD_INSET,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: 'hidden',
    zIndex: 2,
    backgroundColor: 'transparent',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  statsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: SHEET_GAP,
    paddingBottom: SHEET_GAP,
    paddingHorizontal: SHEET_GAP,
    backgroundColor: STATS_SECTION_BG,
  },
  profileStatItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileStatValue: {
    color: '#111111',
    fontSize: 21,
    fontWeight: '800',
  },
  profileStatLabel: {
    color: '#333333',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
  },
  bioSectionWrap: {
    width: '100%',
    backgroundColor: '#F6EBDA',
    overflow: 'hidden',
  },
  bioSection: {
    paddingHorizontal: SHEET_GAP,
    paddingTop: SHEET_GAP,
    paddingBottom: SHEET_GAP,
    alignItems: 'center',
  },
  profileBioText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#404040',
    textAlign: 'center',
    marginBottom: SHEET_GAP,
    paddingHorizontal: 4,
  },
  ordersWalletRow: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
    justifyContent: 'center',
  },
  /** Figma: icon in white slot, label in colored pill (not inside same fill) */
  splitBadge: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'stretch',
    minHeight: 36,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  splitBadgeIconSlot: {
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  splitBadgeOrdersLabel: {
    flex: 1,
    backgroundColor: '#F5A623',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  splitBadgeWalletLabel: {
    flex: 1,
    backgroundColor: '#1F2937',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  splitBadgeLabelText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
