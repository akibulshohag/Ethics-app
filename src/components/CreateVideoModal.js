import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {useNavigation} from '@react-navigation/native';
import {clearReelEditorDraft, newShortSessionKey} from '../utils/reelDraftStorage';
import {navigateToRootRoute} from '../utils/navigateToRootRoute';

const { height } = Dimensions.get('window');

const CreateVideoModal = ({
  visible,
  onClose,
  onCreatePost: onCreatePostProp,
  onCreateShort: onCreateShortProp,
  onUploadVideo: onUploadVideoProp,
  onGoLive: onGoLiveProp,
  showFeaturedVideoOption,
  onUploadFeaturedVideo: onUploadFeaturedVideoProp,
}) => {
  const navigation = useNavigation();

  const handleCreateShort = () => {
    onClose?.();
    if (onCreateShortProp) {
      onCreateShortProp();
    } else {
      navigation.navigate('CreateShortsScreen', {
        isLive: false,
        sessionKey: newShortSessionKey(),
      });
    }
  };

  const handleCreatePost = async () => {
    onClose?.();
    if (onCreatePostProp) {
      onCreatePostProp();
    } else {
      await clearReelEditorDraft();
      navigateToRootRoute(navigation, 'PostCreateNew', {
        freshSession: newShortSessionKey(),
      });
    }
  };

  const handleUploadVideo = () => {
    onClose?.();
    if (onUploadVideoProp) {
      onUploadVideoProp();
    } else {
      navigation.navigate('Library', { screen: 'UploadVideoScreen' });
    }
  };

  const handleGoLive = () => {
    onClose?.();
    if (onGoLiveProp) {
      onGoLiveProp();
    } else {
      navigation.navigate('CreateShortsScreen', {
        isLive: true,
        sessionKey: newShortSessionKey(),
      });
    }
  };

  const handleUploadFeaturedVideo = () => {
    onClose?.();
    if (onUploadFeaturedVideoProp) {
      onUploadFeaturedVideoProp();
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              {/* Top Handle indicator */}
              <View style={styles.handle} />

              <View style={styles.header}>
                <View style={styles.headerSide} />
                <Text style={styles.headerText}>Create</Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.headerSide}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                  accessibilityRole="button"
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={26} color="#333" />
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <View style={styles.optionsContainer}>
                {/* Create a Post */}
                <TouchableOpacity style={styles.optionItem} onPress={handleCreatePost}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="create-outline" size={24} color="#FF8C00" />
                  </View>
                  <Text style={styles.optionText}>Create a post</Text>
                </TouchableOpacity>

                {/* Create a Short */}
                <TouchableOpacity style={styles.optionItem} onPress={handleCreateShort}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="videocam" size={24} color="#FF8C00" />
                  </View>
                  <Text style={styles.optionText}>Create a Short</Text>
                </TouchableOpacity>

                {/* Upload a Video */}
                <TouchableOpacity style={styles.optionItem} onPress={handleUploadVideo}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="cloud-upload" size={24} color="#FF8C00" />
                  </View>
                  <Text style={styles.optionText}>Upload a Video</Text>
                </TouchableOpacity>

                {/* Go Live */}
                <TouchableOpacity style={styles.optionItem} onPress={handleGoLive}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="play-circle" size={24} color="#FF8C00" />
                  </View>
                  <Text style={styles.optionText}>Go Live</Text>
                </TouchableOpacity>

                {showFeaturedVideoOption ? (
                  <TouchableOpacity
                    style={styles.optionItem}
                    onPress={handleUploadFeaturedVideo}
                  >
                    <View style={styles.iconContainer}>
                      <Ionicons name="star" size={24} color="#FF8C00" />
                    </View>
                    <Text style={styles.optionText}>Upload featured video</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    minHeight: 340,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  headerSide: {
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginHorizontal: 0,
    marginBottom: 10,
  },
  optionsContainer: {
    paddingHorizontal: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF2F2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
});

export default CreateVideoModal;
