export const OFFER_TYPES = {
  ORDER: 'order',
  AMOUNT: 'amount_discount',
  BOOKING: 'booking_discount',
};

export const PROMO_BENEFITS = {
  FREE_TAX_CHARGE: 'free_tax_charge',
};

export const ORDER_DISCOUNT_MODES = {
  AMOUNT: 'amount',
  DELIVERY_FREE: 'delivery_free',
};

/** Thumbnail for list/cards — never use video URL as Image source. */
export function getPromotionDisplayImage(promo) {
  const thumb = String(promo?.thumbnailUrl || '').trim();
  if (thumb.startsWith('http://') || thumb.startsWith('https://')) {
    return thumb;
  }
  return null;
}

const mapTierRow = t => ({
  minValue: Number(t?.minValue),
  maxValue:
    t?.maxValue != null && t?.maxValue !== '' ? Number(t.maxValue) : null,
  percent: Number(t?.percent),
  metricType: t?.metricType,
  benefit:
    t?.benefit === PROMO_BENEFITS.FREE_TAX_CHARGE
      ? PROMO_BENEFITS.FREE_TAX_CHARGE
      : undefined,
});

export const parsePromotionTiers = raw => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(mapTierRow)
    .filter(
      t =>
        Number.isFinite(t.minValue) &&
        ((Number.isFinite(t.percent) && t.percent > 0) ||
          t.benefit === PROMO_BENEFITS.FREE_TAX_CHARGE),
    );
};

export const parsePercentDiscountTiers = raw =>
  parsePromotionTiers(raw).filter(
    t => t.benefit !== PROMO_BENEFITS.FREE_TAX_CHARGE,
  );

export const parseDiscountTiers = parsePercentDiscountTiers;

export const isFreeTaxChargePromotion = promo =>
  parsePromotionTiers(promo?.discountTiers).some(
    t => t.benefit === PROMO_BENEFITS.FREE_TAX_CHARGE,
  );

export const findMatchingTierInList = (tiers, value, metricType = 'amount') => {
  const list = Array.isArray(tiers) ? tiers : [];
  const v = Number(value);
  if (!Number.isFinite(v) || !list.length) return null;
  const sorted = [...list]
    .filter(t => (t.metricType || metricType) === metricType)
    .sort((a, b) => Number(b.minValue) - Number(a.minValue));
  for (const tier of sorted) {
    const min = Number(tier.minValue);
    const max =
      tier.maxValue != null && Number.isFinite(Number(tier.maxValue))
        ? Number(tier.maxValue)
        : null;
    if (v >= min && (max == null || v <= max)) return tier;
  }
  return null;
};

export const getFreeTaxChargeTier = (promoOrTiers, itemsSubtotal) => {
  const tiers = Array.isArray(promoOrTiers)
    ? promoOrTiers
    : parsePromotionTiers(promoOrTiers?.discountTiers);
  return findMatchingTierInList(
    tiers.filter(t => t.benefit === PROMO_BENEFITS.FREE_TAX_CHARGE),
    itemsSubtotal,
    'amount',
  );
};

export const formatFreeTaxChargeSummary = (tier, currency = '£') => {
  if (!tier) return '';
  const min = Number(tier.minValue);
  if (!Number.isFinite(min)) return '';
  return `${currency}${min}+ → tax & charges free on delivery`;
};

export const isPromotionActive = promo => {
  if (!promo) return false;
  const now = new Date();
  const start = promo.startDate ? new Date(promo.startDate) : null;
  const end = promo.expireDate ? new Date(promo.expireDate) : null;
  if (start && start > now) return false;
  if (end && end < now) return false;
  return true;
};

export const matchesFulfillmentScope = (scopes, fulfillmentType) => {
  const list = Array.isArray(scopes) ? scopes : [];
  if (!list.length) return true;
  const ft = fulfillmentType === 'collection' ? 'collection' : 'delivery';
  if (list.includes('both')) return true;
  return list.includes(ft);
};

export const findMatchingTier = (tiers, value, metricType = 'amount') =>
  findMatchingTierInList(parsePercentDiscountTiers(tiers), value, metricType);

export const calcPercentDiscount = (amount, percent) => {
  const base = Number(amount);
  const pct = Number(percent);
  if (!Number.isFinite(base) || base <= 0 || !Number.isFinite(pct) || pct <= 0) {
    return 0;
  }
  return Math.round(((base * pct) / 100) * 100) / 100;
};

export const formatTierRange = (tier, metricType = 'amount', currency = '£') => {
  if (!tier) return '';
  const min = Number(tier.minValue);
  const max =
    tier.maxValue != null && Number.isFinite(Number(tier.maxValue))
      ? Number(tier.maxValue)
      : null;
  const unit = metricType === 'people' ? ' people' : '';
  const prefix = metricType === 'amount' ? currency : '';
  if (max != null) {
    return metricType === 'amount'
      ? `${prefix}${min}–${prefix}${max} → ${tier.percent}% off`
      : `${min}–${max}${unit} → ${tier.percent}% off`;
  }
  return metricType === 'amount'
    ? `${prefix}${min}+ → ${tier.percent}% off`
    : `${min}+${unit} → ${tier.percent}% off`;
};

