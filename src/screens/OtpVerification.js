import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { forgotPassword, verifyOtp } from '../services/authService';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  COMMON_STYLES,
} from '../constants/theme';

const OtpVerification = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const email = route.params?.email || '';
  const method = route.params?.method || 'email';
  const [timer, setTimer] = useState(55);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(current => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_, start, middle, domain) => {
        const masked = middle.length > 0 ? '*'.repeat(Math.min(middle.length, 4)) : '';
        return `${start}${masked}${domain}`;
      })
    : 'your email';

  const handleVerify = async () => {
    if (!email) {
      Alert.alert('Error', 'Missing email. Please start again.');
      navigation.navigate('ForgotPassword');
      return;
    }
    if (!otp.trim() || otp.trim().length < 5) {
      Alert.alert('Error', 'Please enter the 5-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const data = await verifyOtp(email, otp.trim());
      navigation.navigate('CreateNewPassword', {
        email,
        resetToken: data.resetToken,
      });
    } catch (error) {
      Alert.alert('Error', error.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email || timer > 0) return;
    setResending(true);
    try {
      await forgotPassword(email, method);
      setTimer(55);
      Alert.alert('Success', 'A new OTP has been sent to your email');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Verify OTP</Text>
      </View>

      <View style={styles.whiteSheet}>
        <Text style={styles.infoText}>
          Code has been sent to {maskedEmail}
        </Text>

        <TextInput
          style={styles.otpInput}
          placeholder="Enter 5-digit OTP"
          placeholderTextColor={COLORS.gray600}
          value={otp}
          onChangeText={setOtp}
          keyboardType="number-pad"
          maxLength={5}
          autoFocus
        />

        <TouchableOpacity onPress={handleResend} disabled={timer > 0 || resending}>
          <Text style={styles.resendText}>
            {timer > 0 ? (
              <>
                Resend code in <Text style={styles.timerText}>{timer}</Text> s
              </>
            ) : (
              <Text style={styles.timerText}>
                {resending ? 'Sending...' : 'Resend code'}
              </Text>
            )}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.verifyButton}
          onPress={handleVerify}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.verifyButtonText}>Verify</Text>
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
    padding: SPACING.xl,
  },
  backButton: {
    ...COMMON_STYLES.backButton,
  },
  headerTitle: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.bold,
    color: COLORS.white,
    marginLeft: SPACING.lg,
  },
  whiteSheet: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xl,
    alignItems: 'center',
  },
  infoText: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.xxl,
    textAlign: 'center',
  },
  otpInput: {
    width: '100%',
    height: 60,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.primaryOrange,
    textAlign: 'center',
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xxl,
    letterSpacing: 8,
  },
  resendText: {
    fontSize: FONTS.base,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xxl,
  },
  timerText: {
    color: COLORS.primaryOrange,
    fontWeight: FONTS.bold,
  },
  verifyButton: {
    width: '100%',
    height: 60,
    backgroundColor: COLORS.gray900,
    borderRadius: BORDER_RADIUS.xxxl,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  verifyButtonText: {
    color: COLORS.white,
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
  },
});

export default OtpVerification;
