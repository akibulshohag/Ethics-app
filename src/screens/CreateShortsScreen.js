import React, {useState, useRef, useEffect, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ImageBackground,
  Alert,
} from 'react-native';
import Video from 'react-native-video';
import {launchImageLibrary} from 'react-native-image-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {useFocusEffect} from '@react-navigation/native';
import {useSelector} from 'react-redux';
import {getUserSubscription} from '../services/subscriptionService';
import SoundsModal from '../components/SoundsModal';
import AddDetailsModal from '../components/AddDetailsModal';
import FilterModal from '../components/FilterModal';
import TimerModal from '../components/TimerModal';
import BeautyModal from '../components/BeautyModal';
import SpeedModal from '../components/SpeedModal';
import CameraShortsView from '../components/CameraShortsView';
import CommentsSettingsModal from '../components/CommentsSettingsModal';
import {
  getFilterOverlayStyle,
  getBeautyOverlayStyle,
} from '../constants/filterEffects';
import {COLORS} from '../constants/theme';
import {
  playShortsBackdrop,
  stopShortsBackdrop,
  bindShortsBackdropLoop,
} from '../utils/shortsBackdropSound';
import {navigateToHomeOne} from '../utils/navigateToHomeOne';
import {newShortSessionKey} from '../utils/reelDraftStorage';

const {width, height} = Dimensions.get('window');

const DEFAULT_COMMENTS_SETTING = 'Allow all comments';

