import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Modal,
  Image,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { CommonActions, useFocusEffect, useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useDispatch, useSelector } from 'react-redux';
import {
  getRestaurantOrders,
  updateRestaurantOrderStatus,
  rejectRiderAssignment,
  listRiderReviews,
} from '../services/orderService';
import { appSetUser, clearBrowseLocation } from '../redux/actions/appSlice';
import { getChannelProfile } from '../services/channelService';
import { safeImageUri } from '../utils/helper';
import {
  orderStatusLabel,
  RIDER_ASSIGNED_TAB,
  RIDER_IN_PROGRESS_TAB,
} from '../utils/orderStatus';
import CompleteDateFilterRow from '../components/CompleteDateFilterRow';
import {
  isRiderCompleteStatus,
  matchesCompleteDateFilter,
} from '../utils/orderCompleteDateFilter';

const TABS = ['All', 'Assigned', 'In Progress', 'Complete', 'Rejected'];

function formatItems(items) {
  if (!Array.isArray(items) || items.length === 0) return 'No items';
  return items
    .map(i => `${i.itemName || 'Item'} x ${i.quantity || 1}`)
    .join(', ');
}

function isGeneratedAvatar(uri) {
  return String(uri || '').includes('ui-avatars.com');
}

function resolveRiderAvatarUri(user, profile) {
  const fromChannel = profile?.channelAvatar;
  if (fromChannel && !isGeneratedAvatar(fromChannel)) {
    return safeImageUri(fromChannel);
  }

  const raw =
    Array.isArray(user?.photos) && user.photos.length > 0 ? user.photos[0] : null;
  if (raw) {
    const src =
      typeof raw === 'string'
        ? raw
        : raw?.src || raw?.uri || raw?.url;
    if (src && String(src).trim()) {
      return safeImageUri(src);
    }
  }

  if (fromChannel) return safeImageUri(fromChannel);

  const name = user?.name || user?.nickname || user?.email || 'Rider';
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    name,
  )}&background=F5A623&color=fff`;
}

export default function RiderDashboardScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const user = useSelector(s => s?.app?.user);
  const [activeTab, setActiveTab] = useState('All');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [riderProfile, setRiderProfile] = useState(null);
  const [profileAvatarUri, setProfileAvatarUri] = useState(() =>
    resolveRiderAvatarUri(user, null),
  );
  const [completeDateFilter, setCompleteDateFilter] = useState('all');
  const [completeCustomDate, setCompleteCustomDate] = useState(null);
  const [riderReviewStats, setRiderReviewStats] = useState({
    avgRating: null,
    reviewCount: 0,
  });
  const [reviewsByOrderId, setReviewsByOrderId] = useState({});

  const riderName =
    riderProfile?.name ||
    riderProfile?.nickname ||
    user?.name ||
    user?.nickname ||
    user?.email ||
    'Rider';
  const riderEmail = riderProfile?.email || user?.email || '';
  const riderPhone = riderProfile?.phone || user?.phone || '';
  const riderAddress = riderProfile?.address || user?.address || '';

  const loadData = useCallback(
    async ({ showLoader = false } = {}) => {
      const token = user?.token;
      const userId = user?.id;
      if (!token) {
        setOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }
      if (showLoader) setLoading(true);
      try {
        const { store } = require('../redux');
        const currentUser = store.getState()?.app?.user || user;
        const profilePromise = userId
          ? getChannelProfile(userId, userId).catch(() => null)
          : Promise.resolve(null);
        const [ordersRes, profile, reviewsRes] = await Promise.all([
          getRestaurantOrders(token, { scope: 'rider', limit: 100 }),
          profilePromise,
          listRiderReviews(token, { perPage: 100 }).catch(() => ({
            items: [],
            avgRating: null,
            reviewCount: 0,
          })),
        ]);
        const ordersList = ordersRes?.orders ?? [];
        setOrders(ordersList);
        const reviewItems = reviewsRes?.items ?? [];
        const reviewMap = {};
        reviewItems.forEach(r => {
          if (r?.orderId) reviewMap[r.orderId] = r;
        });
        setReviewsByOrderId(reviewMap);
        setRiderReviewStats({
          avgRating: reviewsRes?.avgRating ?? null,
          reviewCount: reviewsRes?.reviewCount ?? reviewItems.length,
        });

        if (profile) {
          setRiderProfile(profile);
          const nextAvatar = resolveRiderAvatarUri(currentUser, profile);
          setProfileAvatarUri(nextAvatar);
          const uploadedAvatar =
            profile.channelAvatar && !isGeneratedAvatar(profile.channelAvatar);
          if (uploadedAvatar) {
            const existingRaw = currentUser?.photos?.[0];
            const existingSrc =
              typeof existingRaw === 'string'
                ? existingRaw
                : existingRaw?.src || existingRaw?.uri;
            if (existingSrc !== profile.channelAvatar) {
              dispatch(
                appSetUser({
                  ...currentUser,
                  name: profile.name ?? currentUser.name,
                  nickname: profile.nickname ?? currentUser.nickname,
                  phone: profile.phone ?? currentUser.phone,
                  address: profile.address ?? currentUser.address,
                  photos: [{ title: 'avatar', src: profile.channelAvatar }],
                }),
              );
            }
          }
        } else {
          setProfileAvatarUri(resolveRiderAvatarUri(currentUser, null));
        }
      } catch {
        setOrders([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.token, user?.id, dispatch],
  );

  useFocusEffect(
    useCallback(() => {
      loadData({ showLoader: true });
    }, [user?.token, user?.id, loadData]),
  );

  const filtered = orders.filter(o => {
    if (
      !matchesCompleteDateFilter(o, completeDateFilter, completeCustomDate)
    ) {
      return false;
    }
    const s = String(o.status || '').toLowerCase();
    if (activeTab === 'All') return true;
    if (activeTab === 'Assigned') return RIDER_ASSIGNED_TAB.includes(s);
    if (activeTab === 'In Progress') return RIDER_IN_PROGRESS_TAB.includes(s);
    if (activeTab === 'Complete') return isRiderCompleteStatus(s);
    if (activeTab === 'Rejected') return s === 'cancelled';
    return true;
  });

  const displayCounts = useMemo(() => {
    const inRange = orders.filter(o =>
      matchesCompleteDateFilter(o, completeDateFilter, completeCustomDate),
    );
    return {
      pending: inRange.filter(o =>
        RIDER_ASSIGNED_TAB.includes(String(o.status || '').toLowerCase()),
      ).length,
      inProgress: inRange.filter(o =>
        RIDER_IN_PROGRESS_TAB.includes(String(o.status || '').toLowerCase()),
      ).length,
      completed: inRange.filter(o =>
        isRiderCompleteStatus(String(o.status || '').toLowerCase()),
      ).length,
      rejected: inRange.filter(
        o => String(o.status || '').toLowerCase() === 'cancelled',
      ).length,
    };
  }, [orders, completeDateFilter, completeCustomDate]);

  const confirmStatusUpdate = (order, nextStatus, title, message) => {
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          setUpdatingId(order.id);
          try {
            await updateRestaurantOrderStatus(user.token, order.id, nextStatus);
            if (nextStatus === 'rider_accepted') setActiveTab('In Progress');
            if (nextStatus === 'delivery_complete') setActiveTab('Complete');
            if (nextStatus === 'completed') setActiveTab('Complete');
            await loadData({ showLoader: false });
          } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to update order');
          } finally {
            setUpdatingId(null);
          }
        },
      },
    ]);
  };

  const handleAccept = order => {
    confirmStatusUpdate(
      order,
      'rider_accepted',
      'Accept delivery',
      'Accept this delivery assignment?',
    );
  };

  const handleReject = order => {
    Alert.alert(
      'Reject delivery',
      'Decline this assignment? The restaurant can assign another rider.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setUpdatingId(order.id);
            try {
              await rejectRiderAssignment(user.token, order.id);
              await loadData({ showLoader: false });
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to reject assignment');
            } finally {
              setUpdatingId(null);
            }
          },
        },
      ],
    );
  };

  const handleDeliveryComplete = order => {
    confirmStatusUpdate(
      order,
      'delivery_complete',
      'Delivery complete',
      'Mark this delivery as complete? The restaurant owner will finalize the order.',
    );
  };

  const openOrder = order => {
    navigation.navigate('OrderDetailsScreen', {
      orderId: order.id,
      order,
    });
  };

  const openChat = (order, partnerId, partnerName, partnerAvatar) => {
    if (!partnerId) return;
    navigation.navigate('ChatScreen', {
      partnerId,
      partnerName: partnerName || 'Customer',
      partnerAvatar,
      orderId: order.id,
      orderDetails: { itemName: order?.items?.[0]?.itemName },
    });
  };

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            setProfileModalVisible(false);
            dispatch(appSetUser(null));
            dispatch(clearBrowseLocation());
            const allKeys = await AsyncStorage.getAllKeys();
            const toRemove = allKeys.filter(
              k => k !== 'USER_LOCATION_SELECTION',
            );
            if (toRemove.length > 0) {
              await AsyncStorage.multiRemove(toRemove);
            }
            await AsyncStorage.removeItem('USER_LOCATION_SELECTION');
            let rootNav = navigation;
            while (rootNav?.getParent?.()) rootNav = rootNav.getParent();
            rootNav.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [
                  {
                    name: 'Root',
                    state: {
                      index: 0,
                      routes: [
                        {
                          name: 'Home1',
                          state: {
                            index: 1,
                            routes: [
                              { name: 'HomeOneScreen' },
                              { name: 'HomeSevenScreen' },
                            ],
                          },
                        },
                      ],
                    },
                  },
                ],
              }),
            );
          } catch (e) {
            Alert.alert('Error', 'Failed to log out. Please try again.');
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <View style={styles.headerTextWrap}>
            <Text style={styles.headerTitle}>Rider Dashboard</Text>
            <Text style={styles.headerSub}>
              {riderName}
              {riderReviewStats.reviewCount > 0 &&
              riderReviewStats.avgRating != null
                ? ` · ${riderReviewStats.avgRating}★ (${riderReviewStats.reviewCount})`
                : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.profileBtn}
            onPress={() => setProfileModalVisible(true)}
            activeOpacity={0.85}
          >
            <Image
              source={{ uri: profileAvatarUri }}
              style={styles.profileThumb}
            />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statCard, styles.statPending]}>
          <Text style={styles.statNum}>{displayCounts.pending ?? 0}</Text>
          <Text style={styles.statLabel}>Assigned</Text>
        </View>
        <View style={[styles.statCard, styles.statInProgress]}>
          <Text style={styles.statNum}>{displayCounts.inProgress ?? 0}</Text>
          <Text style={styles.statLabel}>In Progress</Text>
        </View>
        <View style={[styles.statCard, styles.statComplete]}>
          <Text style={styles.statNum}>{displayCounts.completed ?? 0}</Text>
          <Text style={styles.statLabel}>Complete</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        bounces
        alwaysBounceHorizontal
        nestedScrollEnabled
        style={styles.tabScroll}
        contentContainerStyle={styles.tabRow}
      >
        {TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabBtn, activeTab === tab && styles.tabBtnActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text
              style={[styles.tabText, activeTab === tab && styles.tabTextActive]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <CompleteDateFilterRow
        filterId={completeDateFilter}
        onFilterChange={setCompleteDateFilter}
        customDate={completeCustomDate}
        onCustomDateChange={setCompleteCustomDate}
      />

      <ScrollView
        style={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadData({ showLoader: false });
            }}
            colors={['#F5A623']}
          />
        }
      >
        {loading && orders.length === 0 ? (
          <ActivityIndicator style={{ marginTop: 40 }} color="#F5A623" />
        ) : filtered.length === 0 ? (
          <Text style={styles.empty}>
            {activeTab === 'All' ? 'No orders yet.' : 'No orders in this tab.'}
          </Text>
        ) : (
          filtered.map(order => {
            const customer = order.user || {};
            const customerName =
              customer.name || customer.nickname || customer.email || 'Customer';
            const status = String(order.status || '').toLowerCase();
            const canAccept = status === 'rider_assigned';
            const canComplete = status === 'out_for_delivery';
            const canChatCustomer =
              status === 'out_for_delivery' || status === 'delivery_complete';
            const isUpdating = updatingId === order.id;
            const orderReview =
              reviewsByOrderId[order.id] || order.riderReview || null;
            const showReview =
              isRiderCompleteStatus(status) && orderReview;
            return (
              <View key={order.id} style={styles.card}>
                <TouchableOpacity onPress={() => openOrder(order)} activeOpacity={0.85}>
                  <View style={styles.cardTop}>
                    <Text style={styles.orderId}>#{String(order.id).slice(0, 8)}</Text>
                    <Text style={styles.statusPill}>{orderStatusLabel(order.status)}</Text>
                  </View>
                  <Text style={styles.customerName}>{customerName}</Text>
                  <Text style={styles.items} numberOfLines={2}>
                    {formatItems(order.items)}
                  </Text>
                  <Text style={styles.address} numberOfLines={2}>
                    {order.deliveryAddress || '—'}
                  </Text>
                  <Text style={styles.total}>
                    £ {Number(order.totalAmount || 0).toFixed(2)}
                  </Text>
                  {showReview ? (
                    <View style={styles.reviewRow}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <Icon
                          key={`rv-${order.id}-${s}`}
                          name={
                            s <= Number(orderReview.rating)
                              ? 'star'
                              : 'star-outline'
                          }
                          size={14}
                          color={
                            s <= Number(orderReview.rating) ? '#F5A623' : '#CCC'
                          }
                        />
                      ))}
                      {orderReview.comment ? (
                        <Text style={styles.reviewSnippet} numberOfLines={1}>
                          {orderReview.comment}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </TouchableOpacity>
                <View style={styles.actions}>
                  {canChatCustomer ? (
                    <TouchableOpacity
                      style={styles.chatBtn}
                      onPress={() =>
                        openChat(
                          order,
                          order.userId,
                          customerName,
                          customer.photos?.[0],
                        )
                      }
                    >
                      <Icon name="message-text-outline" size={18} color="#F5A623" />
                      <Text style={styles.chatBtnText}>Chat customer</Text>
                    </TouchableOpacity>
                  ) : null}
                  {canAccept ? (
                    <View style={styles.assignActionsRow}>
                      <TouchableOpacity
                        style={[styles.rejectBtn, styles.assignActionBtn]}
                        onPress={() => handleReject(order)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={styles.rejectBtnText}>Reject</Text>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.acceptBtn, styles.assignActionBtn]}
                        onPress={() => handleAccept(order)}
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                          <Text style={styles.acceptBtnText}>Accept</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : null}
                  {canComplete ? (
                    <TouchableOpacity
                      style={styles.completeBtn}
                      onPress={() => handleDeliveryComplete(order)}
                      disabled={isUpdating}
                    >
                      {isUpdating ? (
                        <ActivityIndicator size="small" color="#FFF" />
                      ) : (
                        <Text style={styles.completeBtnText}>Delivery Complete</Text>
                      )}
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={profileModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setProfileModalVisible(false)}
        >
          <Pressable style={styles.profileModalCard} onPress={() => {}}>
            <View style={styles.profileModalHeader}>
              <Text style={styles.profileModalTitle}>My profile</Text>
              <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
            <View style={styles.profileModalBody}>
              <Image
                source={{ uri: profileAvatarUri }}
                style={styles.profileModalAvatar}
              />
              <Text style={styles.profileModalName}>{riderName}</Text>
              <Text style={styles.profileModalRole}>Delivery rider</Text>
              {riderEmail ? (
                <View style={styles.profileInfoRow}>
                  <Icon name="email-outline" size={18} color="#666" />
                  <Text style={styles.profileInfoText}>{riderEmail}</Text>
                </View>
              ) : null}
              {riderPhone ? (
                <View style={styles.profileInfoRow}>
                  <Icon name="phone-outline" size={18} color="#666" />
                  <Text style={styles.profileInfoText}>{riderPhone}</Text>
                </View>
              ) : null}
              {riderAddress ? (
                <View style={styles.profileInfoRow}>
                  <Icon name="map-marker-outline" size={18} color="#666" />
                  <Text style={styles.profileInfoText}>{riderAddress}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Icon name="logout" size={20} color="#E53935" />
              <Text style={styles.logoutBtnText}>Log out</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTextWrap: { flex: 1, paddingRight: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#111' },
  headerSub: { fontSize: 13, color: '#666', marginTop: 4 },
  profileBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileThumb: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EEE',
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  profileModalCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
  },
  profileModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  profileModalTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  profileModalBody: { alignItems: 'center', paddingVertical: 8 },
  profileModalAvatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EEE',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  profileModalName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111',
    textAlign: 'center',
  },
  profileModalRole: {
    fontSize: 13,
    color: '#F5A623',
    fontWeight: '600',
    marginTop: 4,
    marginBottom: 16,
  },
  profileInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  profileInfoText: {
    flex: 1,
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#FFEBEE',
  },
  logoutBtnText: { color: '#E53935', fontWeight: '700', fontSize: 15 },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    gap: 8,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  statPending: { backgroundColor: '#FFF8E1' },
  statInProgress: { backgroundColor: '#E3F2FD' },
  statComplete: { backgroundColor: '#E8F5E9' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#111' },
  statLabel: { fontSize: 12, color: '#555', marginTop: 2 },
  tabScroll: { maxHeight: 48, marginBottom: 8, width: '100%' },
  tabRow: {
    paddingHorizontal: 12,
    paddingRight: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  tabBtn: {
    flexShrink: 0,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F3F3',
  },
  tabBtnActive: { backgroundColor: '#F5A623' },
  tabText: { fontSize: 13, color: '#555', fontWeight: '600' },
  tabTextActive: { color: '#FFF' },
  list: { flex: 1, paddingHorizontal: 12 },
  empty: { textAlign: 'center', color: '#888', marginTop: 40 },
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: { fontSize: 12, color: '#888' },
  statusPill: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F5A623',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
    marginTop: 8,
  },
  items: { fontSize: 13, color: '#444', marginTop: 4 },
  address: { fontSize: 12, color: '#666', marginTop: 6 },
  total: { fontSize: 15, fontWeight: '700', color: '#111', marginTop: 8 },
  reviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 2,
    marginTop: 8,
  },
  reviewSnippet: {
    flex: 1,
    marginLeft: 6,
    fontSize: 12,
    color: '#666',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  chatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F5A623',
  },
  chatBtnText: { color: '#F5A623', fontWeight: '600', fontSize: 13 },
  acceptBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 88,
    alignItems: 'center',
  },
  acceptBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  assignActionsRow: {
    flex: 1,
    flexDirection: 'row',
    gap: 8,
  },
  assignActionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  rejectBtn: {
    backgroundColor: '#F75555',
    paddingHorizontal: 14,
    borderRadius: 8,
    minWidth: 88,
    alignItems: 'center',
  },
  rejectBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  startBtn: {
    backgroundColor: '#2563eb',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 88,
    alignItems: 'center',
  },
  startBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
  completeBtn: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 120,
    alignItems: 'center',
  },
  completeBtnText: { color: '#FFF', fontWeight: '700', fontSize: 13 },
});
