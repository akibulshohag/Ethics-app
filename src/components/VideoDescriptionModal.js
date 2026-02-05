import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Modal,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';

const { width } = Dimensions.get('window');

const VideoDescriptionModal = ({ 
  visible, 
  onClose, 
  description, 
  setDescription, 
  hashtags, 
  setHashtags 
}) => {
  const [hashtagInput, setHashtagInput] = useState('');

  const addHashtag = () => {
    if (hashtagInput.trim()) {
      const cleanTag = hashtagInput.trim().startsWith('#') 
        ? hashtagInput.trim() 
        : `#${hashtagInput.trim()}`;
      if (!hashtags.includes(cleanTag)) {
        setHashtags([...hashtags, cleanTag]);
      }
      setHashtagInput('');
    }
  };

  const removeHashtag = (tag) => {
    setHashtags(hashtags.filter(t => t !== tag));
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Description</Text>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialCommunityIcons name="dots-horizontal-circle-outline" size={26} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Description Section */}
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.descriptionInputContainer}>
            <TextInput
              style={styles.descriptionInput}
              placeholder="Your description here..."
              placeholderTextColor="#999"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
            />
          </View>

          {/* Hashtag Section */}
          <Text style={[styles.sectionTitle, { marginTop: SPACING.xl * 1.5 }]}>Hashtag</Text>
          <View style={styles.hashtagInputWrapper}>
            <TextInput
              style={styles.hashtagInput}
              placeholder="Type and enter"
              placeholderTextColor="#999"
              value={hashtagInput}
              onChangeText={setHashtagInput}
            />
            {hashtagInput.length > 0 && (
              <TouchableOpacity style={styles.addButton} onPress={addHashtag}>
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Hashtags Display */}
          <View style={styles.hashtagsContainer}>
            {hashtags.map((tag, index) => (
              <View key={index} style={styles.hashtagPill}>
                <Text style={styles.hashtagText}>{tag}</Text>
                <TouchableOpacity onPress={() => removeHashtag(tag)} style={styles.removeHashtag}>
                  <Ionicons name="close" size={16} color={COLORS.primaryOrange} />
                </TouchableOpacity>
              </View>
            ))}
          </View>

          {/* Apply Button */}
          <TouchableOpacity style={styles.applyButton} onPress={onClose}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    height: 56,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  headerButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  descriptionInputContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 250,
  },
  descriptionInput: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    flex: 1,
  },
  hashtagInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 25,
    paddingHorizontal: SPACING.lg,
    height: 50,
  },
  hashtagInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primaryOrange,
    borderRadius: 15,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  hashtagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: SPACING.md,
  },
  hashtagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.primaryOrange,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
    marginBottom: 10,
  },
  hashtagText: {
    color: COLORS.primaryOrange,
    fontSize: 14,
    fontWeight: '600',
  },
  removeHashtag: {
    marginLeft: 6,
  },
  applyButton: {
    backgroundColor: COLORS.primaryOrange,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xxxl,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default VideoDescriptionModal;
