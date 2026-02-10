import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { appSetUser } from '../redux/actions/appSlice';
import { config } from '../../config';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  COMMON_STYLES,
} from '../constants/theme';

const CreatePinScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.app);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [verifiedPin, setVerifiedPin] = useState('');
  const [isEditingPin, setIsEditingPin] = useState(false);
  const pinLength = 5;
  const isUpdateMode = !!user?.pin;

  const handleKeyPress = value => {
    if (pin.length < pinLength) {
      setPin(prev => prev + value);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleShowPin = async () => {
    // Show password verification modal first
    setShowPasswordModal(true);
  };

  const handleVerifyPassword = async () => {
    if (!password.trim()) {
      setTimeout(() => {
        Alert.alert('Error', 'Please enter your password');
      }, 100);
      return;
    }

    setLoading(true);
    try {
      // Call API to verify password and get PIN
      const response = await fetch(`${config.apiBaseUrl}/users/verify-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Incorrect password');
      }

      // Password verified, show PIN
      setVerifiedPin(data.pin || '* * * * *');
      setShowPasswordModal(false);
      setPassword('');
      setShowPinModal(true);
    } catch (error) {
      console.error('Verify password error:', error);
      setTimeout(() => {
        Alert.alert(
          'Error',
          error.message || 'Incorrect password. Please try again.',
        );
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePin = () => {
    setIsEditingPin(true);
    setPin('');
  };

  const handleSavePin = async () => {
    if (pin.length !== pinLength) {
      setTimeout(() => {
        Alert.alert('Error', 'Please enter a 5-digit PIN');
      }, 100);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${config.apiBaseUrl}/users/set-pin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          pin: pin,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to save PIN');
      }

      const updatedUser = {
        ...user,
        pin: true,
      };

      dispatch(appSetUser(updatedUser));

      setTimeout(() => {
        Alert.alert(
          'Success',
          isEditingPin || isUpdateMode
            ? 'PIN updated successfully'
            : 'PIN created successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                if (isEditingPin || isUpdateMode) {
                  setIsEditingPin(false);
                  navigation.goBack();
                } else {
                  navigation.navigate('SetFingerprint');
                }
              },
            },
          ],
        );
      }, 100);
    } catch (error) {
      console.error('Save PIN error:', error);
      setTimeout(() => {
        Alert.alert(
          'Error',
          error.message || 'Failed to save PIN. Please try again.',
        );
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const renderPinInputs = () => {
    const inputs = [];
    for (let i = 0; i < pinLength; i++) {
      const isFocused = pin.length === i;
      const isFilled = pin.length > i;

      inputs.push(
        <View
          key={i}
          style={[
            styles.pinBox,
            isFocused && styles.pinBoxFocused,
            isFilled && !isFocused && styles.pinBoxFilled,
          ]}
        >
          {isFilled ? (
            i < pin.length - 2 ? (
              <View style={styles.dot} />
            ) : (
              <Text style={styles.pinText}>{pin[i]}</Text>
            )
          ) : null}
        </View>,
      );
    }
    return inputs;
  };

  const Key = ({ value, icon }) => (
    <TouchableOpacity
      style={styles.key}
      onPress={() =>
        value === 'back' ? handleBackspace() : handleKeyPress(value)
      }
    >
      {icon ? (
        <Icon name={icon} size={28} color={COLORS.textPrimary} />
      ) : (
        <Text style={styles.keyText}>{value}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isUpdateMode && !isEditingPin
            ? 'Your PIN'
            : isUpdateMode || isEditingPin
            ? 'Update PIN'
            : 'Create New PIN'}
        </Text>
      </View>

      {isUpdateMode && !isEditingPin ? (
        <View style={styles.content}>
          <Text style={styles.description}>
            You have already set up your PIN for secure access.
          </Text>

          <View style={styles.pinExistsContainer}>
            <Icon name="shield-check" size={120} color={COLORS.primaryOrange} />
            <Text style={styles.pinExistsTitle}>PIN is Active</Text>
            <Text style={styles.pinExistsSubtitle}>
              Your account is protected with a 5-digit PIN
            </Text>
          </View>

          <View style={styles.buttonGroup}>
            <TouchableOpacity
              style={[styles.actionButton, styles.showPinButton]}
              onPress={handleShowPin}
              disabled={loading}
            >
              <Icon name="eye" size={24} color={COLORS.primaryOrange} />
              <Text style={[styles.actionButtonText, styles.showPinText]}>
                View PIN Info
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.updatePinButton]}
              onPress={handleUpdatePin}
            >
              <Icon name="pencil" size={24} color={COLORS.white} />
              <Text style={[styles.actionButtonText, styles.updatePinText]}>
                Update PIN
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.content}>
            <Text style={styles.description}>
              {isEditingPin || isUpdateMode
                ? 'Enter a new 5-digit PIN to update your account security.'
                : 'Add a PIN number to make your account more secure.'}
            </Text>

            <View style={styles.pinContainer}>{renderPinInputs()}</View>

            <TouchableOpacity
              style={[
                styles.continueButton,
                pin.length === pinLength
                  ? styles.btnActive
                  : styles.btnDisabled,
              ]}
              disabled={pin.length !== pinLength || loading}
              onPress={handleSavePin}
            >
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.continueText}>
                  {isEditingPin || isUpdateMode ? 'Update PIN' : 'Continue'}
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.numpad}>
            <View style={styles.row}>
              <Key value="1" />
              <Key value="2" />
              <Key value="3" />
            </View>
            <View style={styles.row}>
              <Key value="4" />
              <Key value="5" />
              <Key value="6" />
            </View>
            <View style={styles.row}>
              <Key value="7" />
              <Key value="8" />
              <Key value="9" />
            </View>
            <View style={styles.row}>
              <View style={styles.key} />
              <Key value="0" />
              <Key icon="backspace-outline" value="back" />
            </View>
          </View>
        </>
      )}

      {/* Password Verification Modal */}
      <Modal
        visible={showPasswordModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPasswordModal(false);
          setPassword('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon
              name="lock"
              size={60}
              color={COLORS.primaryOrange}
              style={{ marginBottom: SPACING.md }}
            />
            <Text style={styles.modalTitle}>Verify Password</Text>
            <Text style={styles.modalDescription}>
              Please enter your password to view your PIN
            </Text>

            <TextInput
              style={styles.passwordInput}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.gray400}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoFocus
            />

            <View style={styles.modalButtonGroup}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.modalVerifyButton]}
                onPress={handleVerifyPassword}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.modalVerifyText}>Verify</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PIN Display Modal */}
      <Modal
        visible={showPinModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowPinModal(false);
          setVerifiedPin('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Icon
              name="shield-check"
              size={60}
              color={COLORS.success}
              style={{ marginBottom: SPACING.md }}
            />
            <Text style={styles.modalTitle}>Your PIN</Text>
            <Text style={styles.modalDescription}>
              Keep this PIN safe and don't share it with anyone
            </Text>

            <View style={styles.pinDisplayContainer}>
              <Text style={styles.pinDisplayText}>{verifiedPin}</Text>
              <Text style={styles.pinNote}>(Verified & Decrypted)</Text>
            </View>

            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => {
                setShowPinModal(false);
                setVerifiedPin('');
              }}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    ...COMMON_STYLES.backButton,
  },
  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.md,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.xl,
  },
  description: {
    fontSize: FONTS.base,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
  },
  pinExistsContainer: {
    alignItems: 'center',
    marginVertical: SPACING.xxl,
    paddingVertical: SPACING.xxl,
  },
  pinExistsTitle: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  pinExistsSubtitle: {
    fontSize: FONTS.base,
    color: COLORS.gray600,
    textAlign: 'center',
  },
  buttonGroup: {
    marginTop: SPACING.xl,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.xxxl,
    marginBottom: SPACING.md,
  },
  showPinButton: {
    backgroundColor: '#FFF4EB',
    borderWidth: 1.5,
    borderColor: COLORS.primaryOrange,
  },
  updatePinButton: {
    backgroundColor: COLORS.primaryOrange,
  },
  actionButtonText: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.semiBold,
    marginLeft: SPACING.sm,
  },
  showPinText: {
    color: COLORS.primaryOrange,
  },
  updatePinText: {
    color: COLORS.white,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginBottom: SPACING.xxl,
  },
  pinBox: {
    width: 50,
    height: 60,
    borderWidth: 2,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.backgroundLight,
  },
  pinBoxFocused: {
    borderColor: COLORS.primaryOrange,
    backgroundColor: '#FFF8F2',
  },
  pinBoxFilled: {
    borderColor: COLORS.primaryOrange,
    backgroundColor: COLORS.white,
  },
  pinText: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.primaryOrange,
  },
  continueButton: {
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.xxxl,
    alignItems: 'center',
  },
  btnActive: {
    backgroundColor: COLORS.primaryOrange,
  },
  btnDisabled: {
    backgroundColor: COLORS.gray300,
  },
  continueText: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.white,
  },
  numpad: {
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xl,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  key: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.backgroundLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xxl,
    width: '85%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  modalDescription: {
    fontSize: FONTS.base,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: SPACING.xl,
  },
  passwordInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.white,
  },
  modalButtonGroup: {
    flexDirection: 'row',
    gap: SPACING.md,
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.xxxl,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: COLORS.backgroundLight,
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
  },
  modalVerifyButton: {
    backgroundColor: COLORS.primaryOrange,
  },
  modalCancelText: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
  },
  modalVerifyText: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.white,
  },
  pinDisplayContainer: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.xxl,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.lg,
    marginBottom: SPACING.xl,
    width: '100%',
  },
  pinDisplayText: {
    fontSize: FONTS.xxxl,
    fontWeight: FONTS.bold,
    color: COLORS.primaryOrange,
    letterSpacing: 10,
    marginBottom: SPACING.sm,
  },
  pinNote: {
    fontSize: FONTS.sm,
    color: COLORS.gray500,
    fontStyle: 'italic',
  },
  modalCloseButton: {
    backgroundColor: COLORS.primaryOrange,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: BORDER_RADIUS.xxxl,
    width: '100%',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.white,
  },
});

export default CreatePinScreen;
