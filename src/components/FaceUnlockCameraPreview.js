import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';

let visionCamera = null;
try {
  visionCamera = require('react-native-vision-camera');
} catch {
  visionCamera = null;
}

const FaceUnlockCameraPreview = ({
  onReady,
  style,
  showHint = true,
  isActive = true,
}) => {
  const Camera = visionCamera?.Camera;
  const useCameraDevice = visionCamera?.useCameraDevice;
  const useCameraPermission = visionCamera?.useCameraPermission;

  if (!Camera || !useCameraDevice || !useCameraPermission) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>Camera preview unavailable</Text>
      </View>
    );
  }

  return (
    <FaceUnlockCameraPreviewInner
      Camera={Camera}
      useCameraDevice={useCameraDevice}
      useCameraPermission={useCameraPermission}
      onReady={onReady}
      style={style}
      showHint={showHint}
      isActive={isActive}
    />
  );
};

const FaceUnlockCameraPreviewInner = ({
  Camera,
  useCameraDevice,
  useCameraPermission,
  onReady,
  style,
  showHint,
  isActive,
}) => {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('front');
  const readyRef = React.useRef(false);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    readyRef.current = false;
  }, [isActive, device?.id]);

  useEffect(() => {
    if (!isActive || !hasPermission || !device || readyRef.current) return;
    readyRef.current = true;
    const timer = setTimeout(() => onReady?.(), 350);
    return () => clearTimeout(timer);
  }, [isActive, hasPermission, device, onReady]);

  if (!hasPermission) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>Allow camera access for face unlock</Text>
      </View>
    );
  }

  if (!device) {
    return (
      <View style={[styles.fallback, style]}>
        <Text style={styles.fallbackText}>Front camera not found</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]}>
      <Camera
        style={StyleSheet.absoluteFill}
        device={device}
        isActive={isActive}
        photo={false}
        video={false}
        audio={false}
      />
      {showHint ? (
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.faceRing} />
          <Text style={styles.hintText}>Position your face in the circle</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  fallback: {
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
  },
  fallbackText: {
    color: '#E5E7EB',
    fontSize: 13,
    textAlign: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceRing: {
    width: '72%',
    aspectRatio: 1,
    maxWidth: 260,
    borderRadius: 999,
    borderWidth: 3,
    borderColor: 'rgba(245, 166, 35, 0.95)',
    backgroundColor: 'transparent',
  },
  hintText: {
    marginTop: 16,
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    paddingHorizontal: 16,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
});

export default FaceUnlockCameraPreview;
