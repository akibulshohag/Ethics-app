import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { appSetUser } from '../redux/actions/appSlice';
import { config } from '../../config';
import SuccessModal from './SuccessModal';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  COMMON_STYLES,
} from '../constants/theme';

const SetFingerprint = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.app);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [fingerprintEnabled, setFingerprintEnabled] = useState(false);

  useEffect(() => {
    // Check if user already has fingerprint enabled
    if (user?.fingerprintEnabled) {
      setIsUpdateMode(true);
      setFingerprintEnabled(true);
    }
  }, []);

  useEffect(() => {
    if (!showSuccess) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setShowSuccess(false);
      // Navigate to ChooseInterests after success
      if (!isUpdateMode) {
        navigation.navigate('ChooseInterests');
      }
    }, 2000);

    return () => clearTimeout(timeoutId);
  }, [showSuccess]);

  const handleFingerprintPress = async () => {
    setLoading(true);
    try {
      // Call API to enable/disable fingerprint
      const response = await fetch(
        `${config.apiBaseUrl}/users/set-fingerprint`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            fingerprintEnabled: !fingerprintEnabled,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update fingerprint setting');
      }

      // Update Redux store
      const updatedUser = {
        ...user,
        fingerprintEnabled: !fingerprintEnabled,
      };

      dispatch(appSetUser(updatedUser));
      setFingerprintEnabled(!fingerprintEnabled);
      setShowSuccess(true);
    } catch (error) {
      console.error('Fingerprint error:', error);
      setTimeout(() => {
        Alert.alert(
          'Error',
          error.message || 'Failed to update fingerprint. Please try again.',
        );
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    if (isUpdateMode) {
      navigation.goBack();
    } else {
      navigation.navigate('ChooseInterests');
    }
  };

  const handleContinue = () => {
    if (isUpdateMode) {
      navigation.goBack();
    } else {
      navigation.navigate('ChooseInterests');
    }
  };

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
          {isUpdateMode ? 'Update Fingerprint' : 'Set Your Fingerprint'}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          {fingerprintEnabled
            ? 'Fingerprint is currently enabled. Tap to disable.'
            : 'Add a fingerprint to make your account more secure.'}
        </Text>

        <TouchableOpacity
          style={styles.iconContainer}
          onPress={handleFingerprintPress}
          activeOpacity={0.7}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primaryOrange} />
          ) : (
            <Icon
              name="fingerprint"
              size={250}
              color={fingerprintEnabled ? COLORS.success : COLORS.primaryOrange}
            />
          )}
        </TouchableOpacity>

        <Text style={styles.instruction}>
          {fingerprintEnabled
            ? 'Tap the fingerprint icon to disable biometric authentication'
            : 'Please put your finger on the fingerprint scanner to get started.'}
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, styles.skipButton]}
          onPress={handleSkip}
          disabled={loading}
        >
          <Text style={[styles.buttonText, styles.skipText]}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.continueButton]}
          onPress={handleContinue}
          disabled={loading}
        >
          <Text style={[styles.buttonText, styles.continueText]}>
            {isUpdateMode ? 'Done' : 'Continue'}
          </Text>
        </TouchableOpacity>
      </View>

      <SuccessModal
        visible={showSuccess}
        onClose={() => setShowSuccess(false)}
      />
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
    marginTop: SPACING.md,
  },
  backButton: {
    ...COMMON_STYLES.backButton,
  },
  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.lg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    justifyContent: 'center',
  },
  description: {
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
    position: 'absolute',
    top: SPACING.xxl,
  },
  iconContainer: {
    marginVertical: SPACING.xxl,
  },
  instruction: {
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
    position: 'absolute',
    bottom: SPACING.xxl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  button: {
    flex: 0.48,
    height: 58,
    borderRadius: BORDER_RADIUS.xxxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: '#FFF4EB',
  },
  continueButton: {
    backgroundColor: COLORS.primaryOrange,
    ...SHADOWS.small,
  },
  buttonText: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
  },
  skipText: {
    color: COLORS.primaryOrange,
  },
  continueText: {
    color: COLORS.white,
  },
});

export default SetFingerprint;
