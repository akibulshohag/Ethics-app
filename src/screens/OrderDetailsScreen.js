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
} from '../services/orderService';
import { safeImageUri } from '../utils/helper';
import ReactNativeBlobUtil from 'react-native-blob-util';

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
  switch (String(status || '').toLowerCase()) {
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
};

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
  const { orderId, order: orderParam } = route.params || {};
  const [order, setOrder] = useState(orderParam || null);
  const [loading, setLoading] = useState(!orderParam && !!orderId);
  const [updating, setUpdating] = useState(false);
  const [invoiceOptionsVisible, setInvoiceOptionsVisible] = useState(false);

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
      .then(data => {
        if (!cancelled) setOrder(data);
      })
      .catch(() => {
        if (!cancelled) setOrder(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
      await updateRestaurantOrderStatus(user.token, order.id, 'completed');
      setOrder(prev => (prev ? { ...prev, status: 'completed' } : prev));
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
  const totalAmount = Number(order.totalAmount || 0);
  const currency = '€';
  const displayOrderId = order.id ? `#${String(order.id)}` : '—';
  const orderStatus = String(order?.status || '').toLowerCase();
  const isPendingOrder = orderStatus === 'pending';

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
            <td style="text-align:right;">€ ${unit.toFixed(2)}</td>
            <td style="text-align:right;">€ ${line.toFixed(2)}</td>
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
            <div class="nb"><b>N.B:</b> This invoice is auto-generated by Eatix.</div>
            <div class="logo">EATIX</div>
            <div class="top">
              <div class="col">
                <h4>Customer</h4>
                <div>${escapeHtml(customerName)}</div>
                <div>${escapeHtml(phone || '—')}</div>
                <div>${escapeHtml(order?.deliveryAddress || '—')}</div>
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

            <div class="total">Grand Total: € ${totalAmount.toFixed(2)}</div>
          </body>
        </html>
      `;
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
    const baseName = `eatix_invoice_${String(order?.id || 'order')}`;
    const file = await generatePDF({
      html,
      fileName: baseName,
      directory: 'Documents',
    });
    if (!file?.filePath) {
      throw new Error('Could not create invoice PDF.');
    }

    let finalPath = file.filePath;
    if (Platform.OS === 'android') {
      try {
        const { fs } = ReactNativeBlobUtil;
        const downloadDir = fs.dirs?.DownloadDir;
        if (downloadDir) {
          const targetPath = `${downloadDir}/${baseName}.pdf`;
          try {
            const exists = await fs.exists(targetPath);
            if (exists) await fs.unlink(targetPath);
          } catch (_) {}
          await fs.cp(file.filePath, targetPath);
          finalPath = targetPath;
        }
      } catch (_) {
        // keep documents path
      }
    }
    return finalPath;
  };

  const handleDownloadInvoice = async () => {
    try {
      const path = await generateInvoicePdfPath();
      setInvoiceOptionsVisible(false);
      Alert.alert(
        'Invoice downloaded',
        `Saved invoice PDF to:\n${path}`,
      );
    } catch (e) {
      Alert.alert('Invoice error', e?.message || 'Failed to generate invoice.');
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
      const path = await generateInvoicePdfPath();
      await RNPrint.print({ filePath: path });
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
                      { backgroundColor: statusColor(order.status) },
                    ]}
                  >
                    <Text style={styles.statusBadgeText}>
                      {statusToLabel(order.status)}
                    </Text>
                  </View>
                </View>
                {phone ? (
                  <View style={styles.phoneRow}>
                    <Icon name="phone" size={14} color="white" />
                    <Text style={styles.phoneText}>{phone}</Text>
                  </View>
                ) : null}
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
            <Text style={styles.sectionLabel}>Delivery Address</Text>
            <Text style={styles.addressText}>
              {order.deliveryAddress || '—'}
            </Text>
            <Text style={[styles.sectionLabel, { marginTop: 15 }]}>
              Delivery Time
            </Text>
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
  footerBtnText: { color: 'white', fontSize: 18, fontWeight: '700' },
  invoiceBtn: {
    backgroundColor: '#1D4ED8',
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
});
