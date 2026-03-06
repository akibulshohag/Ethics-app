import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  Linking,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { getRestaurantOrderById, updateRestaurantOrderStatus } from '../services/orderService';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${d.getHours() >= 12 ? 'pm' : 'am'}, ${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`;
}

const statusToLabel = (status) => {
  const s = String(status || '').toLowerCase();
  switch (s) {
    case 'pending': return 'Pending';
    case 'confirmed': return 'Accepted';
    case 'cancelled': return 'Rejected';
    case 'preparing': return 'Preparing';
    case 'completed': return 'Completed';
    default: return status || 'Pending';
  }
};

const statusColor = (status) => {
  switch (String(status || '').toLowerCase()) {
    case 'completed': return '#22c55e';
    case 'cancelled': return '#F04438';
    case 'confirmed':
    case 'preparing': return '#FDB022';
    default: return '#666';
  }
};

export default function OrderDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector((s) => s?.app?.user);
  const role = String(user?.role || '').toLowerCase();
  const canAcceptReject = ['owner', 'admin', 'superadmin', 'super_admin'].includes(role);
  const { orderId, order: orderParam } = route.params || {};
  const [order, setOrder] = useState(orderParam || null);
  const [loading, setLoading] = useState(!orderParam && !!orderId);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (orderParam) {
      setOrder(orderParam);
      return;
    }
    if (!orderId || !user?.token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    getRestaurantOrderById(user.token, orderId)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch(() => {
        if (!cancelled) setOrder(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [orderId, orderParam, user?.token]);

  const handleCall = () => {
    const phone = order?.user?.phone || order?.user?.phoneNumber || '';
    if (!phone) return;
    Linking.openURL(`tel:${String(phone).replace(/\s/g, '')}`);
  };

  const openChat = () => {
    const customerId = order?.userId;
    if (!customerId) return;
    navigation.navigate('ChatScreen', {
      partnerId: customerId,
      partnerName: order?.user?.name || order?.user?.email || 'Customer',
      partnerAvatar: order?.user?.photos?.[0],
      orderId: order?.id,
      orderDetails: {
        itemName: order?.items?.[0]?.itemName,
        itemImage: null,
      },
    });
  };

  const handleReject = () => {
    Alert.alert('Reject order', 'Cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          setUpdating(true);
          try {
            await updateRestaurantOrderStatus(user.token, order.id, 'cancelled');
            navigation.goBack();
          } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to reject');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  const handleAccept = async () => {
    setUpdating(true);
    try {
      await updateRestaurantOrderStatus(user.token, order.id, 'completed');
      setOrder((prev) => (prev ? { ...prev, status: 'completed' } : prev));
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to accept');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FDB022" />
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="chevron-left" size={26} color="#1A1C1E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.helperText}>Order not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const customerName = order.user?.name || order.user?.email || 'Customer';
  const phone = order.user?.phone || order.user?.phoneNumber || '';
  const avatarUri = order.user?.photos?.[0] || 'https://i.pravatar.cc/150?u=user';
  const items = order.items || [];
  const totalAmount = Number(order.totalAmount || 0);
  const currency = order.currency || 'BDT';
  const displayOrderId = order.id ? `#${String(order.id).slice(0, 12)}` : '—';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIconButton} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={26} color="#1A1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.card}>
          <View style={styles.customerHeader}>
            <Text style={styles.customerLabel}>Customer</Text>
            <View style={styles.customerInfoRow}>
              <Image source={{ uri: avatarUri }} style={styles.customerAvatar} />
              <View style={styles.customerDetails}>
                <View style={styles.customerNameRow}>
                  <Text style={styles.customerName}>{customerName}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor(order.status) }]}>
                    <Text style={styles.statusBadgeText}>{statusToLabel(order.status)}</Text>
                  </View>
                </View>
                {phone ? (
                  <View style={styles.phoneRow}>
                    <Icon name="phone" size={14} color="white" />
                    <Text style={styles.phoneText}>{phone}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.actionIcons}>
                <TouchableOpacity style={styles.iconCircle} onPress={openChat}>
                  <Icon name="message-text" size={18} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.iconCircle} onPress={handleCall}>
                  <Icon name="phone" size={18} color="white" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={styles.addressSection}>
            <Text style={styles.sectionLabel}>Delivery Address</Text>
            <Text style={styles.addressText}>{order.deliveryAddress || '—'}</Text>
            <Text style={[styles.sectionLabel, { marginTop: 15 }]}>Order Time</Text>
            <View style={styles.timeRow}>
              <Icon name="truck-delivery-outline" size={20} color="#1A1C1E" />
              <Text style={styles.timeText}>{formatDate(order.createdAt)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.itemPadding}>
            <Text style={styles.orderIdText}>Order ID : {displayOrderId}</Text>
            {items.map((item, idx) => {
              const lineTotal = (item.unitPrice || 0) * (item.quantity || 1);
              return (
                <View key={item.id || idx} style={styles.itemRow}>
                  <View style={styles.itemMain}>
                    <Text style={styles.itemName}>{item.itemName || 'Item'}</Text>
                    <View style={styles.qtyRow}>
                      <View style={styles.qtyBox}>
                        <Text style={styles.qtyText}>{item.quantity || 1}</Text>
                      </View>
                      <Text style={styles.priceCalc}>
                        {' '}
                        x {currency} {(item.unitPrice || 0).toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.itemTotal}>
                    {currency} {lineTotal.toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.card}>
          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>Sub Total</Text>
            <Text style={styles.billingValue}>
              {currency} {totalAmount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.billingDivider} />
          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>Total</Text>
            <Text style={styles.billingValue}>
              {currency} {totalAmount.toFixed(2)}
            </Text>
          </View>
          <View style={styles.billingDivider} />
          <View style={styles.billingRow}>
            <Text style={styles.billingLabel}>Payment</Text>
            <Text style={[styles.billingValue, { fontWeight: '700' }]}>Paid</Text>
          </View>
        </View>
      </ScrollView>

      {canAcceptReject && (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerBtn, styles.rejectBtn]}
            onPress={handleReject}
            disabled={updating || order.status === 'cancelled'}
          >
            {updating ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.footerBtnText}>Reject</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, styles.acceptBtn]}
            onPress={handleAccept}
            disabled={updating || order.status === 'completed'}
          >
            <Text style={styles.footerBtnText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  helperText: { fontSize: 16, color: '#666' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backIconButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', marginLeft: 15, color: '#1A1C1E' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: { backgroundColor: 'white', borderRadius: 16, marginBottom: 15, overflow: 'hidden' },
  customerHeader: { backgroundColor: '#FDB022', padding: 20 },
  customerLabel: { color: '#1A1C1E', fontSize: 18, fontWeight: '600', marginBottom: 10 },
  customerInfoRow: { flexDirection: 'row', alignItems: 'center' },
  customerAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#1A1C1E',
  },
  customerDetails: { marginLeft: 15, flex: 1 },
  customerNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  customerName: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { color: 'white', fontSize: 12, fontWeight: '600' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  phoneText: { color: 'white', marginLeft: 8, fontSize: 14 },
  actionIcons: { flexDirection: 'row' },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1C1E',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  addressSection: { padding: 20 },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: '#1A1C1E' },
  addressText: { color: '#667085', marginTop: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  timeText: { marginLeft: 10, color: '#1A1C1E', fontWeight: '500' },
  itemPadding: { padding: 20 },
  orderIdText: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  itemMain: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '700', color: '#1A1C1E' },
  itemSubtext: { fontSize: 12, color: '#98A2B3', marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  qtyBox: {
    borderWidth: 1,
    borderColor: '#F04438',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  qtyText: { color: '#F04438', fontSize: 12, fontWeight: 'bold' },
  priceCalc: { color: '#1A1C1E', fontSize: 14, fontWeight: '600' },
  itemTotal: { fontSize: 16, fontWeight: '700', color: '#1A1C1E' },
  billingRow: { flexDirection: 'row', justifyContent: 'space-between', padding: 15 },
  billingLabel: { fontSize: 16, color: '#1A1C1E', fontWeight: '500' },
  billingValue: { fontSize: 16, color: '#1A1C1E', fontWeight: '600' },
  billingDivider: { height: 1, backgroundColor: '#F2F4F7', marginHorizontal: 15 },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#F2F4F7',
  },
  footerBtn: {
    flex: 1,
    height: 55,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  rejectBtn: { backgroundColor: '#F04438' },
  acceptBtn: { backgroundColor: '#FDB022' },
  footerBtnText: { color: 'white', fontSize: 18, fontWeight: '700' },
});
