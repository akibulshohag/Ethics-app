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
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import logo from '../assets/short-logo.png';
import logoIX from '../assets/short-logo-ix.png';

const { width } = Dimensions.get('window');

const VideoSection = ({ title, showPlus = false }) => (
  <View style={styles.sectionContainer}>
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {showPlus && <Icon name="plus" size={24} color="#000" />}
    </View>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.horizontalScroll}
    >
      {[1, 2, 3].map(item => (
        <View key={item} style={styles.videoThumbnailContainer}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd',
            }}
            style={styles.videoThumbnail}
          />
        </View>
      ))}
    </ScrollView>
  </View>
);

const PromotionScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header Bar */}
      <View style={styles.topNav}>
        <TouchableOpacity style={styles.backBtn}>
          <Icon
            name="play"
            size={12}
            color="#FFF"
            style={styles.backIconFlip}
          />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <View style={styles.messageContainer}>
          <Text style={styles.messageLabel}>Message</Text>
          <Icon name="message-text-outline" size={26} color="#000" />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollPadding}
      >
        {/* Profile Card Section */}
        <View style={styles.profileWrapper}>
          <View style={styles.darkHeader}>
            <View style={styles.brandingRow}>
              {/* <Text style={styles.eatText}>eat</Text> */}
              <View style={styles.headerLogoContainer}>
                <Image
                  source={logo}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <View style={styles.avatarContainer}>
                <Image
                  source={{
                    uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
                  }}
                  style={styles.avatarImage}
                />
                <View style={styles.avatarEditBadge}>
                  <Icon name="pencil-outline" size={12} color="#666" />
                </View>
              </View>
              {/* <Text style={styles.ixText}>ix</Text> */}
              <View style={styles.headerLogoContainer}>
                <Image
                  source={logoIX}
                  style={styles.logoImageIx}
                  resizeMode="contain"
                />
              </View>
            </View>

            <Text style={styles.profileName}>MC Mulen</Text>
            <Text style={styles.profileLocation}>Birmingham</Text>

            <View style={styles.actionButtonGroup}>
              <TouchableOpacity style={styles.editProfileButton}>
                <Text style={styles.editProfileText}>Edit Profile</Text>
                <Icon name="pencil-box-outline" size={22} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconIconButton}>
                <Icon name="camera-outline" size={24} color="#333" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconIconButton}>
                <Icon name="message-outline" size={24} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bio Section */}
          <View style={styles.bioBox}>
            <Text style={styles.bioText}>
              A cozy restaurant serving fresh, delicious food made with quality
              ingredients. Enjoy great taste
            </Text>
            <TouchableOpacity>
              <Icon name="square-edit-outline" size={20} color="#999" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Dynamic Video Sections */}
        <VideoSection title="Most Liked Videos" />

        {/* Promotions Grid */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Promotions</Text>
          <View style={styles.promoWrapper}>
            <TouchableOpacity
              style={[styles.promoButton, { backgroundColor: '#F9A825' }]}
            >
              <Text style={styles.promoButtonText}>Tandoori Planet</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.promoButton, { backgroundColor: '#2C3E50' }]}
            >
              <Text style={styles.promoButtonText}>Streetly balty</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.promoButton, { backgroundColor: '#2C3E50' }]}
            >
              <Text style={styles.promoButtonText}>Bangal hub</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.promoButton, { backgroundColor: '#F9A825' }]}
            >
              <Text style={styles.promoButtonText}>Indian Grill</Text>
            </TouchableOpacity>
          </View>
        </View>

        <VideoSection title="Saved Videos" />
        <VideoSection title="My Videos" showPlus={true} />

        {/* Scroll Indicator */}
        <View style={styles.bottomArrowContainer}>
          <Icon name="chevron-down" size={45} color="#333" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  backIconFlip: { transform: [{ rotate: '180deg' }], marginRight: 4 },
  backText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  messageContainer: { flexDirection: 'row', alignItems: 'center' },
  messageLabel: { fontSize: 13, color: '#666', marginRight: 8 },

  profileWrapper: { marginHorizontal: 16, marginTop: 4 },
  darkHeader: {
    backgroundColor: '#34495E',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingBottom: 20,
    alignItems: 'center',
  },
  brandingRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  eatText: { color: '#FFF', fontSize: 44, fontWeight: 'bold', marginRight: 20 },
  ixText: { color: '#FFF', fontSize: 44, fontWeight: 'bold', marginLeft: 20 },
  avatarContainer: { position: 'relative' },
  avatarImage: {
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  avatarEditBadge: {
    position: 'absolute',
    right: 2,
    top: 6,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 3,
    elevation: 2,
  },
  profileName: {
    color: '#FFF',
    fontSize: 22,
    fontWeight: 'bold',
    marginTop: 12,
  },
  profileLocation: { color: '#BDC3C7', fontSize: 13, marginBottom: 18 },

  actionButtonGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  editProfileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 12,
  },
  editProfileText: {
    color: '#333',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  iconIconButton: {
    backgroundColor: '#FFF',
    width: 52,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bioBox: {
    backgroundColor: '#F1F1F1',
    flexDirection: 'row',
    padding: 18,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    alignItems: 'center',
  },
  bioText: { flex: 1, color: '#555', fontSize: 12.5, lineHeight: 18 },

  sectionContainer: { marginTop: 22, paddingHorizontal: 16 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#222' },
  horizontalScroll: { flexDirection: 'row' },
  videoThumbnailContainer: { marginRight: 12 },
  videoThumbnail: { width: 105, height: 85, borderRadius: 12 },

  promoWrapper: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  promoButton: {
    width: '48.5%',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  promoButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 14 },

  bottomArrowContainer: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  scrollPadding: { paddingBottom: 20 },
  logoImage: {
    width: 85,
    height: 30,
  },
  logoImageIx: {
    width: 60,
    height: 30,
  },
});

export default PromotionScreen;
