import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SPEED_OPTIONS = [
  {value: 0.5, label: '0.5x', desc: 'Slow motion'},
  {value: 1, label: '1x', desc: 'Normal speed'},
  {value: 2, label: '2x', desc: 'Fast'},
  {value: 3, label: '3x', desc: 'Super fast'},
];

const SpeedModal = ({visible, onClose, onSelect, selectedSpeed}) => {
  const [speed, setSpeed] = useState(selectedSpeed ?? 1);

  useEffect(() => {
    if (visible) {
      setSpeed(selectedSpeed ?? 1);
    }
  }, [visible, selectedSpeed]);

  const handleApply = () => {
    onSelect(speed);
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              <View style={styles.handle} />
              <Text style={styles.title}>Speed</Text>
              <Text style={styles.subtitle}>
                Preview playback speed (0.5x–3x). Export sends speedFactor to
                the server for processing.
              </Text>
              <View style={styles.options}>
                {SPEED_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.optionRow,
                      speed === opt.value && styles.optionRowSelected,
                    ]}
                    onPress={() => setSpeed(opt.value)}>
                    <View style={styles.optionLeft}>
                      <Text style={styles.optionLabel}>{opt.label}</Text>
                      <Text style={styles.optionDesc}>{opt.desc}</Text>
                    </View>
                    {speed === opt.value && (
                      <Ionicons
                        name="checkmark-circle"
                        size={24}
                        color="#FF8C00"
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                <Text style={styles.applyBtnText}>Apply</Text>
              </TouchableOpacity>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
    marginTop: 20,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  options: {
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    overflow: 'hidden',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  optionRowSelected: {
    backgroundColor: '#FFF8F0',
  },
  optionLeft: {},
  optionLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  optionDesc: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  applyBtn: {
    backgroundColor: '#FF8C00',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  applyBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default SpeedModal;
