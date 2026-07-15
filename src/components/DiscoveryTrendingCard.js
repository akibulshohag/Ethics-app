import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const DEFAULT_IMG =
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600';

/** Matches home trending CTAs: Order / Book / Subscribe for owner|vendor only. */
export default function DiscoveryTrendingCard({
  name,
  subtitle,
  imageUri,
  viewsLabel,
  rating,
  onPress,
  onOrderPress,
  onBookPress,
  onSubscribePress,
  subscribeBusy,
  isSubscribed,
  hideSubscribe,
  showOrderBook = false,
  featured,
  showPlayIcon = true,
}) {
  const safeRating = Number.isFinite(Number(rating))
    ? Number(rating).toFixed(1)
    : '0.0';

  return (
    <View style={styles.card}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.92}
        style={styles.mediaWrap}
      >
        <Image
          source={{ uri: imageUri || DEFAULT_IMG }}
          style={styles.image}
          resizeMode="cover"
        />
        {featured ? (
          <View style={styles.featuredBadge}>
            <Text style={styles.featuredText}>Featured</Text>
          </View>
        ) : null}
        {showPlayIcon ? (
          <View style={styles.playWrap} pointerEvents="none">
            <Icon
              name="play-circle-outline"
              size={52}
              color="rgba(255,255,255,0.9)"
            />
          </View>
        ) : null}
      </TouchableOpacity>
      <View style={styles.body}>
        <View style={styles.row1}>
          <View style={styles.titleBlock}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            <View style={styles.ratingRow}>
              <Icon name="star" size={14} color="#F5A623" />
              <Text style={styles.ratingText}>{safeRating}</Text>
            </View>
            {subtitle ? (
              <Text style={styles.subtitle} numberOfLines={1}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          {showOrderBook ? (
            <View style={styles.btnGroup}>
              <TouchableOpacity
                style={styles.orderBtn}
                activeOpacity={0.88}
                onPress={onOrderPress}
                disabled={!onOrderPress}
              >
                <Text style={styles.orderText}>Order Now</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.bookBtn}
                activeOpacity={0.88}
                onPress={onBookPress}
                disabled={!onBookPress}
              >
                <Text style={styles.bookText}>Book Now</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
        <View style={styles.row2}>
          {viewsLabel ? (
            <View style={styles.metaRow}>
              <Icon name="eye-outline" size={14} color="#9CA3AF" />
              <Text style={styles.metaText}>{viewsLabel}</Text>
            </View>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {showOrderBook && !hideSubscribe ? (
            <TouchableOpacity
              style={[
                styles.subscribeBtn,
                isSubscribed && styles.subscribeBtnActive,
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
                    styles.subscribeText,
                    isSubscribed && styles.subscribeTextActive,
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
  card: {
    marginBottom: 16,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  mediaWrap: { position: 'relative' },
  image: { width: '100%', height: 180, backgroundColor: '#E5E7EB' },
  featuredBadge: {
    position: 'absolute',
    top: 12,
    left: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  playWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { padding: 12 },
  row1: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleBlock: { flex: 1, minWidth: 0 },
  name: { fontSize: 17, fontWeight: '700', color: '#111' },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  ratingText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  btnGroup: { flexDirection: 'row', alignItems: 'center', flexShrink: 0 },
  orderBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  orderText: { color: '#FFF', fontWeight: '700', fontSize: 12 },
  bookBtn: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#F5A623',
    paddingHorizontal: 10,
    paddingVertical: 8.5,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  bookText: { color: '#F5A623', fontWeight: '700', fontSize: 12 },
  row2: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  metaText: { fontSize: 13, color: '#9CA3AF' },
  subscribeBtn: {
    backgroundColor: '#F8F1E3',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E5D9C0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    minWidth: 88,
    alignItems: 'center',
  },
  subscribeBtnActive: { backgroundColor: '#EEE' },
  subscribeText: { color: '#4B5563', fontSize: 12, fontWeight: '600' },
  subscribeTextActive: { color: '#6B7280' },
});
