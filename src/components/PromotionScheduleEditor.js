import React, { useMemo, useState } from 'react';
import {
  Alert,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  formatHhMmDisplay,
  formatScheduleSlot,
  hhMmToMinutes,
  normalizeHhMm,
} from '../utils/promotionUtils';

const WEEKDAYS = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

const dateFromHhMm = value => {
  const d = new Date();
  const normalized = normalizeHhMm(value);
  if (normalized) {
    const [h, m] = normalized.split(':').map(Number);
    d.setHours(h, m, 0, 0);
  } else {
    d.setHours(12, 0, 0, 0);
  }
  return d;
};

const dateFromYmd = value => {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return new Date();
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
};

const ymdFromDate = date => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const hhMmFromDate = date =>
  `${String(date.getHours()).padStart(2, '0')}:${String(
    date.getMinutes(),
  ).padStart(2, '0')}`;

const emptyDraft = () => ({
  dayOfWeek: 1,
  startTime: '14:00',
  endTime: '15:00',
});

const PromotionScheduleEditor = ({
  startDate,
  expireDate,
  startTime,
  endTime,
  slots,
  onStartDateChange,
  onExpireDateChange,
  onStartTimeChange,
  onEndTimeChange,
  onSlotsChange,
  disabled = false,
}) => {
  const [draft, setDraft] = useState(emptyDraft);
  const [editingIndex, setEditingIndex] = useState(null);
  const [pickerTarget, setPickerTarget] = useState(null);

  const pickerValue = useMemo(() => {
    if (pickerTarget === 'startDate') return dateFromYmd(startDate);
    if (pickerTarget === 'expireDate') return dateFromYmd(expireDate);
    if (pickerTarget === 'startTime') return dateFromHhMm(startTime);
    if (pickerTarget === 'endTime') return dateFromHhMm(endTime);
    if (pickerTarget === 'slotStart') return dateFromHhMm(draft.startTime);
    if (pickerTarget === 'slotEnd') return dateFromHhMm(draft.endTime);
    return new Date();
  }, [
    pickerTarget,
    startDate,
    expireDate,
    startTime,
    endTime,
    draft.startTime,
    draft.endTime,
  ]);

  const pickerMode =
    pickerTarget === 'startDate' || pickerTarget === 'expireDate'
      ? 'date'
      : 'time';

  const closePicker = () => setPickerTarget(null);

  const onPickerChange = (event, date) => {
    if (Platform.OS === 'android') {
      setPickerTarget(null);
      if (event?.type === 'dismissed' || !date) return;
    }
    if (!date) return;
    if (pickerTarget === 'startDate') onStartDateChange?.(ymdFromDate(date));
    else if (pickerTarget === 'expireDate')
      onExpireDateChange?.(ymdFromDate(date));
    else if (pickerTarget === 'startTime')
      onStartTimeChange?.(hhMmFromDate(date));
    else if (pickerTarget === 'endTime') onEndTimeChange?.(hhMmFromDate(date));
    else if (pickerTarget === 'slotStart')
      setDraft(prev => ({ ...prev, startTime: hhMmFromDate(date) }));
    else if (pickerTarget === 'slotEnd')
      setDraft(prev => ({ ...prev, endTime: hhMmFromDate(date) }));
    if (Platform.OS === 'ios' && pickerMode === 'date') {
      // keep open until user taps away; Android dialogs close themselves
    }
  };

  const addOrSaveSlot = () => {
    const start = normalizeHhMm(draft.startTime);
    const end = normalizeHhMm(draft.endTime);
    if (draft.dayOfWeek == null || draft.dayOfWeek < 0 || draft.dayOfWeek > 6) {
      Alert.alert('Day required', 'Select a weekday for this slot.');
      return;
    }
    if (!start || !end) {
      Alert.alert('Times required', 'Choose start and end time for this slot.');
      return;
    }
    if ((hhMmToMinutes(end) || 0) <= (hhMmToMinutes(start) || 0)) {
      Alert.alert('Invalid times', 'End time must be after start time.');
      return;
    }
    const nextSlot = {
      dayOfWeek: draft.dayOfWeek,
      startTime: start,
      endTime: end,
    };
    const list = Array.isArray(slots) ? [...slots] : [];
    if (editingIndex != null && editingIndex >= 0) {
      list[editingIndex] = nextSlot;
    } else {
      list.push(nextSlot);
    }
    onSlotsChange?.(list);
    setDraft(emptyDraft());
    setEditingIndex(null);
  };

  const editSlot = index => {
    const slot = slots?.[index];
    if (!slot) return;
    setDraft({
      dayOfWeek: Number(slot.dayOfWeek),
      startTime: normalizeHhMm(slot.startTime) || '14:00',
      endTime: normalizeHhMm(slot.endTime) || '15:00',
    });
    setEditingIndex(index);
  };

  const deleteSlot = index => {
    const list = (Array.isArray(slots) ? slots : []).filter(
      (_, i) => i !== index,
    );
    onSlotsChange?.(list);
    if (editingIndex === index) {
      setDraft(emptyDraft());
      setEditingIndex(null);
    }
  };

  const FieldButton = ({ value, placeholder, onPress }) => (
    <TouchableOpacity
      style={styles.fieldBtn}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.75}
    >
      <Text style={value ? styles.fieldValue : styles.fieldPlaceholder}>
        {value || placeholder}
      </Text>
      <MaterialCommunityIcons name="chevron-down" size={18} color="#888" />
    </TouchableOpacity>
  );

  return (
    <View>
      <Text style={styles.label}>Start date *</Text>
      <FieldButton
        value={startDate}
        placeholder="YYYY-MM-DD"
        onPress={() => setPickerTarget('startDate')}
      />
      <Text style={styles.label}>Start time</Text>
      <FieldButton
        value={startTime ? formatHhMmDisplay(startTime) : ''}
        placeholder="Optional, e.g. 2:00 PM"
        onPress={() => setPickerTarget('startTime')}
      />
      {startTime ? (
        <TouchableOpacity
          onPress={() => onStartTimeChange?.('')}
          disabled={disabled}
        >
          <Text style={styles.clearLink}>Clear start time</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.label}>Expire date *</Text>
      <FieldButton
        value={expireDate}
        placeholder="YYYY-MM-DD"
        onPress={() => setPickerTarget('expireDate')}
      />
      <Text style={styles.label}>End time</Text>
      <FieldButton
        value={endTime ? formatHhMmDisplay(endTime) : ''}
        placeholder="Optional, e.g. 3:00 PM"
        onPress={() => setPickerTarget('endTime')}
      />
      {endTime ? (
        <TouchableOpacity
          onPress={() => onEndTimeChange?.('')}
          disabled={disabled}
        >
          <Text style={styles.clearLink}>Clear end time</Text>
        </TouchableOpacity>
      ) : null}

      <Text style={styles.sectionHeading}>Day and time slots</Text>
      <Text style={styles.hint}>
        Add specific days like Monday 2:00 PM–3:00 PM. Checkout and booking
        discounts apply only when the order date and time match a slot. If you
        add no slots, the daily start/end time above is used (or any time in the
        date range).
      </Text>

      <Text style={styles.subLabel}>Day</Text>
      <View style={styles.dayRow}>
        {WEEKDAYS.map(day => {
          const active = draft.dayOfWeek === day.value;
          return (
            <TouchableOpacity
              key={day.value}
              style={[styles.dayChip, active && styles.dayChipActive]}
              onPress={() =>
                setDraft(prev => ({ ...prev, dayOfWeek: day.value }))
              }
              disabled={disabled}
            >
              <Text style={[styles.dayText, active && styles.dayTextActive]}>
                {day.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.slotTimeRow}>
        <View style={styles.slotTimeCol}>
          <Text style={styles.subLabel}>From</Text>
          <FieldButton
            value={formatHhMmDisplay(draft.startTime)}
            placeholder="Start"
            onPress={() => setPickerTarget('slotStart')}
          />
        </View>
        <View style={styles.slotTimeCol}>
          <Text style={styles.subLabel}>To</Text>
          <FieldButton
            value={formatHhMmDisplay(draft.endTime)}
            placeholder="End"
            onPress={() => setPickerTarget('slotEnd')}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.addSlotBtn}
        onPress={addOrSaveSlot}
        disabled={disabled}
      >
        <MaterialCommunityIcons
          name={editingIndex != null ? 'content-save' : 'plus-circle'}
          size={20}
          color="#FF7F0B"
        />
        <Text style={styles.addSlotText}>
          {editingIndex != null ? 'Save slot' : 'Add day and time'}
        </Text>
      </TouchableOpacity>
      {editingIndex != null ? (
        <TouchableOpacity
          onPress={() => {
            setDraft(emptyDraft());
            setEditingIndex(null);
          }}
          disabled={disabled}
        >
          <Text style={styles.clearLink}>Cancel edit</Text>
        </TouchableOpacity>
      ) : null}

      {(slots || []).map((slot, index) => (
        <View key={`slot-${index}-${slot.dayOfWeek}`} style={styles.slotCard}>
          <Text style={styles.slotLabel}>{formatScheduleSlot(slot)}</Text>
          <View style={styles.slotActions}>
            <TouchableOpacity
              onPress={() => editSlot(index)}
              disabled={disabled}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={20}
                color="#FF7F0B"
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => deleteSlot(index)}
              disabled={disabled}
              hitSlop={8}
            >
              <MaterialCommunityIcons
                name="delete-outline"
                size={20}
                color="#C62828"
              />
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {pickerTarget ? (
        <View>
          {Platform.OS === 'ios' ? (
            <TouchableOpacity style={styles.doneBtn} onPress={closePicker}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          ) : null}
          <DateTimePicker
            value={pickerValue}
            mode={pickerMode}
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            is24Hour={false}
            onChange={onPickerChange}
          />
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
    marginTop: 8,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF7F0B',
    marginTop: 16,
    marginBottom: 4,
  },
  hint: { fontSize: 12, color: '#777', marginBottom: 8 },
  fieldBtn: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAFAFA',
  },
  fieldValue: { fontSize: 16, color: '#333' },
  fieldPlaceholder: { fontSize: 16, color: '#999' },
  clearLink: {
    color: '#888',
    fontSize: 12,
    marginTop: 6,
    textDecorationLine: 'underline',
  },
  dayRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FAFAFA',
  },
  dayChipActive: { borderColor: '#FF7F0B', backgroundColor: '#FFF4EA' },
  dayText: { fontSize: 12, fontWeight: '600', color: '#555' },
  dayTextActive: { color: '#FF7F0B' },
  slotTimeRow: { flexDirection: 'row', gap: 8 },
  slotTimeCol: { flex: 1 },
  addSlotBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
  },
  addSlotText: { color: '#FF7F0B', fontWeight: '600' },
  slotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    backgroundColor: '#FFF',
  },
  slotLabel: { flex: 1, fontSize: 14, color: '#333', fontWeight: '600' },
  slotActions: { flexDirection: 'row', gap: 12, marginLeft: 8 },
  doneBtn: { alignSelf: 'flex-end', paddingVertical: 6 },
  doneText: { color: '#FF7F0B', fontWeight: '700' },
});

export default PromotionScheduleEditor;
