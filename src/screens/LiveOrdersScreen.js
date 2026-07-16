import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import {
  getRestaurantBookings,
  updateRestaurantBookingStatus,
} from '../services/bookingService';
import OrderListScreen from './OrderListScreen';
import {
  orderStatusLabel,
  orderStatusColor,
  OWNER_PREPARING_STATUSES,
  OWNER_DELIVERY_IN_PROGRESS_STATUSES,
  isPickupFulfillment,
} from '../utils/orderStatus';
import CompleteDateFilterRow from '../components/CompleteDateFilterRow';
import { matchesCompleteDateFilter } from '../utils/orderCompleteDateFilter';

/** Status tabs under User Orders (Pending uses Live Order button). */
const USER_ORDER_TABS = ['All', 'Preparing', 'In Progress', 'Complete', 'Rejected'];
const BOOKING_TABS = ['All', 'In Progress', 'Complete', 'Rejected'];

function formatItems(items) {
  if (!Array.isArray(items) || items.length === 0) return 'No items';
  return items
    .map(i => `${i.itemName || 'Item'} x ${i.quantity || 1}`)
    .join(', ');
}

function statusToLabel(status) {
  return orderStatusLabel(status);
}

function statusColor(status) {
  return orderStatusColor(status);
}

function formatBookingDate(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function LiveOrdersScreen() {
  const navigation = useNavigation();
  const user = useSelector(s => s?.app?.user);
  const role = String(user?.role || '').toLowerCase();
  const isOwnerOrAdmin = [
    'owner',
    'vendor',
    'admin',
    'superadmin',
    'super_admin',
    'super-admin',
  ].includes(role);
  const canAcceptReject = isOwnerOrAdmin;
  const [orderScope, setOrderScope] = useState('user');
  const [activeTab, setActiveTab] = useState('All');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [completeDateFilter, setCompleteDateFilter] = useState('all');
  const [completeCustomDate, setCompleteCustomDate] = useState(null);

  const statusTabs = useMemo(
    () => (orderScope === 'booking' ? BOOKING_TABS : USER_ORDER_TABS),
    [orderScope],
  );

  const loadOrders = useCallback(
    async (isRefresh = false) => {
      if (orderScope === 'own') {
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (!user?.token) {
        setOrders([]);
        setLoading(false);
        return;
      }
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      try {
        const isBookingScope = orderScope === 'booking';
        const res = isBookingScope
          ? await getRestaurantBookings(user.token, {
              limit: 100,
              scope: 'owner',
            })
          : await getRestaurantOrders(user.token, {
              limit: 100,
              scope: 'owner',
            });
        const all = isBookingScope ? res?.bookings || [] : res?.orders || [];
        const filtered = all.filter(o => {
          if (
            !matchesCompleteDateFilter(o, completeDateFilter, completeCustomDate)
          ) {
            return false;
          }
          const s = String(o?.status || '').toLowerCase();
          if (activeTab === 'All') return true;
          if (activeTab === 'Pending') {
            return s === 'pending';
          }
          if (activeTab === 'Preparing') {
            return OWNER_PREPARING_STATUSES.includes(s);
          }
          if (activeTab === 'In Progress') {
            if (orderScope === 'booking') {
              return s === 'confirmed';
            }
            return OWNER_DELIVERY_IN_PROGRESS_STATUSES.includes(s);
          }
          if (activeTab === 'Complete') {
            return s === 'completed';
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
    [user?.token, activeTab, orderScope, completeDateFilter, completeCustomDate],
  );

  useFocusEffect(
    useCallback(() => {
      loadOrders();
    }, [loadOrders]),
  );

  useEffect(() => {
    loadOrders();
  }, [activeTab, orderScope, completeDateFilter, completeCustomDate]);

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
      await updateRestaurantOrderStatus(user.token, order.id, 'preparing');
      setOrders(prev =>
        prev.map(o => (o.id === order.id ? { ...o, status: 'preparing' } : o)),
      );
      setActiveTab('Preparing');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to accept');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStartDelivery = order => {
    Alert.alert(
      'Start delivery',
      'Send the rider out for delivery? The customer will see rider details and can chat.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            setUpdatingId(order.id);
            try {
              await updateRestaurantOrderStatus(
                user.token,
                order.id,
                'out_for_delivery',
              );
              await loadOrders(true);
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to start delivery');
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ],
    );
  };

  const handleMarkReady = order => {
    Alert.alert('Mark ready', 'Mark this order ready for customer pick-up?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          setUpdatingId(order.id);
          try {
            await updateRestaurantOrderStatus(user.token, order.id, 'ready');
            await loadOrders(true);
            setActiveTab('In Progress');
          } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to mark ready');
          } finally {
            setUpdatingId(null);
          }
        },
      },
    ]);
  };

  const handleComplete = async order => {
    setUpdatingId(order.id);
    try {
      await updateRestaurantOrderStatus(user.token, order.id, 'completed');
      setOrders(prev => prev.filter(o => o.id !== order.id));
      setActiveTab('Complete');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to complete');
    } finally {
      setUpdatingId(null);
    }
  };

  const updateBooking = async (booking, status) => {
    setUpdatingId(booking.id);
    try {
      await updateRestaurantBookingStatus(user.token, booking.id, status);
      setOrders(prev =>
        status === 'cancelled' || status === 'completed'
          ? prev.filter(o => o.id !== booking.id)
          : prev.map(o => (o.id === booking.id ? { ...o, status } : o)),
      );
      if (status === 'confirmed') setActiveTab('In Progress');
      if (status === 'completed') setActiveTab('Complete');
      if (status === 'cancelled') setActiveTab('Rejected');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to update booking');
    } finally {
      setUpdatingId(null);
    }
  };

  const renderBookingCard = booking => {
    const isUpdating = updatingId === booking.id;
    const bookingStatus = String(booking.status || '').toLowerCase();
    const isPending = bookingStatus === 'pending';
    const isInProgress = bookingStatus === 'confirmed';
    return (
      <View key={booking.id} style={styles.orderCard}>
        <View style={styles.cardHeader}>
          <View style={styles.userInfo}>
            <View style={styles.userIconBg}>
              <Icon name="calendar-account-outline" size={20} color="#FDB022" />
            </View>
            <Text style={styles.userName} numberOfLines={1}>
              {booking.customerName || booking.user?.name || 'Customer'}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColor(booking.status) },
              ]}
            >
              <Text style={styles.statusBadgeText}>
                {statusToLabel(booking.status)}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.detailsContainer}>
          <Text style={styles.detailLabel}>
            Booking ID : <Text style={styles.detailValue}>#{booking.id}</Text>
          </Text>
          <Text style={styles.detailLabel}>
            Date :{' '}
            <Text style={styles.detailValue}>
              {formatBookingDate(booking.bookingDate)}
            </Text>
          </Text>
          <Text style={styles.detailLabel}>
            Persons : <Text style={styles.detailValue}>{booking.persons}</Text>
          </Text>
          <Text style={styles.detailLabel}>
            Phone : <Text style={styles.detailValue}>{booking.customerPhone}</Text>
          </Text>
          <Text style={styles.itemsText} numberOfLines={3}>
            Address: {booking.customerAddress}
          </Text>
        </View>

        <View style={styles.buttonRow}>
          {isPending ? (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.rejectBtn]}
                onPress={() => updateBooking(booking, 'cancelled')}
                disabled={isUpdating}
              >
                <Text style={styles.btnText}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.acceptBtn]}
                onPress={() => updateBooking(booking, 'confirmed')}
                disabled={isUpdating}
              >
                {isUpdating ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Text style={styles.btnText}>Accept</Text>
                )}
              </TouchableOpacity>
            </>
          ) : isInProgress ? (
            <TouchableOpacity
              style={[styles.actionButton, styles.completeBtn]}
              onPress={() => updateBooking(booking, 'completed')}
              disabled={isUpdating}
            >
              <Text style={styles.btnText}>Complete</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    );
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
          {orderScope === 'user' ? (
            <TouchableOpacity
              style={[
                styles.liveOrderBtn,
                activeTab === 'Pending' && styles.liveOrderBtnActive,
              ]}
              onPress={() => setActiveTab('Pending')}
              activeOpacity={0.75}
            >
              <View
                style={[
                  styles.orangeCircle,
                  activeTab === 'Pending' && styles.orangeCircleOnLiveActive,
                ]}
              >
                <View
                  style={[
                    styles.innerPlay,
                    activeTab === 'Pending' && styles.innerPlayOnLiveActive,
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.liveOrderBtnText,
                  activeTab === 'Pending' && styles.liveOrderBtnTextActive,
                ]}
                numberOfLines={1}
              >
                Live Order
              </Text>
            </TouchableOpacity>
          ) : (
            <View />
          )}
        </View>
        {isOwnerOrAdmin ? (
          <View style={styles.orderModeRow}>
            <TouchableOpacity
              style={[
                styles.orderModePill,
                orderScope === 'user' && styles.orderModePillActive,
              ]}
              onPress={() => {
                setOrderScope('user');
                setActiveTab('All');
              }}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.orderModeText,
                  orderScope === 'user' && styles.orderModeTextActive,
                ]}
              >
                User Orders
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.orderModePill,
                orderScope === 'own' && styles.orderModePillActive,
              ]}
              onPress={() => {
                setOrderScope('own');
                setActiveTab('All');
              }}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.orderModeText,
                  orderScope === 'own' && styles.orderModeTextActive,
                ]}
              >
                Own Orders
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.orderModePill,
                orderScope === 'booking' && styles.orderModePillActive,
              ]}
              onPress={() => {
                setOrderScope('booking');
                setActiveTab('All');
              }}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.orderModeText,
                  orderScope === 'booking' && styles.orderModeTextActive,
                ]}
              >
                Booking
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {orderScope === 'user' || orderScope === 'booking' ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator
            bounces
            alwaysBounceHorizontal
            nestedScrollEnabled
            style={styles.tabBarScroll}
            contentContainerStyle={styles.tabBarRow}
          >
            {statusTabs.map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabItem,
                  activeTab === tab && styles.activeTabItem,
                ]}
                activeOpacity={0.85}
              >
                <Text
                  style={[
                    styles.tabText,
                    activeTab === tab && styles.activeTabText,
                  ]}
                  numberOfLines={1}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}
      </SafeAreaView>

      {orderScope === 'user' || orderScope === 'booking' ? (
        <CompleteDateFilterRow
          filterId={completeDateFilter}
          onFilterChange={setCompleteDateFilter}
          customDate={completeCustomDate}
          onCustomDateChange={setCompleteCustomDate}
        />
      ) : null}

      {orderScope === 'own' ? (
        <OrderListScreen
          navigation={navigation}
          route={{ params: { forceCustomerScope: true, embedded: true } }}
        />
      ) : loading ? (
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
              <Text style={styles.emptyText}>
                {activeTab === 'All'
                  ? orderScope === 'booking'
                    ? 'No bookings yet'
                    : 'No orders yet'
                  : activeTab === 'Pending'
                  ? orderScope === 'booking'
                    ? 'No pending bookings'
                    : 'No pending orders'
                  : activeTab === 'Preparing'
                  ? 'No orders preparing'
                  : activeTab === 'In Progress'
                  ? orderScope === 'booking'
                    ? 'No accepted bookings'
                    : 'No orders in progress'
                  : activeTab === 'Complete'
                  ? orderScope === 'booking'
                    ? 'No completed bookings yet'
                    : 'No completed orders yet'
                  : activeTab === 'Rejected'
                  ? orderScope === 'booking'
                    ? 'No rejected bookings'
                    : 'No rejected orders'
                  : 'No orders in this tab'}
              </Text>
            </View>
          ) : (
            orderScope === 'booking' ? (
              orders.map(renderBookingCard)
            ) : (
            orders.map(order => {
              const customerName =
                orderScope === 'own'
                  ? order.owner?.nickname ||
                    order.owner?.name ||
                    order.owner?.email ||
                    'Restaurant'
                  : order.user?.name || order.user?.email || 'Customer';
              const isUpdating = updatingId === order.id;
              const orderStatus = String(order.status || '').toLowerCase();
              const isPending = orderStatus === 'pending';
              const isPickupOrder = isPickupFulfillment(order.fulfillmentType);
              return (
                <View key={order.id} style={styles.orderCard}>
                  <View style={styles.cardHeader}>
                    <View style={styles.userInfo}>
                      <View style={styles.userIconBg}>
                        {(() => {
                          const photo =
                            orderScope === 'own'
                              ? order.owner?.photos?.[0]
                              : order.user?.photos?.[0];
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
                    {canAcceptReject &&
                    orderScope === 'user' &&
                    activeTab === 'Pending' &&
                    isPending ? (
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
                    ) : canAcceptReject &&
                      orderScope === 'user' &&
                      activeTab === 'Preparing' &&
                      isPickupOrder &&
                      orderStatus === 'preparing' ? (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.acceptBtn]}
                        onPress={() => handleMarkReady(order)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={styles.btnText}>Ready</Text>
                        )}
                      </TouchableOpacity>
                    ) : canAcceptReject &&
                      orderScope === 'user' &&
                      activeTab === 'In Progress' &&
                      isPickupOrder &&
                      orderStatus === 'ready' ? (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.completeBtn]}
                        onPress={() => handleComplete(order)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={styles.btnText}>Complete</Text>
                        )}
                      </TouchableOpacity>
                    ) : canAcceptReject &&
                      orderScope === 'user' &&
                      activeTab === 'In Progress' &&
                      !isPickupOrder &&
                      orderStatus === 'delivery_complete' ? (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.completeBtn]}
                        onPress={() => handleComplete(order)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={styles.btnText}>Complete</Text>
                        )}
                      </TouchableOpacity>
                    ) : canAcceptReject &&
                      orderScope === 'user' &&
                      activeTab === 'In Progress' &&
                      !isPickupOrder &&
                      orderStatus === 'rider_accepted' ? (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.acceptBtn]}
                        onPress={() => handleStartDelivery(order)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color="white" />
                        ) : (
                          <Text style={styles.btnText}>Start</Text>
                        )}
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              );
            })
            )
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
  orderModeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingBottom: 8,
    gap: 8,
  },
  orderModePill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingVertical: 7,
    alignItems: 'center',
  },
  orderModePillActive: {
    backgroundColor: '#FFF4EB',
    borderColor: '#FDB022',
  },
  orderModeText: {
    color: '#667085',
    fontSize: 13,
    fontWeight: '600',
  },
  orderModeTextActive: {
    color: '#B54708',
  },
  liveOrderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    backgroundColor: '#fff',
    flexShrink: 0,
    maxWidth: '58%',
  },
  liveOrderBtnActive: {
    backgroundColor: '#FDB022',
    borderColor: '#FDB022',
  },
  liveOrderBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#667085',
    marginLeft: 6,
  },
  liveOrderBtnTextActive: {
    color: '#fff',
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
  orangeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FDB022',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 0,
  },
  orangeCircleOnLiveActive: {
    borderColor: '#fff',
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
  innerPlayOnLiveActive: {
    borderLeftColor: '#fff',
  },
  tabBarScroll: {
    width: '100%',
    marginTop: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E4E7EC',
  },
  tabBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingRight: 20,
  },
  tabItem: {
    flexShrink: 0,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginRight: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    borderRadius: 8,
  },
  activeTabItem: {
    backgroundColor: '#FDB022',
    borderBottomColor: '#FDB022',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tabText: {
    fontSize: 12,
    color: '#667085',
    fontWeight: '600',
    textAlign: 'center',
  },
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
  completeBtn: { backgroundColor: '#22c55e' },
  viewBtnText: { color: '#FDB022', fontWeight: '600' },
  btnText: { color: 'white', fontWeight: '600' },
});
