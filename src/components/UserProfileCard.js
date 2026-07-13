import React, { useMemo } from 'react';
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
import profileCardBg from '../assets/img/bg.png';
import { safeImageUri } from '../utils/helper';
import { formatShortProfileLocationLine, formatCityCountryPostcodeLine } from '../utils/locationFormat';
import BiometricLockToggle from './BiometricLockToggle';

/** Figma fill 351px on ~375 → 12px side inset */
const CARD_INSET = 12;
const SHEET_OVERLAP = 88;
const SHEET_GAP = 12;
/** Space between hero top edge and profile avatar (all profile cards) */
const PROFILE_AVATAR_TOP_GAP = 20;
/** Rounded top where hero meets orange app header */
const HERO_TOP_RADIUS = 20;
const HEADER_ORANGE = '#F6B041';

/** Figma stats row — solid white card */
const STATS_SECTION_BG = '#FFFFFF';
const BIO_SECTION_GRADIENT = {
  colors: ['#F6E0BC', '#FBEACB', '#FFFFFF'],
  locations: [0, 0.5, 1],
  start: { x: 0.5, y: 0 },
  end: { x: 0.5, y: 1 },
};
const SUBSCRIBED_BTN_GRADIENT = {
  colors: ['#A6B0BF', '#B5BEC9'],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
};

const HERO_TO_SHEET_GRADIENT = [
  'rgba(255,255,255,0)',
  'rgba(255,255,255,0.22)',
  'rgba(255,255,255,0.5)',
];

const formatCount = n => {
  const num = Number(n || 0);
  if (!Number.isFinite(num) || num <= 0) return '0';
  if (num >= 1000000)
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(Math.floor(num));
};

const renderStarRow = rating => {
  const r = Math.min(5, Math.max(0, Number(rating) || 0));
  const filled = Math.round(r);
  return (
    <View style={styles.starRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <Icon
          key={`star-${i}`}
          name={i <= filled ? 'star' : 'star-outline'}
          size={10}
          color="#F5A623"
          style={styles.starIcon}
        />
      ))}
    </View>
  );
};

