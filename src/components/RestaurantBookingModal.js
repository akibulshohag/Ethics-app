import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { createRestaurantBooking } from '../services/bookingService';
import { getPromotionsByUser } from '../services/promotionService';
import {
  findBestBookingDiscount,
  formatTierRange,
  isPromotionActive,
  OFFER_TYPES,
  parseDiscountTiers,
} from '../utils/promotionUtils';

const nextBookingTime = () => {
  const d = new Date();
  d.setHours(d.getHours() + 1, 0, 0, 0);
  return d;
};

const formatDateTime = date => {
  if (!date) return 'Select date and time';
  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const RestaurantBookingModal = ({
  visible,
  onClose,
  ownerId,
  ownerName,
  currentUser,
  defaultAddress,
  onBooked,
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [persons, setPersons] = useState('2');
  const [bookingAmount, setBookingAmount] = useState('');
  const [bookingDate, setBookingDate] = useState(nextBookingTime);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ownerPromotions, setOwnerPromotions] = useState([]);
  const [promotionsLoading, setPromotionsLoading] = useState(false);

  const title = useMemo(
    () => `Book ${ownerName || 'Restaurant'}`,
    [ownerName],
  );

  useEffect(() => {
    if (!visible) return;
    setName(currentUser?.name || currentUser?.nickname || '');
    setAddress(currentUser?.address || defaultAddress || '');
    setPhone(currentUser?.phone || currentUser?.phoneNumber || '');
    setPersons('2');
    setBookingAmount('');
    setBookingDate(nextBookingTime());
  }, [currentUser, defaultAddress, visible]);

  useEffect(() => {
    if (!visible || !ownerId) return;
    let cancelled = false;
    setPromotionsLoading(true);
    getPromotionsByUser(ownerId, 1, 50)
      .then(res => {
        if (!cancelled) {
          setOwnerPromotions(
            (res?.promotions ?? []).filter(
              p =>
                p.offerType === OFFER_TYPES.BOOKING && isPromotionActive(p),
            ),
          );
        }
      })
      .catch(() => {
        if (!cancelled) setOwnerPromotions([]);
      })
      .finally(() => {
        if (!cancelled) setPromotionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [visible, ownerId]);

  const bookingMetricType = ownerPromotions[0]?.tierMetricType || 'people';
  const usesAmountMetric = bookingMetricType === 'amount';

  const activeBookingDiscount = useMemo(() => {
    const personsNum = Math.max(1, Number(persons) || 0);
    const amountNum = bookingAmount.trim()
      ? Number(bookingAmount)
      : undefined;
    return findBestBookingDiscount(ownerPromotions, personsNum, amountNum);
  }, [ownerPromotions, persons, bookingAmount]);

  const submit = async () => {
    if (!currentUser?.token) {
      Alert.alert('Login required', 'Please login to book a table.');
      return;
    }
    if (!ownerId) return;
    if (!name.trim()) {
      Alert.alert('Name required', 'Please enter your name.');
      return;
    }
    if (!address.trim()) {
      Alert.alert('Address required', 'Please enter your address.');
      return;
    }
    if (!phone.trim()) {
      Alert.alert('Phone required', 'Please enter your phone number.');
      return;
    }
    const personsNum = Math.max(1, Number(persons) || 0);
    if (!personsNum) {
      Alert.alert('Persons required', 'Please enter total persons.');
      return;
    }
    const amountNum = bookingAmount.trim() ? Number(bookingAmount) : undefined;
    if (usesAmountMetric && (amountNum == null || !Number.isFinite(amountNum))) {
      Alert.alert('Amount required', 'Enter estimated spend for this booking.');
      return;
    }
    setSubmitting(true);
    try {
      const booking = await createRestaurantBooking(currentUser.token, {
        ownerId,
        customerName: name,
        customerAddress: address,
        customerPhone: phone,
        persons: personsNum,
        bookingDate: bookingDate.toISOString(),
        bookingAmount: amountNum,
        promotionId: activeBookingDiscount?.id,
      });
      onBooked?.(booking);
      Alert.alert('Booking sent', 'Restaurant owner received your booking.');
      onClose?.();
    } catch (e) {
      Alert.alert('Booking failed', e?.message || 'Could not send booking.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => (submitting ? null : onClose?.())}
    >
      <Pressable
        style={styles.overlay}
        onPress={() => (submitting ? null : onClose?.())}
      >
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>

          {promotionsLoading ? (
            <ActivityIndicator color="#FF7F0B" style={{ marginBottom: 12 }} />
          ) : ownerPromotions.length > 0 ? (
            <View style={styles.offerBox}>
              <Text style={styles.offerTitle}>Booking offers</Text>
              {ownerPromotions.map(promo => {
                const tiers = parseDiscountTiers(promo.discountTiers);
                const metric = promo.tierMetricType || 'people';
                return (
                  <View key={promo.id} style={styles.offerCard}>
                    <Text style={styles.offerName}>{promo.title}</Text>
                    {tiers.slice(0, 4).map((tier, idx) => (
                      <Text key={`${promo.id}-${idx}`} style={styles.offerLine}>
                        • {formatTierRange(tier, metric)}
                      </Text>
                    ))}
                  </View>
                );
              })}
              {activeBookingDiscount ? (
                <Text style={styles.offerApplied}>
                  Your booking qualifies for {activeBookingDiscount.percent}% off
                </Text>
              ) : (
                <Text style={styles.offerHint}>
                  {usesAmountMetric
                    ? 'Enter estimated spend to see if you qualify.'
                    : 'Adjust party size to see if you qualify.'}
                </Text>
              )}
            </View>
          ) : null}

          <Text style={styles.label}>Name</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            value={address}
            onChangeText={setAddress}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
          />

          <Text style={styles.label}>Persons</Text>
          <TextInput
            style={styles.input}
            value={persons}
            onChangeText={setPersons}
            keyboardType="number-pad"
          />

          {usesAmountMetric ? (
            <>
              <Text style={styles.label}>Estimated spend (£)</Text>
              <TextInput
                style={styles.input}
                value={bookingAmount}
                onChangeText={setBookingAmount}
                keyboardType="decimal-pad"
                placeholder="e.g. 80"
              />
            </>
          ) : null}

          <Text style={styles.label}>Date & time</Text>
          <TouchableOpacity
            style={styles.dateBtn}
            onPress={() => setShowDatePicker(true)}
          >
            <Icon name="calendar" size={18} color="#FF7F0B" />
            <Text style={styles.dateText}>{formatDateTime(bookingDate)}</Text>
          </TouchableOpacity>

          {showDatePicker ? (
            <DateTimePicker
              value={bookingDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(Platform.OS === 'ios');
                if (date) {
                  setBookingDate(date);
                  setShowTimePicker(true);
                }
              }}
            />
          ) : null}
          {showTimePicker ? (
            <DateTimePicker
              value={bookingDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowTimePicker(Platform.OS === 'ios');
                if (date) setBookingDate(date);
              }}
            />
          ) : null}

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitDisabled]}
            onPress={submit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Send booking</Text>
            )}
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '90%',
  },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12, color: '#222' },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
    fontSize: 15,
    color: '#222',
  },
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
    paddingVertical: 10,
  },
  dateText: { fontSize: 15, color: '#333' },
  submitBtn: {
    marginTop: 20,
    backgroundColor: '#FF7F0B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  offerBox: {
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#FFE0C2',
  },
  offerTitle: { fontSize: 14, fontWeight: '700', color: '#FF7F0B', marginBottom: 6 },
  offerCard: { marginBottom: 6 },
  offerName: { fontSize: 13, fontWeight: '600', color: '#333' },
  offerLine: { fontSize: 12, color: '#555', marginTop: 2 },
  offerApplied: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: '#2E7D32',
  },
  offerHint: { marginTop: 6, fontSize: 12, color: '#777' },
});

export default RestaurantBookingModal;
