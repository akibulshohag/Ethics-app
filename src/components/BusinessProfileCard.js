import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { safeImageUri } from '../utils/helper';

const formatCount = n => {
  if (n == null || n < 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

const DEFAULT_COVER =
  'https://images.unsplash.com/photo-1552566626-52f8b828add9';

const BusinessProfileCard = ({
  profile,
  isOwnProfile,
  onEditProfile,
  onAvatarPress,
  onCoverPress,
  coverUploading,
}) => {
  const navigation = useNavigation();
  const coverUri = profile?.coverUrl || profile?.coverImage || DEFAULT_COVER;
  const channelName =
    profile?.channelName || profile?.nickname || profile?.name || '—';
  const channelAvatar = safeImageUri(
    profile?.channelAvatar,
    'https://via.placeholder.com/100',
  );
  const followerCount = profile?.subscriberCount ?? 0;
  const followingCount = profile?.followingCount ?? 0;
  const channelAbout = profile?.channelAbout || '';

  const CoverWrapper = isOwnProfile && onCoverPress ? TouchableOpacity : View;
  const coverProps =
    isOwnProfile && onCoverPress
      ? {
          onPress: coverUploading ? undefined : onCoverPress,
          activeOpacity: 0.9,
        }
      : {};

  return (
    <View style={styles.cardContainer}>
      <CoverWrapper style={styles.bgImageWrap} {...coverProps}>
        <ImageBackground
          source={{ uri: safeImageUri(coverUri, DEFAULT_COVER) }}
          style={styles.bgImage}
          imageStyle={{ borderRadius: 12 }}
        >
          {coverUploading && (
            <View style={styles.coverLoadingOverlay}>
              <ActivityIndicator size="large" color="#FFF" />
              <Text style={styles.coverLoadingText}>Updating cover...</Text>
            </View>
          )}
          {isOwnProfile && onCoverPress && !coverUploading && (
            <View style={styles.coverEditIcon} pointerEvents="none">
              <Icon
                name="pencil-circle"
                size={32}
                color="rgba(255,255,255,0.95)"
              />
            </View>
          )}
          <View style={styles.contentOverlay}>
            <View style={styles.badgeContainer}>
              <TouchableOpacity
                style={styles.twoPartBadge}
                onPress={() => navigation.navigate('OrdersList')}
                activeOpacity={0.7}
              >
                <View style={styles.badgeIconPart}>
                  <Icon name="clipboard-list-outline" size={16} color="#222" />
                </View>
                <View style={styles.badgeTextPart}>
                  <Text style={styles.badgeText}>Orders</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.twoPartBadge, { marginTop: 10 }]}
                onPress={() => navigation.navigate('Earnings')}
                activeOpacity={0.7}
              >
                <View style={styles.badgeIconPart}>
                  <Icon name="currency-usd" size={16} color="#222" />
                </View>
                <View
                  style={[styles.badgeTextPart, { backgroundColor: '#FFa31A' }]}
                >
                  <Text style={styles.badgeText}>Wallet</Text>
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.amberOverlayBox}>
              <View style={styles.profileHeaderRow}>
                <View style={styles.avatarContainer}>
                  <TouchableOpacity
                    style={styles.avatarCircle}
                    onPress={
                      isOwnProfile && onAvatarPress ? onAvatarPress : undefined
                    }
                    activeOpacity={isOwnProfile && onAvatarPress ? 0.7 : 1}
                    disabled={!isOwnProfile || !onAvatarPress}
                  >
                    <Image
                      source={{ uri: channelAvatar }}
                      style={styles.avatarImage}
                    />
                  </TouchableOpacity>
                  {isOwnProfile && (
                    <View style={styles.editPencilBadge}>
                      <Icon name="pencil-outline" size={14} color="#aaa" />
                    </View>
                  )}
                </View>
                <View style={styles.profileTextGroup}>
                  <Text style={styles.businessNameHeading} numberOfLines={1}>
                    {channelName}
                  </Text>
                  <View style={styles.verifiedIndicatorRow}>
                    <Icon name="check-circle-outline" size={15} color="#fff" />
                    <Text style={styles.verifiedAccountLabel}>
                      verified account
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.actionButtonsRow}>
                {isOwnProfile && (
                  <TouchableOpacity
                    style={styles.editProfileRectBtn}
                    onPress={onEditProfile}
                  >
                    <Text style={styles.editProfileLabel}>Edit Profile</Text>
                    <Icon name="square-edit-outline" size={20} color="#111" />
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.squareIconBtn}>
                  <Icon name="camera-outline" size={24} color="#111" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.squareIconBtn}
                  onPress={() => navigation.navigate('MessageList')}
                  activeOpacity={0.7}
                >
                  <Icon name="message-text-outline" size={22} color="#111" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.bottomBlock}>
              <View style={styles.statsOpaqueBar}>
                <View style={styles.statColumn}>
                  <Text style={styles.statValMain}>
                    {formatCount(followerCount)}
                  </Text>
                  <Text style={styles.statLabelMain}>Followers</Text>
                </View>
                <View style={styles.statColumn}>
                  <Text style={styles.statValMain}>
                    {formatCount(followingCount)}
                  </Text>
                  <Text style={styles.statLabelMain}>Following</Text>
                </View>
                <View style={styles.statColumn}>
                  <Text style={styles.statValMain}>—</Text>
                  <Text style={styles.statLabelMain}>MSG</Text>
                </View>
              </View>
              <View style={styles.statusWhiteBox}>
                <Text style={styles.statusBodyText} numberOfLines={3}>
                  {channelAbout || 'No status yet.'}
                </Text>
              </View>
            </View>
          </View>
        </ImageBackground>
      </CoverWrapper>
    </View>
  );
};

