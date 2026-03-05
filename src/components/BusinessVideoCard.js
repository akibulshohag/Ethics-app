import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const BusinessVideoCard = ({ video, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.thumbnailContainer}>
        <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{video.duration}</Text>
        </View>
      </View>
      <View style={styles.detailsContainer}>
        <View style={styles.headerInfo}>
          <Image source={{ uri: video.channelAvatar }} style={styles.avatar} />
          <View style={styles.textContainer}>
            <Text style={styles.channelName}>{video.channelName}</Text>
            <Text style={styles.timeAgo}>{video.publishedAt}</Text>
          </View>
          <TouchableOpacity style={styles.menuButton}>
            <MaterialCommunityIcons name="dots-vertical" size={20} color="#000" />
          </TouchableOpacity>
        </View>

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

        <View style={styles.thumbnailContainer}>
          <Image source={{ uri: video.thumbnail }} style={styles.thumbnail} />
          <View style={styles.durationBadge}>
            <Text style={styles.durationText}>{video.duration}</Text>
          </View>
        </View>

        <View style={styles.interactionsContainer}>
          <View style={styles.interactionItem}>
            <MaterialCommunityIcons name="thumb-up-outline" size={20} color="#666" />
            <Text style={styles.interactionText}>{video.likes || '0'}</Text>
          </View>
          <View style={styles.interactionItem}>
            <MaterialCommunityIcons name="thumb-down-outline" size={20} color="#666" />
            <Text style={styles.interactionText}>{video.dislikes || '0'}</Text>
          </View>
          <View style={styles.interactionItem}>
            <MaterialCommunityIcons name="comment-outline" size={20} color="#666" />
            <Text style={styles.interactionText}>{video.comments || '0'}</Text>
          </View>
          <View style={styles.interactionItem}>
            <MaterialCommunityIcons name="share-variant-outline" size={20} color="#666" />
            <Text style={styles.interactionText}>{video.shares || '0'}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  thumbnailContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#e1e1e1',
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: 12,
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
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  detailsContainer: {
    paddingVertical: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#eee',
  },
  textContainer: {
    flex: 1,
  },
  channelName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  timeAgo: {
    fontSize: 12,
    color: '#777',
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
    lineHeight: 22,
  },
  website: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  hashtags: {
    fontSize: 12,
    color: '#3ea6ff',
    marginBottom: 4,
  },
  interactionsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    alignItems: 'center',
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
  },
  interactionText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  menuButton: {
    padding: 4,
  },
});

export default BusinessVideoCard;
