import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Share,
  Linking,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { safeImageUri } from '../utils/helper';
import { getPromotionsByUser } from '../services/promotionService';
import { getMenuByUserId } from '../services/menuService';

const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd';

/**
 * Full promo detail: image, business name, address, Order Now, promo code, terms.
 * Order Now → HomeThreeScreen (restaurant menu / order screen).
 * More Offers: other promotions from same business.
 */
const PromotionFullDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const user = useSelector(state => state.app?.user);
  const promotion = route.params?.promotion;

  const [moreOffers, setMoreOffers] = useState([]);
  const [moreOffersLoading, setMoreOffersLoading] = useState(false);
  const [ordering, setOrdering] = useState(false);

  const ownerId = promotion?.userId || promotion?.user?.id;

  const loadMoreOffers = useCallback(async () => {
    if (!ownerId) {
      setMoreOffers([]);
      return;
    }
    setMoreOffersLoading(true);
    try {
      const res = await getPromotionsByUser(ownerId, 1, 20);
      const list = res?.promotions ?? [];
      const currentId = promotion?.id;
      const others = currentId
        ? list.filter(p => p.id !== currentId)
        : list;
      setMoreOffers(others);
    } catch (e) {
      setMoreOffers([]);
    } finally {
      setMoreOffersLoading(false);
    }
  }, [ownerId, promotion?.id]);

  useEffect(() => {
    if (promotion && ownerId) loadMoreOffers();
  }, [promotion, ownerId, loadMoreOffers]);

  if (!promotion) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Promotion not found.</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-left" size={16} color="#000" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const businessName =
    promotion?.user?.nickname || promotion?.user?.name || 'Restaurant';
  const address = promotion?.user?.address || '';
  const promoCode = promotion?.promoCode || '';
  const offerText =
    promotion?.promoAmount != null
      ? `Get Flat ${promotion.promoAmount}% OFF`
      : 'Special Offer';
  const description = promotion?.description || '';
  const imageUri =
    promotion?.thumbnailUrl ||
    promotion?.thumbnail?.src ||
    promotion?.videoUrl ||
    DEFAULT_IMAGE;

  let daysLeft = null;
  if (promotion?.expireDate) {
    const exp = new Date(promotion.expireDate);
    const now = new Date();
    const diff = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
    if (diff > 0) daysLeft = diff;
  }

  const handleCopyPromo = () => {
    if (!promoCode) return;
    Share.share({ message: promoCode, title: 'Promo Code' })
      .then(() => {})
      .catch(() => {
        Alert.alert('Promo Code', promoCode);
      });
  };

  const handleOrderNow = useCallback(async () => {
    if (ordering) return;
    if (!user?.token) {
      navigation.navigate('Home1', {
        screen: 'HomeSevenScreen',
        params: { returnToOrder: true, ownerUserId: ownerId },
      });
      return;
    }
    setOrdering(true);
    try {
      let promotionMenuItems;
      const promoItemIds = Array.isArray(promotion?.menuItemIds)
        ? promotion.menuItemIds
        : [];
      if (ownerId && promoItemIds.length > 0) {
        const res = await getMenuByUserId(ownerId);
        const menu = res?.menu ?? [];
        const idSet = new Set(promoItemIds);
        promotionMenuItems = menu.filter(m => idSet.has(m.id));
      }
      navigation.navigate('Home1', {
        screen: 'HomeThreeScreen',
        params: {
          ownerId: ownerId || undefined,
          ownerName: businessName,
          title: businessName,
          location: address,
          ...(Array.isArray(promotionMenuItems) &&
            promotionMenuItems.length > 0 && { promotionMenuItems }),
        },
      });
    } catch (e) {
      navigation.navigate('Home1', {
        screen: 'HomeThreeScreen',
        params: {
          ownerId: ownerId || undefined,
          ownerName: businessName,
          title: businessName,
          location: address,
        },
      });
    } finally {
      setOrdering(false);
    }
  }, [ordering, user?.token, navigation, ownerId, businessName, address, promotion?.menuItemIds]);

  const phone = promotion?.user?.phone;
  const website = promotion?.user?.socialLinks?.find(
    s => s?.type === 'website' && s?.url,
  )?.url;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      <View style={styles.navBar}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={18} color="#FFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Icon name="dots-vertical" size={24} color="#666" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoLeft}>
              <Text style={styles.restaurantName}>{businessName}</Text>
              {address ? (
                <Text style={styles.restaurantSub} numberOfLines={2}>
                  {address}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity
              style={styles.orderNowBtn}
              onPress={handleOrderNow}
              activeOpacity={0.8}
              disabled={ordering}
            >
              <Text style={styles.orderNowText}>
                {ordering ? 'Loading...' : 'Order Now'}
              </Text>
            </TouchableOpacity>
          </View>

          <Image
            source={{ uri: safeImageUri(imageUri) }}
            style={styles.heroImage}
            resizeMode="cover"
          />

          <Text style={styles.promoHeader}>Promo Code</Text>
          <View style={styles.promoInputContainer}>
            <View style={styles.promoCodeBox}>
              <Text style={styles.promoCodeValue}>{promoCode || '—'}</Text>
            </View>
            <TouchableOpacity
              style={styles.copyBtn}
              onPress={handleCopyPromo}
              disabled={!promoCode}
            >
              <Text style={styles.copyBtnText}>Copy Promo Code</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.termsTitle}>Terms and Conditions</Text>
          {daysLeft != null && (
            <View style={styles.termRow}>
              <Icon name="record" size={8} color="#666" style={styles.dot} />
              <Text style={styles.termText}>
                Only {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
              </Text>
            </View>
          )}
          {description ? (
            <View style={styles.termRow}>
              <Icon name="record" size={8} color="#666" style={styles.dot} />
              <Text style={styles.termText}>{description}</Text>
            </View>
          ) : null}
          <View style={styles.termRow}>
            <Icon name="record" size={8} color="#666" style={styles.dot} />
            <Text style={styles.termText}>
              Valid at participating locations only.
            </Text>
          </View>

          {website ? (
            <View style={styles.termRow}>
              <Icon name="record" size={8} color="#666" style={styles.dot} />
              <Text
                style={[styles.termText, styles.link]}
                onPress={() => Linking.openURL(website)}
              >
                {website}
              </Text>
            </View>
          ) : null}
          {phone ? (
            <View style={styles.termRow}>
              <Icon name="record" size={8} color="#666" style={styles.dot} />
              <Text
                style={[styles.termText, styles.link]}
                onPress={() => Linking.openURL(`tel:${phone}`)}
              >
                {phone}
              </Text>
            </View>
          ) : null}
        </View>

        <Text style={styles.moreOffersTitle}>More Offers</Text>
        {moreOffersLoading ? (
          <View style={styles.moreOffersLoading}>
            <ActivityIndicator size="small" color="#F5A623" />
          </View>
        ) : moreOffers.length > 0 ? (
          <View style={styles.moreOffersGrid}>
            {moreOffers.map((p, idx) => {
              const thumb =
                p.thumbnailUrl || p.thumbnail?.src || p.videoUrl || DEFAULT_IMAGE;
              const title = p.title || p.user?.nickname || p.user?.name || 'Offer';
              const offer =
                p.promoAmount != null
                  ? `${p.promoAmount}% OFF`
                  : 'Offer';
              const code = p.promoCode ? p.promoCode : '';
              return (
                <TouchableOpacity
                  key={p.id || idx}
                  style={styles.moreOfferCard}
                  onPress={() =>
                    navigation.push('PromotionFullDetail', { promotion: p })
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.moreOfferHeader}>
                    <Text style={styles.moreOfferHeaderText} numberOfLines={1}>
                      {title}
                    </Text>
                  </View>
                  <View style={styles.moreOfferImageWrap}>
                    <Image
                      source={{ uri: safeImageUri(thumb) }}
                      style={styles.moreOfferImage}
                      resizeMode="cover"
                    />
                  </View>
                  <View style={styles.moreOfferFooter}>
                    <Text style={styles.moreOfferFooterText} numberOfLines={1}>
                      {offer}
                      {code ? ` • ${code}` : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : (
          <Text style={styles.moreOffersEmpty}>No other offers right now.</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: { fontSize: 16, color: '#666', marginBottom: 12 },
  backButton: {
    flexDirection: 'row',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  backButtonText: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },

  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backText: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
  scrollContent: { paddingHorizontal: 15, paddingBottom: 30 },

  infoCard: {
    backgroundColor: '#F2F2F2',
    borderRadius: 20,
    padding: 15,
    marginTop: 10,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  infoLeft: { flex: 1, marginRight: 12 },
  restaurantName: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  restaurantSub: { fontSize: 12, color: '#666', marginTop: 2 },
  orderNowBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 12,
  },
  orderNowText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  heroImage: { width: '100%', height: 200, borderRadius: 20, marginBottom: 15 },
  promoHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  promoInputContainer: {
    flexDirection: 'row',
    height: 55,
    backgroundColor: '#EEE',
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 15,
  },
  promoCodeBox: { flex: 1, justifyContent: 'center', paddingLeft: 15 },
  promoCodeValue: { color: '#333', fontSize: 16, fontWeight: '600' },
  copyBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  copyBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },
  termsTitle: { fontSize: 13, color: '#666', marginBottom: 5 },
  termRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  dot: { marginRight: 8 },
  termText: { fontSize: 11, color: '#666', flex: 1 },
  link: { color: '#F5A623', textDecorationLine: 'underline' },

  moreOffersTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 24,
    marginBottom: 12,
  },
  moreOffersLoading: { paddingVertical: 20, alignItems: 'center' },
  moreOffersEmpty: { fontSize: 14, color: '#888', marginTop: 8 },
  moreOffersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  moreOfferCard: {
    width: '48%',
    marginBottom: 16,
    backgroundColor: '#F2F2F2',
    borderRadius: 12,
    overflow: 'hidden',
  },
  moreOfferHeader: {
    backgroundColor: '#F5A623',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  moreOfferHeaderText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  moreOfferImageWrap: {
    borderWidth: 1,
    borderColor: '#F5A623',
    marginHorizontal: 6,
    marginTop: -4,
    borderRadius: 8,
    overflow: 'hidden',
  },
  moreOfferImage: { width: '100%', height: 90 },
  moreOfferFooter: { padding: 8 },
  moreOfferFooterText: { fontSize: 12, color: '#333', fontWeight: '600' },
});

export default PromotionFullDetailScreen;
