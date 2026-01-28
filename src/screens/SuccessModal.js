import React from 'react';
import { StyleSheet, View, Text, Modal, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SuccessModal = ({
  visible,
  onClose,
  message = 'Your account is ready to use. You will be redirected to the Home page in a few seconds..',
}) => {
  return (
    <Modal transparent={true} visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.decorationContainer}>
            <View style={styles.mainCircle}>
              <Icon name="account" size={60} color="#FFF" />
            </View>
            <View
              style={[
                styles.floatingCircle,
                { top: -10, left: -10, width: 20, height: 20 },
              ]}
            />
            <View
              style={[
                styles.floatingCircle,
                { top: 10, right: -15, width: 15, height: 15 },
              ]}
            />
            <View
              style={[
                styles.floatingCircle,
                { bottom: 20, left: -20, width: 12, height: 12 },
              ]}
            />
          </View>

          <Text style={styles.title}>Congratulations!</Text>

          <Text style={styles.message}>{message}</Text>

          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#FF7A00" />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 40,
    padding: 30,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  decorationContainer: {
    width: 120,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
  },
  mainCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF7A00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCircle: {
    position: 'absolute',
    borderRadius: 10,
    backgroundColor: '#FFAB66',
    opacity: 0.6,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#FF7A00',
    marginBottom: 15,
  },
  message: {
    fontSize: 16,
    color: '#424242',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  loaderContainer: {
    height: 60,
    justifyContent: 'center',
  },
});

export default SuccessModal;
