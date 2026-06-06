import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { getOwnerRiderProfile } from '../services/riderService';
import { safeImageUri } from '../utils/helper';

function statusLabel(status) {
  const s = String(status || '').toLowerCase();
  if (s === 'out_for_delivery') return 'Out for delivery';
  if (s === 'completed') return 'Completed';
  if (s === 'cancelled') return 'Rejected';
  return status || '—';
}

export default function RiderDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { ownerId, riderId } = route.params || {};
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!ownerId || !riderId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await getOwnerRiderProfile(ownerId, riderId);
      setData(res);
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [ownerId, riderId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const rider = data?.rider;
  const orders = data?.orders || [];
  const avatar = rider?.avatar
    ? safeImageUri(rider.avatar)
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(rider?.name || 'R')}&background=F5A623&color=fff`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="chevron-left" size={24} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Rider details</Text>
        <View style={{ width: 32 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#F5A623" />
      ) : !rider ? (
        <Text style={styles.empty}>Rider not found.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.profileCard}>
            <Image source={{ uri: avatar }} style={styles.avatar} />
            <Text style={styles.name}>{rider.name}</Text>
            <Text style={styles.meta}>{rider.email}</Text>
            {rider.phone ? <Text style={styles.meta}>{rider.phone}</Text> : null}
            {rider.address ? <Text style={styles.meta}>{rider.address}</Text> : null}
          </View>

          <Text style={styles.sectionTitle}>Assigned orders ({orders.length})</Text>
          {orders.length === 0 ? (
            <Text style={styles.empty}>No assigned orders yet.</Text>
          ) : (
            orders.map(order => (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() =>
                  navigation.navigate('OrderDetailsScreen', {
                    orderId: order.id,
                    order,
                  })
                }
              >
                <View style={styles.orderTop}>
                  <Text style={styles.orderId}>#{String(order.id).slice(0, 8)}</Text>
                  <Text style={styles.status}>{statusLabel(order.status)}</Text>
                </View>
                <Text style={styles.customer}>
                  {order.user?.name || order.user?.email || 'Customer'}
                </Text>
                <Text style={styles.total}>
                  £ {Number(order.totalAmount || 0).toFixed(2)}
                </Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#111' },
  scroll: { padding: 16, paddingBottom: 40 },
  profileCard: {
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  avatar: { width: 72, height: 72, borderRadius: 36, marginBottom: 12 },
  name: { fontSize: 18, fontWeight: '800', color: '#111' },
  meta: { fontSize: 13, color: '#666', marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12, color: '#111' },
  orderCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  orderTop: { flexDirection: 'row', justifyContent: 'space-between' },
  orderId: { fontSize: 12, color: '#888' },
  status: { fontSize: 12, fontWeight: '700', color: '#F5A623' },
  customer: { fontSize: 15, fontWeight: '600', marginTop: 8, color: '#111' },
  total: { fontSize: 14, fontWeight: '700', marginTop: 6, color: '#111' },
  empty: { textAlign: 'center', color: '#888', marginTop: 24 },
});
