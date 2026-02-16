import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import {
  getPackages,
  getUserSubscription,
  purchasePackage,
} from '../services/subscriptionService';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

const SubscriptionScreen = () => {
  const navigation = useNavigation();
  const { user } = useSelector(state => state.app);
  const [packages, setPackages] = useState([]);
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState(null);

  const load = async () => {
    if (!user?.id) return;
    try {
      const [pkgs, sub] = await Promise.all([
        getPackages(),
        getUserSubscription(user.id),
      ]);
      setPackages(Array.isArray(pkgs) ? pkgs : []);
      setSubscription(sub);
    } catch (e) {
      console.error('Subscription load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [user?.id]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handlePurchase = async pkg => {
    if (!user?.id || purchasing) return;
    if (pkg.id === subscription?.id) return;
    setPurchasing(pkg.id);
    try {
      await purchasePackage(user.id, pkg.id);
      await load();
      Alert.alert('Success', `${pkg.displayName} plan activated!`);
    } catch (e) {
      Alert.alert(
        'Error',
        e?.response?.data?.message || e?.message || 'Failed to purchase',
      );
    } finally {
      setPurchasing(null);
    }
  };

  const isCurrent = pkg => subscription?.id === pkg.id;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={COLORS.primaryOrange} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Subscription</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primaryOrange]}
          />
        }
      >
        {subscription && (
          <View style={styles.currentCard}>
            <Text style={styles.currentLabel}>Current plan</Text>
            <Text style={styles.currentPlan}>{subscription.displayName}</Text>
            <Text style={styles.usage}>
              {subscription.currentVideoCount}/{subscription.videoLimit} videos •{' '}
              {subscription.currentShortCount}/{subscription.shortLimit} shorts
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Available plans</Text>
        {packages.map(pkg => (
          <TouchableOpacity
            key={pkg.id}
            style={[
              styles.packageCard,
              isCurrent(pkg) && styles.packageCardActive,
            ]}
            onPress={() => handlePurchase(pkg)}
            disabled={purchasing !== null || isCurrent(pkg)}
            activeOpacity={0.8}
          >
            <View style={styles.packageHeader}>
              <Text style={styles.packageName}>{pkg.displayName}</Text>
              <Text style={styles.packagePrice}>
                {pkg.price === 0 ? 'Free' : `$${pkg.price}`}
              </Text>
            </View>
            <Text style={styles.packageLimits}>
              {pkg.videoLimit} videos • {pkg.shortLimit} shorts
            </Text>
            {isCurrent(pkg) ? (
              <View style={styles.currentBadge}>
                <Icon name="check-circle" size={16} color={COLORS.success} />
                <Text style={styles.currentBadgeText}>Current</Text>
              </View>
            ) : purchasing === pkg.id ? (
              <ActivityIndicator size="small" color={COLORS.primaryOrange} />
            ) : (
              <Text style={styles.upgradeText}>
                {pkg.price === 0 ? 'Select' : 'Upgrade'}
              </Text>
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { padding: SPACING.xl, paddingBottom: 40 },
  currentCard: {
    backgroundColor: COLORS.primaryOrange,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.xxl,
  },
  currentLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FONTS.sm,
    marginBottom: 4,
  },
  currentPlan: {
    color: COLORS.white,
    fontSize: FONTS.xxl,
    fontWeight: FONTS.bold,
  },
  usage: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: FONTS.sm,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
  },
  packageCard: {
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  packageCardActive: {
    borderColor: COLORS.primaryOrange,
    backgroundColor: 'rgba(255,127,11,0.08)',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  packageName: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  packagePrice: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.primaryOrange,
  },
  packageLimits: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 8,
  },
  currentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  currentBadgeText: {
    fontSize: FONTS.sm,
    color: COLORS.success,
    marginLeft: 6,
    fontWeight: FONTS.medium,
  },
  upgradeText: {
    fontSize: FONTS.sm,
    color: COLORS.primaryOrange,
    fontWeight: FONTS.bold,
    marginTop: 12,
  },
});

export default SubscriptionScreen;
