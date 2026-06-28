import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { EATWAZE_TERMS_URL } from '../constants/communityTerms';

const SettingsScreen = () => {
  const navigation = useNavigation();
  const [isAutoplayEnabled, setIsAutoplayEnabled] = useState(false);

  const SettingItem = ({
    icon,
    label,
    onPress,
    rightElement,
    showBorder = true,
  }) => (
    <TouchableOpacity
      style={[styles.itemRow, !showBorder && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.leftContent}>
        <Icon name={icon} size={24} color="#333" style={styles.icon} />
        <Text style={styles.label}>{label}</Text>
      </View>
      {rightElement ? (
        rightElement
      ) : (
        <Icon name="chevron-right" size={24} color="#999" />
      )}
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <SettingItem
          icon="check-circle-outline"
          label="General"
          onPress={() => navigation.navigate('GeneralSettingsScreen')}
        />

        <SettingItem
          icon="chart-timeline-variant"
          label="Data Saving"
          onPress={() => navigation.navigate('DataSavingScreen')}
        />

        <SettingItem
          icon="play-circle-outline"
          label="Autoplay Next Video"
          rightElement={
            <Switch
              trackColor={{ false: '#eee', true: '#FF7A00' }}
              thumbColor={isAutoplayEnabled ? '#fff' : '#f4f3f4'}
              onValueChange={() =>
                setIsAutoplayEnabled(previousState => !previousState)
              }
              value={isAutoplayEnabled}
            />
          }
        />

        <SettingItem
          icon="video-outline"
          label="Video Quality Preferences"
          onPress={() => navigation.navigate('VideoQualityPreferencesScreen')}
        />
        <SettingItem
          icon="download-outline"
          label="Background & Downloads"
          onPress={() => navigation.navigate('BackgroundDownloadsScreen')}
        />
        <SettingItem icon="television" label="Watch on TV" />
        <SettingItem icon="clock-outline" label="History" />
        <SettingItem icon="information-outline" label="Privacy Policy" />
        <SettingItem icon="wallet-outline" label="Billing & Payments" />
        <SettingItem icon="bell-outline" label="Notifications" />
        <SettingItem
          icon="account-group-outline"
          label="Community Guidelines"
          onPress={() => Linking.openURL(EATWAZE_TERMS_URL).catch(() => {})}
        />
        <SettingItem icon="message-text-outline" label="Live Chat" />
        <SettingItem icon="closed-caption-outline" label="Captions" />
        <SettingItem
          icon="chevron-right-circle-outline"
          label="Accessibility"
        />
        <SettingItem
          icon="dots-horizontal-circle-outline"
          label="About"
          showBorder={false}
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
    marginBottom: 10,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 20,
  },
  label: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});

export default SettingsScreen;
