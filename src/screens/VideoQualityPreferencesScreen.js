import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';

const VideoQualityPreferences = () => {
  const navigation = useNavigation();

  const [mobileSetting, setMobileSetting] = useState('auto'); // 'auto', 'higher', 'saver'

  const [wifiSetting, setWifiSetting] = useState('higher'); // 'auto', 'higher', 'saver'

  const ToggleRow = ({ label, isSelected, onSelect }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        trackColor={{ false: '#eee', true: '#FF7A00' }}
        thumbColor="#fff"
        onValueChange={onSelect}
        value={isSelected}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Video Quality Preferences</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeader}>On Mobile Networks</Text>
        <ToggleRow
          label="Auto (Recommended)"
          isSelected={mobileSetting === 'auto'}
          onSelect={() => setMobileSetting('auto')}
        />
        <ToggleRow
          label="Higher Picture Quality"
          isSelected={mobileSetting === 'higher'}
          onSelect={() => setMobileSetting('higher')}
        />
        <ToggleRow
          label="Data Saver"
          isSelected={mobileSetting === 'saver'}
          onSelect={() => setMobileSetting('saver')}
        />

        <View style={styles.divider} />

        <Text style={styles.sectionHeader}>On Wi-Fi</Text>
        <ToggleRow
          label="Auto (Recommended)"
          isSelected={wifiSetting === 'auto'}
          onSelect={() => setWifiSetting('auto')}
        />
        <ToggleRow
          label="Higher Picture Quality"
          isSelected={wifiSetting === 'higher'}
          onSelect={() => setWifiSetting('higher')}
        />
        <ToggleRow
          label="Data Saver"
          isSelected={wifiSetting === 'saver'}
          onSelect={() => setWifiSetting('saver')}
        />
      </ScrollView>
    </SafeAreaView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1A1A',
    paddingHorizontal: 20,
    marginTop: 25,
    marginBottom: 10,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 20,
    marginTop: 15,
  },
});

export default VideoQualityPreferences;
