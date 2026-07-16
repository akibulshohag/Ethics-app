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
import { useNavigation, useRoute } from '@react-navigation/native';
import SuccessModal from './SuccessModal';
import { resetPassword, validatePasswordStrength } from '../services/authService';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  DIMENSIONS,
  COMMON_STYLES,
} from '../constants/theme';

const CreateNewPassword = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const email = route.params?.email || '';
  const resetToken = route.params?.resetToken || '';
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email || !resetToken) {
      Alert.alert('Error', 'Session expired. Please start again.');
      navigation.navigate('ForgotPassword');
      return;
    }

    if (!password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in both password fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      Alert.alert('Error', passwordError);
      return;
    }

    setLoading(true);
    try {
      await resetPassword({
        email,
        resetToken,
        newPassword: password,
        confirmPassword,
      });
      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }, 2500);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to reset password');
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
        <Text style={styles.headerTitle}>Create New Password</Text>
      </View>

      <View style={styles.whiteSheet}>
        <Text style={styles.instructionText}>Create Your New Password</Text>
        <Text style={styles.hintText}>
          Use at least 8 characters with uppercase, lowercase, and a number.
        </Text>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>New Password</Text>
          <View style={styles.inputWrapper}>
            <Icon
              name="lock"
              size={20}
              color={COLORS.textPrimary}
              style={styles.leftIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Password"
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Icon
                name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirm Password</Text>
          <View style={styles.inputWrapper}>
            <Icon
              name="lock"
              size={20}
              color={COLORS.textPrimary}
              style={styles.leftIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Icon
                name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleResetPassword}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.continueText}>Continue</Text>
          )}
        </TouchableOpacity>
      </View>

      <SuccessModal
        visible={showSuccess}
        onClose={() => setShowSuccess(false)}
        message="Your password was reset successfully. Redirecting to login..."
      />
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
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  instructionText: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  hintText: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xxl,
  },
  inputContainer: {
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: FONTS.sm,
    color: COLORS.gray700,
    marginBottom: SPACING.md,
    fontWeight: FONTS.medium,
  },
  inputWrapper: {
    ...COMMON_STYLES.inputWrapper,
    height: DIMENSIONS.inputHeightLarge,
  },
  leftIcon: {
    marginRight: SPACING.md,
  },
  input: {
    flex: 1,
    fontSize: FONTS.base,
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
    elevation: 5,
    ...SHADOWS.small,
  },
  continueText: {
    color: COLORS.white,
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
  },
});

export default CreateNewPassword;
