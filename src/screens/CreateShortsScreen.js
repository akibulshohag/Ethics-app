import React, {useState, useRef, useEffect} from 'react';
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
import {useSelector} from 'react-redux';
import SoundsModal from '../components/SoundsModal';
import AddDetailsModal from '../components/AddDetailsModal';
import FilterModal from '../components/FilterModal';
import TimerModal from '../components/TimerModal';
import BeautyModal from '../components/BeautyModal';
import SpeedModal from '../components/SpeedModal';
import CameraShortsView from '../components/CameraShortsView';
import {getFilterOverlayStyle} from '../constants/filterEffects';

const {width, height} = Dimensions.get('window');

const CreateShortsScreen = ({navigation, route}) => {
  const initialLive = route?.params?.isLive === true;
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
  const insets = useSafeAreaInsets();

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
    };
  }, []);

  const stopRecording = () => {
    if (!isRecordingRef.current) return;
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

  const handleRecordingFinished = (video) => {
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

  const handleRecordPress = () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    if (showCamera && !cameraRef.current?.startRecording) return;
    const start = () => {
      if (!cameraRef.current?.startRecording) return;
      isRecordingRef.current = true;
      setIsRecording(true);
      cameraRef.current.startRecording({
        onRecordingFinished: handleRecordingFinished,
        onRecordingError: (e) => {
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
          start();
        }
      }, 1000);
    } else {
      start();
    }
  };

  const pickVideo = () => {
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

  const handleSoundSelect = (sound) => {
    setSelectedSound(sound);
    setSoundsVisible(false);
    setIsEditing(true);
  };

  const ActionItem = ({icon, label, iconType = 'Ionicons', onPress}) => {
    const IconComp =
      iconType === 'MaterialCommunityIcons'
        ? MaterialCommunityIcons
        : iconType === 'MaterialIcons'
        ? MaterialIcons
        : Ionicons;
    return (
      <TouchableOpacity style={styles.actionItem} onPress={onPress}>
        <IconComp name={icon} size={28} color="white" style={styles.shadow} />
        <Text style={styles.actionLabel}>{label}</Text>
      </TouchableOpacity>
    );
  };

  const filterOverlayStyle = getFilterOverlayStyle(selectedFilter);

  const shortsMetadata = {
    activeDuration,
    selectedSound,
    selectedFilter,
    selectedTimer,
    beautyLevel,
    speedFactor,
    cameraFacing,
    isLiveMode,
    userId: user?.id,
    videoUri: pickedVideo?.uri,
    videoType: pickedVideo?.type,
    videoName: pickedVideo?.name,
    thumbnailUri: pickedThumbnail?.uri,
    thumbnailType: pickedThumbnail?.type,
    thumbnailName: pickedThumbnail?.name,
  };

  const toggleCameraFlip = () => {
    setCameraFacing(f => (f === 'back' ? 'front' : 'back'));
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
          isActive={true}>
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
                 <ActionItem icon="comment-outline" label="Com..." iconType="MaterialCommunityIcons" />
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
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                  <Ionicons name="close" size={30} color="white" />
                </TouchableOpacity>
                <View style={styles.topRightRow}>
                  <TouchableOpacity 
                    style={styles.addSoundPill}
                    onPress={() => setSoundsVisible(true)}>
                    <Ionicons name="musical-notes" size={18} color="white" />
                    <Text style={styles.addSoundText}>Add Sound</Text>
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
                <ActionItem icon="comment-outline" label="Comments" iconType="MaterialCommunityIcons" />
                <ActionItem icon="flash" label="Flash" />
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
                       <MaterialCommunityIcons name="filter-variant" size={30} color="#FF8C00" />
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
          {pickedVideo?.uri ? (
            <Video
              source={{uri: pickedVideo.uri}}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
              repeat
              paused={false}
              muted={false}
            />
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
                  <ActionItem icon="comment-outline" label="Com..." iconType="MaterialCommunityIcons" />
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
                  <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                    <Ionicons name="close" size={30} color="white" />
                  </TouchableOpacity>
                  <View style={styles.topRightRow}>
                    <TouchableOpacity style={styles.addSoundPill} onPress={() => setSoundsVisible(true)}>
                      <Ionicons name="musical-notes" size={18} color="white" />
                      <Text style={styles.addSoundText}>Add Sound</Text>
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
                  <ActionItem icon="comment-outline" label="Comments" iconType="MaterialCommunityIcons" />
                  <ActionItem icon="flash" label="Flash" />
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
                          <MaterialCommunityIcons name="filter-variant" size={30} color="#FF8C00" />
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
      />
      <AddDetailsModal
        visible={addDetailsVisible}
        onClose={() => setAddDetailsVisible(false)}
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
    backgroundColor: '#FF8C00',
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
    backgroundColor: '#FF8C00',
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
    color: '#FF8C00',
    fontSize: 18,
    fontWeight: 'bold',
  },
  nextButton: {
    flex: 1,
    backgroundColor: '#FF8C00',
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
