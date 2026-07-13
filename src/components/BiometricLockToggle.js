import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useDispatch, useSelector } from 'react-redux';
import { appSetUser } from '../redux/actions/appSlice';
import BiometricMethodIcon from './BiometricMethodIcon';
import {
  biometricUnlockDescription,
  chooseBiometricMethodOnEnable,
  getBiometricSupport,
  promptBiometric,
  syncBiometricSessionForUser,
  updateFingerprintEnabled,
} from '../services/biometricService';
import {
  getBiometricPreferredMethod,
  hasBiometricSession,
} from '../services/secureStorageService';
import { COLORS } from '../constants/theme';

const BiometricLockToggle = ({ variant = 'profile' }) => {
  const dispatch = useDispatch();
  const user = useSelector(state => state.app?.user);
  const [loading, setLoading] = useState(false);
  const [biometryType, setBiometryType] = useState(null);
  const [available, setAvailable] = useState(false);
  const [faceAvailable, setFaceAvailable] = useState(false);
  const [fingerprintAvailable, setFingerprintAvailable] = useState(false);
  const [preferredMethod, setPreferredMethod] = useState(null);
  const enabled = !!user?.fingerprintEnabled;

  const refreshState = useCallback(async () => {
    const support = await getBiometricSupport();
    const method = await getBiometricPreferredMethod();
    setAvailable(!!support.available);
    setBiometryType(support.biometryType);
    setFaceAvailable(!!support.faceAvailable);
    setFingerprintAvailable(!!support.fingerprintAvailable);
    setPreferredMethod(method);

    if (user?.fingerprintEnabled && user?.id && user?.token) {
      const hasSession = await hasBiometricSession();
      if (!hasSession) {
        await syncBiometricSessionForUser(user);
      }
    }
  }, [user]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const handleToggle = useCallback(
    async nextValue => {
      if (loading) return;
      if (!available && nextValue) {
        Alert.alert(
          'Biometric login',
          'Set up fingerprint or face unlock in your phone Settings, then try again.',
        );
        return;
      }
      if (!user?.id || !user?.token) {
        Alert.alert('Biometric login', 'Please log in again, then try enabling biometrics.');
        return;
      }

      if (nextValue) {
        let method = preferredMethod;
        if (Platform.OS === 'android' && faceAvailable && fingerprintAvailable && !method) {
          method = await chooseBiometricMethodOnEnable({
            faceAvailable,
            fingerprintAvailable,
          });
          if (!method) return;
        } else if (faceAvailable && !fingerprintAvailable) {
          method = 'face';
        } else if (fingerprintAvailable && !faceAvailable) {
          method = 'fingerprint';
        }
        setLoading(true);
        try {
          await updateFingerprintEnabled(user, true, { method });
          dispatch(appSetUser({ ...user, fingerprintEnabled: true }));
          await syncBiometricSessionForUser({ ...user, fingerprintEnabled: true });
          setPreferredMethod(method || preferredMethod);
        } catch (e) {
          Alert.alert('Biometric login', e?.message || 'Could not update biometric settings');
        } finally {
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      try {
        await updateFingerprintEnabled(user, false);
        dispatch(appSetUser({ ...user, fingerprintEnabled: false }));
        setPreferredMethod(null);
      } catch (e) {
        Alert.alert('Biometric login', e?.message || 'Could not update biometric settings');
      } finally {
        setLoading(false);
      }
    },
    [
      available,
      dispatch,
      faceAvailable,
      fingerprintAvailable,
      loading,
      preferredMethod,
      user,
    ],
  );

  const runQuickUnlock = useCallback(
    async method => {
      if (!enabled || loading) return;
      setLoading(true);
      try {
        await promptBiometric('Confirm biometric login', { method, persistMethod: true });
        setPreferredMethod(method);
      } catch (e) {
        Alert.alert('Biometric login', e?.message || 'Could not verify biometrics');
      } finally {
        setLoading(false);
      }
    },
    [enabled, loading],
  );

  const title = 'Fingerprint & Face login';
  const subtitle = !available
    ? 'Enable fingerprint or face unlock in phone Settings to use this'
    : biometricUnlockDescription(biometryType, enabled, preferredMethod);

  const switchControl = loading ? (
    <ActivityIndicator size="small" color={COLORS.primaryOrange} />
  ) : (
    <Switch
      value={enabled && available}
      onValueChange={handleToggle}
      disabled={!available}
      trackColor={{ false: '#D1D5DB', true: '#F6B041' }}
      thumbColor="#fff"
    />
  );

  const iconSize = variant === 'profile' ? 24 : 22;
  const iconControl = (
    <BiometricMethodIcon
      biometryType={biometryType}
      available={available}
      size={iconSize}
      color={COLORS.primaryOrange}
    />
  );

  const methodPicker =
    enabled && Platform.OS === 'android' && faceAvailable && fingerprintAvailable ? (
      <View style={styles.methodRow}>
        <TouchableOpacity
          style={[
            styles.methodBtn,
            preferredMethod === 'face' && styles.methodBtnActive,
          ]}
          onPress={() => runQuickUnlock('face')}
          disabled={loading}
        >
          <Icon name="face-recognition" size={16} color={COLORS.primaryOrange} />
          <Text style={styles.methodBtnText}>Face (camera)</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.methodBtn,
            preferredMethod === 'fingerprint' && styles.methodBtnActive,
          ]}
          onPress={() => runQuickUnlock('fingerprint')}
          disabled={loading}
        >
          <Icon name="fingerprint" size={16} color={COLORS.primaryOrange} />
          <Text style={styles.methodBtnText}>Fingerprint</Text>
        </TouchableOpacity>
      </View>
    ) : null;

  const cardBody = (
    <>
      <View
        style={
          variant === 'embedded'
            ? styles.embeddedIconWrap
            : variant === 'modal'
              ? styles.modalIconWrap
              : styles.profileIconWrap
        }
      >
        {iconControl}
      </View>
      <View
        style={
          variant === 'embedded'
            ? styles.embeddedTextWrap
            : variant === 'modal'
              ? styles.modalTextWrap
              : styles.profileTextWrap
        }
      >
        <Text
          style={
            variant === 'embedded'
              ? styles.embeddedTitle
              : variant === 'modal'
                ? styles.modalTitle
                : styles.profileTitle
          }
        >
          {title}
        </Text>
        <Text
          style={
            variant === 'embedded'
              ? styles.embeddedSubtitle
              : variant === 'modal'
                ? styles.modalSubtitle
                : styles.profileSubtitle
          }
        >
          {subtitle}
        </Text>
        {methodPicker}
      </View>
      {switchControl}
    </>
  );

  if (variant === 'embedded') {
    return <View style={styles.embeddedCard}>{cardBody}</View>;
  }

  if (variant === 'modal') {
    return (
      <View style={styles.modalSection}>
        <Text style={styles.modalLabel}>Security</Text>
        <View style={styles.modalCard}>{cardBody}</View>
      </View>
    );
  }

  return <View style={styles.profileCard}>{cardBody}</View>;
};

const styles = StyleSheet.create({
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
    marginTop: 12,
    marginBottom: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  profileIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFF4EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  profileTextWrap: { flex: 1, paddingRight: 8 },
  profileTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  profileSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  embeddedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  embeddedIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFF4EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  embeddedTextWrap: { flex: 1, paddingRight: 8 },
  embeddedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  embeddedSubtitle: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 15,
  },
  modalSection: { marginTop: 16 },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  modalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FAFAFA',
  },
  modalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#FFF4EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  modalTextWrap: { flex: 1, paddingRight: 8 },
  modalTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  modalSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  methodRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  methodBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F6D7A8',
    backgroundColor: '#FFFBF5',
  },
  methodBtnActive: {
    borderColor: COLORS.primaryOrange,
    backgroundColor: '#FFF4EB',
  },
  methodBtnText: {
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },
});

export default BiometricLockToggle;
