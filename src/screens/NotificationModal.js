import React from 'react';
import { StyleSheet, View, Text, Modal, TouchableOpacity } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const NotificationModal = ({ visible, onAllow, onDecline }) => {
  return (
    <Modal transparent={true} visible={visible} animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.decorationContainer}>
            <View style={styles.mainCircle}>
              <Icon name="bell" size={60} color="#FFF" />
            </View>
            <View
              style={[
                styles.floatingCircle,
                { top: -10, left: -5, width: 22, height: 22 },
              ]}
            />
            <View
              style={[
                styles.floatingCircle,
                { top: 15, right: -12, width: 18, height: 18 },
              ]}
            />
            <View
              style={[
                styles.floatingCircle,
                { bottom: 15, left: -18, width: 14, height: 14 },
              ]}
            />
          </View>

          <Text style={styles.title}>
            EatIx would live to send you Notifications
          </Text>

          <Text style={styles.message}>
            Notifications may include alerts, sounds, and icon badges. these can
            be configured in settings
          </Text>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={[styles.button, styles.declineButton]}
              onPress={onDecline}
            >
              <Text style={[styles.buttonText, styles.declineText]}>
                Don't Allow
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.allowButton]}
              onPress={onAllow}
            >
              <Text style={[styles.buttonText, styles.allowText]}>Allow</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 45,
    paddingVertical: 40,
    paddingHorizontal: 25,
    alignItems: 'center',
    elevation: 20,
  },
  decorationContainer: {
    width: 130,
    height: 130,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 35,
  },
  mainCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#FF7A00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCircle: {
    position: 'absolute',
    borderRadius: 11,
    backgroundColor: '#FFAB66',
    opacity: 0.7,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF7A00',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 32,
  },
  message: {
    fontSize: 15,
    color: '#424242',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    flex: 0.47,
    height: 58,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  declineButton: {
    backgroundColor: '#FFF4EB',
  },
  allowButton: {
    backgroundColor: '#FF7A00',
    elevation: 8,
    shadowColor: '#FF7A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  declineText: {
    color: '#FF7A00',
  },
  allowText: {
    color: '#FFF',
  },
});

export default NotificationModal;
