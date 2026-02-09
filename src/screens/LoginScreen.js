import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Pressable,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  DIMENSIONS,
  COMMON_STYLES,
} from '../constants/theme';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';

const LoginScreen = () => {
  const navigation = useNavigation();
  const [rememberMe, setRememberMe] = useState(true);
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Orange Header */}
      <View style={styles.header}>
        <SafeAreaView>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Login to Your Account</Text>
          <Text style={styles.headerSubtitle}>
            Let's get started on your journey to better health. to better
            health.
          </Text>
        </SafeAreaView>
      </View>

      {/* Login Form Container */}
      <View style={styles.formCard}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Email Field */}
          <Text style={styles.inputLabel}>Email</Text>
          <View style={styles.inputWrapper}>
            <Icon name="email" size={20} color="black" />
            <TextInput
              style={styles.input}
              placeholder="andrew_ainsley@yourdomain.com"
              placeholderTextColor="#333"
            />
          </View>

          {/* Password Field (Active State) */}
          <Text style={styles.inputLabel}>Password</Text>
          <View style={[styles.inputWrapper, styles.inputActive]}>
            <Icon name="lock" size={20} color="black" />
            <TextInput
              style={styles.input}
              secureTextEntry={!passwordVisible}
              value="password12345"
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

          {/* Remember Me & Forgot Password Row */}
          <View style={styles.optionsRow}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View
                style={[styles.checkbox, rememberMe && styles.checkboxChecked]}
              >
                {rememberMe && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.rememberText}>Remember me</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('ForgotPassword')}
            >
              <Text style={styles.forgotText}>Forgot Password</Text>
            </TouchableOpacity>
          </View>

          {/* Sign In Button */}

          <Pressable
            style={({ hovered, pressed }) => [
              styles.signInButton,
              {
                backgroundColor: hovered || pressed ? '#F97507' : '#32373D',
              },
            ]}
            onPress={() =>
              navigation.navigate('Profile', { screen: 'ProfileScreen' })
            }
          >
            <Text style={styles.signInButtonText}>Sign in</Text>
          </Pressable>

          {/* Divider */}
          <View style={styles.dividerContainer}>
            <View style={styles.line} />
            <Text style={styles.orText}>or continue with</Text>
            <View style={styles.line} />
          </View>

          {/* Social Icons */}
          <View style={styles.socialRow}>
            <TouchableOpacity style={styles.socialCircle}>
              <Icon name="facebook" size={20} color="blablck" />
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
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
              <Text style={styles.signUpLink}>Sign up</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: COMMON_STYLES.container,
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
    letterSpacing: -0.5,
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
    marginTop: -SPACING.lg,
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
    borderColor: '#FF7F0B',
    backgroundColor: '#FFF5EE', // Subtle orange tint for active field
  },
  inputIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  eyeIcon: {
    fontSize: 18,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#FF7F0B',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#FF7F0B',
  },
  checkmark: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  rememberText: {
    color: '#666',
    fontSize: 14,
  },
  forgotText: {
    color: '#FF7F0B',
    fontSize: 14,
    fontWeight: '600',
  },
  signInButton: {
    backgroundColor: '#32373D',
    borderRadius: 30,
    height: 65,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 35,
  },
  signInButtonText: {
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
    fontSize: 14,
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
    marginBottom: 20,
  },
  footerText: {
    color: '#999',
    fontSize: 15,
  },
  signUpLink: {
    color: '#FF7F0B',
    fontSize: 15,
    fontWeight: '600',
  },
});

export default LoginScreen;
