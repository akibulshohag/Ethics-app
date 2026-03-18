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
import { getPackages, purchasePackage } from '../services/subscriptionService';

const SubscriptionScreen = () => {
  const navigation = useNavigation();
  const { user } = useSelector(state => state.app);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [purchasing, setPurchasing] = useState(null);

  const load = async () => {
    try {
      const pkgs = await getPackages();
      setPackages(Array.isArray(pkgs) ? pkgs : []);
    } catch (e) {
      console.error('Subscription load error:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handlePurchase = async (pkg) => {
    if (purchasing) return;
    setPurchasing(pkg.id);
    try {
      await purchasePackage(user.id, pkg.id);
      Alert.alert('Success', `${pkg.displayName} plan activated!`);
    } catch (e) {
      Alert.alert('Error', 'Failed to purchase');
    } finally {
      setPurchasing(null);
    }
  };

  const FeatureItem = ({ text }) => (
    <View style={styles.featureRow}>
      <Icon name="check" size={20} color="#FF8C00" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color="#333" />
        </TouchableOpacity>
      </View>

      <ScrollView 
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.title}>Subscribe to Premium</Text>
        <Text style={styles.subtitle}>
          Enjoy watching Full-HD videos, without restrictions and without ads
        </Text>

        {packages.map((pkg) => (
          <TouchableOpacity
            key={pkg.id}
            style={styles.card}
            onPress={() => handlePurchase(pkg)}
            disabled={purchasing !== null}
            activeOpacity={0.9}
          >
            <Icon name="crown" size={40} color="#FF8C00" style={styles.crownIcon} />
            
            <View style={styles.priceContainer}>
              <Text style={styles.currency}>$</Text>
              <Text style={styles.price}>{pkg.price}</Text>
              <Text style={styles.duration}>/{pkg.duration || 'month'}</Text>
            </View>

            <View style={styles.divider} />

            <FeatureItem
              text={`Up to ${pkg.videoLimit} video uploads`}
            />
            <FeatureItem
              text={`Up to ${pkg.shortLimit} short uploads`}
            />
            <FeatureItem text="Higher plans = more content capacity" />

            {purchasing === pkg.id && (
              <ActivityIndicator size="small" color="#FF8C00" style={{marginTop: 10}} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  header: { padding: 16 },
  scrollContent: { paddingHorizontal: 20, alignItems: 'center', paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '800', color: '#FF7A00', marginBottom: 10 },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', paddingHorizontal: 20, marginBottom: 30, lineHeight: 20 },
  card: {
    width: '100%',
    backgroundColor: '#F9F9F9',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1.5,
    borderColor: '#FFBA70',
    marginBottom: 20,
    alignItems: 'center',
  },
  crownIcon: { marginBottom: 10 },
  priceContainer: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: 20 },
  currency: { fontSize: 24, fontWeight: '700', color: '#333', marginBottom: 8 },
  price: { fontSize: 42, fontWeight: '800', color: '#333' },
  duration: { fontSize: 16, color: '#888', marginBottom: 10, marginLeft: 4 },
  divider: { width: '100%', height: 1, backgroundColor: '#EEE', marginBottom: 20 },
  featureRow: { flexDirection: 'row', alignSelf: 'flex-start', alignItems: 'center', marginBottom: 12 },
  featureText: { fontSize: 14, color: '#444', marginLeft: 10, fontWeight: '500' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' }
});

export default SubscriptionScreen;