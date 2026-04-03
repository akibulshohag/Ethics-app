import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { uploadPost, getSocialAccounts } from '../services/postService';

const defaultScheduledAt = () => {
  const t = new Date();
  t.setDate(t.getDate() + 1);
  t.setHours(9, 0, 0, 0);
  return t;
};

const mergeDatePart = (base, picked) => {
  const n = new Date(base);
  n.setFullYear(picked.getFullYear(), picked.getMonth(), picked.getDate());
  return n;
};

const mergeTimePart = (base, picked) => {
  const n = new Date(base);
  n.setHours(picked.getHours(), picked.getMinutes(), 0, 0);
  return n;
};

const startOfToday = () => {
  const x = new Date();
  x.setHours(0, 0, 0, 0);
  return x;
};

const formatScheduleDateLabel = d =>
  d.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

const formatScheduleTimeLabel = d =>
  d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const deviceTimeZoneName =
  typeof Intl !== 'undefined'
    ? Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    : '';

const CreatePostModal = ({ visible, onClose, onSuccess, userId }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [hashtagsInput, setHashtagsInput] = useState('');
  const [thumbnail, setThumbnail] = useState(null);
  const [video, setVideo] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [platforms, setPlatforms] = useState(['facebook']);
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [facebookAccountId, setFacebookAccountId] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => defaultScheduledAt());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const reset = () => {
    setTitle('');
    setDescription('');
    setWebsite('');
    setHashtagsInput('');
    setThumbnail(null);
    setVideo(null);
    setVideoDuration(0);
    setUploading(false);
    setUploadProgress(0);
    setPlatforms(['facebook']);
    setFacebookAccountId('');
    setScheduleEnabled(false);
    setScheduledAt(defaultScheduledAt());
    setShowDatePicker(false);
    setShowTimePicker(false);
  };

  useEffect(() => {
    let cancelled = false;
    if (!visible || !userId) return;
    (async () => {
      try {
        const rows = await getSocialAccounts(userId);
        if (cancelled) return;
        const list = Array.isArray(rows) ? rows : [];
        setSocialAccounts(list);
        const fb = list.find(
          r => String(r?.platform || '').toLowerCase() === 'facebook',
        );
        if (fb?.accountId) setFacebookAccountId(String(fb.accountId));
      } catch {
        if (!cancelled) setSocialAccounts([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [visible, userId]);

  useEffect(() => {
    if (visible) {
      setScheduledAt(defaultScheduledAt());
    }
  }, [visible]);

  const togglePlatform = key => {
    setPlatforms(prev =>
      prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key],
    );
  };

  const handleClose = () => {
    if (!uploading) {
      reset();
      onClose?.();
    }
  };

  const pickThumbnail = () => {
    launchImageLibrary(
      { mediaType: 'photo', quality: 0.8 },
      res => {
        if (res.didCancel) return;
        if (res.errorCode) {
          Alert.alert('Error', res.errorMessage || 'Failed to pick image');
          return;
        }
        const asset = res.assets?.[0];
        if (asset?.uri) {
          setThumbnail({
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || 'thumbnail.jpg',
          });
        }
      },
    );
  };

  const pickVideo = () => {
    launchImageLibrary(
      { mediaType: 'video', videoMaxDuration: 300, quality: 1 },
      res => {
        if (res.didCancel) return;
        if (res.errorCode) {
          Alert.alert('Error', res.errorMessage || 'Failed to pick video');
          return;
        }
        const asset = res.assets?.[0];
        if (asset?.uri) {
          const duration = asset.duration != null ? Math.round(Number(asset.duration)) : 0;
          setVideoDuration(duration);
          setVideo({
            uri: asset.uri,
            type: asset.type || 'video/mp4',
            name: asset.fileName || 'video.mp4',
          });
        }
      },
    );
  };

  const removeThumbnail = () => setThumbnail(null);
  const removeVideo = () => {
    setVideo(null);
    setVideoDuration(0);
  };

  const getHashtagsArray = () => {
    if (!hashtagsInput.trim()) return [];
    return hashtagsInput
      .split(/[\s,#]+/)
      .map(s => s.trim())
      .filter(Boolean);
  };

  const handleSubmit = async () => {
    if (!userId) {
      Alert.alert('Login required', 'Please log in to create a post.');
      return;
    }
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Title required', 'Please enter a title for your post.');
      return;
    }
    if (!thumbnail?.uri) {
      Alert.alert('Thumbnail required', 'Please add a thumbnail image.');
      return;
    }
    let scheduledPublishAt;
    if (scheduleEnabled) {
      const when = scheduledAt;
      if (when.getTime() <= Date.now() + 60_000) {
        Alert.alert('Schedule', 'Pick a time at least a few minutes from now.');
        return;
      }
      scheduledPublishAt = when.toISOString();
    }

    setUploading(true);
    setUploadProgress(0);
    try {
      await uploadPost({
        userId,
        title: trimmedTitle,
        description: description.trim() || undefined,
        website: website.trim() || undefined,
        hashtags: getHashtagsArray(),
        thumbnailUri: thumbnail.uri,
        thumbnailType: thumbnail.type,
        thumbnailName: thumbnail.name,
        videoUri: video?.uri,
        videoType: video?.type,
        videoName: video?.name,
        duration: video ? videoDuration : undefined,
        platforms,
        facebookAccountId: platforms.includes('facebook')
          ? facebookAccountId || undefined
          : undefined,
        scheduledPublishAt,
        onUploadProgress: setUploadProgress,
      });
      reset();
      onClose?.();
      onSuccess?.();
    } catch (err) {
      setUploading(false);
      Alert.alert('Upload failed', err?.message || 'Could not create post.');
    }
  };

  return (
    <>
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={40}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.modalBox}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Post</Text>
            <TouchableOpacity onPress={handleClose} disabled={uploading} hitSlop={12}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Thumbnail (required) */}
            <Text style={styles.label}>Thumbnail *</Text>
            <TouchableOpacity
              style={styles.mediaBox}
              onPress={pickThumbnail}
              disabled={uploading}
            >
              {thumbnail?.uri ? (
                <View style={styles.mediaPreview}>
                  <Image source={{ uri: thumbnail.uri }} style={styles.previewImage} />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={removeThumbnail}
                    disabled={uploading}
                  >
                    <MaterialCommunityIcons name="close-circle" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.placeholder}>
                  <MaterialCommunityIcons name="image-plus" size={48} color="#999" />
                  <Text style={styles.placeholderText}>Tap to add thumbnail</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Optional video */}
            <Text style={styles.label}>Video (optional)</Text>
            <TouchableOpacity
              style={styles.mediaBox}
              onPress={pickVideo}
              disabled={uploading}
            >
              {video?.uri ? (
                <View style={styles.mediaPreview}>
                  <View style={styles.videoPreviewPlaceholder}>
                    <MaterialCommunityIcons name="play-circle" size={48} color="rgba(255,255,255,0.9)" />
                    {videoDuration > 0 && (
                      <View style={[styles.durationBadge, styles.durationBadgeVideo]}>
                        <Text style={styles.durationText}>
                          {Math.floor(videoDuration / 60)}:{String(videoDuration % 60).padStart(2, '0')}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={removeVideo}
                    disabled={uploading}
                  >
                    <MaterialCommunityIcons name="close-circle" size={28} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.placeholder}>
                  <MaterialCommunityIcons name="video-plus" size={48} color="#999" />
                  <Text style={styles.placeholderText}>Tap to add video</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Post title"
              placeholderTextColor="#999"
              editable={!uploading}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your post..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={3}
              editable={!uploading}
            />

            <Text style={styles.label}>Website</Text>
            <TextInput
              style={styles.input}
              value={website}
              onChangeText={setWebsite}
              placeholder="https://..."
              placeholderTextColor="#999"
              keyboardType="url"
              autoCapitalize="none"
              editable={!uploading}
            />

            <Text style={styles.label}>Hashtags</Text>
            <TextInput
              style={styles.input}
              value={hashtagsInput}
              onChangeText={setHashtagsInput}
              placeholder="food, recipe, cooking (comma or space separated)"
              placeholderTextColor="#999"
              editable={!uploading}
            />

            <TouchableOpacity
              style={styles.scheduleToggleRow}
              onPress={() => {
                setScheduleEnabled(s => !s);
                setShowDatePicker(false);
                setShowTimePicker(false);
              }}
              disabled={uploading}
            >
              <MaterialCommunityIcons
                name={scheduleEnabled ? 'checkbox-marked' : 'checkbox-blank-outline'}
                size={22}
                color="#FF7F0B"
              />
              <Text style={styles.scheduleToggleText}>
                Schedule post (app + selected platforms at this time)
              </Text>
            </TouchableOpacity>
            {scheduleEnabled ? (
              <View style={styles.scheduleFields}>
                <Text style={styles.scheduleHint}>
                  {`Uses your phone's local date and time${
                    deviceTimeZoneName ? ` (${deviceTimeZoneName})` : ''
                  }. Pick e.g. 3:00 AM and Facebook posts when it is 3:00 AM in that zone — set region to Bangladesh (Asia/Dhaka) in phone settings if you want Bangladesh time.`}
                </Text>
                <Text style={styles.scheduleHintSecondary}>
                  Turn schedule off to post everywhere immediately.
                </Text>
                <Text style={styles.label}>Date</Text>
                <TouchableOpacity
                  style={styles.pickerRow}
                  onPress={() => {
                    setShowTimePicker(false);
                    setShowDatePicker(true);
                  }}
                  disabled={uploading}
                >
                  <MaterialCommunityIcons name="calendar" size={22} color="#FF7F0B" />
                  <Text style={styles.pickerRowText}>{formatScheduleDateLabel(scheduledAt)}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={22} color="#999" />
                </TouchableOpacity>
                <Text style={styles.label}>Time</Text>
                <TouchableOpacity
                  style={styles.pickerRow}
                  onPress={() => {
                    setShowDatePicker(false);
                    setShowTimePicker(true);
                  }}
                  disabled={uploading}
                >
                  <MaterialCommunityIcons name="clock-outline" size={22} color="#FF7F0B" />
                  <Text style={styles.pickerRowText}>{formatScheduleTimeLabel(scheduledAt)}</Text>
                  <MaterialCommunityIcons name="chevron-right" size={22} color="#999" />
                </TouchableOpacity>
              </View>
            ) : null}

            <Text style={styles.label}>Auto-post platforms</Text>
            <View style={styles.platformRow}>
              {['facebook', 'instagram', 'tiktok', 'linkedin'].map(p => {
                const active = platforms.includes(p);
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.platformChip, active && styles.platformChipActive]}
                    onPress={() => togglePlatform(p)}
                    disabled={uploading}
                  >
                    <Text
                      style={[
                        styles.platformChipText,
                        active && styles.platformChipTextActive,
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {platforms.includes('facebook') ? (
              <>
                <Text style={styles.label}>Facebook Page</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={{ marginBottom: 8 }}
                  keyboardShouldPersistTaps="handled"
                >
                  {(socialAccounts || [])
                    .filter(a => String(a?.platform || '').toLowerCase() === 'facebook')
                    .map(a => {
                      const id = String(a?.accountId || '');
                      const active = facebookAccountId === id;
                      return (
                        <TouchableOpacity
                          key={a.id || id}
                          style={[styles.pageChip, active && styles.pageChipActive]}
                          onPress={() => setFacebookAccountId(id)}
                        >
                          <Text
                            style={[
                              styles.pageChipText,
                              active && styles.pageChipTextActive,
                            ]}
                            numberOfLines={1}
                          >
                            {a?.accountName || id}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                </ScrollView>
              </>
            ) : null}
          </ScrollView>

          {uploading && (
            <View style={styles.progressWrap}>
              <ActivityIndicator size="small" color="#FF7F0B" />
              <Text style={styles.progressText}>
                Uploading... {uploadProgress > 0 ? `${uploadProgress}%` : ''}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.submitBtn, uploading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={uploading}
          >
            <Text style={styles.submitBtnText}>
              {uploading
                ? 'Uploading...'
                : scheduleEnabled
                  ? 'Schedule'
                  : 'Post'}
            </Text>
          </TouchableOpacity>

          {Platform.OS === 'android' && showDatePicker ? (
            <DateTimePicker
              value={scheduledAt}
              mode="date"
              display="default"
              minimumDate={startOfToday()}
              onChange={(_event, date) => {
                setShowDatePicker(false);
                if (date) setScheduledAt(s => mergeDatePart(s, date));
              }}
            />
          ) : null}
          {Platform.OS === 'android' && showTimePicker ? (
            <DateTimePicker
              value={scheduledAt}
              mode="time"
              display="default"
              is24Hour
              onChange={(_event, date) => {
                setShowTimePicker(false);
                if (date) setScheduledAt(s => mergeTimePart(s, date));
              }}
            />
          ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>

    {Platform.OS === 'ios' ? (
      <Modal
        visible={showDatePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDatePicker(false)}
      >
        <View style={styles.pickerBackdrop}>
          <TouchableOpacity
            style={styles.pickerBackdropTouchable}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          />
          <View style={styles.pickerSheet}>
            <DateTimePicker
              value={scheduledAt}
              mode="date"
              display="spinner"
              themeVariant="light"
              minimumDate={startOfToday()}
              onChange={(_, date) => {
                if (date) setScheduledAt(s => mergeDatePart(s, date));
              }}
            />
            <TouchableOpacity
              style={styles.pickerDoneBtn}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    ) : null}

    {Platform.OS === 'ios' ? (
      <Modal
        visible={showTimePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTimePicker(false)}
      >
        <View style={styles.pickerBackdrop}>
          <TouchableOpacity
            style={styles.pickerBackdropTouchable}
            activeOpacity={1}
            onPress={() => setShowTimePicker(false)}
          />
          <View style={styles.pickerSheet}>
            <DateTimePicker
              value={scheduledAt}
              mode="time"
              display="spinner"
              themeVariant="light"
              is24Hour
              onChange={(_, date) => {
                if (date) setScheduledAt(s => mergeTimePart(s, date));
              }}
            />
            <TouchableOpacity
              style={styles.pickerDoneBtn}
              onPress={() => setShowTimePicker(false)}
            >
              <Text style={styles.pickerDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    ) : null}
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  scroll: {
    maxHeight: 400,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  scheduleToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
    paddingVertical: 4,
  },
  scheduleToggleText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  scheduleFields: {
    marginBottom: 4,
  },
  scheduleHint: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 6,
    lineHeight: 17,
  },
  scheduleHintSecondary: {
    fontSize: 11,
    color: '#9CA3AF',
    marginBottom: 8,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#fafafa',
  },
  pickerRowText: {
    flex: 1,
    fontSize: 16,
    color: '#111',
    fontWeight: '500',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  pickerBackdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  pickerSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    alignItems: 'center',
  },
  pickerDoneBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#eee',
  },
  pickerDoneText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FF7F0B',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  mediaBox: {
    height: 120,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    overflow: 'hidden',
    backgroundColor: '#f8f8f8',
  },
  mediaPreview: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 14,
  },
  durationBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationBadgeVideo: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  videoPreviewPlaceholder: {
    flex: 1,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    marginTop: 6,
    fontSize: 13,
    color: '#999',
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  progressText: {
    fontSize: 13,
    color: '#666',
  },
  submitBtn: {
    marginHorizontal: 16,
    marginTop: 8,
    backgroundColor: '#FF7F0B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  platformRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 6,
  },
  platformChip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: '#fff',
  },
  platformChipActive: {
    borderColor: '#FF7F0B',
    backgroundColor: '#FF7F0B',
  },
  platformChipText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  platformChipTextActive: {
    color: '#fff',
  },
  pageChip: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    maxWidth: 190,
  },
  pageChipActive: {
    borderColor: '#FF7F0B',
    backgroundColor: '#FFF3E8',
  },
  pageChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
  },
  pageChipTextActive: {
    color: '#E26A00',
  },
});

export default CreatePostModal;
