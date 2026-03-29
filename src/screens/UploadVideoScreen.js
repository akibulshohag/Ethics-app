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
  Platform,
  NativeModules,
  PermissionsAndroid,
  Modal,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import { pick as pickDocument, types as docTypes, isErrorWithCode, errorCodes as docErrorCodes } from '@react-native-documents/picker';
import { useSelector } from 'react-redux';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import VideoUploadSettings from '../components/VideoUploadSettings';
import { getUserVideos } from '../services/videoService';
import { getUserSubscription } from '../services/subscriptionService';
import { navigateToHomeOne } from '../utils/navigateToHomeOne';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - SPACING.lg * 3) / 2;
const IN_APP_GALLERY_NUM_COLUMNS = 3;
const IN_APP_TILE_SIZE = (width - SPACING.md * (IN_APP_GALLERY_NUM_COLUMNS + 1)) / IN_APP_GALLERY_NUM_COLUMNS;

// Android 13+ granular media permissions so gallery picker sees all videos
const ANDROID_MEDIA_PERMISSIONS =
  Platform.OS === 'android' && Platform.Version >= 33
    ? [
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_VIDEO,
        PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
      ]
    : [];

const GALLERY_REFRESH_DELAY_MS = 1200;

async function ensureMediaPermissionsAndRefreshGallery() {
  if (Platform.OS !== 'android') return;
  try {
    if (ANDROID_MEDIA_PERMISSIONS.length > 0) {
      const result = await PermissionsAndroid.requestMultiple(ANDROID_MEDIA_PERMISSIONS);
      const allGranted = ANDROID_MEDIA_PERMISSIONS.every(
        p => result[p] === PermissionsAndroid.RESULTS.GRANTED,
      );
      if (!allGranted) {
        // User denied; picker may still work with limited access
      }
    }
    const { MediaScannerRefresh } = NativeModules;
    if (MediaScannerRefresh?.refreshVideoDirectories) {
      await MediaScannerRefresh.refreshVideoDirectories();
      // Give MediaStore time to update so the system picker shows latest videos
      await new Promise(r => setTimeout(r, GALLERY_REFRESH_DELAY_MS));
    }
  } catch (e) {
    // Non-fatal: open picker anyway
  }
}

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
  const [refreshingGallery, setRefreshingGallery] = useState(false);
  const [inAppGalleryVisible, setInAppGalleryVisible] = useState(false);
  const [deviceVideos, setDeviceVideos] = useState([]);
  const [loadingDeviceVideos, setLoadingDeviceVideos] = useState(false);

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
  const pickVideoFromDevice = async () => {
    if (!user || !user.id) {
      Alert.alert('Authentication Required', 'Please login to upload videos', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    try {
      const sub = await getUserSubscription(user.id);
      if (!sub.canUploadVideo) {
        Alert.alert(
          'Upload Limit Reached',
          sub.message || 'You have reached your video upload limit. Upgrade your plan to upload more.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => navigation.navigate('SubscriptionScreen') },
          ],
        );
        return;
      }
    } catch (e) {
      console.error('Subscription check error:', e);
    }

    // Refresh MediaStore and ensure READ_MEDIA_VIDEO (Android)
    if (Platform.OS === 'android') setRefreshingGallery(true);
    try {
      await ensureMediaPermissionsAndRefreshGallery();
    } finally {
      setRefreshingGallery(false);
    }

    // On Android: show in-app gallery (MediaStore, newest first) so latest videos always appear
    if (Platform.OS === 'android') {
      const { MediaScannerRefresh } = NativeModules;
      if (MediaScannerRefresh?.getVideoList) {
        setLoadingDeviceVideos(true);
        try {
          const list = await MediaScannerRefresh.getVideoList(80);
          if (list && list.length > 0) {
            setDeviceVideos(list);
            setInAppGalleryVisible(true);
            return;
          }
        } catch (e) {
          console.warn('In-app gallery failed, using system picker:', e);
        } finally {
          setLoadingDeviceVideos(false);
        }
      }
    }

    // Android fallback: avoid limited system Photo Picker; open file browser instead
    if (Platform.OS === 'android') {
      await pickVideoFromFiles();
      return;
    }

    // iOS fallback: use system image picker
    const options = {
      mediaType: 'video',
      quality: 1,
      videoQuality: 'high',
      includeExtra: true,
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

  const openBrowseFiles = async () => {
    setInAppGalleryVisible(false);
    await pickVideoFromFiles();
  };

  const onSelectDeviceVideo = item => {
    setSelectedVideo({
      uri: item.uri,
      type: item.type || 'video/mp4',
      fileName: item.fileName || 'video.mp4',
      duration: item.duration,
    });
    setInAppGalleryVisible(false);
    setModalVisible(true);
  };

  // Pick video from files (Downloads / Recent) – use when gallery doesn't show latest
  const pickVideoFromFiles = async () => {
    if (!user || !user.id) {
      Alert.alert('Authentication Required', 'Please login to upload videos', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Login', onPress: () => navigation.navigate('Login') },
      ]);
      return;
    }
    try {
      const sub = await getUserSubscription(user.id);
      if (!sub.canUploadVideo) {
        Alert.alert(
          'Upload Limit Reached',
          sub.message || 'You have reached your video upload limit. Upgrade your plan to upload more.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Upgrade', onPress: () => navigation.navigate('SubscriptionScreen') },
          ],
        );
        return;
      }
    } catch (e) {
      console.error('Subscription check error:', e);
    }

    try {
      const res = await pickDocument({
        type: docTypes.video,
        allowMultiSelection: false,
      });
      const file = Array.isArray(res) ? res[0] : res;
      if (!file?.uri) return;
      setSelectedVideo({
        uri: file.uri,
        type: file.mimeType || file.type || 'video/mp4',
        fileName: file.name || 'video.mp4',
      });
      setModalVisible(true);
    } catch (e) {
      if (isErrorWithCode(e) && e.code === docErrorCodes.OPERATION_CANCELED) return;
      Alert.alert('Error', e?.message || 'Failed to pick video');
    }
  };

  const renderVideoItem = ({ item, index }) => {
    // First item is always the "Upload" button + "Choose from files"
    if (index === 0) {
      return (
        <View style={styles.uploadButtonItem}>
          <TouchableOpacity
            style={styles.uploadButtonContent}
            onPress={pickVideoFromDevice}
            disabled={refreshingGallery || loadingDeviceVideos}
          >
            {refreshingGallery || loadingDeviceVideos ? (
              <>
                <ActivityIndicator size="small" color={COLORS.primaryOrange} />
                <Text style={styles.uploadButtonText}>
                  {loadingDeviceVideos ? 'Loading videos…' : 'Refreshing gallery…'}
                </Text>
                <Text style={styles.uploadButtonSubtext}>
                  {loadingDeviceVideos ? 'Newest first' : 'So latest videos appear'}
                </Text>
              </>
            ) : (
              <>
                <MaterialCommunityIcons
                  name="video-plus"
                  size={48}
                  color={COLORS.primaryOrange}
                />
                <Text style={styles.uploadButtonText}>Upload Video</Text>
                <Text style={styles.uploadButtonSubtext}>From gallery</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.chooseFromFilesButton}
            onPress={pickVideoFromFiles}
            disabled={refreshingGallery || loadingDeviceVideos}
          >
            <MaterialCommunityIcons name="folder-open" size={20} color={COLORS.primaryOrange} />
            <Text style={styles.chooseFromFilesText}>Choose from files (Downloads / Recent)</Text>
          </TouchableOpacity>
        </View>
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
          onPress={() => navigateToHomeOne(navigation)}
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

      {/* In-app gallery (Android): newest first, so latest videos always show */}
      <Modal
        visible={inAppGalleryVisible}
        animationType="slide"
        onRequestClose={() => setInAppGalleryVisible(false)}
      >
        <SafeAreaView style={styles.inAppGalleryContainer} edges={['top']}>
          <View style={styles.inAppGalleryHeader}>
            <TouchableOpacity onPress={() => setInAppGalleryVisible(false)} style={styles.headerButton}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            <Text style={styles.inAppGalleryTitle}>Choose video</Text>
            <View style={styles.headerButton} />
          </View>
          <Text style={styles.inAppGallerySubtitle}>Newest first • Tap to select</Text>
          <FlatList
            data={deviceVideos}
            keyExtractor={(item, i) => item.uri || `v-${i}`}
            numColumns={IN_APP_GALLERY_NUM_COLUMNS}
            contentContainerStyle={styles.inAppGalleryList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.inAppGalleryTile}
                onPress={() => onSelectDeviceVideo(item)}
                activeOpacity={0.8}
              >
                {item.thumbnailUri ? (
                  <Image source={{ uri: item.thumbnailUri }} style={styles.inAppGalleryThumb} />
                ) : (
                  <View style={[styles.inAppGalleryThumb, styles.inAppGalleryThumbPlaceholder]}>
                    <MaterialCommunityIcons name="video-outline" size={40} color="#888" />
                  </View>
                )}
                <View style={styles.inAppGalleryDurationBadge}>
                  <Text style={styles.inAppGalleryDurationText}>
                    {formatDuration(Math.floor(item.duration || 0))}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
          <TouchableOpacity style={styles.useSystemPickerBtn} onPress={openBrowseFiles}>
            <MaterialCommunityIcons name="folder-open" size={20} color={COLORS.primaryOrange} />
            <Text style={styles.useSystemPickerText}>Browse files (all videos)</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

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
    minHeight: COLUMN_WIDTH * 0.75,
    marginRight: SPACING.lg,
    marginBottom: SPACING.lg,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#f9f9f9',
    borderWidth: 2,
    borderColor: COLORS.primaryOrange,
    borderStyle: 'dashed',
    paddingBottom: SPACING.sm,
  },
  uploadButtonContent: {
    flex: 1,
    minHeight: COLUMN_WIDTH * 0.6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryOrange,
  },
  uploadButtonSubtext: {
    marginTop: 2,
    fontSize: 11,
    color: '#888',
  },
  chooseFromFilesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: 6,
  },
  chooseFromFilesText: {
    fontSize: 12,
    color: COLORS.primaryOrange,
    fontWeight: '500',
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
  inAppGalleryContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  inAppGalleryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  inAppGalleryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  inAppGallerySubtitle: {
    fontSize: 12,
    color: '#666',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  inAppGalleryList: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  inAppGalleryTile: {
    width: IN_APP_TILE_SIZE,
    height: IN_APP_TILE_SIZE,
    margin: SPACING.md / 2,
    borderRadius: 8,
    overflow: 'hidden',
  },
  inAppGalleryThumb: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  inAppGalleryThumbPlaceholder: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inAppGalleryDurationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  inAppGalleryDurationText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  useSystemPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.md,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  useSystemPickerText: {
    fontSize: 14,
    color: COLORS.primaryOrange,
    fontWeight: '600',
  },
});

export default UploadVideoScreen;
