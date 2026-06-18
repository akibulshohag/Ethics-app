import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

const DOT_COUNT = 8;
const RADIUS = 22;

const OnboardingDotLoader = ({ size = 56, color = '#FFFFFF' }) => {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const scale = size / 56;

  return (
    <Animated.View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          transform: [{ rotate }],
        },
      ]}
    >
      {Array.from({ length: DOT_COUNT }).map((_, index) => {
        const angle = (index / DOT_COUNT) * Math.PI * 2 - Math.PI / 2;
        const dotSize = (4 + (index % 3) * 1.5) * scale;
        const opacity = 0.35 + ((index + 1) / DOT_COUNT) * 0.65;
        return (
          <View
            key={`dot-${index}`}
            style={[
              styles.dot,
              {
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: color,
                opacity,
                left: size / 2 + Math.cos(angle) * RADIUS * scale - dotSize / 2,
                top: size / 2 + Math.sin(angle) * RADIUS * scale - dotSize / 2,
              },
            ]}
          />
        );
      })}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  dot: {
    position: 'absolute',
  },
});

export default OnboardingDotLoader;
