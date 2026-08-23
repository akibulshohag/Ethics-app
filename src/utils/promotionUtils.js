export const OFFER_TYPES = {
  ORDER: 'order',
  AMOUNT: 'amount_discount',
  BOOKING: 'booking_discount',
  BOTH: 'both',
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

const WEEKDAY_TO_DOW = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

const WEEKDAY_LABELS = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

const HHMM_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

export const appliesToOrders = offerType => {
  const t = offerType || OFFER_TYPES.ORDER;
  return (
    t === OFFER_TYPES.ORDER ||
    t === OFFER_TYPES.AMOUNT ||
    t === OFFER_TYPES.BOTH
  );
};

export const appliesToBookings = offerType => {
  const t = offerType || OFFER_TYPES.ORDER;
  return t === OFFER_TYPES.BOOKING || t === OFFER_TYPES.BOTH;
};

export const parseHhMm = value => {
  const m = String(value || '')
    .trim()
    .match(HHMM_RE);
  if (!m) return null;
  return { hours: Number(m[1]), minutes: Number(m[2]) };
};

export const normalizeHhMm = value => {
  const parsed = parseHhMm(value);
  if (!parsed) return '';
  return `${String(parsed.hours).padStart(2, '0')}:${String(
    parsed.minutes,
  ).padStart(2, '0')}`;
};

export const hhMmToMinutes = value => {
  const parsed = parseHhMm(value);
  if (!parsed) return null;
  return parsed.hours * 60 + parsed.minutes;
};

export const formatHhMmDisplay = value => {
  const parsed = parseHhMm(value);
  if (!parsed) return '';
  const hour12 = parsed.hours % 12 || 12;
  const ampm = parsed.hours >= 12 ? 'PM' : 'AM';
  return `${hour12}:${String(parsed.minutes).padStart(2, '0')} ${ampm}`;
};

export const getLondonParts = date => {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return null;
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    fmt.formatToParts(d).map(p => [p.type, p.value]),
  );
  let hour = Number(parts.hour);
  if (parts.dayPeriod) {
    const period = String(parts.dayPeriod).toLowerCase();
    if (period.startsWith('p') && hour < 12) hour += 12;
    if (period.startsWith('a') && hour === 12) hour = 0;
  }
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour,
    minute: Number(parts.minute),
    dayOfWeek: WEEKDAY_TO_DOW[parts.weekday] ?? 0,
  };
};

export const parseScheduleSlots = raw => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map(row => {
      const dayOfWeek = Number(row?.dayOfWeek);
      const startTime = normalizeHhMm(row?.startTime);
      const endTime = normalizeHhMm(row?.endTime);
      const startMin = hhMmToMinutes(startTime);
      const endMin = hhMmToMinutes(endTime);
      if (
        !Number.isInteger(dayOfWeek) ||
        dayOfWeek < 0 ||
        dayOfWeek > 6 ||
        startMin == null ||
        endMin == null ||
        endMin <= startMin
      ) {
        return null;
      }
      return { dayOfWeek, startTime, endTime };
    })
    .filter(Boolean);
};

const isTimeInRange = (minutes, startTime, endTime) => {
  const startMin = hhMmToMinutes(startTime);
  const endMin = hhMmToMinutes(endTime);
  if (startMin == null && endMin == null) return true;
  if (startMin != null && minutes < startMin) return false;
  if (endMin != null && minutes > endMin) return false;
  return true;
};

export const matchesScheduleSlot = (slot, at) => {
  const parts = getLondonParts(at);
  if (!parts || parts.dayOfWeek !== slot.dayOfWeek) return false;
  return isTimeInRange(
    parts.hour * 60 + parts.minute,
    slot.startTime,
    slot.endTime,
  );
};

