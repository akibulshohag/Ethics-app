import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { appSetUser } from '../redux/actions/appSlice';
import { config } from '../../config';
import { getRolesList } from '../services/roleService';

const { width, height } = Dimensions.get('window');

const LOGIN_SCREEN_YELLOW = '#F5A623';

/** UI label → API role name */
const ROLE_MAP = {
  Diner: 'user',
  Business: 'owner',
  vendor: 'vendor',
};

const HomeSixScreen = ({ onBack, onLoginPress }) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();
  const [userType, setUserType] = useState('Diner');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationMode, setVerificationMode] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');

  useEffect(() => {
    getRolesList()
      .then(res => {
        setRoles(res?.roles || []);
      })
      .catch(() => setRoles([]))
      .finally(() => setRolesLoading(false));
  }, []);

  const getRoleIdForUserType = () => {
    const roleName = ROLE_MAP[userType];
    if (!roleName || !roles.length) return null;
    const role = roles.find(
      r => String(r.name).toLowerCase() === roleName.toLowerCase(),
    );
    return role ? role.id : null;
  };

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

    const roleId = getRoleIdForUserType();

    setLoading(true);
    try {
      const response = await fetch(`${config.apiBaseUrl}/users/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
          ...(roleId ? { roleId } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      if (data?.requiresEmailVerification) {
        setPendingEmail(email.trim());
        setVerificationMode(true);
        setVerificationOtp('');
        setTimeout(() => {
          Alert.alert(
            'Verify Email',
            'We sent a verification OTP to your email. Enter OTP to activate your account.',
          );
        }, 100);
        return;
      }

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
      const response = await fetch(
        `${config.apiBaseUrl}/users/verify-email-verification-otp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: pendingEmail,
            otp: verificationOtp.trim(),
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }

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
      const response = await fetch(
        `${config.apiBaseUrl}/users/request-email-verification-otp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: pendingEmail }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to resend OTP');
      }
      Alert.alert('Success', 'OTP sent again to your email');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleLoginPress = () => {
    if (onLoginPress) {
      onLoginPress();
    } else {
      navigation.navigate('HomeSevenScreen');
    }
  };

  const RadioButton = ({ label, value }) => (
    <TouchableOpacity
      style={styles.radioButton}
      onPress={() => setUserType(value)}
      disabled={loading || rolesLoading}
    >
      <Icon
        name={userType === value ? 'radiobox-marked' : 'radiobox-blank'}
        size={24}
        color="#F5A623"
      />
      <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screenRoot}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={LOGIN_SCREEN_YELLOW}
      />
      <SafeAreaView style={styles.overlay} edges={['bottom', 'left', 'right']}>
        <View style={styles.bgOrbOne} />
        <View style={styles.bgOrbTwo} />
        <View style={styles.bgOrbThree} />
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View
            style={[
              styles.navHeader,
              {
                paddingTop: Math.max(insets.top, 12) + 8,
                paddingBottom: 10,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => (onBack ? onBack() : navigation.goBack())}
              style={styles.backBtn}
              activeOpacity={0.85}
              hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
            >
              <Icon name="chevron-left" size={22} color="#1A0F00" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.centerContainer}>
            <View style={styles.registerCard}>
              <View style={styles.cardGlow} />
              <Text style={styles.headerTitle}>Create account</Text>
              <Text style={styles.headerSubTitle}>
                Sign up to start your journey
              </Text>

              <View style={styles.cardBody}>
                {!verificationMode ? (
                  <View style={styles.radioGroup}>
                    <Text style={styles.roleLabel}>Choose account type</Text>
                    <View style={styles.roleChips}>
                      <RadioButton label="Diner" value="Diner" />
                      <RadioButton label="Business" value="Business" />
                      <RadioButton label="vendor" value="vendor" />
                    </View>
                  </View>
                ) : (
                  <View style={styles.radioGroup}>
                    <Text style={styles.roleLabel}>Email verification</Text>
                    <Text style={styles.verifyHintText}>
                      Enter OTP sent to {pendingEmail}
                    </Text>
                  </View>
                )}

                <View style={styles.inputWrapper}>
                  <Icon
                    name="email-outline"
                    size={22}
                    color="#7A4B00"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Enter your email"
                    placeholderTextColor="#8E6230"
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>

                {!verificationMode ? (
                  <>
                    <View style={styles.inputWrapper}>
                      <Icon
                        name="lock-outline"
                        size={22}
                        color="#7A4B00"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        placeholder="Password"
                        placeholderTextColor="#8E6230"
                        secureTextEntry={!passwordVisible}
                        style={styles.input}
                        value={password}
                        onChangeText={setPassword}
                        editable={!loading}
                      />
                      <TouchableOpacity
                        onPress={() => setPasswordVisible(!passwordVisible)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Icon
                          name={passwordVisible ? 'eye-off' : 'eye'}
                          size={22}
                          color="#7A4B00"
                        />
                      </TouchableOpacity>
                    </View>

                    <View style={styles.inputWrapper}>
                      <Icon
                        name="lock-outline"
                        size={22}
                        color="#7A4B00"
                        style={styles.inputIcon}
                      />
                      <TextInput
                        placeholder="Confirm Password"
                        placeholderTextColor="#8E6230"
                        secureTextEntry={!confirmPasswordVisible}
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        editable={!loading}
                      />
                      <TouchableOpacity
                        onPress={() =>
                          setConfirmPasswordVisible(!confirmPasswordVisible)
                        }
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Icon
                          name={confirmPasswordVisible ? 'eye-off' : 'eye'}
                          size={22}
                          color="#7A4B00"
                        />
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <View style={styles.inputWrapper}>
                    <Icon
                      name="shield-check-outline"
                      size={22}
                      color="#7A4B00"
                      style={styles.inputIcon}
                    />
                    <TextInput
                      placeholder="Enter OTP"
                      placeholderTextColor="#8E6230"
                      style={styles.input}
                      value={verificationOtp}
                      onChangeText={setVerificationOtp}
                      keyboardType="number-pad"
                      editable={!loading}
                    />
                  </View>
                )}

                <TouchableOpacity
                  style={styles.actionBtnSignUp}
                  onPress={verificationMode ? handleVerifyEmailOtp : handleSignUp}
                  disabled={loading || rolesLoading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.btnText}>
                      {verificationMode ? 'Verify Email' : 'Sign Up'}
                    </Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.actionBtnLogin}
                  onPress={verificationMode ? handleResendVerificationOtp : handleLoginPress}
                  disabled={loading}
                >
                  <Text style={styles.signInText}>
                    {verificationMode ? 'Resend OTP' : 'Login'}
                  </Text>
                </TouchableOpacity>

                <View style={styles.socialContainer}>
                  <Text style={styles.socialTitle}>Or continue with</Text>
                  <View style={styles.socialPill}>
                    <TouchableOpacity
                      style={styles.socialIcon}
                      disabled={loading}
                    >
                      <Icon name="facebook" size={32} color="#1877F2" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.socialIcon}
                      disabled={loading}
                    >
                      <Icon name="google" size={32} color="#EA4335" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    width,
    height,
    backgroundColor: LOGIN_SCREEN_YELLOW,
  },
  overlay: { flex: 1, backgroundColor: 'transparent' },
  bgOrbOne: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 140,
    backgroundColor: 'rgba(255, 255, 255, 0.28)',
    top: -70,
    right: -50,
  },
  bgOrbTwo: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 160,
    backgroundColor: 'rgba(255, 140, 0, 0.28)',
    bottom: 160,
    left: -90,
  },
  bgOrbThree: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 120,
    backgroundColor: 'rgba(122, 62, 0, 0.16)',
    bottom: -70,
    right: -60,
  },
  keyboardView: { flex: 1 },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    alignItems: 'center',
    zIndex: 2,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: 'rgba(215, 133, 0, 0.55)',
    ...Platform.select({
      android: {
        elevation: 4,
        shadowColor: '#000',
      },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 4,
      },
    }),
  },
  backText: {
    color: '#1A0F00',
    fontSize: 15,
    fontWeight: '800',
    marginLeft: 2,
    letterSpacing: 0.2,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 14,
  },
  registerCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 245, 220, 0.62)',
    borderRadius: 30,
    marginTop: 26,
    paddingVertical: 24,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.75)',
    marginBottom: 56,
    shadowColor: '#9B4D00',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    overflow: 'hidden',
  },
  cardGlow: {
    position: 'absolute',
    top: -90,
    right: -70,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  headerTitle: {
    fontSize: 30,
    fontWeight: '800',
    color: '#2D1800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  headerSubTitle: {
    fontSize: 16,
    color: '#5E3500',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 6,
  },
  cardBody: { padding: 5 },
  radioGroup: { marginBottom: 16 },
  roleLabel: {
    color: '#6F4200',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 10,
    marginLeft: 4,
  },
  verifyHintText: {
    color: '#6F4200',
    fontSize: 12,
    marginLeft: 4,
    marginTop: -2,
  },
  roleChips: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    flexWrap: 'wrap',
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  radioLabel: {
    marginLeft: 6,
    fontSize: 13,
    color: '#5E3500',
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.70)',
    borderRadius: 16,
    height: 52,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#2A1A00', fontSize: 15 },
  actionBtnSignUp: {
    backgroundColor: '#2B1A00',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
    shadowColor: '#5B3200',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 7,
  },
  actionBtnLogin: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(122, 72, 0, 0.30)',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  btnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  signInText: { color: '#5B3200', fontSize: 18, fontWeight: '700' },
  socialContainer: { alignItems: 'center', marginTop: 22 },
  socialTitle: { color: '#5E3500', fontSize: 15, marginBottom: 15 },
  socialPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.72)',
    paddingHorizontal: 20,
    paddingVertical: 6,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  socialIcon: { marginHorizontal: 12 },
});

export default HomeSixScreen;
