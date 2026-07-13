import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { appSetUser } from '../redux/actions/appSlice';
import SuccessModal from './SuccessModal';
import BiometricMethodIcon from '../components/BiometricMethodIcon';
import {
  biometricUnlockDescription,
  chooseBiometricMethodOnEnable,
  getBiometricSupport,
  syncBiometricSessionForUser,
  updateFingerprintEnabled,
} from '../services/biometricService';
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
  const [biometryType, setBiometryType] = useState(null);
  const [faceAvailable, setFaceAvailable] = useState(false);
  const [fingerprintAvailable, setFingerprintAvailable] = useState(false);

  useEffect(() => {
    getBiometricSupport().then(s => {
      setBiometryType(s.biometryType);
      setFaceAvailable(!!s.faceAvailable);
      setFingerprintAvailable(!!s.fingerprintAvailable);
    });
  }, []);

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

  const applyBiometricChange = async (nextEnabled, method) => {
    setLoading(true);
    try {
      await updateFingerprintEnabled(user, nextEnabled, { method });

      const updatedUser = {
        ...user,
        fingerprintEnabled: nextEnabled,
      };

      dispatch(appSetUser(updatedUser));
      if (nextEnabled) {
        await syncBiometricSessionForUser(updatedUser);
      }
      setFingerprintEnabled(nextEnabled);
      setShowSuccess(true);
    } catch (error) {
      console.error('Fingerprint error:', error);
      setTimeout(() => {
        Alert.alert(
          'Error',
          error.message || 'Failed to update biometric settings. Please try again.',
        );
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const handleEnablePress = async method => {
    if (fingerprintEnabled) {
      await applyBiometricChange(false);
      return;
    }
    await applyBiometricChange(true, method);
  };

  const handleMainPress = async () => {
    if (fingerprintEnabled) {
      await applyBiometricChange(false);
      return;
    }
    if (Platform.OS === 'android' && faceAvailable && fingerprintAvailable) {
      const method = await chooseBiometricMethodOnEnable({
        faceAvailable,
        fingerprintAvailable,
      });
      if (!method) return;
      await applyBiometricChange(true, method);
      return;
    }
    const method = faceAvailable ? 'face' : fingerprintAvailable ? 'fingerprint' : 'any';
    await applyBiometricChange(true, method);
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
          {isUpdateMode ? 'Biometric login' : 'Set biometric login'}
        </Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          {fingerprintEnabled
            ? 'Fingerprint & face login is on. Tap to turn off.'
            : biometricUnlockDescription(biometryType, false)}
        </Text>

        <TouchableOpacity
          style={styles.iconContainer}
          onPress={handleMainPress}
          activeOpacity={0.7}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="large" color={COLORS.primaryOrange} />
          ) : (
            <BiometricMethodIcon
              biometryType={biometryType}
              available
              size={120}
              color={fingerprintEnabled ? COLORS.success : COLORS.primaryOrange}
            />
          )}
        </TouchableOpacity>

        {!fingerprintEnabled && Platform.OS === 'android' && faceAvailable ? (
          <View style={styles.methodRow}>
            <TouchableOpacity
              style={styles.methodBtn}
              onPress={() => handleEnablePress('face')}
              disabled={loading}
            >
              <Icon name="face-recognition" size={22} color={COLORS.primaryOrange} />
              <Text style={styles.methodBtnText}>Enable Face (camera)</Text>
            </TouchableOpacity>
            {fingerprintAvailable ? (
              <TouchableOpacity
                style={styles.methodBtn}
                onPress={() => handleEnablePress('fingerprint')}
                disabled={loading}
              >
                <Icon name="fingerprint" size={22} color={COLORS.primaryOrange} />
                <Text style={styles.methodBtnText}>Enable Fingerprint</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        <Text style={styles.instruction}>
          {fingerprintEnabled
            ? 'Tap the icon to disable fingerprint / face login'
            : 'Scan your fingerprint or face to enable quick login'}
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
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  methodBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F6D7A8',
    backgroundColor: '#FFFBF5',
    minWidth: 130,
  },
  methodBtnText: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#92400E',
    textAlign: 'center',
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