export const formatPromotionSummary = (promo, currency = '£') => {
  const type = promo?.offerType || OFFER_TYPES.ORDER;
  const allTiers = parsePromotionTiers(promo?.discountTiers);
  const freeTaxTier = allTiers.find(
    t => t.benefit === PROMO_BENEFITS.FREE_TAX_CHARGE,
  );
  const tiers = parsePercentDiscountTiers(promo?.discountTiers);
  if (type === OFFER_TYPES.ORDER) {
    const code = (promo?.promoCode || '').trim();
    const pct = promo?.promoAmount;
    const codeLine =
      code && pct != null && Number(pct) > 0 && !tiers.length && !freeTaxTier
        ? `${code} • ${pct}% off`
        : code || '';
    const freeLine = freeTaxTier
      ? formatFreeTaxChargeSummary(freeTaxTier, currency)
      : '';
    if (tiers.length) {
      const tierLine = tiers
        .slice(0, 2)
        .map(t => formatTierRange(t, 'amount', currency))
        .join(' · ');
      return (
        [codeLine, freeLine, tierLine].filter(Boolean).join(' · ') ||
        promo?.title ||
        'Offer'
      );
    }
    return (
      [codeLine, freeLine].filter(Boolean).join(' · ') ||
      promo?.title ||
      'Offer'
    );
  }
  if (!tiers.length) return promo?.title || 'Discount offer';
  const metric =
    type === OFFER_TYPES.BOOKING
      ? promo?.tierMetricType || 'people'
      : 'amount';
  return tiers
    .slice(0, 3)
    .map(t => formatTierRange(t, metric, currency))
    .join(' · ');
};

export const formatFulfillmentScopes = scopes => {
  const list = Array.isArray(scopes) ? scopes : [];
  if (!list.length) return 'All orders';
  if (list.includes('both')) return 'Collection & Delivery';
  const labels = [];
  if (list.includes('collection')) labels.push('Collection');
  if (list.includes('delivery')) labels.push('Delivery');
  return labels.join(' & ') || 'All orders';
};

export const filterPromotionsByType = (promotions, offerType) => {
  const list = Array.isArray(promotions) ? promotions : [];
  return list.filter(p => (p.offerType || OFFER_TYPES.ORDER) === offerType);
};

export const findBestAmountDiscount = (
  promotions,
  billTotal,
  fulfillmentType,
) => {
  const list = (Array.isArray(promotions) ? promotions : []).filter(p => {
    const type = p?.offerType || OFFER_TYPES.ORDER;
    if (type === OFFER_TYPES.AMOUNT) return isPromotionActive(p);
    if (type === OFFER_TYPES.ORDER) {
      const tiers = parseDiscountTiers(p?.discountTiers);
      return isPromotionActive(p) && tiers.length > 0;
    }
    return false;
  });
  for (const promo of list) {
    if (!matchesFulfillmentScope(promo.fulfillmentScopes, fulfillmentType)) {
      continue;
    }
    const tier = findMatchingTier(promo.discountTiers, billTotal, 'amount');
    if (tier) {
      return {
        id: promo.id,
        title: promo.title,
        offerType: promo.offerType || OFFER_TYPES.AMOUNT,
        percent: tier.percent,
        tier,
        promo,
      };
    }
  }
  return null;
};

export const findBestBookingDiscount = (promotions, persons, bookingAmount) => {
  const list = filterPromotionsByType(promotions, OFFER_TYPES.BOOKING).filter(
    isPromotionActive,
  );
  for (const promo of list) {
    const metric = promo.tierMetricType || 'people';
    const value = metric === 'amount' ? bookingAmount : persons;
    if (value == null || !Number.isFinite(Number(value))) continue;
    const tier = findMatchingTier(promo.discountTiers, Number(value), metric);
    if (tier) {
      return {
        id: promo.id,
        title: promo.title,
        offerType: OFFER_TYPES.BOOKING,
        percent: tier.percent,
        tier,
        metric,
        promo,
      };
    }
  }
  return null;
};

/** Resolve owner radius for content browse, pickup, or delivery. */
export const getOwnerAreaKm = (ownerProfile, areaType = 'content') => {
  const positive = value => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? n : null;
  };
  if (areaType === 'delivery') {
    return positive(ownerProfile?.deliveryAreaKm);
  }
  if (areaType === 'pickup') {
    return (
      positive(ownerProfile?.pickupAreaKm) ??
      positive(ownerProfile?.contentAreaKm) ??
      positive(ownerProfile?.deliveryAreaKm)
    );
  }
  return (
    positive(ownerProfile?.contentAreaKm) ??
    positive(ownerProfile?.deliveryAreaKm)
  );
};

export const isUserWithinOwnerArea = (
  userLat,
  userLng,
  ownerProfile,
  areaType = 'content',
) => {
  if (
    ownerProfile?.latitude == null ||
    ownerProfile?.longitude == null ||
    userLat == null ||
    userLng == null
  ) {
    return false;
  }
  const maxKm = getOwnerAreaKm(ownerProfile, areaType);
  if (maxKm == null) return true;
  const R = 6371;
  const lat1 = Number(ownerProfile.latitude);
  const lng1 = Number(ownerProfile.longitude);
  const lat2 = Number(userLat);
  const lng2 = Number(userLng);
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return km <= maxKm;
};