const CreateShortsScreen = ({navigation, route}) => {
  const exitToHomeOne = () => navigateToHomeOne(navigation);

  const initialLive = route?.params?.isLive === true;
  const lastSessionKeyRef = useRef(null);
  const [detailsModalKey, setDetailsModalKey] = useState(0);
  const [activeDuration, setActiveDuration] = useState(initialLive ? '10s' : '60s');
  const [soundsVisible, setSoundsVisible] = useState(false);
  const [addDetailsVisible, setAddDetailsVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [timerVisible, setTimerVisible] = useState(false);
  const [beautyVisible, setBeautyVisible] = useState(false);
  const [speedVisible, setSpeedVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(initialLive);
  const [selectedSound, setSelectedSound] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState(null);
  const [selectedTimer, setSelectedTimer] = useState(0);
  const [beautyLevel, setBeautyLevel] = useState(0);
  const [speedFactor, setSpeedFactor] = useState(1);
  const [cameraFacing, setCameraFacing] = useState('back');
  const [pickedVideo, setPickedVideo] = useState(null);
  const [pickedThumbnail, setPickedThumbnail] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const cameraRef = useRef(null);
  const maxDurationTimerRef = useRef(null);
  const isRecordingRef = useRef(false);
  const backdropLoopCleanupRef = useRef(null);
  const insets = useSafeAreaInsets();

  const [torchOn, setTorchOn] = useState(false);
  const [recordCommentsModalVisible, setRecordCommentsModalVisible] =
    useState(false);
  const [commentsSetting, setCommentsSetting] = useState(DEFAULT_COMMENTS_SETTING);

  const resetCreationState = useCallback(
    (isLive = false) => {
      if (maxDurationTimerRef.current) {
        clearTimeout(maxDurationTimerRef.current);
        maxDurationTimerRef.current = null;
      }
      backdropLoopCleanupRef.current?.();
      backdropLoopCleanupRef.current = null;
      void stopShortsBackdrop();
      isRecordingRef.current = false;

      setActiveDuration(isLive ? '10s' : '60s');
      setSoundsVisible(false);
      setAddDetailsVisible(false);
      setFilterVisible(false);
      setTimerVisible(false);
      setBeautyVisible(false);
      setSpeedVisible(false);
      setIsEditing(false);
      setIsLiveMode(isLive);
      setSelectedSound(null);
      setSelectedFilter(null);
      setSelectedTimer(0);
      setBeautyLevel(0);
      setSpeedFactor(1);
      setCameraFacing('back');
      setPickedVideo(null);
      setPickedThumbnail(null);
      setIsRecording(false);
      setCountdown(null);
      setTorchOn(false);
      setRecordCommentsModalVisible(false);
      setCommentsSetting(DEFAULT_COMMENTS_SETTING);
      setDetailsModalKey(k => k + 1);
    },
    [],
  );

  useEffect(() => {
    const sessionKey = route.params?.sessionKey;
    if (sessionKey == null) return;
    if (lastSessionKeyRef.current === sessionKey) return;
    lastSessionKeyRef.current = sessionKey;
    resetCreationState(route?.params?.isLive === true);
  }, [route.params?.sessionKey, route.params?.isLive, resetCreationState]);

  const parseDurationSeconds = (d) => {
    if (d === '10s') return 10;
    if (d === '15s') return 15;
    if (d === '30s') return 30;
    if (d === '60s') return 60;
    if (d === '3m') return 180;
    return isLiveMode ? 10 : 60;
  };

  useEffect(() => {
    return () => {
      if (maxDurationTimerRef.current) clearTimeout(maxDurationTimerRef.current);
      backdropLoopCleanupRef.current?.();
      backdropLoopCleanupRef.current = null;
      void stopShortsBackdrop();
    };
  }, []);

  const [isScreenFocused, setIsScreenFocused] = useState(true);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => {
        setIsScreenFocused(false);
        backdropLoopCleanupRef.current?.();
        backdropLoopCleanupRef.current = null;
        void stopShortsBackdrop();
      };
    }, []),
  );

  useEffect(() => {
    if (!addDetailsVisible) return;
    backdropLoopCleanupRef.current?.();
    backdropLoopCleanupRef.current = null;
    void stopShortsBackdrop();
  }, [addDetailsVisible]);

  const shouldPlayPreviewVideo =
    isScreenFocused &&
    !addDetailsVisible &&
    Boolean(pickedVideo?.uri);

  const stopRecording = () => {
    if (!isRecordingRef.current) return;
    backdropLoopCleanupRef.current?.();
    backdropLoopCleanupRef.current = null;
    void stopShortsBackdrop();
    isRecordingRef.current = false;
    setIsRecording(false);
    if (maxDurationTimerRef.current) {
      clearTimeout(maxDurationTimerRef.current);
      maxDurationTimerRef.current = null;
    }
    if (cameraRef.current?.stopRecording) {
      cameraRef.current.stopRecording().catch(() => {
        // Ignore "no recording in progress" when stop called twice
      });
    }
  };

  const handleRecordingFinished = video => {
    backdropLoopCleanupRef.current?.();
    backdropLoopCleanupRef.current = null;
    void stopShortsBackdrop();
    isRecordingRef.current = false;
    setIsRecording(false);
    const path = video?.path ?? video;
    if (path) {
      const uri = path.startsWith('file://') ? path : `file://${path}`;
      setPickedVideo({
        uri,
        type: 'video/mp4',
        name: 'short.mp4',
      });
      setIsEditing(true);
    }
  };

  const handleRecordPress = async () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    if (!showCamera) {
      return;
    }
    if (!cameraRef.current?.startRecording) return;
    if (user?.id) {
      try {
        const sub = await getUserSubscription(user.id);
        if (!sub.canUploadShort) {
          Alert.alert(
            'Upload Limit Reached',
            sub.message || 'You have reached your shorts limit. Upgrade your plan to upload more.',
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
    }
    const runRecording = async () => {
      if (!cameraRef.current?.startRecording) return;
      backdropLoopCleanupRef.current?.();
      backdropLoopCleanupRef.current = null;
      await stopShortsBackdrop();
      if (selectedSound?.previewUrl) {
        await playShortsBackdrop(selectedSound.previewUrl);
        backdropLoopCleanupRef.current = bindShortsBackdropLoop(
          selectedSound.previewUrl,
          isRecordingRef,
        );
      }
      isRecordingRef.current = true;
      setIsRecording(true);
      cameraRef.current.startRecording({
        onRecordingFinished: handleRecordingFinished,
        onRecordingError: e => {
          backdropLoopCleanupRef.current?.();
          backdropLoopCleanupRef.current = null;
          void stopShortsBackdrop();
          isRecordingRef.current = false;
          setIsRecording(false);
          Alert.alert('Recording Error', e?.message || 'Failed to record');
        },
      });
      const maxSec = parseDurationSeconds(activeDuration);
      maxDurationTimerRef.current = setTimeout(stopRecording, maxSec * 1000);
    };
    if (selectedTimer > 0) {
      setCountdown(selectedTimer);
      let n = selectedTimer;
      const iv = setInterval(() => {
        n -= 1;
        setCountdown(n);
        if (n <= 0) {
          clearInterval(iv);
          setCountdown(null);
          void runRecording();
        }
      }, 1000);
    } else {
      void runRecording();
    }
  };

  const pickVideo = async () => {
    if (!user?.id) {
      Alert.alert('Authentication Required', 'Please login to upload shorts');
      return;
    }
    try {
      const sub = await getUserSubscription(user.id);
      if (!sub.canUploadShort) {
        Alert.alert(
          'Upload Limit Reached',
          sub.message || 'You have reached your shorts limit. Upgrade your plan to upload more.',
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
    launchImageLibrary(
      {
        mediaType: 'video',
        videoMaxDuration: 180,
        quality: 1,
      },
      (res) => {
        if (res.didCancel) return;
        if (res.errorCode) {
          Alert.alert('Error', res.errorMessage || 'Failed to pick video');
          return;
        }
        const asset = res.assets?.[0];
        if (asset?.uri) {
          setPickedVideo({
            uri: asset.uri,
            type: asset.type || 'video/mp4',
            name: asset.fileName || 'short.mp4',
          });
          setIsEditing(true);
        }
      },
    );
  };

  const pickThumbnail = () => {
    launchImageLibrary(
      {mediaType: 'photo'},
      (res) => {
        if (res.didCancel) return;
        const asset = res.assets?.[0];
        if (asset?.uri) {
          setPickedThumbnail({
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || 'thumb.jpg',
          });
        }
      },
    );
  };
  const user = useSelector(state => state?.app?.user);

  const handleSoundSelect = sound => {
    setSelectedSound(sound);
    setSoundsVisible(false);
  };

  const ActionItem = ({
    icon,
    label,
    iconType = 'Ionicons',
    onPress,
    active,
  }) => {
    const IconComp =
      iconType === 'MaterialCommunityIcons'
        ? MaterialCommunityIcons
        : iconType === 'MaterialIcons'
        ? MaterialIcons
        : Ionicons;
    const iconColor = active ? COLORS.primaryOrange : 'white';
    return (
      <TouchableOpacity style={styles.actionItem} onPress={onPress}>
        <IconComp
          name={icon}
          size={28}
          color={iconColor}
          style={styles.shadow}
        />
        <Text style={styles.actionLabel}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const filterOverlayStyle = getFilterOverlayStyle(selectedFilter);
  const beautyOverlayStyle = getBeautyOverlayStyle(beautyLevel);
  const recordMicEnabled = !selectedSound?.previewUrl;

  const shortsMetadata = {
    activeDuration,
    selectedSound,
    selectedFilter,
    selectedTimer,
    beautyLevel,
    speedFactor,
    cameraFacing,
    isLiveMode,
    commentsSetting,
    userId: user?.id,
    videoUri: pickedVideo?.uri,
    videoType: pickedVideo?.type,
    videoName: pickedVideo?.name,
    thumbnailUri: pickedThumbnail?.uri,
    thumbnailType: pickedThumbnail?.type,
    thumbnailName: pickedThumbnail?.name,
  };

  const toggleCameraFlip = () => {
    setCameraFacing(f => {
      const next = f === 'back' ? 'front' : 'back';
      if (next === 'front') setTorchOn(false);
      return next;
    });
  };

  const toggleFlash = () => {
    if (cameraFacing !== 'back') {
      Alert.alert(
        'Flash',
        'Switch to the back camera to use the flash / torch.',
      );
      return;
    }
    setTorchOn(t => !t);
  };

  const showCamera = !isEditing && (isLiveMode || !pickedVideo);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      {showCamera ? (
        <CameraShortsView
          ref={cameraRef}
          facing={cameraFacing}
          style={styles.background}
          isActive={true}
          torch={cameraFacing === 'back' && torchOn ? 'on' : 'off'}
          audio={recordMicEnabled}>
          {filterOverlayStyle && (
            <View
              style={[
                styles.filterOverlay,
                {
                  backgroundColor: filterOverlayStyle.backgroundColor,
                  opacity: filterOverlayStyle.opacity,
                },
              ]}
              pointerEvents="none"
            />
          )}
          {beautyOverlayStyle && (
            <View
              style={[
                styles.filterOverlay,
                {
                  backgroundColor: beautyOverlayStyle.backgroundColor,
                  opacity: beautyOverlayStyle.opacity,
                },
              ]}
              pointerEvents="none"
            />
          )}
          {countdown !== null && countdown > 0 && (
            <View style={styles.countdownOverlay} pointerEvents="none">
              <Text style={styles.countdownText}>{countdown}</Text>
            </View>
          )}
          <View style={styles.overlay}>
          {isEditing ? (
            <View style={styles.editingModeOverlay}>
              <View style={[styles.progressBarContainer, { top: insets.top }]}>
                <View style={styles.progressBarActive} />
                <View style={styles.progressBarInactive} />
              </View>

              <View style={[styles.topControls, { marginTop: insets.top + 15 }]}>
                <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.closeButton}>
                  <Ionicons name="arrow-back" size={30} color="white" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.selectedSoundPill}>
                  <Ionicons name="musical-notes" size={16} color="white" />
                  <Text style={styles.selectedSoundText} numberOfLines={1}>
                    {selectedSound ? `${selectedSound.title} - ${selectedSound.artist}` : 'No sound selected'}
                  </Text>
                </TouchableOpacity>
                <View style={{width: 40}} />
              </View>

              <View style={[styles.rightSidebar, { top: insets.top + 80 }]}>
                 <ActionItem icon="format-text" label="Text" iconType="MaterialCommunityIcons" />
                 <ActionItem icon="emoticon-outline" label="Sticker" iconType="MaterialCommunityIcons" />
                 <ActionItem icon="face-recognition" label="Beauty" iconType="MaterialCommunityIcons" onPress={() => setBeautyVisible(true)} />
                 <ActionItem icon="filter-variant" label="Filters" iconType="MaterialCommunityIcons" onPress={() => setFilterVisible(true)} />
                 <ActionItem
                  icon="speedometer-outline"
                  label="Speed"
                  onPress={() => setSpeedVisible(true)}
                />
                 <ActionItem icon="closed-caption-outline" label="Subtit..." iconType="MaterialCommunityIcons" />
                 <ActionItem
                  icon="chatbubble-ellipses-outline"
                  label="Comments"
                  onPress={() => setRecordCommentsModalVisible(true)}
                />
              </View>

              <View style={[styles.bottomEditingRow, { paddingBottom: insets.bottom + 20 }]}>
                <TouchableOpacity style={styles.draftButton}>
                  <Text style={styles.draftButtonText}>Draft</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={() => setAddDetailsVisible(true)}>
                  <Text style={styles.nextButtonText}>Next</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View style={styles.recordingModeOverlay}>
              <View style={[styles.topControls, { marginTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={exitToHomeOne} style={styles.closeButton}>
                  <Ionicons name="close" size={30} color="white" />
                </TouchableOpacity>
                <View style={styles.topRightRow}>
                  <TouchableOpacity
                    style={styles.addSoundPill}
                    onPress={() => setSoundsVisible(true)}>
                    <Ionicons name="musical-notes" size={18} color="white" />
                    <Text style={styles.addSoundText} numberOfLines={1}>
                      {selectedSound?.title || 'Add Sound'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.liveModePill, isLiveMode && styles.liveModePillActive]}
                    onPress={() => setIsLiveMode(!isLiveMode)}>
                    <MaterialCommunityIcons name="broadcast" size={16} color={isLiveMode ? '#fff' : 'rgba(255,255,255,0.9)'} />
                    <Text style={[styles.liveModeText, isLiveMode && styles.liveModeTextActive]}>Live</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={[styles.rightSidebar, { top: insets.top + 80 }]}>
                <ActionItem
                  icon="camera-reverse-outline"
                  label="Flip"
                  onPress={toggleCameraFlip}
                />
                <ActionItem
                  icon="speedometer-outline"
                  label="Speed"
                  onPress={() => setSpeedVisible(true)}
                />
                <ActionItem icon="filter-variant" label="Filters" iconType="MaterialCommunityIcons" onPress={() => setFilterVisible(true)} />
                <ActionItem icon="face-recognition" label="Beauty" iconType="MaterialCommunityIcons" onPress={() => setBeautyVisible(true)} />
                <ActionItem icon="timer-outline" label="Timer" onPress={() => setTimerVisible(true)} />
                <ActionItem
                  icon="chatbubble-ellipses-outline"
                  label="Comments"
                  onPress={() => setRecordCommentsModalVisible(true)}
                />
                <ActionItem
                  icon={torchOn ? 'flash' : 'flash-outline'}
                  label="Flash"
                  onPress={toggleFlash}
                  active={torchOn}
                />
              </View>
              <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 20 }]}>
                {!isLiveMode && (
                <View style={styles.durationSelector}>
                  {(isLiveMode ? ['10s'] : ['15s', '30s', '60s', '3m']).map(d => (
                    <TouchableOpacity
                      key={d}
                      onPress={() => setActiveDuration(d)}
                      style={[
                        styles.durationItem,
                        activeDuration === d ? styles.durationItemActive : null,
                      ]}>
                      <Text style={styles.durationText}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                )}
                <View style={[styles.mainBottomRow, {paddingHorizontal: 20}]}>
                  {!isLiveMode && (
                  <TouchableOpacity style={styles.bottomAuxButton} onPress={() => setFilterVisible(true)}>
                    <View style={styles.effectsIconContainer}>
                       <MaterialCommunityIcons name="filter-variant" size={30} color={COLORS.primaryOrange} />
                    </View>
                    <Text style={styles.bottomAuxLabel}>Filters</Text>
                  </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={[
                      styles.recordButtonOuter,
                      isLiveMode && styles.liveButtonOuter,
                      isRecording && styles.recordButtonRecording,
                    ]}
                    onPress={handleRecordPress}>
                    <View style={[styles.recordButtonInner, isLiveMode && styles.liveButtonInner]}>
                       <MaterialCommunityIcons
                         name={isLiveMode ? 'broadcast' : isRecording ? 'stop' : 'videocam'}
                         size={36}
                         color="white"
                       />
                    </View>
                  </TouchableOpacity>
                  {!isLiveMode && (
                  <TouchableOpacity style={styles.bottomAuxButton} onPress={pickVideo}>
                    <View style={styles.uploadIconContainer}>
                      <Ionicons name="cloud-upload-outline" size={30} color="white" />
                    </View>
                    <Text style={styles.bottomAuxLabel}>Upload</Text>
                  </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>
          )}
          </View>
        </CameraShortsView>
      ) : (
        <View style={styles.background}>
          {shouldPlayPreviewVideo ? (
            <Video
              source={{uri: pickedVideo.uri}}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
              repeat
              paused={false}
              muted={false}
              rate={speedFactor}
              ignoreSilentSwitch="ignore"
              playInBackground={false}
              playWhenInactive={false}
            />
          ) : pickedVideo?.uri ? (
            <View style={[StyleSheet.absoluteFillObject, styles.previewStopped]} />
          ) : (
            <ImageBackground
              source={{
                uri: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
              }}
              style={styles.background}
              resizeMode="cover"
            />
          )}
          {filterOverlayStyle && (
            <View
              style={[
                styles.filterOverlay,
                {
                  backgroundColor: filterOverlayStyle.backgroundColor,
                  opacity: filterOverlayStyle.opacity,
                },
              ]}
              pointerEvents="none"
            />
          )}
          {beautyOverlayStyle && (
            <View
              style={[
                styles.filterOverlay,
                {
                  backgroundColor: beautyOverlayStyle.backgroundColor,
                  opacity: beautyOverlayStyle.opacity,
                },
              ]}
              pointerEvents="none"
            />
          )}
          <View style={styles.overlay}>
            {isEditing ? (
              <View style={styles.editingModeOverlay}>
                <View style={[styles.progressBarContainer, {top: insets.top}]}>
                  <View style={styles.progressBarActive} />
                  <View style={styles.progressBarInactive} />
                </View>
                <View style={[styles.topControls, {marginTop: insets.top + 15}]}>
                  <TouchableOpacity onPress={() => setIsEditing(false)} style={styles.closeButton}>
                    <Ionicons name="arrow-back" size={30} color="white" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setSoundsVisible(true)}
                    style={styles.selectedSoundPill}>
                    <Ionicons name="musical-notes" size={16} color="white" />
                    <Text style={styles.selectedSoundText} numberOfLines={1}>
                      {selectedSound ? `${selectedSound.title} - ${selectedSound.artist}` : 'Add sound'}
                    </Text>
                  </TouchableOpacity>
                  <View style={{width: 40}} />
                </View>
                <View style={[styles.rightSidebar, {top: insets.top + 80}]}>
                  <ActionItem icon="format-text" label="Text" iconType="MaterialCommunityIcons" />
                  <ActionItem icon="emoticon-outline" label="Sticker" iconType="MaterialCommunityIcons" />
                  <ActionItem icon="face-recognition" label="Beauty" iconType="MaterialCommunityIcons" onPress={() => setBeautyVisible(true)} />
                  <ActionItem icon="filter-variant" label="Filters" iconType="MaterialCommunityIcons" onPress={() => setFilterVisible(true)} />
                  <ActionItem icon="speedometer-outline" label="Speed" onPress={() => setSpeedVisible(true)} />
                  <ActionItem icon="closed-caption-outline" label="Subtit..." iconType="MaterialCommunityIcons" />
                  <ActionItem
                    icon="chatbubble-ellipses-outline"
                    label="Comments"
                    onPress={() => setRecordCommentsModalVisible(true)}
                  />
                </View>
                <View style={[styles.bottomEditingRow, {paddingBottom: insets.bottom + 20}]}>
                  <TouchableOpacity style={styles.draftButton}>
                    <Text style={styles.draftButtonText}>Draft</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.nextButton}
                    onPress={() => setAddDetailsVisible(true)}>
                    <Text style={styles.nextButtonText}>Next</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={styles.recordingModeOverlay}>
                <View style={[styles.topControls, {marginTop: insets.top + 10}]}>
                  <TouchableOpacity onPress={exitToHomeOne} style={styles.closeButton}>
                    <Ionicons name="close" size={30} color="white" />
                  </TouchableOpacity>
                  <View style={styles.topRightRow}>
                    <TouchableOpacity style={styles.addSoundPill} onPress={() => setSoundsVisible(true)}>
                      <Ionicons name="musical-notes" size={18} color="white" />
                      <Text style={styles.addSoundText} numberOfLines={1}>
                        {selectedSound?.title || 'Add Sound'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.liveModePill, isLiveMode && styles.liveModePillActive]}
                      onPress={() => setIsLiveMode(!isLiveMode)}>
                      <MaterialCommunityIcons name="broadcast" size={16} color={isLiveMode ? '#fff' : 'rgba(255,255,255,0.9)'} />
                      <Text style={[styles.liveModeText, isLiveMode && styles.liveModeTextActive]}>Live</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={[styles.rightSidebar, {top: insets.top + 80}]}>
                  <ActionItem icon="camera-reverse-outline" label="Flip" onPress={toggleCameraFlip} />
                  <ActionItem icon="speedometer-outline" label="Speed" onPress={() => setSpeedVisible(true)} />
                  <ActionItem icon="filter-variant" label="Filters" iconType="MaterialCommunityIcons" onPress={() => setFilterVisible(true)} />
                  <ActionItem icon="face-recognition" label="Beauty" iconType="MaterialCommunityIcons" onPress={() => setBeautyVisible(true)} />
                  <ActionItem icon="timer-outline" label="Timer" onPress={() => setTimerVisible(true)} />
                  <ActionItem
                    icon="chatbubble-ellipses-outline"
                    label="Comments"
                    onPress={() => setRecordCommentsModalVisible(true)}
                  />
                  <ActionItem
                    icon={torchOn ? 'flash' : 'flash-outline'}
                    label="Flash"
                    onPress={toggleFlash}
                    active={torchOn}
                  />
                </View>
                <View style={[styles.bottomControls, {paddingBottom: insets.bottom + 20}]}>
                  {!isLiveMode && (
                    <View style={styles.durationSelector}>
                      {(isLiveMode ? ['10s'] : ['15s', '30s', '60s', '3m']).map(d => (
                        <TouchableOpacity
                          key={d}
                          onPress={() => setActiveDuration(d)}
                          style={[styles.durationItem, activeDuration === d ? styles.durationItemActive : null]}>
                          <Text style={styles.durationText}>{d}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  <View style={[styles.mainBottomRow, {paddingHorizontal: 20}]}>
                    {!isLiveMode && (
                      <TouchableOpacity style={styles.bottomAuxButton} onPress={() => setFilterVisible(true)}>
                        <View style={styles.effectsIconContainer}>
                          <MaterialCommunityIcons name="filter-variant" size={30} color={COLORS.primaryOrange} />
                        </View>
                        <Text style={styles.bottomAuxLabel}>Filters</Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.recordButtonOuter,
                        isLiveMode && styles.liveButtonOuter,
                        isRecording && styles.recordButtonRecording,
                      ]}
                      onPress={handleRecordPress}>
                      <View style={[styles.recordButtonInner, isLiveMode && styles.liveButtonInner]}>
                        <MaterialCommunityIcons name={isLiveMode ? 'broadcast' : isRecording ? 'stop' : 'videocam'} size={36} color="white" />
                      </View>
                    </TouchableOpacity>
                    {!isLiveMode && (
                      <TouchableOpacity style={styles.bottomAuxButton} onPress={pickVideo}>
                        <View style={styles.uploadIconContainer}>
                          <Ionicons name="cloud-upload-outline" size={30} color="white" />
                        </View>
                        <Text style={styles.bottomAuxLabel}>Upload</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      )}
      <SoundsModal
        visible={soundsVisible}
        onClose={() => setSoundsVisible(false)}
        onSelect={handleSoundSelect}
        selectedSoundId={selectedSound?.id}
      />
      <CommentsSettingsModal
        visible={recordCommentsModalVisible}
        onClose={() => setRecordCommentsModalVisible(false)}
        initialValue={commentsSetting}
        onApply={v => {
          setCommentsSetting(v);
          setRecordCommentsModalVisible(false);
        }}
      />
      <AddDetailsModal
        key={detailsModalKey}
        visible={addDetailsVisible}
        onClose={() => setAddDetailsVisible(false)}
        onUploadSuccess={() => {
          resetCreationState(initialLive);
          exitToHomeOne();
        }}
        shortsMetadata={shortsMetadata}
        isLive={isLiveMode}
      />
      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onSelect={setSelectedFilter}
        onPreviewChange={setSelectedFilter}
        selectedFilter={selectedFilter}
      />
      <TimerModal
        visible={timerVisible}
        onClose={() => setTimerVisible(false)}
        onSelect={setSelectedTimer}
        selectedTimer={selectedTimer}
      />
      <BeautyModal
        visible={beautyVisible}
        onClose={() => setBeautyVisible(false)}
        onApply={setBeautyLevel}
        initialLevel={beautyLevel}
      />
      <SpeedModal
        visible={speedVisible}
        onClose={() => setSpeedVisible(false)}
        onSelect={setSpeedFactor}
        selectedSpeed={speedFactor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  background: {
    flex: 1,
  },
  previewStopped: {
    backgroundColor: '#000',
  },
  filterOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  overlay: {
    flex: 1,
  },
  recordingModeOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  editingModeOverlay: {
    flex: 1,
    justifyContent: 'space-between',
  },
  progressBarContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    height: 4,
    flexDirection: 'row',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarActive: {
    flex: 0.65,
    backgroundColor: COLORS.primaryOrange,
  },
  progressBarInactive: {
    flex: 0.35,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  closeButton: {
    padding: 5,
  },
  addSoundPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    maxWidth: width * 0.42,
  },
  addSoundText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  topRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  liveModePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  liveModePillActive: {
    backgroundColor: '#E53935',
  },
  liveModeText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  liveModeTextActive: {
    color: 'white',
  },
  liveButtonOuter: {
    borderColor: '#E53935',
  },
  liveButtonInner: {
    backgroundColor: '#E53935',
  },
  selectedSoundPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    maxWidth: width * 0.6,
  },
  selectedSoundText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 6,
  },
  rightSidebar: {
    position: 'absolute',
    right: 15,
    alignItems: 'center',
  },
  actionItem: {
    alignItems: 'center',
    marginBottom: 20,
  },
  shadow: {
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 3,
  },
  actionLabel: {
    color: 'white',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
  bottomControls: {
    paddingBottom: 30,
    alignItems: 'center',
  },
  durationSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: 20,
    padding: 4,
    marginBottom: 20,
  },
  durationItem: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 15,
  },
  durationItemActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  durationText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  mainBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 30,
  },
  recordButtonOuter: {
    width: 86,
    height: 86,
    borderRadius: 43,
    borderWidth: 4,
    borderColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  recordButtonRecording: {
    borderColor: '#FF4444',
    backgroundColor: 'rgba(255,68,68,0.2)',
  },
  countdownOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  countdownText: {
    fontSize: 120,
    fontWeight: 'bold',
    color: 'white',
  },
  recordButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.primaryOrange,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomAuxButton: {
    alignItems: 'center',
  },
  effectsIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bottomAuxLabel: {
    color: 'white',
    fontSize: 12,
    marginTop: 6,
    fontWeight: '500',
  },
  bottomEditingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 20,
    width: '100%',
  },
  draftButton: {
    flex: 1,
    backgroundColor: '#FFF2B2',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  draftButtonText: {
    color: COLORS.primaryOrange,
    fontSize: 18,
    fontWeight: 'bold',
  },
  nextButton: {
    flex: 1,
    backgroundColor: COLORS.primaryOrange,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  nextButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default CreateShortsScreen;
