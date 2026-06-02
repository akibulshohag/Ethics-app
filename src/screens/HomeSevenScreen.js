import React, { useState } from 'react';
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
import { SafeAreaView } from 'react-native-safe-area-context';

import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { appSetUser } from '../redux/actions/appSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  login,
  verifyEmailOtp,
  isAccountInactiveError,
  isAccountPendingError,
} from '../services/authService';

const { width, height } = Dimensions.get('window');

/** Full-screen login backdrop */
const LOGIN_SCREEN_YELLOW = '#F5A623';

const LOCATION_KEY = 'USER_LOCATION_SELECTION';
const LOCATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const HomeSevenScreen = ({ onBack, onSignUp }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();

  // PRESERVED: Original params
  const returnToOrder = route.params?.returnToOrder;
  const ownerUserId = route.params?.ownerUserId;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verificationMode, setVerificationMode] = useState(false);
  const [verificationOtp, setVerificationOtp] = useState('');

  // PRESERVED: Original handleLogin functionality
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setTimeout(() => {
        Alert.alert('Error', 'Please enter email and password');
      }, 100);
      return;
    }

    setLoading(true);
    try {
      const data = await login(email, password);

      // PRESERVED: Complete user data object
      const userData = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone,
        nickname: data.user.nickname,
        gender: data.user.gender,
        role: data.user.role,
        roleId: data.user.roleId,
        address: data.user.address,
        latitude: data.user.latitude,
        longitude: data.user.longitude,
        pin: data.user.pin,
        photos: data.user.photos ?? [],
        channelAbout: data.user.channelAbout,
        socialLinks: data.user.socialLinks,
        savedLastLocation: data.user.savedLastLocation,
        rememberMe: rememberMe,
        token: data.token,
      };

      dispatch(appSetUser(userData));

      try {
        let targetRoute = { name: 'HomeOneScreen' };
        const backendLoc = data.user?.savedLastLocation;
        const hasBackendLoc =
          backendLoc &&
          typeof backendLoc === 'object' &&
          backendLoc.lat != null &&
          backendLoc.lng != null &&
          Number.isFinite(Number(backendLoc.lat)) &&
          Number.isFinite(Number(backendLoc.lng));

        if (hasBackendLoc) {
          targetRoute = {
            name: 'HomeOneScreen',
            params: {
              selectedLocation: {
                lat: Number(backendLoc.lat),
                lng: Number(backendLoc.lng),
              },
              addressText: backendLoc.addressText || '',
            },
          };
        } else {
          try {
            const raw = await AsyncStorage.getItem(LOCATION_KEY);
            if (raw && typeof raw === 'string') {
              const saved = JSON.parse(raw);
              if (saved && typeof saved === 'object') {
                const coords =
                  saved.coords && typeof saved.coords === 'object'
                    ? saved.coords
                    : { lat: saved.lat, lng: saved.lng };
                const lat = coords?.lat != null ? Number(coords.lat) : null;
                const lng = coords?.lng != null ? Number(coords.lng) : null;
                const sameUser =
                  saved.userId == null || saved.userId === userData.id;
                const savedAt =
                  saved.savedAt != null ? Number(saved.savedAt) : null;
                const fresh =
                  savedAt == null || Date.now() - savedAt <= LOCATION_TTL_MS;
                const hasCoords =
                  lat != null &&
                  lng != null &&
                  Number.isFinite(lat) &&
                  Number.isFinite(lng);
                if (sameUser && fresh && hasCoords) {
                  targetRoute = {
                    name: 'HomeOneScreen',
                    params: {
                      selectedLocation: { lat, lng },
                      addressText: saved.addressText || '',
                    },
                  };
                }
              }
            }
          } catch (e) {}
        }

        setTimeout(() => {
          try {
            navigation.reset({
              index: 0,
              routes: [targetRoute],
            });
          } catch (navErr) {
            navigation.reset({ index: 0, routes: [{ name: 'HomeOneScreen' }] });
          }
        }, 0);
      } catch (_) {}
    } catch (error) {
      console.error('Login error:', error);
      const msg = String(error?.message || '');

      if (isAccountInactiveError(msg)) {
        Alert.alert(
          'Account Recovery Required',
          msg.replace(/^ACCOUNT_INACTIVE:\s*/, ''),
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Recover Account',
              onPress: () => navigation.navigate('ForgotPassword'),
            },
          ],
        );
        return;
      }

      if (isAccountPendingError(msg)) {
        setVerificationMode(true);
        Alert.alert(
          'Email Verification Required',
          'Enter the OTP sent to your email to activate your account.',
        );
        return;
      }

      const pendingOrVerification =
        msg.toLowerCase().includes('pending') ||
        msg.toLowerCase().includes('verify');
      if (pendingOrVerification) {
        setVerificationMode(true);
      }
      setTimeout(() => {
        Alert.alert('Error', msg || 'Login failed. Please try again.');
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPendingAccount = async () => {
    if (!email.trim() || !verificationOtp.trim()) {
      Alert.alert('Error', 'Please enter email and OTP');
      return;
    }

    setLoading(true);
    try {
      const data = await verifyEmailOtp(email.trim(), verificationOtp);

      const userData = {
        id: data.user.id,
        name: data.user.name,
        email: data.user.email,
        phone: data.user.phone,
        nickname: data.user.nickname,
        gender: data.user.gender,
        role: data.user.role,
        roleId: data.user.roleId,
        address: data.user.address,
        latitude: data.user.latitude,
        longitude: data.user.longitude,
        pin: data.user.pin,
        photos: data.user.photos ?? [],
        channelAbout: data.user.channelAbout,
        socialLinks: data.user.socialLinks,
        savedLastLocation: data.user.savedLastLocation,
        rememberMe: rememberMe,
        token: data.token,
      };
      dispatch(appSetUser(userData));
      navigation.reset({ index: 0, routes: [{ name: 'HomeOneScreen' }] });
    } catch (error) {
      Alert.alert('Error', error.message || 'OTP verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtpForPendingAccount = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter email first');
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(
        `${config.apiBaseUrl}/users/request-email-verification-otp`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim() }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }
      setVerificationMode(true);
      Alert.alert('Success', 'OTP sent to your email');
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screenRoot}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={LOGIN_SCREEN_YELLOW}
      />
      <SafeAreaView style={styles.overlay}>
        <View style={styles.bgOrbOne} />
        <View style={styles.bgOrbTwo} />
        <View style={styles.bgOrbThree} />
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <View style={styles.navHeader}>
            <TouchableOpacity
              onPress={() => (onBack ? onBack() : navigation.goBack())}
              style={styles.backBtn}
            >
              <Icon name="chevron-left" size={18} color="#2D1800" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.centerContainer}>
            <View style={styles.loginCard}>
              <View style={styles.cardGlow} />
              <Text style={styles.headerTitle}>Welcome back</Text>
              <Text style={styles.headerSubTitle}>
                Sign in to continue your journey
              </Text>

              <View style={styles.cardBody}>
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

                {verificationMode ? (
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
                ) : null}

                <View style={styles.utilityRow}>
                  <TouchableOpacity
                    style={styles.checkboxContainer}
                    onPress={() => setRememberMe(!rememberMe)}
                    disabled={loading}
                  >
                    <Icon
                      name={
                        rememberMe
                          ? 'checkbox-marked'
                          : 'checkbox-blank-outline'
                      }
                      size={20}
                      color="#8C5700"
                    />
                    <Text style={styles.utilityText}>Remember me</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('ForgotPassword')}
                    disabled={loading}
                  >
                    <Text style={styles.utilityText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  style={styles.actionBtnLogin}
                  onPress={verificationMode ? handleVerifyPendingAccount : handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.btnText}>
                      {verificationMode ? 'Verify OTP' : 'Login'}
                    </Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnSignUp}
                  onPress={
                    verificationMode
                      ? handleResendOtpForPendingAccount
                      : () =>
                          onSignUp
                            ? onSignUp()
                            : navigation.navigate('HomeSixScreen')
                  }
                  disabled={loading}
                >
                  <Text style={styles.signUpText}>
                    {verificationMode ? 'Resend OTP' : 'Sign Up'}
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
  overlay: {
    flex: 1,
    backgroundColor: LOGIN_SCREEN_YELLOW,
  },
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
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 10,
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.45)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
  },
  backText: {
    color: '#2D1800',
    fontSize: 13,
    fontWeight: '700',
    marginLeft: 4,
  },

  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  loginCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 245, 220, 0.62)',
    borderRadius: 30,
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
    marginBottom: 24,
    marginTop: 6,
  },
  cardBody: { padding: 5 },
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

  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  utilityText: { fontSize: 13, color: '#5E3500', marginLeft: 5 },
  actionBtnLogin: {
    backgroundColor: '#2B1A00',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#5B3200',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 7,
  },
  actionBtnSignUp: {
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(122, 72, 0, 0.30)',
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  btnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  signUpText: { color: '#5B3200', fontSize: 18, fontWeight: '700' },
  socialContainer: { alignItems: 'center', marginTop: 25 },
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

export default HomeSevenScreen;
