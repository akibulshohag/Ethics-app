import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { getRestaurantEarnings } from '../services/orderService';

function formatWithdrawalDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`;
}

export default function EarningsScreen() {
  const navigation = useNavigation();
  const user = useSelector((s) => s?.app?.user);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  const loadEarnings = useCallback(async (isRefresh = false) => {
    if (!user?.token) {
      setData(null);
      setLoading(false);
      return;
    }
    const role = (user?.role || '').toLowerCase();
    const isOwner = ['owner', 'admin', 'superadmin', 'super_admin'].includes(role);
    if (!isOwner) {
      setData(null);
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const res = await getRestaurantEarnings(user.token);
      setData(res);
    } catch (e) {
      setError(e?.message || 'Failed to load earnings');
      setData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.token, user?.role]);

  useFocusEffect(
    useCallback(() => {
      loadEarnings();
    }, [loadEarnings]),
  );

  if (!user?.token) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="chevron-left" size={26} color="#1A1C1E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>This Months Earning</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.helperText}>Sign in to see earnings</Text>
        </View>
      </SafeAreaView>
    );
  }

  const role = (user?.role || '').toLowerCase();
  const isOwner = ['owner', 'admin', 'superadmin', 'super_admin'].includes(role);
  if (!isOwner) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="chevron-left" size={26} color="#1A1C1E" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>This Months Earning</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.helperText}>Only restaurant owners can view earnings</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" size={26} color="#1A1C1E" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>This Months Earning</Text>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FDB022" />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadEarnings(true)} colors={['#FDB022']} />
          }
        >
          <View style={styles.summaryRow}>
            <View style={[styles.summaryCard, { backgroundColor: '#FEF0D7' }]}>
              <Text style={[styles.summaryLabel, { color: '#FDB022' }]}>Completed Orders</Text>
              <Text style={styles.summaryValue}>{Number(data?.completedOrders ?? 0)}</Text>
            </View>
            <View style={[styles.summaryCard, { backgroundColor: '#FEF0D7' }]}>
              <Text style={[styles.summaryLabel, { color: '#FDB022' }]}>Total Earning</Text>
              <Text style={styles.summaryValue}>
                {data?.currency || 'BDT'} {(Number(data?.totalEarning ?? 0)).toFixed(2)}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>Withdrawals</Text>
          <View style={styles.historyContainer}>
            {(data?.withdrawals && data.withdrawals.length > 0) ? (
              data.withdrawals.map((item, index) => (
                <View
                  key={item.id || index}
                  style={[
                    styles.historyItem,
                    index !== data.withdrawals.length - 1 && styles.borderBottom,
                  ]}
                >
                  <View>
                    <Text style={styles.historyDate}>{formatWithdrawalDate(item.date)}</Text>
                    <Text style={styles.transText}>
                      Transaction no : <Text style={styles.transId}>{item.transNo || item.id || '—'}</Text>
                    </Text>
                  </View>
                  <Text style={styles.historyAmount}>
                    {data?.currency || 'BDT'} {(Number(item.amount ?? 0)).toFixed(2)}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyWithdrawals}>No withdrawals yet</Text>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  helperText: { fontSize: 16, color: '#666' },
  errorText: { fontSize: 14, color: '#F04438' },
  emptyWithdrawals: { fontSize: 14, color: '#98A2B3', padding: 20 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  backButton: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: '700', marginLeft: 10, color: '#1A1C1E' },
  scrollContent: { paddingHorizontal: 20, paddingBottom: 40 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  summaryCard: {
    width: '48%',
    paddingVertical: 25,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  summaryValue: { fontSize: 28, fontWeight: '700', color: '#475467' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1C1E',
    marginTop: 15,
    marginBottom: 15,
  },
  historyContainer: {
    backgroundColor: '#F7F9FC',
    borderRadius: 16,
    overflow: 'hidden',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  borderBottom: { borderBottomWidth: 1, borderBottomColor: '#EDF2F7' },
  historyDate: { fontSize: 16, fontWeight: '600', color: '#1A1C1E' },
  transText: { fontSize: 11, color: '#98A2B3', marginTop: 4 },
  transId: { color: '#667085' },
  historyAmount: { fontSize: 18, fontWeight: '700', color: '#1A1C1E' },
});
