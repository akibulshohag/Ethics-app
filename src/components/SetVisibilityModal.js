import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SetVisibilityModal = ({ visible, onClose, initialValue, onApply }) => {
  const [selectedOption, setSelectedOption] = useState(
    initialValue || 'Public',
  );

  useEffect(() => {
    if (visible && initialValue) {
      setSelectedOption(initialValue);
    }
  }, [visible, initialValue]);

  const handleApply = () => {
    onApply(selectedOption);
    onClose();
  };

  const VisibilityOption = ({ title, description, value }) => (
    <TouchableOpacity
      style={styles.optionContainer}
      onPress={() => setSelectedOption(value)}
      activeOpacity={0.7}
    >
      <View style={styles.radioContainer}>
        <View
          style={[
            styles.radioOuter,
            selectedOption === value && styles.radioOuterSelected,
          ]}
        >
          {selectedOption === value && <View style={styles.radioInner} />}
        </View>
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionDescription}>{description}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Set Visibility</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.content}>
          <VisibilityOption
            title="Public"
            description="Anyone can search for and view"
            value="Public"
          />
          {/* <VisibilityOption
            title="Unlisted"
            description="Anyone with the link can view"
            value="Unlisted"
          /> */}
          <VisibilityOption
            title="Private"
            description="Only people who choose can view"
            value="Private"
          />
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'black',
  },
  headerButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    paddingTop: 10,
  },
  optionContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    alignItems: 'flex-start',
  },
  radioContainer: {
    marginRight: 15,
    marginTop: 2,
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#FF8C00',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF8C00',
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#666',
  },
  footer: {
    padding: 20,
  },
  applyButton: {
    backgroundColor: '#FF8C00',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  applyButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default SetVisibilityModal;
