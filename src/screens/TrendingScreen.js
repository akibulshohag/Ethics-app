import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, FONTS, SPACING } from '../constants/theme';
import TrendingScreen from './TrendingScreen';
const { width } = Dimensions.get('window');

const TRENDING_FEED = [
  { 
    id: 't1', 
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix', 
    author: 'BBC Earth', views: '9.5M views', time: '5 months ago', duration: '15:27', 
    thumbnail: 'https://picsum.photos/800/450' 
  },
  { 
    id: 't2', 
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix', 
    author: 'BBC Earth', views: '9.5M views', time: '5 months ago', duration: '15:27', 
    thumbnail: 'https://picsum.photos/801/451' 
  },
];

const SUB_CATEGORIES = ['Top', 'Music', 'Gaming', 'News'];

const TrendingScreen = ({ onBack }) => {
  const renderItem = ({ item }) => (
    <View style={styles.videoCard}>
      <View style={styles.thumbnailWrapper}>
        <Image source={{ uri: item.thumbnail }} style={styles.videoThumbnail} />
        <View style={styles.durationBadge}><Text style={styles.durationText}>{item.duration}</Text></View>
      </View>
      <div style={styles.videoDetails}>
        <View style={styles.channelIcon} />
        <View style={styles.videoInfo}>
          <Text style={styles.videoTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.videoMeta}>{item.author} • {item.views} • {item.time}</Text>
        </View>
        <TouchableOpacity>
          <Icon name="dots-vertical" size={20} color="#000" />
        </TouchableOpacity>
      </div>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={onBack}>
            <Icon name="arrow-left" size={28} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Trending</Text>
        </View>
        <View style={styles.headerRight}>
          <Icon name="magnify" size={26} color="#000" style={{ marginRight: 20 }} />
          <Icon name="dots-vertical" size={26} color="#000" />
        </View>
      </View>

      {/* Sub-Category Chips */}
      <View style={styles.chipContainer}>
        {SUB_CATEGORIES.map((item, index) => (
          <TouchableOpacity 
            key={item} 
            style={[styles.chip, index === 0 && styles.chipActive]}
          >
            <Text style={[styles.chipText, index === 0 && styles.chipTextActive]}>{item}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={TRENDING_FEED}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 60,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', marginLeft: 15, color: '#000' },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  chipContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  chip: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.primaryOrange,
    marginRight: 10,
  },
  chipActive: { backgroundColor: COLORS.primaryOrange },
  chipText: { color: COLORS.primaryOrange, fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  videoCard: { marginBottom: 20 },
  thumbnailWrapper: { width: '100%', height: 220 },
  videoThumbnail: { width: '100%', height: '100%' },
  durationBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 5, borderRadius: 4 },
  durationText: { color: '#fff', fontSize: 12 },
  videoDetails: { flexDirection: 'row', padding: 12 },
  channelIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#333' },
  videoInfo: { flex: 1, marginHorizontal: 12 },
  videoTitle: { fontSize: 16, fontWeight: '600', color: '#000', lineHeight: 22 },
  videoMeta: { fontSize: 13, color: '#606060', marginTop: 4 },
});

export default TrendingScreen;