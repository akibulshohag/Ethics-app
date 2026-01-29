import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const PlaylistCard = ({ playlist, onPress }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.thumbnailContainer}>
        <Image source={{ uri: playlist.thumbnail }} style={styles.thumbnail} />
        <View style={styles.overlay}>
           <Text style={styles.videoCountOverlay}>{playlist.videoCount}</Text>
           <MaterialCommunityIcons name="playlist-play" size={24} color="#fff" />
        </View>
      </View>
      <View style={styles.detailsContainer}>
          <View style={styles.textContainer}>
            <Text style={styles.title} numberOfLines={2}>
              {playlist.title}
            </Text>
            <Text style={styles.subtitle}>
              {playlist.channelName}
            </Text>
             <Text style={styles.subtitle}>
              {playlist.videoCount} videos
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
    width: 160,
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
    marginRight: 12,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlay: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      width: '40%', // Covers right part of thumbnail
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
  },
  videoCountOverlay: {
      color: '#fff',
      fontSize: 12,
      fontWeight: '600',
      marginBottom: 4,
  },
  detailsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingVertical: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '700', 
    color: '#212121',
    marginBottom: 4,
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    color: '#424242',
    marginBottom: 2,
  },
  menuButton: {
    paddingLeft: 4,
    paddingTop: 4,
  },
});

export default PlaylistCard;
