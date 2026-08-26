import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  initPaymentSheet,
  presentPaymentSheet,
} from '@stripe/stripe-react-native';
import { getPaymentConfig } from '../services/paymentService';
import { noLogoCreditsService } from '../services/noLogoCreditsService';

const formatGbp = n => `£${Number(n || 0).toFixed(2)}`;

export default function NoLogoCreditsScreen() {
  const navigation = useNavigation();
  const user = useSelector(state => state?.app?.user);
  const [credits, setCredits] = useState(0);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [buying, setBuying] = useState(null);

  const load = useCallback(async () => {
    try {
      if (!user?.token) {
        setCredits(0);
        const pkgs = await noLogoCreditsService.getPackages();
        setPackages(pkgs);
        return;
      }
      const bal = await noLogoCreditsService.getBalance(user.token);
      setCredits(bal.credits);
      setPackages(bal.packages?.length ? bal.packages : []);
    } catch (e) {
      console.warn('NoLogoCredits load', e);
      try {
        const pkgs = await noLogoCreditsService.getPackages();
        setPackages(pkgs);
      } catch {
        /* noop */
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.token]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const buyPack = async pkg => {
    if (!user?.token) {
      Alert.alert('Sign in', 'Please sign in to buy a no-logo pack.');
      return;
    }
    if (buying) return;
    setBuying(pkg.key);
    try {
      const payCfg = await getPaymentConfig();
      if (!payCfg.enabled || !payCfg.publishableKey) {
        throw new Error('Payments are not available right now.');
      }
      const intent = await noLogoCreditsService.createIntent(
        user.token,
        pkg.key,
      );
      if (!intent?.clientSecret) {
        throw new Error('Could not start Stripe checkout');
      }
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: intent.clientSecret,
        merchantDisplayName: 'Eatwaze',
        allowsDelayedPaymentMethods: false,
        defaultBillingDetails: {
          name: user?.name || undefined,
          email: user?.email || undefined,
        },
      });
      if (initError) {
        throw new Error(initError.message || 'Could not open payment sheet');
      }
      const { error: presentError } = await presentPaymentSheet();
      if (presentError) {
        if (presentError.code === 'Canceled') return;
        throw new Error(presentError.message || 'Payment cancelled');
      }
      const confirmed = await noLogoCreditsService.confirm(
        user.token,
        intent.paymentIntentId,
      );
      setCredits(Number(confirmed?.credits || 0));
      Alert.alert(
        'Pack unlocked',
        `You now have ${confirmed?.credits ?? pkg.itemCount} no-logo uploads.`,
      );
      load();
    } catch (e) {
      Alert.alert('Payment failed', e?.message || 'Please try again');
    } finally {
      setBuying(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#F5A623" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={10}>
          <Icon name="arrow-left" size={26} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>No-logo uploads</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              load();
            }}
          />
        }
      >
        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your no-logo credits</Text>
          <Text style={styles.balanceValue}>{credits}</Text>
          <Text style={styles.balanceHint}>
            With logo is free. Without logo uses 1 credit per short, video or
            image.
          </Text>
        </View>

        {packages.map(pkg => (
          <View key={pkg.key} style={styles.packCard}>
            <View style={styles.packTop}>
              <Text style={styles.packName}>{pkg.displayName}</Text>
              <Text style={styles.packPrice}>{formatGbp(pkg.priceGbp)}</Text>
            </View>
            <Text style={styles.packItems}>
              {pkg.itemCount} uploads without Eatwaze logo
            </Text>
            <Text style={styles.packDesc}>{pkg.description}</Text>
            <TouchableOpacity
              style={[styles.buyBtn, buying === pkg.key && styles.buyBtnOff]}
              disabled={!!buying}
              onPress={() => buyPack(pkg)}
            >
              {buying === pkg.key ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buyBtnText}>
                  Buy {pkg.itemCount} for {formatGbp(pkg.priceGbp)}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F7F7F7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#222' },
  content: { padding: 16, paddingBottom: 40 },
  balanceCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    padding: 18,
    marginBottom: 16,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  balanceValue: {
    color: '#F5A623',
    fontSize: 40,
    fontWeight: '800',
    marginTop: 4,
  },
  balanceHint: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    marginTop: 8,
    lineHeight: 18,
  },
  packCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  packTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packName: { fontSize: 18, fontWeight: '700', color: '#222' },
  packPrice: { fontSize: 18, fontWeight: '800', color: '#F5A623' },
  packItems: {
    marginTop: 6,
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  packDesc: { marginTop: 4, fontSize: 13, color: '#777', lineHeight: 18 },
  buyBtn: {
    marginTop: 14,
    backgroundColor: '#F5A623',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buyBtnOff: { opacity: 0.7 },
  buyBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
