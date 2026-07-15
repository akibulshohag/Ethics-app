import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { appSetUser } from '../redux/actions/appSlice';
import {
  confirmPhoneOtp,
  normalizeUkPhoneInput,
  sendPhoneOtp,
} from '../services/firebasePhoneService';
import { refreshUserSafetyAfterLogin } from '../services/userSafetyService';
import { isProfileComplete } from '../utils/profileGate';
import { navigationRef } from '../utils/helper';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

const PhoneAuthScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState('phone');
  const [loading, setLoading] = useState(false);

  const finishLogin = async data => {
    const userData = {
      id: data.user.id,
      name: data.user.name || '',
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
      profileComplete: data.profileComplete ?? isProfileComplete(data.user),
      fingerprintEnabled: data.user.fingerprintEnabled || false,
    };
    dispatch(appSetUser(userData));
    await refreshUserSafetyAfterLogin();
    if (!userData.profileComplete) {
      if (navigationRef.isReady()) {
        navigationRef.navigate('Account', { fromPhoneSignup: true });
      } else {
        navigation.reset({ index: 0, routes: [{ name: 'Root' }] });
      }
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: 'Root' }] });
  };

  const handleSendCode = async () => {
    setLoading(true);
    try {
      await sendPhoneOtp(phone);
      setStep('code');
      Alert.alert(
        'Code sent',
        `Verification code sent to ${normalizeUkPhoneInput(phone)}`,
      );
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not send verification code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      const data = await confirmPhoneOtp(code);
      await finishLogin(data);
    } catch (e) {
      Alert.alert('Error', e?.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Phone login</Text>
      </View>

      <View style={styles.sheet}>
        <Text style={styles.info}>
          {step === 'phone'
            ? 'Enter your mobile number. We will send a verification code.'
            : 'Enter the 6-digit code sent to your phone.'}
        </Text>

        {step === 'phone' ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="+44 7700 900077"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <TouchableOpacity
              style={styles.btn}
              onPress={handleSendCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnText}>Send code</Text>
              )}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <TextInput
              style={styles.input}
              placeholder="6-digit code"
              keyboardType="number-pad"
              maxLength={6}
              value={code}
              onChangeText={setCode}
            />
            <TouchableOpacity
              style={styles.btn}
              onPress={handleVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.btnText}>Verify & continue</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setStep('phone')}
              style={styles.linkBtn}
            >
              <Text style={styles.linkText}>Change number</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primaryOrange,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.xl,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    marginLeft: SPACING.lg,
  },
  sheet: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xl,
  },
  info: {
    color: COLORS.gray,
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
    fontSize: FONTS.md,
  },
  btn: {
    backgroundColor: COLORS.primaryOrange,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.lg,
    alignItems: 'center',
  },
  btnText: {
    color: COLORS.white,
    fontWeight: FONTS.bold,
    fontSize: FONTS.md,
  },
  linkBtn: {
    marginTop: SPACING.lg,
    alignItems: 'center',
  },
  linkText: {
    color: COLORS.primaryOrange,
    fontWeight: FONTS.medium,
  },
});

export default PhoneAuthScreen;
