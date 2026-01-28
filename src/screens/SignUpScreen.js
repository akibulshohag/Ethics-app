import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ScrollView,
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

const SignUpScreen = () => {
  const navigation = useNavigation();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);

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
            />
          </View>

          {/* Password Input (Focused/Active State) */}
          <Text style={styles.inputLabel}>Create Password</Text>
          <View style={[styles.inputWrapper, styles.inputActive]}>
            <Icon name="lock" size={20} color="black" />
            <TextInput
              style={styles.input}
              secureTextEntry={!passwordVisible}
              value="123456789012" // Placeholder dots
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

          {/* Confirm Password Input */}
          <Text style={styles.inputLabel}>Confirm Password</Text>
          <View style={styles.inputWrapper}>
            <Icon name="lock" size={20} color="black" />
            <TextInput
              style={styles.input}
              placeholder="Confirm Password"
              placeholderTextColor="#BBB"
              secureTextEntry={!confirmPasswordVisible}
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

          {/* Sign Up Button */}
          <TouchableOpacity style={styles.signUpButton}>
            <Text style={styles.signUpButtonText}>Sign up</Text>
          </TouchableOpacity>

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
    backgroundColor: '#32373D', // Dark button color
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
});

export default SignUpScreen;
