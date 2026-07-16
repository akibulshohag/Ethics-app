import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  OFFER_TYPES,
  formatFulfillmentScopes,
  formatFreeTaxChargeSummary,
  formatPromotionSummary,
  formatTierRange,
  getFreeTaxChargeTier,
  isPromotionActive,
  parsePercentDiscountTiers,
  parsePromotionTiers,
  PROMO_BENEFITS,
} from '../utils/promotionUtils';

const sectionTitle = type => {
  if (type === OFFER_TYPES.AMOUNT) return 'Amount discounts';
  if (type === OFFER_TYPES.BOOKING) return 'Booking discounts';
  return 'Promo codes & offers';
};

const PromotionalOffersModal = ({
  visible,
  onClose,
  promotions = [],
  ownerName,
  includeInactive = false,
}) => {
  const list = Array.isArray(promotions) ? promotions : [];
  const active = includeInactive ? list : list.filter(isPromotionActive);
  const orderOffers = active.filter(p => (p.offerType || OFFER_TYPES.ORDER) === OFFER_TYPES.ORDER);
  const amountOffers = active.filter(p => p.offerType === OFFER_TYPES.AMOUNT);
  const bookingOffers = active.filter(p => p.offerType === OFFER_TYPES.BOOKING);

  const renderSection = (type, items) => {
    if (!items.length) return null;
    return (
      <View style={styles.section} key={type}>
        <Text style={styles.sectionTitle}>{sectionTitle(type)}</Text>
        {items.map(promo => {
          const tiers = parsePromotionTiers(promo.discountTiers);
          const percentTiers = parsePercentDiscountTiers(promo.discountTiers);
          const freeTaxTier = tiers.find(
            t => t.benefit === PROMO_BENEFITS.FREE_TAX_CHARGE,
          );
          const metric =
            promo.offerType === OFFER_TYPES.BOOKING
              ? promo.tierMetricType || 'people'
              : 'amount';
          return (
            <View key={promo.id} style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>{promo.title}</Text>
                {includeInactive && !isPromotionActive(promo) ? (
                  <Text style={styles.inactiveBadge}>Inactive</Text>
                ) : null}
              </View>
              {promo.offerType === OFFER_TYPES.ORDER ? (
                <>
                  <Text style={styles.cardSub}>
                    Code: <Text style={styles.bold}>{promo.promoCode}</Text>
                    {promo.promoAmount != null &&
                    Number(promo.promoAmount) > 0 &&
                    !percentTiers.length &&
                    !freeTaxTier
                      ? ` · ${promo.promoAmount}% off`
                      : ''}
                  </Text>
                  {freeTaxTier ? (
                    <Text style={styles.cardSub}>
                      {formatFreeTaxChargeSummary(freeTaxTier)}
                    </Text>
                  ) : null}
                  {percentTiers.length ? (
                    <View style={styles.tierList}>
                      {percentTiers.map((tier, idx) => (
                        <Text key={`${promo.id}-order-tier-${idx}`} style={styles.tierLine}>
                          • {formatTierRange(tier, 'amount')}
                        </Text>
                      ))}
                    </View>
                  ) : null}
                  {promo.fulfillmentScopes?.length ? (
                    <Text style={styles.cardSub}>
                      {formatFulfillmentScopes(promo.fulfillmentScopes)}
                    </Text>
                  ) : null}
                </>
              ) : null}
              {promo.offerType === OFFER_TYPES.AMOUNT ? (
                <Text style={styles.cardSub}>{formatFulfillmentScopes(promo.fulfillmentScopes)}</Text>
              ) : null}
              {promo.offerType !== OFFER_TYPES.ORDER ? (
                percentTiers.length ? (
                  <View style={styles.tierList}>
                    {percentTiers.map((tier, idx) => (
                      <Text key={`${promo.id}-tier-${idx}`} style={styles.tierLine}>
                        • {formatTierRange(tier, metric)}
                      </Text>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.cardSub}>{formatPromotionSummary(promo)}</Text>
                )
              ) : null}
              {promo.description ? (
                <Text style={styles.cardDesc}>{promo.description}</Text>
              ) : null}
            </View>
          );
        })}
      </View>
    );
  };

  const empty = !active.length;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {ownerName ? `${ownerName} — Offers` : 'Promotional offers'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {empty ? (
              <View style={styles.emptyWrap}>
                <MaterialCommunityIcons name="tag-off-outline" size={40} color="#BBB" />
                <Text style={styles.emptyText}>
                  {includeInactive
                    ? 'No promotions yet.'
                    : 'No active offers right now.'}
                </Text>
              </View>
            ) : (
              <>
                {renderSection(OFFER_TYPES.ORDER, orderOffers)}
                {renderSection(OFFER_TYPES.AMOUNT, amountOffers)}
                {renderSection(OFFER_TYPES.BOOKING, bookingOffers)}
              </>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: '#222', marginRight: 8 },
  body: { padding: 16 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#FF7F0B', marginBottom: 8 },
  card: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: { flex: 1, fontSize: 16, fontWeight: '700', color: '#222' },
  inactiveBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    backgroundColor: '#EEE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    overflow: 'hidden',
  },
  cardSub: { fontSize: 13, color: '#555', marginTop: 4 },
  cardDesc: { fontSize: 12, color: '#777', marginTop: 6 },
  tierList: { marginTop: 6 },
  tierLine: { fontSize: 13, color: '#333', marginTop: 2 },
  bold: { fontWeight: '700' },
  emptyWrap: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { marginTop: 10, color: '#888', fontSize: 14 },
});

export default PromotionalOffersModal;
