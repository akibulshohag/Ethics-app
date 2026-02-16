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

const BackgroundDownloadsScreen = () => {
  const navigation = useNavigation();

  const [smartDownloads, setSmartDownloads] = useState(true);
  const [wifiOnly, setWifiOnly] = useState(false);
  const [recommended, setRecommended] = useState(true);

  const NavRow = ({ label, value, onPress }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.rightContent}>
        {value && <Text style={styles.valueText}>{value}</Text>}
        <Icon name="chevron-right" size={24} color="#333" />
      </View>
    </TouchableOpacity>
  );

  const ToggleRow = ({ label, value, onValueChange }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        trackColor={{ false: '#eee', true: '#FF7A00' }}
        thumbColor="#fff"
        onValueChange={onValueChange}
        value={value}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Background & Downloads</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionHeader}>Background Play</Text>
        <NavRow label="Playback" value="Off" />

        <Text style={styles.sectionHeader}>Downloads</Text>
        <ToggleRow
          label="Smart Downloads"
          value={smartDownloads}
          onValueChange={setSmartDownloads}
        />
        <NavRow label="Download Quality" />
        <ToggleRow
          label="Download Over Wi-Fi Only"
          value={wifiOnly}
          onValueChange={setWifiOnly}
        />
        <ToggleRow
          label="Recommended Downloads"
          value={recommended}
          onValueChange={setRecommended}
        />
        <NavRow label="Delete All Downloads" />
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
    marginBottom: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  label: {
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '500',
    flex: 1,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 16,
    color: '#333',
    marginRight: 8,
  },
});

export default BackgroundDownloadsScreen;
