import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const ProfileScreen = ({ onBack }) => {
  // Reusable Video Thumbnail
  const VideoThumbnail = () => (
    <View style={styles.thumbnailContainer}>
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd' }} 
        style={styles.thumbnail} 
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Top Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Icon name="chevron-left" size={18} color="#FFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.navRight}>
          <Text style={styles.messageLabel}>Message</Text>
          <Icon name="message-text-outline" size={24} color="#1A1A1A" />
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        
        {/* PROFILE HEADER BLOCK */}
        <View style={styles.headerWrapper}>
          <View style={styles.profileHeaderCard}>
            <View style={styles.brandRow}>
              <Image 
                source={require('../assets/short-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
              
              <View style={styles.avatarBorder}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330' }} 
                  style={styles.avatar} 
                />
              </View>
              <Text style={styles.brandText}>ix</Text>
            </View>
            <Text style={styles.userName}>MC Mulen</Text>
            <Text style={styles.userLocation}>Birmingham</Text>
          </View>

          {/* BIO SECTION - Attached with zero gap */}
          <View style={styles.bioContainer}>
            <View style={styles.bioContentRow}>
              <Text style={styles.bioText}>
                A cozy restaurant serving fresh, delicious food made with quality ingredients. Enjoy great taste
              </Text>
              <TouchableOpacity style={styles.editIcon}>
                <Icon name="pencil-box-outline" size={22} color="#999" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* MOST LIKED VIDEOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Most Liked Videos</Text>
          <View style={styles.videoGrid}>
            <VideoThumbnail />
            <VideoThumbnail />
            <VideoThumbnail />
          </View>
        </View>

        {/* PROMOTIONS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Promotions</Text>
          <View style={styles.promoGrid}>
            <TouchableOpacity style={[styles.promoBtn, styles.bgOrange]}>
              <Text style={styles.promoBtnText}>Tandoori Planet</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.promoBtn, styles.bgDarkBlue]}>
              <Text style={styles.promoBtnText}>Streetly balty</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.promoBtn, styles.bgDarkBlue]}>
              <Text style={styles.promoBtnText}>Bangal hub</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.promoBtn, styles.bgOrange]}>
              <Text style={styles.promoBtnText}>Indian Grill</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SAVED VIDEOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Saved Videos</Text>
          <View style={styles.videoGrid}>
            <VideoThumbnail />
            <VideoThumbnail />
            <VideoThumbnail />
          </View>
        </View>

        {/* MY VIDEOS */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Videos</Text>
          <View style={styles.videoGrid}>
            <VideoThumbnail />
            <VideoThumbnail />
            <VideoThumbnail />
          </View>
        </View>

        {/* Bottom Navigation Indicator */}
        <View style={styles.bottomArrow}>
          <Icon name="chevron-down" size={40} color="#333" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  scrollContent: { paddingBottom: 40 },
  navBar: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: 15 
  },
  backBtn: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#1A1A1A', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 8 
  },
  backText: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
  navRight: { flexDirection: 'row', alignItems: 'center' },
  messageLabel: { fontSize: 13, color: '#666', marginRight: 8 },
  
  // Header Block
  headerWrapper: { marginHorizontal: 15, marginTop: 10 },
  profileHeaderCard: { 
    backgroundColor: '#2C3E50', 
    borderTopLeftRadius: 25, 
    borderTopRightRadius: 25, 
    paddingVertical: 25, 
    alignItems: 'center' 
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  brandText: { color: '#FFF', fontSize: 40, fontWeight: 'bold', marginHorizontal: 15 },
  avatarBorder: { borderWidth: 2, borderColor: '#000', borderRadius: 50, padding: 2 },
  avatar: { width: 85, height: 85, borderRadius: 42.5 },
  userName: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginTop: 5 },
  userLocation: { color: '#BDC3C7', fontSize: 14 },

  // Bio Section with zero gap
  bioContainer: { 
    backgroundColor: '#F2F2F2', 
    borderBottomLeftRadius: 15, 
    borderBottomRightRadius: 15, 
    padding: 15,
    marginTop: -1 // Ensures perfect flush against the dark header
  },
  bioContentRow: { flexDirection: 'row', alignItems: 'flex-start' },
  bioText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
  editIcon: { marginLeft: 10 },

  // Content Sections
  section: { paddingHorizontal: 15, marginTop: 25 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 15 },
  videoGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  thumbnailContainer: { width: '31%', height: 90, borderRadius: 12, overflow: 'hidden' },
  thumbnail: { width: '100%', height: '100%' },
  promoGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  promoBtn: { width: '48%', height: 45, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  bgOrange: { backgroundColor: '#F5A623' },
  bgDarkBlue: { backgroundColor: '#2C3E50' },
  promoBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 15 },
  bottomArrow: { alignItems: 'center', marginTop: 30 },
  logoImage: {
    marginRight: 15,
  },
});

export default ProfileScreen;