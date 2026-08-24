import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

/**
 * Full-area tap to play/pause. Icon stays visible while paused;
 * while playing it fades after a short delay (CapCut-style).
 */
export default function MediaPlayTapOverlay({
  playing,
  onToggle,
  visible = true,
  disabled = false,
}) {
  if (disabled) return null;
  return (
    <Pressable style={styles.fill} onPress={onToggle} disabled={disabled}>
      {visible ? (
        <View style={styles.circle}>
          <Icon name={playing ? 'pause' : 'play'} color="#222" size={28} />
        </View>
      ) : (
        <View />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 8,
  },
  circle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    backgroundColor: 'rgba(255,255,255,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
