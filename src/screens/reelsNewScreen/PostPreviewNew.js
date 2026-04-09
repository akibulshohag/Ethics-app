import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  Dimensions,
  ImageBackground,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const PreviewReelScreen = () => {
  const navigation = useNavigation();
  const steps = ['Upload', 'Edit', 'Caption', 'Preview', 'Schedule'];

  const socialIcons = [
    { name: 'fb', icon: 'https://cdn-icons-png.flaticon.com/512/124/124010.png' },
    { name: 'ig', icon: 'https://cdn-icons-png.flaticon.com/512/174/174855.png' },
    { name: 'tk', icon: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png' },
    { name: 'yt', icon: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png' },
  ];

  return (
    <SafeAreaView style={styles.safeTop} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" color="white" size={28} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Preview</Text>
          <Text style={styles.headerSubtitle}>Preview & post everywhere</Text>
        </View>
        <Image
          source={{ uri: 'https://via.placeholder.com/40' }}
          style={styles.profilePic}
        />
        </View>

        <View style={styles.stepperContainer}>
        {steps.map((label, index) => (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepCircle, index === 3 && styles.activeStepCircle]}>
              <Text style={[styles.stepNumber, index === 3 && styles.activeStepText]}>
                {index + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, index === 3 && styles.activeLabel]}>
              {label}
            </Text>
          </View>
        ))}
        <View style={styles.stepperLine} />
        </View>

        <View style={styles.previewContainer}>
        <ImageBackground
          source={{
            uri: 'https://images.unsplash.com/photo-1547584370-2cc98b8b8dc8?q=80&w=600',
          }}
          style={styles.mainVideo}
        >
          <View style={styles.playOverlay}>
            <View style={styles.pauseCircle}>
              <Icon name="pause" color="black" size={24} />
            </View>
          </View>
        </ImageBackground>
        </View>

        <View style={styles.infoSection}>
        <View style={styles.socialRow}>
          {socialIcons.map(item => (
            <Image key={item.name} source={{ uri: item.icon }} style={styles.socialIcon} />
          ))}
        </View>

        <Text style={styles.rankText}>Ranked popular near you by eatix</Text>

        <View style={styles.tagRow}>
          <Text style={styles.hashtag}>#curry</Text>
          <Text style={styles.hashtag}>#biryani</Text>
          <Text style={styles.hashtag}>#LondonEats</Text>
        </View>

        <View style={styles.statsRow}>
          <Text style={styles.locationText}>Curry Place</Text>
          <Icon
            name="star"
            size={14}
            color="#F5A623"
            style={styles.starIcon}
          />
          <Text style={styles.metaDetail}>0.2 miles | 1.2k views</Text>
        </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.postButton}
            onPress={() => navigation.navigate('PostScheduleNew')}
          >
            <Text style={styles.postButtonText}>Confirm & Post</Text>
            <Icon name="arrow-right" color="white" size={20} />
          </TouchableOpacity>
          <View style={styles.safetyFooter}>
            <Icon name="shield-check" size={14} color="#AAA" />
            <Text style={styles.safetyText}>
              you content is safe and only visible to you
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: '#F5A623' },
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    backgroundColor: '#F5A623',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleContainer: { flex: 1, marginLeft: 15 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: 'white', fontSize: 13, opacity: 0.9 },
  profilePic: { width: 40, height: 40, borderRadius: 20 },

  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    position: 'relative',
  },
  stepperLine: {
    position: 'absolute',
    top: 31,
    left: 40,
    right: 40,
    height: 1,
    backgroundColor: '#EEE',
    zIndex: -1,
  },
  stepItem: { alignItems: 'center', width: 60 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  activeStepCircle: { borderColor: '#F5A623', borderWidth: 2 },
  stepNumber: { color: '#AAA', fontSize: 12 },
  activeStepText: { color: '#F5A623', fontWeight: 'bold' },
  stepLabel: { fontSize: 10, marginTop: 4, color: '#AAA' },
  activeLabel: { color: '#F5A623', fontWeight: 'bold' },

  previewContainer: { flex: 1.2 },
  mainVideo: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: { backgroundColor: 'transparent' },
  pauseCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  infoSection: {
    flex: 0.8,
    backgroundColor: '#222',
    padding: 20,
    justifyContent: 'center',
  },
  socialRow: { flexDirection: 'row', marginBottom: 15 },
  socialIcon: { width: 36, height: 36, borderRadius: 18, marginRight: 12 },
  rankText: { color: '#BBB', fontSize: 13, marginBottom: 8 },
  tagRow: { flexDirection: 'row', marginBottom: 12 },
  hashtag: { color: '#F5A623', fontSize: 13, marginRight: 10, fontWeight: '500' },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  locationText: { color: 'white', fontSize: 13, marginRight: 5 },
  starIcon: { marginRight: 8 },
  metaDetail: { color: '#888', fontSize: 13 },

  footer: { padding: 20, backgroundColor: 'white' },
  postButton: {
    backgroundColor: '#F5A623',
    flexDirection: 'row',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  postButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginRight: 10 },
  safetyFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  safetyText: { fontSize: 11, color: '#AAA', marginLeft: 5 },
});

export default PreviewReelScreen;
