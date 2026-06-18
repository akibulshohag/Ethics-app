import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  TextInput,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const DEFAULT_THUMBNAIL =
  'https://images.unsplash.com/photo-1611162616475-46b635cb6868?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80';
import { launchImageLibrary } from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import SetVisibilityModal from './SetVisibilityModal';
import SelectAudienceModal from './SelectAudienceModal';
import CommentsSettingsModal from './CommentsSettingsModal';
import VideoScheduleModal from './VideoScheduleModal';
import VideoCoverPickerModal from './VideoCoverPickerModal';
import VideoCoverSuggestionsRow from './VideoCoverSuggestionsRow';
import { shortsService } from '../services/shortsService';
import { frameToThumbnailAsset, thumbnailFromVideoFrame } from '../utils/videoThumbnail';

const AddDetailsModal = ({
  visible,
  onClose,
  shortsMetadata = {},
  isLive = false,
  onVideoPicked,
  /** Called after OK on successful upload — e.g. navigate to HomeOneScreen */
  onUploadSuccess,
}) => {
  const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
  const [visibility, setVisibility] = useState('Public');
  const [audienceModalVisible, setAudienceModalVisible] = useState(false);
  const [audience, setAudience] = useState({
    madeForKids: null,
    ageRestricted: null,
  });
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);
  const [comments, setComments] = useState('Allow all comments');
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [scheduledPublishDate, setScheduledPublishDate] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const [localVideo, setLocalVideo] = useState(null);
  const [localThumb, setLocalThumb] = useState(null);
  const [coverPickerVisible, setCoverPickerVisible] = useState(false);

  const resetFormState = React.useCallback(() => {
    setVisibilityModalVisible(false);
    setVisibility('Public');
    setAudienceModalVisible(false);
    setAudience({ madeForKids: null, ageRestricted: null });
    setCommentsModalVisible(false);
    setComments('Allow all comments');
    setScheduleModalVisible(false);
    setScheduledPublishDate(null);
    setCaption('');
    setUploading(false);
    setLocalVideo(null);
    setLocalThumb(null);
    setCoverPickerVisible(false);
  }, []);

  useEffect(() => {
    if (visible && shortsMetadata?.commentsSetting) {
      setComments(shortsMetadata.commentsSetting);
    }
  }, [visible, shortsMetadata?.commentsSetting]);

  const videoUri = shortsMetadata?.videoUri || localVideo?.uri;
  const videoMeta = localVideo || shortsMetadata;
  const videoDurationSec =
    videoMeta?.duration ??
    videoMeta?.durationSec ??
    shortsMetadata?.durationSec;
  const activeThumbUri =
    localThumb?.uri || shortsMetadata?.thumbnailUri || null;

  const applyCoverFrame = frame => {
    const asset = frameToThumbnailAsset(frame);
    if (asset) setLocalThumb(asset);
  };

  const pickVideoInModal = () => {
    launchImageLibrary({ mediaType: 'video', videoMaxDuration: 180 }, res => {
      if (res.didCancel) return;
      const asset = res.assets?.[0];
      if (asset?.uri) {
        const nextVideo = {
          uri: asset.uri,
          type: asset.type || 'video/mp4',
          name: asset.fileName || 'short.mp4',
          duration:
            asset.duration != null ? Math.max(0, Number(asset.duration)) : undefined,
        };
        setLocalVideo(nextVideo);
        setLocalThumb(null);
        if (onVideoPicked) onVideoPicked(asset);
        thumbnailFromVideoFrame(asset.uri).then(thumb => {
          if (thumb) setLocalThumb(thumb);
        });
      }
    });
  };

  const pickThumbnailInModal = () => {
    launchImageLibrary({ mediaType: 'photo' }, res => {
      if (res.didCancel) return;
      const asset = res.assets?.[0];
      if (asset?.uri) {
        setLocalThumb({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || 'thumb.jpg',
        });
      }
    });
  };

  const pickCoverFromVideoInModal = () => {
    if (!videoUri) {
      Alert.alert('Select video first', 'Please select a video before choosing cover.');
      return;
    }
    setCoverPickerVisible(true);
  };

  const mapToVisibility = v => {
    if (v === 'Public') return 'public';
    if (v === 'Private') return 'private';

    return 'public';
  };

  const mapToCommentSetting = c => {
    if (c?.includes('all')) return 'allow';
    if (c?.includes('hold')) return 'hold';
    if (c?.includes('Disable')) return 'disable';
    return 'allow';
  };

  const scheduleDisplay = (() => {
    if (!(scheduledPublishDate instanceof Date)) return 'Now';
    const ms = scheduledPublishDate.getTime();
    if (!Number.isFinite(ms) || ms <= Date.now() + 60_000) return 'Now';
    return scheduledPublishDate.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  })();

  const handleUploadShorts = async () => {
    if (!shortsMetadata?.userId) {
      Alert.alert('Error', 'Please sign in to upload shorts');
      return;
    }
    if (!videoUri) {
      Alert.alert('Error', 'Please record or select a video first');
      return;
    }
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('files', {
        uri: videoUri,
        type: videoMeta.videoType || videoMeta.type || 'video/mp4',
        name: videoMeta.videoName || videoMeta.name || 'short.mp4',
      });
      const thumbUri = shortsMetadata.thumbnailUri || localThumb?.uri;
      if (thumbUri) {
        formData.append('files', {
          uri: thumbUri,
          type:
            shortsMetadata.thumbnailType || localThumb?.type || 'image/jpeg',
          name: shortsMetadata.thumbnailName || localThumb?.name || 'thumb.jpg',
        });
      }
      formData.append('userId', shortsMetadata.userId);
      formData.append('title', caption || 'Untitled Short');
      formData.append('description', caption || '');
      formData.append(
        'durationLimit',
        isLive ? '10s' : shortsMetadata.activeDuration || '60',
      );
      formData.append('visibility', mapToVisibility(visibility));
      formData.append('commentSetting', mapToCommentSetting(comments));
      if (audience?.madeForKids != null) {
        formData.append('madeForKids', String(Boolean(audience.madeForKids)));
      }
      if (audience?.ageRestricted != null) {
        formData.append(
          'ageRestricted',
          String(Boolean(audience.ageRestricted)),
        );
      }
      if (
        scheduledPublishDate instanceof Date &&
        scheduledPublishDate.getTime() > Date.now() + 60_000
      ) {
        formData.append(
          'scheduledPublishAt',
          scheduledPublishDate.toISOString(),
        );
      }
      if (shortsMetadata.selectedFilter?.id) {
        formData.append('filterId', shortsMetadata.selectedFilter.id);
        formData.append('filterName', shortsMetadata.selectedFilter.name);
      }
      if (shortsMetadata.selectedSound) {
        if (shortsMetadata.selectedSound.id) {
          formData.append('soundId', shortsMetadata.selectedSound.id);
        }
        formData.append('soundTitle', shortsMetadata.selectedSound.title || '');
        formData.append(
          'soundArtist',
          shortsMetadata.selectedSound.artist || '',
        );
        const selectedSoundUrl = String(
          shortsMetadata.selectedSound.soundUrl ||
            shortsMetadata.selectedSound.previewUrl ||
            shortsMetadata.selectedSound.url ||
            '',
        ).trim();
        if (selectedSoundUrl) {
          formData.append('soundUrl', selectedSoundUrl);
        }
      }
      if (shortsMetadata.beautyLevel) {
        formData.append('beautyLevel', String(shortsMetadata.beautyLevel));
      }
      if (shortsMetadata.selectedTimer) {
        formData.append('timerSeconds', String(shortsMetadata.selectedTimer));
      }
      if (shortsMetadata.speedFactor) {
        formData.append('speedFactor', String(shortsMetadata.speedFactor));
      }
      if (shortsMetadata.cameraFacing) {
        formData.append('cameraFacing', shortsMetadata.cameraFacing);
      }
      if (isLive) {
        formData.append('isLive', 'true');
      }
      await shortsService.uploadShort(formData, shortsMetadata.userId);
      resetFormState();
      Alert.alert('Success', 'Short uploaded successfully', [
        {
          text: 'OK',
          onPress: () => {
            onClose?.();
            onUploadSuccess?.();
          },
        },
      ]);
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        e?.message ||
        'Failed to upload short';
      const isNetwork =
        e?.message === 'Network Error' || e?.code === 'ERR_NETWORK';
      const hint = isNetwork
        ? '\n\nEnsure:\n1. Backend is running: cd ethics-backend && npm run start:dev\n2. Port 3000 is correct\n3. For physical device: set LOCAL_OVERRIDE in config.js to your computer IP (e.g. http://192.168.1.x:3000/v1)'
        : '';
      Alert.alert('Upload Failed', msg + hint);
    } finally {
      setUploading(false);
    }
  };
  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="white" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Details</Text>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons
              name="ellipsis-horizontal-circle-outline"
              size={24}
              color="black"
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.topSection}>
            <TouchableOpacity
              style={styles.coverContainer}
              onPress={pickCoverFromVideoInModal}
            >
              <Image
                source={{
                  uri: activeThumbUri || DEFAULT_THUMBNAIL,
                }}
                style={styles.coverImage}
                resizeMode="cover"
              />
              <View style={styles.selectCoverOverlay}>
                <Text style={styles.selectCoverText}>Select Cover From Video</Text>
              </View>
            </TouchableOpacity>
            <View style={styles.captionContainer}>
              <TextInput
                placeholder="Caption your shorts..."
                placeholderTextColor="#999"
                multiline
                style={styles.captionInput}
                textAlignVertical="top"
                value={caption}
                onChangeText={setCaption}
              />
            </View>
          </View>

          {videoUri ? (
            <VideoCoverSuggestionsRow
              videoUri={videoUri}
              durationSec={videoDurationSec}
              selectedUri={activeThumbUri}
              onSelect={applyCoverFrame}
              onPressSeeAll={pickCoverFromVideoInModal}
            />
          ) : null}

          {!videoUri && (
            <TouchableOpacity
              style={styles.selectVideoBtn}
              onPress={pickVideoInModal}
            >
              <Ionicons name="videocam-outline" size={24} color="#FF8C00" />
              <Text style={styles.selectVideoText}>Select Video</Text>
            </TouchableOpacity>
          )}
          {videoUri && (
            <View style={styles.videoSelectedRow}>
              <Ionicons name="checkmark-circle" size={20} color="#12B76A" />
              <Text style={styles.videoSelectedText}>Video selected</Text>
            </View>
          )}
          {videoUri && (
            <TouchableOpacity
              style={styles.selectVideoBtn}
              onPress={pickCoverFromVideoInModal}
            >
              <Ionicons name="images-outline" size={22} color="#FF8C00" />
              <Text style={styles.selectVideoText}>Choose cover from this video</Text>
            </TouchableOpacity>
          )}
          {videoUri && (
            <TouchableOpacity
              style={styles.selectFromGalleryBtn}
              onPress={pickThumbnailInModal}
            >
              <Text style={styles.selectFromGalleryText}>
                Or pick cover photo from gallery
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.divider} />

          <View style={styles.optionsList}>
            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setVisibilityModalVisible(true)}
            >
              <View style={styles.optionLeft}>
                <Ionicons
                  name="eye-outline"
                  size={24}
                  color="#333"
                  style={styles.optionIcon}
                />
                <Text style={styles.optionLabel}>Visibility</Text>
              </View>
              <View style={styles.optionRight}>
                <Text style={styles.optionValue}>{visibility}</Text>
                <Ionicons name="chevron-forward" size={20} color="#333" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setAudienceModalVisible(true)}
            >
              <View style={styles.optionLeft}>
                <Ionicons
                  name="people-outline"
                  size={24}
                  color="#333"
                  style={styles.optionIcon}
                />
                <Text style={styles.optionLabel}>Select Audience</Text>
              </View>
              <View style={styles.optionRight}>
                <Ionicons name="chevron-forward" size={20} color="#333" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setScheduleModalVisible(true)}
            >
              <View style={styles.optionLeft}>
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color="#333"
                  style={styles.optionIcon}
                />
                <Text style={styles.optionLabel}>Schedule</Text>
              </View>
              <View style={styles.optionRight}>
                <Text style={styles.optionValue}>{scheduleDisplay}</Text>
                <Ionicons name="chevron-forward" size={20} color="#333" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionItem}
              onPress={() => setCommentsModalVisible(true)}
            >
              <View style={styles.optionLeft}>
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={24}
                  color="#333"
                  style={styles.optionIcon}
                />
                <Text style={styles.optionLabel}>Comments</Text>
              </View>
              <View style={styles.optionRight}>
                <Text
                  style={[styles.optionValue, { maxWidth: 150 }]}
                  numberOfLines={1}
                >
                  {comments}
                </Text>
                <Ionicons name="chevron-forward" size={20} color="#333" />
              </View>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Footer */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.uploadButton,
              uploading && styles.uploadButtonDisabled,
            ]}
            onPress={() => handleUploadShorts()}
            disabled={uploading}
            activeOpacity={0.7}
          >
            {uploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.uploadButtonText}>Upload Video</Text>
            )}
          </TouchableOpacity>
        </View>

        <SetVisibilityModal
          visible={visibilityModalVisible}
          onClose={() => setVisibilityModalVisible(false)}
          initialValue={visibility}
          onApply={val => setVisibility(val)}
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
          videoUri={videoUri}
          durationSec={videoDurationSec}
          onSelect={applyCoverFrame}
          title="Select short cover"
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: 'black',
  },
  headerButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  topSection: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  coverContainer: {
    width: 100,
    height: 150,
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  selectVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE0C0',
  },
  selectVideoText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF8C00',
    marginLeft: 8,
  },
  selectFromGalleryBtn: {
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 6,
  },
  selectFromGalleryText: {
    fontSize: 13,
    color: '#666',
    textDecorationLine: 'underline',
  },
  videoSelectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 4,
  },
  videoSelectedText: {
    fontSize: 14,
    color: '#12B76A',
    marginLeft: 6,
  },
  selectCoverOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingVertical: 4,
    alignItems: 'center',
  },
  selectCoverText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '500',
  },
  captionContainer: {
    flex: 1,
    marginLeft: 16,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 12,
  },
  captionInput: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginHorizontal: 16,
    marginVertical: 8,
  },
  optionsList: {
    paddingHorizontal: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIcon: {
    marginRight: 12,
  },
  optionLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  optionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionValue: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  uploadButton: {
    backgroundColor: '#FF8C00',
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
});

export default AddDetailsModal;
