import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const BusinessVideoCard = ({ video, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.9}>

      {/* 1. Header (Avatar, Name, Time, Menu) */}
      <View style={styles.headerContainer}>
        <View style={styles.headerLeft}>
          <Image source={{ uri: video.channelAvatar }} style={styles.avatar} />
          <View style={styles.headerTextContainer}>
            <Text style={styles.channelName}>{video.channelName}</Text>
            <Text style={styles.timeAgo}>{video.publishedAt}</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.menuButton}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* 2. Text Content (Title, Website, Hashtags) */}
      <View style={styles.bodyContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {video.title}
        </Text>

        {video.website && (
          <Text style={styles.website}>{video.website}</Text>
        )}

        {video.hashtags && (
          <Text style={styles.hashtags}>
            {video.hashtags.map(tag => `#${tag} `)}
          </Text>
        )}
      </View>

      {/* 3. Media (Thumbnail Image with Duration Overlay) */}
      <View style={styles.thumbnailContainer}>
        <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{video.duration}</Text>
        </View>
      </View>

      {/* 4. Interactions Bottom Bar */}
      <View style={styles.interactionsContainer}>
        <View style={styles.interactionItem}>
          <MaterialCommunityIcons name="thumb-up-outline" size={22} color="#444" />
          <Text style={styles.interactionText}>{video.likes || '0'}</Text>
        </View>

        <View style={styles.interactionItem}>
          <MaterialCommunityIcons name="thumb-down-outline" size={22} color="#444" />
          <Text style={styles.interactionText}>{video.dislikes || '0'}</Text>
        </View>

        <View style={styles.interactionItem}>
          <MaterialCommunityIcons name="message-outline" size={22} color="#444" />
          <Text style={styles.interactionText}>{video.comments || '0'}</Text>
        </View>

        <View style={styles.interactionItem}>
          <MaterialCommunityIcons name="share-outline" size={24} color="#444" />
          <Text style={styles.interactionText}>{video.shares || '0'}</Text>
        </View>
      </View>

    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 5,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
  },

  // Header
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 50,
    marginRight: 12,
    backgroundColor: '#222', // Match dark avatar placeholder style
  },
  headerTextContainer: {
    justifyContent: 'center',
  },
  channelName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 2,
  },
  timeAgo: {
    fontSize: 13,
    color: '#666',
  },
  menuButton: {
    padding: 8,
    marginRight: -8, // Offset padding for alignment
  },

  // Body Content
  bodyContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '700', // Bold title
    color: '#1a1a1a',
    marginBottom: 8,
    lineHeight: 24,
  },
  website: {
    fontSize: 13,
    color: '#555',
    marginBottom: 6, // Spacing above hashtags
  },
  hashtags: {
    fontSize: 13,
    color: '#8BA5C4', // Soft blue matching image
  },

  // Thumbnail
  thumbnailContainer: {
    width: '100%',
    height: 220,
    backgroundColor: '#e1e1e1',
    borderRadius: 16, // Nice rounded corners
    overflow: 'hidden',
    position: 'relative', // For duration badge
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(51, 51, 51, 0.85)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },

  // Interactions
  interactionsContainer: {
    flexDirection: 'row',
    marginTop: 16,
    marginBottom: 8,
    alignItems: 'center',
    gap: 24, // Consistent spacing between action items
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6, // Space between icon and text
  },
  interactionText: {
    fontSize: 13,
    color: '#555',
    fontWeight: '500', // Slightly bolded numbers
  },
});

export default BusinessVideoCard;
