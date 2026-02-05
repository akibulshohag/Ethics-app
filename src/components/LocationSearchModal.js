import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING } from '../constants/theme';

const { width } = Dimensions.get('window');

const MOCK_LOCATIONS = [
  { id: '1', title: 'United States', address: '' },
  { id: '2', title: 'United States Embassy', address: '6391 Elgin St. Celina, Delaware 10299' },
  { id: '3', title: 'United States Minor Outlying Islands', address: '1901 Thornridge Cir. Shiloh, Hawaii 81063' },
  { id: '4', title: 'United States Virgin Islands', address: '2715 Ash Dr. San Jose, South Dakota 83475' },
  { id: '5', title: 'United States Air Force Academy', address: '4140 Parker Rd. Allentown, New Mexico 31134' },
  { id: '6', title: 'United States Bank Central', address: '4517 Washington Ave. Manchester, Kentucky 39495' },
  { id: '7', title: 'United States Police Central', address: '2118 Thornridge Cir. Syracuse, Connecticut 35624' },
  { id: '8', title: 'United States Botanic Garden', address: '4517 Washington Ave. Manchester, Kentucky 39495' },
  { id: '9', title: 'United States Grand City Park', address: '8502 Preston Rd. Inglewood, Maine 98380' },
  { id: '10', title: 'United States Sport Center', address: '2972 Westheimer Rd. Santa Ana, Illinois 85486' },
  { id: '11', title: 'United States Gym Center', address: '3891 Ranchview Dr. Richardson, California 62639' },
];

const LocationSearchModal = ({ visible, onClose, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('United States');

  const filteredLocations = MOCK_LOCATIONS.filter(loc => 
    loc.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderLocationItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.locationItem} 
      onPress={() => {
        onSelect(item.title);
        onClose();
      }}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="location-outline" size={24} color="#333" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.locationTitle}>{item.title}</Text>
        {item.address !== '' && (
          <Text style={styles.locationAddress}>{item.address}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        {/* Header with Search */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color="#000" />
          </TouchableOpacity>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search location"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Location List */}
        <FlatList
          data={filteredLocations}
          renderItem={renderLocationItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </SafeAreaView>
    </Modal>
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
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 46,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  listContent: {
    paddingVertical: SPACING.sm,
  },
  locationItem: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 15,
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 15,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    lineHeight: 22,
  },
  locationAddress: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    lineHeight: 18,
  },
});

export default LocationSearchModal;
