import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { safeImageUri } from '../utils/helper';

const PromoDetailsScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const user = useSelector(state => state.app?.user);
  const promotion = route.params?.promotion;
  const menuItem = route.params?.menuItem;
  const menuItems = route.params?.menuItems ?? [];

  const hasData = promotion && menuItem;
  const ownerId = promotion?.userId ?? promotion?.user?.id ?? null;
  const location = (hasData && promotion?.user?.address) || '';
  const orderTitle = (hasData && (menuItem?.itemName || promotion?.title)) || '';

  const restaurantName =
    (hasData && (promotion?.user?.nickname || promotion?.user?.name)) ||
    'Tandoori Planet';
  const restaurantSub =
    (hasData && promotion?.user?.address) || '42 min - Birmingham, UK';
  const heroImageUri = hasData
    ? safeImageUri(
        menuItem?.imageUrl || promotion?.thumbnailUrl || promotion?.videoUrl,
        'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0',
      )
    : 'https://images.unsplash.com/photo-1599487488170-d11ec9c172f0';
  const promoCode = (hasData && promotion?.promoCode) || 'MULEN300FF';
  const offerText =
    hasData && promotion?.promoAmount != null
      ? `Get Flat ${promotion.promoAmount}% OFF`
      : 'Get Flat 30% OFF';

  const moreOffers = hasData
    ? menuItems.filter(m => m.id !== menuItem?.id).slice(0, 4)
    : [];

  const handleCopyPromo = () => {
    Share.share({ message: promoCode, title: 'Promo Code' }).catch(() => {});
  };

  const handleOrderPress = () => {
    if (!user?.token) {
      navigation.navigate('Home1', {
        screen: 'HomeSevenScreen',
        params: { returnToOrder: true, ownerUserId: ownerId },
      });
    } else {
      if (ownerId) {
        navigation.navigate('Home1', {
          screen: 'HomeThreeScreen',
          params: {
            ownerId,
            ownerName: restaurantName,
            title: orderTitle,
            location,
            singleMenuItem: hasData ? menuItem : undefined,
          },
        });
      } else {
        navigation.navigate('Home1', { screen: 'HomeThreeScreen' });
      }
    }
  };

  const handleOfferPress = item => {
    if (promotion && item && item.id) {
      navigation.replace('PromotionTwo', {
        promotion,
        menuItem: item,
        menuItems,
      });
    }
  };

  const OfferCard = ({ item, isStatic, name: staticName }) => {
    const name = item ? item.itemName || 'Item' : staticName || 'Offer';
    const imageUri = item?.imageUrl
      ? safeImageUri(item.imageUrl)
      : 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd';
    const priceStr =
      item?.price != null ? `€${Number(item.price).toFixed(2)}` : 'UPTO €3';

    return (
      <TouchableOpacity
        style={styles.offerCard}
        onPress={() => item && handleOfferPress(item)}
        activeOpacity={item ? 0.8 : 1}
        disabled={!item}
      >
        <View style={styles.cardOrangeLabel}>
          <Text style={styles.cardLabelText} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <View style={styles.offerImageContainer}>
          <Image source={{ uri: imageUri }} style={styles.smallFoodImage} />
        </View>
        <View style={styles.offerFooter}>
          <Text style={styles.flatText}>
            Get Flat{' '}
            <Text style={styles.orangeText}>
              {promotion?.promoAmount != null
                ? `${promotion.promoAmount}% OFF`
                : '30% OFF'}
            </Text>
          </Text>
          <Text style={styles.uptoText}>{priceStr}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
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
            <View>
              <Text style={styles.restaurantName}>{restaurantName}</Text>
              <Text style={styles.restaurantSub}>{restaurantSub}</Text>
            </View>
            <TouchableOpacity
              style={styles.orderNowBtn}
              onPress={handleOrderPress}
            >
              <Text style={styles.orderNowText}>
                {!user?.token ? 'Login' : 'Order Now'}
              </Text>
            </TouchableOpacity>
          </View>

          <Image source={{ uri: heroImageUri }} style={styles.heroImage} />

          <Text style={styles.promoHeader}>Promo Code</Text>

          <View style={styles.promoInputContainer}>
            <View style={styles.promoCodeBox}>
              <Text style={styles.promoCodeValue}>{promoCode}</Text>
            </View>
            <TouchableOpacity style={styles.copyBtn} onPress={handleCopyPromo}>
              <Text style={styles.copyBtnText}>Copy Promo Code</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.termsTitle}>Terms and Conditions</Text>
          <View style={styles.termRow}>
            <Icon name="record" size={8} color="#666" style={styles.dot} />
            <Text style={styles.termText}>
              {hasData && promotion?.description
                ? promotion.description
                : 'This promo code used ones per order'}
            </Text>
          </View>
          <View style={styles.termRow}>
            <Icon name="record" size={8} color="#666" style={styles.dot} />
            <Text style={styles.termText}>
              Valid at participating locations only.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>More Offers</Text>
        <View style={styles.offersGrid}>
          <OfferCard
            item={moreOffers[0]}
            isStatic={!moreOffers[0]}
            name="Tandoori Planet"
          />
          <OfferCard
            item={moreOffers[1]}
            isStatic={!moreOffers[1]}
            name="Streetly balty"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    alignItems: 'center',
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
  promoCodeValue: { color: '#999', fontSize: 14 },
  copyBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  copyBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 13 },

  termsTitle: { fontSize: 13, color: '#666', marginBottom: 5 },
  termRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  dot: { marginRight: 8 },
  termText: { fontSize: 11, color: '#666' },

  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 15,
  },
  offersGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
  },
  offerCard: { width: '48%', marginBottom: 12 },
  cardOrangeLabel: {
    backgroundColor: '#F5A623',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    paddingVertical: 4,
    alignItems: 'center',
    zIndex: 2,
  },
  cardLabelText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  offerImageContainer: {
    borderWidth: 1.5,
    borderColor: '#F5A623',
    borderRadius: 12,
    marginTop: -5,
    overflow: 'hidden',
  },
  smallFoodImage: { width: '100%', height: 100, resizeMode: 'cover' },
  offerFooter: { marginTop: 5 },
  flatText: { fontSize: 13, fontWeight: 'bold' },
  orangeText: { color: '#F5A623' },
  uptoText: { fontSize: 10, color: '#666' },
});

export default PromoDetailsScreen;