const UserProfileCard = ({
  profile,
  loading = false,
  canEdit = false,
  onAvatarPress,
  avatarUploading = false,
  onSubscribe,
  onMessagePress,
  onPressReviews,
  subscribeLoading = false,
  showSubscribe = true,
  onPressFollowers,
  onPressFollowing,
  onOrderNowPress,
  onBookNowPress,
  onEditProfile,
  onCoverPress,
  coverUploading = false,
  ctaText,
  ctaDisabled = false,
  showPromotionsButton = false,
  onPromotionsPress,
  subscribeInExplorerBar = false,
  showBiometricLock = true,
}) => {
  const displayName =
    profile?.channelName || profile?.nickname || profile?.name || 'User';

  const city = String(profile?.city || profile?.town || '').trim();
  const country = String(profile?.country || '').trim();
  const addressLine = String(profile?.address || '').trim();
  const profilePostcode = String(profile?.postcode || '').trim();
  const displayLocation =
    formatCityCountryPostcodeLine({
      address: addressLine,
      postcode: profilePostcode,
    }) ||
    formatShortProfileLocationLine(addressLine) ||
    (city && country ? `${city}, ${country}` : city || country || '—');

  const avatarUri = safeImageUri(
    profile?.channelAvatar || profile?.photos?.[0]?.src || profile?.photos?.[0],
    '',
  );

  const coverUri = safeImageUri(profile?.coverUrl || profile?.coverImage, '');

  const heroSource = useMemo(() => {
    if (coverUri) return { uri: coverUri };
    return profileCardBg;
  }, [coverUri]);

  const followers = formatCount(
    profile?.subscriberCount ?? profile?.followersCount ?? 0,
  );
  const following = formatCount(profile?.followingCount ?? 0);
  const msgCount = formatCount(profile?.messageCount ?? 0);
  const statusText =
    (profile?.channelAbout && String(profile.channelAbout).trim()) ||
    'A cozy restaurant serving fresh, delicious food made with care.';
  const isSubscribed = !!profile?.isSubscribed;
  const averageRatingRaw =
    profile?.averageRating ??
    profile?.ratingAverage ??
    profile?.ratingAvg ??
    profile?.rating;
  const averageRating = Number.isFinite(Number(averageRatingRaw))
    ? Number(averageRatingRaw)
    : 0;
  const profileRatingText = averageRating.toFixed(1);

  const buttonLabel = ctaText || (isSubscribed ? 'Subscribed' : 'Subscribe');
  const buttonDisabled = ctaText
    ? ctaDisabled
    : !onSubscribe || subscribeLoading;

  const profileRole = String(profile?.role || '').toLowerCase();
  const isFoodExplorerUser = profileRole === 'user';
  const isBusinessProfile = profileRole === 'owner' || profileRole === 'vendor';
  const showRating = !isFoodExplorerUser;
  const showBioSubscribe = showSubscribe && !subscribeInExplorerBar;
  const showBioActions =
    (showPromotionsButton || showBioSubscribe) && !showSelfEditHero;
  const showOrderBook =
    isBusinessProfile &&
    !onEditProfile &&
    !!(onOrderNowPress || onBookNowPress);
  const showSelfEditHero = !!onEditProfile;
  const showExplorerBar = !showSelfEditHero;

  const AvatarWrapper = onAvatarPress && canEdit ? TouchableOpacity : View;
  const avatarWrapperProps =
    onAvatarPress && canEdit
      ? {
          onPress: onAvatarPress,
          activeOpacity: 0.9,
          disabled: avatarUploading,
        }
      : {};

  return (
    <View style={styles.heroShell}>
      <View style={styles.root}>
        {/* Full-height blurred cover — stretches with profile + sheet */}
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

        {/* Profile on image */}
        <View style={styles.profileTop}>
          {showOrderBook ? (
            <View style={styles.profileHeroRow}>
              <View style={styles.profileHeroBalance} />
              <AvatarWrapper style={styles.avatarWrap} {...avatarWrapperProps}>
                <View style={styles.profileAvatar}>
                  {loading || avatarUploading ? (
                    <ActivityIndicator size="small" color="#F5A623" />
                  ) : avatarUri ? (
                    <Image
                      source={{ uri: avatarUri }}
                      style={styles.avatarImage}
                    />
                  ) : (
                    <Icon name="account" size={44} color="#F5A623" />
                  )}
                </View>
                {canEdit ? (
                  <View style={styles.avatarEditBadge}>
                    <Icon name="pencil-outline" size={11} color="#666" />
                  </View>
                ) : null}
              </AvatarWrapper>
              <View style={styles.profileHeroActions}>
                <View style={styles.orderBookBesideAvatar}>
                  <TouchableOpacity
                    style={styles.orderNowTopBadge}
                    onPress={onOrderNowPress}
                    disabled={!onOrderNowPress}
                    activeOpacity={onOrderNowPress ? 0.85 : 1}
                  >
                    <View style={styles.topBadgeIconPart}>
                      <Icon name="shopping-outline" size={15} color="#222" />
                    </View>
                    <View style={styles.topBadgeOrdersLabel}>
                      <Text style={styles.topBadgeText}>Order Now</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.bookNowTopBadge}
                    onPress={onBookNowPress}
                    disabled={!onBookNowPress}
                    activeOpacity={onBookNowPress ? 0.85 : 1}
                  >
                    <View style={styles.topBadgeIconPart}>
                      <Icon
                        name="calendar-blank-outline"
                        size={15}
                        color="#222"
                      />
                    </View>
                    <View style={styles.topBadgeBookLabel}>
                      <Text style={styles.topBadgeText}>Book Now</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ) : (
            <AvatarWrapper style={styles.avatarWrap} {...avatarWrapperProps}>
              <View style={styles.profileAvatar}>
                {loading || avatarUploading ? (
                  <ActivityIndicator size="small" color="#F5A623" />
                ) : avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Icon name="account" size={44} color="#F5A623" />
                )}
              </View>
              {canEdit ? (
                <View style={styles.avatarEditBadge}>
                  <Icon name="pencil-outline" size={11} color="#666" />
                </View>
              ) : null}
            </AvatarWrapper>
          )}

          <Text style={styles.profileName}>
            {loading ? 'Loading...' : displayName}
          </Text>
          <Text style={styles.profileLocation}>{displayLocation}</Text>

          {showSelfEditHero ? (
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
                onPress={onMessagePress}
                disabled={!onMessagePress}
                activeOpacity={onMessagePress ? 0.85 : 1}
              >
                <Icon name="email-outline" size={22} color="#111" />
              </TouchableOpacity>
            </View>
          ) : null}

          {showExplorerBar ? (
            <View
              style={[
                styles.explorerRatingBarOuter,
                !showRating && !subscribeInExplorerBar && styles.explorerRatingBarSolo,
              ]}
            >
              <View style={styles.explorerSegment}>
                <Text style={styles.foodExplorerText}>Food Explorer</Text>
              </View>
              {subscribeInExplorerBar && showSubscribe ? (
                isSubscribed || ctaText === 'Subscribed' ? (
                  <TouchableOpacity
                    onPress={onSubscribe}
                    disabled={buttonDisabled}
                    activeOpacity={0.85}
                    style={styles.subscribeHeroSegment}
                  >
                    <LinearGradient
                      colors={SUBSCRIBED_BTN_GRADIENT.colors}
                      start={SUBSCRIBED_BTN_GRADIENT.start}
                      end={SUBSCRIBED_BTN_GRADIENT.end}
                      style={[
                        styles.subscribeHeroSegmentInner,
                        (subscribeLoading || buttonDisabled) &&
                          styles.subscribeBtnDisabled,
                      ]}
                    >
                      {subscribeLoading ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.subscribeHeroText}>
                          {buttonLabel}
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.subscribeHeroSegment,
                      styles.subscribeHeroSegmentActive,
                      (subscribeLoading || buttonDisabled) &&
                        styles.subscribeBtnDisabled,
                    ]}
                    onPress={onSubscribe}
                    disabled={buttonDisabled}
                    activeOpacity={0.85}
                  >
                    {subscribeLoading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.subscribeHeroText}>{buttonLabel}</Text>
                    )}
                  </TouchableOpacity>
                )
              ) : null}
              {showRating ? (
                <TouchableOpacity
                  style={styles.ratingSegment}
                  onPress={onPressReviews}
                  disabled={!onPressReviews}
                  activeOpacity={onPressReviews ? 0.85 : 1}
                >
                  <Icon name="star" size={13} color="#F5A623" />
                  <Text style={styles.ratingPillValue}>
                    {profileRatingText}
                  </Text>
                  {renderStarRow(averageRating)}
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}
        </View>

        {/* Figma: stats = white; bio + CTA = frosted gradient frame */}
        <View style={styles.profileSheetWrap}>
          <View style={styles.statsSection}>
            <TouchableOpacity
              style={styles.profileStatItem}
              onPress={onPressFollowers}
              disabled={!onPressFollowers}
              activeOpacity={0.8}
            >
              <Text style={styles.profileStatValue}>{followers}</Text>
              <Text style={styles.profileStatLabel}>Followers</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileStatItem}
              onPress={onPressFollowing}
              disabled={!onPressFollowing}
              activeOpacity={0.8}
            >
              <Text style={styles.profileStatValue}>{following}</Text>
              <Text style={styles.profileStatLabel}>Following</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.profileStatItem}
              onPress={onMessagePress}
              disabled={!onMessagePress}
              activeOpacity={0.75}
            >
              <Text style={styles.profileStatValue}>{msgCount}</Text>
              <Text style={styles.profileStatLabel}>MSG</Text>
            </TouchableOpacity>
          </View>

          {showSelfEditHero && showBiometricLock ? (
            <BiometricLockToggle variant="embedded" />
          ) : null}

          <LinearGradient
            colors={BIO_SECTION_GRADIENT.colors}
            locations={BIO_SECTION_GRADIENT.locations}
            start={BIO_SECTION_GRADIENT.start}
            end={BIO_SECTION_GRADIENT.end}
            style={styles.bioSectionWrap}
          >
            <View style={styles.bioSection}>
              <Text style={styles.profileCtaText}>{statusText}</Text>
              {(showBioActions) ? (
                <View style={styles.bioActionRow}>
                  {showPromotionsButton ? (
                    <TouchableOpacity
                      style={[
                        styles.bioActionBtn,
                        styles.bioActionBtnInner,
                        styles.subscribeBtnActive,
                        !showBioSubscribe && styles.bioActionBtnSolo,
                      ]}
                      onPress={onPromotionsPress}
                      disabled={!onPromotionsPress}
                      activeOpacity={onPromotionsPress ? 0.85 : 1}
                    >
                      <Text style={styles.subscribeBtnText}>Promotions</Text>
                    </TouchableOpacity>
                  ) : null}
                  {showBioSubscribe ? (
                    isSubscribed || ctaText === 'Subscribed' ? (
                      <TouchableOpacity
                        onPress={onSubscribe}
                        disabled={buttonDisabled}
                        activeOpacity={0.85}
                        style={[
                          styles.bioActionBtn,
                          !showPromotionsButton && styles.bioActionBtnSolo,
                        ]}
                      >
                        <LinearGradient
                          colors={SUBSCRIBED_BTN_GRADIENT.colors}
                          start={SUBSCRIBED_BTN_GRADIENT.start}
                          end={SUBSCRIBED_BTN_GRADIENT.end}
                          style={[
                            styles.bioActionBtnInner,
                            (subscribeLoading || buttonDisabled) &&
                              styles.subscribeBtnDisabled,
                          ]}
                        >
                          {subscribeLoading ? (
                            <ActivityIndicator size="small" color="#FFF" />
                          ) : (
                            <Text style={styles.subscribeBtnText}>
                              {buttonLabel}
                            </Text>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.bioActionBtn,
                          styles.bioActionBtnInner,
                          styles.subscribeBtnActive,
                          (subscribeLoading || buttonDisabled) &&
                            styles.subscribeBtnDisabled,
                          !showPromotionsButton && styles.bioActionBtnSolo,
                        ]}
                        onPress={onSubscribe}
                        disabled={buttonDisabled}
                        activeOpacity={0.85}
                      >
                        {subscribeLoading ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={styles.subscribeBtnText}>
                            {buttonLabel}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )
                  ) : null}
                </View>
              ) : null}
            </View>
          </LinearGradient>
        </View>
      </View>
    </View>
  );
};

