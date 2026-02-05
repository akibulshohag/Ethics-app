import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { useNavigation } from '@react-navigation/native';
import VideoUploadSettings from '../components/VideoUploadSettings';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - SPACING.lg * 3) / 2;

const MOCK_VIDEOS = [
  {
    id: '1',
    thumbnail: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=500&auto=format&fit=crop',
    duration: '20:43',
  },
  {
    id: '2',
    thumbnail: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=500&auto=format&fit=crop',
    duration: '32:29',
  },
  {
    id: '3',
    thumbnail: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?q=80&w=500&auto=format&fit=crop',
    duration: '12:27',
  },
  {
    id: '4',
    thumbnail: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=500&auto=format&fit=crop',
    duration: '24:49',
  },
  {
    id: '5',
    thumbnail: 'https://images.unsplash.com/photo-1551782450-a2132b4ba21d?q=80&w=500&auto=format&fit=crop',
    duration: '20:39',
  },
  {
    id: '6',
    thumbnail: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?q=80&w=500&auto=format&fit=crop',
    duration: '15:25',
  },
  {
    id: '7',
    thumbnail: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=500&auto=format&fit=crop',
    duration: '29:41',
  },
  {
    id: '8',
    thumbnail: 'https://images.unsplash.com/photo-1565299585323-38d6b0865ef4?q=80&w=500&auto=format&fit=crop',
    duration: '25:21',
  },
  {
    id: '9',
    thumbnail: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=500&auto=format&fit=crop',
    duration: '21:37',
  },
  {
    id: '10',
    thumbnail: 'https://images.unsplash.com/photo-1526367790999-015078648c7e?q=80&w=500&auto=format&fit=crop',
    duration: '37:40',
  },
  {
    id: '11',
    thumbnail: 'https://images.unsplash.com/photo-1567620905732-2d1ec7bb7445?q=80&w=500&auto=format&fit=crop',
    duration: '30:50',
  },
  {
    id: '12',
    thumbnail: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=500&auto=format&fit=crop',
    duration: '39:24',
  },
];

const UploadVideoScreen = () => {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);

  const renderVideoItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.videoItem} 
      onPress={() => setModalVisible(true)}
    >
      <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
      <View style={styles.durationBadge}>
        <Text style={styles.durationText}>{item.duration}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload a Video</Text>
        <TouchableOpacity style={styles.headerButton}>
          <MaterialCommunityIcons name="dots-horizontal-circle-outline" size={28} color="#000" />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* Video Grid */}
      <FlatList
        data={MOCK_VIDEOS}
        renderItem={renderVideoItem}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      <VideoUploadSettings 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    height: 56,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  headerButton: {
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  videoItem: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH * 0.75,
    marginRight: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});

export default UploadVideoScreen;
