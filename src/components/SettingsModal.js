
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { height } = Dimensions.get('window');

const OPTIONS = [
  { id: '1', label: 'Description', icon: 'text-document', type: 'entypo', iconName: 'file-text-outline', lib: 'MaterialCommunityIcons' },
  { id: '2', label: 'Captions', icon: 'closed-caption', type: 'material', iconName: 'closed-caption-outline', lib: 'MaterialCommunityIcons' },
  { id: '3', label: 'Not Interested', icon: 'eye-off', type: 'material', iconName: 'eye-off-outline', lib: 'MaterialCommunityIcons' },
  { id: '4', label: 'Don’t Recommend Channel', icon: 'account-cancel', type: 'material', iconName: 'close-circle-outline', lib: 'MaterialCommunityIcons' },
  { id: '5', label: 'Report', icon: 'flag', type: 'material', iconName: 'flag-outline', lib: 'Ionicons' },
];

const SettingsModal = ({ visible, onClose }) => {
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <View style={styles.dragHandle} />
              
              <Text style={styles.headerTitle}>More Option</Text>
              
              <View style={styles.divider} />

              <View style={styles.optionsContainer}>
                {OPTIONS.map((item) => (
                    <TouchableOpacity key={item.id} style={styles.optionItem} onPress={onClose}>
                        <View style={styles.iconContainer}>
                            {item.lib === 'Ionicons' ? (
                                <Ionicons name={item.iconName} size={26} color="#212121" />
                            ) : (
                                <MaterialCommunityIcons name={item.iconName} size={26} color="#212121" />
                            )}
                        </View>
                        <Text style={styles.optionText}>{item.label}</Text>
                    </TouchableOpacity>
                ))}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212121',
    textAlign: 'center',
    marginBottom: 20,
  },
  divider: {
    height: 1,
    backgroundColor: '#f2f2f2',
    marginBottom: 10,
  },
  optionsContainer: {
    paddingHorizontal: 20,
  },
  optionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 15,
  },
  iconContainer: {
      width: 40,
      alignItems: 'center', // Center icon in its fixed width
      marginRight: 10,
  },
  optionText: {
      fontSize: 16,
      color: '#212121',
      fontWeight: '500',
  }
});

export default SettingsModal;