export default UserProfileCard;

const styles = StyleSheet.create({
  heroShell: {
    width: '100%',
    backgroundColor: HEADER_ORANGE,
  },
  root: {
    width: '100%',
    position: 'relative',
    paddingBottom: 0,
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
    paddingHorizontal: 20,
    zIndex: 1,
    position: 'relative',
  },
  profileHeroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 12,
  },
  profileHeroBalance: {
    flex: 1,
  },
  profileHeroActions: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'center',
    minHeight: 84,
  },
  orderBookBesideAvatar: {
    alignItems: 'flex-end',
    gap: 12,
  },
  orderNowTopBadge: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 34,
    minWidth: 118,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  bookNowTopBadge: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    overflow: 'hidden',
    minHeight: 34,
    minWidth: 118,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 3,
  },
  topBadgeIconPart: {
    paddingHorizontal: 6,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  topBadgeOrdersLabel: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 72,
  },
  topBadgeBookLabel: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 72,
  },
  topBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  avatarWrap: {
    position: 'relative',
    marginBottom: 12,
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
    letterSpacing: 0.2,
  },
  profileLocation: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 14,
    textAlign: 'center',
  },
  heroActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 340,
    gap: 8,
    marginBottom: 12,
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
  explorerRatingBarOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 4,
    gap: 8,
    marginBottom: 8,
  },
  explorerRatingBarSolo: {
    alignSelf: 'center',
  },
  explorerSegment: {
    backgroundColor: '#F5A623',
    borderRadius: 8,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 20,
    paddingRight: 20,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    flexShrink: 0,
  },
  foodExplorerText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  ratingSegment: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 20,
    paddingRight: 20,
    minHeight: 32,
    gap: 4,
    flexShrink: 0,
  },
  ratingPillValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 16,
  },
  subscribeHeroSegment: {
    borderRadius: 8,
    overflow: 'hidden',
    flexShrink: 0,
  },
  subscribeHeroSegmentInner: {
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 16,
    paddingRight: 16,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscribeHeroSegmentActive: {
    backgroundColor: '#F5A623',
    paddingTop: 8,
    paddingBottom: 8,
    paddingLeft: 16,
    paddingRight: 16,
    minHeight: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  subscribeHeroText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 16,
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starIcon: {
    marginHorizontal: 0.5,
  },
  profileSheetWrap: {
    marginTop: -SHEET_OVERLAP,
    marginHorizontal: CARD_INSET,
    marginBottom: 0,
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
  bioSectionWrap: {
    width: '100%',
    backgroundColor: '#F6EBDA',
    overflow: 'hidden',
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
  bioSection: {
    paddingHorizontal: SHEET_GAP,
    paddingTop: SHEET_GAP,
    paddingBottom: SHEET_GAP,
    alignItems: 'center',
  },
  profileCtaText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#404040',
    textAlign: 'center',
    marginBottom: SHEET_GAP,
    paddingHorizontal: 4,
  },
  bioActionRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  bioActionBtn: {
    flex: 1,
    minHeight: 42,
    borderRadius: 8,
    overflow: 'hidden',
  },
  bioActionBtnSolo: {
    maxWidth: 220,
    flex: 0,
    flexGrow: 1,
  },
  bioActionBtnInner: {
    flex: 1,
    minHeight: 42,
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subscribeBtnTouchable: {
    alignSelf: 'center',
  },
  subscribeBtnWide: {
    alignSelf: 'center',
    minWidth: 140,
    paddingVertical: 11,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 42,
  },
  subscribeBtnActive: {
    backgroundColor: '#F5A623',
  },
  subscribeBtnDisabled: {
    opacity: 1,
  },
  subscribeBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
