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

const CreateReelScreen = () => {
  const navigation = useNavigation();
  const steps = [
    { id: 1, label: 'Upload' },
    { id: 2, label: 'Edit' },
    { id: 3, label: 'Caption' },
    { id: 4, label: 'Preview' },
    { id: 5, label: 'Schedule' },
  ];

  return (
    <SafeAreaView style={styles.safeTop} edges={['top']}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
        <TouchableOpacity>
          <Icon name="chevron-left" color="white" size={28} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Create Reel</Text>
          <Text style={styles.headerSubtitle}>
            Upload, edit and Publish to all platforms
          </Text>
        </View>
        <Image
          source={{ uri: 'https://via.placeholder.com/40' }}
          style={styles.profilePic}
        />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
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
            Upload your reel to get started. You can trim, add music, text, and
            more in the next step
          </Text>

          {/* Upload Area */}
          <View style={styles.uploadBox}>
            <View style={styles.uploadIconCircle}>
              <Icon name="upload" color="#F5A623" size={30} />
            </View>
            <Text style={styles.uploadTitle}>Upload Video</Text>
            <Text style={styles.uploadMeta}>
              MP4, MOV or WebM Max 2GB 60seconds
            </Text>
            <Text style={styles.uploadHint}>
              vertical video (9:16) perform better
            </Text>

            <TouchableOpacity style={styles.uploadButton}>
              <Icon name="upload" color="white" size={18} />
              <Text style={styles.uploadButtonText}>Tap to Upload</Text>
            </TouchableOpacity>
            <Text style={styles.dragDropText}>
              or drag and drop your file here
            </Text>
          </View>

          {/* Thumbnail Section */}
          <Text style={styles.sectionTitle}>Select Thumbnail</Text>
          <Text style={styles.sectionSubtitle}>
            A great thumbnail grabs attention
          </Text>

          <View style={styles.thumbnailRow}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=300',
              }}
              style={styles.thumbnailPreview}
            />
            <TouchableOpacity style={styles.thumbnailPicker}>
              <Icon name="camera" color="#F5A623" size={24} />
              <Text style={styles.thumbPickerTitle}>Upload Video</Text>
              <Text style={styles.thumbPickerSub}>Tab to upload</Text>
            </TouchableOpacity>
          </View>

          {/* Info Stats */}
          <View style={styles.statsRow}>
            <StatBox
              icon={<Icon name="clock-outline" size={16} color="#555" />}
              label="Duration"
              value="0:22"
            />
            <StatBox
              icon={<Icon name="cellphone" size={16} color="#555" />}
              label="Format"
              value="0:22"
              subValue="Vertical"
            />
            <StatBox
              icon={<Icon name="upload" size={16} color="#555" />}
              label="Quality"
              value="1080p"
              subValue="Recommended"
            />
          </View>

          {/* Next Button */}
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => navigation.navigate('PostEditNew')}
          >
            <Text style={styles.nextButtonText}>Next</Text>
            <Icon name="arrow-right" color="white" size={20} />
          </TouchableOpacity>

          {/* Safety Footer */}
          <View style={styles.safetyFooter}>
            <Icon name="shield-check" size={14} color="#AAA" />
            <Text style={styles.safetyText}>
              you content is safe and only visible to you
            </Text>
          </View>
          </View>
        </ScrollView>
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
  profilePic: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.5)',
  },

  scrollView: { backgroundColor: '#F8F8F8' },
  scrollContent: { paddingBottom: 40 },

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

  uploadBox: {
    borderWidth: 1,
    borderColor: '#F5A623',
    borderStyle: 'dashed',
    borderRadius: 15,
    padding: 25,
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
    marginVertical: 15,
  },
  uploadIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FFE6C0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadTitle: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  uploadMeta: { fontSize: 10, color: '#666', marginTop: 10 },
  uploadHint: { fontSize: 10, color: '#666' },
  uploadButton: {
    backgroundColor: '#F5A623',
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 15,
    alignItems: 'center',
  },
  uploadButtonText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },
  dragDropText: { fontSize: 11, color: '#AAA', marginTop: 10 },

  thumbnailRow: { flexDirection: 'row', marginVertical: 15, height: 100 },
  thumbnailPreview: { flex: 1.5, borderRadius: 10, marginRight: 10 },
  thumbnailPicker: {
    flex: 1,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#F5A623',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF9F0',
  },
  thumbPickerTitle: { fontSize: 11, fontWeight: 'bold', marginTop: 5 },
  thumbPickerSub: { fontSize: 9, color: '#777' },

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

export default CreateReelScreen;
