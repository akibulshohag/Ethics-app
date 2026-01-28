import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import SuccessModal from './SuccessModal';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  COMMON_STYLES,
} from '../constants/theme';

const SetFingerprint = () => {
  const navigation = useNavigation();
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    if (!showSuccess) {
      return undefined;
    }

    const timeoutId = setTimeout(() => {
      setShowSuccess(false);
    }, 5000);

    return () => clearTimeout(timeoutId);
  }, [showSuccess]);

  const handleFingerprintPress = () => {
    setShowSuccess(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Icon name="arrow-left" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Set Your Fingerprint</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Add a fingerprint to make your account more secure.
        </Text>

        <TouchableOpacity
          style={styles.iconContainer}
          onPress={handleFingerprintPress}
          activeOpacity={0.7}
        >
          <Icon name="fingerprint" size={250} color={COLORS.primaryOrange} />
        </TouchableOpacity>

        <Text style={styles.instruction}>
          Please put your finger on the fingerprint scanner to get started.
        </Text>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={[styles.button, styles.skipButton]}>
          <Text style={[styles.buttonText, styles.skipText]}>Skip</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.continueButton]}
          onPress={() => navigation.navigate('ChooseInterests')}
        >
          <Text style={[styles.buttonText, styles.continueText]}>Continue</Text>
        </TouchableOpacity>
      </View>

      <SuccessModal
        visible={showSuccess}
        onClose={() => setShowSuccess(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  backButton: {
    ...COMMON_STYLES.backButton,
  },
  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.lg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    justifyContent: 'center',
  },
  description: {
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
    position: 'absolute',
    top: SPACING.xxl,
  },
  iconContainer: {
    marginVertical: SPACING.xxl,
  },
  instruction: {
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
    position: 'absolute',
    bottom: SPACING.xxl,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  button: {
    flex: 0.48,
    height: 58,
    borderRadius: BORDER_RADIUS.xxxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: '#FFF4EB',
  },
  continueButton: {
    backgroundColor: COLORS.primaryOrange,
    ...SHADOWS.small,
  },
  buttonText: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
  },
  skipText: {
    color: COLORS.primaryOrange,
  },
  continueText: {
    color: COLORS.white,
  },
});

export default SetFingerprint;
