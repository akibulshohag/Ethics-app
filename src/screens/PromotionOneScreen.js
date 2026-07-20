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
import { useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { getNearbyPromotions } from '../services/promotionService';
import { safeImageUri } from '../utils/helper';

const PromotionsScreen = () => {
  const navigation = useNavigation();
  const currentUser = useSelector(state => state.app?.user);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const lat = currentUser?.latitude ?? 23.8103;
  const lng = currentUser?.longitude ?? 90.4125;

  const loadPromotions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getNearbyPromotions(lat, lng, 50, 1, 50);
      setPromotions(res?.promotions ?? []);
    } catch (e) {
      setPromotions([]);
    } finally {
      setLoading(false);
    }
  }, [lat, lng]);

  useEffect(() => {
    loadPromotions();
  }, [loadPromotions]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPromotions();
    setRefreshing(false);
  }, [loadPromotions]);

  const handlePromoPress = promotion => {
    if (promotion && promotion.id) {
      navigation.navigate('PromotionDetail', { promotion });
    }
  };

  const PromotionCard = ({ promotion }) => {
    const name =
      promotion?.title ||
      promotion?.user?.nickname ||
      promotion?.user?.name ||
      'Offer';
    const imageUri =
      promotion?.thumbnailUrl ||
      promotion?.videoUrl ||
      '';
    const offerText =
      promotion?.promoAmount != null
        ? `Get Flat ${promotion.promoAmount}% OFF`
        : 'Special Offer';
    const codeText = promotion?.promoCode ? `Code: ${promotion.promoCode}` : '';

    return (
      <TouchableOpacity
        style={styles.promoCard}
        onPress={() => handlePromoPress(promotion)}
        activeOpacity={0.8}
      >
        <View style={styles.cardOrangeHeader}>
          <Text style={styles.cardHeaderText} numberOfLines={1}>
            {name}
          </Text>
        </View>
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: safeImageUri(imageUri) }}
            style={styles.foodImage}
          />
        </View>
        <View style={styles.cardFooter}>
          <Text style={styles.getFlatText}>
            {offerText}
            {promotion?.promoCode ? (
              <Text style={styles.highlightText}> • {promotion.promoCode}</Text>
            ) : null}
          </Text>
          {codeText ? <Text style={styles.uptoText}>{codeText}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#2C3E50" />

      <View style={styles.headerBackground}>
        <View style={styles.topNav}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
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
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollArea}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#F5A623']}
            tintColor="#F5A623"
          />
        }
      >
        <View style={styles.promoGrid}>
          {loading && promotions.length === 0 ? (
            <ActivityIndicator
              size="large"
              color="#F5A623"
              style={{ marginTop: 40, alignSelf: 'center' }}
            />
          ) : promotions.length > 0 ? (
            promotions.map((p, idx) => (
              <PromotionCard key={p.id || idx} promotion={p} />
            ))
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTitle}>No promotions nearby</Text>
              <Text style={styles.emptyText}>
                Pull to refresh, or check back when restaurants add offers.
              </Text>
            </View>
          )}
        </View>
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
  scrollArea: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 24 },
  loadingWrap: { paddingVertical: 40, alignItems: 'center' },
  loadingText: { marginTop: 8, fontSize: 14, color: '#666' },
  emptyText: { fontSize: 14, color: '#888', textAlign: 'center' },
  emptyWrap: {
    width: '100%',
    paddingVertical: 40,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
    textAlign: 'center',
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

export default PromotionsScreen;
