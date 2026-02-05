import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SelectAudienceModal = ({ visible, onClose, initialValue, onApply }) => {
  const [madeForKids, setMadeForKids] = useState(null);
  const [ageRestricted, setAgeRestricted] = useState(null);

  useEffect(() => {
    if (visible) {
      setMadeForKids(initialValue?.madeForKids ?? null);
      setAgeRestricted(initialValue?.ageRestricted ?? null);
    }
  }, [visible, initialValue]);

  const handleApply = () => {
    onApply({ madeForKids, ageRestricted });
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
          <Text style={styles.headerTitle}>Select Audience</Text>
          <View style={{ width: 24 }} /> 
        </View>

        <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
          
          <Text style={styles.sectionTitle}>Is this video made for kids?</Text>
          
          <View style={styles.radioGroup}>
            <RadioOption 
              label="Yes, it's made for kids" 
              selected={madeForKids === true}
              onSelect={() => setMadeForKids(true)}
            />
            <RadioOption 
              label="No, it's not made for kids" 
              selected={madeForKids === false}
              onSelect={() => setMadeForKids(false)}
            />
          </View>

          <View style={styles.spacer} />

          <Text style={styles.sectionTitle}>Is this video made for kids?</Text> 
          {/* Note: Using the exact header text as noticed in the user's provided image for visual fidelity, 
              even though logically it might refer to Age Restriction. The options below clarify the context. */}
          
          <View style={styles.radioGroup}>
            <RadioOption 
              label="Yes, restrict my video to viewers over 18" 
              selected={ageRestricted === true}
              onSelect={() => setAgeRestricted(true)}
            />
            <RadioOption 
              label="No, don't restrict my video to viewers over 18" 
              selected={ageRestricted === false}
              onSelect={() => setAgeRestricted(false)}
            />
          </View>

        </ScrollView>

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
  },
  contentContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 15,
  },
  radioGroup: {
    marginBottom: 10,
  },
  radioOption: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
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
    fontSize: 14,
    color: '#000',
    flex: 1,
  },
  spacer: {
    height: 20,
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

export default SelectAudienceModal;
