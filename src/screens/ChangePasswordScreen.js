import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { config } from '../../config';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  COMMON_STYLES,
} from '../constants/theme';

const ChangePasswordScreen = () => {
  const navigation = useNavigation();
  const { user } = useSelector(state => state.app);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChangePassword = async () => {
    // Validation
    if (!currentPassword.trim()) {
      setTimeout(() => {
        Alert.alert('Error', 'Please enter your current password');
      }, 100);
      return;
    }

    if (!newPassword.trim()) {
      setTimeout(() => {
        Alert.alert('Error', 'Please enter your new password');
      }, 100);
      return;
    }

    if (newPassword.length < 6) {
      setTimeout(() => {
        Alert.alert('Error', 'New password must be at least 6 characters');
      }, 100);
      return;
    }

    if (newPassword !== confirmPassword) {
      setTimeout(() => {
        Alert.alert('Error', 'New passwords do not match');
      }, 100);
      return;
    }

    if (currentPassword === newPassword) {
      setTimeout(() => {
        Alert.alert(
          'Error',
          'New password must be different from current password',
        );
      }, 100);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(
        `${config.apiBaseUrl}/users/change-password`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            userId: user.id,
            currentPassword,
            newPassword,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to change password');
      }

      // Clear fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        Alert.alert('Success', 'Password changed successfully', [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]);
      }, 100);
    } catch (error) {
      console.error('Change password error:', error);
      setTimeout(() => {
        Alert.alert(
          'Error',
          error.message || 'Failed to change password. Please try again.',
        );
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const PasswordInput = ({
    label,
    value,
    onChangeText,
    placeholder,
    showPassword,
    toggleShowPassword,
  }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.passwordInputWrapper}>
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={COLORS.gray400}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.eyeIcon} onPress={toggleShowPassword}>
          <Icon
            name={showPassword ? 'eye-off' : 'eye'}
            size={22}
            color={COLORS.gray500}
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Change Password</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Icon name="lock-reset" size={64} color={COLORS.primaryOrange} />
          </View>

          <Text style={styles.description}>
            Please enter your current password and choose a new password
          </Text>

          <View style={styles.formContainer}>
            <PasswordInput
              label="Current Password"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              placeholder="Enter current password"
              showPassword={showCurrentPassword}
              toggleShowPassword={() =>
                setShowCurrentPassword(!showCurrentPassword)
              }
            />

            <PasswordInput
              label="New Password"
              value={newPassword}
              onChangeText={setNewPassword}
              placeholder="Enter new password"
              showPassword={showNewPassword}
              toggleShowPassword={() => setShowNewPassword(!showNewPassword)}
            />

            <PasswordInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Re-enter new password"
              showPassword={showConfirmPassword}
              toggleShowPassword={() =>
                setShowConfirmPassword(!showConfirmPassword)
              }
            />
          </View>

          {/* Password Requirements */}
          <View style={styles.requirementsBox}>
            <Text style={styles.requirementsTitle}>Password Requirements:</Text>
            <View style={styles.requirementItem}>
              <Icon
                name={
                  newPassword.length >= 6 ? 'check-circle' : 'circle-outline'
                }
                size={18}
                color={
                  newPassword.length >= 6 ? COLORS.success : COLORS.gray400
                }
              />
              <Text style={styles.requirementText}>At least 6 characters</Text>
            </View>
            <View style={styles.requirementItem}>
              <Icon
                name={
                  newPassword === confirmPassword && newPassword.length > 0
                    ? 'check-circle'
                    : 'circle-outline'
                }
                size={18}
                color={
                  newPassword === confirmPassword && newPassword.length > 0
                    ? COLORS.success
                    : COLORS.gray400
                }
              />
              <Text style={styles.requirementText}>Passwords match</Text>
            </View>
            <View style={styles.requirementItem}>
              <Icon
                name={
                  currentPassword !== newPassword && newPassword.length > 0
                    ? 'check-circle'
                    : 'circle-outline'
                }
                size={18}
                color={
                  currentPassword !== newPassword && newPassword.length > 0
                    ? COLORS.success
                    : COLORS.gray400
                }
              />
              <Text style={styles.requirementText}>
                Different from current password
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.changeButton,
              loading && styles.changeButtonDisabled,
            ]}
            onPress={handleChangePassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.changeButtonText}>Change Password</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
  },
  backButton: {
    ...COMMON_STYLES.backButton,
  },
  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  content: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },
  iconContainer: {
    alignItems: 'center',
    marginVertical: SPACING.xl,
  },
  description: {
    fontSize: FONTS.base,
    color: COLORS.gray600,
    textAlign: 'center',
    marginBottom: SPACING.xxl,
  },
  formContainer: {
    gap: SPACING.lg,
  },
  inputContainer: {
    marginBottom: SPACING.sm,
  },
  inputLabel: {
    fontSize: FONTS.base,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  passwordInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.gray300,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
  },
  input: {
    flex: 1,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
  },
  eyeIcon: {
    paddingHorizontal: SPACING.md,
  },
  requirementsBox: {
    backgroundColor: COLORS.backgroundLight,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    marginTop: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.gray200,
  },
  requirementsTitle: {
    fontSize: FONTS.base,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  requirementText: {
    fontSize: FONTS.sm,
    color: COLORS.gray600,
    marginLeft: SPACING.sm,
  },
  changeButton: {
    backgroundColor: COLORS.primaryOrange,
    paddingVertical: SPACING.lg,
    borderRadius: BORDER_RADIUS.xxxl,
    alignItems: 'center',
    marginTop: SPACING.xxl,
  },
  changeButtonDisabled: {
    opacity: 0.6,
  },
  changeButtonText: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
    color: COLORS.white,
  },
});

export default ChangePasswordScreen;
