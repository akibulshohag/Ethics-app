import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { safeImageUri } from '../utils/helper';

const formatCount = n => {
  const num = Number(n || 0);
  if (!Number.isFinite(num) || num <= 0) return '0';
  if (num >= 1000000)
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(Math.floor(num));
};

const UserProfileCard = ({
  profile,
  loading = false,
  canEdit = false,
  onSubscribe,
  subscribeLoading = false,
  showSubscribe = true,
}) => {
  const coverUri =
    profile?.coverUrl ||
    profile?.coverImage ||
    'https://images.unsplash.com/photo-1552566626-52f8b828add9';
  const name =
    profile?.channelName || profile?.nickname || profile?.name || 'yourname';
  const displayName =
    profile?.nickname && !String(profile.nickname).startsWith('@')
      ? `@${profile.nickname}`
      : profile?.nickname
      ? String(profile.nickname)
      : name;
  const avatarUri = safeImageUri(
    profile?.channelAvatar || profile?.photos?.[0]?.src || profile?.photos?.[0],
    '',
  );
  const followers = formatCount(
    profile?.subscriberCount ?? profile?.followersCount ?? 0,
  );
  const following = formatCount(profile?.followingCount ?? 0);
  const msgCount = formatCount(profile?.messageCount ?? 0);
  const statusText =
    (profile?.channelAbout && String(profile.channelAbout).trim()) ||
    'Hi! Welcome to this profile.';
  const isSubscribed = !!profile?.isSubscribed;

  return (
    <View style={styles.cardContainer}>
      <ImageBackground
        source={{ uri: coverUri }}
        style={styles.bgImage}
        imageStyle={{ borderRadius: 12 }}
      >
        <View style={styles.contentOverlay}>
          {/* Amber Profile Box Overlay */}
          <View style={styles.amberOverlayBox}>
            <View style={styles.profileHeaderRow}>
              <View style={styles.avatarContainer}>
                <View style={styles.avatarCircle}>
                  {avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Icon name="account" size={40} color="#F5A623" />
                  )}
                </View>
                {canEdit && (
                  <View style={styles.editPencilBadge}>
                    <Icon name="pencil-outline" size={14} color="#aaa" />
                  </View>
                )}
              </View>

              <View style={styles.profileTextGroup}>
                <Text style={styles.businessNameHeading} numberOfLines={1}>
                  {loading ? 'Loading...' : displayName}
                </Text>
                <View style={styles.verifiedIndicatorRow}>
                  <Icon name="check-circle-outline" size={15} color="#fff" />
                  <Text style={styles.verifiedAccountLabel}>
                    verified account
                  </Text>
                  <View style={styles.faintDotSeparator} />
                </View>
              </View>
            </View>
          </View>

          {/* Bottom Section - Stats and Status Message */}
          <View style={styles.bottomBlock}>
            {/* Opaque Stats Bar */}
            <View style={styles.statsOpaqueBar}>
              <View style={styles.statColumn}>
                <Text style={styles.statValMain}>{followers}</Text>
                <Text style={styles.statLabelMain}>Followers</Text>
              </View>
              <View style={styles.statColumn}>
                <Text style={styles.statValMain}>{following}</Text>
                <Text style={styles.statLabelMain}>Following</Text>
              </View>
              <View style={styles.statColumn}>
                <Text style={styles.statValMain}>{msgCount}</Text>
                <Text style={styles.statLabelMain}>MSG</Text>
              </View>
            </View>

            {/* Opaque Status Box */}
            <View style={styles.statusWhiteBox}>
              <Text style={styles.statusBodyText}>
                {statusText.slice(0, 75) || 'No status yet.'}...
              </Text>
            </View>
            <View style={styles.subscribeBtnContainer}>
              {showSubscribe && (
                <TouchableOpacity
                  style={[
                    styles.subscribeBtn,
                    isSubscribed && styles.subscribedBtn,
                    subscribeLoading && { opacity: 0.7 },
                  ]}
                  onPress={onSubscribe}
                  disabled={!onSubscribe || subscribeLoading}
                  activeOpacity={0.8}
                >
                  <Text style={styles.subscribeBtnText}>
                    {subscribeLoading ? '...' : isSubscribed ? 'Subscribed' : 'Subscribe'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </ImageBackground>
    </View>
  );
};

export default UserProfileCard;

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    marginHorizontal: 16, // Assuming it takes full width minus some padding
  },
  subscribeBtnContainer: {
    alignItems: 'center',
  },
  subscribeBtn: {
    backgroundColor: '#F39C12',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
    marginHorizontal: 16,
    marginBottom: 10,
  },
  subscribedBtn: {
    backgroundColor: '#333',
  },
  subscribeBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  bgImage: {
    width: '100%',
    height: 410,
  },
  contentOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  amberOverlayBox: {
    backgroundColor: 'rgba(215, 137, 20, 0.85)',
    borderRadius: 8,
    padding: 10,
    marginHorizontal: 16,
    marginTop: 160,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
  },
  avatarContainer: {
    position: 'absolute',
    top: -35,
    left: 0,
    zIndex: 10,
  },
  avatarCircle: {
    width: 70,
    height: 70,
    borderRadius: 45,
    backgroundColor: '#222',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
  },
  avatarImage: { width: 70, height: 70, borderRadius: 45 },
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
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#E6E6E6',
    paddingVertical: 8,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  statColumn: {
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
