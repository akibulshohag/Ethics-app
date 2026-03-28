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
import { config } from '../../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
      const response = await fetch(`${config.apiBaseUrl}/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

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
      setTimeout(() => {
        Alert.alert(
          'Error',
          error.message || 'Login failed. Please try again.',
        );
      }, 100);
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
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* UPDATED: Nav Header Style */}
          <View style={styles.navHeader}>
            <TouchableOpacity
              onPress={() => (onBack ? onBack() : navigation.goBack())}
              style={styles.backBtn}
            >
              <Icon name="chevron-left" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <View style={styles.centerContainer}>
            {/* UPDATED: UI Glassmorphism Card */}
            <View style={styles.loginCard}>
              <Text style={styles.headerTitle}>Welcome back</Text>
              <Text style={styles.headerSubTitle}>Sign in to continue</Text>

              <View style={styles.cardBody}>
                {/* Email Input */}
                <View style={styles.inputWrapper}>
                  <Icon
                    name="email-outline"
                    size={22}
                    color="#555"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Enter your email"
                    placeholderTextColor="#999"
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>

                {/* Password Input */}
                <View style={styles.inputWrapper}>
                  <Icon
                    name="lock-outline"
                    size={22}
                    color="#555"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor="#999"
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
                      name={passwordVisible ? 'eye' : 'eye-off'}
                      size={22}
                      color="#333"
                    />
                  </TouchableOpacity>
                </View>

                {/* Remember & Forgot Row */}
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
                      color="#333"
                    />
                    <Text style={styles.utilityText}>Remember me</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      try {
                        navigation.navigate('ForgotPassword');
                      } catch (_) {
                        Alert.alert(
                          'Info',
                          'Forgot password flow not available.',
                        );
                      }
                    }}
                    disabled={loading}
                  >
                    <Text style={styles.utilityText}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                {/* UPDATED: Action Buttons Stacked per Screenshot */}
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
                    onSignUp ? onSignUp() : navigation.navigate('HomeSixScreen')
                  }
                  disabled={loading}
                >
                  <Text style={styles.signUpText}>Sign Up</Text>
                </TouchableOpacity>

                {/* Social Login Section */}
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
  overlay: { flex: 1 },
  keyboardView: { flex: 1 },
  navHeader: { padding: 15 },
  backBtn: {
    width: 38,
    height: 38,
    backgroundColor: 'rgba(255,255,255,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  loginCard: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.45)', // Glass effect
    borderRadius: 25,
    paddingVertical: 20,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    marginBottom: 80,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    textAlign: 'center',
  },
  headerSubTitle: {
    fontSize: 16,
    color: '#333',
    textAlign: 'center',
    marginBottom: 25,
  },
  cardBody: { padding: 5 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#333', fontSize: 16 },
  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 25,
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  utilityText: { fontSize: 13, color: '#333', marginLeft: 5 },
  actionBtnLogin: {
    backgroundColor: '#222',
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  actionBtnSignUp: {
    height: 52,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
  },
  btnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  signUpText: { color: '#8B4513', fontSize: 18, fontWeight: 'bold' },
  socialContainer: { alignItems: 'center', marginTop: 25 },
  socialTitle: { color: '#333', fontSize: 14, marginBottom: 15 },
  socialPill: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.7)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 25,
  },
  socialIcon: { marginHorizontal: 15 },
});

export default HomeSevenScreen;
