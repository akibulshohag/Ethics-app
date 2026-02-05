import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const CommentsSettingsModal = ({ visible, onClose, initialValue, onApply }) => {
  const [selectedOption, setSelectedOption] = useState(initialValue || 'Allow all comments');

  useEffect(() => {
    if (visible && initialValue) {
      setSelectedOption(initialValue);
    }
  }, [visible, initialValue]);

  const handleApply = () => {
    onApply(selectedOption);
    onClose();
  };

  const RadioOption = ({ label, selected, onSelect }) => (
    <TouchableOpacity 
      style={styles.radioOption} 
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={[
        styles.radioOuter,
        selected && styles.radioOuterSelected
      ]}>
        {selected && <View style={styles.radioInner} />}
      </View>
      <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}>
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Comments</Text>
          <View style={{ width: 24 }} /> 
        </View>

        <View style={styles.content}>
          <Text style={styles.subHeader}>Choose setting comments for this video</Text>
          
          <View style={styles.radioGroup}>
            <RadioOption 
              label="Allow all comments" 
              selected={selectedOption === 'Allow all comments'}
              onSelect={() => setSelectedOption('Allow all comments')}
            />
            <RadioOption 
              label="Hold potentially inappropriate comments for review" 
              selected={selectedOption === 'Hold potentially inappropriate comments for review'}
              onSelect={() => setSelectedOption('Hold potentially inappropriate comments for review')}
            />
            <RadioOption 
              label="Hold all comments for review" 
              selected={selectedOption === 'Hold all comments for review'}
              onSelect={() => setSelectedOption('Hold all comments for review')}
            />
            <RadioOption 
              label="Disable comments" 
              selected={selectedOption === 'Disable comments'}
              onSelect={() => setSelectedOption('Disable comments')}
            />
          </View>
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
    padding: 20,
  },
  subHeader: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 20,
    lineHeight: 22,
  },
  radioGroup: {
    marginBottom: 10,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center', // Align items to center vertically
    marginBottom: 25,     // Increased spacing between options
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FF8C00',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    marginTop: 2, // Minor adjustment for alignment with multiline text
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
  radioLabel: {
    fontSize: 15,
    color: '#1a1a1a', // Darker text color
    fontWeight: '500',
    flex: 1,
    lineHeight: 20, // Better readability for multiline options
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

export default CommentsSettingsModal;
