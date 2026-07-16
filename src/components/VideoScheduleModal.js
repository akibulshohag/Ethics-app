import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Modal,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Dropdown } from 'react-native-element-dropdown';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

/**
 * Pick a calendar date for scheduled publish (start of that local day).
 * "Publish immediately" clears the schedule.
 */
const VideoScheduleModal = ({
  visible,
  onClose,
  onSelectNow,
  onConfirmDate,
  initialDate,
}) => {
  const base = useMemo(() => new Date(), []);
  const [year, setYear] = useState(base.getFullYear());
  const [month, setMonth] = useState(base.getMonth() + 1);
  const [day, setDay] = useState(base.getDate());

  useEffect(() => {
    if (visible) {
      const d = initialDate && initialDate instanceof Date ? initialDate : new Date();
      setYear(d.getFullYear());
      setMonth(d.getMonth() + 1);
      setDay(d.getDate());
    }
  }, [visible, initialDate]);

  const yearOptions = useMemo(() => {
    const y0 = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, i) => ({
      label: String(y0 + i),
      value: y0 + i,
    }));
  }, []);

  const monthOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        label: new Date(2000, i, 1).toLocaleString('default', { month: 'long' }),
        value: i + 1,
      })),
    [],
  );

  const dayOptions = useMemo(() => {
    const dim = new Date(year, month, 0).getDate();
    return Array.from({ length: dim }, (_, i) => ({
      label: String(i + 1),
      value: i + 1,
    }));
  }, [year, month]);

  useEffect(() => {
    const dim = new Date(year, month, 0).getDate();
    if (day > dim) setDay(dim);
  }, [year, month, day]);

  const handleConfirm = () => {
    const d = new Date(year, month - 1, day, 0, 0, 0, 0);
    const startToday = new Date();
    startToday.setHours(0, 0, 0, 0);
    if (d.getTime() < startToday.getTime()) {
      onSelectNow();
      onClose();
      return;
    }
    onConfirmDate(d);
    onClose();
  };

  const handleNow = () => {
    onSelectNow();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Schedule publish</Text>
          <Text style={styles.hint}>
            Your video will appear in feeds starting on the date you choose (at
            midnight in your timezone).
          </Text>

          <TouchableOpacity style={styles.nowRow} onPress={handleNow}>
            <Text style={styles.nowText}>Publish immediately</Text>
            <Text style={styles.nowSub}>Video is visible as soon as upload finishes</Text>
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>Or schedule for:</Text>

          <View style={styles.row3}>
            <View style={styles.ddWrap}>
              <Text style={styles.ddLabel}>Day</Text>
              <Dropdown
                style={styles.dropdown}
                data={dayOptions}
                labelField="label"
                valueField="value"
                value={day}
                onChange={e => setDay(e.value)}
              />
            </View>
            <View style={styles.ddWrap}>
              <Text style={styles.ddLabel}>Month</Text>
              <Dropdown
                style={styles.dropdown}
                data={monthOptions}
                labelField="label"
                valueField="value"
                value={month}
                onChange={e => setMonth(e.value)}
              />
            </View>
            <View style={styles.ddWrap}>
              <Text style={styles.ddLabel}>Year</Text>
              <Dropdown
                style={styles.dropdown}
                data={yearOptions}
                labelField="label"
                valueField="value"
                value={year}
                onChange={e => setYear(e.value)}
              />
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.okBtn} onPress={handleConfirm}>
              <Text style={styles.okText}>Set date</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: SPACING.lg,
    paddingBottom: Platform.OS === 'ios' ? 32 : SPACING.lg,
    maxHeight: '85%',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111',
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
    lineHeight: 18,
  },
  nowRow: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: '#FFF4EB',
    borderRadius: BORDER_RADIUS.md,
    marginBottom: 20,
  },
  nowText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primaryOrange || '#F97507',
  },
  nowSub: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  row3: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 24,
  },
  ddWrap: { flex: 1, minWidth: 0 },
  ddLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 4,
  },
  dropdown: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    minHeight: 44,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  cancelText: { fontSize: 16, color: '#666' },
  okBtn: {
    backgroundColor: COLORS.primaryOrange || '#F97507',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  okText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

export default VideoScheduleModal;
