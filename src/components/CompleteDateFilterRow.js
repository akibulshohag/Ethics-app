import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Platform,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COMPLETE_DATE_FILTERS } from '../utils/orderCompleteDateFilter';

export default function CompleteDateFilterRow({
  filterId = 'all',
  onFilterChange,
  customDate,
  onCustomDateChange,
}) {
  const [showPicker, setShowPicker] = useState(false);
  const [pendingDate, setPendingDate] = useState(customDate || new Date());

  useEffect(() => {
    if (customDate) setPendingDate(customDate);
  }, [customDate]);

  const handleSelect = id => {
    onFilterChange?.(id);
    if (id === 'date') {
      setPendingDate(customDate || new Date());
      setShowPicker(true);
    }
  };

  const applyCustomDate = () => {
    onCustomDateChange?.(pendingDate);
    onFilterChange?.('date');
    setShowPicker(false);
  };

  const customLabel =
    filterId === 'date' && customDate
      ? customDate.toLocaleDateString([], {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : null;

  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator
        bounces
        alwaysBounceHorizontal
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={styles.row}
      >
        {COMPLETE_DATE_FILTERS.map(opt => {
          const active = filterId === opt.id;
          const isDate = opt.id === 'date';
          const label =
            isDate && customLabel ? customLabel : opt.label;
          return (
            <TouchableOpacity
              key={opt.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => handleSelect(opt.id)}
              activeOpacity={0.85}
            >
              {isDate ? (
                <Icon
                  name="calendar-month-outline"
                  size={15}
                  color={active ? '#B54708' : '#667085'}
                  style={styles.chipIcon}
                />
              ) : null}
              <Text
                style={[styles.chipText, active && styles.chipTextActive]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {Platform.OS === 'android' && showPicker ? (
        <DateTimePicker
          value={pendingDate}
          mode="date"
          display="default"
          onChange={(_, date) => {
            setShowPicker(false);
            if (!date) return;
            onCustomDateChange?.(date);
            onFilterChange?.('date');
          }}
        />
      ) : null}

      {Platform.OS === 'ios' ? (
        <Modal
          visible={showPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowPicker(false)}
        >
          <Pressable
            style={styles.modalOverlay}
            onPress={() => setShowPicker(false)}
          >
            <Pressable style={styles.modalSheet} onPress={e => e.stopPropagation()}>
              <View style={styles.modalHeader}>
                <TouchableOpacity onPress={() => setShowPicker(false)}>
                  <Text style={styles.modalCancel}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Pick date</Text>
                <TouchableOpacity onPress={applyCustomDate}>
                  <Text style={styles.modalDone}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={pendingDate}
                mode="date"
                display="spinner"
                onChange={(_, date) => {
                  if (date) setPendingDate(date);
                }}
                style={styles.iosPicker}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
    width: '100%',
    marginBottom: 10,
    backgroundColor: '#FFF',
  },
  scroll: {
    width: '100%',
    flexGrow: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 12,
    paddingRight: 28,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#FFF4EB',
    borderColor: '#F5A623',
  },
  chipIcon: {
    marginRight: 5,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#667085',
  },
  chipTextActive: {
    color: '#B54708',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  modalCancel: {
    fontSize: 15,
    color: '#667085',
    fontWeight: '600',
  },
  modalDone: {
    fontSize: 15,
    color: '#F5A623',
    fontWeight: '700',
  },
  iosPicker: {
    height: 220,
  },
});
