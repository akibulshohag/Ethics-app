import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, FONTS, SPACING, BORDER_RADIUS, SHADOWS } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import CheckoutSection from '../components/CheckoutSection';

const { width } = Dimensions.get('window');

const CartDetailsScreen = () => {
  const navigation = useNavigation();
  const [activeTab, setActiveTab] = useState('Cart'); // 'Cart' or 'Checkout'

  const Stepper = () => (
    <View style={styles.stepperContainer}>
      <TouchableOpacity style={styles.stepItem} onPress={() => setActiveTab('Cart')}>
        <View style={[styles.stepCircle, styles.stepActive]}>
          <Text style={styles.stepNumber}>1</Text>
        </View>
        <Text style={styles.stepLabel}>Menu</Text>
      </TouchableOpacity>
      <View style={styles.stepLine} />
      <TouchableOpacity style={styles.stepItem} onPress={() => setActiveTab('Cart')}>
        <View style={[styles.stepCircle, styles.stepActive]}>
          <Text style={styles.stepNumber}>2</Text>
        </View>
        <Text style={styles.stepLabel}>Cart</Text>
      </TouchableOpacity>
      <View style={[styles.stepLine, activeTab === 'Checkout' ? {} : styles.stepLineInactive]} />
      <TouchableOpacity style={styles.stepItem} onPress={() => setActiveTab('Checkout')}>
        <View style={[styles.stepCircle, activeTab === 'Checkout' ? styles.stepActive : styles.stepInactive]}>
          <Text style={[styles.stepNumber, activeTab === 'Checkout' ? {} : styles.stepNumberInactive]}>3</Text>
        </View>
        <Text style={styles.stepLabel}>Checkout</Text>
      </TouchableOpacity>
    </View>
  );

  const CartSection = () => (
    <>
      {/* Promo Code */}
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Apply Your Promo Code</Text>
        <View style={styles.promoInputRow}>
          <TextInput
            style={styles.promoInput}
            placeholder="MULEN300FF"
            placeholderTextColor={COLORS.gray400}
          />
          <TouchableOpacity style={styles.applyBtn}>
            <Text style={styles.applyBtnText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delivery Estimate */}
      <View style={[styles.card, styles.deliveryCard]}>
        <View style={styles.deliveryInfo}>
          <Icon name="truck-delivery" size={32} color={COLORS.black} />
          <View style={styles.deliveryTextContainer}>
            <Text style={styles.deliveryLabel}>Estimate delivery</Text>
            <Text style={styles.deliveryValue}>Standard (35-50 mins)</Text>
            <TouchableOpacity>
              <Text style={styles.changeLink}>Change</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Cart Item */}
      <View style={styles.cartItem}>
        <Image
          source={{ uri: 'https://img.freepik.com/free-photo/delicious-burger-with-fire-flames_23-2151846510.jpg' }}
          style={styles.itemImage}
        />
        <View style={styles.itemInfo}>
          <Text style={styles.itemTitle}>Quick and Easy Recipe</Text>
          <View style={styles.quantityWrapper}>
            <TouchableOpacity style={styles.quantityBtn}>
              <Icon name="minus" size={16} color={COLORS.gray600} />
            </TouchableOpacity>
            <Text style={styles.quantityText}>1</Text>
            <TouchableOpacity style={styles.quantityBtn}>
              <Icon name="plus" size={16} color={COLORS.black} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.itemPriceColumn}>
          <Text style={styles.itemPrice}>+$ 110</Text>
          <Text style={styles.itemOldPrice}>$ 15</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.addMoreRow}>
        <Icon name="plus" size={20} color={COLORS.black} />
        <Text style={styles.addMoreText}>Add more items</Text>
      </TouchableOpacity>

      <View style={styles.divider} />

      {/* Popular with order */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Popular with order</Text>
        <Text style={styles.sectionSubtitle}>
          A cozy restaurant serving fresh, delicious food made with quality ingredients.
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
          {[1, 2].map((i) => (
            <View key={i} style={styles.popularCard}>
              <Image
                source={{ uri: i === 1 ? 'https://img.freepik.com/free-photo/delicious-burger-with-fire-flames_23-2151846510.jpg' : 'https://img.freepik.com/free-photo/tasty-steak-surrounded-by-herbs-and-sauce_23-2148416666.jpg' }}
                style={styles.popularImage}
              />
              <View style={styles.playIconContainer}>
                <Icon name="play" size={14} color={COLORS.primaryOrange} />
              </View>
            </View>
          ))}
        </ScrollView>
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Subtotal</Text>
          <Text style={styles.summaryValue}>+$ 160</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Delivery Charge</Text>
          <Text style={styles.summaryValue}>+$ 50</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>VAT</Text>
          <Text style={styles.summaryValue}>$1.5</Text>
        </View>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Promo Code</Text>
          <Text style={[styles.summaryValue, { color: COLORS.error }]}>-$50</Text>
        </View>
      </View>
    </>
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

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Stepper */}
        <Stepper />

        {activeTab === 'Cart' ? <CartSection /> : <CheckoutSection />}

        {/* Total Footer Placeholder */}
        <View style={{ height: 140 }} />
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.footerHandle} />
        {activeTab === 'Cart' ? (
          <View style={styles.footerRow}>
            <View>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.feesText}>(incl.fees and tax)</Text>
            </View>
            <View style={styles.totalPriceContainer}>
              <Text style={styles.totalPrice}>+$ 161.5</Text>
              <Text style={styles.totalOldPrice}>$ 195</Text>
            </View>
          </View>
        ) : (
          <View style={styles.checkoutFooter}>
            <View style={styles.checkoutLabelRow}>
                <View>
                    <Text style={styles.totalLabel}>Total</Text>
                    <TouchableOpacity><Text style={styles.seeSummary}>See summary</Text></TouchableOpacity>
                </View>
                <Text style={styles.totalPrice}>+$ 161.5</Text>
            </View>
            <TouchableOpacity style={styles.confirmBtn}>
                <Text style={styles.confirmBtnText}>Confirm Address</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
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
    marginBottom: 8,
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
