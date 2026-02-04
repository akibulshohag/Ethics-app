import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ImageBackground,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import EffectsModal from '../components/EffectsModal';
import SoundsModal from '../components/SoundsModal';

const {width, height} = Dimensions.get('window');

const CreateShortsScreen = ({navigation}) => {
  const [activeDuration, setActiveDuration] = useState('15s');
  const [effectsVisible, setEffectsVisible] = useState(false);
  const [soundsVisible, setSoundsVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedSound, setSelectedSound] = useState(null);
  const insets = useSafeAreaInsets();

  const handleSoundSelect = (sound) => {
    setSelectedSound(sound);
    setSoundsVisible(false);
    setIsEditing(true);
  };

  const ActionItem = ({icon, label, iconType = 'Ionicons'}) => {
    const IconComp =
      iconType === 'MaterialCommunityIcons'
        ? MaterialCommunityIcons
        : iconType === 'MaterialIcons'
        ? MaterialIcons
        : Ionicons;
    return (
      <TouchableOpacity style={styles.actionItem}>
        <IconComp name={icon} size={28} color="white" style={styles.shadow} />
        <Text style={styles.actionLabel}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ImageBackground
        source={{uri: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80'}}
        style={styles.background}
        resizeMode="cover">
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
                 <ActionItem icon="face-recognition" label="Beauty" iconType="MaterialCommunityIcons" />
                 <ActionItem icon="filter-variant" label="Filters" iconType="MaterialCommunityIcons" />
                 <ActionItem icon="speedometer-outline" label="Speed" />
                 <ActionItem icon="closed-caption-outline" label="Subtit..." iconType="MaterialCommunityIcons" />
                 <ActionItem icon="comment-outline" label="Com..." iconType="MaterialCommunityIcons" />
              </View>

              <View style={[styles.bottomEditingRow, { paddingBottom: insets.bottom + 20 }]}>
                <TouchableOpacity style={styles.draftButton}>
                  <Text style={styles.draftButtonText}>Draft</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.nextButton}>
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
                <TouchableOpacity 
                  style={styles.addSoundPill}
                  onPress={() => setSoundsVisible(true)}>
                  <Ionicons name="musical-notes" size={18} color="white" />
                  <Text style={styles.addSoundText}>Add Sound</Text>
                </TouchableOpacity>
                <View style={{width: 40}} />
              </View>
              <View style={[styles.rightSidebar, { top: insets.top + 80 }]}>
                <ActionItem icon="camera-reverse-outline" label="Flip" />
                <ActionItem icon="speedometer-outline" label="Speed" />
                <ActionItem icon="filter-variant" label="Filters" iconType="MaterialCommunityIcons" />
                <ActionItem icon="face-recognition" label="Beauty" iconType="MaterialCommunityIcons" />
                <ActionItem icon="timer-outline" label="Timer" />
                <ActionItem icon="comment-outline" label="Comments" iconType="MaterialCommunityIcons" />
                <ActionItem icon="flash" label="Flash" />
              </View>
              <View style={[styles.bottomControls, { paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.durationSelector}>
                  {['3m', '60s', '15s'].map(d => (
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
                <View style={styles.mainBottomRow}>
                  <TouchableOpacity style={styles.bottomAuxButton} onPress={() => setEffectsVisible(true)}>
                    <View style={styles.effectsIconContainer}>
                       <MaterialCommunityIcons name="heart-multiple" size={30} color="#FF8C00" />
                    </View>
                    <Text style={styles.bottomAuxLabel}>Effects</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.recordButtonOuter}>
                    <View style={styles.recordButtonInner}>
                       <Ionicons name="videocam" size={36} color="white" />
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.bottomAuxButton}>
                    <View style={styles.uploadIconContainer}>
                      <Ionicons name="cloud-upload-outline" size={30} color="white" />
                    </View>
                    <Text style={styles.bottomAuxLabel}>Upload</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>
      </ImageBackground>
      <EffectsModal 
        visible={effectsVisible}
        onClose={() => setEffectsVisible(false)}
      />
      <SoundsModal
        visible={soundsVisible}
        onClose={() => setSoundsVisible(false)}
        onSelect={handleSoundSelect}
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
