import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import SetVisibilityModal from './SetVisibilityModal';
import SelectAudienceModal from './SelectAudienceModal';
import CommentsSettingsModal from './CommentsSettingsModal';
import VideoDescriptionModal from './VideoDescriptionModal';
import LocationSearchModal from './LocationSearchModal';
import { uploadVideo } from '../services/videoService';

const { width } = Dimensions.get('window');

const VideoUploadSettings = ({
  visible,
  onClose,
  selectedVideo,
  userId,
  onUploadComplete,
}) => {
  const [title, setTitle] = useState('');
  const [selectedThumbnail, setSelectedThumbnail] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Modal Visibility State
  const [descriptionModalVisible, setDescriptionModalVisible] = useState(false);
  const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
  const [audienceModalVisible, setAudienceModalVisible] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);

  // Values State
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [visibility, setVisibility] = useState('public');
  const [audience, setAudience] = useState({
    madeForKids: null,
    ageRestricted: null,
  });
  const [comments, setComments] = useState('Allow all comments');
  const [location, setLocation] = useState('');

  // Reset form when modal closes or opens
  useEffect(() => {
    if (!visible) {
      // Reset all state when modal closes
      setTitle('');
      setDescription('');
      setHashtags([]);
      setSelectedThumbnail(null);
      setVisibility('public');
      setUploadProgress(0);
    } else if (visible && !userId) {
      // If modal opens without userId, show error and close
      Alert.alert(
        'Authentication Error',
        'User not found. Please login again.',
        [
          {
            text: 'OK',
            onPress: () => onClose(),
          },
        ],
      );
    } else if (selectedVideo && visible) {
      // When modal opens with a video, try to extract thumbnail from video
      // For now, we'll let user pick thumbnail manually
    }
  }, [visible, selectedVideo, userId]);

  // Pick thumbnail image
  const pickThumbnail = () => {
    const options = {
      mediaType: 'photo',
      quality: 1,
    };

    launchImageLibrary(options, response => {
      if (response.didCancel) {
        console.log('User cancelled thumbnail picker');
      } else if (response.errorCode) {
        Alert.alert(
          'Error',
          response.errorMessage || 'Failed to pick thumbnail',
        );
      } else if (response.assets && response.assets.length > 0) {
        const thumbnail = response.assets[0];
        setSelectedThumbnail(thumbnail);
      }
    });
  };

  // Handle video upload
  const handleUpload = async () => {
    // Validation
    if (!selectedVideo) {
      Alert.alert('Error', 'Please select a video first');
      return;
    }
    if (!selectedThumbnail) {
      Alert.alert('Error', 'Please select a thumbnail image');
      return;
    }
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a video title');
      return;
    }
    if (!userId) {
      Alert.alert('Error', 'User not found. Please login again');
      return;
    }

    try {
      setUploading(true);

      // Safely parse numeric values
      const duration = selectedVideo.duration
        ? Math.floor(Number(selectedVideo.duration) || 0)
        : undefined;
      const width = selectedVideo.width
        ? Number(selectedVideo.width)
        : undefined;
      const height = selectedVideo.height
        ? Number(selectedVideo.height)
        : undefined;

      // Prepare video data
      const videoData = {
        videoUri: selectedVideo.uri,
        videoType: selectedVideo.type || 'video/mp4',
        videoName: selectedVideo.fileName || `video_${Date.now()}.mp4`,
        thumbnailUri: selectedThumbnail.uri,
        thumbnailType: selectedThumbnail.type || 'image/jpeg',
        thumbnailName:
          selectedThumbnail.fileName || `thumbnail_${Date.now()}.jpg`,
        userId: userId,
        title: title.trim(),
        description: description.trim() || undefined,
        category: undefined, // Can be added later
        tags: hashtags.length > 0 ? hashtags : [],
        visibility: visibility.toLowerCase(),
        ...(duration !== undefined && { duration }),
        ...(width !== undefined && width > 0 && { width }),
        ...(height !== undefined && height > 0 && { height }),
        onUploadProgress: progress => {
          setUploadProgress(progress);
        },
      };

      console.log('Uploading video:', videoData);

      // Upload video
      const result = await uploadVideo(videoData);

      console.log('Upload successful:', result);

      Alert.alert('Success', 'Video uploaded successfully!', [
        {
          text: 'OK',
          onPress: () => {
            setUploading(false);
            setUploadProgress(0);
            if (onUploadComplete) {
              onUploadComplete();
            }
            onClose();
          },
        },
      ]);
    } catch (error) {
      console.error('Upload error:', error);
      const msg = Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(' ')
        : error.response?.data?.message ||
          error.message ||
          'Failed to upload video';
      Alert.alert('Upload Failed', msg);
      setUploading(false);
    }
  };

  const SettingItem = ({
    icon,
    label,
    value,
    showArrow = true,
    isPlus = false,
    onPress,
    disabled = false,
  }) => (
    <TouchableOpacity
      style={[styles.settingItem, disabled && styles.settingItemDisabled]}
      onPress={onPress}
      disabled={disabled || uploading}
    >
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          {icon.type === 'Ionicons' ? (
            <Ionicons name={icon.name} size={24} color="#333" />
          ) : (
            <MaterialCommunityIcons name={icon.name} size={24} color="#333" />
          )}
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && (
          <Text style={styles.settingValue} numberOfLines={1}>
            {value}
          </Text>
        )}
        {isPlus ? (
          <Ionicons name="add-circle-outline" size={24} color="#333" />
        ) : (
          showArrow && (
            <Ionicons name="chevron-forward" size={20} color="#333" />
          )
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Details</Text>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialCommunityIcons
              name="dots-horizontal-circle-outline"
              size={26}
              color="#000"
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Cover Image Section */}
          <View style={styles.coverContainer}>
            {selectedThumbnail ? (
              <Image
                source={{ uri: selectedThumbnail.uri }}
                style={styles.coverImage}
              />
            ) : selectedVideo ? (
              <Image
                source={{ uri: selectedVideo.uri }}
                style={styles.coverImage}
              />
            ) : (
              <View style={styles.coverPlaceholder}>
                <MaterialCommunityIcons
                  name="image-outline"
                  size={48}
                  color="#ccc"
                />
                <Text style={styles.coverPlaceholderText}>
                  No thumbnail selected
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.coverOverlay}
              onPress={pickThumbnail}
              disabled={uploading || !selectedVideo}
            >
              <Text style={styles.changeCoverText}>
                {selectedThumbnail ? 'Change cover' : 'Select cover'}
              </Text>
            </TouchableOpacity>
            {uploading && (
              <View style={styles.uploadProgressOverlay}>
                <ActivityIndicator size="large" color="#fff" />
                <Text style={styles.uploadProgressText}>{uploadProgress}%</Text>
              </View>
            )}
          </View>

          {/* Title Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Add a Title</Text>
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Your title here..."
                placeholderTextColor="#ffffff"
                value={title}
                onChangeText={setTitle}
                multiline
              />
            </View>
          </View>

          {/* Settings List */}
          <View style={styles.settingsList}>
            <SettingItem
              icon={{ type: 'Ionicons', name: 'pencil-outline' }}
              label="Add Description"
              onPress={() => setDescriptionModalVisible(true)}
            />
            <SettingItem
              icon={{ type: 'Ionicons', name: 'eye-outline' }}
              label="Visibility"
              value={visibility.charAt(0).toUpperCase() + visibility.slice(1)}
              onPress={() => setVisibilityModalVisible(true)}
              disabled={uploading}
            />
            <SettingItem
              icon={{ type: 'Ionicons', name: 'people-outline' }}
              label="Select Audience"
              onPress={() => setAudienceModalVisible(true)}
            />
            <SettingItem
              icon={{ type: 'Ionicons', name: 'calendar-outline' }}
              label="Schedule"
              value="Now"
            />
            <SettingItem
              icon={{ type: 'Ionicons', name: 'chatbubble-outline' }}
              label="Comments"
              value={comments}
              onPress={() => setCommentsModalVisible(true)}
            />
            <SettingItem
              icon={{ type: 'Ionicons', name: 'location-outline' }}
              label="Location"
              value={location}
              onPress={() => setLocationModalVisible(true)}
            />
            <SettingItem
              icon={{ type: 'Ionicons', name: 'play-circle-outline' }}
              label="Add to Playlist"
              isPlus={true}
            />
          </View>

          {/* Upload Button */}
          {!userId && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={20} color="#EF4444" />
              <Text style={styles.errorBannerText}>
                User not found. Please login again.
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={[
              styles.uploadButton,
              (!selectedVideo ||
                !selectedThumbnail ||
                !title.trim() ||
                uploading ||
                !userId) &&
                styles.uploadButtonDisabled,
            ]}
            onPress={handleUpload}
            disabled={
              !selectedVideo ||
              !selectedThumbnail ||
              !title.trim() ||
              uploading ||
              !userId
            }
          >
            {uploading ? (
              <View style={styles.uploadButtonContent}>
                <ActivityIndicator
                  size="small"
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.uploadButtonText}>
                  Uploading... {uploadProgress}%
                </Text>
              </View>
            ) : (
              <Text style={styles.uploadButtonText}>Upload Video</Text>
            )}
          </TouchableOpacity>
        </ScrollView>

        {/* Sub Modals */}
        <VideoDescriptionModal
          visible={descriptionModalVisible}
          onClose={() => setDescriptionModalVisible(false)}
          description={description}
          setDescription={setDescription}
          hashtags={hashtags}
          setHashtags={setHashtags}
        />
        <SetVisibilityModal
          visible={visibilityModalVisible}
          onClose={() => setVisibilityModalVisible(false)}
          initialValue={
            visibility.charAt(0).toUpperCase() + visibility.slice(1)
          }
          onApply={val => setVisibility(val.toLowerCase())}
        />
        <SelectAudienceModal
          visible={audienceModalVisible}
          onClose={() => setAudienceModalVisible(false)}
          initialValue={audience}
          onApply={val => setAudience(val)}
        />
        <CommentsSettingsModal
          visible={commentsModalVisible}
          onClose={() => setCommentsModalVisible(false)}
          initialValue={comments}
          onApply={val => setComments(val)}
        />
        <LocationSearchModal
          visible={locationModalVisible}
          onClose={() => setLocationModalVisible(false)}
          onSelect={val => setLocation(val)}
        />
      </SafeAreaView>
    </Modal>
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
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  coverContainer: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: SPACING.md,
    backgroundColor: '#f0f0f0',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeCoverText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputSection: {
    marginTop: SPACING.xl,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: SPACING.md,
  },
  textInputContainer: {
    backgroundColor: '#F7BB5B',
    borderRadius: 20,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 60,
  },
  textInput: {
    fontSize: 16,
    color: '#ffffff',
    textAlignVertical: 'top',
  },
  settingsList: {
    marginTop: SPACING.xl,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: SPACING.lg,
  },
  settingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  settingValue: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
    maxWidth: 120,
  },
  uploadButton: {
    backgroundColor: '#FF7F06',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xxxl,
  },
  uploadButtonDisabled: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
  uploadButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  coverPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  coverPlaceholderText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: '#999',
  },
  uploadProgressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadProgressText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: SPACING.sm,
  },
  settingItemDisabled: {
    opacity: 0.5,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xl,
    marginBottom: SPACING.md,
  },
  errorBannerText: {
    marginLeft: SPACING.sm,
    color: '#EF4444',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default VideoUploadSettings;
