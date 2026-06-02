import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { appSetUser } from '../redux/actions/appSlice';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
} from '../constants/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Dropdown } from 'react-native-element-dropdown';
import { getRolesList } from '../services/roleService';
import {
  register,
  verifyEmailOtp,
  resendEmailVerificationOtp,
  validatePasswordStrength,
  SIGNUP_ROLES,
} from '../services/authService';

const SignUpScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roleId, setRoleId] = useState(null);
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationMode, setVerificationMode] = useState(false);
  const [pendingEmail, setPendingEmail] = useState('');
  const [verificationOtp, setVerificationOtp] = useState('');

  useEffect(() => {
    getRolesList()
      .then(res => {
        const signupRoles = (res?.roles || []).filter(r =>
          SIGNUP_ROLES.includes(String(r.name || '').toLowerCase()),
        );
        setRoles(signupRoles);
        if (signupRoles.length > 0 && !roleId) {
          const defaultRole =
            signupRoles.find(r => r.name === 'user') || signupRoles[0];
          setRoleId(defaultRole.id);
        }
      })
      .catch(() => {
        setRoles([]);
        Alert.alert(
          'Error',
          'Unable to load account types. Please check your connection and try again.',
        );
      })
      .finally(() => setRolesLoading(false));
  }, []);

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      setTimeout(() => {
        Alert.alert('Error', 'Please fill in all fields');
      }, 100);
      return;
    }

    if (password !== confirmPassword) {
      setTimeout(() => {
        Alert.alert('Error', 'Passwords do not match');
      }, 100);
      return;
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      Alert.alert('Error', passwordError);
      return;
    }

    if (!roleId) {
      Alert.alert('Error', 'Please select an account type');
      return;
    }

    const selectedRole = roles.find(r => r.id === roleId);
    if (!selectedRole) {
      Alert.alert('Error', 'Invalid account type selected');
      return;
    }

    const isFallbackRoleId = ['user', 'owner', 'vendor'].includes(
      String(selectedRole.id).toLowerCase(),
    );

    setLoading(true);
    try {
      const data = await register({
        email: email.trim(),
        password: password.trim(),
        role: selectedRole.name,
        ...(isFallbackRoleId ? {} : { roleId: selectedRole.id }),
      });

      if (data?.requiresEmailVerification) {
        setPendingEmail(email.trim());
        setVerificationMode(true);
        setVerificationOtp('');
        Alert.alert(
          'Verify Email',
          'We sent a verification OTP to your email. Enter OTP to activate your account.',
        );
        return;
      }

      // Save user data to Redux (which persists to AsyncStorage)
      const userData = {
        id: data.user.id,
        name: data.user.name || 'New User',
        email: data.user.email,
        phone: data.user.phone || '',
        nickname: data.user.nickname || '',
        gender: data.user.gender || 'others',
        role: data.user.role,
        roleId: data.user.roleId,
        address: data.user.address,
        latitude: data.user.latitude,
        longitude: data.user.longitude,
        token: data.token,
      };

      dispatch(appSetUser(userData));

      // Go directly to main app (Home = HomeVersion)
      try {
        navigation.reset({ index: 0, routes: [{ name: 'Root' }] });
      } catch (_) {}
    } catch (error) {
      console.error('Sign up error:', error);
      setTimeout(() => {
        Alert.alert(
          'Error',
          error.message || 'Registration failed. Please try again.',
        );
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!pendingEmail || !verificationOtp.trim()) {
      Alert.alert('Error', 'Please enter OTP');
      return;
    }

    setLoading(true);
    try {
      const data = await verifyEmailOtp(pendingEmail, verificationOtp);

      const userData = {
        id: data.user.id,
        name: data.user.name || 'New User',
        email: data.user.email,
        phone: data.user.phone || '',
        nickname: data.user.nickname || '',
        gender: data.user.gender || 'others',
        role: data.user.role,
        roleId: data.user.roleId,
        address: data.user.address,
        latitude: data.user.latitude,
        longitude: data.user.longitude,
        token: data.token,
      };
      dispatch(appSetUser(userData));
      navigation.reset({ index: 0, routes: [{ name: 'Root' }] });
    } catch (error) {
      Alert.alert('Error', error.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerificationOtp = async () => {
    if (!pendingEmail) return;
    setLoading(true);
    try {
      await resendEmailVerificationOtp(pendingEmail);
      Alert.alert('Success', 'OTP sent again to your email');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFCC00" />

      {/* Orange Header */}
      <View style={styles.header}>
        <SafeAreaView>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Your Account</Text>
          <Text style={styles.headerSubtitle}>
            Let's get started on your journey to better health. to better
            health.
          </Text>
        </SafeAreaView>
      </View>

      {/* Form Container */}
      <View style={styles.formCard}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 40 }}
        >
          {/* Email Input */}
          <Text style={styles.inputLabel}>Email</Text>
          <View style={styles.inputWrapper}>
            <Icon name="email" size={20} color="black" />

            <TextInput
              style={styles.input}
              placeholder="john.doe@domain.com"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {!verificationMode ? (
            <>
              <Text style={styles.inputLabel}>Create Password</Text>
              <View style={[styles.inputWrapper, styles.inputActive]}>
                <Icon name="lock" size={20} color="black" />
                <TextInput
                  style={styles.input}
                  secureTextEntry={!passwordVisible}
                  placeholder="Enter password"
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setPasswordVisible(!passwordVisible)}
                >
                  <Icon
                    name={passwordVisible ? 'eye' : 'eye-off'}
                    size={20}
                    color="black"
                  />
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.inputLabel}>Email Verification OTP</Text>
              <View style={styles.inputWrapper}>
                <Icon name="shield-check" size={20} color="black" />
                <TextInput
                  style={styles.input}
                  placeholder="Enter OTP"
                  placeholderTextColor="#999"
                  value={verificationOtp}
                  onChangeText={setVerificationOtp}
                  keyboardType="number-pad"
                />
              </View>
            </>
          )}

          {!verificationMode ? (
            <>
              {/* Role Input */}
              <Text style={styles.inputLabel}>Account Type</Text>
              <View style={styles.inputWrapper}>
                <Icon name="account-badge" size={20} color="black" />
                <Dropdown
                  data={roles.map(r => ({
                    label:
                      r.name === 'user'
                        ? 'User'
                        : r.name === 'owner'
                          ? 'Owner'
                          : r.name === 'vendor'
                            ? 'Vendor'
                            : r.name,
                    value: r.id,
                  }))}
                  value={roleId}
                  labelField="label"
                  valueField="value"
                  placeholder={
                    rolesLoading
                      ? 'Loading account types...'
                      : roles.length
                        ? 'Select account type'
                        : 'No account types available'
                  }
                  onChange={item => setRoleId(item.value)}
                  style={styles.dropdown}
                  placeholderStyle={styles.dropdownPlaceholder}
                  selectedTextStyle={styles.dropdownSelectedText}
                  containerStyle={styles.dropdownContainer}
                />
              </View>
            </>
          ) : null}

          {!verificationMode ? (
            <>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <Icon name="lock" size={20} color="black" />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#BBB"
                  secureTextEntry={!confirmPasswordVisible}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                >
                  <Icon
                    name={confirmPasswordVisible ? 'eye' : 'eye-off'}
                    size={20}
                    color="black"
                  />
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          {/* Sign Up Button */}
          <Pressable
            style={({ hovered, pressed }) => [
              styles.signUpButton,
              {
                backgroundColor: hovered || pressed ? '#F97507' : '#32373D',
              },
            ]}
            onPress={verificationMode ? handleVerifyEmailOtp : handleSignUp}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.signUpButtonText}>
                {verificationMode ? 'Verify Email' : 'Sign up'}
              </Text>
            )}
          </Pressable>

          {verificationMode ? (
            <Pressable
              style={({ hovered, pressed }) => [
                styles.signUpButton,
                {
                  marginTop: 12,
                  backgroundColor: hovered || pressed ? '#1f242a' : '#32373D',
                },
              ]}
              onPress={handleResendVerificationOtp}
              disabled={loading}
            >
              <Text style={styles.signUpButtonText}>Resend OTP</Text>
            </Pressable>
          ) : null}

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.line} />
            <Text style={styles.orText}>or continue with</Text>
            <View style={styles.line} />
          </View>

          {/* Social Row */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialCircle}>
              <Icon name="facebook" size={20} color="black" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialCircle}>
              <Icon name="google" size={20} color="black" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.socialCircle}>
              <Icon name="apple" size={20} color="black" />
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already Have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.loginLink}>Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFCC00',
  },
  header: {
    backgroundColor: COLORS.primaryOrange,
    paddingHorizontal: SPACING.xxl,
    paddingBottom: SPACING.xxl,
  },
  backButton: {
    marginTop: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  backArrow: {
    fontSize: 28,
    color: COLORS.white,
  },
  headerTitle: {
    fontSize: FONTS.xxxl,
    fontWeight: FONTS.bold,
    color: COLORS.white,
    marginBottom: SPACING.sm,
  },
  headerSubtitle: {
    fontSize: FONTS.base,
    color: COLORS.white,
    opacity: 0.9,
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  formCard: {
    flex: 1,
    marginTop: -SPACING.lg, // Overlaps header slightly
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.xxl,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginTop: 15,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 30,
    paddingHorizontal: 20,
    height: 60,
  },
  inputActive: {
    borderWidth: 1,
    borderColor: '#FF7F0B', // Highlighted border
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
    color: '#333',
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  eyeIcon: {
    fontSize: 18,
    color: '#999',
  },
  signUpButton: {
    backgroundColor: '#32373D',
    borderRadius: 30,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 35,
  },
  signUpButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 40,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#EEE',
  },
  orText: {
    marginHorizontal: 15,
    color: '#666',
    fontSize: 16,
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 30,
  },
  socialCircle: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 40,
  },
  footerText: {
    color: '#999',
    fontSize: 15,
  },
  loginLink: {
    color: '#FF7F0B',
    fontSize: 15,
    fontWeight: '600',
  },
  dropdown: {
    flex: 1,
    marginLeft: 8,
    minHeight: 56,
  },
  dropdownPlaceholder: { color: '#999', fontSize: 16 },
  dropdownSelectedText: { color: '#333', fontSize: 16 },
  dropdownContainer: { borderRadius: 12, borderWidth: 1, borderColor: '#eee' },
});

export default SignUpScreen;
