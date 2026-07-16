import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  registerBiometricMethodPickerHost,
  unregisterBiometricMethodPickerHost,
} from '../services/biometricMethodPickerBridge';

/**
 * In-app Fingerprint | Face switcher (Samsung One UI style).
 * System BiometricPrompt only shows that switcher on Samsung — other OEMs
 * (Vivo) get a single confusing dialog, so we choose the method here first.
 */
const BiometricMethodPickerHost = () => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('Eatwaze');
  const [subtitle, setSubtitle] = useState('Choose unlock method');
  const [selected, setSelected] = useState('fingerprint');
  const [faceAvailable, setFaceAvailable] = useState(true);
  const [fingerprintAvailable, setFingerprintAvailable] = useState(true);
  const pendingRef = useRef(null);

  const close = useCallback(result => {
    setVisible(false);
    pendingRef.current?.resolve?.(result);
    pendingRef.current = null;
  }, []);

  const cancel = useCallback(() => close(null), [close]);

  const confirm = useCallback(() => {
    if (selected === 'face' && !faceAvailable) return;
    if (selected === 'fingerprint' && !fingerprintAvailable) return;
    close(selected);
  }, [close, selected, faceAvailable, fingerprintAvailable]);

  useEffect(() => {
    registerBiometricMethodPickerHost({
      open: ({
        title: nextTitle,
        subtitle: nextSubtitle,
        faceAvailable: faceOk = true,
        fingerprintAvailable: fingerOk = true,
        initialMethod,
      } = {}) =>
        new Promise(resolve => {
          if (Platform.OS !== 'android') {
            resolve(null);
            return;
          }
          pendingRef.current = { resolve };
          setTitle(nextTitle || 'Eatwaze');
          setSubtitle(nextSubtitle || 'Choose Fingerprint or Face');
          setFaceAvailable(!!faceOk);
          setFingerprintAvailable(!!fingerOk);
          const initial =
            initialMethod === 'face' || initialMethod === 'fingerprint'
              ? initialMethod
              : fingerOk
                ? 'fingerprint'
                : 'face';
          setSelected(initial);
          setVisible(true);
        }),
    });
    return () => unregisterBiometricMethodPickerHost();
  }, []);

  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cancel}>
      <Pressable style={styles.backdrop} onPress={cancel}>
        <View style={styles.card}>
          <View style={styles.segment}>
            {fingerprintAvailable ? (
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  selected === 'fingerprint' && styles.segmentBtnActive,
                ]}
                onPress={() => setSelected('fingerprint')}
                activeOpacity={0.85}
              >
                <Icon
                  name="fingerprint"
                  size={16}
                  color={selected === 'fingerprint' ? '#0B1220' : '#D1D5DB'}
                />
                <Text
                  style={[
                    styles.segmentText,
                    selected === 'fingerprint' && styles.segmentTextActive,
                  ]}
                >
                  Fingerprint
                </Text>
              </TouchableOpacity>
            ) : null}
            {faceAvailable ? (
              <TouchableOpacity
                style={[
                  styles.segmentBtn,
                  selected === 'face' && styles.segmentBtnActive,
                ]}
                onPress={() => setSelected('face')}
                activeOpacity={0.85}
              >
                <Icon
                  name="face-recognition"
                  size={16}
                  color={selected === 'face' ? '#0B1220' : '#D1D5DB'}
                />
                <Text
                  style={[
                    styles.segmentText,
                    selected === 'face' && styles.segmentTextActive,
                  ]}
                >
                  Face
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <Text style={styles.hint}>
            {selected === 'face'
              ? 'Use face recognition to continue'
              : 'Touch the fingerprint sensor to continue'}
          </Text>

          <TouchableOpacity style={styles.continueBtn} onPress={confirm}>
            <Text style={styles.continueText}>Continue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#2B2F36',
    borderRadius: 18,
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: '#1F2329',
    borderRadius: 10,
    padding: 3,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  segmentBtnActive: {
    backgroundColor: '#5EEAD4',
  },
  segmentText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#D1D5DB',
  },
  segmentTextActive: {
    color: '#0B1220',
  },
  title: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '700',
    color: '#F9FAFB',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: '#E5E7EB',
    textAlign: 'center',
  },
  hint: {
    marginTop: 8,
    marginBottom: 16,
    fontSize: 13,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  continueBtn: {
    backgroundColor: '#F5A623',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  continueText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelBtn: {
    marginTop: 4,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: {
    color: '#93C5FD',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default BiometricMethodPickerHost;
