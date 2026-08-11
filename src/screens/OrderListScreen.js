import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Pressable,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import {
  getRestaurantOrders,
  updateRestaurantOrderStatus,
  getRestaurantOrderReview,
  upsertRestaurantOrderReview,
  deleteRestaurantOrderReview,
} from '../services/orderService';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { safeImageUri } from '../utils/helper';
import {
  orderStatusLabel,
  orderStatusColor,
  customerOrderStatusLabel,
  customerOrderStatusColor,
  CUSTOMER_IN_PROGRESS_STATUSES,
  isDeliveryFulfillment,
} from '../utils/orderStatus';
import CompleteDateFilterRow from '../components/CompleteDateFilterRow';
import { matchesCompleteDateFilter } from '../utils/orderCompleteDateFilter';

const formatDate = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const pad = n => String(n).padStart(2, '0');
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${date} ${time}`;
};


const OrderListScreen = ({ navigation, route: routeProp }) => {
  const routeHook = useRoute();
  const route = routeProp || routeHook;
  const { user } = useSelector(state => state.app) || {};
  const role = String(user?.role || '').toLowerCase();
  const forceCustomerScope = !!route?.params?.forceCustomerScope;
  const embedded = !!route?.params?.embedded;
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;
  const [activeTab, setActiveTab] = useState('All');
  const [completeDateFilter, setCompleteDateFilter] = useState('all');
  const [completeCustomDate, setCompleteCustomDate] = useState(null);
  const ORDER_TABS = ['All', 'Pending', 'In Progress', 'Complete', 'Rejected'];

  const isUser = role === 'user' || forceCustomerScope;
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewExistingId, setReviewExistingId] = useState(null);

  const title =
    forceCustomerScope
      ? 'My orders'
      : role === 'owner'
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
          ...(forceCustomerScope ? { scope: 'customer' } : {}),
        });
        const list = res?.orders || [];
        setTotal(res?.total ?? 0);
        if (isRefresh || p === 1) setOrders(list);
        else setOrders(prev => [...prev, ...list]);
      } catch (e) {
        if (p === 1) setOrders([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user?.token, page, forceCustomerScope],
  );

  useEffect(() => {
    load(true);
  }, [user?.token]);

  const ordersFocusAtRef = useRef(0);
  useFocusEffect(
    useCallback(() => {
      if (!user?.token) return;
      const now = Date.now();
      if (now - (ordersFocusAtRef.current || 0) < 15_000) return;
      ordersFocusAtRef.current = now;
      load(true);
    }, [user?.token, load]),
  );

  const onRefresh = () => load(true);

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (
        !matchesCompleteDateFilter(o, completeDateFilter, completeCustomDate)
      ) {
        return false;
      }
      const s = String(o?.status || '').toLowerCase();
      if (activeTab === 'All') return true;
      if (activeTab === 'Pending') return s === 'pending';
      if (activeTab === 'In Progress') return CUSTOMER_IN_PROGRESS_STATUSES.includes(s);
      if (activeTab === 'Complete') return s === 'completed';
      if (activeTab === 'Rejected') return s === 'cancelled';
      return true;
    });
  }, [orders, activeTab, completeDateFilter, completeCustomDate]);

  const updateStatus = async (orderId, newStatus) => {
    if (!user?.token) return;
    try {
      await updateRestaurantOrderStatus(user.token, orderId, newStatus);
      setOrders(prev =>
        prev.map(o => (o.id === orderId ? { ...o, status: newStatus } : o)),
      );
    } catch (e) {
      // optional: show alert
    }
  };

  const canUpdateStatus =
    !forceCustomerScope &&
    (role === 'owner' ||
    role === 'admin' ||
    role === 'superadmin' ||
      role === 'super_admin');

  const openReview = async order => {
    if (!user?.token) return;
    setReviewOrder(order);
    setReviewRating(0);
    setReviewComment('');
    setReviewExistingId(null);
    setReviewModalOpen(true);
    setReviewLoading(true);
    try {
      const existing = await getRestaurantOrderReview(user.token, order.id);
      if (existing && typeof existing === 'object') {
        setReviewExistingId(existing.id || '1');
        setReviewRating(Number(existing.rating) || 0);
        setReviewComment(existing.comment || '');
      }
    } catch (e) {
      // ignore (modal still usable)
    } finally {
      setReviewLoading(false);
    }
  };

  const submitReview = async () => {
    if (!user?.token || !reviewOrder?.id) return;
    if (!reviewRating || reviewRating < 1) {
      Alert.alert('Rating required', 'Please select a star rating first.');
      return;
    }
    setReviewSubmitting(true);
    try {
      await upsertRestaurantOrderReview(user.token, reviewOrder.id, {
        rating: reviewRating,
        comment: reviewComment,
      });
      setReviewModalOpen(false);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const confirmDeleteReview = () => {
    if (!user?.token || !reviewOrder?.id) return;
    Alert.alert('Delete review', 'Remove your review for this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setReviewSubmitting(true);
          try {
            await deleteRestaurantOrderReview(user.token, reviewOrder.id);
            setReviewExistingId(null);
            setReviewRating(0);
            setReviewComment('');
            setReviewModalOpen(false);
          } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to delete review');
          } finally {
            setReviewSubmitting(false);
          }
        },
      },
    ]);
  };

  const renderOrder = ({ item }) => {
    const customerName = item.user?.name || item.user?.email || 'Customer';
    const ownerName =
      item.owner?.nickname ||
      item.owner?.name ||
      item.owner?.email ||
      'Restaurant';
    const ownerId = item?.ownerId || item?.owner?.id || null;
    const ownerAvatarUri = safeImageUri(
      item?.owner?.photos?.[0],
      `https://ui-avatars.com/api/?name=${encodeURIComponent(
        ownerName,
      )}&background=333&color=fff`,
    );
    const itemCount = (item.items || []).reduce(
      (s, i) => s + (i.quantity || 0),
      0,
    );

    return (
      <View style={styles.card}>
        <View style={styles.cardRow}>
          <View style={styles.cardIdWrap}>
            <Text style={styles.cardIdLabel}>Order ID</Text>
            <Text style={styles.cardId} selectable>
              #{String(item.id)}
            </Text>
          </View>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: isUser
                  ? customerOrderStatusColor(item.status, item.fulfillmentType)
                  : orderStatusColor(item.status),
              },
            ]}
          >
            <Text style={styles.badgeText}>
              {isUser
                ? customerOrderStatusLabel(item.status, item.fulfillmentType)
                : orderStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        {isUser && (
          <TouchableOpacity
            style={styles.cardRestaurantRow}
            activeOpacity={0.8}
            disabled={!ownerId}
            onPress={() =>
              ownerId && navigation.navigate('UserViewsScreen', { userId: ownerId })
            }
          >
            <Image source={{ uri: ownerAvatarUri }} style={styles.cardRestaurantAvatar} />
            <Text style={styles.cardRestaurant} numberOfLines={2}>
              Restaurant: {ownerName}
            </Text>
          </TouchableOpacity>
        )}
        {role !== 'user' && (
          <Text style={styles.cardCustomer}>
            {role === 'owner'
              ? `Customer: ${customerName}`
              : `${customerName} → ${ownerName}`}
          </Text>
        )}
        <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.cardItems}>
          {itemCount} item(s) · {'£'} {Number(item.totalAmount).toFixed(2)}
        </Text>
        {isUser &&
        item?.rider &&
        String(item.status || '').toLowerCase() === 'out_for_delivery' ? (
          <View style={styles.cardRiderRow}>
            <Icon name="bike-fast" size={16} color="#2563eb" />
            <Text style={styles.cardRiderText} numberOfLines={1}>
              Rider on the way:{' '}
              {item.rider.nickname ||
                item.rider.name ||
                item.rider.email ||
                'Assigned'}
            </Text>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('ChatScreen', {
                  partnerId: item.riderId || item.rider.id,
                  partnerName:
                    item.rider.nickname ||
                    item.rider.name ||
                    item.rider.email ||
                    'Rider',
                  partnerAvatar: item.rider.photos?.[0],
                  orderId: item.id,
                })
              }
            >
              <Icon name="message-text-outline" size={18} color="#F5A623" />
            </TouchableOpacity>
          </View>
        ) : null}

        {isUser && (
          <View style={styles.userActionsRow}>
            <TouchableOpacity
              style={[styles.userActionBtn, styles.userActionBtnOutline]}
              onPress={() =>
                navigation.navigate('OrderDetailsScreen', {
                  orderId: item.id,
                  order: item,
                })
              }
            >
              <Text
                style={[styles.userActionText, styles.userActionTextOutline]}
              >
                Order Details
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.userActionBtn, styles.userActionBtnPrimary]}
              onPress={() => {
                const cartItems = (item.items || []).map(it => ({
                  menuItemId: it.menuItemId,
                  itemName: it.itemName,
                  price: it.unitPrice,
                  quantity: it.quantity,
                  currency: '£',
                  imageUrl: null,
                }));
                navigation.navigate('CartDetailsScreen', {
                  ownerId: item.ownerId,
                  ownerName,
                  items: cartItems,
                });
              }}
            >
              <Text
                style={[styles.userActionText, styles.userActionTextPrimary]}
              >
                Again Order
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.userActionBtn, styles.userActionBtnOutline]}
              onPress={() => openReview(item)}
            >
              <Text
                style={[styles.userActionText, styles.userActionTextOutline]}
              >
                Review Order
              </Text>
            </TouchableOpacity>
            {String(item.status || '').toLowerCase() === 'completed' &&
            item?.riderId &&
            isDeliveryFulfillment(item.fulfillmentType) ? (
              <TouchableOpacity
                style={[styles.userActionBtn, styles.userActionBtnOutline]}
                onPress={() =>
                  navigation.navigate('OrderDetailsScreen', {
                    orderId: item.id,
                    order: item,
                  })
                }
              >
                <Text
                  style={[styles.userActionText, styles.userActionTextOutline]}
                >
                  Review Rider
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {canUpdateStatus &&
          item.status !== 'completed' &&
          item.status !== 'cancelled' && (
            <View style={styles.statusRow}>
              {['confirmed', 'preparing', 'completed'].map(s => (
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
        {/* <TouchableOpacity
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
          <Icon
            name="message-text-outline"
            size={20}
            color={COLORS.primaryOrange}
          />
          <Text style={styles.chatBtnText}>Chat about this order</Text>
        </TouchableOpacity> */}
      </View>
    );
  };

  if (!user?.token) {
    if (embedded) {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Sign in to view orders.</Text>
        </View>
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
        <View style={styles.centered}>
          <Text style={styles.emptyText}>Sign in to view orders.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const RootWrapper = embedded ? View : SafeAreaView;
  const rootWrapperProps = embedded
    ? { style: styles.embeddedContainer }
    : { style: styles.container, edges: ['top', 'bottom'] };

  return (
    <RootWrapper {...rootWrapperProps}>
      {!embedded ? (
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title}</Text>
          <View style={{ width: 24 }} />
        </View>
      ) : null}
      <View style={styles.tabsRow}>
        {ORDER_TABS.map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabItem, activeTab === tab && styles.tabItemActive]}
            onPress={() => setActiveTab(tab)}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <CompleteDateFilterRow
        filterId={completeDateFilter}
        onFilterChange={setCompleteDateFilter}
        customDate={completeCustomDate}
        onCustomDateChange={setCompleteCustomDate}
      />
      {loading && orders.length === 0 ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.primaryOrange} />
        </View>
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={o => o.id}
          renderItem={renderOrder}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primaryOrange]}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <Icon name="cart-outline" size={64} color={COLORS.gray400} />
              <Text style={styles.emptyText}>
                {activeTab === 'All' ? 'No orders yet' : `No ${activeTab} orders`}
              </Text>
            </View>
          }
        />
      )}

      <Modal
        visible={reviewModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() =>
          reviewSubmitting ? null : setReviewModalOpen(false)
        }
      >
        <Pressable
          style={styles.reviewOverlay}
          onPress={() => (reviewSubmitting ? null : setReviewModalOpen(false))}
        >
          <Pressable
            style={styles.reviewSheet}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.reviewHandle} />
            <Text style={styles.reviewTitle}>Review Order</Text>
            <Text style={styles.reviewSubTitle} selectable numberOfLines={2}>
              #{String(reviewOrder?.id || '')}
            </Text>

            {reviewLoading ? (
              <View style={styles.reviewLoadingRow}>
                <ActivityIndicator size="small" color={COLORS.primaryOrange} />
                <Text style={styles.reviewLoadingText}>Loading…</Text>
              </View>
            ) : (
              <>
                <View style={styles.reviewStarsRow}>
                  {[1, 2, 3, 4, 5].map(s => (
                    <TouchableOpacity
                      key={s}
                      onPress={() =>
                        reviewSubmitting ? null : setReviewRating(s)
                      }
                      activeOpacity={0.7}
                      disabled={reviewSubmitting}
                      style={styles.reviewStarBtn}
                    >
                      <Icon
                        name={s <= reviewRating ? 'star' : 'star-outline'}
                        size={30}
                        color={
                          s <= reviewRating
                            ? COLORS.primaryOrange
                            : COLORS.gray400
                        }
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  style={styles.reviewInput}
                  placeholder="Write a comment (optional)"
                  placeholderTextColor={COLORS.gray400}
                  value={reviewComment}
                  onChangeText={setReviewComment}
                  editable={!reviewSubmitting}
                  multiline
                />

                <View style={styles.reviewBtnsRow}>
                  {reviewExistingId ? (
                    <TouchableOpacity
                      style={[styles.reviewBtn, styles.reviewBtnDanger]}
                      onPress={confirmDeleteReview}
                      disabled={reviewSubmitting}
                    >
                      <Text style={styles.reviewBtnText}>Delete</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flex: 1 }} />
                  )}
                  <TouchableOpacity
                    style={[styles.reviewBtn, styles.reviewBtnPrimary]}
                    onPress={submitReview}
                    disabled={reviewSubmitting}
                  >
                    {reviewSubmitting ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.reviewBtnText}>Submit</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </RootWrapper>
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
  tabsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray100,
    backgroundColor: COLORS.white,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: COLORS.primaryOrange,
    backgroundColor: '#FFF7ED',
  },
  tabText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray500,
    textAlign: 'center',
  },
  tabTextActive: {
    color: COLORS.primaryOrange,
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
    alignItems: 'flex-start',
    marginBottom: 6,
    gap: 8,
  },
  cardIdWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardIdLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.gray500,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  cardId: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.gray700,
  },
  cardRestaurant: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginBottom: 4,
    flex: 1,
  },
  cardRestaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  cardRestaurantAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
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
  cardRiderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  cardRiderText: { flex: 1, fontSize: 13, color: '#444', fontWeight: '600' },
  userActionsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  userActionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userActionBtnPrimary: {
    backgroundColor: COLORS.primaryOrange,
  },
  userActionBtnOutline: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primaryOrange,
  },
  userActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  userActionTextPrimary: {
    color: COLORS.white,
  },
  userActionTextOutline: {
    color: COLORS.primaryOrange,
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

  // Review modal
  reviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  reviewSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: SPACING.md,
  },
  reviewHandle: {
    alignSelf: 'center',
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.gray200,
    marginBottom: 10,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  reviewSubTitle: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.gray500,
    marginBottom: 12,
  },
  reviewStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  reviewStarBtn: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: COLORS.gray200,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    minHeight: 90,
    color: COLORS.textPrimary,
    textAlignVertical: 'top',
  },
  reviewBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  reviewBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtnPrimary: {
    backgroundColor: COLORS.primaryOrange,
  },
  reviewBtnDanger: {
    backgroundColor: COLORS.error ?? '#ef4444',
  },
  reviewBtnText: {
    color: '#FFF',
    fontWeight: '800',
  },
  reviewLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  reviewLoadingText: {
    color: COLORS.gray600,
    fontWeight: '600',
  },
});

export default OrderListScreen;
