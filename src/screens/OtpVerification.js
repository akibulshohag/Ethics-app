import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  DIMENSIONS,
  COMMON_STYLES,
} from '../constants/theme';

const OtpVerification = () => {
  const navigation = useNavigation();
  const [timer, setTimer] = useState(55);
  const [otp] = useState(['7', '4', '', '', '']);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(current => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Icon name="arrow-left" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Forgot Password</Text>
      </View>

      <View style={styles.whiteSheet}>
        <Text style={styles.infoText}>
          Code has been send to +1 111 ******99
        </Text>

        <View style={styles.otpContainer}>
          {otp.map((digit, index) => (
            <View
              key={index}
              style={[
                styles.otpBox,
                digit !== '' && styles.otpBoxFilled,
                index === 2 && styles.otpBoxActive,
              ]}
            >
              <Text style={styles.otpText}>{digit}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.resendText}>
          Resend code in <Text style={styles.timerText}>{timer}</Text> s
        </Text>

        <TouchableOpacity
          style={styles.verifyButton}
          onPress={() => navigation.navigate('CreateNewPassword')}
        >
          <Text style={styles.verifyButtonText}>Verify</Text>
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
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.xxl,
  },
  otpBox: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.gray100,
    borderWidth: 1,
    borderColor: COLORS.gray300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  otpBoxActive: {
    borderColor: COLORS.primaryOrange,
    backgroundColor: '#FFF4EB',
  },
  otpBoxFilled: {},
  otpText: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
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
