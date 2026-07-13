import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Linking,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  TextInput,
  NativeModules,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  getRestaurantOrderById,
  updateRestaurantOrderStatus,
  assignRiderToOrder,
  rejectRiderAssignment,
  getRestaurantOrderRiderReview,
  upsertRestaurantOrderRiderReview,
  deleteRestaurantOrderRiderReview,
} from '../services/orderService';
import { getChannelProfile } from '../services/channelService';
import {
  autoPrintInvoiceIfEnabled,
  printReceiptOverWifi,
} from '../services/wifiPrinterService';
import {
  orderStatusColor,
  customerOrderStatusLabel,
  customerOrderStatusColor,
  isPickupFulfillment,
  isDeliveryFulfillment,
} from '../utils/orderStatus';
import { listOwnerRiders } from '../services/riderService';
import { safeImageUri } from '../utils/helper';
import ReactNativeBlobUtil from 'react-native-blob-util';

const ORDER_NOTE_MARKER = '||NOTE||';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())} ${
    d.getHours() >= 12 ? 'pm' : 'am'
  }, ${d.getDate()} ${
    [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ][d.getMonth()]
  } ${d.getFullYear()}`;
}

const escapeHtml = value =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export default function OrderDetailsScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const user = useSelector(s => s?.app?.user);
  const role = String(user?.role || '').toLowerCase();
  const canAcceptReject = [
    'owner',
    'admin',
    'superadmin',
    'super_admin',
  ].includes(role);
  const isRider = role === 'rider';
  const { orderId, order: orderParam } = route.params || {};
  const [order, setOrder] = useState(orderParam || null);
  const [loading, setLoading] = useState(!orderParam && !!orderId);
  const [updating, setUpdating] = useState(false);
  const [invoiceOptionsVisible, setInvoiceOptionsVisible] = useState(false);
  const [riders, setRiders] = useState([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [assigningRider, setAssigningRider] = useState(false);
  const [riderReviewModalVisible, setRiderReviewModalVisible] = useState(false);
  const [riderReviewLoading, setRiderReviewLoading] = useState(false);
  const [riderReviewSubmitting, setRiderReviewSubmitting] = useState(false);
  const [riderReview, setRiderReview] = useState(null);
  const [riderReviewRating, setRiderReviewRating] = useState(0);
  const [riderReviewComment, setRiderReviewComment] = useState('');

  useEffect(() => {
    if (orderParam) {
      setOrder(orderParam);
    }
    if (!orderId || !user?.token) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getRestaurantOrderById(user.token, orderId)
      .then(async data => {
        if (cancelled || !data) return;
        let nextOrder = data;
        const ownerDeliveryTime = String(data?.owner?.deliveryTime || '').trim();
        const ownerId = data?.ownerId || data?.owner?.id;
        if (!ownerDeliveryTime && ownerId) {
          const fromCurrentUser =
            ownerId === user?.id
              ? String(user?.deliveryTime || '').trim()
              : '';
          if (fromCurrentUser) {
            nextOrder = {
              ...data,
              owner: {
                ...data.owner,
                deliveryTime: fromCurrentUser,
                deliveryAreaKm:
                  data.owner?.deliveryAreaKm ?? user?.deliveryAreaKm ?? null,
              },
            };
          } else {
            try {
              const profile = await getChannelProfile(ownerId, user?.id);
              const profileDeliveryTime = String(
                profile?.deliveryTime || '',
              ).trim();
              if (profileDeliveryTime) {
                nextOrder = {
                  ...data,
                  owner: {
                    ...data.owner,
                    deliveryTime: profileDeliveryTime,
                    deliveryAreaKm:
                      data.owner?.deliveryAreaKm ??
                      profile?.deliveryAreaKm ??
                      null,
                  },
                };
              }
            } catch {
              // keep order without delivery time enrichment
            }
          }
        }
        setOrder(nextOrder);
        try {
          await autoPrintInvoiceIfEnabled({
            ...nextOrder,
            ownerName: nextOrder?.owner?.name || nextOrder?.ownerName,
            customerName: nextOrder?.user?.name || user?.name,
            customerPhone: nextOrder?.customerPhone || nextOrder?.user?.phone,
            items: nextOrder?.items || nextOrder?.orderItems,
          });
        } catch (_) {
          // optional auto-print when printer not configured
        }
      })
      .catch(() => {
        if (!cancelled && !orderParam) setOrder(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    orderId,
    user?.token,
    user?.id,
    user?.deliveryTime,
    user?.deliveryAreaKm,
  ]);

  const orderStatusEarly = String(order?.status || '').toLowerCase();
  const isPickupOrderEarly = isPickupFulfillment(order?.fulfillmentType);
  const isDeliveryOrderEarly = isDeliveryFulfillment(order?.fulfillmentType);
  const isCustomerEarly = order?.userId === user?.id;
  const isOrderOwnerEarly =
    order?.ownerId === user?.id || order?.owner?.id === user?.id;
  const canCustomerReviewRider =
    isCustomerEarly &&
    orderStatusEarly === 'completed' &&
    isDeliveryOrderEarly &&
    !!order?.riderId;
  const canRiderViewReview =
    isRider &&
    orderStatusEarly === 'completed' &&
    order?.riderId === user?.id;
  const shouldLoadRiderReview =
    isDeliveryOrderEarly &&
    orderStatusEarly === 'completed' &&
    !!order?.riderId;

  useEffect(() => {
    if (!order?.id || !user?.token) return;
    if (!shouldLoadRiderReview) {
      setRiderReview(null);
      return;
    }
    const embedded = order?.riderReview;
    if (embedded && typeof embedded === 'object') {
      setRiderReview(embedded);
      setRiderReviewRating(Number(embedded.rating) || 0);
      setRiderReviewComment(String(embedded.comment || ''));
      return;
    }
    let cancelled = false;
    setRiderReviewLoading(true);
    getRestaurantOrderRiderReview(user.token, order.id)
      .then(data => {
        if (cancelled) return;
        if (data && typeof data === 'object') {
          setRiderReview(data);
          setRiderReviewRating(Number(data.rating) || 0);
          setRiderReviewComment(String(data.comment || ''));
        } else {
          setRiderReview(null);
          setRiderReviewRating(0);
          setRiderReviewComment('');
        }
      })
      .catch(() => {
        if (!cancelled) setRiderReview(null);
      })
      .finally(() => {
        if (!cancelled) setRiderReviewLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    order?.id,
    order?.riderReview,
    user?.token,
    shouldLoadRiderReview,
  ]);

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

  const handleOwnerCall = () => {
    const ownerPhone = order?.owner?.phone || '';
    if (!ownerPhone) return;
    Linking.openURL(`tel:${String(ownerPhone).replace(/\s/g, '')}`);
  };

  const handleReject = () => {
    Alert.alert('Reject order', 'Cancel this order?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          setUpdating(true);
          try {
            await updateRestaurantOrderStatus(
              user.token,
              order.id,
              'cancelled',
            );
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
      const updated = await updateRestaurantOrderStatus(
        user.token,
        order.id,
        'preparing',
      );
      setOrder(updated);
      Alert.alert('Accepted', 'Order is now preparing.');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to accept order');
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
  const phone =
    order.customerPhone ||
    order.user?.phone ||
    order.user?.phoneNumber ||
    '';
  const avatarUri = safeImageUri(
    order.user?.photos?.[0],
    'https://i.pravatar.cc/150?u=user',
  );
  const ownerName =
    order?.owner?.nickname ||
    order?.owner?.name ||
    order?.owner?.email ||
    'Restaurant';
  const ownerPhone = order?.owner?.phone || '';
  const ownerPhotoRaw =
    Array.isArray(order?.owner?.photos) && order.owner.photos.length > 0
      ? order.owner.photos[0]
      : null;
  const ownerAvatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    ownerName,
  )}&background=333&color=fff`;
  const ownerAvatarUri = safeImageUri(ownerPhotoRaw, ownerAvatarFallback);

  const openOwnerChat = () => {
    const ownerId = order?.ownerId || order?.owner?.id;
    if (!ownerId) return;
    navigation.navigate('ChatScreen', {
      partnerId: ownerId,
      partnerName: ownerName,
      partnerAvatar: ownerPhotoRaw,
      orderId: order?.id,
      orderDetails: {
        itemName: order?.items?.[0]?.itemName,
        itemImage: null,
      },
    });
  };

  const openOwnerProfile = () => {
    const ownerId = order?.ownerId || order?.owner?.id;
    if (!ownerId) return;
    navigation.navigate('UserViewsScreen', { userId: ownerId });
  };

  const items = order.items || [];
  const itemsSubtotal = items.reduce((sum, item) => {
    const q = Number(item?.quantity || 0);
    const unit = Number(item?.unitPrice || 0);
    return sum + q * unit;
  }, 0);
  const taxCharge = Number(order?.taxCharge || 0);
  const totalAmount = Number(order.totalAmount || itemsSubtotal + taxCharge);
  const currency = '£';
  const displayOrderId = order.id ? `#${String(order.id)}` : '—';
  const orderStatus = String(order?.status || '').toLowerCase();
  const isPickupOrder = isPickupFulfillment(order?.fulfillmentType);
  const isDeliveryOrder = isDeliveryFulfillment(order?.fulfillmentType);
  const isPendingOrder = orderStatus === 'pending';
  const rawDeliveryAddress = String(order?.deliveryAddress || '');
  const hasNoteMarker = rawDeliveryAddress.includes(ORDER_NOTE_MARKER);
  const [deliveryAddressRaw, noteRaw] = hasNoteMarker
    ? rawDeliveryAddress.split(ORDER_NOTE_MARKER)
    : [rawDeliveryAddress, ''];
  const deliveryAddressText = String(deliveryAddressRaw || '').trim();
  const restaurantNoteText = String(noteRaw || '').trim();
  const ownerDeliveryTimeLabel = String(
    order?.owner?.deliveryTime ||
      (order?.ownerId === user?.id || order?.owner?.id === user?.id
        ? user?.deliveryTime
        : '') ||
      '',
  ).trim();
  const ownerDeliveryAreaKmRaw =
    order?.owner?.deliveryAreaKm ??
    (order?.ownerId === user?.id || order?.owner?.id === user?.id
      ? user?.deliveryAreaKm
      : null);
  const ownerDeliveryAreaKm =
    ownerDeliveryAreaKmRaw != null &&
    Number.isFinite(Number(ownerDeliveryAreaKmRaw))
      ? Number(ownerDeliveryAreaKmRaw)
      : null;
  const orderPlacedText = formatDate(order?.createdAt);
  const isOrderOwner =
    order?.ownerId === user?.id || order?.owner?.id === user?.id;
  const isCustomer = order?.userId === user?.id;
  const rider = order?.rider;
  const riderName =
    rider?.nickname || rider?.name || rider?.email || 'Rider';
  const riderPhotoRaw =
    Array.isArray(rider?.photos) && rider.photos.length > 0
      ? rider.photos[0]
      : null;
  const riderAvatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    riderName,
  )}&background=111&color=fff`;
  const riderAvatarUri = safeImageUri(riderPhotoRaw, riderAvatarFallback);
  const riderAvgRating =
    order?.riderAvgRating != null &&
    Number.isFinite(Number(order.riderAvgRating))
      ? Number(order.riderAvgRating)
      : null;
  const riderReviewCount = Number(order?.riderReviewCount || 0);

  const loadRidersForAssign = async () => {
    const ownerId = order?.ownerId || user?.id;
    if (!ownerId) return;
    try {
      const res = await listOwnerRiders(ownerId);
      setRiders(res?.riders ?? []);
    } catch {
      setRiders([]);
    }
  };

  const handleAssignRider = async riderId => {
    if (!user?.token || !order?.id || !riderId) return;
    setAssigningRider(true);
    try {
      const updated = await assignRiderToOrder(user.token, order.id, riderId);
      setOrder(updated);
      setAssignModalVisible(false);
      Alert.alert('Assigned', 'Rider assigned for delivery.');
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to assign rider');
    } finally {
      setAssigningRider(false);
    }
  };

  const openRiderChat = () => {
    const riderId = order?.riderId || order?.rider?.id;
    if (!riderId) return;
    navigation.navigate('ChatScreen', {
      partnerId: riderId,
      partnerName: riderName,
      partnerAvatar: riderAvatarUri,
      orderId: order?.id,
      orderDetails: { itemName: order?.items?.[0]?.itemName },
    });
  };

  const openCustomerChat = () => {
    const customerId = order?.userId || order?.user?.id;
    if (!customerId) return;
    navigation.navigate('ChatScreen', {
      partnerId: customerId,
      partnerName: order?.user?.name || order?.user?.email || 'Customer',
      partnerAvatar: order?.user?.photos?.[0],
      orderId: order?.id,
      orderDetails: { itemName: order?.items?.[0]?.itemName },
    });
  };

  const handleRiderAccept = () => {
    Alert.alert('Accept delivery', 'Accept this delivery assignment?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          setUpdating(true);
          try {
            const updated = await updateRestaurantOrderStatus(
              user.token,
              order.id,
              'rider_accepted',
            );
            setOrder(updated);
          } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to accept delivery');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  const handleRiderReject = () => {
    Alert.alert(
      'Reject delivery',
      'Decline this assignment? The restaurant can assign another rider.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setUpdating(true);
            try {
              const updated = await rejectRiderAssignment(user.token, order.id);
              Alert.alert('Rejected', 'Order returned to the restaurant.');
              navigation.goBack();
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to reject assignment');
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  };

  const handleOwnerStart = () => {
    Alert.alert(
      'Start delivery',
      'Send the rider out for delivery? The customer will see rider details and can chat.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            setUpdating(true);
            try {
              const updated = await updateRestaurantOrderStatus(
                user.token,
                order.id,
                'out_for_delivery',
              );
              setOrder(updated);
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to start delivery');
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  };

  const handleOwnerMarkReady = () => {
    Alert.alert(
      'Mark ready',
      'Mark this order ready for customer pick-up?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            setUpdating(true);
            try {
              const updated = await updateRestaurantOrderStatus(
                user.token,
                order.id,
                'ready',
              );
              setOrder(updated);
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to mark order ready');
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  };

  const handleOwnerCompletePickup = () => {
    Alert.alert('Complete order', 'Customer collected the order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          setUpdating(true);
          try {
            const updated = await updateRestaurantOrderStatus(
              user.token,
              order.id,
              'completed',
            );
            setOrder(updated);
          } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to complete order');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  const handleRiderDeliveryComplete = () => {
    Alert.alert(
      'Delivery complete',
      'Mark this delivery as complete? The restaurant owner will finalize the order.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes',
          onPress: async () => {
            setUpdating(true);
            try {
              const updated = await updateRestaurantOrderStatus(
                user.token,
                order.id,
                'delivery_complete',
              );
              setOrder(updated);
            } catch (e) {
              Alert.alert('Error', e?.message || 'Failed to mark delivery complete');
            } finally {
              setUpdating(false);
            }
          },
        },
      ],
    );
  };

  const handleOwnerCompleteDelivery = () => {
    Alert.alert('Complete order', 'Mark this order as complete?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        onPress: async () => {
          setUpdating(true);
          try {
            const updated = await updateRestaurantOrderStatus(
              user.token,
              order.id,
              'completed',
            );
            setOrder(updated);
          } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to complete order');
          } finally {
            setUpdating(false);
          }
        },
      },
    ]);
  };

  const canRiderAccept =
    isRider &&
    isDeliveryOrder &&
    order?.riderId === user?.id &&
    orderStatus === 'rider_assigned';
  const canOwnerStart =
    (isOrderOwner ||
      ['admin', 'superadmin', 'super_admin'].includes(role)) &&
    isDeliveryOrder &&
    orderStatus === 'rider_accepted';
  const canOwnerMarkReady =
    (isOrderOwner ||
      ['admin', 'superadmin', 'super_admin'].includes(role)) &&
    isPickupOrder &&
    orderStatus === 'preparing';
  const canOwnerCompletePickup =
    (isOrderOwner ||
      ['admin', 'superadmin', 'super_admin'].includes(role)) &&
    isPickupOrder &&
    orderStatus === 'ready';
  const canOwnerCompleteDelivery =
    (isOrderOwner ||
      ['admin', 'superadmin', 'super_admin'].includes(role)) &&
    isDeliveryOrder &&
    orderStatus === 'delivery_complete';
  const canRiderComplete =
    isRider &&
    isDeliveryOrder &&
    order?.riderId === user?.id &&
    orderStatus === 'out_for_delivery';
  const canRiderChatCustomer =
    isRider &&
    isDeliveryOrder &&
    order?.riderId === user?.id &&
    orderStatus === 'out_for_delivery';
  const canOwnerAssign =
    (isOrderOwner ||
      ['admin', 'superadmin', 'super_admin'].includes(role)) &&
    isDeliveryOrder &&
    orderStatus === 'preparing';
  const customerCanSeeRider =
    isCustomer &&
    isDeliveryOrder &&
    ['out_for_delivery', 'delivery_complete', 'completed'].includes(orderStatus) &&
    !!rider;
  const showRiderToCustomer =
    customerCanSeeRider &&
    ['out_for_delivery', 'delivery_complete'].includes(orderStatus);
  const showRiderDetails =
    !!rider && (isOrderOwner || isRider || customerCanSeeRider);
  const canChatRider =
    isOrderOwner ||
    isRider ||
    (isCustomer &&
      ['out_for_delivery', 'delivery_complete'].includes(orderStatus));
  const displayStatusLabel = isCustomer
    ? customerOrderStatusLabel(order?.status, order?.fulfillmentType)
    : orderStatusLabel(order?.status);
  const displayStatusColor = isCustomer
    ? customerOrderStatusColor(order?.status, order?.fulfillmentType)
    : orderStatusColor(order?.status);

  const openRiderReviewModal = () => {
    if (riderReview) {
      setRiderReviewRating(Number(riderReview.rating) || 0);
      setRiderReviewComment(String(riderReview.comment || ''));
    } else {
      setRiderReviewRating(0);
      setRiderReviewComment('');
    }
    setRiderReviewModalVisible(true);
  };

  const submitRiderReview = async () => {
    if (!user?.token || !order?.id) return;
    if (!riderReviewRating || riderReviewRating < 1) {
      Alert.alert('Rating required', 'Please select a star rating for the rider.');
      return;
    }
    setRiderReviewSubmitting(true);
    try {
      const saved = await upsertRestaurantOrderRiderReview(
        user.token,
        order.id,
        {
          rating: riderReviewRating,
          comment: riderReviewComment,
        },
      );
      setRiderReview(saved);
      setOrder(prev => (prev ? { ...prev, riderReview: saved } : prev));
      setRiderReviewModalVisible(false);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to submit rider review');
    } finally {
      setRiderReviewSubmitting(false);
    }
  };

  const confirmDeleteRiderReview = () => {
    if (!user?.token || !order?.id) return;
    Alert.alert('Delete review', 'Remove your rider review for this order?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setRiderReviewSubmitting(true);
          try {
            await deleteRestaurantOrderRiderReview(user.token, order.id);
            setRiderReview(null);
            setRiderReviewRating(0);
            setRiderReviewComment('');
            setOrder(prev =>
              prev ? { ...prev, riderReview: null } : prev,
            );
            setRiderReviewModalVisible(false);
          } catch (e) {
            Alert.alert('Error', e?.message || 'Failed to delete review');
          } finally {
            setRiderReviewSubmitting(false);
          }
        },
      },
    ]);
  };

  const buildInvoiceHtml = () => {
    const invoiceDate = formatDate(order?.createdAt);
    const itemsRows = (items || [])
      .map(item => {
        const q = Number(item?.quantity || 0);
        const unit = Number(item?.unitPrice || 0);
        const line = q * unit;
        return `
          <tr>
            <td>${escapeHtml(item?.itemName || 'Item')}</td>
            <td style="text-align:center;">${q}</td>
            <td style="text-align:right;">£ ${unit.toFixed(2)}</td>
            <td style="text-align:right;">£ ${line.toFixed(2)}</td>
          </tr>
        `;
      })
      .join('');

    return `
        <html>
          <head>
            <meta charset="utf-8" />
            <style>
              body { font-family: Arial, sans-serif; color: #111827; padding: 16px; }
              .nb { font-size: 12px; color: #6b7280; margin-bottom: 8px; }
              .logo { font-size: 28px; font-weight: 800; letter-spacing: 2px; color: #f59e0b; margin-bottom: 10px; }
              .top { display: flex; justify-content: space-between; gap: 10px; margin-bottom: 16px; }
              .col { width: 33%; font-size: 12px; line-height: 1.45; }
              .col h4 { margin: 0 0 6px 0; font-size: 13px; }
              .col.mid { text-align: center; }
              .col.right { text-align: right; }
              .oid { margin-top: 8px; font-size: 12px; color: #374151; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; }
              th { background: #f9fafb; text-align: left; }
              .total { margin-top: 14px; text-align: right; font-weight: 700; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="nb"><b>N.B:</b> This invoice is auto-generated by Eatwaze.</div>
            <div class="logo">EATWAZE</div>
            <div class="top">
              <div class="col">
                <h4>Customer</h4>
                <div>${escapeHtml(customerName)}</div>
                <div>${escapeHtml(phone || '—')}</div>
                <div>${escapeHtml(deliveryAddressText || '—')}</div>
                ${
                  restaurantNoteText
                    ? `<div><strong>Restaurant note:</strong> ${escapeHtml(
                        restaurantNoteText,
                      )}</div>`
                    : ''
                }
              </div>
              <div class="col mid">
                <h4>Date</h4>
                <div>${escapeHtml(invoiceDate)}</div>
                <div class="oid">Order: ${escapeHtml(displayOrderId)}</div>
              </div>
              <div class="col right">
                <h4>Restaurant</h4>
                <div>${escapeHtml(ownerName)}</div>
                <div>${escapeHtml(ownerPhone || '—')}</div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th style="text-align:center;">Qty</th>
                  <th style="text-align:right;">Unit Price</th>
                  <th style="text-align:right;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemsRows}
              </tbody>
            </table>

            <div class="total">Grand Total: £ ${totalAmount.toFixed(2)}</div>
            ${
              taxCharge > 0
                ? `<div style="margin-top:8px;color:#555;">Includes taxes & charges: £ ${taxCharge.toFixed(2)}</div>`
                : ''
            }
          </body>
        </html>
      `;
  };

  const getInvoicePdfFileName = () => {
    const raw = String(order?.id || 'order')
      .trim()
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, '_');
    return `eatwaze_invoice_${raw || 'order'}.pdf`;
  };

  const generateInvoicePdfPath = async () => {
    const hasNativePdfModule =
      !!NativeModules?.RNHTMLtoPDF || !!NativeModules?.HtmlToPdf;
    if (!hasNativePdfModule) {
      throw new Error(
        'PDF module is not available in this build. Rebuild app after native install.',
      );
    }
    let generatePDF;
    try {
      const pdfModule = require('react-native-html-to-pdf');
      generatePDF = pdfModule?.generatePDF;
    } catch (_) {
      throw new Error(
        'PDF module is not available in this build. Rebuild app after native install.',
      );
    }
    if (typeof generatePDF !== 'function') {
      throw new Error('PDF module generate method unavailable.');
    }
    const html = buildInvoiceHtml();
    const fileName = getInvoicePdfFileName();
    const file = await generatePDF({
      html,
      fileName: fileName.replace(/\.pdf$/i, ''),
      directory: Platform.OS === 'ios' ? 'Documents' : 'Cache',
    });
    if (!file?.filePath) {
      throw new Error('Could not create invoice PDF.');
    }
    return { sourcePath: file.filePath, fileName };
  };

  const saveInvoicePdfToDownloads = async (sourcePath, fileName) => {
    if (Platform.OS === 'ios') {
      const targetPath = `${ReactNativeBlobUtil.fs.dirs.DocumentDir}/${fileName}`;
      try {
        const exists = await ReactNativeBlobUtil.fs.exists(targetPath);
        if (exists) await ReactNativeBlobUtil.fs.unlink(targetPath);
      } catch (_) {}
      await ReactNativeBlobUtil.fs.cp(sourcePath, targetPath);
      return { fileName, openUri: targetPath };
    }

    const downloadPath = `${ReactNativeBlobUtil.fs.dirs.DownloadDir}/${fileName}`;
    try {
      try {
        const exists = await ReactNativeBlobUtil.fs.exists(downloadPath);
        if (exists) await ReactNativeBlobUtil.fs.unlink(downloadPath);
      } catch (_) {}
      await ReactNativeBlobUtil.fs.cp(sourcePath, downloadPath);
      await ReactNativeBlobUtil.fs.scanFile([
        { path: downloadPath, mime: 'application/pdf' },
      ]);
      await ReactNativeBlobUtil.android.addCompleteDownload({
        title: fileName,
        description: 'Eatwaze invoice',
        mime: 'application/pdf',
        path: downloadPath,
        showNotification: true,
      });
      const saved = await ReactNativeBlobUtil.fs.exists(downloadPath);
      if (!saved) throw new Error('File save verification failed');
      return { fileName, openUri: `file://${downloadPath}` };
    } catch (downloadErr) {
      const mediaStoreUri =
        await ReactNativeBlobUtil.MediaCollection.copyToMediaStore(
          {
            name: fileName,
            parentFolder: 'Download',
            mimeType: 'application/pdf',
          },
          'Download',
          sourcePath,
        );
      await ReactNativeBlobUtil.android.addCompleteDownload({
        title: fileName,
        description: 'Eatwaze invoice',
        mime: 'application/pdf',
        path: downloadPath,
        showNotification: true,
      });
      return {
        fileName,
        openUri: mediaStoreUri || `file://${downloadPath}`,
      };
    }
  };

  const handleDownloadInvoice = async () => {
    try {
      const { sourcePath, fileName } = await generateInvoicePdfPath();
      const saved = await saveInvoicePdfToDownloads(sourcePath, fileName);
      setInvoiceOptionsVisible(false);
      Alert.alert(
        'Invoice downloaded',
        Platform.OS === 'android'
          ? `Saved to Downloads as ${saved.fileName}`
          : `Saved in Files as ${saved.fileName}`,
        [
          { text: 'OK', style: 'cancel' },
          ...(Platform.OS === 'android'
            ? [
                {
                  text: 'Open',
                  onPress: async () => {
                    try {
                      await ReactNativeBlobUtil.android.actionViewIntent(
                        saved.openUri,
                        'application/pdf',
                      );
                    } catch (_) {
                      Alert.alert(
                        'Info',
                        'Please open it from your Downloads folder.',
                      );
                    }
                  },
                },
              ]
            : []),
        ],
      );
    } catch (e) {
      Alert.alert('Invoice error', e?.message || 'Failed to generate invoice.');
    }
  };

  const handleWifiPrintInvoice = async () => {
    try {
      await printReceiptOverWifi({
        ...order,
        ownerName: order?.owner?.name || order?.ownerName,
        customerName: order?.user?.name || user?.name,
        customerPhone: order?.customerPhone || order?.user?.phone,
        items: order?.items || order?.orderItems,
      });
      setInvoiceOptionsVisible(false);
      Alert.alert('Printed', 'Invoice sent to WiFi printer.');
    } catch (e) {
      Alert.alert('WiFi print error', e?.message || 'Failed to print over WiFi.');
    }
  };

  const handlePrintInvoice = async () => {
    try {
      const hasPrintModule = !!NativeModules?.RNPrint;
      if (!hasPrintModule) {
        throw new Error(
          'Print module is not available in this build. Rebuild app after native install.',
        );
      }
      const RNPrintModule = require('react-native-print');
      const RNPrint = RNPrintModule?.default || RNPrintModule;
      if (!RNPrint?.print) {
        throw new Error('Print module is not available.');
      }
      const { sourcePath } = await generateInvoicePdfPath();
      await RNPrint.print({ filePath: sourcePath });
      setInvoiceOptionsVisible(false);
    } catch (e) {
      Alert.alert('Print error', e?.message || 'Failed to print invoice.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backIconButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="chevron-left" size={26} color="#1A1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Details</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.customerHeader}>
            <Text style={styles.customerLabel}>Customer</Text>
            <View style={styles.customerInfoRow}>
              <Image
                source={{ uri: avatarUri }}
                style={styles.customerAvatar}
              />
              <View style={styles.customerDetails}>
                <View style={styles.customerNameRow}>
                  <Text style={styles.customerName}>{customerName}</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: displayStatusColor },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {displayStatusLabel}
                    </Text>
                  </View>
                </View>
              </View>
              {/* <View style={styles.actionIcons}>
                <TouchableOpacity style={styles.iconCircle} onPress={openChat}>
                  <Icon name="message-text" size={18} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconCircle}
                  onPress={handleCall}
                >
                  <Icon name="phone" size={18} color="white" />
                </TouchableOpacity>
              </View> */}
            </View>
          </View>

          <View style={styles.addressSection}>
            <Text style={styles.sectionLabel}>Owner / Restaurant</Text>
            <View style={styles.ownerInfoRow}>
              <TouchableOpacity
                style={styles.ownerProfileTap}
                activeOpacity={0.8}
                onPress={openOwnerProfile}
                disabled={!order?.ownerId && !order?.owner?.id}
              >
                <Image
                  source={{ uri: ownerAvatarUri }}
                  style={styles.ownerAvatar}
                />
                <View style={styles.ownerDetails}>
                  <Text style={styles.ownerName}>{ownerName}</Text>
                  <Text style={styles.ownerPhone}>
                    {ownerPhone || 'Phone not available'}
                  </Text>
                </View>
              </TouchableOpacity>
              <View style={styles.actionIcons}>
                <TouchableOpacity
                  style={styles.iconCircle}
                  onPress={openOwnerChat}
                  disabled={!order?.ownerId && !order?.owner?.id}
                >
                  <Icon name="message-text" size={18} color="white" />
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.iconCircle}
                  onPress={handleOwnerCall}
                  disabled={!ownerPhone}
                >
                  <Icon name="phone" size={18} color="white" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.sectionLabel}>
              {isPickupOrder ? 'Pick up location' : 'Delivery Address'}
            </Text>
            <Text style={styles.addressText}>{deliveryAddressText || '—'}</Text>
            {restaurantNoteText ? (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 12 }]}>
                  Restaurant Note
                </Text>
                <Text style={styles.addressText}>{restaurantNoteText}</Text>
              </>
            ) : null}
            {!isPickupOrder ? (
              <>
            <Text style={[styles.sectionLabel, { marginTop: 15 }]}>
              Delivery Time
            </Text>
            <View style={styles.timeRow}>
              <Icon name="truck-delivery-outline" size={20} color="#1A1C1E" />
              <Text style={styles.timeText}>
                {ownerDeliveryTimeLabel || 'Not set by restaurant'}
              </Text>
            </View>
            {ownerDeliveryAreaKm != null ? (
              <>
                <Text style={[styles.sectionLabel, { marginTop: 12 }]}>
                  Delivery Area
                </Text>
                <View style={styles.timeRow}>
                  <Icon name="map-marker-radius" size={20} color="#1A1C1E" />
                  <Text style={styles.timeText}>
                    Within {ownerDeliveryAreaKm} km of restaurant
                  </Text>
                </View>
              </>
            ) : null}
            {showRiderToCustomer ? (
              <View style={styles.onWayBanner}>
                <Icon name="bike-fast" size={22} color="#2563eb" />
                <View style={styles.onWayBannerBody}>
                  <Text style={styles.onWayTitle}>Rider is on the way</Text>
                  <Text style={styles.onWaySub}>
                    Estimated delivery:{' '}
                    {ownerDeliveryTimeLabel || 'See restaurant time below'}
                  </Text>
                </View>
              </View>
            ) : null}
              </>
            ) : null}
            <Text style={[styles.sectionLabel, { marginTop: 15 }]}>
              {isPickupOrder ? 'Pick up' : 'Delivery Rider'}
            </Text>
            {isPickupOrder && (isCustomer || isOrderOwner) ? (
              <View style={styles.pickupInfoRow}>
                <Icon name="storefront-outline" size={22} color="#16a34a" />
                <Text style={styles.addressText}>
                  {orderStatus === 'ready'
                    ? isCustomer
                      ? 'Your order is ready — collect it from the restaurant.'
                      : 'Order is ready for customer pick-up.'
                    : isCustomer
                      ? 'You will collect this order from the restaurant.'
                      : 'Customer will pick up this order from your restaurant.'}
                </Text>
              </View>
            ) : null}
            {!isPickupOrder && showRiderDetails ? (
              <View style={styles.riderDetailsBlock}>
                <View style={styles.ownerInfoRow}>
                  <View style={styles.ownerProfileTap}>
                    <Image
                      source={{ uri: riderAvatarUri }}
                      style={styles.ownerAvatar}
                    />
                    <View style={styles.ownerDetails}>
                      <Text style={styles.ownerName}>{riderName}</Text>
                      {rider.phone ? (
                        <Text style={styles.ownerPhone}>{rider.phone}</Text>
                      ) : null}
                      {riderAvgRating != null ? (
                        <View style={styles.riderAvgRow}>
                          <Icon name="star" size={15} color="#F5A623" />
                          <Text style={styles.riderAvgText}>
                            {riderAvgRating.toFixed(1)}
                          </Text>
                          {riderReviewCount > 0 ? (
                            <Text style={styles.riderAvgMeta}>
                              ({riderReviewCount}{' '}
                              {riderReviewCount === 1 ? 'review' : 'reviews'})
                            </Text>
                          ) : null}
                        </View>
                      ) : null}
                    </View>
                  </View>
                  {canChatRider ? (
                    <TouchableOpacity
                      style={styles.iconCircle}
                      onPress={openRiderChat}
                    >
                      <Icon name="message-text" size={18} color="white" />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {orderStatus === 'completed' ? (
                  <View style={styles.riderOrderReviewSection}>
                    {riderReviewLoading ? (
                      <ActivityIndicator size="small" color="#F5A623" />
                    ) : riderReview ? (
                      <>
                        <Text style={styles.riderOrderReviewLabel}>
                          {isCustomer
                            ? 'Your rider rating'
                            : canRiderViewReview
                              ? 'Customer rating'
                              : 'Rider rating for this order'}
                        </Text>
                        <View style={styles.riderReviewStarsRow}>
                          {[1, 2, 3, 4, 5].map(s => (
                            <Icon
                              key={`rider-star-${s}`}
                              name={
                                s <= Number(riderReview.rating)
                                  ? 'star'
                                  : 'star-outline'
                              }
                              size={20}
                              color={
                                s <= Number(riderReview.rating)
                                  ? '#F5A623'
                                  : '#CCC'
                              }
                            />
                          ))}
                        </View>
                        {riderReview.comment ? (
                          <Text style={styles.riderReviewComment}>
                            {riderReview.comment}
                          </Text>
                        ) : null}
                        {canRiderViewReview && riderReview.user ? (
                          <Text style={styles.riderReviewMeta}>
                            From{' '}
                            {riderReview.user.nickname ||
                              riderReview.user.name ||
                              riderReview.user.email ||
                              'Customer'}
                          </Text>
                        ) : null}
                        {canCustomerReviewRider ? (
                          <TouchableOpacity
                            style={styles.riderReviewEditBtn}
                            onPress={openRiderReviewModal}
                          >
                            <Text style={styles.riderReviewEditBtnText}>
                              Edit rating
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                      </>
                    ) : canCustomerReviewRider ? (
                      <TouchableOpacity
                        style={styles.riderReviewSubmitBtn}
                        onPress={openRiderReviewModal}
                      >
                        <Icon name="star-outline" size={18} color="#fff" />
                        <Text style={styles.riderReviewSubmitBtnText}>
                          Rate your rider
                        </Text>
                      </TouchableOpacity>
                    ) : isOrderOwner || canRiderViewReview ? (
                      <Text style={styles.riderReviewPendingText}>
                        No customer rating yet for this delivery.
                      </Text>
                    ) : null}
                  </View>
                ) : null}
              </View>
            ) : !isPickupOrder && canOwnerAssign ? (
              <TouchableOpacity
                style={styles.assignRiderEmptyRow}
                activeOpacity={0.85}
                onPress={() => {
                  loadRidersForAssign();
                  setAssignModalVisible(true);
                }}
              >
                <Icon name="bike" size={22} color="#F5A623" />
                <View style={styles.assignRiderEmptyBody}>
                  <Text style={styles.addressText}>No rider assigned yet</Text>
                  <Text style={styles.assignRiderTapHint}>Tap to assign a rider</Text>
                </View>
                <Icon name="chevron-right" size={22} color="#999" />
              </TouchableOpacity>
            ) : !isPickupOrder ? (
              <Text style={styles.addressText}>
                {orderStatus === 'preparing'
                  ? 'Assign a delivery rider when the order is preparing.'
                  : isCustomer
                    ? 'Rider details will appear when your order is on the way.'
                    : 'No rider assigned yet'}
              </Text>
            ) : null}
            {!isPickupOrder && canOwnerAssign && rider ? (
              <TouchableOpacity
                style={styles.assignRiderBtn}
                onPress={() => {
                  loadRidersForAssign();
                  setAssignModalVisible(true);
                }}
              >
                <Icon name="bike" size={18} color="#F5A623" />
                <Text style={styles.assignRiderBtnText}>
                  {rider ? 'Change rider' : 'Assign rider'}
                </Text>
              </TouchableOpacity>
            ) : null}
            <Text style={[styles.sectionLabel, { marginTop: 12 }]}>
              Order placed
            </Text>
            <View style={styles.timeRow}>
              <Icon name="calendar-clock" size={20} color="#1A1C1E" />
              <Text style={styles.timeText}>{orderPlacedText}</Text>
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
                    <Text style={styles.itemName}>
                      {item.itemName || 'Item'}
                    </Text>
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
              {currency} {itemsSubtotal.toFixed(2)}
            </Text>
          </View>
          {taxCharge > 0 ? (
            <>
              <View style={styles.billingDivider} />
              <View style={styles.billingRow}>
                <Text style={styles.billingLabel}>Taxes & charges</Text>
                <Text style={styles.billingValue}>
                  {currency} {taxCharge.toFixed(2)}
                </Text>
              </View>
            </>
          ) : null}
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
            <Text style={[styles.billingValue, { fontWeight: '700' }]}>
              Paid
            </Text>
          </View>
        </View>

      </ScrollView>

      <Modal
        visible={invoiceOptionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInvoiceOptionsVisible(false)}
      >
        <Pressable
          style={styles.invoiceModalBackdrop}
          onPress={() => setInvoiceOptionsVisible(false)}
        >
          <Pressable
            style={styles.invoiceModalCard}
            onPress={e => e.stopPropagation()}
          >
            <Text style={styles.invoiceModalTitle}>Invoice options</Text>
            <TouchableOpacity
              style={styles.invoiceOptionBtn}
              onPress={handleDownloadInvoice}
              activeOpacity={0.85}
            >
              <Icon name="download" size={18} color="#1A1C1E" />
              <Text style={styles.invoiceOptionText}>Download PDF</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.invoiceOptionBtn}
              onPress={handleWifiPrintInvoice}
              activeOpacity={0.85}
            >
              <Icon name="printer-wireless" size={18} color="#1A1C1E" />
              <Text style={styles.invoiceOptionText}>Print on WiFi printer</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.invoiceOptionBtn}
              onPress={() => {
                setInvoiceOptionsVisible(false);
                navigation.navigate('PrinterSettingsScreen');
              }}
              activeOpacity={0.85}
            >
              <Icon name="cog-outline" size={18} color="#1A1C1E" />
              <Text style={styles.invoiceOptionText}>Printer settings</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.invoiceOptionBtn}
              onPress={handlePrintInvoice}
              activeOpacity={0.85}
            >
              <Icon name="printer" size={18} color="#1A1C1E" />
              <Text style={styles.invoiceOptionText}>Print Invoice</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {canAcceptReject && isPendingOrder ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerBtn, styles.rejectBtn]}
            onPress={handleReject}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.footerBtnText}>Reject</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, styles.acceptBtn]}
            onPress={handleAccept}
            disabled={updating}
          >
            <Text style={styles.footerBtnText}>Accept</Text>
          </TouchableOpacity>
        </View>
      ) : canRiderAccept ? (
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.footerBtn, styles.rejectBtn]}
            onPress={handleRiderReject}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.footerBtnText}>Reject</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.footerBtn, styles.acceptBtn]}
            onPress={handleRiderAccept}
            disabled={updating}
          >
            <Text style={styles.footerBtnText}>Accept delivery</Text>
          </TouchableOpacity>
        </View>
      ) : canOwnerMarkReady ? (
        <View style={[styles.footer, styles.invoiceFooter]}>
          <TouchableOpacity
            style={[styles.footerBtn, styles.startBtn, { flex: 1 }]}
            onPress={handleOwnerMarkReady}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.footerBtnText}>Ready</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : canOwnerCompletePickup ? (
        <View style={[styles.footer, styles.invoiceFooter]}>
          <TouchableOpacity
            style={[styles.footerBtn, styles.acceptBtn, { flex: 1 }]}
            onPress={handleOwnerCompletePickup}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.footerBtnText}>Complete</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : canOwnerCompleteDelivery ? (
        <View style={[styles.footer, styles.invoiceFooter]}>
          <TouchableOpacity
            style={[styles.footerBtn, styles.acceptBtn, { flex: 1 }]}
            onPress={handleOwnerCompleteDelivery}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.footerBtnText}>Complete</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : canOwnerStart ? (
        <View style={[styles.footer, styles.invoiceFooter]}>
          <TouchableOpacity
            style={[styles.footerBtn, styles.startBtn, { flex: 1 }]}
            onPress={handleOwnerStart}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.footerBtnText}>Start delivery</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : canRiderComplete ? (
        <View style={[styles.footer, styles.invoiceFooter]}>
          <TouchableOpacity
            style={[styles.footerBtn, styles.acceptBtn, { flex: 1 }]}
            onPress={handleRiderDeliveryComplete}
            disabled={updating}
          >
            {updating ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Text style={styles.footerBtnText}>Delivery Complete</Text>
            )}
          </TouchableOpacity>
          {canRiderChatCustomer ? (
            <TouchableOpacity style={styles.iconCircle} onPress={openCustomerChat}>
              <Icon name="message-text" size={18} color="white" />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View style={[styles.footer, styles.invoiceFooter]}>
          <TouchableOpacity
            style={styles.invoiceBtn}
            onPress={() => setInvoiceOptionsVisible(true)}
            activeOpacity={0.85}
          >
            <Icon name="file-pdf-box" size={20} color="#fff" />
            <Text style={styles.invoiceBtnText}>Download Invoice</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={assignModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAssignModalVisible(false)}
      >
        <Pressable
          style={styles.invoiceModalBackdrop}
          onPress={() => setAssignModalVisible(false)}
        >
          <Pressable
            style={styles.assignModalCard}
            onPress={e => e.stopPropagation()}
          >
            <Text style={styles.invoiceModalTitle}>Assign rider</Text>
            {riders.length === 0 ? (
              <Text style={styles.addressText}>
                No riders yet. Create riders in Business Profile → Riders tab.
              </Text>
            ) : (
              riders.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={styles.assignRiderRow}
                  disabled={assigningRider}
                  onPress={() => handleAssignRider(r.id)}
                >
                  <Text style={styles.ownerName}>{r.name || r.email}</Text>
                  <Text style={styles.ownerPhone}>{r.email}</Text>
                </TouchableOpacity>
              ))
            )}
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={riderReviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() =>
          riderReviewSubmitting ? null : setRiderReviewModalVisible(false)
        }
      >
        <Pressable
          style={styles.reviewOverlay}
          onPress={() =>
            riderReviewSubmitting ? null : setRiderReviewModalVisible(false)
          }
        >
          <Pressable
            style={styles.reviewSheet}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.reviewHandle} />
            <Text style={styles.reviewTitle}>Review rider</Text>
            <Text style={styles.reviewSubTitle} numberOfLines={1}>
              {riderName}
            </Text>
            <View style={styles.reviewStarsRow}>
              {[1, 2, 3, 4, 5].map(s => (
                <TouchableOpacity
                  key={`edit-rr-${s}`}
                  onPress={() =>
                    riderReviewSubmitting ? null : setRiderReviewRating(s)
                  }
                  disabled={riderReviewSubmitting}
                  style={styles.reviewStarBtn}
                >
                  <Icon
                    name={s <= riderReviewRating ? 'star' : 'star-outline'}
                    size={32}
                    color={s <= riderReviewRating ? '#F5A623' : '#CCC'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.reviewInput}
              placeholder="Comment (optional)"
              placeholderTextColor="#9CA3AF"
              value={riderReviewComment}
              onChangeText={setRiderReviewComment}
              editable={!riderReviewSubmitting}
              multiline
            />
            <View style={styles.reviewBtnsRow}>
              {riderReview ? (
                <TouchableOpacity
                  style={[styles.reviewBtn, styles.reviewBtnDanger]}
                  onPress={confirmDeleteRiderReview}
                  disabled={riderReviewSubmitting}
                >
                  <Text style={styles.reviewBtnText}>Delete</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[styles.reviewBtn, styles.reviewBtnPrimary]}
                onPress={submitRiderReview}
                disabled={riderReviewSubmitting}
              >
                {riderReviewSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.reviewBtnText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F4F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  helperText: { fontSize: 16, color: '#666' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backIconButton: { padding: 4 },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 15,
    color: '#1A1C1E',
  },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 100 },
  card: {
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 15,
    overflow: 'hidden',
  },
  customerHeader: { backgroundColor: '#FDB022', padding: 20 },
  customerLabel: {
    color: '#424242',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  customerInfoRow: { flexDirection: 'row', alignItems: 'center' },
  customerAvatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: '#1A1C1E',
  },
  customerDetails: { marginLeft: 15, flex: 1 },
  customerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
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
  ownerInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 16,
  },
  ownerProfileTap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ownerAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: '#E4E7EC',
  },
  ownerDetails: {
    flex: 1,
    marginLeft: 12,
    marginRight: 10,
  },
  ownerName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  ownerPhone: {
    marginTop: 2,
    color: '#667085',
    fontSize: 13,
  },
  sectionLabel: { fontSize: 16, fontWeight: '600', color: '#1A1C1E' },
  addressText: { color: '#667085', marginTop: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  timeText: { marginLeft: 10, color: '#1A1C1E', fontWeight: '500' },
  itemPadding: { padding: 20 },
  orderIdText: { fontSize: 16, fontWeight: '600', marginBottom: 15 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
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
  qtyText: { color: '#1A1C1E', fontSize: 14, fontWeight: 'bold' },
  priceCalc: { color: '#1A1C1E', fontSize: 14, fontWeight: '600' },
  itemTotal: { fontSize: 16, fontWeight: '700', color: '#1A1C1E' },
  billingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
  },
  billingLabel: { fontSize: 16, color: '#1A1C1E', fontWeight: '500' },
  billingValue: { fontSize: 16, color: '#1A1C1E', fontWeight: '600' },
  billingDivider: {
    height: 1,
    backgroundColor: '#F2F4F7',
    marginHorizontal: 15,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 20,
    backgroundColor: '#F2F4F7',
  },
  invoiceFooter: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerBtn: {
    flex: 1,
    height: 55,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  rejectBtn: { backgroundColor: '#F75555' },
  acceptBtn: { backgroundColor: '#FDB022' },
  startBtn: { backgroundColor: '#2563eb' },
  footerBtnText: { color: 'white', fontSize: 18, fontWeight: '700' },
  onWayBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  onWayBannerBody: { flex: 1 },
  onWayTitle: { fontSize: 15, fontWeight: '700', color: '#1D4ED8' },
  onWaySub: { fontSize: 13, color: '#374151', marginTop: 4 },
  invoiceBtn: {
    backgroundColor: '#D78500',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  invoiceBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
  invoiceModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  invoiceModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
  },
  invoiceModalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 8,
  },
  invoiceOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F6',
  },
  invoiceOptionText: {
    fontSize: 15,
    color: '#1A1C1E',
    fontWeight: '600',
  },
  pickupInfoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginTop: 8,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  assignRiderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F5A623',
    alignSelf: 'flex-start',
  },
  assignRiderBtnText: { color: '#F5A623', fontWeight: '700', fontSize: 14 },
  assignRiderEmptyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F5A623',
    backgroundColor: '#FFF9EE',
  },
  assignRiderEmptyBody: { flex: 1 },
  assignRiderTapHint: {
    marginTop: 2,
    fontSize: 12,
    color: '#F5A623',
    fontWeight: '600',
  },
  assignModalCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    maxHeight: '70%',
  },
  assignRiderRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  riderDetailsBlock: {
    marginTop: 4,
  },
  riderAvgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  riderAvgText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  riderAvgMeta: {
    fontSize: 12,
    color: '#667085',
  },
  riderOrderReviewSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F2F4F7',
  },
  riderOrderReviewLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#667085',
    marginBottom: 6,
  },
  riderReviewPendingText: {
    fontSize: 13,
    color: '#667085',
    fontStyle: 'italic',
  },
  riderReviewStarsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
    marginBottom: 8,
  },
  riderReviewComment: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
  },
  riderReviewMeta: {
    marginTop: 8,
    fontSize: 12,
    color: '#888',
  },
  riderReviewEditBtn: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F5A623',
  },
  riderReviewEditBtnText: {
    color: '#F5A623',
    fontWeight: '700',
    fontSize: 14,
  },
  riderReviewSubmitBtn: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F5A623',
    paddingVertical: 12,
    borderRadius: 10,
  },
  riderReviewSubmitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  reviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  reviewSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 20,
    paddingBottom: 28,
    paddingTop: 10,
  },
  reviewHandle: {
    alignSelf: 'center',
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    marginBottom: 12,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  reviewSubTitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#666',
  },
  reviewStarsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 16,
  },
  reviewStarBtn: { padding: 4 },
  reviewInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 10,
    padding: 12,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: 14,
    color: '#111',
  },
  reviewBtnsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  reviewBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBtnPrimary: { backgroundColor: '#F5A623' },
  reviewBtnDanger: { backgroundColor: '#DC2626' },
  reviewBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
