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
import { SafeAreaView } from 'react-native-safe-area-context';
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
  const [userType, setUserType] = useState('Diner');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

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
      <SafeAreaView style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          {/* Header Navigation */}
          <View style={styles.navHeader}>
            <TouchableOpacity
              onPress={() => (onBack ? onBack() : navigation.goBack())}
              style={styles.backBtn}
            >
              <Icon name="chevron-left" size={18} color="#1A1A1A" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            {/* <Icon name="dots-vertical" size={26} color="#1A1A1A" /> */}
          </View>

          <View style={styles.centerContainer}>
            {/* Registration Card */}
            <View style={styles.registerCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.headerTitle}>Create Your Account</Text>
              </View>

              <View style={styles.cardBody}>
                {/* User Type Selection: Diner → user, Business → owner, vendor → vendor */}
                <View style={styles.radioGroup}>
                  <View style={styles.radioRow}>
                    <RadioButton label="Diner" value="Diner" />
                    <RadioButton label="Business" value="Business" />
                  </View>
                  <View style={styles.radioRowCenter}>
                    <RadioButton label="vendor" value="vendor" />
                  </View>
                </View>

                {/* Email */}
                <View style={styles.inputWrapper}>
                  <Icon
                    name="email-outline"
                    size={20}
                    color="#FFF"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Enter your email"
                    placeholderTextColor="rgba(255,255,255,0.7)"
                    style={styles.input}
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!loading}
                  />
                </View>

                {/* Password */}
                <View style={styles.inputWrapper}>
                  <Icon
                    name="lock-outline"
                    size={20}
                    color="#FFF"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor="rgba(255,255,255,0.7)"
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
                      size={20}
                      color="rgba(255,255,255,0.9)"
                    />
                  </TouchableOpacity>
                </View>

                {/* Confirm Password */}
                <View style={styles.inputWrapper}>
                  <Icon
                    name="lock-outline"
                    size={20}
                    color="#FFF"
                    style={styles.inputIcon}
                  />
                  <TextInput
                    placeholder="Confirm Password"
                    placeholderTextColor="rgba(255,255,255,0.7)"
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
                      size={20}
                      color="rgba(255,255,255,0.9)"
                    />
                  </TouchableOpacity>
                </View>

                {/* Action Buttons */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
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
                    style={[styles.actionBtn, styles.loginBtn]}
                    onPress={handleLoginPress}
                    disabled={loading}
                  >
                    <Text style={styles.btnText}>Login</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Social Section */}
            <View style={styles.socialContainer}>
              <Text style={styles.socialTitle}>Sign in with</Text>
              <View style={styles.socialPill}>
                <TouchableOpacity style={styles.socialIcon} disabled={loading}>
                  <Icon name="facebook" size={32} color="#1877F2" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.socialIcon} disabled={loading}>
                  <Icon name="google" size={32} color="#EA4335" />
                </TouchableOpacity>
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
  keyboardView: { flex: 1 },
  navHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 15,
    alignItems: 'center',
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  backText: { color: '#1A1A1A', fontSize: 13, fontWeight: 'bold' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  registerCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 8,
  },
  cardHeader: {
    backgroundColor: '#F5A623',
    paddingVertical: 18,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  cardBody: { padding: 20 },
  radioGroup: { marginBottom: 20 },
  radioRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 10,
  },
  radioRowCenter: { alignItems: 'center' },
  radioButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  radioLabel: { marginLeft: 8, fontSize: 16, color: '#333' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7C16F',
    borderRadius: 8,
    height: 50,
    paddingHorizontal: 15,
    marginBottom: 15,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#FFF', fontSize: 15 },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  actionBtn: {
    backgroundColor: '#F5A623',
    width: '46%',
    height: 45,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtn: {
    backgroundColor: '#32373D',
  },
  btnText: { color: '#FFF', fontSize: 16, fontWeight: 'bold' },
  socialContainer: { alignItems: 'center', marginTop: 25 },
  socialTitle: { color: '#333', fontSize: 15, marginBottom: 15 },
  socialPill: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 4,
    borderRadius: 25,
  },
  socialIcon: { marginHorizontal: 12 },
});

export default HomeSixScreen;
