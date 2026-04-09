import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Image,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const EditReelScreen = () => {
  const navigation = useNavigation();
  const steps = ['Upload', 'Edit', 'Caption', 'Preview', 'Schedule'];
  const editOptions = ['Restaurant ad Style', 'Trend ad'];

  return (
    <SafeAreaView style={styles.safeTop} edges={['top']}>
      <View style={styles.container}>
        <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="chevron-left" color="white" size={28} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Edit Reel</Text>
          <Text style={styles.headerSubtitle}>
            Upload, edit and Publish to all platforms
          </Text>
        </View>
        <Image
          source={{ uri: 'https://via.placeholder.com/40' }}
          style={styles.profilePic}
        />
        </View>

        <View style={styles.stepperContainer}>
        {steps.map((label, index) => (
          <View key={label} style={styles.stepItem}>
            <View style={[styles.stepCircle, index === 1 && styles.activeStepCircle]}>
              <Text style={[styles.stepNumber, index === 1 && styles.activeStepText]}>
                {index + 1}
              </Text>
            </View>
            <Text style={[styles.stepLabel, index === 1 && styles.activeLabel]}>
              {label}
            </Text>
          </View>
        ))}
        </View>

        <View style={styles.editorContainer}>
        <View style={styles.videoPreviewContainer}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1547584370-2cc98b8b8dc8?q=80&w=600',
            }}
            style={styles.mainVideo}
            resizeMode="cover"
          />
          <View style={styles.playOverlay}>
            <View style={styles.pauseCircle}>
              <Icon name="pause" color="black" size={24} />
            </View>
          </View>
        </View>

        <View style={styles.timelineRow}>
          <Text style={styles.timeText}>0:20.7</Text>
          <View style={styles.progressBarBg}>
            <View style={styles.progressBarFill} />
            <View style={styles.progressHandle} />
          </View>
          <TouchableOpacity style={styles.addButton}>
            <Icon name="plus" color="white" size={12} />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.trimmerContainer}>
          <View style={styles.trimHandleLeft}>
            <View style={styles.trimArrow} />
          </View>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=400',
            }}
            style={styles.trimmerImage}
          />
          <View style={styles.trimHandleRight}>
            <View style={styles.trimArrow} />
          </View>
        </View>
        <View style={styles.timeMarkers}>
          <Text style={styles.markerText}>00</Text>
          <Text style={styles.markerText}>
            . . . . . . . . . . . . . . . . . . . . .0.22. . . . . . . . . . . . . . .
            . . . . . 0.22
          </Text>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.presetsScroll}
        >
          <TouchableOpacity style={styles.activePreset}>
            <Text style={styles.activePresetText}>Food Promo Style</Text>
            <Icon name="arrow-right" color="white" size={14} />
          </TouchableOpacity>
          {editOptions.map(opt => (
            <TouchableOpacity key={opt} style={styles.inactivePreset}>
              <Text style={styles.inactivePresetText}>{opt}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={styles.toolbar}>
          <ToolbarItem icon={<Icon name="wand" size={20} color="#BBB" />} label="Quality" />
          <ToolbarItem
            icon={<Icon name="content-cut" size={20} color="#BBB" />}
            label="Split"
          />
          <ToolbarItem icon={<Icon name="music" size={20} color="#BBB" />} label="Music" />
          <ToolbarItem
            icon={<Icon name="microphone" size={20} color="#BBB" />}
            label="Audio"
          />
          <ToolbarItem
            icon={<Icon name="format-text" size={20} color="#BBB" />}
            label="Text"
          />
          <ToolbarItem icon={<Icon name="auto-fix" size={20} color="#BBB" />} label="Effect" />
        </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => navigation.navigate('PostCaptionNew')}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Icon name="arrow-right" color="white" size={20} />
          </TouchableOpacity>
          <View style={styles.safetyFooter}>
            <Icon name="shield-check" size={14} color="#AAA" />
            <Text style={styles.safetyText}>
              you content is safe and only visible to you
            </Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const ToolbarItem = ({ icon, label }) => (
  <TouchableOpacity style={styles.toolbarItem}>
    {icon}
    <Text style={styles.toolbarLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safeTop: { flex: 1, backgroundColor: '#F5A623' },
  container: { flex: 1, backgroundColor: 'white' },
  header: {
    backgroundColor: '#F5A623',
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitleContainer: { flex: 1, marginLeft: 15 },
  headerTitle: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  headerSubtitle: { color: 'white', fontSize: 12, opacity: 0.9 },
  profilePic: { width: 40, height: 40, borderRadius: 20 },

  stepperContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    backgroundColor: 'white',
  },
  stepItem: { alignItems: 'center' },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeStepCircle: { borderColor: '#F5A623', borderWidth: 2, padding: 2 },
  stepNumber: { color: '#AAA', fontSize: 12 },
  activeStepText: { color: '#F5A623', fontWeight: 'bold' },
  stepLabel: { fontSize: 11, marginTop: 4, color: '#AAA' },
  activeLabel: { color: '#F5A623', fontWeight: 'bold' },

  editorContainer: { flex: 1, backgroundColor: '#222', paddingVertical: 15 },
  videoPreviewContainer: {
    width: width * 0.65,
    height: width * 0.8,
    alignSelf: 'center',
    borderRadius: 10,
    overflow: 'hidden',
  },
  mainVideo: { width: '100%', height: '100%' },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pauseCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  timeText: { color: 'white', fontSize: 12, marginRight: 10 },
  progressBarBg: {
    flex: 1,
    height: 4,
    backgroundColor: 'white',
    borderRadius: 2,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarFill: { width: '60%', height: '100%', backgroundColor: '#F5A623' },
  progressHandle: { width: 12, height: 12, borderRadius: 6, backgroundColor: 'white' },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 10,
  },
  addButtonText: { color: 'white', fontSize: 10, marginLeft: 4 },

  trimmerContainer: {
    height: 70,
    marginHorizontal: 20,
    marginTop: 15,
    flexDirection: 'row',
    alignItems: 'center',
  },
  trimmerImage: { flex: 1, height: '100%', opacity: 0.8, borderRadius: 4 },
  trimHandleLeft: {
    width: 30,
    height: '100%',
    backgroundColor: '#F5A623',
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trimHandleRight: {
    width: 30,
    height: '100%',
    backgroundColor: '#F5A623',
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trimArrow: {
    width: 0,
    height: 0,
    borderTopWidth: 5,
    borderBottomWidth: 5,
    borderLeftWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
    borderLeftColor: 'white',
  },

  timeMarkers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 40,
    marginTop: 5,
  },
  markerText: { color: '#777', fontSize: 10 },

  presetsScroll: { maxHeight: 40, marginTop: 20, paddingHorizontal: 15 },
  activePreset: {
    backgroundColor: '#F5A623',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    borderRadius: 8,
    marginRight: 10,
  },
  activePresetText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 5,
  },
  inactivePreset: {
    backgroundColor: '#333',
    paddingHorizontal: 15,
    borderRadius: 8,
    marginRight: 10,
    justifyContent: 'center',
  },
  inactivePresetText: { color: '#EEE', fontSize: 12 },

  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 30,
    paddingHorizontal: 10,
  },
  toolbarItem: { alignItems: 'center' },
  toolbarLabel: { color: '#BBB', fontSize: 11, marginTop: 5 },

  footer: { padding: 20, backgroundColor: 'white' },
  nextButton: {
    backgroundColor: '#F5A623',
    flexDirection: 'row',
    height: 50,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 10,
  },
  safetyFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  safetyText: { fontSize: 11, color: '#AAA', marginLeft: 5 },
});

export default EditReelScreen;
