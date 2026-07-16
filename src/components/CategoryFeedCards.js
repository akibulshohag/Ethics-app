import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');
const PAD = 16;
const FEATURED_HERO_HEIGHT = Math.round((width - PAD * 2) * 0.5);
const TRENDING_IMAGE_HEIGHT = Math.round((width - PAD * 2) * 0.42);

const DEFAULT_IMG =
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600';

export function CategoryFeaturedHeroCard({
  channelName,
  metaLine,
  img,
  showPlayIcon = true,
  onPress,
  onOrderPress,
  showOrderBook = false,
}) {
  return (
    <TouchableOpacity
      style={styles.featuredCard}
      onPress={onPress}
      activeOpacity={0.92}
    >
      <Image
        source={{ uri: img || DEFAULT_IMG }}
        style={styles.featuredImage}
      />
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.15)', 'rgba(0,0,0,0.72)']}
        style={styles.featuredGrad}
      />
      <View style={styles.featuredBadge}>
        <Text style={styles.featuredBadgeText}>Featured</Text>
      </View>
      {showPlayIcon ? (
        <View style={styles.featuredPlayWrap} pointerEvents="none">
          <Icon
            name="play-circle-outline"
            size={54}
            color="rgba(255,255,255,0.88)"
          />
        </View>
      ) : null}
      <View style={styles.featuredFooter}>
        <View style={styles.featuredFooterText}>
          <Text style={styles.featuredName} numberOfLines={1}>
            {channelName}
          </Text>
          {metaLine ? (
            <Text style={styles.featuredMeta} numberOfLines={1}>
              {metaLine}
            </Text>
          ) : null}
        </View>
        {showOrderBook ? (
          <TouchableOpacity
            style={styles.featuredOrderBtn}
            activeOpacity={0.88}
            onPress={e => {
              e?.stopPropagation?.();
              onOrderPress?.();
            }}
          >
            <Text style={styles.featuredOrderText}>Order Now</Text>
            <Icon name="arrow-right" size={16} color="#FFF" />
          </TouchableOpacity>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

/** Same CTA pattern as home trending: Order Now + Book Now + Subscribe. */
export function CategoryTrendingCard({
  channelName,
  img,
  views,
  locationLabel,
  rating,
  showPlayIcon = true,
  onPress,
  onOrderPress,
  onBookPress,
  onSubscribePress,
  subscribeBusy,
  isSubscribed,
  hideSubscribe,
  showOrderBook = false,
}) {
  const safeRating = Number.isFinite(Number(rating))
    ? Number(rating).toFixed(1)
    : '0.0';

  return (
    <View style={styles.trendingCard}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.92}
        style={styles.trendingMediaWrap}
      >
        <Image source={{ uri: img || DEFAULT_IMG }} style={styles.trendingImage} />
        {showPlayIcon ? (
          <View style={styles.trendingPlayWrap} pointerEvents="none">
            <Icon
              name="play-circle-outline"
              size={52}
              color="rgba(255,255,255,0.9)"
            />
          </View>
        ) : null}
      </TouchableOpacity>
      <View style={styles.trendingBody}>
        <View style={styles.trendingRow1}>
          <View style={styles.trendingTitleBlock}>
            <Text style={styles.trendingName} numberOfLines={1}>
              {channelName}
            </Text>
            <View style={styles.trendingRatingRow}>
              <Icon name="star" size={14} color="#F5A623" />
              <Text style={styles.trendingRatingText}>{safeRating}</Text>
            </View>
          </View>
          {showOrderBook ? (
            <View style={styles.trendingBtnGroup}>
              <TouchableOpacity
                style={styles.trendingOrderBtn}
                activeOpacity={0.88}
                onPress={onOrderPress}
                disabled={!onOrderPress}
              >
                <Text style={styles.trendingOrderText}>Order Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.trendingBookBtn}
                activeOpacity={0.88}
                onPress={onBookPress}
                disabled={!onBookPress}
              >
                <Text style={styles.trendingBookText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
        <View style={styles.trendingRow2}>
          <View style={styles.trendingMetaRow}>
            {locationLabel ? (
              <>
                <Icon name="map-marker" size={14} color="#F5A623" />
                <Text style={styles.trendingMetaText} numberOfLines={1}>
                  {locationLabel}
                </Text>
              </>
            ) : null}
            {views ? (
              <>
                <Icon
                  name="eye-outline"
                  size={14}
                  color="#9CA3AF"
                  style={locationLabel ? styles.metaEye : null}
                />
                <Text style={styles.trendingMetaText}>{views}</Text>
              </>
            ) : null}
          </View>
          {showOrderBook && !hideSubscribe ? (
            <TouchableOpacity
              style={[
                styles.trendingSubscribeBtn,
                isSubscribed && styles.trendingSubscribeBtnActive,
              ]}
              activeOpacity={0.88}
              onPress={onSubscribePress}
              disabled={!onSubscribePress || !!subscribeBusy}
            >
              {subscribeBusy ? (
                <ActivityIndicator size="small" color="#555" />
              ) : (
                <Text
                  style={[
                    styles.trendingSubscribeText,
                    isSubscribed && styles.trendingSubscribeTextActive,
                  ]}
                >
                  {isSubscribed ? 'Subscribed' : 'Subscribe'}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  featuredCard: {
    width: '100%',
    height: FEATURED_HERO_HEIGHT,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#222',
    marginBottom: 8,
  },
  featuredImage: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  featuredGrad: { ...StyleSheet.absoluteFillObject },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(33,33,33,0.82)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  featuredBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  featuredPlayWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredFooter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    paddingTop: 28,
  },
  featuredFooterText: { flex: 1, minWidth: 0, paddingRight: 8 },
  featuredName: { color: '#FFF', fontSize: 18, fontWeight: '800' },
  featuredMeta: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    marginTop: 3,
    fontWeight: '500',
  },
  featuredOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5A623',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 6,
    gap: 4,
  },
  featuredOrderText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  trendingCard: {
    backgroundColor: '#FEF6E7',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#F0E4CC',
  },
  trendingMediaWrap: {
    width: '100%',
    height: TRENDING_IMAGE_HEIGHT,
    backgroundColor: '#E5E7EB',
  },
  trendingImage: { width: '100%', height: '100%' },
  trendingPlayWrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendingBody: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    backgroundColor: '#FEF6E7',
  },
  trendingRow1: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  trendingTitleBlock: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    paddingRight: 8,
  },
  trendingName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginRight: 8,
    flexShrink: 1,
  },
  trendingRatingRow: { flexDirection: 'row', alignItems: 'center' },
  trendingRatingText: {
    marginLeft: 3,
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  trendingBtnGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  trendingOrderBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  trendingOrderText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  trendingBookBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#F5A623',
    paddingHorizontal: 10,
    paddingVertical: 6.5,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  trendingBookText: { color: '#F5A623', fontSize: 11, fontWeight: '700' },
  trendingRow2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  trendingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
    flexWrap: 'wrap',
  },
  trendingMetaText: {
    fontSize: 12,
    color: '#6B7280',
    marginLeft: 4,
    flexShrink: 1,
  },
  metaEye: { marginLeft: 10 },
  trendingSubscribeBtn: {
    backgroundColor: '#F8F1E3',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5D9C0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 88,
    alignItems: 'center',
  },
  trendingSubscribeBtnActive: {
    backgroundColor: '#EEE',
  },
  trendingSubscribeText: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '600',
  },
  trendingSubscribeTextActive: {
    color: '#6B7280',
  },
});
