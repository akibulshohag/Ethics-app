import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Pressable,
} from 'react-native';
const ORANGE = '#FF7A00';
const REASONS = [
  'Sexual Content',
  'Violent or Repulsive Content',
  'Hateful or Abusive Content',
  'Harmful or Dangerous Acts',
  'Spam or Misleading',
  'Child Abuse',
  'Others',
];

const ReportContentModal = ({
  visible,
  onClose,
  onSubmit,
  submitting,
}) => {
  const [selected, setSelected] = useState(REASONS[0]);

  useEffect(() => {
    if (visible) setSelected(REASONS[0]);
  }, [visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <Text style={styles.title}>Report</Text>
              <View style={styles.divider} />
              {REASONS.map(reason => {
                const isSel = selected === reason;
                return (
                  <Pressable
                    key={reason}
                    style={styles.reasonRow}
                    onPress={() => setSelected(reason)}
                  >
                    <View
                      style={[
                        styles.radioOuter,
                        isSel && styles.radioOuterSelected,
                      ]}
                    >
                      {isSel ? (
                        <View style={styles.radioInner} />
                      ) : null}
                    </View>
                    <Text style={styles.reasonText}>{reason}</Text>
                  </Pressable>
                );
              })}
              <View style={styles.divider} />
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={onClose}
                  disabled={submitting}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.reportBtn}
                  onPress={() => onSubmit?.(selected)}
                  disabled={submitting}
                >
                  <Text style={styles.reportBtnText}>
                    {submitting ? '…' : 'Report'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 10,
    paddingBottom: 28,
    maxHeight: '88%',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e8e8e8',
    marginVertical: 8,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#ccc',
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: ORANGE,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: ORANGE,
  },
  reasonText: {
    fontSize: 16,
    color: '#222',
    flex: 1,
  },
  btnRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 8,
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: 'rgba(255, 122, 0, 0.12)',
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: ORANGE,
    fontSize: 16,
    fontWeight: '700',
  },
  reportBtn: {
    flex: 1,
    backgroundColor: ORANGE,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  reportBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default ReportContentModal;
