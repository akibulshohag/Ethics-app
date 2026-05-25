import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  DEFAULT_DISCOVERY_FILTERS,
  normalizeDiscoveryFilters,
} from '../utils/discoveryFilters';

export default function DiscoveryFilterSheet({
  visible,
  initialFilters,
  onClose,
  onApply,
}) {
  const insets = useSafeAreaInsets();
  const [draftSort, setDraftSort] = useState('default');
  const [draftDietary, setDraftDietary] = useState('all');
  const [draftHighlyReordered, setDraftHighlyReordered] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const f = normalizeDiscoveryFilters(initialFilters || DEFAULT_DISCOVERY_FILTERS);
    setDraftSort(f.sort);
    setDraftDietary(f.dietary);
    setDraftHighlyReordered(f.highlyReordered);
  }, [visible, initialFilters]);

  const clearAll = () => {
    setDraftSort('default');
    setDraftDietary('all');
    setDraftHighlyReordered(false);
  };

  const apply = () => {
    onApply?.(
      normalizeDiscoveryFilters({
        sort: draftSort,
        dietary: draftDietary,
        highlyReordered: draftHighlyReordered,
      }),
    );
    onClose?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom + 16) }]}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Filters and Sorting</Text>

          <View style={styles.section}>
            <Text style={styles.heading}>Sort by</Text>
            <View style={styles.chipRow}>
              {[
                { id: 'price_low', label: 'Price · low to high' },
                { id: 'price_high', label: 'Price · high to low' },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.chip, draftSort === opt.id && styles.chipOn]}
                  onPress={() => {
                    setDraftSort(draftSort === opt.id ? 'default' : opt.id);
                    if (opt.id) setDraftHighlyReordered(false);
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      draftSort === opt.id && styles.chipTextOn,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.heading}>Veg / Non-veg preference</Text>
            <View style={styles.chipRow}>
              {[
                { id: 'veg', label: 'Veg', icon: 'circle', iconColor: '#2E7D32' },
                { id: 'egg', label: 'Egg', icon: 'egg', iconColor: '#C4A000' },
                {
                  id: 'non_veg',
                  label: 'Non-veg',
                  icon: 'triangle',
                  iconColor: '#C62828',
                },
              ].map(opt => (
                <TouchableOpacity
                  key={opt.id}
                  style={[styles.chip, draftDietary === opt.id && styles.chipOn]}
                  onPress={() =>
                    setDraftDietary(draftDietary === opt.id ? 'all' : opt.id)
                  }
                >
                  <Icon
                    name={opt.icon}
                    size={18}
                    color={draftDietary === opt.id ? '#FFF' : opt.iconColor}
                  />
                  <Text
                    style={[
                      styles.chipText,
                      draftDietary === opt.id && styles.chipTextOn,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.heading}>Top picks</Text>
            <View style={styles.chipRow}>
              <TouchableOpacity
                style={[
                  styles.chip,
                  draftHighlyReordered && styles.chipGreen,
                ]}
                onPress={() => {
                  setDraftHighlyReordered(v => !v);
                  if (!draftHighlyReordered) setDraftSort('default');
                }}
              >
                <Icon
                  name="repeat"
                  size={18}
                  color={draftHighlyReordered ? '#FFF' : '#2E7D32'}
                />
                <Text
                  style={[
                    styles.chipText,
                    draftHighlyReordered && styles.chipTextOn,
                  ]}
                >
                  Most ordered
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.clearBtn} onPress={clearAll}>
              <Text style={styles.clearText}>Clear all</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={apply}>
              <Text style={styles.applyText}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 16,
  },
  section: {
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  heading: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 10,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipOn: { backgroundColor: '#F5A623', borderColor: '#F5A623' },
  chipGreen: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
  chipText: { fontSize: 13, color: '#374151', fontWeight: '500' },
  chipTextOn: { color: '#FFF' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  clearBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
  },
  clearText: { color: '#F5A623', fontWeight: '700', fontSize: 15 },
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#F5A623',
    alignItems: 'center',
  },
  applyText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
