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
  Image,
  ScrollView,
} from 'react-native';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import {
  appSetUser,
  setBrowseLocation,
  clearBrowseLocation,
} from '../redux/actions/appSlice';
import {
  resolvePostLoginBrowseLocation,
  homeRouteForBrowseLocation,
  persistBrowseLocation,
} from '../services/userLocationService';
import { getRolesList } from '../services/roleService';
import { register, validatePasswordStrength } from '../services/authService';
import {
  loginWithApple,
  loginWithFacebook,
  loginWithGoogle,
  normalizeSocialAuthError,
} from '../services/socialAuthService';
import TermsAcceptRow from '../components/TermsAcceptRow';
import { refreshUserSafetyAfterLogin } from '../services/userSafetyService';
import signupFood from '../assets/img/signupfood.png';
import decorBowl from '../assets/img/s1.png';
import decorSkyline from '../assets/img/s2.png';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const ORANGE = '#F5A623';
const CREAM = '#FFF5EB';
const CARD_MARGIN_H = 18;
const CARD_MARGIN_B = 28;
const CARD_PAD_H = 20;
const CARD_INNER_W = SCREEN_WIDTH - CARD_MARGIN_H * 2;
const HEADER_FOOD_H = SCREEN_HEIGHT * 0.22;
const CARD_BOTTOM_ART_H = SCREEN_HEIGHT * 0.11;

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
  const [termsAccepted, setTermsAccepted] = useState(false);

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

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      Alert.alert('Error', passwordError);
      return;
    }

    const roleName = ROLE_MAP[userType];
    if (!roleName) {
      Alert.alert('Error', 'Please select an account type');
      return;
    }

    if (!termsAccepted) {
      Alert.alert(
        'Terms required',
        'Please accept the Terms of Use and Community Guidelines to create an account.',
      );
      return;
    }

    const roleId = getRoleIdForUserType();

    setLoading(true);
    try {
      const data = await register({
        email: email.trim(),
        password: password.trim(),
        role: roleName,
        ...(roleId ? { roleId } : {}),
        termsAccepted: true,
      });

      if (data?.requiresEmailVerification) {
        navigation.navigate('OtpVerification', {
          email: email.trim(),
          mode: 'signup',
        });
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
        postcode: data.user.postcode,
        latitude: data.user.latitude,
        longitude: data.user.longitude,
        token: data.token,
      };

      dispatch(appSetUser(userData));
      await refreshUserSafetyAfterLogin();

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

  const handleLoginPress = () => {
    if (onLoginPress) {
      onLoginPress();
    } else {
      navigation.navigate('HomeSevenScreen');
    }
  };

  const handleSocialLogin = async provider => {
    if (!termsAccepted) {
      Alert.alert(
        'Terms required',
        'Please accept the Terms of Use and Community Guidelines to continue.',
      );
      return;
    }

    setLoading(true);
    try {
      const data =
        provider === 'facebook'
          ? await loginWithFacebook({ termsAccepted: true })
          : provider === 'apple'
            ? await loginWithApple({ termsAccepted: true })
            : await loginWithGoogle({ termsAccepted: true });

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
        postcode: data.user.postcode,
        latitude: data.user.latitude,
        longitude: data.user.longitude,
        pin: data.user.pin,
        photos: data.user.photos ?? [],
        channelAbout: data.user.channelAbout,
        socialLinks: data.user.socialLinks,
        token: data.token,
      };
      dispatch(appSetUser(userData));
      await refreshUserSafetyAfterLogin();
      dispatch(clearBrowseLocation());
      const browseLoc = await resolvePostLoginBrowseLocation({
        ...userData,
        savedLastLocation: data.user?.savedLastLocation,
      });
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
      navigation.reset({
        index: 0,
        routes: [homeRouteForBrowseLocation(browseLoc)],
      });
    } catch (error) {
      const msg = normalizeSocialAuthError(error);
      if (msg !== 'Sign-in cancelled') {
        Alert.alert('Social Login Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const RadioButton = ({ label, value }) => (
    <TouchableOpacity
      style={[
        styles.radioButton,
        userType === value && styles.radioButtonActive,
      ]}
      onPress={() => setUserType(value)}
      disabled={loading || rolesLoading}
    >
      <Icon
        name={userType === value ? 'radiobox-marked' : 'radiobox-blank'}
        size={20}
        color={ORANGE}
      />
      <Text style={styles.radioLabel}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.screenRoot}>
      <StatusBar barStyle="light-content" backgroundColor={ORANGE} />
      <View style={styles.foodImageWrap} pointerEvents="none">
        <Image
          source={signupFood}
          style={styles.foodImage}
          resizeMode="cover"
        />
      </View>
      <SafeAreaView style={styles.safeArea} edges={['left', 'right']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {
                paddingTop: insets.top + 4,
                paddingBottom: insets.bottom + CARD_MARGIN_B,
              },
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <TouchableOpacity
              onPress={() => (onBack ? onBack() : navigation.goBack())}
              style={styles.backBtn}
            >
              <Icon name="chevron-left" size={20} color="#FFF" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>

            <Text style={styles.pageTitle} numberOfLines={1} adjustsFontSizeToFit>
              Create Your Account
            </Text>

            <View style={styles.card}>
              <View style={styles.roleChips}>
                <RadioButton label="Diner" value="Diner" />
                <RadioButton label="Business" value="Business" />
                <RadioButton label="Vendor" value="vendor" />
              </View>

              <Text style={styles.fieldLabel}>Mail</Text>
              <View style={styles.inputWrapper}>
                <Icon
                  name="email-outline"
                  size={22}
                  color="#8A8A8A"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="email"
                  placeholderTextColor="#B0B0B0"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!loading}
                />
              </View>

              <Text style={styles.fieldLabel}>Password</Text>
              <View style={styles.inputWrapper}>
                <Icon
                  name="lock-outline"
                  size={22}
                  color="#8A8A8A"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#B0B0B0"
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
                    color="#8A8A8A"
                  />
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldLabel}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <Icon
                  name="lock-outline"
                  size={22}
                  color="#8A8A8A"
                  style={styles.inputIcon}
                />
                <TextInput
                  placeholder="Password"
                  placeholderTextColor="#B0B0B0"
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
                    color="#8A8A8A"
                  />
                </TouchableOpacity>
              </View>

              <TermsAcceptRow
                accepted={termsAccepted}
                onToggle={setTermsAccepted}
              />

              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={handleSignUp}
                disabled={loading || rolesLoading}
              >
                {loading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={styles.btnText}>Sign Up</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={handleLoginPress}
                disabled={loading}
              >
                <Text style={styles.secondaryBtnText}>Login</Text>
              </TouchableOpacity>

              <Text style={styles.orText}>Or</Text>
              <Text style={styles.signInWithText}>Sign in with</Text>
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
                {Platform.OS === 'ios' ? (
                  <TouchableOpacity
                    style={styles.socialIcon}
                    onPress={() => handleSocialLogin('apple')}
                    disabled={loading}
                    activeOpacity={0.75}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="apple" size={32} color="#000000" />
                  </TouchableOpacity>
                ) : null}
              </View>

              <View style={styles.bottomArtRow} pointerEvents="none">
                <Image
                  source={decorBowl}
                  style={styles.decorLeft}
                  resizeMode="contain"
                />
                <Image
                  source={decorSkyline}
                  style={styles.decorRight}
                  resizeMode="contain"
                />
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: ORANGE,
  },
  safeArea: {
    flex: 1,
    backgroundColor: ORANGE,
  },
  keyboardView: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: CARD_MARGIN_H,
  },
  foodImageWrap: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: SCREEN_WIDTH * 0.56,
    height: HEADER_FOOD_H,
    overflow: 'hidden',
    borderBottomLeftRadius: SCREEN_WIDTH * 0.28,
    zIndex: 1,
  },
  foodImage: {
    width: '100%',
    height: '100%',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    zIndex: 2,
    marginBottom: 6,
  },
  backText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 2,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFF',
    marginTop: 20,
    marginBottom: 22,
    letterSpacing: 0.2,
    width: SCREEN_WIDTH - CARD_MARGIN_H * 2,
    paddingRight: SCREEN_WIDTH * 0.34,
    zIndex: 2,
  },
  card: {
    backgroundColor: CREAM,
    borderRadius: 28,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  roleChips: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
    marginBottom: 20,
  },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: ORANGE,
  },
  radioButtonActive: {
    backgroundColor: 'rgba(245, 166, 35, 0.12)',
  },
  radioLabel: {
    marginLeft: 6,
    fontSize: 13,
    color: '#444',
    fontWeight: '600',
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: ORANGE,
    marginBottom: 6,
    marginLeft: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    height: 52,
    paddingHorizontal: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E8E0D5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#333', fontSize: 15 },
  actionBtnPrimary: {
    backgroundColor: ORANGE,
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 12,
    shadowColor: '#C47A00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  actionBtnSecondary: {
    height: 52,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: ORANGE,
    backgroundColor: '#FFF',
    marginBottom: 20,
  },
  btnText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  secondaryBtnText: { color: ORANGE, fontSize: 18, fontWeight: '700' },
  orText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
    marginBottom: 4,
  },
  signInWithText: {
    textAlign: 'center',
    color: '#444',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
  socialPill: {
    flexDirection: 'row',
    alignSelf: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 4,
  },
  socialIcon: {
    marginHorizontal: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomArtRow: {
    position: 'relative',
    width: CARD_INNER_W,
    height: CARD_BOTTOM_ART_H,
    marginTop: 4,
    marginHorizontal: -CARD_PAD_H,
    alignSelf: 'center',
    overflow: 'hidden',
  },
  decorLeft: {
    position: 'absolute',
    left: -58,
    bottom: -10,
    width: CARD_INNER_W * 0.5,
    height: CARD_BOTTOM_ART_H * 1.38,
    opacity: 0.9,
    blendMode: 'screen',
  },
  decorRight: {
    position: 'absolute',
    right: -50,
    bottom: -6,
    width: CARD_INNER_W * 0.68,
    height: CARD_BOTTOM_ART_H * 1.3,
    opacity: 0.9,
    blendMode: 'screen',
  },
});

export default HomeSixScreen;
