import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import { createRestaurantOrder } from '../services/orderService';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

const CheckoutScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { user } = useSelector(state => state.app) || {};
  const { ownerId, items = [], ownerName } = route.params || {};

  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [placing, setPlacing] = useState(false);

  const subtotal = items.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (i.quantity || 1),
    0,
  );
  const total = subtotal;

  const handleConfirmOrder = async () => {
    if (!user?.token) {
      Alert.alert('Sign in required', 'Please sign in to place an order.', [
        { text: 'OK' },
        { text: 'Sign in', onPress: () => navigation.replace('Login') },
      ]);
      return;
    }
    if (!ownerId || !items.length) {
      Alert.alert('Error', 'No items to order.');
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
        deliveryAddress: deliveryNotes.trim() || undefined,
      });
      Toast.show({
        type: 'success',
        text1: 'Order placed successfully',
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e.message || 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
        >
          <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {ownerName ? (
          <Text style={styles.restaurantName}>{ownerName}</Text>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order summary</Text>
          {(items || []).map((item, index) => {
            const qty = item.quantity || 1;
            const price = Number(item.price) || 0;
            const lineTotal = price * qty;
            return (
              <View key={item.menuItemId || index} style={styles.row}>
                <View style={styles.rowLeft}>
                  <Text style={styles.itemName}>{item.itemName}</Text>
                  <Text style={styles.itemMeta}>
                    {item.currency || 'GBP'} {price.toFixed(2)} × {qty}
                  </Text>
                </View>
                <Text style={styles.lineTotal}>
                  {item.currency || 'GBP'} {lineTotal.toFixed(2)}
                </Text>
              </View>
            );
          })}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Delivery notes (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Address or special instructions"
            placeholderTextColor={COLORS.gray500}
            value={deliveryNotes}
            onChangeText={setDeliveryNotes}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>£ {total.toFixed(2)}</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.confirmBtn, placing && styles.confirmBtnDisabled]}
          disabled={placing}
          onPress={handleConfirmOrder}
        >
          {placing ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.confirmBtnText}>Place order</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundWhite ?? COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  backBtn: {
    width: 40,
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
    paddingBottom: 100,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray700,
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray600,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
  },
  rowLeft: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  itemMeta: {
    fontSize: 13,
    color: COLORS.gray500,
    marginTop: 4,
  },
  lineTotal: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primaryOrange,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: BORDER_RADIUS.md,
    padding: 12,
    fontSize: 15,
    color: COLORS.textPrimary,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: COLORS.gray200,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.primaryOrange,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    paddingBottom: SPACING.md + 24,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
  },
  confirmBtn: {
    backgroundColor: COLORS.primaryOrange,
    height: 50,
    borderRadius: BORDER_RADIUS.lg ?? 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.7,
  },
  confirmBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: COLORS.white,
  },
});

export default CheckoutScreen;
