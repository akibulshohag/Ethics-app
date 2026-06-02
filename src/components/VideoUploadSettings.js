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
  Pressable,
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
import VideoScheduleModal from './VideoScheduleModal';
import VideoCoverPickerModal from './VideoCoverPickerModal';
import { uploadVideo } from '../services/videoService';
import { thumbnailFromVideoFrame } from '../utils/videoThumbnail';
import {
  listCustomPlaylists,
  setCustomPlaylistItem,
} from '../services/playlistService';

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
  const [thumbLoading, setThumbLoading] = useState(false);
  const [coverPickerVisible, setCoverPickerVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Modal Visibility State
  const [descriptionModalVisible, setDescriptionModalVisible] = useState(false);
  const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
  const [audienceModalVisible, setAudienceModalVisible] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [locationModalVisible, setLocationModalVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  /** null = publish immediately; Date = go live at start of that local calendar day */
  const [scheduledPublishDate, setScheduledPublishDate] = useState(null);

  const [playlistModalVisible, setPlaylistModalVisible] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [playlistsLoadError, setPlaylistsLoadError] = useState(false);
  const [selectedPlaylistIds, setSelectedPlaylistIds] = useState([]);

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
      setThumbLoading(false);
      setVisibility('public');
      setUploadProgress(0);
      setScheduledPublishDate(null);
      setSelectedPlaylistIds([]);
      setUserPlaylists([]);
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
    } else if (selectedVideo?.uri && visible) {
      let cancelled = false;
      setThumbLoading(true);
      setSelectedThumbnail(null);
      thumbnailFromVideoFrame(selectedVideo.uri)
        .then(thumb => {
          if (!cancelled && thumb) setSelectedThumbnail(thumb);
        })
        .finally(() => {
          if (!cancelled) setThumbLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }
    if (visible && userId) {
      listCustomPlaylists(userId)
        .then(rows => {
          setUserPlaylists(Array.isArray(rows) ? rows : []);
          setPlaylistsLoadError(false);
        })
        .catch(() => {
          setUserPlaylists([]);
          setPlaylistsLoadError(true);
        });
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

  const pickCoverFromVideo = () => {
    if (!selectedVideo?.uri) {
      Alert.alert('Select video first', 'Please choose a video before cover selection.');
      return;
    }
    setCoverPickerVisible(true);
  };

  // Handle video upload
  const handleUpload = async () => {
    // Validation
    if (!selectedVideo) {
      Alert.alert('Error', 'Please select a video first');
      return;
    }
    let thumb = selectedThumbnail;
    if (!thumb?.uri) {
      setThumbLoading(true);
      try {
        thumb = await thumbnailFromVideoFrame(selectedVideo.uri);
      } catch {
        thumb = null;
      } finally {
        setThumbLoading(false);
      }
      if (thumb?.uri) setSelectedThumbnail(thumb);
    }
    if (!thumb?.uri) {
      Alert.alert(
        'Preview unavailable',
        'Could not generate a cover from this video. Choose a cover image or try another clip.',
      );
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
        thumbnailUri: thumb.uri,
        thumbnailType: thumb.type || 'image/jpeg',
        thumbnailName: thumb.fileName || thumb.name || `thumbnail_${Date.now()}.jpg`,
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

      const scheduleMs =
        scheduledPublishDate instanceof Date
          ? scheduledPublishDate.getTime()
          : 0;
      if (scheduleMs > Date.now() + 60_000) {
        videoData.scheduledPublishAt =
          scheduledPublishDate.toISOString();
      }

      if (selectedPlaylistIds.length > 0) {
        videoData.customPlaylistId = selectedPlaylistIds[0];
      }

      console.log('Uploading video:', videoData);

      // Upload video
      const result = await uploadVideo(videoData);

      console.log('Upload successful:', result);

      const videoId = result?.id || result?.video?.id;
      if (videoId && selectedPlaylistIds.length > 1) {
        for (let i = 1; i < selectedPlaylistIds.length; i++) {
          try {
            await setCustomPlaylistItem(
              selectedPlaylistIds[i],
              'video',
              videoId,
              true,
            );
          } catch (e) {
            console.warn(
              'Add to playlist',
              selectedPlaylistIds[i],
              e?.message,
            );
          }
        }
      }

      const scheduled =
        scheduledPublishDate instanceof Date &&
        scheduledPublishDate.getTime() > Date.now() + 60_000;
      const dateStr = scheduled
        ? scheduledPublishDate.toLocaleDateString(undefined, {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : '';

      Alert.alert(
        scheduled ? 'Video scheduled' : 'Success',
        scheduled
          ? `Your video will appear to everyone on ${dateStr}. You can see it in your uploads anytime.`
          : 'Video uploaded successfully!',
        [
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

  const scheduleDisplay = (() => {
    if (!scheduledPublishDate) return 'Now';
    const startTomorrow = new Date();
    startTomorrow.setHours(0, 0, 0, 0);
    startTomorrow.setDate(startTomorrow.getDate() + 1);
    if (scheduledPublishDate.getTime() >= startTomorrow.getTime()) {
      return scheduledPublishDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
    return 'Now';
  })();

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
            {thumbLoading ? (
              <View style={[styles.coverImage, styles.coverLoading]}>
                <ActivityIndicator size="large" color="#F5A623" />
                <Text style={styles.coverLoadingText}>Creating preview…</Text>
              </View>
            ) : selectedThumbnail ? (
              <Image
                source={{ uri: selectedThumbnail.uri }}
                style={styles.coverImage}
              />
            ) : selectedVideo ? (
              <View style={[styles.coverImage, styles.coverLoading]}>
                <MaterialCommunityIcons
                  name="movie-open-play-outline"
                  size={48}
                  color="#ccc"
                />
              </View>
            ) : (
              <View style={styles.coverPlaceholder}>
                <MaterialCommunityIcons
                  name="image-outline"
                  size={48}
                  color="#ccc"
                />
                <Text style={styles.coverPlaceholderText}>
                  Preview will be created from your video
                </Text>
              </View>
            )}
            <TouchableOpacity
              style={styles.coverOverlay}
              onPress={pickCoverFromVideo}
              disabled={uploading || !selectedVideo}
            >
              <Text style={styles.changeCoverText}>
                {selectedThumbnail ? 'Change cover from video' : 'Select cover from video'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.galleryCoverBtn}
              onPress={pickThumbnail}
              disabled={uploading || !selectedVideo}
            >
              <Text style={styles.galleryCoverBtnText}>Or choose photo from gallery</Text>
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
              value={scheduleDisplay}
              onPress={() => setScheduleModalVisible(true)}
              disabled={uploading}
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
                !title.trim() ||
                thumbLoading ||
                uploading ||
                !userId) &&
                styles.uploadButtonDisabled,
            ]}
            onPress={handleUpload}
            disabled={
              !selectedVideo ||
              !title.trim() ||
              thumbLoading ||
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
        <VideoScheduleModal
          visible={scheduleModalVisible}
          onClose={() => setScheduleModalVisible(false)}
          initialDate={scheduledPublishDate}
          onSelectNow={() => setScheduledPublishDate(null)}
          onConfirmDate={d => setScheduledPublishDate(d)}
        />
        <VideoCoverPickerModal
          visible={coverPickerVisible}
          onClose={() => setCoverPickerVisible(false)}
          videoUri={selectedVideo?.uri}
          durationSec={selectedVideo?.duration}
          onSelect={frame => setSelectedThumbnail(frame)}
          title="Select video cover"
        />
        <Modal
          visible={playlistModalVisible}
          animationType="slide"
          transparent
          onRequestClose={() => setPlaylistModalVisible(false)}
        >
          <View style={styles.playlistOverlay}>
            <Pressable
              style={styles.playlistBackdropFlex}
              onPress={() => setPlaylistModalVisible(false)}
            />
            <View style={styles.playlistSheet}>
              <Text style={styles.playlistSheetTitle}>Add to playlists</Text>
              <Text style={styles.playlistSheetHint}>
                Select one or more. First also links on upload.
              </Text>
              {playlistsLoadError ? (
                <TouchableOpacity
                  onPress={() => {
                    if (!userId) return;
                    listCustomPlaylists(userId)
                      .then(rows => {
                        setUserPlaylists(Array.isArray(rows) ? rows : []);
                        setPlaylistsLoadError(false);
                      })
                      .catch(() => setPlaylistsLoadError(true));
                  }}
                >
                  <Text style={styles.playlistRetry}>Tap to reload playlists</Text>
                </TouchableOpacity>
              ) : userPlaylists.length === 0 ? (
                <Text style={styles.playlistEmpty}>
                  No playlists yet. Create one in Library → New Playlist.
                </Text>
              ) : (
                <ScrollView style={styles.playlistScroll}>
                  {userPlaylists.map(pl => {
                    const on = selectedPlaylistIds.includes(pl.id);
                    return (
                      <TouchableOpacity
                        key={pl.id}
                        style={styles.playlistRow}
                        onPress={() => {
                          setSelectedPlaylistIds(prev =>
                            on
                              ? prev.filter(x => x !== pl.id)
                              : [...prev, pl.id],
                          );
                        }}
                      >
                        <View
                          style={[
                            styles.playlistCheck,
                            on && styles.playlistCheckOn,
                          ]}
                        >
                          {on ? (
                            <Ionicons name="checkmark" size={18} color="#fff" />
                          ) : null}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.playlistRowName}>{pl.name}</Text>
                          <Text style={styles.playlistRowMeta}>
                            {pl.itemCount ?? 0} videos
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
              <TouchableOpacity
                style={styles.playlistDoneBtn}
                onPress={() => setPlaylistModalVisible(false)}
              >
                <Text style={styles.playlistDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
  coverLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#F3F4F6',
  },
  coverLoadingText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '600',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryCoverBtn: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 14,
    alignItems: 'center',
    paddingVertical: 8,
  },
  galleryCoverBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  playlistOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  playlistBackdropFlex: {
    flex: 1,
  },
  playlistSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xl,
    maxHeight: width * 0.65,
  },
  playlistSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
  },
  playlistSheetHint: {
    fontSize: 13,
    color: '#666',
    marginTop: 6,
    marginBottom: 12,
  },
  playlistScroll: {
    maxHeight: width * 0.42,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  playlistCheck: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FF7F06',
    marginRight: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playlistCheckOn: {
    backgroundColor: '#FF7F06',
  },
  playlistRowName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  playlistRowMeta: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  playlistDoneBtn: {
    marginTop: SPACING.lg,
    backgroundColor: '#FF7F06',
    paddingVertical: 14,
    borderRadius: 24,
    alignItems: 'center',
  },
  playlistDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  playlistEmpty: {
    paddingVertical: 20,
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  playlistRetry: {
    color: '#FF7F06',
    fontSize: 15,
    paddingVertical: 16,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default VideoUploadSettings;
