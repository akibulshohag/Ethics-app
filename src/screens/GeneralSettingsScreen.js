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

const GeneralSettingsScreen = () => {
  const navigation = useNavigation();

  const [remindBreak, setRemindBreak] = useState(true);
  const [remindBedtime, setRemindBedtime] = useState(false);
  const [zoomFill, setZoomFill] = useState(false);
  const [pip, setPip] = useState(true);
  const [restrictedMode, setRestrictedMode] = useState(false);
  const [statsNerds, setStatsNerds] = useState(false);

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
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>General</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        <ToggleRow
          label="Remind Me to Take a Break"
          value={remindBreak}
          onValueChange={setRemindBreak}
        />
        <ToggleRow
          label="Remind Me When it's Bedtime"
          value={remindBedtime}
          onValueChange={setRemindBedtime}
        />

        <NavRow label="Playback in Feeds" value="Off" />
        <NavRow label="Double-tap to Seek" value="10s" />

        <ToggleRow
          label="Zoom to Fill Screen"
          value={zoomFill}
          onValueChange={setZoomFill}
        />
        <ToggleRow
          label="Picture-in-Picture"
          value={pip}
          onValueChange={setPip}
        />

        <NavRow label="Uploads" value="On any network" />
        <NavRow label="Language" value="English (US)" />

        <ToggleRow
          label="Restricted Mode"
          value={restrictedMode}
          onValueChange={setRestrictedMode}
        />
        <ToggleRow
          label="Enable Stats for Nerds"
          value={statsNerds}
          onValueChange={setStatsNerds}
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
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
  },
  listContent: {
    paddingTop: 10,
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

export default GeneralSettingsScreen;
