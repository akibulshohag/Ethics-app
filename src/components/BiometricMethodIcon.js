import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { BiometryTypes } from 'react-native-biometrics';
import { biometricIconName } from '../services/biometricService';
import { COLORS } from '../constants/theme';

/** Fingerprint + face icons on Android; single icon on iOS. */
const BiometricMethodIcon = ({
  biometryType,
  available = true,
  size = 22,
  color = COLORS.primaryOrange,
  style,
}) => {
  if (!available) {
    return <Icon name="shield-lock-outline" size={size} color={color} style={style} />;
  }

  if (biometryType === BiometryTypes.FaceID) {
    return <Icon name="face-recognition" size={size} color={color} style={style} />;
  }

  if (Platform.OS === 'android' || biometryType === BiometryTypes.Biometrics) {
    const dualSize = size <= 28 ? Math.max(14, size - 8) : Math.round(size * 0.45);
    return (
      <View style={[styles.dualIconRow, style]}>
        <Icon name="fingerprint" size={dualSize} color={color} />
        <Icon name="face-recognition" size={dualSize} color={color} />
      </View>
    );
  }

  return (
    <Icon name={biometricIconName(biometryType)} size={size} color={color} style={style} />
  );
};

const styles = StyleSheet.create({
  dualIconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
});

export default BiometricMethodIcon;
