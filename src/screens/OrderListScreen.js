import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { getRestaurantOrders, updateRestaurantOrderStatus } from '../services/orderService';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${date} ${time}`;
};

const statusColor = (status) => {
  switch (String(status).toLowerCase()) {
    case 'completed': return COLORS.success ?? '#22c55e';
    case 'cancelled': return COLORS.error ?? '#ef4444';
    case 'confirmed':
    case 'preparing': return COLORS.primaryOrange;
    default: return COLORS.gray600;
  }
};

const OrderListScreen = ({ navigation }) => {
  const { user } = useSelector((state) => state.app) || {};
  const role = String(user?.role || '').toLowerCase();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const title =
    role === 'owner'
      ? 'Restaurant orders'
      : role === 'admin' || role === 'superadmin' || role === 'super_admin'
        ? 'All orders'
        : 'My orders';

  const load = useCallback(
    async (isRefresh = false) => {
      if (!user?.token) {
        setOrders([]);
        setLoading(false);
        return;
      }
      const p = isRefresh ? 1 : page;
      if (isRefresh) setRefreshing(true);
      else if (p === 1) setLoading(true);
      try {
        const res = await getRestaurantOrders(user.token, {
          page: p,
          limit,
        });
        const list = res?.orders || [];
        setTotal(res?.total ?? 0);
        if (isRefresh || p === 1) setOrders(list);
        else setOrders((prev) => [...prev, ...list]);
      } catch (e) {
        if (p === 1) setOrders([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.token, page],
  );

  useEffect(() => {
    load(true);
  }, [user?.token]);

  const onRefresh = () => load(true);

  const updateStatus = async (orderId, newStatus) => {
    if (!user?.token) return;
    try {
      await updateRestaurantOrderStatus(user.token, orderId, newStatus);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
    } catch (e) {
      // optional: show alert
    }
  };

  const canUpdateStatus = role === 'owner' || role === 'admin' || role === 'superadmin' || role === 'super_admin';

  const renderOrder = ({ item }) => {
    const customerName = item.user?.name || item.user?.email || 'Customer';
    const ownerName = item.owner?.name || item.owner?.email || 'Restaurant';
    const itemCount = (item.items || []).reduce((s, i) => s + (i.quantity || 0), 0);

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <Text style={styles.cardId}>#{item.id.slice(0, 8)}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor(item.status) }]}>
            <Text style={styles.badgeText}>{String(item.status)}</Text>
          </View>
        </View>
        {role !== 'user' && (
          <Text style={styles.cardCustomer}>
            {role === 'owner' ? `Customer: ${customerName}` : `${customerName} → ${ownerName}`}
          </Text>
        )}
        <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.cardItems}>{itemCount} item(s) · {item.currency} {Number(item.totalAmount).toFixed(2)}</Text>
        {canUpdateStatus && item.status !== 'completed' && item.status !== 'cancelled' && (
          <View style={styles.statusRow}>
            {['confirmed', 'preparing', 'completed'].map((s) => (
              <TouchableOpacity
                key={s}
                style={styles.statusBtn}
                onPress={() => updateStatus(item.id, s)}
              >
                <Text style={styles.statusBtnText}>{s}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <TouchableOpacity
          style={styles.chatBtn}
          onPress={() => {
            const partnerId = role === 'user' ? item.ownerId : item.userId;
            const partnerName = role === 'user' ? ownerName : customerName;
            const firstItem = (item.items || [])[0];
            navigation.navigate('ChatScreen', {
              partnerId,
              partnerName,
              partnerAvatar: item.owner?.photos?.[0] || item.user?.photos?.[0],
              orderId: item.id,
              orderDetails: {
                itemName: firstItem?.itemName || `${itemCount} item(s)`,
                itemImage: null,
              },
            });
          }}
        >
          <Icon name="message-text-outline" size={20} color={COLORS.primaryOrange} />
          <Text style={styles.chatBtnText}>Chat about this order</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!user?.token) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Sign in to view orders.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>
      {loading && orders.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primaryOrange} />
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(o) => o.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primaryOrange]} />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Icon name="cart-outline" size={64} color={COLORS.gray400} />
              <Text style={styles.emptyText}>No orders yet</Text>
            </View>
          }
        />
      )}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.gray100,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardId: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  cardCustomer: {
    fontSize: 13,
    color: COLORS.gray600,
    marginBottom: 4,
  },
  cardDate: {
    fontSize: 12,
    color: COLORS.gray500,
    marginBottom: 4,
  },
  cardItems: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  statusRow: {
    flexDirection: 'row',
    marginTop: 10,
    gap: 8,
  },
  statusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: COLORS.primaryOrange,
    borderRadius: 8,
  },
  statusBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray100,
    gap: 6,
  },
  chatBtnText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.primaryOrange,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.gray600,
    marginTop: 12,
  },
});

export default OrderListScreen;
