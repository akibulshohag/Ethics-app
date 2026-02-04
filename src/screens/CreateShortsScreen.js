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

const {width, height} = Dimensions.get('window');

const CreateShortsScreen = ({navigation}) => {
  const [activeDuration, setActiveDuration] = useState('15s');
  const insets = useSafeAreaInsets();

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
          <View style={[styles.topControls, { marginTop: insets.top + 10 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
              <Ionicons name="close" size={30} color="white" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.addSoundPill}>
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
            <ActionItem icon="chat-bubble-outline" label="Com..." />
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
                    activeDuration === d && styles.durationItemActive,
                  ]}>
                  <Text style={styles.durationText}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.mainBottomRow}>
              <TouchableOpacity style={styles.bottomAuxButton}>
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
      </ImageBackground>
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
    justifyContent: 'space-between',
  },
  topControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 10,
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
  rightSidebar: {
    position: 'absolute',
    right: 15,
    top: height * 0.15,
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
});

export default CreateShortsScreen;
