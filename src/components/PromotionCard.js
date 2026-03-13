import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const PromotionCard = ({ item }) => {
  console.log('item', item);

  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.8}>
      <View style={styles.imageContainer}>
        <Image source={{ uri: item.image }} style={styles.thumbnail} />
        {/* Dark overlay on the right half of the image */}
        <View style={styles.rightOverlay}>
          <Text style={styles.viewCount}>{item.views}</Text>
          <MaterialCommunityIcons
            name="play-circle-outline"
            size={20}
            color="#fff"
          />
        </View>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.price}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
  },
  imageContainer: {
    width: 140,
    height: 100,
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  rightOverlay: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '50%',
    backgroundColor: 'rgba(0,0,0,0.5)', // Dark gradient/overlay look
    justifyContent: 'center',
    alignItems: 'center',
    paddingRight: 5,
  },
  viewCount: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  textContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  price: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
});

export default PromotionCard;
