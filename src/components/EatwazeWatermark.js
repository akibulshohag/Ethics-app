import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

/** Transparent wordmark — matches burn-in (no box / border). */
const LOGO = require('../assets/eatwaze-watermark-transparent.png');

/**
 * Eatwaze wordmark centered on the preview (same as publish burn-in).
 */
export default function EatwazeWatermark({ size = 120 }) {
  const height = Math.round(size * 0.33);
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Image
        source={LOGO}
        style={{ width: size, height }}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
});
