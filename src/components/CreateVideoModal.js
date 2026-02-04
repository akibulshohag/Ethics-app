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

const { height } = Dimensions.get('window');

const CreateVideoModal = ({ visible, onClose }) => {
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
                <Text style={styles.headerText}>Create</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.optionsContainer}>
                {/* Create a Short */}
                <TouchableOpacity style={styles.optionItem} onPress={onClose}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="videocam" size={24} color="#FF8C00" />
                  </View>
                  <Text style={styles.optionText}>Create a Short</Text>
                </TouchableOpacity>

                {/* Upload a Video */}
                <TouchableOpacity style={styles.optionItem} onPress={onClose}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="cloud-upload" size={24} color="#FF8C00" />
                  </View>
                  <Text style={styles.optionText}>Upload a Video</Text>
                </TouchableOpacity>

                {/* Go Live */}
                <TouchableOpacity style={styles.optionItem} onPress={onClose}>
                  <View style={styles.iconContainer}>
                    <Ionicons name="play-circle" size={24} color="#FF8C00" />
                  </View>
                  <Text style={styles.optionText}>Go Live</Text>
                </TouchableOpacity>
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
    minHeight: 280,
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
    paddingVertical: 15,
    alignItems: 'center',
  },
  headerText: {
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