export const promotionAppliesAt = (promo, at = new Date()) => {
  if (!promo) return false;
  const now = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(now.getTime())) return false;
  const start = promo.startDate ? new Date(promo.startDate) : null;
  const end = promo.expireDate ? new Date(promo.expireDate) : null;
  if (start && !Number.isNaN(start.getTime()) && start > now) return false;
  if (end && !Number.isNaN(end.getTime()) && end < now) return false;

  const slots = parseScheduleSlots(promo.scheduleSlots);
  if (slots.length) {
    return slots.some(slot => matchesScheduleSlot(slot, now));
  }
  if (promo.startTime || promo.endTime) {
    const parts = getLondonParts(now);
    if (!parts) return false;
    return isTimeInRange(
      parts.hour * 60 + parts.minute,
      promo.startTime,
      promo.endTime,
    );
  }
  return true;
};

export const formatScheduleSlot = slot => {
  if (!slot) return '';
  const day = WEEKDAY_LABELS[slot.dayOfWeek] || '';
  return `${day} ${formatHhMmDisplay(slot.startTime)}–${formatHhMmDisplay(
    slot.endTime,
  )}`;
};

export const formatPromotionSchedule = promo => {
  const slots = parseScheduleSlots(promo?.scheduleSlots);
  if (slots.length) {
    return slots.map(formatScheduleSlot).join(' · ');
  }
  const start = formatHhMmDisplay(promo?.startTime);
  const end = formatHhMmDisplay(promo?.endTime);
  if (start && end) return `Daily ${start}–${end}`;
  if (start) return `From ${start}`;
  if (end) return `Until ${end}`;
  return '';
};

export const combineDateAndTime = (dateStr, timeStr, endOfDay = false) => {
  const raw = String(dateStr || '').trim();
  const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const parsedTime = parseHhMm(timeStr);
  const hours = parsedTime
    ? parsedTime.hours
    : endOfDay
    ? 23
    : 0;
  const minutes = parsedTime ? parsedTime.minutes : endOfDay ? 59 : 0;
  const seconds = parsedTime ? 0 : endOfDay ? 59 : 0;
  const date = new Date(year, month - 1, day, hours, minutes, seconds);
  return Number.isNaN(date.getTime()) ? null : date;
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
  const scheduleLine = formatPromotionSchedule(promo);
  const withSchedule = text =>
    [text, scheduleLine].filter(Boolean).join(' · ') || promo?.title || 'Offer';
  if (type === OFFER_TYPES.ORDER || type === OFFER_TYPES.BOTH) {
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
      return withSchedule(
        [codeLine, freeLine, tierLine].filter(Boolean).join(' · '),
      );
    }
    return withSchedule([codeLine, freeLine].filter(Boolean).join(' · '));
  }
  if (!tiers.length) return withSchedule(promo?.title || 'Discount offer');
  const metric =
    type === OFFER_TYPES.BOOKING
      ? promo?.tierMetricType || 'people'
      : 'amount';
  return withSchedule(
    tiers
      .slice(0, 3)
      .map(t => formatTierRange(t, metric, currency))
      .join(' · '),
  );
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
  at = new Date(),
) => {
  const list = (Array.isArray(promotions) ? promotions : []).filter(p => {
    const type = p?.offerType || OFFER_TYPES.ORDER;
    if (!appliesToOrders(type) || !promotionAppliesAt(p, at)) return false;
    if (type === OFFER_TYPES.AMOUNT || type === OFFER_TYPES.BOTH) return true;
    const tiers = parseDiscountTiers(p?.discountTiers);
    return tiers.length > 0;
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

export const findBestBookingDiscount = (
  promotions,
  persons,
  bookingAmount,
  at = new Date(),
) => {
  const list = (Array.isArray(promotions) ? promotions : []).filter(
    p => appliesToBookings(p?.offerType) && isPromotionActive(p),
  );
  for (const promo of list) {
    if (!promotionAppliesAt(promo, at)) continue;
    const metric = promo.tierMetricType || 'people';
    const value = metric === 'amount' ? bookingAmount : persons;
    if (value == null || !Number.isFinite(Number(value))) continue;
    const tier = findMatchingTier(promo.discountTiers, Number(value), metric);
    if (tier) {
      return {
        id: promo.id,
        title: promo.title,
        offerType: promo.offerType || OFFER_TYPES.BOOKING,
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
