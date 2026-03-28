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
import { useNavigation } from '@react-navigation/native';
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
  onMessagePress,
  onPressReviews,
  subscribeLoading = false,
  showSubscribe = true,
  /** Opens this channel’s restaurant menu / order flow (HomeThreeScreen via Root) */
  onOrderNowPress,
  /** Same as BusinessProfileCard: open lists for this profile */
  onPressFollowers,
  onPressFollowing,
}) => {
  const navigation = useNavigation();
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
  const averageRatingRaw =
    profile?.averageRating ??
    profile?.ratingAverage ??
    profile?.ratingAvg ??
    profile?.rating;

  const reviewCountRaw =
    profile?.reviewCount ??
    profile?.reviewsCount ??
    profile?.totalReviews ??
    profile?.ratingCount;
  const averageRating = Number.isFinite(Number(averageRatingRaw))
    ? Math.max(0, Math.min(5, Number(averageRatingRaw)))
    : 0;
  const reviewCount = Number.isFinite(Number(reviewCountRaw))
    ? Math.max(0, Math.floor(Number(reviewCountRaw)))
    : 0;
  const averageRatingLabel = averageRating.toFixed(1).replace(/\.0$/, '');
  const roundedRating = Math.round(averageRating);
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={styles.cardContainer}>
      <ImageBackground
        source={{ uri: coverUri }}
        style={styles.bgImage}
        imageStyle={{ borderRadius: 12 }}
      >
        <View style={styles.contentOverlay}>
          {/* Order Now / Book Now — same split pill as BusinessProfileCard Orders / Wallet */}
          <View style={styles.badgeContainer}>
            <TouchableOpacity
              style={styles.twoPartBadge}
              onPress={() =>
                onOrderNowPress
                  ? onOrderNowPress()
                  : navigation.navigate('OrdersList')
              }
              activeOpacity={0.7}
            >
              <View style={styles.badgeIconPart}>
                <Icon name="clipboard-list-outline" size={16} color="#222" />
              </View>
              <View style={styles.badgeTextPart}>
                <Text style={styles.badgeText} numberOfLines={1}>
                  Order Now
                </Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.twoPartBadge, styles.twoPartBadgeSecond]}
              onPress={() => {}}
              activeOpacity={0.7}
            >
              <View style={styles.badgeIconPart}>
                <Icon name="calendar-clock-outline" size={16} color="#222" />
              </View>
              <View
                style={[styles.badgeTextPart, styles.badgeTextPartWalletTone]}
              >
                <Text style={styles.badgeText} numberOfLines={1}>
                  Book Now
                </Text>
              </View>
            </TouchableOpacity>
          </View>

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
                <View style={styles.nameRow}>
                  <Text style={styles.businessNameHeading} numberOfLines={1}>
                    {loading ? 'Loading...' : displayName}
                  </Text>
                </View>
                {onPressReviews ? (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={onPressReviews}
                    style={styles.ratingBelowNameRow}
                    accessibilityRole="button"
                    accessibilityLabel="View all reviews"
                  >
                    <View style={styles.ratingInlineRow}>
                      <Text style={styles.ratingValueText}>
                        {averageRatingLabel}
                      </Text>
                      <View style={styles.ratingStarsRow}>
                        {stars.map(star => (
                          <Icon
                            key={star}
                            name={
                              star <= roundedRating ? 'star' : 'star-outline'
                            }
                            size={13}
                            color={
                              star <= roundedRating ? '#FFE082' : '#FFFFFFA6'
                            }
                            style={styles.ratingStarIcon}
                          />
                        ))}
                      </View>
                      <Text style={styles.ratingCountText}>
                        ({reviewCount}{' '}
                        {reviewCount === 1 ? 'review' : 'reviews'})
                      </Text>
                      {/* <Icon
                        name="chevron-right"
                        size={16}
                        color="rgba(255,255,255,0.85)"
                        style={styles.ratingChevron}
                      /> */}
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.ratingBelowNameRow}>
                    <View style={styles.ratingInlineRow}>
                      <Text style={styles.ratingValueText}>
                        {averageRatingLabel}
                      </Text>
                      <View style={styles.ratingStarsRow}>
                        {stars.map(star => (
                          <Icon
                            key={star}
                            name={
                              star <= roundedRating ? 'star' : 'star-outline'
                            }
                            size={13}
                            color={
                              star <= roundedRating ? '#FFE082' : '#FFFFFFA6'
                            }
                            style={styles.ratingStarIcon}
                          />
                        ))}
                      </View>
                      <Text style={styles.ratingCountText}>
                        ({reviewCount}{' '}
                        {reviewCount === 1 ? 'review' : 'reviews'})
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          </View>

          {/* Bottom Section - Stats and Status Message */}
          <View style={styles.bottomBlock}>
            {/* Opaque Stats Bar */}
            <View style={styles.statsOpaqueBar}>
              <TouchableOpacity
                style={styles.statColumn}
                onPress={onPressFollowers}
                disabled={!onPressFollowers}
                activeOpacity={0.75}
              >
                <Text style={styles.statValMain}>{followers}</Text>
                <Text style={styles.statLabelMain}>Followers</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statColumn}
                onPress={onPressFollowing}
                disabled={!onPressFollowing}
                activeOpacity={0.75}
              >
                <Text style={styles.statValMain}>{following}</Text>
                <Text style={styles.statLabelMain}>Following</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.statColumn}
                onPress={onMessagePress}
                disabled={!onMessagePress}
                activeOpacity={0.75}
              >
                <Text style={styles.statValMain}>{msgCount}</Text>
                <Text style={styles.statLabelMain}>MSG</Text>
              </TouchableOpacity>
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
                    {subscribeLoading
                      ? '...'
                      : isSubscribed
                      ? 'Subscribed'
                      : 'Subscribe'}
                  </Text>
                </TouchableOpacity>
              )}
              {onMessagePress ? (
                <TouchableOpacity
                  style={styles.headerMessageBtn}
                  onPress={onMessagePress}
                  activeOpacity={0.8}
                >
                  <Icon name="message-text-outline" size={18} color="#fff" />
                </TouchableOpacity>
              ) : null}
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
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  subscribeBtn: {
    backgroundColor: '#F39C12',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  headerMessageBtn: {
    marginTop: 5,
    marginBottom: 10,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#111',
    alignItems: 'center',
    justifyContent: 'center',
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
    height: 430,
  },
  contentOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  /** Same position as before — only inner pill visuals match BusinessProfileCard */
  badgeContainer: {
    position: 'absolute',
    top: 20,
    right: 15,
    zIndex: 10,
    alignItems: 'flex-end',
  },
  /** Mirrors BusinessProfileCard twoPartBadge */
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
  twoPartBadgeSecond: {
    marginTop: 10,
  },
  badgeIconPart: {
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  /** Orders-style label (#F39C12); wider for “Order Now” vs “Orders” */
  badgeTextPart: {
    backgroundColor: '#F39C12',
    paddingLeft: 5,
    paddingRight: 8,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 82,
  },
  /** Wallet-style label (#FFa31A) */
  badgeTextPartWalletTone: {
    backgroundColor: '#FFa31A',
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
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingBelowNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
  },
  ratingInlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
    flexWrap: 'wrap',
  },
  ratingValueText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
    marginRight: 4,
  },
  ratingStarsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  ratingStarIcon: {
    marginHorizontal: 0.5,
  },
  ratingCountText: {
    color: '#fff',
    fontSize: 11,
    opacity: 0.95,
  },
  ratingChevron: {
    marginLeft: 4,
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
