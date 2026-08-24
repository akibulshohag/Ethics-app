import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Alert,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { launchImageLibrary } from 'react-native-image-picker';
import VideoCoverPickerModal from '../../components/VideoCoverPickerModal';
import VideoCoverSuggestionsRow from '../../components/VideoCoverSuggestionsRow';
import { frameToThumbnailAsset, thumbnailFromVideoFrame } from '../../utils/videoThumbnail';
import { getSocialAccounts } from '../../services/postService';
import {
  MAX_CLIPS,
  clipFromPickerAsset,
  clipsFromDraft,
  mediaKindFromClips,
  primaryVideoFromClips,
  thumbnailFromClips,
  totalTimelineDuration,
} from '../../utils/postClips';
import EatwazeWatermark from '../../components/EatwazeWatermark';

const { width } = Dimensions.get('window');

const firstNonEmpty = (...vals) => {
  for (let i = 0; i < vals.length; i += 1) {
    const v = String(vals[i] || '').trim();
    if (v) return v;
  }
  return '';
};

const CreateReelScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const user = useSelector(state => state?.app?.user);
  const [videoAsset, setVideoAsset] = useState(null);
  const [clips, setClips] = useState([]);
  const [thumbnailAsset, setThumbnailAsset] = useState(null);
  const [coverModalVisible, setCoverModalVisible] = useState(false);
  const [thumbLoading, setThumbLoading] = useState(false);
  const [socialAccounts, setSocialAccounts] = useState([]);
  const [socialLoading, setSocialLoading] = useState(false);
  const [seedLoaded, setSeedLoaded] = useState(false);
  const lastFreshSessionRef = useRef(null);
  const isEditMode = Boolean(
    route.params?.isEdit || route.params?.editDraft || route.params?.short?.id,
  );
  const incomingSeed = useMemo(() => {
    const fromDraft = route.params?.draft;
    const fromEditDraft = route.params?.editDraft;
    const fromShort = route.params?.short;
    if (fromDraft && typeof fromDraft === 'object') return fromDraft;
    if (fromEditDraft && typeof fromEditDraft === 'object') return fromEditDraft;
    if (fromShort && typeof fromShort === 'object') {
      const videoUri = firstNonEmpty(
        fromShort.videoUrl,
        fromShort.mediaUrl,
        fromShort.uri,
        fromShort.streamUrl,
        fromShort?.video?.videoUrl,
        fromShort?.video?.uri,
      );
      const thumbUri = firstNonEmpty(
        fromShort.thumbnailUrl,
        fromShort.thumbnail,
        fromShort.coverUrl,
        fromShort.posterUrl,
        fromShort.image,
        fromShort.mediaThumb,
        fromShort?.thumbnail?.uri,
        fromShort?.thumbnail?.src,
        fromShort?.video?.thumbnailUrl,
      );
      return {
        video: videoUri
          ? {
              uri: videoUri,
              type: 'video/mp4',
              name: `short-${fromShort.id || 'edit'}.mp4`,
              durationSec: Number(fromShort.durationSec || fromShort.duration || 0),
              width: Number(fromShort.width || 0),
              height: Number(fromShort.height || 0),
            }
          : null,
        thumbnail: thumbUri
          ? {
              uri: thumbUri,
              type: 'image/jpeg',
              name: `short-cover-${fromShort.id || 'edit'}.jpg`,
            }
          : null,
        caption: String(fromShort.title || fromShort.caption || '').trim(),
        hashtags: Array.isArray(fromShort.hashtags) ? fromShort.hashtags : [],
      };
    }
    return null;
  }, [route.params]);
  const steps = [
    { id: 1, label: 'Upload' },
    { id: 2, label: 'Edit' },
    { id: 3, label: 'Caption' },
    { id: 4, label: 'Preview' },
    { id: 5, label: 'Schedule' },
  ];

  const applyClips = nextClips => {
    const list = (Array.isArray(nextClips) ? nextClips : []).slice(0, MAX_CLIPS);
    setClips(list);
    const primary = primaryVideoFromClips(list);
    setVideoAsset(primary);
    const firstVideo = list.find(c => c.type === 'video');
    if (firstVideo?.uri) {
      setThumbLoading(true);
      thumbnailFromVideoFrame(firstVideo.uri)
        .then(thumb => {
          if (thumb) setThumbnailAsset(thumb);
        })
        .finally(() => setThumbLoading(false));
    } else {
      setThumbnailAsset(thumbnailFromClips(list, null));
    }
  };

  const appendPickerAssets = (assets, kind) => {
    const incoming = (Array.isArray(assets) ? assets : [])
      .filter(a => a?.uri)
      .map(a => clipFromPickerAsset(a, kind));
    if (!incoming.length) return;
    setClips(prev => {
      const room = Math.max(0, MAX_CLIPS - prev.length);
      if (room <= 0) {
        Alert.alert('Clip limit', `You can add up to ${MAX_CLIPS} clips.`);
        return prev;
      }
      const next = [...prev, ...incoming.slice(0, room)];
      const primary = primaryVideoFromClips(next);
      setVideoAsset(primary);
      const firstVideo = next.find(c => c.type === 'video');
      if (firstVideo?.uri && !thumbnailAsset?.uri) {
        setThumbLoading(true);
        thumbnailFromVideoFrame(firstVideo.uri)
          .then(thumb => {
            if (thumb) setThumbnailAsset(thumb);
          })
          .finally(() => setThumbLoading(false));
      } else if (!thumbnailAsset?.uri) {
        setThumbnailAsset(thumbnailFromClips(next, thumbnailAsset));
      }
      return next;
    });
  };

  const pickOneVideo = () =>
    new Promise(resolve => {
      launchImageLibrary(
        { mediaType: 'video', selectionLimit: 1, videoMaxDuration: 180, quality: 1 },
        res => {
          if (res.didCancel) {
            resolve(null);
            return;
          }
          if (res.errorCode) {
            Alert.alert('Error', res.errorMessage || 'Failed to pick video');
            resolve(null);
            return;
          }
          resolve(res.assets?.[0] || null);
        },
      );
    });

  const confirmJoinStep = (title, message, confirmText, cancelText) =>
    new Promise(resolve => {
      Alert.alert(title, message, [
        { text: cancelText, style: 'cancel', onPress: () => resolve(false) },
        { text: confirmText, onPress: () => resolve(true) },
      ]);
    });

  const pickVideo = () => {
    launchImageLibrary(
      { mediaType: 'video', selectionLimit: MAX_CLIPS, videoMaxDuration: 180, quality: 1 },
      res => {
        if (res.didCancel) return;
        if (res.errorCode) {
          Alert.alert('Error', res.errorMessage || 'Failed to pick video');
          return;
        }
        const picked = (Array.isArray(res.assets) ? res.assets : []).filter(a => a?.uri);
        appendPickerAssets(picked, 'video');
        if (picked.length >= 2) {
          Alert.alert(
            'Joined into one video',
            `${picked.length} videos will play as one reel, like CapCut. Publish exports a single video.`,
          );
        }
      },
    );
  };

  const pickJoinVideos = async () => {
    const room = Math.max(0, MAX_CLIPS - clips.length);
    if (room <= 0) {
      Alert.alert('Clip limit', `You can add up to ${MAX_CLIPS} clips.`);
      return;
    }
    const assets = [];
    if (clips.length === 0) {
      const first = await pickOneVideo();
      if (!first?.uri) return;
      assets.push(first);
    }
    const nextLabel = clips.length + assets.length + 1;
    const wantNext = await confirmJoinStep(
      'Join videos',
      clips.length + assets.length === 0
        ? 'Add a 2nd video. Eatwaze stitches them into one reel, like CapCut.'
        : `Add video ${nextLabel} to join into one reel, like CapCut.`,
      `Add video ${nextLabel}`,
      clips.length + assets.length >= 2 ? 'Join these' : 'Just this one',
    );
    if (wantNext) {
      await new Promise(r => setTimeout(r, 350));
      const next = await pickOneVideo();
      if (next?.uri) assets.push(next);
    }
    const totalAfter = clips.length + assets.length;
    if (totalAfter >= 2 && assets.length < room && totalAfter < 3) {
      const wantThird = await confirmJoinStep(
        'Join videos',
        'Add a 3rd video, or continue — they export as one video.',
        'Add 3rd video',
        'Join these',
      );
      if (wantThird) {
        await new Promise(r => setTimeout(r, 350));
        const third = await pickOneVideo();
        if (third?.uri) assets.push(third);
      }
    }
    if (!assets.length) return;
    appendPickerAssets(assets, 'video');
    const joined = clips.length + assets.length;
    if (joined >= 2) {
      Alert.alert(
        'Joined into one video',
        `${joined} videos will play in order as one reel. Publish exports a single 9:16 video.`,
      );
    }
  };

  const pickPhoto = () => {
    launchImageLibrary(
      { mediaType: 'photo', selectionLimit: MAX_CLIPS, quality: 0.92 },
      res => {
        if (res.didCancel) return;
        if (res.errorCode) {
          Alert.alert('Error', res.errorMessage || 'Failed to pick photo');
          return;
        }
        appendPickerAssets(res.assets, 'photo');
      },
    );
  };

  const removeClip = id => {
    const next = clips.filter(c => c.id !== id);
    applyClips(next);
  };

  const pickThumbnail = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.9 }, res => {
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('Error', res.errorMessage || 'Failed to pick thumbnail');
        return;
      }
      const a = res.assets?.[0];
      if (!a?.uri) return;
      setThumbnailAsset({
        uri: a.uri,
        type: a.type || 'image/jpeg',
        name: a.fileName || 'thumbnail.jpg',
      });
    });
  };

  const durationText = useMemo(() => {
    const sec = Math.round(totalTimelineDuration(clips) || Number(videoAsset?.durationSec || 0));
    const mm = Math.floor(sec / 60);
    const ss = String(sec % 60).padStart(2, '0');
    return sec > 0 ? `${mm}:${ss}` : '--:--';
  }, [clips, videoAsset?.durationSec]);

  const formatText = useMemo(() => {
    const w = Number(videoAsset?.width || 0);
    const h = Number(videoAsset?.height || 0);
    if (!w || !h) return 'Unknown';
    return h >= w ? 'Vertical' : 'Horizontal';
  }, [videoAsset?.height, videoAsset?.width]);

  const qualityText = useMemo(() => {
    const h = Number(videoAsset?.height || 0);
    if (h >= 2160) return '4K';
    if (h >= 1440) return '1440p';
    if (h >= 1080) return '1080p';
    if (h >= 720) return '720p';
    return h ? `${h}p` : 'Auto';
  }, [videoAsset?.height]);

  const canGoNext = clips.length > 0 || Boolean(String(videoAsset?.uri || '').trim());
  const hasVideoClip = clips.some(c => c.type === 'video');
  const firstVideoClip = clips.find(c => c.type === 'video');

  useEffect(() => {
    if (seedLoaded) return;
    if (!incomingSeed || typeof incomingSeed !== 'object') {
      setSeedLoaded(true);
      return;
    }
    const seededClips = clipsFromDraft(incomingSeed);
    if (seededClips.length) {
      setClips(seededClips);
      setVideoAsset(primaryVideoFromClips(seededClips));
    }
    const seededVideoUri = String(
      seededClips.find(c => c.type === 'video')?.uri ||
        (incomingSeed?.video?.isPhoto ? '' : incomingSeed?.video?.uri) ||
        '',
    ).trim();
    const seededThumbUri = String(incomingSeed?.thumbnail?.uri || '').trim();
    if (seededThumbUri) {
      setThumbnailAsset({
        uri: seededThumbUri,
        type: incomingSeed?.thumbnail?.type || 'image/jpeg',
        name: incomingSeed?.thumbnail?.name || 'thumbnail.jpg',
      });
    } else if (seededVideoUri) {
      setThumbLoading(true);
      thumbnailFromVideoFrame(seededVideoUri)
        .then(thumb => {
          if (thumb?.uri) setThumbnailAsset(thumb);
        })
        .finally(() => setThumbLoading(false));
    }
    setSeedLoaded(true);
  }, [incomingSeed, seedLoaded]);

  useEffect(() => {
    const freshSession = route.params?.freshSession;
    if (freshSession == null || isEditMode) return;
    if (lastFreshSessionRef.current === freshSession) return;
    lastFreshSessionRef.current = freshSession;
    setVideoAsset(null);
    setClips([]);
    setThumbnailAsset(null);
    setCoverModalVisible(false);
    setThumbLoading(false);
    setSeedLoaded(true);
  }, [route.params?.freshSession, isEditMode]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!user?.id) return;
      setSocialLoading(true);
      try {
        const rows = await getSocialAccounts(user.id);
        if (!cancelled) setSocialAccounts(Array.isArray(rows) ? rows : []);
      } catch {
        if (!cancelled) setSocialAccounts([]);
      } finally {
        if (!cancelled) setSocialLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const onNext = async () => {
    if (!canGoNext) {
      Alert.alert('Media required', 'Please upload a video or photo before continuing.');
      return;
    }
    let thumb = thumbnailAsset;
    const firstVideo = clips.find(c => c.type === 'video');
    if (firstVideo?.uri && !String(thumb?.uri || '').trim()) {
      setThumbLoading(true);
      try {
        thumb = await thumbnailFromVideoFrame(firstVideo.uri);
        if (thumb) setThumbnailAsset(thumb);
      } catch (_) {
        // PostScheduleNew will retry before upload
      } finally {
        setThumbLoading(false);
      }
    }
    if (!String(thumb?.uri || '').trim()) {
      thumb = thumbnailFromClips(clips, thumb);
    }
    navigation.navigate('PostEditNew', {
      draft: {
        ...(incomingSeed && typeof incomingSeed === 'object' ? incomingSeed : {}),
        clips,
        mediaKind: mediaKindFromClips(clips),
        video: primaryVideoFromClips(clips) || videoAsset,
        photo: clips.find(c => c.type === 'photo')
          ? {
              uri: clips.find(c => c.type === 'photo').uri,
              type: clips.find(c => c.type === 'photo').mime,
              name: clips.find(c => c.type === 'photo').name,
            }
          : undefined,
        thumbnail: thumb || undefined,
      },
    });
  };

  return (
    <SafeAreaView style={styles.safeTop} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12}>
          <Icon name="chevron-left" color="white" size={28} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit Reel' : 'Create Reel'}
          </Text>
          <Text style={styles.headerSubtitle}>
            Upload, edit and Publish to all platforms
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerNextWrap}
          onPress={onNext}
          disabled={!canGoNext}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          activeOpacity={canGoNext ? 0.7 : 1}
        >
          <Text
            style={[styles.headerNextLabel, !canGoNext && styles.headerNextLabelDisabled]}
          >
            Next
          </Text>
          <Icon
            name="arrow-right"
            color={canGoNext ? '#FFFFFF' : 'rgba(255,255,255,0.4)'}
            size={22}
          />
        </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Stepper */}
          <View style={styles.stepperContainer}>
          {steps.map((step, index) => (
            <View key={step.id} style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  step.id === 1 && styles.activeStepCircle,
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    step.id === 1 && styles.activeStepText,
                  ]}
                >
                  {step.id}
                </Text>
                {index < steps.length - 1 && <View style={styles.stepLine} />}
              </View>
              <Text
                style={[styles.stepLabel, step.id === 1 && styles.activeLabel]}
              >
                {step.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Start here</Text>
          <Text style={styles.sectionSubtitle}>
            Upload photos, videos, or both. Trim, add music, text, and more in
            the next step
          </Text>

          {/* Upload Area */}
          <View style={styles.uploadBox}>
            <View style={styles.uploadIconCircle}>
              <Icon name="upload" color="#F5A623" size={30} />
            </View>
            <Text style={styles.uploadTitle}>Upload media</Text>
            <Text style={styles.uploadMeta}>
              Photos and videos · MP4, MOV, JPG, PNG · up to {MAX_CLIPS} clips
            </Text>
            <Text style={styles.uploadHint}>
              Pick 2 or 3 videos to join into one reel, like CapCut.
            </Text>

            <View style={styles.uploadBtnRow}>
              <TouchableOpacity style={styles.uploadButton} onPress={pickVideo}>
                <Icon name="video-plus" color="white" size={18} />
                <Text style={styles.uploadButtonText}>Video</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.uploadButtonPhoto} onPress={pickPhoto}>
                <Icon name="image-plus" color="white" size={18} />
                <Text style={styles.uploadButtonText}>Photo</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.uploadButtonJoin} onPress={pickJoinVideos}>
              <Icon name="call-merge" color="white" size={18} />
              <Text style={styles.uploadButtonText}>Join 2–3 videos</Text>
            </TouchableOpacity>
            <Text style={styles.dragDropText}>
              {clips.length >= 2
                ? `${clips.length} clips will join into 1 video on publish`
                : 'Join 2–3 videos, or add clips one by one — they play as one'}
            </Text>
          </View>

          {clips.length ? (
            <View style={styles.clipList}>
              {clips.length >= 2 ? (
                <View style={styles.joinBanner}>
                  <Icon name="call-merge" size={18} color="#F5A623" />
                  <Text style={styles.joinBannerText}>
                    {clips.length} clips join into 1 video, like CapCut
                  </Text>
                </View>
              ) : null}
              {clips.map((clip, idx) => (
                <View key={clip.id} style={styles.clipCard}>
                  <View style={styles.clipThumbWrap}>
                    <Image source={{ uri: clip.uri }} style={styles.clipThumb} />
                    <EatwazeWatermark size={36} />
                  </View>
                  <View style={styles.clipMeta}>
                    <Text style={styles.clipTitle} numberOfLines={1}>
                      {idx + 1}. {clip.type === 'photo' ? 'Photo' : 'Video'}
                    </Text>
                    <Text style={styles.clipSub} numberOfLines={1}>
                      {clip.name}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => removeClip(clip.id)} hitSlop={8}>
                    <Icon name="close-circle" size={22} color="#C44" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ) : null}

          {/* Thumbnail Section — pick a frame from THIS upload or a gallery image */}
          <Text style={styles.sectionTitle}>Thumbnail</Text>
          <Text style={styles.sectionSubtitle}>
            {hasVideoClip
              ? 'Default is a frame from your video. Tap the preview or '
              : 'Using your first photo as the cover. You can still pick a '}
            {hasVideoClip ? (
              <Text style={styles.sectionSubtitleEm}>From video</Text>
            ) : (
              <Text style={styles.sectionSubtitleEm}>Gallery</Text>
            )}
            {hasVideoClip ? (
              <>
                {' '}
                to choose a different moment. Use{' '}
                <Text style={styles.sectionSubtitleEm}>Gallery</Text> for a custom
                image.
              </>
            ) : (
              ' image instead.'
            )}
          </Text>

          <TouchableOpacity
            style={[styles.thumbnailPreviewCard, !canGoNext && styles.thumbnailPreviewCardDisabled]}
            activeOpacity={canGoNext ? 0.92 : 1}
            onPress={() => {
              if (!canGoNext) return;
              if (hasVideoClip) setCoverModalVisible(true);
              else pickThumbnail();
            }}
            disabled={!canGoNext}
          >
            <View style={styles.thumbnailPreviewInner}>
              {thumbLoading ? (
                <View style={styles.thumbnailLoading}>
                  <ActivityIndicator size="large" color="#F5A623" />
                  <Text style={styles.thumbnailLoadingText}>Picking a frame…</Text>
                </View>
              ) : thumbnailAsset?.uri ? (
                <Image
                  source={{ uri: thumbnailAsset.uri }}
                  style={styles.thumbnailPreviewImage}
                />
              ) : (
                <View style={styles.thumbnailPlaceholder}>
                  <Icon name="motion-play-outline" size={40} color="#CCC" />
                  <Text style={styles.thumbnailPlaceholderText}>
                    {canGoNext ? 'Tap to choose a cover' : 'Upload a photo or video first'}
                  </Text>
                </View>
              )}
            </View>
            {canGoNext && hasVideoClip ? (
              <View style={styles.thumbnailPreviewBadge} pointerEvents="none">
                <Icon
                  name="movie-open-outline"
                  size={16}
                  color="#fff"
                  style={styles.thumbnailPreviewBadgeIcon}
                />
                <Text style={styles.thumbnailPreviewBadgeText}>
                  {thumbnailAsset?.uri ? 'Change frame from video' : 'Choose from video'}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>

          {canGoNext && hasVideoClip ? (
            <VideoCoverSuggestionsRow
              videoUri={firstVideoClip?.uri}
              durationSec={firstVideoClip?.durationSec}
              selectedUri={thumbnailAsset?.uri}
              onSelect={frame => {
                const asset = frameToThumbnailAsset(frame);
                if (asset) setThumbnailAsset(asset);
              }}
              onPressSeeAll={() => setCoverModalVisible(true)}
              compact
            />
          ) : null}

          <View style={styles.thumbnailBtnRow}>
            <TouchableOpacity
              style={[
                styles.thumbnailBtnHalf,
                styles.thumbnailBtnHalfLeft,
                (!canGoNext || !hasVideoClip) && styles.thumbnailPickerDisabled,
              ]}
              onPress={() => canGoNext && hasVideoClip && setCoverModalVisible(true)}
              disabled={!canGoNext || !hasVideoClip}
              activeOpacity={0.85}
            >
                  <Icon name="filmstrip" color={canGoNext && hasVideoClip ? '#F5A623' : '#AAA'} size={26} />
              <Text
                style={[styles.thumbnailBtnTitle, !canGoNext && styles.thumbPickerTitleDisabled]}
              >
                From video
              </Text>
              <Text style={styles.thumbnailBtnSub}>This upload</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.thumbnailBtnHalf,
                styles.thumbnailBtnHalfRight,
                !canGoNext && styles.thumbnailPickerDisabled,
              ]}
              onPress={pickThumbnail}
              disabled={!canGoNext}
              activeOpacity={0.85}
            >
              <Icon name="image-plus" color={canGoNext ? '#F5A623' : '#AAA'} size={26} />
              <Text
                style={[styles.thumbnailBtnTitle, !canGoNext && styles.thumbPickerTitleDisabled]}
              >
                Gallery
              </Text>
              <Text style={styles.thumbnailBtnSub}>JPEG / PNG</Text>
            </TouchableOpacity>
          </View>

          {/* Info Stats */}
          <View style={styles.statsRow}>
            <StatBox
              icon={<Icon name="clock-outline" size={16} color="#555" />}
              label="Duration"
              value={durationText}
            />
            <StatBox
              icon={<Icon name="cellphone" size={16} color="#555" />}
              label="Format"
              value={formatText}
              subValue={formatText === 'Vertical' ? 'Recommended' : undefined}
            />
            <StatBox
              icon={<Icon name="upload" size={16} color="#555" />}
              label="Quality"
              value={qualityText}
              subValue="Recommended"
            />
          </View>

          <Text style={styles.sectionTitle}>Connected pages/channels</Text>
          {socialLoading ? (
            <ActivityIndicator size="small" color="#F5A623" style={{ marginVertical: 8 }} />
          ) : (
            <View style={styles.connectedWrap}>
              {['facebook', 'instagram', 'tiktok', 'youtube'].map(platform => {
                const row = socialAccounts.find(
                  x => String(x?.platform || '').toLowerCase() === platform,
                );
                const label = String(
                  row?.accountName || row?.accountId || 'Not connected',
                );
                return (
                  <Text key={platform} style={styles.connectedText}>
                    {`${platform}: ${label}`}
                  </Text>
                );
              })}
            </View>
          )}

          {/* Safety Footer */}
          <View style={styles.safetyFooter}>
            <Icon name="shield-check" size={14} color="#AAA" />
            <Text style={styles.safetyText}>
              you content is safe and only visible to you
            </Text>
          </View>
          </View>
        </ScrollView>

        <View
          style={[
            styles.stickyFooter,
            { paddingBottom: Math.max(insets.bottom, 12) },
          ]}
        >
          {!canGoNext ? (
            <Text style={styles.stickyFooterHint}>Upload a photo or video to go to Edit</Text>
          ) : null}
          <TouchableOpacity
            style={[styles.stickyNextButton, !canGoNext && styles.nextButtonDisabled]}
            onPress={onNext}
            disabled={!canGoNext}
            activeOpacity={canGoNext ? 0.88 : 1}
          >
            <Text
              style={[styles.stickyNextButtonText, !canGoNext && styles.nextButtonTextDisabled]}
            >
              {isEditMode ? 'Save & Continue' : 'Continue to Edit'}
            </Text>
            <Icon name="arrow-right" color={canGoNext ? 'white' : '#EEE'} size={22} />
          </TouchableOpacity>
        </View>

        <VideoCoverPickerModal
          visible={coverModalVisible}
          onClose={() => setCoverModalVisible(false)}
          videoUri={firstVideoClip?.uri}
          durationSec={firstVideoClip?.durationSec}
          title="Choose thumbnail frame"
          onSelect={item => {
            const asset = frameToThumbnailAsset(item);
            if (asset) setThumbnailAsset(asset);
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const StatBox = ({ icon, label, value, subValue }) => (
  <View style={styles.statBox}>
    <View style={styles.statHeader}>
      {icon}
      <Text style={styles.statLabel}>{label}</Text>
    </View>
    <Text style={styles.statValue}>{value}</Text>
    {subValue && <Text style={styles.statSubValue}>{subValue}</Text>}
  </View>
);

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: '#F5A623' },
  container: { flex: 1, backgroundColor: '#F8F8F8' },
  header: {
    backgroundColor: '#F5A623',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  headerTitleContainer: { flex: 1, marginLeft: 15 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: 'white', fontSize: 13, opacity: 0.9 },
  headerNextWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 10,
  },
  headerNextLabel: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
    marginRight: 2,
  },
  headerNextLabelDisabled: {
    color: 'rgba(255,255,255,0.45)',
  },

  scrollView: { flex: 1, backgroundColor: '#F8F8F8' },
  scrollContent: { paddingBottom: 16 },

  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
  },
  stepItem: { alignItems: 'center', flex: 1 },
  stepCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
  },
  activeStepCircle: { borderColor: '#F5A623', borderWidth: 2 },
  stepNumber: { color: '#AAA', fontSize: 12 },
  activeStepText: { color: '#F5A623', fontWeight: 'bold' },
  stepLabel: { fontSize: 10, marginTop: 5, color: '#AAA' },
  activeLabel: { color: '#F5A623', fontWeight: 'bold' },
  stepLine: {
    position: 'absolute',
    right: -width / 6,
    top: 15,
    width: width / 4,
    height: 1,
    backgroundColor: '#DDD',
    zIndex: -1,
  },

  card: {
    backgroundColor: 'white',
    margin: 15,
    borderRadius: 20,
    padding: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  sectionSubtitle: {
    fontSize: 12,
    color: '#777',
    marginVertical: 8,
    lineHeight: 18,
  },
  sectionSubtitleEm: { color: '#333', fontWeight: '700' },

  uploadBox: {
    borderWidth: 1,
    borderColor: '#F5A623',
    borderStyle: 'dashed',
    borderRadius: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
    marginVertical: 10,
  },
  uploadIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFE6C0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  uploadTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  uploadMeta: { fontSize: 10, color: '#666', marginTop: 6 },
  uploadHint: { fontSize: 10, color: '#666' },
  uploadButton: {
    backgroundColor: '#F5A623',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginRight: 6,
  },
  uploadButtonPhoto: {
    backgroundColor: '#E8890C',
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    marginLeft: 6,
  },
  uploadButtonJoin: {
    backgroundColor: '#1C1C1C',
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  uploadBtnRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 4,
  },
  uploadButtonText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
  dragDropText: { fontSize: 10, color: '#AAA', marginTop: 6 },
  joinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
    gap: 8,
  },
  joinBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#8A5A00',
  },

  clipList: { marginBottom: 12 },
  clipCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
    borderWidth: 1,
    borderColor: '#F5E2BE',
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
  },
  clipThumbWrap: {
    width: 54,
    height: 72,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  clipThumb: { width: '100%', height: '100%' },
  clipMeta: { flex: 1, marginHorizontal: 10 },
  clipTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  clipSub: { fontSize: 11, color: '#777', marginTop: 2 },

  thumbnailPreviewCard: {
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#ECECEC',
    marginTop: 6,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  thumbnailPreviewCardDisabled: { opacity: 0.85 },
  thumbnailPreviewInner: {
    width: '100%',
    maxHeight: 220,
    aspectRatio: 9 / 16,
    alignSelf: 'center',
    backgroundColor: '#F0F0F0',
  },
  thumbnailPreviewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  thumbnailLoadingText: { marginTop: 8, fontSize: 12, color: '#666' },
  thumbnailPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  thumbnailPlaceholderText: {
    marginTop: 10,
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  thumbnailPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5A623',
    paddingVertical: 11,
    paddingHorizontal: 14,
  },
  thumbnailPreviewBadgeIcon: { marginRight: 8 },
  thumbnailPreviewBadgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  thumbnailBtnRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  thumbnailBtnHalf: {
    flex: 1,
    minHeight: 96,
    borderWidth: 1.5,
    borderColor: '#F5A623',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#FFF9F0',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  thumbnailBtnHalfLeft: { marginRight: 6 },
  thumbnailBtnHalfRight: { marginLeft: 6 },
  thumbnailBtnTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#333',
    marginTop: 8,
    textAlign: 'center',
  },
  thumbnailBtnSub: { fontSize: 11, color: '#777', marginTop: 4 },
  thumbnailPickerDisabled: {
    borderColor: '#DDD',
    backgroundColor: '#F5F5F5',
  },
  thumbPickerTitleDisabled: { color: '#AAA' },

  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 10,
    padding: 10,
    marginHorizontal: 4,
  },
  statHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  statLabel: { fontSize: 10, color: '#777', marginLeft: 4 },
  statValue: { fontSize: 14, fontWeight: 'bold', color: '#333' },
  statSubValue: { fontSize: 9, color: '#AAA' },
  connectedWrap: {
    marginTop: 8,
    marginBottom: 14,
    backgroundColor: '#FFF9F0',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#F5E2BE',
    padding: 10,
  },
  connectedText: {
    fontSize: 12,
    color: '#555',
    marginBottom: 3,
    textTransform: 'capitalize',
  },

  stickyFooter: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 8,
  },
  stickyFooterHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#888',
    marginBottom: 8,
  },
  stickyNextButton: {
    backgroundColor: '#F5A623',
    flexDirection: 'row',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stickyNextButtonText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 17,
    marginRight: 8,
  },
  nextButtonDisabled: {
    backgroundColor: '#D0D0D0',
  },
  nextButtonTextDisabled: {
    color: '#F5F5F5',
  },

  safetyFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  safetyText: { fontSize: 11, color: '#AAA', marginLeft: 5 },
});

export default CreateReelScreen;
