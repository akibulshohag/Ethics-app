import React from 'react';
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

const DEFAULT_IMAGE = 'https://img.freepik.com/free-photo/delicious-burger-with-fire-flames_23-2151846510.jpg';

const CartDetailsScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { ownerId, items: paramItems = [] } = route.params || {};
  const items = Array.isArray(paramItems) ? paramItems : [];

  const total = items.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (i.quantity || 1),
    0,
  );
  const currency = items[0]?.currency || 'BDT';

  const onCheckout = () => {
    if (!items.length || !ownerId) return;
    navigation.navigate('CheckoutScreen', { ownerId, items });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Cart</Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close" size={24} color={COLORS.black} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="cart-outline" size={64} color={COLORS.gray400} />
            <Text style={styles.emptyText}>Your cart is empty</Text>
            <Text style={styles.emptySubtext}>Add items from a restaurant to see them here.</Text>
            <TouchableOpacity style={styles.backToShopBtn} onPress={() => navigation.goBack()}>
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
                return (
                  <View key={item.menuItemId || index} style={styles.cartItem}>
                    <Image
                      source={{ uri: item.imageUrl || DEFAULT_IMAGE }}
                      style={styles.itemImage}
                    />
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle}>{item.itemName}</Text>
                      <Text style={styles.itemMeta}>
                        {item.currency || 'BDT'} {price.toFixed(2)} × {qty}
                      </Text>
                    </View>
                    <View style={styles.itemPriceColumn}>
                      <Text style={styles.itemPrice}>
                        {item.currency || 'BDT'} {lineTotal.toFixed(2)}
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
              <Text style={styles.totalPrice}>{currency} {total.toFixed(2)}</Text>
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
