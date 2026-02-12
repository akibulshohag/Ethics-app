import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { useSelector } from 'react-redux';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import VideoUploadSettings from '../components/VideoUploadSettings';
import { getUserVideos } from '../services/videoService';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - SPACING.lg * 3) / 2;

// Helper function to format duration from seconds to MM:SS
const formatDuration = seconds => {
  if (!seconds) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const UploadVideoScreen = () => {
  const navigation = useNavigation();
  const { user } = useSelector(state => state.app); // Get user from Redux
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's videos when user is available
  useEffect(() => {
    if (user && user.id) {
      loadUserVideos();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Reload videos when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      if (user && user.id) {
        loadUserVideos();
      }
    }, [user]),
  );

  const loadUserVideos = async () => {
    if (!user || !user.id) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      // Get only current user's videos
      const response = await getUserVideos(user.id, 1, 50);

      if (response && response.videos) {
        setVideos(response.videos);
      }
    } catch (error) {
      console.error('Error loading videos:', error);
      Alert.alert('Error', 'Failed to load videos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Pick video from device
  const pickVideoFromDevice = () => {
    // Check if user is logged in before allowing upload
    if (!user || !user.id) {
      Alert.alert('Authentication Required', 'Please login to upload videos', [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Login',
          onPress: () => {
            // Navigate to login screen or handle login
            // You may need to adjust this based on your navigation structure
            navigation.navigate('Login');
          },
        },
      ]);
      return;
    }

    const options = {
      mediaType: 'video',
      quality: 1,
      videoQuality: 'high',
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('User cancelled video picker');
      } else if (response.errorCode) {
        Alert.alert('Error', response.errorMessage || 'Failed to pick video');
      } else if (response.assets && response.assets.length > 0) {
        const video = response.assets[0];
        setSelectedVideo(video);
        setModalVisible(true);
      }
    });
  };

  const renderVideoItem = ({ item, index }) => {
    // First item is always the "Upload" button
    if (index === 0) {
      return (
        <TouchableOpacity
          style={styles.uploadButtonItem}
          onPress={pickVideoFromDevice}
        >
          <View style={styles.uploadButtonContent}>
            <MaterialCommunityIcons
              name="video-plus"
              size={48}
              color={COLORS.primaryOrange}
            />
            <Text style={styles.uploadButtonText}>Upload Video</Text>
          </View>
        </TouchableOpacity>
      );
    }

    // Regular video item - clicking opens video details (for now, do nothing or navigate)
    const video = item;
    return (
      <TouchableOpacity
        style={styles.videoItem}
        onPress={() => {
          // TODO: Navigate to video details/player screen
          // For now, do nothing - videos are view-only in this screen
        }}
      >
        <Image
          source={{
            uri: video.thumbnailUrl || 'https://via.placeholder.com/300',
          }}
          style={styles.thumbnail}
        />
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>
            {formatDuration(video.duration)}
          </Text>
        </View>
        {video.status === 'processing' && (
          <View style={styles.processingBadge}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.processingText}>Processing</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const handleUploadComplete = () => {
    setSelectedVideo(null);
    setModalVisible(false);
    loadUserVideos(); // Reload videos after upload
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Ionicons name="close" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload a Video</Text>
        <TouchableOpacity style={styles.headerButton}>
          <MaterialCommunityIcons
            name="dots-horizontal-circle-outline"
            size={28}
            color="#000"
          />
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />

      {/* Video Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primaryOrange} />
        </View>
      ) : (
        <FlatList
          data={[{ id: 'upload-button' }, ...videos]}
          renderItem={renderVideoItem}
          keyExtractor={(item, index) => item.id || `item-${index}`}
          numColumns={2}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialCommunityIcons
                name="video-off-outline"
                size={64}
                color="#ccc"
              />
              <Text style={styles.emptyText}>No videos yet</Text>
              <Text style={styles.emptySubtext}>
                Tap the upload button to get started
              </Text>
            </View>
          }
        />
      )}

      <VideoUploadSettings
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedVideo(null);
        }}
        selectedVideo={selectedVideo}
        userId={user?.id}
        onUploadComplete={handleUploadComplete}
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
  uploadButtonItem: {
    width: COLUMN_WIDTH,
    height: COLUMN_WIDTH * 0.75,
    marginRight: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: COLORS.primaryOrange,
    borderStyle: 'dashed',
  },
  uploadButtonContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryOrange,
  },
  processingBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'rgba(255, 127, 6, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  processingText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xxl * 2,
    width: width - SPACING.lg * 2,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#999',
    marginTop: SPACING.md,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#ccc',
    marginTop: SPACING.sm,
  },
});

export default UploadVideoScreen;
