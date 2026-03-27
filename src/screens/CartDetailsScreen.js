import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, SHADOWS } from '../constants/theme';
import { useNavigation, useRoute } from '@react-navigation/native';
import { safeImageUri } from '../utils/helper';
import { getMenuByUserId } from '../services/menuService';

const DEFAULT_IMAGE =
  'https://img.freepik.com/free-photo/delicious-burger-with-fire-flames_23-2151846510.jpg';

const CartDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { ownerId, items: paramItems = [] } = route.params || {};
  const [items, setItems] = useState(Array.isArray(paramItems) ? paramItems : []);
  const [suggestedItems, setSuggestedItems] = useState([]);
  const [suggestedLoading, setSuggestedLoading] = useState(false);

  const { total, currency } = useMemo(() => {
    const t = (items || []).reduce(
      (sum, i) => sum + (Number(i.price) || 0) * (i.quantity || 1),
      0,
    );
    return {
      total: t,
      currency: items?.[0]?.currency || 'GBP',
    };
  }, [items]);

  const onCheckout = () => {
    if (!items.length || !ownerId) return;
    const rootNav = navigation.getParent?.() ?? navigation;
    rootNav.navigate('Root', {
      screen: 'Home1',
      params: {
        screen: 'HomeFourScreen',
        params: {
          ownerId,
          items,
          ownerName: route.params?.ownerName || 'Restaurant',
        },
      },
    });
  };

  const changeQty = (key, delta) => {
    setItems(prev => {
      const next = (prev || []).map(i => ({ ...i }));
      const idx = next.findIndex(i => (i.menuItemId || i.id) === key);
      if (idx === -1) return prev;
      const cur = next[idx]?.quantity || 1;
      const newQty = Math.max(0, cur + delta);
      if (newQty === 0) {
        next.splice(idx, 1);
        return next;
      }
      next[idx].quantity = newQty;
      return next;
    });
  };

  useEffect(() => {
    let mounted = true;
    const loadSuggestions = async () => {
      if (!ownerId) {
        setSuggestedItems([]);
        return;
      }
      setSuggestedLoading(true);
      try {
        const res = await getMenuByUserId(ownerId);
        if (!mounted) return;
        const menu = Array.isArray(res?.menu) ? res.menu : [];
        setSuggestedItems(menu.slice(0, 12));
      } catch (_) {
        if (mounted) setSuggestedItems([]);
      } finally {
        if (mounted) setSuggestedLoading(false);
      }
    };
    loadSuggestions();
    return () => {
      mounted = false;
    };
  }, [ownerId]);

  const addSuggestedItem = menuItem => {
    if (!menuItem?.id) return;
    const key = String(menuItem.id);
    setItems(prev => {
      const next = (prev || []).map(i => ({ ...i }));
      const idx = next.findIndex(i => String(i.menuItemId || i.id) === key);
      if (idx >= 0) {
        next[idx].quantity = (next[idx].quantity || 1) + 1;
        return next;
      }
      next.push({
        menuItemId: key,
        itemName: menuItem.itemName || menuItem.name || 'Item',
        price: Number(menuItem.price) || 0,
        quantity: 1,
        currency: menuItem.currency || '€',
        imageUrl: menuItem.imageUrl || menuItem.thumbnailUrl || null,
      });
      return next;
    });
  };

  const cartItemKeySet = useMemo(
    () => new Set((items || []).map(i => String(i.menuItemId || i.id))),
    [items],
  );
  const addMoreItems = useMemo(
    () =>
      (suggestedItems || []).filter(it => !cartItemKeySet.has(String(it?.id || ''))),
    [suggestedItems, cartItemKeySet],
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cart</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close" size={24} color={COLORS.black} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="cart-outline" size={64} color={COLORS.gray400} />
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <Text style={styles.emptySubtext}>
              Add items from a restaurant to see them here.
            </Text>
            <TouchableOpacity
              style={styles.backToShopBtn}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backToShopText}>Go back</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Order items</Text>
              {items.map((item, index) => {
                const qty = item.quantity || 1;
                const price = Number(item.price) || 0;
                const lineTotal = price * qty;
                const key = item.menuItemId || item.id || String(index);
                return (
                  <View key={key} style={styles.cartItem}>
                    <Image
                      source={{
                        uri: safeImageUri(item.imageUrl, DEFAULT_IMAGE),
                      }}
                      style={styles.itemImage}
                    />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle}>{item.itemName}</Text>
                      <View style={styles.qtyRow}>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => changeQty(key, -1)}
                          activeOpacity={0.8}
                        >
                          <Icon name="minus" size={18} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <View style={styles.qtyPill}>
                          <Text style={styles.qtyText}>{qty}</Text>
                        </View>
                        <TouchableOpacity
                          style={styles.qtyBtn}
                          onPress={() => changeQty(key, +1)}
                          activeOpacity={0.8}
                        >
                          <Icon name="plus" size={18} color={COLORS.textPrimary} />
                        </TouchableOpacity>
                        <Text style={styles.itemMeta}>
                          {item.currency || 'GBP'} {price.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.itemPriceColumn}>
                      <Text style={styles.itemPrice}>
                        {item.currency || 'GBP'} {lineTotal.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={styles.summaryContainer}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>
                  {currency} {total.toFixed(2)}
                </Text>
              </View>
            </View>
            <View style={styles.addMoreSection}>
              <Text style={styles.addMoreHeading}>Add more items</Text>
              <Text style={styles.addMoreSubheading}>
                Popular from {route.params?.ownerName || 'this restaurant'}
              </Text>
              {suggestedLoading ? (
                <Text style={styles.addMoreLoadingText}>Loading items...</Text>
              ) : addMoreItems.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.addMoreScroll}
                >
                  {addMoreItems.map(it => (
                    <View key={String(it.id)} style={styles.addMoreCard}>
                      <Image
                        source={{
                          uri: safeImageUri(
                            it.imageUrl || it.thumbnailUrl,
                            DEFAULT_IMAGE,
                          ),
                        }}
                        style={styles.addMoreImage}
                      />
                      <Text style={styles.addMoreItemName} numberOfLines={1}>
                        {it.itemName || it.name || 'Item'}
                      </Text>
                      <View style={styles.addMorePriceRow}>
                        <Text style={styles.addMorePrice}>
                          {(it.currency || '€') + ' ' + (Number(it.price) || 0).toFixed(2)}
                        </Text>
                        <TouchableOpacity
                          style={styles.addMorePlusBtn}
                          onPress={() => addSuggestedItem(it)}
                          activeOpacity={0.85}
                        >
                          <Icon name="plus" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </ScrollView>
              ) : (
                <Text style={styles.addMoreLoadingText}>No more items available</Text>
              )}
            </View>
            <View style={{ height: 140 }} />
          </>
        )}
      </ScrollView>

      {items.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.footerHandle} />
          <View style={styles.footerRow}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalPrice}>
                {currency} {total.toFixed(2)}
              </Text>
            </View>
            <TouchableOpacity style={styles.checkoutBtn} onPress={onCheckout}>
              <Text style={styles.checkoutBtnText}>Checkout</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray700,
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.gray500,
    marginTop: 8,
    textAlign: 'center',
  },
  backToShopBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.primaryOrange,
    borderRadius: 24,
  },
  backToShopText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.white,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  stepItem: {
    alignItems: 'center',
    width: 60,
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  stepActive: {
    backgroundColor: COLORS.primaryOrange,
  },
  stepInactive: {
    backgroundColor: COLORS.gray200,
  },
  stepNumber: {
    color: COLORS.white,
    fontWeight: 'bold',
  },
  stepNumberInactive: {
    color: COLORS.gray500,
  },
  stepLabel: {
    fontSize: 10,
    color: COLORS.gray600,
  },
  stepLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.black,
    marginTop: -15,
  },
  stepLineInactive: {
    backgroundColor: COLORS.gray300,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginBottom: 15,
  },
  cardLabel: {
    fontSize: 14,
    color: COLORS.gray700,
    marginBottom: 10,
  },
  promoInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 30,
    paddingLeft: 15,
    paddingRight: 5,
    height: 50,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  promoInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.black,
  },
  applyBtn: {
    backgroundColor: COLORS.primaryOrange,
    paddingHorizontal: 25,
    paddingVertical: 10,
    borderRadius: 25,
  },
  applyBtnText: {
    color: COLORS.white,
    fontWeight: 'bold',
    fontSize: 14,
  },
  deliveryCard: {
    backgroundColor: '#FFF5EE', // Light cream/orangeish background
    borderColor: 'transparent',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryTextContainer: {
    marginLeft: 15,
  },
  deliveryLabel: {
    fontSize: 12,
    color: COLORS.gray600,
  },
  deliveryValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.black,
    marginVertical: 2,
  },
  changeLink: {
    fontSize: 14,
    color: COLORS.gray600,
    textDecorationLine: 'underline',
  },
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  itemInfo: {
    flex: 1,
    marginLeft: 12,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.gray800,
    marginBottom: 4,
  },
  itemMeta: {
    fontSize: 13,
    color: COLORS.gray500,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  qtyBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  qtyPill: {
    minWidth: 34,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray200,
    paddingHorizontal: 10,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  quantityWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 20,
    width: 80,
    height: 30,
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  quantityBtn: {
    padding: 2,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryOrange,
  },
  itemPriceColumn: {
    alignItems: 'flex-end',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.primaryOrange,
  },
  itemOldPrice: {
    fontSize: 12,
    color: COLORS.gray400,
    textDecorationLine: 'line-through',
  },
  addMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  addMoreText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.gray100,
    marginBottom: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.gray600,
    lineHeight: 18,
    marginBottom: 15,
  },
  horizontalScroll: {
    flexDirection: 'row',
  },
  popularCard: {
    marginRight: 15,
    width: 180,
    height: 100,
    position: 'relative',
  },
  popularImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  playIconContainer: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 5,
    padding: 4,
  },
  summaryContainer: {
    marginBottom: 20,
  },
  addMoreSection: {
    marginBottom: 24,
  },
  addMoreHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.gray900 || COLORS.black,
  },
  addMoreSubheading: {
    fontSize: 12,
    color: COLORS.gray600,
    marginTop: 3,
    marginBottom: 12,
  },
  addMoreLoadingText: {
    fontSize: 13,
    color: COLORS.gray500,
  },
  addMoreScroll: {
    paddingRight: 8,
  },
  addMoreCard: {
    width: 150,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    padding: 8,
    marginRight: 10,
  },
  addMoreImage: {
    width: '100%',
    height: 84,
    borderRadius: 10,
    marginBottom: 8,
  },
  addMoreItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray800,
    marginBottom: 8,
  },
  addMorePriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addMorePrice: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryOrange,
  },
  addMorePlusBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primaryOrange,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.gray800,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.gray800,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#F8F9FA',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    paddingTop: 10,
    ...SHADOWS.large,
  },
  footerHandle: {
    width: 40,
    height: 4,
    backgroundColor: COLORS.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 15,
  },
  footerRow: {
    flexDirection: 'column',
    gap: 12,
  },
  checkoutBtn: {
    backgroundColor: COLORS.primaryOrange,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  checkoutBtnText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: 'bold',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  feesText: {
    fontSize: 12,
    color: COLORS.gray600,
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryOrange,
  },
  totalPriceContainer: {
    alignItems: 'flex-end',
  },
  totalPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryOrange,
  },
  totalOldPrice: {
    fontSize: 14,
    color: COLORS.gray400,
    textDecorationLine: 'line-through',
  },
  checkoutFooter: {
    width: '100%',
  },
  checkoutLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  seeSummary: {
    fontSize: 12,
    color: COLORS.gray500,
    textDecorationLine: 'underline',
  },
  confirmBtn: {
    backgroundColor: COLORS.primaryOrange,
    height: 45,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  confirmBtnText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CartDetailsScreen;
