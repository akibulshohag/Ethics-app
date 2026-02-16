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

const DataSavingScreen = () => {
  const navigation = useNavigation();

  // States for the switches
  const [dataSavingMode, setDataSavingMode] = useState(true);
  const [reduceVideoQuality, setReduceVideoQuality] = useState(false);
  const [reduceDownloadQuality, setReduceDownloadQuality] = useState(true);
  const [restrictedMode, setRestrictedMode] = useState(false);
  const [wifiOnly, setWifiOnly] = useState(false);


  // Reusable row for navigation items (with chevron)
  const NavRow = ({ label, value, onPress }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.rightContent}>
        {value && <Text style={styles.valueText}>{value}</Text>}
        <Icon name="chevron-right" size={24} color="#333" />
      </View>
    </TouchableOpacity>
  );

  // Reusable row for toggle items
  const ToggleRow = ({ label, value, onValueChange }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        trackColor={{ false: "#eee", true: "#FF7A00" }}
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={26} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>General</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContent}>
        <ToggleRow 
          label="Data Saving Mode" 
          value={dataSavingMode} 
          onValueChange={setDataSavingMode} 
        />
        <ToggleRow 
          label="Reduce Video Quality" 
          value={reduceVideoQuality} 
          onValueChange={setReduceVideoQuality} 
        />
        <ToggleRow 
          label="Reduce Download Quality" 
          value={reduceDownloadQuality} 
          onValueChange={setReduceDownloadQuality} 
        />
        <ToggleRow 
          label="Restricted Mode" 
          value={restrictedMode}    
          onValueChange={setRestrictedMode} 
        />
        <ToggleRow 
          label="Wi-Fi Only" 
          value={wifiOnly} 
          onValueChange={setWifiOnly} 
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

export default DataSavingScreen;