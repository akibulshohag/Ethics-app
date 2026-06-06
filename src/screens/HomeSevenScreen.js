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
import { useNavigation, useRoute, CommonActions } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { appSetUser, setBrowseLocation } from '../redux/actions/appSlice';
import {
  resolvePostLoginBrowseLocation,
  homeRouteForBrowseLocation,
  persistBrowseLocation,
} from '../services/userLocationService';
import {
  login,
  // Future: verifyEmailOtp,
  isAccountInactiveError,
} from '../services/authService';
import {
  loginWithFacebook,
  loginWithGoogle,
  normalizeSocialAuthError,
} from '../services/socialAuthService';
const { width, height } = Dimensions.get('window');

/** Full-screen login backdrop */
const LOGIN_SCREEN_YELLOW = '#F5A623';

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
  // Future: email verification on login for pending accounts
  // const [verificationMode, setVerificationMode] = useState(false);
  // const [verificationOtp, setVerificationOtp] = useState('');

  // PRESERVED: Original handleLogin functionality
  const navigateAfterLogin = async userData => {
    const role = String(userData?.role || '').toLowerCase();
    if (role === 'rider') {
      let rootNav = navigation;
      while (rootNav?.getParent?.()) rootNav = rootNav.getParent();
      rootNav.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'Root' }],
        }),
      );
      return;
    }
    const browseLoc = await resolvePostLoginBrowseLocation(userData);
    if (browseLoc) {
      dispatch(setBrowseLocation(browseLoc));
      await persistBrowseLocation({
        userId: userData?.id,
        lat: browseLoc.lat,
        lng: browseLoc.lng,
        postcode: browseLoc.postcode || '',
        addressText: browseLoc.addressText || '',
        areaLabel: browseLoc.areaLabel || '',
      });
    }
    const targetRoute = homeRouteForBrowseLocation(browseLoc);
    setTimeout(() => {
      try {
        navigation.reset({ index: 0, routes: [targetRoute] });
      } catch (_) {
        navigation.reset({ index: 0, routes: [{ name: 'HomeOneScreen' }] });
      }
    }, 0);
  };

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
        postcode: data.user.postcode,
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
      await navigateAfterLogin(userData);
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

      setTimeout(() => {
        Alert.alert('Error', msg || 'Login failed. Please try again.');
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  // Future: handleVerifyPendingAccount / handleResendOtpForPendingAccount

  const handleSocialLogin = async provider => {
    setLoading(true);
    try {
      const data =
        provider === 'facebook'
          ? await loginWithFacebook()
          : await loginWithGoogle();

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
        postcode: data.user.postcode,
        latitude: data.user.latitude,
        longitude: data.user.longitude,
        pin: data.user.pin,
        photos: data.user.photos ?? [],
        channelAbout: data.user.channelAbout,
        socialLinks: data.user.socialLinks,
        savedLastLocation: data.user.savedLastLocation,
        rememberMe,
        token: data.token,
      };
      dispatch(appSetUser(userData));
      await navigateAfterLogin(userData);
    } catch (error) {
      const msg = normalizeSocialAuthError(error);
      if (msg !== 'Sign-in cancelled') {
        Alert.alert('Social Login Failed', msg);
      }
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
                  onPress={handleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#FFF" size="small" />
                  ) : (
                    <Text style={styles.btnText}>Login</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionBtnSignUp}
                  onPress={() =>
                    onSignUp
                      ? onSignUp()
                      : navigation.navigate('HomeSixScreen')
                  }
                  disabled={loading}
                >
                  <Text style={styles.signUpText}>Sign Up</Text>
                </TouchableOpacity>

                <View style={styles.socialContainer}>
                  <Text style={styles.socialTitle}>Or continue with</Text>
                  <View style={styles.socialPill}>
                    <TouchableOpacity
                      style={styles.socialIcon}
                      onPress={() => handleSocialLogin('facebook')}
                      disabled={loading}
                      activeOpacity={0.75}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Icon name="facebook" size={32} color="#1877F2" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.socialIcon}
                      onPress={() => handleSocialLogin('google')}
                      disabled={loading}
                      activeOpacity={0.75}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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
  socialIcon: {
    marginHorizontal: 8,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeSevenScreen;
