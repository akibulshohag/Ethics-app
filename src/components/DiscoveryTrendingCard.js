import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const DEFAULT_IMG =
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=600';

export default function DiscoveryTrendingCard({
  name,
  subtitle,
  imageUri,
  viewsLabel,
  rating,
  onPress,
  onOrderPress,
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
            <Icon name="play-circle-outline" size={52} color="rgba(255,255,255,0.9)" />
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
          <TouchableOpacity
            style={styles.orderBtn}
            activeOpacity={0.88}
            onPress={onOrderPress}
          >
            <Text style={styles.orderText}>Order Now</Text>
            <Icon name="arrow-right" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>
        {viewsLabel ? (
          <View style={styles.metaRow}>
            <Icon name="eye-outline" size={14} color="#9CA3AF" />
            <Text style={styles.metaText}>{viewsLabel}</Text>
          </View>
        ) : null}
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
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  ratingText: { fontSize: 13, color: '#6B7280', fontWeight: '600' },
  subtitle: { fontSize: 13, color: '#6B7280', marginTop: 2 },
  orderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F5A623',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
  },
  orderText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
  },
  metaText: { fontSize: 13, color: '#9CA3AF' },
});
