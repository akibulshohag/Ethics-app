import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { createPromotion } from '../services/promotionService';
import { OFFER_TYPES } from '../utils/promotionUtils';

const emptyTier = () => ({ minValue: '', maxValue: '', percent: '' });

const formatDateForInput = d => {
  const dt = d instanceof Date ? d : new Date();
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const day = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const CreateTierDiscountModal = ({
  visible,
  onClose,
  onSuccess,
  userId,
  offerType = OFFER_TYPES.AMOUNT,
}) => {
  const isBooking = offerType === OFFER_TYPES.BOOKING;
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expireDate, setExpireDate] = useState('');
  const [tiers, setTiers] = useState([emptyTier()]);
  const [collectionChecked, setCollectionChecked] = useState(false);
  const [deliveryChecked, setDeliveryChecked] = useState(false);
  const [bothChecked, setBothChecked] = useState(false);
  const [tierMetricType, setTierMetricType] = useState('people');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      const today = formatDateForInput(new Date());
      setStartDate(today);
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setExpireDate(formatDateForInput(nextMonth));
    }
  }, [visible]);

  const reset = () => {
    setTitle('');
    setStartDate('');
    setExpireDate('');
    setTiers([emptyTier()]);
    setCollectionChecked(false);
    setDeliveryChecked(false);
    setBothChecked(false);
    setTierMetricType('people');
    setSubmitting(false);
  };

  const handleClose = () => {
    if (!submitting) {
      reset();
      onClose?.();
    }
  };

  const updateTier = (index, field, value) => {
    setTiers(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addTier = () => setTiers(prev => [...prev, emptyTier()]);

  const removeTier = index => {
    setTiers(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const toggleScope = scope => {
    if (scope === 'both') {
      const next = !bothChecked;
      setBothChecked(next);
      if (next) {
        setCollectionChecked(false);
        setDeliveryChecked(false);
      }
      return;
    }
    if (scope === 'collection') {
      setCollectionChecked(v => !v);
      setBothChecked(false);
      return;
    }
    setDeliveryChecked(v => !v);
    setBothChecked(false);
  };

  const buildFulfillmentScopes = () => {
    if (bothChecked) return ['both'];
    const scopes = [];
    if (collectionChecked) scopes.push('collection');
    if (deliveryChecked) scopes.push('delivery');
    return scopes;
  };

  const submit = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Title required', 'Please enter a promotion title.');
      return;
    }
    if (!isBooking) {
      const scopes = buildFulfillmentScopes();
      if (!scopes.length) {
        Alert.alert(
          'Fulfillment required',
          'Select Collection, Delivery, or Both.',
        );
        return;
      }
    }
    const parsedTiers = tiers
      .map(t => ({
        minValue: parseFloat(t.minValue),
        maxValue: t.maxValue.trim() ? parseFloat(t.maxValue) : null,
        percent: parseFloat(t.percent),
        metricType: isBooking ? tierMetricType : 'amount',
      }))
      .filter(
        t =>
          Number.isFinite(t.minValue) &&
          Number.isFinite(t.percent) &&
          t.percent > 0,
      );
    if (!parsedTiers.length) {
      Alert.alert('Tiers required', 'Add at least one valid discount tier.');
      return;
    }
    for (const t of parsedTiers) {
      if (t.maxValue != null && t.maxValue < t.minValue) {
        Alert.alert('Invalid tier', 'Max value must be greater than min value.');
        return;
      }
    }
    const start = startDate.trim();
    const expire = expireDate.trim();
    const startD = new Date(start);
    const expireD = new Date(expire);
    if (!start || !expire || Number.isNaN(startD.getTime()) || Number.isNaN(expireD.getTime())) {
      Alert.alert('Invalid dates', 'Use YYYY-MM-DD for start and expire date.');
      return;
    }
    if (expireD <= startD) {
      Alert.alert('Invalid dates', 'Expire date must be after start date.');
      return;
    }

    setSubmitting(true);
    try {
      await createPromotion({
        userId,
        title: trimmedTitle,
        offerType,
        startDate: startD.toISOString(),
        expireDate: expireD.toISOString(),
        discountTiers: parsedTiers,
        fulfillmentScopes: isBooking ? [] : buildFulfillmentScopes(),
        tierMetricType: isBooking ? tierMetricType : undefined,
        promoAmount: 0,
        promoCode: '',
      });
      reset();
      onClose?.();
      onSuccess?.();
    } catch (err) {
      Alert.alert('Failed', err?.message || 'Could not create promotion.');
    } finally {
      setSubmitting(false);
    }
  };

  const metricLabel = isBooking
    ? tierMetricType === 'amount'
      ? 'Amount (£)'
      : 'People'
    : 'Bill amount (£)';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isBooking ? 'Booking Discount' : 'Amount Discount'}
            </Text>
            <TouchableOpacity onPress={handleClose} disabled={submitting}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Weekend bill discount"
            />

            {!isBooking ? (
              <>
                <Text style={styles.label}>Applies to</Text>
                <View style={styles.scopeRow}>
                  <TouchableOpacity
                    style={[styles.scopeChip, collectionChecked && styles.scopeChipActive]}
                    onPress={() => toggleScope('collection')}
                  >
                    <MaterialCommunityIcons
                      name={collectionChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={20}
                      color={collectionChecked ? '#FF7F0B' : '#666'}
                    />
                    <Text style={styles.scopeText}>Collection</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.scopeChip, deliveryChecked && styles.scopeChipActive]}
                    onPress={() => toggleScope('delivery')}
                  >
                    <MaterialCommunityIcons
                      name={deliveryChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={20}
                      color={deliveryChecked ? '#FF7F0B' : '#666'}
                    />
                    <Text style={styles.scopeText}>Delivery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.scopeChip, bothChecked && styles.scopeChipActive]}
                    onPress={() => toggleScope('both')}
                  >
                    <MaterialCommunityIcons
                      name={bothChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={20}
                      color={bothChecked ? '#FF7F0B' : '#666'}
                    />
                    <Text style={styles.scopeText}>Both</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.label}>Discount based on</Text>
                <View style={styles.scopeRow}>
                  <TouchableOpacity
                    style={[styles.scopeChip, tierMetricType === 'people' && styles.scopeChipActive]}
                    onPress={() => setTierMetricType('people')}
                  >
                    <Text style={styles.scopeText}>People count</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.scopeChip, tierMetricType === 'amount' && styles.scopeChipActive]}
                    onPress={() => setTierMetricType('amount')}
                  >
                    <Text style={styles.scopeText}>Amount (£)</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Text style={styles.label}>Discount tiers</Text>
            <Text style={styles.hint}>
              Add ranges like 30–50 → 5%, 51–70 → 10%. Leave max empty for open-ended.
            </Text>
            {tiers.map((tier, index) => (
              <View key={`tier-${index}`} style={styles.tierRow}>
                <View style={styles.tierFields}>
                  <TextInput
                    style={[styles.input, styles.tierInput]}
                    value={tier.minValue}
                    onChangeText={v => updateTier(index, 'minValue', v)}
                    placeholder={`Min ${metricLabel}`}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.tierDash}>–</Text>
                  <TextInput
                    style={[styles.input, styles.tierInput]}
                    value={tier.maxValue}
                    onChangeText={v => updateTier(index, 'maxValue', v)}
                    placeholder="Max"
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[styles.input, styles.percentInput]}
                    value={tier.percent}
                    onChangeText={v => updateTier(index, 'percent', v)}
                    placeholder="%"
                    keyboardType="decimal-pad"
                  />
                </View>
                {tiers.length > 1 ? (
                  <TouchableOpacity onPress={() => removeTier(index)}>
                    <MaterialCommunityIcons name="minus-circle" size={22} color="#C62828" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            <TouchableOpacity style={styles.addTierBtn} onPress={addTier}>
              <MaterialCommunityIcons name="plus-circle" size={20} color="#FF7F0B" />
              <Text style={styles.addTierText}>Add another tier</Text>
            </TouchableOpacity>

            <Text style={styles.label}>Start date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={startDate} onChangeText={setStartDate} />
            <Text style={styles.label}>Expire date (YYYY-MM-DD)</Text>
            <TextInput style={styles.input} value={expireDate} onChangeText={setExpireDate} />
          </ScrollView>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>Create promotion</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '92%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  body: { paddingHorizontal: 16, paddingBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 6 },
  hint: { fontSize: 12, color: '#777', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#222',
    backgroundColor: '#FAFAFA',
  },
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FAFAFA',
  },
  scopeChipActive: { borderColor: '#FF7F0B', backgroundColor: '#FFF4EA' },
  scopeText: { fontSize: 13, color: '#333' },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tierFields: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tierInput: { flex: 1 },
  percentInput: { width: 56 },
  tierDash: { color: '#666' },
  addTierBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addTierText: { color: '#FF7F0B', fontWeight: '600' },
  submitBtn: {
    margin: 16,
    backgroundColor: '#FF7F0B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

export default CreateTierDiscountModal;
