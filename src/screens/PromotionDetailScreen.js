import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { getMenuByUserId } from '../services/menuService';
import { safeImageUri } from '../utils/helper';

// Same card design as PromotionOneScreen – menu items in grid
const PromotionDetailScreen = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const promotion = route.params?.promotion;

  const [menuItems, setMenuItems] = useState([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const ownerId = promotion?.userId;
  const ownerName =
    promotion?.user?.nickname || promotion?.user?.name || 'Restaurant';
  const menuItemIds = Array.isArray(promotion?.menuItemIds)
    ? promotion.menuItemIds
    : [];
  const offerText =
    promotion?.promoAmount != null
      ? `Get Flat ${promotion.promoAmount}% OFF`
      : 'Special Offer';
  const codeText = promotion?.promoCode ? promotion.promoCode : '';

  const loadMenu = useCallback(async () => {
    if (!ownerId) {
      setMenuItems([]);
      setMenuLoading(false);
      return;
    }
    setMenuLoading(true);
    try {
      const res = await getMenuByUserId(ownerId);
      let menu = res?.menu ?? [];
      if (menuItemIds.length > 0) {
        const idSet = new Set(menuItemIds);
        menu = menu.filter(m => idSet.has(m.id));
      }
      setMenuItems(menu);
    } catch (e) {
      setMenuItems([]);
    } finally {
      setMenuLoading(false);
    }
  }, [ownerId, menuItemIds.join(',')]);

  useEffect(() => {
    loadMenu();
  }, [loadMenu]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMenu();
    setRefreshing(false);
  }, [loadMenu]);

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

  const MenuCard = ({ item }) => {
    const name = item?.itemName || 'Item';
    const imageUri =
      item?.imageUrl || '';
    const priceStr =
      item?.price != null ? `€${Number(item.price).toFixed(2)}` : '—';

    return (
      <TouchableOpacity
        style={styles.promoCard}
        onPress={() =>
          navigation.navigate('PromotionTwo', {
            promotion,
            menuItem: item,
            menuItems,
          })
        }
        activeOpacity={0.8}
      >
        <View style={styles.cardOrangeHeader}>
          <Text style={styles.cardHeaderText} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: safeImageUri(imageUri) }}
            style={styles.foodImage}
          />
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.getFlatText}>
            {offerText}
            {codeText ? (
              <Text style={styles.highlightText}> • {codeText}</Text>
            ) : null}
          </Text>
          <Text style={styles.uptoText}>{priceStr}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#2C3E50" />

      {/* Same header as PromotionOneScreen */}
      <View style={styles.headerBackground}>
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-left" size={16} color="#000" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Icon name="dots-vertical" size={24} color="#FFF" />
        </View>

        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>OFFERS &</Text>
          <View style={styles.orangePill}>
            <Text style={styles.pillText}>PROMOTIONS</Text>
          </View>
        </View>
      </View>

      <View style={styles.orangeDivider} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollArea}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#F5A623']}
            tintColor="#F5A623"
          />
        }
      >
        {menuLoading && menuItems.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#F5A623" />
            <Text style={styles.loadingText}>Loading menu...</Text>
          </View>
        ) : (
          <View style={styles.promoGrid}>
            {menuItems.length > 0 ? (
              menuItems.map(item => <MenuCard key={item.id} item={item} />)
            ) : (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No menu items for this promotion.</Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

// Reuse same styles as PromotionOneScreen for identical design
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyWrap: { width: '100%', paddingVertical: 30, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#666' },

  headerBackground: {
    backgroundColor: '#2C3E50',
    paddingBottom: 20,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    zIndex: 2,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 10,
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  backButtonText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
  titleContainer: { alignItems: 'center', marginTop: 5 },
  mainTitle: { color: '#FFF', fontSize: 42, fontWeight: 'bold' },
  orangePill: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 25,
    paddingVertical: 5,
    borderRadius: 15,
    marginTop: -5,
  },
  pillText: { color: '#FFF', fontSize: 42, fontWeight: 'bold' },
  orangeDivider: {
    backgroundColor: '#F5A623',
    height: 40,
    width: '100%',
    marginTop: -30,
    zIndex: 1,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },

  scrollArea: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 24 },
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { marginTop: 8, fontSize: 14, color: '#666' },
  promoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  promoCard: { width: '48%', marginBottom: 20 },
  cardOrangeHeader: {
    backgroundColor: '#F5A623',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingVertical: 4,
    alignItems: 'center',
    zIndex: 3,
  },
  cardHeaderText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  imageContainer: {
    borderWidth: 2,
    borderColor: '#F5A623',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: -8,
  },
  foodImage: { width: '100%', height: 110, resizeMode: 'cover' },
  cardFooter: { marginTop: 6, paddingLeft: 2 },
  getFlatText: { fontSize: 14, color: '#000', fontWeight: 'bold' },
  highlightText: { color: '#F5A623' },
  uptoText: { fontSize: 11, color: '#666' },
});

export default PromotionDetailScreen;
