import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const UploadDetailsScreen = () => {
  const [description, setDescription] = useState('We offer a modern dining experience with carefully crafted dishes, fresh ingredients, and excellent');
  const [tags, setTags] = useState('#steak #food #fries');
  const [location, setLocation] = useState('Birmingham, UK');

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Header Navigation */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn}>
          <Icon name="chevron-left" size={24} color="#FFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Media Preview */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330' }} 
            style={styles.heroImage}
          />
        </View>

        {/* Form Content */}
        <View style={styles.formContainer}>
          
          {/* Description Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Description</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                multiline
                placeholderTextColor="#AAB7B8"
              />
            </View>
          </View>

          {/* Tag Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Tag</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={tags}
                onChangeText={setTags}
                placeholderTextColor="#AAB7B8"
              />
            </View>
          </View>

          {/* Location Field */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Location</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.input}
                value={location}
                onChangeText={setLocation}
                placeholderTextColor="#AAB7B8"
              />
            </View>
          </View>

          {/* Upload Button */}
          <TouchableOpacity style={styles.uploadButton}>
            <Text style={styles.uploadButtonText}>Upload</Text>
          </TouchableOpacity>
          
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFEFEF' }, // Light grey background
  
  header: { 
    position: 'absolute', 
    top: 50, 
    left: 15, 
    zIndex: 10,
    flexDirection: 'row',
    alignItems: 'center'
  },
  backBtn: { flexDirection: 'row', alignItems: 'center' },
  backText: { color: '#FFF', fontSize: 16, fontWeight: '500', marginLeft: 4 },

  imageContainer: { width: '100%', height: width * 1.1 },
  heroImage: { width: '100%', height: '100%' },

  formContainer: { padding: 20 },

  inputGroup: { marginBottom: 20 },
  label: { 
    fontSize: 22, 
    fontWeight: 'bold', 
    color: '#333', 
    marginBottom: 10 
  },
  inputWrapper: {
    backgroundColor: '#FFF',
    borderRadius: 12, // Distinct rounded corners
    paddingHorizontal: 15,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2
  },
  input: {
    fontSize: 15,
    color: '#7F8C8D',
    lineHeight: 22
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top'
  },

  // Centered Orange Button
  uploadButton: {
    backgroundColor: '#F5A623',
    width: '60%',
    alignSelf: 'center',
    paddingVertical: 15,
    borderRadius: 30, // Fully rounded pill shape
    marginTop: 20,
    alignItems: 'center',
    shadowColor: '#F5A623',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6
  },
  uploadButtonText: {
    color: '#333', // Dark text on orange
    fontSize: 20,
    fontWeight: 'bold'
  }
});

export default UploadDetailsScreen;