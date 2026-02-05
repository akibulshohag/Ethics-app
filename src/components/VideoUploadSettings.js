import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, BORDER_RADIUS } from '../constants/theme';
import SetVisibilityModal from './SetVisibilityModal';
import SelectAudienceModal from './SelectAudienceModal';
import CommentsSettingsModal from './CommentsSettingsModal';
import VideoDescriptionModal from './VideoDescriptionModal';

const { width } = Dimensions.get('window');

const VideoUploadSettings = ({ visible, onClose }) => {
  const [title, setTitle] = useState('');
  
  // Modal Visibility State
  const [descriptionModalVisible, setDescriptionModalVisible] = useState(false);
  const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
  const [audienceModalVisible, setAudienceModalVisible] = useState(false);
  const [commentsModalVisible, setCommentsModalVisible] = useState(false);

  // Values State
  const [description, setDescription] = useState('');
  const [hashtags, setHashtags] = useState([]);
  const [visibility, setVisibility] = useState('Public');
  const [audience, setAudience] = useState({ madeForKids: null, ageRestricted: null });
  const [comments, setComments] = useState('Allow all comments');

  const SettingItem = ({ icon, label, value, showArrow = true, isPlus = false, onPress }) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.iconContainer}>
          {icon.type === 'Ionicons' ? (
            <Ionicons name={icon.name} size={24} color="#333" />
          ) : (
            <MaterialCommunityIcons name={icon.name} size={24} color="#333" />
          )}
        </View>
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <View style={styles.settingRight}>
        {value && <Text style={styles.settingValue} numberOfLines={1}>{value}</Text>}
        {isPlus ? (
          <Ionicons name="add-circle-outline" size={24} color="#333" />
        ) : (
          showArrow && <Ionicons name="chevron-forward" size={20} color="#333" />
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={26} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Details</Text>
          <TouchableOpacity style={styles.headerButton}>
            <MaterialCommunityIcons name="dots-horizontal-circle-outline" size={26} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Cover Image Section */}
          <View style={styles.coverContainer}>
            <Image
              source={{ uri: 'https://images.unsplash.com/photo-1432139555190-58524dae6a55?q=80&w=1000&auto=format&fit=crop' }}
              style={styles.coverImage}
            />
            <View style={styles.coverOverlay}>
              <Text style={styles.changeCoverText}>Change cover</Text>
            </View>
          </View>

          {/* Title Section */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Add a Title</Text>
            <View style={styles.textInputContainer}>
              <TextInput
                style={styles.textInput}
                placeholder="Your title here..."
                placeholderTextColor="#999"
                value={title}
                onChangeText={setTitle}
                multiline
              />
            </View>
          </View>

          {/* Settings List */}
          <View style={styles.settingsList}>
            <SettingItem
              icon={{ type: 'Ionicons', name: 'pencil-outline' }}
              label="Add Description"
              onPress={() => setDescriptionModalVisible(true)}
            />
            <SettingItem
              icon={{ type: 'Ionicons', name: 'eye-outline' }}
              label="Visibility"
              value={visibility}
              onPress={() => setVisibilityModalVisible(true)}
            />
            <SettingItem
              icon={{ type: 'Ionicons', name: 'people-outline' }}
              label="Select Audience"
              onPress={() => setAudienceModalVisible(true)}
            />
            <SettingItem
              icon={{ type: 'Ionicons', name: 'calendar-outline' }}
              label="Schedule"
              value="Now"
            />
            <SettingItem
              icon={{ type: 'Ionicons', name: 'chatbubble-outline' }}
              label="Comments"
              value={comments}
              onPress={() => setCommentsModalVisible(true)}
            />
            <SettingItem
              icon={{ type: 'Ionicons', name: 'location-outline' }}
              label="Location"
            />
            <SettingItem
              icon={{ type: 'Ionicons', name: 'play-circle-outline' }}
              label="Add to Playlist"
              isPlus={true}
            />
          </View>

          {/* Upload Button */}
          <TouchableOpacity style={styles.uploadButton}>
            <Text style={styles.uploadButtonText}>Upload Video</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Sub Modals */}
        <VideoDescriptionModal
          visible={descriptionModalVisible}
          onClose={() => setDescriptionModalVisible(false)}
          description={description}
          setDescription={setDescription}
          hashtags={hashtags}
          setHashtags={setHashtags}
        />
        <SetVisibilityModal
          visible={visibilityModalVisible}
          onClose={() => setVisibilityModalVisible(false)}
          initialValue={visibility}
          onApply={(val) => setVisibility(val)}
        />
        <SelectAudienceModal
          visible={audienceModalVisible}
          onClose={() => setAudienceModalVisible(false)}
          initialValue={audience}
          onApply={(val) => setAudience(val)}
        />
        <CommentsSettingsModal
          visible={commentsModalVisible}
          onClose={() => setCommentsModalVisible(false)}
          initialValue={comments}
          onApply={(val) => setComments(val)}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    height: 56,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#000',
  },
  headerButton: {
    padding: 4,
  },
  scrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  coverContainer: {
    width: '100%',
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    marginTop: SPACING.md,
    backgroundColor: '#f0f0f0',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeCoverText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  inputSection: {
    marginTop: SPACING.xl,
  },
  inputLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: SPACING.md,
  },
  textInputContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 20,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    minHeight: 60,
  },
  textInput: {
    fontSize: 16,
    color: '#333',
    textAlignVertical: 'top',
  },
  settingsList: {
    marginTop: SPACING.xl,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.lg,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    marginRight: SPACING.lg,
  },
  settingLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'flex-end',
  },
  settingValue: {
    fontSize: 14,
    color: '#666',
    marginRight: 8,
    maxWidth: 120,
  },
  uploadButton: {
    backgroundColor: '#FF7F06',
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SPACING.xxxl,
  },
  uploadButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
});

export default VideoUploadSettings;
