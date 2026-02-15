import React, {useEffect, useRef, useImperativeHandle, forwardRef} from 'react';
import {View, Text, StyleSheet} from 'react-native';

let CameraInner = null;

try {
  const vision = require('react-native-vision-camera');
  const Camera = vision.Camera;
  const {useCameraDevice, useCameraPermission, useMicrophonePermission} = vision;

  const Inner = Camera ? forwardRef(({facing, style, onCameraReady, isActive, onRecordingFinished, onRecordingError, children}, ref) => {
    const cameraRef = useRef(null);
    const {hasPermission, requestPermission} = useCameraPermission();
    const {hasPermission: hasMicPermission, requestPermission: requestMicPermission} = useMicrophonePermission();
    const device = useCameraDevice(facing === 'front' ? 'front' : 'back');

    useEffect(() => {
      if (!hasPermission) requestPermission();
    }, [hasPermission, requestPermission]);

    useEffect(() => {
      if (!hasMicPermission) requestMicPermission();
    }, [hasMicPermission, requestMicPermission]);

    useImperativeHandle(ref, () => ({
      startRecording: (opts = {}) => {
        if (cameraRef.current) {
          cameraRef.current.startRecording({
            fileType: 'mp4',
            videoCodec: 'h264',
            onRecordingFinished: opts.onRecordingFinished || onRecordingFinished,
            onRecordingError: opts.onRecordingError || onRecordingError,
            ...opts,
          });
        }
      },
      stopRecording: async () => {
        if (cameraRef.current) {
          return cameraRef.current.stopRecording();
        }
      },
      isReady: () => !!cameraRef.current && !!device,
    }));

    useEffect(() => {
      if (device && onCameraReady) onCameraReady();
    }, [device, onCameraReady]);

    if (!hasPermission || !device) {
      return (
        <View style={[styles.placeholder, style]}>
          <Text style={styles.placeholderText}>Camera</Text>
          <Text style={styles.placeholderHint}>Permission required</Text>
          {children}
        </View>
      );
    }

    return (
      <View style={[styles.container, style]}>
        <Camera
          ref={cameraRef}
          style={StyleSheet.absoluteFill}
          device={device}
          isActive={isActive}
          video={true}
          audio={hasMicPermission}
          enableZoomGesture
        />
        {children}
      </View>
    );
  }) : null;
  CameraInner = Inner;
} catch (e) {
  CameraInner = null;
}

/**
 * CameraShortsView - YouTube Shorts style camera with recording
 * Ref methods: startRecording(opts), stopRecording()
 */
const CameraShortsView = forwardRef(({
  facing = 'back',
  style,
  onCameraReady,
  isActive = true,
  onRecordingFinished,
  onRecordingError,
  children,
}, ref) => {
  if (CameraInner) {
    return (
      <CameraInner
        ref={ref}
        facing={facing}
        style={style}
        onCameraReady={onCameraReady}
        isActive={isActive}
        onRecordingFinished={onRecordingFinished}
        onRecordingError={onRecordingError}>
        {children}
      </CameraInner>
    );
  }
  return (
    <View style={[styles.placeholder, style]}>
      <Text style={styles.placeholderText}>Camera</Text>
      <Text style={styles.placeholderHint}>
        npm install react-native-vision-camera
      </Text>
      {children}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  placeholder: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  placeholderHint: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 12,
  },
});

export default CameraShortsView;
