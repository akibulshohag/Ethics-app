import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const CompactVideoCard = ({ video, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.thumbnailContainer}>
        <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{video.duration}</Text>
        </View>
      </View>
      <View style={styles.detailsContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={3}>
              {video.title}
            </Text>
            <Text style={styles.subtitle}>
              {video.views} • {video.publishedAt}
            </Text>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <MaterialCommunityIcons name="dots-vertical" size={16} color="#000" />
          </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: 16,
    paddingHorizontal: 16,
    height: 90, 
  },
  thumbnailContainer: {
    width: 120,
    height: '100%',
    backgroundColor: '#e1e1e1',
    borderRadius: 12, // Rounded corners for thumbnail
    overflow: 'hidden',
    marginRight: 12,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  detailsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  title: {
    fontSize: 14,
    fontWeight: '700', 
    color: '#212121',
    marginBottom: 4,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    color: '#424242',
  },
  menuButton: {
    paddingLeft: 4,
  },
});

export default CompactVideoCard;
