import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import FaceUnlockCameraPreview from './FaceUnlockCameraPreview';
import {
  registerFaceUnlockCameraHost,
  unregisterFaceUnlockCameraHost,
} from '../services/faceUnlockCameraBridge';

const FaceUnlockCameraHost = () => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState('Face unlock');
  const [subtitle, setSubtitle] = useState('Look at the front camera');
  const [requireConfirm, setRequireConfirm] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const pendingRef = useRef(null);

  const dismiss = useCallback(() => {
    setVisible(false);
    setCameraReady(false);
    setRequireConfirm(false);
  }, []);

  const cancel = useCallback(() => {
    setVisible(false);
    setCameraReady(false);
    setRequireConfirm(false);
    pendingRef.current?.reject?.(new Error('Face unlock cancelled'));
    pendingRef.current = null;
  }, []);

  const finishOpen = useCallback(() => {
    setCameraReady(true);
    if (!pendingRef.current?.requireConfirm) {
      pendingRef.current?.resolve?.();
      pendingRef.current = null;
    }
  }, []);

  const confirmFace = useCallback(() => {
    pendingRef.current?.resolve?.();
    pendingRef.current = null;
    setVisible(false);
    setCameraReady(false);
    setRequireConfirm(false);
  }, []);

  useEffect(() => {
    registerFaceUnlockCameraHost({
      open: ({
        title: nextTitle,
        subtitle: nextSubtitle,
        requireConfirm: needsConfirm = false,
      } = {}) =>
        new Promise((resolve, reject) => {
          if (Platform.OS !== 'android') {
            resolve();
            return;
          }
          pendingRef.current = { resolve, reject, requireConfirm: !!needsConfirm };
          setTitle(nextTitle || 'Face unlock');
          setSubtitle(nextSubtitle || 'Look at the front camera');
          setRequireConfirm(!!needsConfirm);
          setCameraReady(false);
          setVisible(true);
        }),
      dismiss,
    });
    return () => unregisterFaceUnlockCameraHost();
  }, [dismiss]);

  if (Platform.OS !== 'android') {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cancel}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>
          <FaceUnlockCameraPreview
            style={styles.preview}
            isActive={visible}
            onReady={finishOpen}
          />
          {requireConfirm ? (
            <TouchableOpacity
              style={[styles.confirmBtn, !cameraReady && styles.confirmBtnDisabled]}
              onPress={confirmFace}
              disabled={!cameraReady}
            >
              <Text style={styles.confirmText}>Confirm face</Text>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity style={styles.cancelBtn} onPress={cancel}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
  },
  preview: {
    width: '100%',
    height: 320,
    borderRadius: 14,
    marginTop: 14,
  },
  confirmBtn: {
    marginTop: 14,
    width: '100%',
    backgroundColor: '#F5A623',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  confirmBtnDisabled: {
    opacity: 0.5,
  },
  confirmText: {
    color: '#111827',
    fontWeight: '700',
    fontSize: 15,
  },
  cancelBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  cancelText: {
    color: '#B45309',
    fontWeight: '600',
    fontSize: 15,
  },
});

export default FaceUnlockCameraHost;