export default BusinessProfileCard;

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    marginHorizontal: 16,
  },
  bgImageWrap: { width: '100%' },
  bgImage: {
    width: '100%',
    height: 410,
  },
  coverLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  coverLoadingText: { color: '#FFF', marginTop: 8, fontSize: 14 },
  coverEditIcon: {
    position: 'absolute',
    top: 12,
    left: 12,
  },
  coverEditHint: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  coverEditHintText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    marginTop: 4,
  },
  contentOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  badgeContainer: {
    paddingTop: 20,
    paddingRight: 15,
    alignItems: 'flex-end',
  },
  twoPartBadge: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  badgeIconPart: {
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeTextPart: {
    backgroundColor: '#F39C12',
    paddingLeft: 5,
    paddingRight: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    width: 65,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  amberOverlayBox: {
    backgroundColor: 'rgba(215, 137, 20, 0.85)',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 16,
    marginBottom: 5,
    marginTop: 50,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 40,
  },
  avatarContainer: {
    position: 'absolute',
    top: -45,
    left: 0,
    zIndex: 10,
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  editPencilBadge: {
    position: 'absolute',
    top: 4,
    right: 0,
    backgroundColor: '#fff',
    borderRadius: 12,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  profileTextGroup: {
    marginLeft: 90,
    justifyContent: 'center',
  },
  businessNameHeading: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  verifiedIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  verifiedAccountLabel: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 6,
    opacity: 0.95,
  },
  faintDotSeparator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(0,0,0,0.2)',
    marginLeft: 8,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  editProfileRectBtn: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 42,
    borderRadius: 8,
    flex: 1,
  },
  editProfileLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginRight: 6,
  },
  squareIconBtn: {
    backgroundColor: '#fff',
    width: 42,
    height: 42,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomBlock: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#fff',
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
  },
  statsOpaqueBar: {
    flexDirection: 'row',
    backgroundColor: '#E6E6E6',
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  statColumn: {
    flex: 1,
    alignItems: 'center',
  },
  statValMain: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  statLabelMain: {
    fontSize: 12,
    color: '#444',
    marginTop: 2,
  },
  statusWhiteBox: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  statusBodyText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 12,
    lineHeight: 20,
    fontWeight: '400',
  },
});
