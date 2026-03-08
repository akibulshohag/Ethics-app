import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import { createRestaurantOrder } from '../services/orderService';

const HomeFourScreen = ({ onBack }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector(state => state.app?.user) || {};
  const { ownerId, items: paramItems = [], ownerName } = route.params || {};
  const initialItems = Array.isArray(paramItems) ? paramItems : [];

  const [items, setItems] = useState(
    initialItems.map(i => ({ ...i, quantity: Math.max(1, i.quantity || 1) })),
  );
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [placing, setPlacing] = useState(false);

  const updateItemQty = (index, delta) => {
    setItems(prev =>
      prev.map((it, i) =>
        i === index
          ? { ...it, quantity: Math.max(1, (it.quantity || 1) + delta) }
          : it,
      ),
    );
  };

  const subtotal = items.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (i.quantity || 1),
    0,
  );
  const total = subtotal;
  const currency = items[0]?.currency || 'BDT';
  const displayTotal = total.toFixed(2);
  const displaySubtotal = subtotal.toFixed(2);
  const restaurantName = ownerName || 'Restaurant';
  const deliveryAddress =
    user?.address || deliveryNotes?.trim() || 'Add address';
  const userPhone = user?.phone || user?.pin || '—';
  const userName = user?.name || user?.nickname || '—';

  const handlePlaceOrder = async () => {
    if (!user?.token) {
      navigation.navigate('HomeSevenScreen');
      return;
    }
    if (!ownerId || items.length === 0) {
      Alert.alert('No items', 'Add items from the menu to place an order.');
      return;
    }
    setPlacing(true);
    try {
      await createRestaurantOrder(user.token, {
        ownerId,
        items: items.map(i => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity || 1,
        })),
        deliveryAddress: deliveryNotes.trim() || user?.address || undefined,
      });
      Toast.show({ type: 'success', text1: 'Order placed successfully' });
      navigation.navigate('HomeFiveScreen');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  };

  const hasItems = items.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => (onBack ? onBack() : navigation.goBack())}
            style={styles.backBtn}
          >
            <Icon name="chevron-left" size={18} color="#FFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {restaurantName}
          </Text>
        </View>
        <Icon name="dots-vertical" size={24} color="#999" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        <Text style={styles.deliveryTitle}>Delivery at home</Text>
        <Text style={styles.deliverySub} numberOfLines={2}>
          {deliveryAddress}
        </Text>

        <View style={styles.itemsCard}>
          {hasItems ? (
            items.map((item, index) => {
              const qty = item.quantity || 1;
              const price = Number(item.price) || 0;
              const lineTotal = price * qty;
              return (
                <View key={item.menuItemId || index} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Icon name="circle-slice-8" size={18} color="#F5A623" />
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemName}>
                        {item.itemName || 'Item'}
                      </Text>
                      <Text style={styles.itemPrice}>
                        {currency} {price.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => updateItemQty(index, -1)}
                      disabled={qty <= 1}
                    >
                      <Text
                        style={[
                          styles.stepperChar,
                          qty <= 1 && styles.stepperCharDisabled,
                        ]}
                      >
                        —
                      </Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperVal}>{qty}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => updateItemQty(index, 1)}
                    >
                      <Text style={styles.stepperChar}>+</Text>
                    </TouchableOpacity>
                  </View>
                  {/* <Text style={styles.itemLineTotal}>
                    {currency} {lineTotal.toFixed(2)}
                  </Text> */}
                </View>
              );
            })
          ) : (
            <>
              {[1, 2, 3].map((_, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Icon name="circle-slice-8" size={18} color="#F5A623" />
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemName}>—</Text>
                      <Text style={styles.itemPrice}>—</Text>
                    </View>
                  </View>
                  <Text style={styles.itemLineTotal}>—</Text>
                </View>
              ))}
            </>
          )}

          <TouchableOpacity
            style={styles.addItemsBtn}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.addItemsText}>+ Add items</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.noteContainer} onPress={() => {}}>
          <Icon name="notebook-outline" size={22} color="#1A1A1A" />
          <TextInput
            style={styles.noteInput}
            placeholder="Add a note for the restaurant"
            placeholderTextColor="#999"
            value={deliveryNotes}
            onChangeText={setDeliveryNotes}
          />
        </TouchableOpacity>

        <View style={styles.promoContainer}>
          <View style={styles.promoInputWrapper}>
            <TextInput
              placeholder="Promo code"
              placeholderTextColor="#999"
              style={styles.promoInput}
            />
          </View>
          <TouchableOpacity style={styles.applyBtn}>
            <Text style={styles.applyText}>Apply</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Icon name="truck-delivery-outline" size={24} color="#1A1A1A" />
            <Text style={styles.infoText}>Delivery in 42 mins</Text>
          </View>
          <Icon name="chevron-right" size={24} color="#1A1A1A" />
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoLeft}>
            <Icon name="phone-outline" size={24} color="#1A1A1A" />
            <Text style={styles.infoText}>
              {userName}, {userPhone}
            </Text>
          </View>
          <Icon name="chevron-right" size={24} color="#1A1A1A" />
        </View>

        <View style={styles.billSection}>
          <View style={styles.billHeader}>
            <Icon name="calendar-text-outline" size={24} color="#1A1A1A" />
            <View style={styles.billTitleContainer}>
              <Text style={styles.billMainTitle}>Total Bill</Text>
              <Text style={styles.billSubTitle}>Incl. taxes and charges</Text>
            </View>
            <Text style={styles.totalAmountMain}>
              {currency} {displayTotal}
            </Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Items Bill</Text>
            <Text style={styles.billValue}>
              {currency} {displaySubtotal}
            </Text>
          </View>
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>taxes and charges</Text>
            <Text style={styles.billValue}>—</Text>
          </View>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.paymentMethod}>
          <TouchableOpacity style={styles.payUsingBtn}>
            <Text style={styles.payUsingLabel}>Pay Using</Text>
            <Icon name="menu-up" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.methodName}>Credit Card</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.placeOrderBtn,
            (!hasItems || !ownerId) && styles.placeOrderBtnDisabled,
          ]}
          onPress={handlePlaceOrder}
          disabled={placing || !hasItems || !ownerId}
        >
          <View>
            <Text style={styles.footerPrice}>
              {currency} {displayTotal}
            </Text>
            <Text style={styles.footerTotalLabel}>Total Bill</Text>
          </View>
          {placing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.placeOrderText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backBtn: {
    backgroundColor: '#1E1E1E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 12,
  },
  backText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', flex: 1 },
  content: { flex: 1, paddingHorizontal: 15 },
  deliveryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 15,
  },
  deliverySub: { fontSize: 13, color: '#777', marginTop: 4, marginBottom: 20 },
  itemsCard: {
    backgroundColor: '#F2F6F8',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  itemInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemTextContainer: { marginLeft: 10, flex: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  itemPrice: { fontSize: 14, color: '#666' },
  stepperContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5A623',
    borderRadius: 8,
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 8,
    marginHorizontal: 10,
  },
  stepperBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  stepperChar: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  stepperCharDisabled: { color: 'rgba(255,255,255,0.5)' },
  stepperVal: {
    color: '#FFF',
    fontWeight: 'bold',
    marginHorizontal: 8,
    fontSize: 15,
    minWidth: 20,
    textAlign: 'center',
  },
  itemLineTotal: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  addItemsBtn: { marginTop: 5 },
  addItemsText: { color: '#F5A623', fontWeight: 'bold', fontSize: 15 },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  noteInput: {
    flex: 1,
    marginLeft: 10,
    color: '#333',
    fontSize: 15,
    padding: 0,
  },
  promoContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F6F8',
    borderRadius: 12,
    padding: 10,
    marginBottom: 25,
    alignItems: 'center',
  },
  promoInputWrapper: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 8,
    height: 45,
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  promoInput: { fontSize: 14, color: '#333' },
  applyBtn: { paddingHorizontal: 25 },
  applyText: { color: '#F5A623', fontWeight: 'bold', fontSize: 16 },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  infoText: { marginLeft: 15, fontSize: 15, color: '#333', flex: 1 },
  billSection: { marginTop: 25 },
  billHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  billTitleContainer: { flex: 1, marginLeft: 15 },
  billMainTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  billSubTitle: { fontSize: 13, color: '#999' },
  totalAmountMain: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 40,
    marginBottom: 10,
  },
  billLabel: { color: '#777', fontSize: 14 },
  billValue: { color: '#777', fontSize: 14 },
  bottomSpacer: { height: 120 },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethod: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 15,
    padding: 10,
    width: '35%',
  },
  payUsingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payUsingLabel: { fontSize: 12, color: '#999' },
  methodName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 2,
  },
  placeOrderBtn: {
    backgroundColor: '#F5A623',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 15,
    paddingHorizontal: 20,
    height: 70,
    width: '60%',
  },
  placeOrderBtnDisabled: { opacity: 0.6 },
  footerPrice: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
  footerTotalLabel: { color: '#FFF', fontSize: 12, opacity: 0.8 },
  placeOrderText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
});

export default HomeFourScreen;
