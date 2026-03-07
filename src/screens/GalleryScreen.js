import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  FlatList
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');
const columnWidth = (width - 40) / 3; // Precise 3-column spacing

const MediaPickerScreen = () => {
  
  const galleryData = [
    { id: '1', type: 'placeholder' },
    { id: '2', type: 'image', uri: 'https://images.unsplash.com/photo-1551024506-0bccd828d307' },
    { id: '3', type: 'placeholder' },
    { id: '4', type: 'placeholder' },
    { id: '5', type: 'placeholder' },
    { id: '6', type: 'placeholder' },
    { id: '7', type: 'placeholder' },
    { id: '8', type: 'placeholder' },
    { id: '9', type: 'placeholder' },
    { id: '10', type: 'placeholder' },
    { id: '11', type: 'placeholder' },
    { id: '12', type: 'placeholder' },
  ];

  const renderGalleryItem = ({ item }) => (
    <View style={styles.gridItem}>
      {item.type === 'image' ? (
        <Image source={{ uri: item.uri }} style={styles.gridImage} />
      ) : (
        <View style={styles.placeholderBox}>
          <Icon name="image-outline" size={45} color="#AAB7B8" />
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      
      {/* Top Section with Bottom Radius */}
      <View style={styles.heroWrapper}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1561758033-d89a9ad46330' }} 
          style={styles.heroImage}
        />
        
        {/* Navigation Overlays */}
        <View style={styles.overlayTop}>
          <TouchableOpacity style={styles.backBtn}>
            <Icon name="chevron-left" size={18} color="#FFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.uploadBtn}>
            <Text style={styles.uploadText}>Upload</Text>
            <Icon name="chevron-right" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

        {/* Media Type Floating Bar */}
        <View style={styles.controlsBar}>
            <TouchableOpacity style={[styles.controlCircle, styles.activeControl]}>
                <Icon name="camera" size={28} color="#000" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlCircle}>
                <Icon name="video" size={28} color="#FFF" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlCircle}>
                <Icon name="image" size={28} color="#FFF" />
            </TouchableOpacity>
        </View>
      </View>

      {/* Gallery Grid Section */}
      <FlatList
        data={galleryData}
        renderItem={renderGalleryItem}
        keyExtractor={item => item.id}
        numColumns={3}
        contentContainerStyle={styles.gridContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  
  // Update: Matching the specific UI Curve
  heroWrapper: { 
    height: width * 0.95, 
    width: '100%',
    borderBottomLeftRadius: 50, // Matches screenshot curve
    borderBottomRightRadius: 50,
    overflow: 'hidden', 
    backgroundColor: '#000',
    position: 'relative'
  },
  heroImage: { width: '100%', height: '100%' },
  
  overlayTop: { 
    position: 'absolute', 
    top: 50, 
    left: 20, 
    right: 20, 
    flexDirection: 'row', 
    justifyContent: 'space-between',
    zIndex: 10
  },
  backBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: 'rgba(26, 26, 26, 0.9)', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  backText: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
  
  uploadBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#F5A623', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  uploadText: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginRight: 2 },

  // Floating Control Bar Styling
  controlsBar: {
    position: 'absolute',
    bottom: 25,
    alignSelf: 'center',
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 40,
    alignItems: 'center',
    width: width * 0.75,
    justifyContent: 'space-around',
    zIndex: 10
  },
  controlCircle: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center' },
  activeControl: { backgroundColor: '#F5A623' },

  // Gallery Layout
  gridContainer: { padding: 15, paddingTop: 20 },
  gridItem: { 
    width: columnWidth, 
    height: columnWidth, 
    margin: 5, 
    borderRadius: 4, 
    overflow: 'hidden' 
  },
  gridImage: { width: '100%', height: '100%' },
  placeholderBox: { 
    flex: 1, 
    backgroundColor: '#D5DBDB', 
    justifyContent: 'center', 
    alignItems: 'center' 
  }
});

export default MediaPickerScreen;