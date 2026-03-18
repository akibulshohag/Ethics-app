import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const SHORTS_REPORT_REASONS = [
  'Sexual Content',
  'Violent or Repulsive Content',
  'Hateful or Abusive Content',
  'Harmful or Dangerous Acts',
  'Spam or Misleading',
  'Child Abuse',
  'Others',
];

const ShortsReportModal = ({
  visible,
  onClose,
  onSubmit,
  reasons = SHORTS_REPORT_REASONS,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedReason, setSelectedReason] = useState(reasons[0] || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      setSelectedReason(reasons[0] || '');
      setSubmitting(false);
    }
  }, [visible, reasons]);

  const handleSubmit = async () => {
    if (submitting || !selectedReason) return;
    setSubmitting(true);
    try {
      await onSubmit?.(selectedReason);
    } catch {
      /* parent shows error toast */
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: Math.max(20, insets.bottom + 16) }]}
          onPress={e => e.stopPropagation()}
        >
          <View style={styles.handle} />
          <Text style={styles.title}>Report</Text>
          <View style={styles.divider} />
          {reasons.map(reason => (
            <TouchableOpacity
              key={reason}
              activeOpacity={0.8}
              style={styles.optionRow}
              onPress={() => setSelectedReason(reason)}
            >
              <MaterialCommunityIcons
                name={
                  selectedReason === reason
                    ? 'radiobox-marked'
                    : 'radiobox-blank'
                }
                size={24}
                color="#FF8C00"
              />
              <Text style={styles.optionText}>{reason}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.divider} />
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              disabled={submitting}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.reportBtn}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <Text style={styles.reportText}>Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginVertical: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  optionText: {
    fontSize: 16,
    color: '#111',
    marginLeft: 12,
    flex: 1,
  },
  actions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: '#FFE4CC',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#FF8C00',
    fontSize: 16,
    fontWeight: '600',
  },
  reportBtn: {
    flex: 1,
    backgroundColor: '#FF8C00',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ShortsReportModal;
