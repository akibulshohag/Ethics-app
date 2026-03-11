import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

const BusinessVideoTabCard = ({ item, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.cardContainer}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.imageWrapper}>
        <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
        {/* Centered Play Button Overlay */}
        <View style={styles.playButtonOverlay}>
          <View style={styles.playIconCircle}>
            <Ionicons name="play" size={24} color="#fff" style={styles.playIcon} />
          </View>
        </View>
      </View>

      <View style={styles.infoContainer}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {item.title}
          </Text>
          <View style={styles.viewsContainer}>
            <Text style={styles.viewsText}>{item.views}</Text>
            <Ionicons name="eye-outline" size={14} color="#999" />
          </View>
        </View>

        <View style={styles.locationRow}>
          <View style={styles.locationLeft}>
            <Ionicons name="location" size={14} color="#4A5C9B" />
            <Text style={styles.locationText}>{item.location}</Text>
          </View>
          <Text style={styles.distanceText}>{item.distance}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#F8F9FA', // Light grey almost white background matching image
    borderRadius: 16,
    padding: 12, // Internal padding for the whole card
    marginBottom: 16,
    marginHorizontal: 16,
  },
  imageWrapper: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  playButtonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIconCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.4)', // Semi-transparent white
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    marginLeft: 4, // Visually center the play triangle
  },
  infoContainer: {
    paddingHorizontal: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    paddingRight: 10,
  },
  viewsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewsText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  locationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  locationLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
  distanceText: {
    fontSize: 13,
    color: '#999',
    fontWeight: '500',
  },
});

export default BusinessVideoTabCard;
