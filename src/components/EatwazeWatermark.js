import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const LOGO = require('../assets/logo.png');

/**
 * Eatwaze wordmark in the top-right of photos and videos.
 */
export default function EatwazeWatermark({
  size = 88,
  top = 10,
  right = 10,
}) {
  const height = Math.round(size * 0.32);
  return (
    <View
      pointerEvents="none"
      style={[styles.wrap, { paddingTop: top, paddingRight: right }]}
    >
      <View style={[styles.badge, { width: size + 14, height: height + 10 }]}>
        <Image source={LOGO} style={{ width: size, height }} resizeMode="contain" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    zIndex: 20,
  },
  badge: {
    backgroundColor: 'rgba(0,0,0,0.38)',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
