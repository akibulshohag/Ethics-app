import React, { useEffect, useRef, useState } from 'react';
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
  Animated,
  Easing,
  LayoutAnimation,
  UIManager,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import { launchImageLibrary } from 'react-native-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { uploadPost, getSocialAccounts } from '../services/postService';
import {
  COLORS,
  ORANGE_GRADIENT_CTA,
  ORANGE_GRADIENT_HEADER,
} from '../constants/theme';

if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

const formatInstagramChipLabel = a => {
  const name = a?.accountName != null ? String(a.accountName).trim() : '';
  if (name) return name.startsWith('@') ? name : `@${name}`;
  const id = String(a?.accountId || '');
  return id.length > 14 ? `${id.slice(0, 12)}…` : id || 'Instagram';
};

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
  const [platforms, setPlatforms] = useState([
    'facebook',
    'instagram',
    'tiktok',
  ]);
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [facebookAccountId, setFacebookAccountId] = useState('');
  const [instagramAccountId, setInstagramAccountId] = useState('');
  const [tiktokAccountId, setTiktokAccountId] = useState('');
  const [youtubeChannelId, setYoutubeChannelId] = useState('');
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState(() => defaultScheduledAt());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const sheetTranslateY = useRef(new Animated.Value(56)).current;
  const sheetOpacity = useRef(new Animated.Value(0)).current;
  const headerTitleOpacity = useRef(new Animated.Value(0)).current;
  const closingRef = useRef(false);

  useEffect(() => {
    if (!visible) {
      backdropOpacity.setValue(0);
      sheetTranslateY.setValue(56);
      sheetOpacity.setValue(0);
      headerTitleOpacity.setValue(0);
      closingRef.current = false;
      return;
    }
    backdropOpacity.setValue(0);
    sheetTranslateY.setValue(56);
    sheetOpacity.setValue(0);
    headerTitleOpacity.setValue(0);
    const id = requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: 340,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(sheetTranslateY, {
          toValue: 0,
          tension: 72,
          friction: 13,
          useNativeDriver: true,
        }),
        Animated.timing(sheetOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(headerTitleOpacity, {
          toValue: 1,
          duration: 480,
          delay: 70,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
    return () => cancelAnimationFrame(id);
  }, [
    visible,
    backdropOpacity,
    sheetTranslateY,
    sheetOpacity,
    headerTitleOpacity,
  ]);

  const runCloseAnimation = onDone => {
    if (closingRef.current) return;
    closingRef.current = true;
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 260,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetTranslateY, {
        toValue: 80,
        duration: 280,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(sheetOpacity, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      closingRef.current = false;
      if (finished) onDone?.();
    });
  };

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
    setPlatforms(['facebook', 'instagram', 'tiktok']);
    setFacebookAccountId('');
    setInstagramAccountId('');
    setTiktokAccountId('');
    setYoutubeChannelId('');
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
        const ig = list.find(
          r => String(r?.platform || '').toLowerCase() === 'instagram',
        );
        if (ig?.accountId) setInstagramAccountId(String(ig.accountId));
        const tt = list.find(
          r => String(r?.platform || '').toLowerCase() === 'tiktok',
        );
        if (tt?.accountId) setTiktokAccountId(String(tt.accountId));
        const yt = list.find(
          r => String(r?.platform || '').toLowerCase() === 'youtube',
        );
        if (yt?.accountId) setYoutubeChannelId(String(yt.accountId));
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
    LayoutAnimation.configureNext(
      LayoutAnimation.create(
        220,
        LayoutAnimation.Types.easeInEaseOut,
        LayoutAnimation.Properties.opacity,
      ),
    );
    setPlatforms(prev =>
      prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key],
    );
  };

  const handleClose = () => {
    if (uploading) return;
    runCloseAnimation(() => {
      reset();
      onClose?.();
    });
  };

  const pickThumbnail = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, res => {
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
    });
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
          const duration =
            asset.duration != null ? Math.round(Number(asset.duration)) : 0;
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
    let instagramAccountIdToSend;
    if (platforms.includes('instagram')) {
      const igRows = (socialAccounts || []).filter(
        r => String(r?.platform || '').toLowerCase() === 'instagram',
      );
      if (igRows.length === 0) {
        Alert.alert(
          'Instagram',
          'No Instagram Business account connected. Open Edit Profile → Verify Facebook / Check Instagram link.',
        );
        return;
      }
      instagramAccountIdToSend =
        instagramAccountId ||
        (igRows.length === 1 ? String(igRows[0].accountId || '') : '');
      if (!instagramAccountIdToSend) {
        Alert.alert('Instagram', 'Select which Instagram account to post to.');
        return;
      }
    }
    let youtubeChannelIdToSend;
    if (platforms.includes('youtube')) {
      if (!video?.uri) {
        Alert.alert(
          'YouTube',
          'YouTube auto-post needs a video (add a video file, not image only).',
        );
        return;
      }
      const ytRows = (socialAccounts || []).filter(
        r => String(r?.platform || '').toLowerCase() === 'youtube',
      );
      if (ytRows.length === 0) {
        Alert.alert(
          'YouTube',
          'No YouTube channel connected. Open Edit Profile → Verify YouTube.',
        );
        return;
      }
      youtubeChannelIdToSend =
        youtubeChannelId ||
        (ytRows.length === 1 ? String(ytRows[0].accountId || '') : '');
      if (!youtubeChannelIdToSend) {
        Alert.alert('YouTube', 'Select which channel to upload to.');
        return;
      }
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
        instagramAccountId: platforms.includes('instagram')
          ? instagramAccountIdToSend
          : undefined,
        tiktokAccountId: platforms.includes('tiktok')
          ? tiktokAccountId || undefined
          : undefined,
        youtubeChannelId: platforms.includes('youtube')
          ? youtubeChannelIdToSend
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
        animationType="none"
        transparent
        onRequestClose={handleClose}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={40}
        >
          <Animated.View
            style={[
              styles.backdrop,
              {
                opacity: backdropOpacity.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 0.55],
                }),
              },
            ]}
          >
            <TouchableOpacity
              style={StyleSheet.absoluteFillObject}
              activeOpacity={1}
              onPress={handleClose}
              disabled={uploading}
            />
          </Animated.View>
          <Animated.View
            style={[
              styles.modalBox,
              {
                opacity: sheetOpacity,
                transform: [{ translateY: sheetTranslateY }],
              },
            ]}
          >
            <View style={styles.sheetHandleWrap}>
              <View style={styles.sheetHandle} />
            </View>
            <View style={styles.header}>
              <Animated.View
                style={[
                  styles.headerTitleWrap,
                  { opacity: headerTitleOpacity },
                ]}
              >
                <Text style={styles.title}>Create post</Text>
                <Text style={styles.titleSubtitle}>
                  Compose once, publish everywhere
                </Text>
              </Animated.View>
              <TouchableOpacity
                onPress={handleClose}
                disabled={uploading}
                hitSlop={12}
                style={styles.closeBtn}
              >
                <MaterialCommunityIcons
                  name="close"
                  size={22}
                  color={COLORS.primaryOrangeDark}
                />
              </TouchableOpacity>
            </View>
            <LinearGradient
              colors={ORANGE_GRADIENT_HEADER}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={styles.headerAccent}
            />

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={styles.scrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.sectionCard}>
                {/* Thumbnail (required) */}
                <Text style={[styles.label, styles.labelFirst]}>
                  Thumbnail *
                </Text>
                <TouchableOpacity
                  style={[
                    styles.mediaBox,
                    thumbnail?.uri ? styles.mediaBoxFilled : null,
                  ]}
                  onPress={pickThumbnail}
                  disabled={uploading}
                >
                  {thumbnail?.uri ? (
                    <View style={styles.mediaPreview}>
                      <Image
                        source={{ uri: thumbnail.uri }}
                        style={styles.previewImage}
                      />
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={removeThumbnail}
                        disabled={uploading}
                      >
                        <MaterialCommunityIcons
                          name="close-circle"
                          size={28}
                          color="#fff"
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.placeholder}>
                      <MaterialCommunityIcons
                        name="image-plus"
                        size={48}
                        color={COLORS.primaryOrange}
                        style={styles.placeholderIcon}
                      />
                      <Text style={styles.placeholderText}>
                        Tap to add thumbnail
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Optional video */}
                <Text style={styles.label}>Video (optional)</Text>
                <TouchableOpacity
                  style={[
                    styles.mediaBox,
                    video?.uri ? styles.mediaBoxFilled : null,
                  ]}
                  onPress={pickVideo}
                  disabled={uploading}
                >
                  {video?.uri ? (
                    <View style={styles.mediaPreview}>
                      <View style={styles.videoPreviewPlaceholder}>
                        <MaterialCommunityIcons
                          name="play-circle"
                          size={48}
                          color="rgba(255,255,255,0.9)"
                        />
                        {videoDuration > 0 && (
                          <View
                            style={[
                              styles.durationBadge,
                              styles.durationBadgeVideo,
                            ]}
                          >
                            <Text style={styles.durationText}>
                              {Math.floor(videoDuration / 60)}:
                              {String(videoDuration % 60).padStart(2, '0')}
                            </Text>
                          </View>
                        )}
                      </View>
                      <TouchableOpacity
                        style={styles.removeBtn}
                        onPress={removeVideo}
                        disabled={uploading}
                      >
                        <MaterialCommunityIcons
                          name="close-circle"
                          size={28}
                          color="#fff"
                        />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.placeholder}>
                      <MaterialCommunityIcons
                        name="video-plus"
                        size={48}
                        color={COLORS.primaryOrange}
                        style={styles.placeholderIcon}
                      />
                      <Text style={styles.placeholderText}>
                        Tap to add video
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.sectionCard}>
                <Text style={[styles.label, styles.labelFirst]}>Title *</Text>
                <TextInput
                  style={styles.input}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="Post title"
                  placeholderTextColor="#A8A29E"
                  editable={!uploading}
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={description}
                  onChangeText={setDescription}
                  placeholder="Describe your post..."
                  placeholderTextColor="#A8A29E"
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
                  placeholderTextColor="#A8A29E"
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
                  placeholderTextColor="#A8A29E"
                  editable={!uploading}
                />
              </View>

              <View style={styles.sectionCard}>
                <TouchableOpacity
                  style={styles.scheduleToggleRow}
                  onPress={() => {
                    LayoutAnimation.configureNext(
                      LayoutAnimation.create(
                        280,
                        LayoutAnimation.Types.easeInEaseOut,
                        LayoutAnimation.Properties.opacity,
                      ),
                    );
                    setScheduleEnabled(s => !s);
                    setShowDatePicker(false);
                    setShowTimePicker(false);
                  }}
                  disabled={uploading}
                  activeOpacity={0.75}
                >
                  <MaterialCommunityIcons
                    name={
                      scheduleEnabled
                        ? 'checkbox-marked-circle'
                        : 'checkbox-blank-circle-outline'
                    }
                    size={24}
                    color={
                      scheduleEnabled
                        ? COLORS.primaryOrange
                        : COLORS.gray500
                    }
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
                      <MaterialCommunityIcons
                        name="calendar"
                        size={22}
                        color={COLORS.primaryOrange}
                      />
                      <Text style={styles.pickerRowText}>
                        {formatScheduleDateLabel(scheduledAt)}
                      </Text>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={22}
                        color={COLORS.gray500}
                      />
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
                      <MaterialCommunityIcons
                        name="clock-outline"
                        size={22}
                        color={COLORS.primaryOrange}
                      />
                      <Text style={styles.pickerRowText}>
                        {formatScheduleTimeLabel(scheduledAt)}
                      </Text>
                      <MaterialCommunityIcons
                        name="chevron-right"
                        size={22}
                        color={COLORS.gray500}
                      />
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>

              <View style={styles.sectionCard}>
                <Text style={[styles.label, styles.labelFirst]}>
                  Auto-post platforms
                </Text>
                <View style={styles.platformRow}>
                  {['facebook', 'instagram', 'tiktok', 'youtube'].map(p => {
                    const active = platforms.includes(p);
                    return (
                      <TouchableOpacity
                        key={p}
                        style={[
                          styles.platformChip,
                          active && styles.platformChipActive,
                        ]}
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
                      style={styles.accountScroll}
                      keyboardShouldPersistTaps="handled"
                    >
                      {(socialAccounts || [])
                        .filter(
                          a =>
                            String(a?.platform || '').toLowerCase() ===
                            'facebook',
                        )
                        .map(a => {
                          const id = String(a?.accountId || '');
                          const active = facebookAccountId === id;
                          return (
                            <TouchableOpacity
                              key={a.id || id}
                              style={[
                                styles.pageChip,
                                active && styles.pageChipActive,
                              ]}
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
                {platforms.includes('instagram') ? (
                  <>
                    <Text style={styles.label}>Instagram account</Text>
                    <Text style={styles.scheduleHintSecondary}>
                      Same profiles as Edit Profile (linked to your Facebook
                      Page). Pick which @ to post to.
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.accountScroll}
                      keyboardShouldPersistTaps="handled"
                    >
                      {(socialAccounts || [])
                        .filter(
                          a =>
                            String(a?.platform || '').toLowerCase() ===
                            'instagram',
                        )
                        .map(a => {
                          const id = String(a?.accountId || '');
                          const active = instagramAccountId === id;
                          return (
                            <TouchableOpacity
                              key={a.id || id}
                              style={[
                                styles.pageChip,
                                active && styles.pageChipActive,
                              ]}
                              onPress={() => setInstagramAccountId(id)}
                            >
                              <Text
                                style={[
                                  styles.pageChipText,
                                  active && styles.pageChipTextActive,
                                ]}
                                numberOfLines={1}
                              >
                                {formatInstagramChipLabel(a)}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                    </ScrollView>
                  </>
                ) : null}
                {platforms.includes('tiktok') ? (
                  <>
                    <Text style={styles.label}>TikTok account</Text>
                    <Text style={styles.scheduleHintSecondary}>
                      Video posts only (public .mp4 URL). Connect TikTok with
                      Content Posting (video.publish); verify your video URL
                      domain in TikTok Developer Portal.
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.accountScroll}
                      keyboardShouldPersistTaps="handled"
                    >
                      {(socialAccounts || [])
                        .filter(
                          a =>
                            String(a?.platform || '').toLowerCase() ===
                            'tiktok',
                        )
                        .map(a => {
                          const id = String(a?.accountId || '');
                          const active = tiktokAccountId === id;
                          return (
                            <TouchableOpacity
                              key={a.id || id}
                              style={[
                                styles.pageChip,
                                active && styles.pageChipActive,
                              ]}
                              onPress={() => setTiktokAccountId(id)}
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
                {platforms.includes('youtube') ? (
                  <>
                    <Text style={styles.label}>YouTube channel</Text>
                    <Text style={styles.scheduleHintSecondary}>
                      Video posts only. Connect your channel under Edit Profile →
                      Verify YouTube. Upload uses your public video URL at schedule
                      time.
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.accountScroll}
                      keyboardShouldPersistTaps="handled"
                    >
                      {(socialAccounts || [])
                        .filter(
                          a =>
                            String(a?.platform || '').toLowerCase() ===
                            'youtube',
                        )
                        .map(a => {
                          const id = String(a?.accountId || '');
                          const active = youtubeChannelId === id;
                          return (
                            <TouchableOpacity
                              key={a.id || id}
                              style={[
                                styles.pageChip,
                                active && styles.pageChipActive,
                              ]}
                              onPress={() => setYoutubeChannelId(id)}
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
              </View>
            </ScrollView>

            {uploading && (
              <View style={styles.progressWrap}>
                <View style={styles.progressTrack}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${Math.min(100, Math.max(0, uploadProgress))}%`,
                      },
                    ]}
                  />
                </View>
                <View style={styles.progressRow}>
                  <ActivityIndicator size="small" color={COLORS.primaryOrange} />
                  <Text style={styles.progressText}>
                    {uploadProgress > 0 ? `${uploadProgress}%` : 'Preparing…'}
                  </Text>
                </View>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.submitBtnOuter,
                uploading && styles.submitBtnDisabled,
              ]}
              onPress={handleSubmit}
              disabled={uploading}
              activeOpacity={0.92}
            >
              <LinearGradient
                colors={ORANGE_GRADIENT_CTA}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.submitGradient}
              >
                <View style={styles.submitInner}>
                  <MaterialCommunityIcons
                    name={scheduleEnabled ? 'calendar-clock' : 'send'}
                    size={20}
                    color="rgba(255,255,255,0.95)"
                  />
                  <Text style={styles.submitBtnText}>
                    {uploading
                      ? 'Uploading…'
                      : scheduleEnabled
                      ? 'Schedule'
                      : 'Publish now'}
                  </Text>
                </View>
              </LinearGradient>
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
          </Animated.View>
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
    backgroundColor: '#1C1917',
  },
  modalBox: {
    backgroundColor: '#FDFCFA',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '92%',
    paddingBottom: 28,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(28,25,23,0.08)',
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  sheetHandleWrap: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(28,25,23,0.12)',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 12,
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  accountScroll: {
    marginBottom: 8,
  },
  closeBtn: {
    marginTop: 2,
    padding: 4,
    borderRadius: 20,
    backgroundColor: 'rgba(28,25,23,0.05)',
  },
  headerAccent: {
    height: 3,
    marginHorizontal: 20,
    borderRadius: 2,
    marginBottom: 4,
    opacity: 0.92,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1917',
    letterSpacing: -0.3,
  },
  titleSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: '#78716C',
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  scroll: {
    maxHeight: 420,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.06)',
    shadowColor: '#1C1917',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#57534E',
    marginBottom: 8,
    marginTop: 14,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  labelFirst: {
    marginTop: 0,
  },
  scheduleToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 6,
  },
  scheduleToggleText: {
    flex: 1,
    fontSize: 15,
    color: '#292524',
    fontWeight: '600',
    lineHeight: 21,
  },
  scheduleFields: {
    marginTop: 8,
    marginBottom: 4,
  },
  scheduleHint: {
    fontSize: 12,
    color: '#78716C',
    marginBottom: 6,
    lineHeight: 18,
  },
  scheduleHintSecondary: {
    fontSize: 11,
    color: '#A8A29E',
    marginBottom: 8,
    lineHeight: 16,
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FAFAF9',
  },
  pickerRowText: {
    flex: 1,
    fontSize: 16,
    color: '#1C1917',
    fontWeight: '600',
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28,25,23,0.5)',
    justifyContent: 'flex-end',
  },
  pickerBackdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  pickerSheet: {
    backgroundColor: '#FDFCFA',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    alignItems: 'center',
  },
  pickerDoneBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '100%',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(28,25,23,0.08)',
  },
  pickerDoneText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#8B6914',
  },
  input: {
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.1)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C1917',
    backgroundColor: '#FAFAF9',
  },
  textArea: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  mediaBox: {
    height: 128,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(28,25,23,0.1)',
    borderStyle: 'dashed',
    overflow: 'hidden',
    backgroundColor: '#FAFAF9',
  },
  mediaBoxFilled: {
    borderStyle: 'solid',
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
    top: 8,
    right: 8,
    backgroundColor: 'rgba(28,25,23,0.55)',
    borderRadius: 16,
  },
  durationBadge: {
    backgroundColor: 'rgba(0,0,0,0.72)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  durationBadgeVideo: {
    position: 'absolute',
    bottom: 8,
    right: 8,
  },
  durationText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  videoPreviewPlaceholder: {
    flex: 1,
    backgroundColor: '#292524',
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
    marginTop: 8,
    fontSize: 13,
    color: '#A8A29E',
    fontWeight: '500',
  },
  progressWrap: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 8,
  },
  progressTrack: {
    height: 3,
    borderRadius: 2,
    backgroundColor: 'rgba(28,25,23,0.08)',
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#A67C52',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  progressText: {
    fontSize: 13,
    color: '#57534E',
    fontWeight: '600',
  },
  submitBtnOuter: {
    marginHorizontal: 20,
    marginTop: 4,
    borderRadius: 14,
    overflow: 'hidden',
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.38,
    shadowRadius: 10,
    elevation: 8,
  },
  submitGradient: {
    borderRadius: 14,
  },
  submitInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 24,
  },
  submitBtnDisabled: {
    opacity: 0.72,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  platformRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  platformChip: {
    borderWidth: 1.5,
    borderColor: 'rgba(28,25,23,0.12)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: '#FAFAF9',
  },
  platformChipActive: {
    borderColor: '#8B6914',
    backgroundColor: 'rgba(139,105,20,0.12)',
  },
  platformChipText: {
    color: '#44403C',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
    letterSpacing: 0.2,
  },
  platformChipTextActive: {
    color: '#5C4033',
  },
  pageChip: {
    borderWidth: 1.5,
    borderColor: 'rgba(28,25,23,0.1)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    maxWidth: 190,
    backgroundColor: '#FAFAF9',
  },
  pageChipActive: {
    borderColor: '#A67C52',
    backgroundColor: 'rgba(166,124,82,0.14)',
  },
  pageChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#44403C',
  },
  pageChipTextActive: {
    color: '#5C4033',
  },
});

export default CreatePostModal;
