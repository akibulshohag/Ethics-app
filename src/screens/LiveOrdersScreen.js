import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  getRestaurantOrders,
  updateRestaurantOrderStatus,
} from '../services/orderService';

const TABS = ['In Progress', 'Accepted', 'Rejected'];

function formatItems(items) {
  if (!Array.isArray(items) || items.length === 0) return 'No items';
  return items
    .map(i => `${i.itemName || 'Item'} x ${i.quantity || 1}`)
    .join(', ');
}

function statusToLabel(status) {
  const s = String(status || '').toLowerCase();
  switch (s) {
    case 'pending':
      return 'Pending';
    case 'confirmed':
      return 'Accepted';
    case 'cancelled':
      return 'Rejected';
    case 'preparing':
      return 'Preparing';
    case 'completed':
      return 'Completed';
    default:
      return status || 'Pending';
  }
}

function statusColor(status) {
  const s = String(status || '').toLowerCase();
  switch (s) {
    case 'completed':
      return '#22c55e';
    case 'cancelled':
      return '#F04438';
    case 'confirmed':
    case 'preparing':
      return '#FDB022';
    default:
      return '#666';
  }
}

export default function LiveOrdersScreen() {
  const navigation = useNavigation();
  const user = useSelector(s => s?.app?.user);
  const role = String(user?.role || '').toLowerCase();
  const canAcceptReject = [
    'owner',
    'admin',
    'superadmin',
    'super_admin',
  ].includes(role);
  const [activeTab, setActiveTab] = useState('In Progress');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);

  const loadOrders = useCallback(
    async (isRefresh = false) => {
      if (!user?.token) {
        setOrders([]);
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const res = await getRestaurantOrders(user.token, { limit: 100 });
        const all = res?.orders || [];
        const filtered = all.filter(o => {
          const s = String(o?.status || '').toLowerCase();
          if (activeTab === 'In Progress') {
            // "All new orders" (requested): pending
            return s === 'pending';
          }
          if (activeTab === 'Accepted') {
            // Accepted flow
            return s === 'confirmed' || s === 'preparing' || s === 'completed';
          }
          if (activeTab === 'Rejected') {
            return s === 'cancelled';
          }
          return true;
        });
        setOrders(filtered);
      } catch (e) {
        setOrders([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.token, activeTab],
  );

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  useEffect(() => {
    loadOrders();
  }, [activeTab]);

  const handleReject = order => {
    Alert.alert('Reject order', 'Cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          setUpdatingId(order.id);
          try {
            await updateRestaurantOrderStatus(
              user.token,
              order.id,
              'cancelled',
            );
            setOrders(prev => prev.filter(o => o.id !== order.id));
          } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to reject');
          } finally {
            setUpdatingId(null);
          }
        },
      },
    ]);
  };

  const handleAccept = async order => {
    setUpdatingId(order.id);
    try {
      await updateRestaurantOrderStatus(user.token, order.id, 'completed');
      setOrders(prev => prev.filter(o => o.id !== order.id));
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to accept');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!user?.token) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centered}>
          <Text style={styles.helperText}>Sign in to see orders</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView style={styles.headerContainer}>
        <View style={styles.topRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Icon name="chevron-left" size={20} color="white" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.liveLabelContainer}>
            <View style={styles.orangeCircle}>
              <View style={styles.innerPlay} />
            </View>
            <Text style={styles.liveOrdersText}>Live Orders</Text>
          </View>
        </View>

        <View style={styles.tabBar}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[
                styles.tabItem,
                activeTab === tab && styles.activeTabItem,
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.activeTabText,
                ]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </SafeAreaView>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FDB022" />
        </View>
      ) : (
        <ScrollView
          style={styles.listContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadOrders(true)}
              colors={['#FDB022']}
            />
          }
        >
          {orders.length === 0 ? (
            <View style={styles.centered}>
              <Text style={styles.emptyText}>No orders in this tab</Text>
            </View>
          ) : (
            orders.map(order => {
              const customerName =
                order.user?.name || order.user?.email || 'Customer';
              const isUpdating = updatingId === order.id;
              const isPending =
                String(order.status || '').toLowerCase() === 'pending';
              return (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                      <View style={styles.userIconBg}>
                        {(() => {
                          const photo = order.user?.photos?.[0];
                          const uri =
                            typeof photo === 'string'
                              ? photo
                              : photo?.src ?? null;
                          return uri ? (
                            <Image source={{ uri }} style={styles.userAvatar} />
                          ) : (
                            <Icon
                              name="account-outline"
                              size={20}
                              color="#FDB022"
                            />
                          );
                        })()}
                      </View>
                      <Text style={styles.userName}>{customerName}</Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusColor(order.status) },
                        ]}
                      >
                        <Text style={styles.statusBadgeText}>
                          {statusToLabel(order.status)}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.priceText}>
                      £{Number(order.totalAmount || 0).toFixed(2)}
                    </Text>
                  </View>

                  <View style={styles.detailsContainer}>
                    <Text style={styles.detailLabel}>
                      Order ID :{' '}
                      <Text style={styles.detailValue}>
                        #{String(order.id)}
                      </Text>
                    </Text>
                    <Text style={styles.detailLabel}>
                      Payment : <Text style={styles.detailValue}>Paid</Text>
                    </Text>
                    <View style={styles.itemsRow}>
                      <Icon
                        name="shopping-outline"
                        size={14}
                        color="#666"
                        style={{ marginRight: 5 }}
                      />
                      <Text style={styles.itemsText} numberOfLines={2}>
                        {formatItems(order.items)}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.buttonRow}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.viewBtn]}
                      onPress={() =>
                        navigation.navigate('OrderDetailsScreen', {
                          orderId: order.id,
                          order,
                        })
                      }
                    >
                      <Text style={styles.viewBtnText}>View Order</Text>
                    </TouchableOpacity>
                    {canAcceptReject && isPending ? (
                      <>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.rejectBtn]}
                          onPress={() => handleReject(order)}
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <ActivityIndicator size="small" color="white" />
                          ) : (
                            <Text style={styles.btnText}>Reject</Text>
                          )}
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.acceptBtn]}
                          onPress={() => handleAccept(order)}
                          disabled={isUpdating}
                        >
                          <Text style={styles.btnText}>Accept</Text>
                        </TouchableOpacity>
                      </>
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
  },
  helperText: { fontSize: 16, color: '#666' },
  emptyText: { fontSize: 14, color: '#98A2B3' },
  headerContainer: { backgroundColor: 'white' },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1C1E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  backText: { color: 'white', fontWeight: '600', fontSize: 13, marginLeft: 2 },
  liveLabelContainer: { flexDirection: 'row', alignItems: 'center' },
  orangeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FDB022',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  innerPlay: {
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderTopWidth: 4,
    borderBottomWidth: 4,
    borderLeftColor: '#FDB022',
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    marginLeft: 2,
  },
  liveOrdersText: { fontSize: 18, fontWeight: '700', color: '#DF485E' },
  tabBar: { flexDirection: 'row', marginTop: 10 },
  tabItem: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E4E7EC',
  },
  activeTabItem: {
    backgroundColor: '#FDB022',
    borderBottomColor: '#FDB022',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tabText: { fontSize: 16, color: '#667085', fontWeight: '500' },
  activeTabText: { color: 'white', fontWeight: 'bold' },
  listContainer: { padding: 15 },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  userIconBg: { marginRight: 10 },
  userAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  userName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1A1C1E',
    marginRight: 8,
  },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { color: 'white', fontSize: 11, fontWeight: '600' },
  priceText: { fontSize: 18, fontWeight: 'bold', color: '#1A1C1E' },
  detailsContainer: { marginTop: 10, paddingLeft: 30 },
  detailLabel: { fontSize: 14, color: '#667085', marginBottom: 4 },
  detailValue: { color: '#1A1C1E', fontWeight: '500' },
  itemsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  itemsText: { fontSize: 13, color: '#667085', flex: 1 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
  },
  actionButton: {
    flex: 1,
    height: 40,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  viewBtn: { borderWidth: 1, borderColor: '#FDB022' },
  rejectBtn: { backgroundColor: '#DF485E' },
  acceptBtn: { backgroundColor: '#FDB022' },
  viewBtnText: { color: '#FDB022', fontWeight: '600' },
  btnText: { color: 'white', fontWeight: '600' },
});
