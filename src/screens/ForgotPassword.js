import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { forgotPassword } from '../services/authService';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  COMMON_STYLES,
} from '../constants/theme';

const ForgotPassword = () => {
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      const data = await forgotPassword(email.trim(), 'email');
      Alert.alert(
        'OTP Sent',
        data?.message || 'Check your email inbox and spam folder for the OTP code.',
      );
      navigation.navigate('OtpVerification', {
        email: email.trim().toLowerCase(),
        method: 'email',
      });
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF7A00" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Forgot Password</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.instructionText}>
          Enter your email address and we will send you a verification code to
          reset your password or recover your account.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Email</Text>
          <View style={styles.inputWrapper}>
            <Icon
              name="email"
              size={20}
              color={COLORS.primaryOrange}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={COLORS.gray600}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={[styles.card, styles.cardSelected]}>
          <View style={styles.iconCircle}>
            <Icon name="email" size={28} color={COLORS.primaryOrange} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.methodLabel}>Recovery method</Text>
            <Text style={styles.methodValue}>Email OTP verification</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.continueText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryOrange,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  backButton: {
    ...COMMON_STYLES.backButton,
  },
  headerTitle: {
    fontSize: FONTS.xxxl,
    fontWeight: FONTS.bold,
    color: COLORS.white,
    marginLeft: SPACING.lg,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  instructionText: {
    fontSize: FONTS.lg,
    color: COLORS.textSecondary,
    lineHeight: 26,
    marginBottom: SPACING.xxl,
    fontWeight: FONTS.medium,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONTS.sm,
    color: COLORS.gray700,
    marginBottom: SPACING.sm,
    fontWeight: FONTS.medium,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray100,
    borderRadius: BORDER_RADIUS.xxxl,
    paddingHorizontal: SPACING.lg,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  inputIcon: {
    marginRight: SPACING.md,
  },
  input: {
    flex: 1,
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    elevation: 2,
    ...SHADOWS.small,
  },
  cardSelected: {
    borderColor: COLORS.primaryOrange,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF4EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  cardTextContainer: {
    flex: 1,
  },
  methodLabel: {
    fontSize: FONTS.sm,
    color: COLORS.gray600,
    marginBottom: SPACING.xs,
  },
  methodValue: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  continueButton: {
    backgroundColor: COLORS.primaryOrange,
    height: 60,
    borderRadius: BORDER_RADIUS.xxxl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: SPACING.xxl,
    elevation: 8,
    ...SHADOWS.medium,
  },
  continueText: {
    color: COLORS.white,
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
  },
});

export default ForgotPassword;
