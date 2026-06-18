import React from 'react';
import { StyleSheet, View } from 'react-native';

const OnboardingPagination = ({ total, activeIndex, style }) => {
  if (!total || total < 2) {
    return null;
  }

  return (
    <View style={[styles.row, style]}>
      {Array.from({ length: total }).map((_, index) => (
        <View
          key={`page-${index}`}
          style={[
            styles.dot,
            index > 0 && styles.dotSpacing,
            index === activeIndex ? styles.dotActive : styles.dotInactive,
          ]}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(245, 166, 35, 0.92)',
  },
  dot: {
    height: 5,
    borderRadius: 3,
    width: 52,
  },
  dotSpacing: {
    marginLeft: 10,
  },
  dotActive: {
    backgroundColor: '#FF7F0B',
  },
  dotInactive: {
    backgroundColor: '#2F2F2F',
  },
});

export default OnboardingPagination;
