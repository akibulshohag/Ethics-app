import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ImageBackground,
  SafeAreaView,
  StatusBar,
  Dimensions,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { appSetUser } from '../redux/actions/appSlice';
import { config } from '../../config';

const { width, height } = Dimensions.get('window');

const HomeSevenScreen = ({ onBack, onSignUp }) => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loading, setLoading] = useState(false);

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
        rememberMe: rememberMe,
        token: data.token,
      };

      dispatch(appSetUser(userData));

      try {
        navigation.reset({ index: 0, routes: [{ name: 'Root' }] });
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
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd' }}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" transparent backgroundColor="transparent" />
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
              <Icon name="chevron-left" size={18} color="#FFF" />
              <Text style={styles.backText}>Back</Text>
            </TouchableOpacity>
            <Icon name="dots-vertical" size={26} color="#FFF" />
          </View>

          <View style={styles.centerContainer}>
            {/* Login Card */}
            <View style={styles.loginCard}>
              <View style={styles.cardHeader}>
                <Text style={styles.headerTitle}>Diner log in</Text>
              </View>

              <View style={styles.cardBody}>
                {/* Email Input */}
                <View style={styles.inputWrapper}>
                  <Icon name="email-outline" size={22} color="#FFF" style={styles.inputIcon} />
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

                {/* Password Input */}
                <View style={styles.inputWrapper}>
                  <Icon name="lock-outline" size={22} color="#FFF" style={styles.inputIcon} />
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
                      size={22}
                      color="rgba(255,255,255,0.9)"
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
                      name={rememberMe ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={18}
                      color="#6D4C41"
                    />
                    <Text style={styles.utilityText}>Remember me</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      try {
                        navigation.navigate('ForgotPassword');
                      } catch (_) {
                        Alert.alert('Info', 'Forgot password flow not available from this screen.');
                      }
                    }}
                    disabled={loading}
                  >
                    <Text style={[styles.utilityText, styles.underline]}>Forgot Password?</Text>
                  </TouchableOpacity>
                </View>

                {/* Buttons */}
                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => (onSignUp ? onSignUp() : navigation.navigate('HomeSixScreen'))}
                    disabled={loading}
                  >
                    <Text style={styles.btnText}>Sign Up</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionBtn, styles.loginBtn]}
                    onPress={handleLogin}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={styles.btnText}>Login</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Social Login Section */}
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
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  backgroundImage: { flex: 1, width: width, height: height },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  backText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 25,
  },
  loginCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 10,
  },
  cardHeader: { backgroundColor: '#F5A623', paddingVertical: 18, alignItems: 'center' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A1A1A' },
  cardBody: { padding: 25 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7C16F',
    borderRadius: 8,
    height: 52,
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: '#FFF', fontSize: 16 },
  utilityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  checkboxContainer: { flexDirection: 'row', alignItems: 'center' },
  utilityText: { fontSize: 11, color: '#666', marginLeft: 5 },
  underline: { textDecorationLine: 'underline' },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between' },
  actionBtn: {
    backgroundColor: '#F5A623',
    width: '46%',
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginBtn: {
    backgroundColor: '#32373D',
  },
  btnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  socialContainer: { alignItems: 'center', marginTop: 35 },
  socialTitle: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  socialPill: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    paddingHorizontal: 22,
    paddingVertical: 4,
    borderRadius: 30,
  },
  socialIcon: { marginHorizontal: 12 },
});

export default HomeSevenScreen;
