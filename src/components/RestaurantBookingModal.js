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
  const [bookingDate, setBookingDate] = useState(nextBookingTime);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
    setBookingDate(nextBookingTime());
  }, [currentUser, defaultAddress, visible]);

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
    setSubmitting(true);
    try {
      const booking = await createRestaurantBooking(currentUser.token, {
        ownerId,
        customerName: name,
        customerAddress: address,
        customerPhone: phone,
        persons: personsNum,
        bookingDate: bookingDate.toISOString(),
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
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.subtitle}>Send your booking request</Text>
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={onClose}
              disabled={submitting}
            >
              <Icon name="close" size={20} color="#333" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Name"
            placeholderTextColor="#999"
          />
          <TextInput
            style={[styles.input, styles.multiline]}
            value={address}
            onChangeText={setAddress}
            placeholder="Address"
            placeholderTextColor="#999"
            multiline
          />
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone number"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
          />
          <View style={styles.row}>
            <TextInput
              style={[styles.input, styles.rowInput]}
              value={persons}
              onChangeText={setPersons}
              placeholder="Persons"
              placeholderTextColor="#999"
              keyboardType="number-pad"
            />
            <TouchableOpacity
              style={[styles.input, styles.dateInput]}
              onPress={() => setShowDatePicker(true)}
            >
              <Icon name="calendar-clock-outline" size={18} color="#777" />
              <Text style={styles.dateText}>{formatDateTime(bookingDate)}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Text style={styles.submitText}>Send Booking</Text>
                <Icon name="arrow-right" size={20} color="#fff" />
              </>
            )}
          </TouchableOpacity>

          {showDatePicker ? (
            <DateTimePicker
              value={bookingDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              minimumDate={new Date()}
              onChange={(_, date) => {
                setShowDatePicker(false);
                if (!date) return;
                const next = new Date(bookingDate);
                next.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
                setBookingDate(next);
                setShowTimePicker(true);
              }}
            />
          ) : null}
          {showTimePicker ? (
            <DateTimePicker
              value={bookingDate}
              mode="time"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(_, date) => {
                setShowTimePicker(false);
                if (!date) return;
                const next = new Date(bookingDate);
                next.setHours(date.getHours(), date.getMinutes(), 0, 0);
                setBookingDate(next);
              }}
            />
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 20,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#111' },
  subtitle: { marginTop: 3, color: '#777', fontSize: 13 },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
    paddingHorizontal: 14,
    color: '#111',
    marginBottom: 12,
  },
  multiline: {
    minHeight: 72,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row', gap: 10 },
  rowInput: { flex: 0.35 },
  dateInput: {
    flex: 0.65,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  dateText: { marginLeft: 8, color: '#333', fontSize: 13, flex: 1 },
  submitBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F5A623',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});

export default RestaurantBookingModal;
