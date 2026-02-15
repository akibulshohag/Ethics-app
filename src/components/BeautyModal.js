import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const BeautyModal = ({visible, onClose, onApply, initialLevel = 0}) => {
  const [level, setLevel] = useState(initialLevel);

  useEffect(() => {
    if (visible) setLevel(initialLevel);
  }, [visible, initialLevel]);

  const handleApply = () => {
    onApply(Math.round(level));
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
              <Text style={styles.title}>Beauty</Text>
              <Text style={styles.subtitle}>Adjust beauty effect intensity</Text>
              <View style={styles.levelDisplay}>
                <Text style={styles.levelLabel}>{Math.round(level)}%</Text>
              </View>
              <View style={styles.presets}>
                {[0, 25, 50, 75, 100].map(v => (
                  <TouchableOpacity
                    key={v}
                    style={[styles.presetBtn, level === v && styles.presetBtnActive]}
                    onPress={() => setLevel(v)}>
                    <Text style={[styles.presetText, level === v && styles.presetTextActive]}>{v}%</Text>
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
    paddingHorizontal: 24,
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
    marginBottom: 24,
  },
  levelDisplay: {
    marginBottom: 20,
    alignItems: 'center',
  },
  levelLabel: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FF8C00',
  },
  presets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  presetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
  },
  presetBtnActive: {
    backgroundColor: '#FF8C00',
  },
  presetText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  presetTextActive: {
    color: 'white',
  },
  applyBtn: {
    backgroundColor: '#FF8C00',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default BeautyModal;
