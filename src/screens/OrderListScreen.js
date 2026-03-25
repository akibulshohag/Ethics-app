import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import {
  getRestaurantOrders,
  updateRestaurantOrderStatus,
  getRestaurantOrderReview,
  upsertRestaurantOrderReview,
  deleteRestaurantOrderReview,
} from '../services/orderService';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

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

/** Backend status → display label (for user: Pending, Accepted, Rejected, etc.) */
const statusToLabel = status => {
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
};

const statusColor = status => {
  switch (String(status).toLowerCase()) {
    case 'completed':
      return COLORS.success ?? '#22c55e';
    case 'cancelled':
      return COLORS.error ?? '#ef4444';
    case 'confirmed':
    case 'preparing':
      return COLORS.primaryOrange;
    default:
      return COLORS.gray600;
  }
};

const OrderListScreen = ({ navigation }) => {
  const { user } = useSelector(state => state.app) || {};
  const role = String(user?.role || '').toLowerCase();
  const [orders, setOrders] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const isUser = role === 'user';
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewOrder, setReviewOrder] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewExistingId, setReviewExistingId] = useState(null);

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
        else setOrders(prev => [...prev, ...list]);
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

  useFocusEffect(
    useCallback(() => {
      if (user?.token) load(true);
    }, [user?.token, load]),
  );

  const onRefresh = () => load(true);

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
    role === 'owner' ||
    role === 'admin' ||
    role === 'superadmin' ||
    role === 'super_admin';

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
              { backgroundColor: statusColor(item.status) },
            ]}
          >
            <Text style={styles.badgeText}>{statusToLabel(item.status)}</Text>
          </View>
        </View>
        {isUser && (
          <Text style={styles.cardRestaurant} numberOfLines={2}>
            Restaurant: {ownerName}
          </Text>
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
          {itemCount} item(s) · {'€'} {Number(item.totalAmount).toFixed(2)}
        </Text>

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
                  currency: '€',
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
              <Text style={styles.emptyText}>No orders yet</Text>
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
