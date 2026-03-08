import React, { useState } from 'react';
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
import { launchImageLibrary } from 'react-native-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { uploadPost } from '../services/postService';

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
              {uploading ? 'Uploading...' : 'Post'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
});

export default CreatePostModal;
