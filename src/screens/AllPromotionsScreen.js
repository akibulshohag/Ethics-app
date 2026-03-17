import React, { useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { getNearbyPromotions } from '../services/promotionService';
import { safeImageUri } from '../utils/helper';

const UK_DEFAULT_LAT = 51.5074;
const UK_DEFAULT_LNG = -0.1278;
const DEFAULT_THUMB =
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd';

const AllPromotionsScreen = () => {
  const navigation = useNavigation();
  const currentUser = useSelector(state => state.app?.user);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const lat = currentUser?.latitude ?? UK_DEFAULT_LAT;
  const lng = currentUser?.longitude ?? UK_DEFAULT_LNG;

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNearbyPromotions(lat, lng, 500, 1, 100);
      setPromotions(res?.promotions ?? []);
    } catch (e) {
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPromotions();
    setRefreshing(false);
  }, [loadPromotions]);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#2C3E50" />

      {/* Same header as PromotionDetailScreen – OFFERS & PROMOTIONS */}
      <View style={styles.headerBackground}>
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <Icon name="chevron-left" size={16} color="#000" />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Icon name="dots-vertical" size={24} color="#FFF" />
        </View>
        <View style={styles.titleContainer}>
          <Text style={styles.mainTitle}>OFFERS &</Text>
          <View style={styles.orangePill}>
            <Text style={styles.pillText}>PROMOTIONS</Text>
          </View>
        </View>
      </View>

      <View style={styles.orangeDivider} />

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#F5A623']}
            tintColor="#F5A623"
          />
        }
      >
        {loading && promotions.length === 0 ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#F5A623" />
            <Text style={styles.loadingText}>Loading promotions...</Text>
          </View>
        ) : promotions.length === 0 ? (
          <Text style={styles.emptyHint}>No promotions found.</Text>
        ) : (
          <View style={styles.promoGrid}>
            {promotions.map((p, idx) => {
              const ownerName = p.user?.nickname || p.user?.name || '—';
              const offerText =
                p.promoAmount != null
                  ? `Get Flat ${p.promoAmount}% OFF`
                  : 'Special Offer';
              const codeText = p.promoCode ? p.promoCode : '';
              const thumb =
                p.thumbnailUrl || p.thumbnail?.src || DEFAULT_THUMB;
              return (
                <TouchableOpacity
                  key={p.id || idx}
                  style={styles.promoCard}
                  onPress={() =>
                    navigation.navigate('PromotionFullDetail', { promotion: p })
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.cardOrangeHeader}>
                    <Text style={styles.cardHeaderText} numberOfLines={1}>
                      {ownerName}
                    </Text>
                  </View>
                  <View style={styles.imageContainer}>
                    <Image
                      source={{ uri: safeImageUri(thumb) }}
                      style={styles.foodImage}
                    />
                  </View>
                  <View style={styles.cardFooter}>
                    <Text style={styles.getFlatText}>
                      {offerText}
                      {codeText ? (
                        <Text style={styles.highlightText}> • {codeText}</Text>
                      ) : null}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#FFF' },
  headerBackground: {
    backgroundColor: '#2C3E50',
    paddingBottom: 20,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
    zIndex: 2,
  },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    paddingTop: 10,
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: 'center',
  },
  backButtonText: { color: '#000', fontSize: 12, fontWeight: 'bold' },
  titleContainer: { alignItems: 'center', marginTop: 5 },
  mainTitle: { color: '#FFF', fontSize: 42, fontWeight: 'bold' },
  orangePill: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 25,
    paddingVertical: 5,
    borderRadius: 15,
    marginTop: -5,
  },
  pillText: { color: '#FFF', fontSize: 42, fontWeight: 'bold' },
  orangeDivider: {
    backgroundColor: '#F5A623',
    height: 40,
    width: '100%',
    marginTop: -30,
    zIndex: 1,
    borderBottomLeftRadius: 35,
    borderBottomRightRadius: 35,
  },

  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 24 },
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { marginTop: 8, fontSize: 14, color: '#666' },
  emptyHint: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 24,
  },
  promoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  promoCard: { width: '48%', marginBottom: 20 },
  cardOrangeHeader: {
    backgroundColor: '#F5A623',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    paddingVertical: 4,
    alignItems: 'center',
    zIndex: 3,
  },
  cardHeaderText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  imageContainer: {
    borderWidth: 2,
    borderColor: '#F5A623',
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: -8,
  },
  foodImage: { width: '100%', height: 110, resizeMode: 'cover' },
  cardFooter: { marginTop: 6, paddingLeft: 2 },
  getFlatText: { fontSize: 14, color: '#000', fontWeight: 'bold' },
  highlightText: { color: '#F5A623' },
  uptoText: { fontSize: 11, color: '#666' },
});

export default AllPromotionsScreen;
