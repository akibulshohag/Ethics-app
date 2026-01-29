import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const ChannelAbout = () => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Description Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.descriptionText}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
        </Text>
      </View>

      {/* Links Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Links</Text>
        
        <TouchableOpacity style={styles.linkItem}>
          <MaterialCommunityIcons name="instagram" size={24} color="#F97507" />
          <Text style={styles.linkText}>Instagram</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkItem}>
          <MaterialCommunityIcons name="facebook" size={24} color="#F97507" />
          <Text style={styles.linkText}>Facebook</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkItem}>
          <MaterialCommunityIcons name="twitter" size={24} color="#F97507" />
          <Text style={styles.linkText}>Twitter</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkItem}>
          <MaterialCommunityIcons name="web" size={24} color="#F97507" />
          <Text style={styles.linkText}>Website</Text>
        </TouchableOpacity>
      </View>

      {/* More Info Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>More Info</Text>
        
        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="map-marker-outline" size={24} color="#212121" />
          <Text style={styles.infoText}>United States</Text>
        </View>

        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="information-outline" size={24} color="#212121" />
          <Text style={styles.infoText}>Joined December 20, 2012</Text>
        </View>

        <View style={styles.infoItem}>
          <MaterialCommunityIcons name="chart-line-variant" size={24} color="#212121" />
          <Text style={styles.infoText}>8,367,027,349 views</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 14,
    color: '#616161',
    lineHeight: 22,
  },
  linkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  linkText: {
    fontSize: 16,
    color: '#F97507',
    marginLeft: 12,
    fontWeight: '500',
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoText: {
    fontSize: 16,
    color: '#212121',
    marginLeft: 12,
  },
});

export default ChannelAbout;
