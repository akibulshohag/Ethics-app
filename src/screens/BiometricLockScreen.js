import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import FaceUnlockCameraPreview from '../components/FaceUnlockCameraPreview';
import { appSetUser } from '../redux/actions/appSlice';
import {
  biometricLoginButtonLabel,
  getBiometricSupport,
  tryBiometricLogin,
} from '../services/biometricService';
import { getBiometricPreferredMethod } from '../services/secureStorageService';
import { config } from '../../config';
import { refreshUserSafetyAfterLogin } from '../services/userSafetyService';
import { COLORS, FONTS, SPACING } from '../constants/theme';

const BiometricLockScreen = ({ onUnlocked }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(false);
  const [biometryType, setBiometryType] = useState(null);
  const [faceAvailable, setFaceAvailable] = useState(false);
  const [fingerprintAvailable, setFingerprintAvailable] = useState(false);
  const [preferredMethod, setPreferredMethod] = useState(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);

  const releasePreviewCamera = () =>
    new Promise(resolve => {
      setCameraActive(false);
      setTimeout(resolve, 500);
    });

  const unlock = async (method = 'any') => {
    setLoading(true);
    try {
      if (method === 'face' && Platform.OS === 'android' && faceAvailable) {
        await releasePreviewCamera();
      }
      const session = await tryBiometricLogin(method, {
        skipFaceCameraPreview: method === 'face',
      });
      const res = await fetch(`${config.apiBaseUrl}/users/refresh-session`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || 'Session expired. Please log in again.');
      }
      const userData = {
        ...(data.user || {}),
        token: data.token || session.token,
      };
      dispatch(appSetUser(userData));
      await refreshUserSafetyAfterLogin();
      onUnlocked?.();
    } catch (e) {
      Alert.alert('Unlock failed', e?.message || 'Could not unlock with biometrics');
    } finally {
      setCameraActive(true);
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const support = await getBiometricSupport();
      const method = await getBiometricPreferredMethod();
      setBiometryType(support.biometryType);
      setFaceAvailable(!!support.faceAvailable);
      setFingerprintAvailable(!!support.fingerprintAvailable);
      setPreferredMethod(method);
    })();
  }, []);

  const showFaceCamera = Platform.OS === 'android' && faceAvailable;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Eatwaze is locked</Text>

        {showFaceCamera ? (
          <>
            <FaceUnlockCameraPreview
              style={styles.cameraPreview}
              isActive={cameraActive && !loading}
              onReady={() => setCameraReady(true)}
            />
            <Text style={styles.subtitle}>
              {loading
                ? 'Starting face scan…'
                : cameraReady
                  ? 'Tap below — camera closes, then face scan starts'
                  : 'Opening front camera…'}
            </Text>
            <TouchableOpacity
              style={[styles.btn, styles.faceBtn]}
              onPress={() => unlock('face')}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Icon name="face-recognition" size={20} color="#FFF" style={styles.btnIcon} />
                  <Text style={styles.btnText}>Unlock with Face</Text>
                </>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <Text style={styles.subtitle}>
            Tap below and use{' '}
            {biometricLoginButtonLabel(biometryType, preferredMethod || 'any').toLowerCase()} to
            continue
          </Text>
        )}

        {fingerprintAvailable ? (
          <TouchableOpacity
            style={[styles.btn, showFaceCamera ? styles.secondaryBtn : styles.faceBtn]}
            onPress={() => unlock('fingerprint')}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={showFaceCamera ? COLORS.primaryOrange : '#FFF'} />
            ) : (
              <>
                <Icon
                  name="fingerprint"
                  size={20}
                  color={showFaceCamera ? COLORS.primaryOrange : '#FFF'}
                  style={styles.btnIcon}
                />
                <Text style={[styles.btnText, showFaceCamera && styles.secondaryBtnText]}>
                  Unlock with Fingerprint
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : null}

        {!faceAvailable && !fingerprintAvailable ? (
          <TouchableOpacity style={styles.btn} onPress={() => unlock('any')} disabled={loading}>
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.btnText}>
                Unlock with {biometricLoginButtonLabel(biometryType)}
              </Text>
            )}
          </TouchableOpacity>
        ) : null}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.xl,
    gap: 12,
  },
  title: { fontSize: FONTS.xxl, fontWeight: FONTS.bold },
  cameraPreview: {
    width: '100%',
    maxWidth: 320,
    height: 340,
    borderRadius: 16,
    marginTop: SPACING.md,
  },
  subtitle: {
    color: COLORS.textSecondary,
    marginTop: SPACING.sm,
    marginBottom: SPACING.sm,
    textAlign: 'center',
    paddingHorizontal: SPACING.lg,
  },
  btn: {
    backgroundColor: '#2B1A00',
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 260,
    flexDirection: 'row',
  },
  faceBtn: {
    backgroundColor: COLORS.primaryOrange,
  },
  secondaryBtn: {
    backgroundColor: '#FFF4EB',
    borderWidth: 1,
    borderColor: COLORS.primaryOrange,
  },
  btnIcon: { marginRight: 8 },
  btnText: { color: '#FFF', fontWeight: FONTS.bold },
  secondaryBtnText: { color: COLORS.primaryOrange },
});

export default BiometricLockScreen;
