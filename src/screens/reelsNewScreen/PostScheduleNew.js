import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const ScheduleScreen = () => {
  const navigation = useNavigation();
  const [switches, setSwitches] = useState({
    fb: true,
    ig: true,
    tk: true,
    yt: true,
  });

  const platforms = [
    {
      id: 'fb',
      name: 'Facebook',
      icon: 'https://cdn-icons-png.flaticon.com/512/124/124010.png',
    },
    {
      id: 'ig',
      name: 'Instagram',
      icon: 'https://cdn-icons-png.flaticon.com/512/174/174855.png',
    },
    {
      id: 'tk',
      name: 'Tiktok',
      icon: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png',
    },
    {
      id: 'yt',
      name: 'Youtube',
      icon: 'https://cdn-icons-png.flaticon.com/512/1384/1384060.png',
    },
  ];

  return (
    <SafeAreaView style={styles.safeTop} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" color="white" size={28} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Post & Schedule</Text>
          <Text style={styles.headerSubtitle}>Preview & post everywhere</Text>
        </View>
        <Image
          source={{ uri: 'https://via.placeholder.com/40' }}
          style={styles.profilePic}
        />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.stepperContainer}>
          {[1, 2, 3, 4, 5].map(num => (
            <View key={num} style={styles.stepItem}>
              <View style={[styles.stepCircle, num === 5 && styles.activeStepCircle]}>
                <Text style={[styles.stepNumber, num === 5 && styles.activeStepText]}>
                  {num}
                </Text>
              </View>
              <Text style={[styles.stepLabel, num === 5 && styles.activeLabel]}>
                {['Upload', 'Edit', 'Caption', 'Preview', 'Schedule'][num - 1]}
              </Text>
            </View>
          ))}
          <View style={styles.stepperLine} />
        </View>

        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Auto-Post Platforms</Text>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>Max 4</Text>
            </View>
          </View>
          <View style={styles.separator} />
          {platforms.map(p => (
            <View key={p.id} style={styles.platformRow}>
              <View style={styles.platformInfo}>
                <Image source={{ uri: p.icon }} style={styles.platformIcon} />
                <Text style={styles.platformName}>{p.name}</Text>
              </View>
              <Switch
                trackColor={{ false: '#EEE', true: '#F5A623' }}
                thumbColor="white"
                value={switches[p.id]}
                onValueChange={val => setSwitches({ ...switches, [p.id]: val })}
              />
            </View>
          ))}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>When do You want to post?</Text>
          <TouchableOpacity style={styles.radioRow}>
            <View style={styles.radioButton} />
            <Text style={styles.radioLabel}>Post Now</Text>
          </TouchableOpacity>
          <View style={styles.inputRow}>
            <View style={styles.dateTimeInput}>
              <Icon name="calendar-month-outline" size={16} color="#777" />
              <Text style={styles.inputText}>wed,apr8,2026</Text>
            </View>
            <View style={styles.dateTimeInput}>
              <Icon name="clock-outline" size={16} color="#777" />
              <Text style={styles.inputText}>08:00 AM</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Boost Your Reach</Text>
          <View style={styles.boostBox}>
            <View style={styles.boostContent}>
              <View style={styles.boostHeader}>
                <Icon name="fire" size={20} color="#FF6B00" />
                <Text style={styles.boostTitle}>Starter Boost</Text>
              </View>
              <Text style={styles.boostSub}>Ranked popular near you by eatix</Text>
              <Text style={styles.boostPrice}>Stating from GBP7-GBP30</Text>
            </View>
            <TouchableOpacity style={styles.boostBtn}>
              <Text style={styles.boostBtnText}>Boost Locally</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.targetSection}>
          <View style={styles.targetHeader}>
            <Icon name="map-marker-outline" size={16} color="#AAA" />
            <Text style={styles.targetText}>
              Target within <Text style={styles.targetMiles}>3 miles</Text> in east
              London & nearby
            </Text>
          </View>
          <View style={styles.sliderContainer}>
            <View style={styles.sliderLine} />
            <View style={styles.sliderFill} />
            <View style={styles.sliderHandle} />
          </View>
        </View>

        <TouchableOpacity style={styles.mainButton}>
          <Text style={styles.mainButtonText}>Post Locally</Text>
          <Icon name="arrow-right" color="white" size={20} />
        </TouchableOpacity>

        <View style={styles.footerNote}>
          <Icon name="shield-check" size={14} color="#AAA" />
          <Text style={styles.footerNoteText}>
            You post will be auto-published to selected platforms
          </Text>
        </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: '#F5A623' },
  container: { flex: 1, backgroundColor: '#F9F9F9' },
  header: {
    backgroundColor: '#F5A623',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleContainer: { flex: 1, marginLeft: 15 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: 'white', fontSize: 13 },
  profilePic: { width: 40, height: 40, borderRadius: 20 },

  scrollContent: { paddingBottom: 40, backgroundColor: '#F9F9F9' },
  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    position: 'relative',
  },
  stepperLine: {
    position: 'absolute',
    top: 36,
    left: 40,
    right: 40,
    height: 1,
    backgroundColor: '#DDD',
    zIndex: -1,
  },
  stepItem: { alignItems: 'center', width: 60 },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStepCircle: { borderColor: '#F5A623', borderWidth: 2 },
  stepNumber: { fontSize: 12, color: '#AAA' },
  activeStepText: { color: '#F5A623', fontWeight: 'bold' },
  stepLabel: { fontSize: 10, marginTop: 4, color: '#AAA' },
  activeLabel: { color: '#F5A623', fontWeight: 'bold' },

  card: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 15,
    padding: 15,
    borderWidth: 1,
    borderColor: '#EEE',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  badge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#DDD',
  },
  badgeText: { fontSize: 11, color: '#777' },
  separator: { height: 1, backgroundColor: '#EEE', marginBottom: 10 },

  platformRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  platformInfo: { flexDirection: 'row', alignItems: 'center' },
  platformIcon: { width: 24, height: 24, borderRadius: 6, marginRight: 12 },
  platformName: { fontSize: 15, color: '#555' },

  radioRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 15 },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#F5A623',
    marginRight: 10,
  },
  radioLabel: { fontSize: 16, color: '#333' },
  inputRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dateTimeInput: {
    flex: 0.48,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    padding: 10,
    borderRadius: 8,
  },
  inputText: { fontSize: 12, color: '#555', marginLeft: 8 },

  boostBox: {
    borderWidth: 1,
    borderColor: '#F5A623',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    backgroundColor: '#FFFDF9',
  },
  boostContent: { flex: 1 },
  boostHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  boostTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 8, color: '#333' },
  boostSub: { fontSize: 11, color: '#777' },
  boostPrice: { fontSize: 13, color: '#555', marginTop: 4 },
  boostBtn: {
    backgroundColor: '#F5A623',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  boostBtnText: { color: 'white', fontSize: 11, fontWeight: 'bold' },

  targetSection: { paddingHorizontal: 20, marginTop: 15 },
  targetHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  targetText: { fontSize: 13, color: '#888', marginLeft: 5 },
  targetMiles: { color: '#F5A623' },
  sliderContainer: { height: 30, justifyContent: 'center' },
  sliderLine: { height: 4, backgroundColor: '#FFEBCD', borderRadius: 2 },
  sliderFill: {
    position: 'absolute',
    height: 4,
    width: '60%',
    backgroundColor: '#F5A623',
    borderRadius: 2,
  },
  sliderHandle: {
    position: 'absolute',
    left: '60%',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#DDD',
  },

  mainButton: {
    backgroundColor: '#F5A623',
    margin: 15,
    height: 50,
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },
  footerNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  footerNoteText: { fontSize: 11, color: '#AAA', marginLeft: 6 },
});

export default ScheduleScreen;
