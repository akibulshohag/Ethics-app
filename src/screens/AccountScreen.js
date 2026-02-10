import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Dropdown } from 'react-native-element-dropdown';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { appSetUser } from '../redux/actions/appSlice';
import { config } from '../../config';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  DIMENSIONS,
  COMMON_STYLES,
} from '../constants/theme';

const AccountScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const { user } = useSelector(state => state.app);
  const [gender, setGender] = useState(user?.gender || null);
  const [isFocusGender, setIsFocusGender] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);
  const [fullName, setFullName] = useState(user?.name || '');
  const [nickname, setNickname] = useState(user?.nickname || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [loading, setLoading] = useState(false);

  const handleSkip = () => {
    // Navigate to CreatePin if user doesn't have PIN
    // If user has PIN, they're just updating profile, go back or to home
    if (user?.pin) {
      // User already has PIN, just go back
      navigation.goBack();
    } else {
      // New user needs to create PIN
      navigation.navigate('CreatePin');
    }
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      setTimeout(() => {
        Alert.alert('Error', 'Please enter your full name');
      }, 100);
      return;
    }

    setLoading(true);
    try {
      // Call actual API to update user profile
      const response = await fetch(`${config.apiBaseUrl}/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({
          name: fullName,
          nickname,
          phone,
          gender,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update profile');
      }

      const data = await response.json();

      // Update Redux store with response data
      const updatedUser = {
        ...user,
        name: data.userUpdate?.name || fullName,
        nickname: data.userUpdate?.nickname || nickname,
        phone: data.userUpdate?.phone || phone,
        gender: data.userUpdate?.gender || gender,
      };

      dispatch(appSetUser(updatedUser));

      // Show success message and navigate
      setTimeout(() => {
        Alert.alert(
          'Success',
          'Profile updated successfully',
          [
            {
              text: 'OK',
              onPress: () => {
                // Navigate to ChooseInterests after profile save
                navigation.navigate('ChooseInterests');
              },
            },
          ],
          { cancelable: false },
        );
      }, 100);
    } catch (error) {
      console.error('Profile update error:', error);
      setTimeout(() => {
        Alert.alert(
          'Error',
          error.message || 'Failed to update profile. Please try again.',
        );
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  const genderData = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Others', value: 'others' },
  ];

  const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    icon,
    id,
    keyboardType = 'default',
    editable = true,
  }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          focusedInput === id && styles.inputWrapperFocused,
          !editable && styles.inputDisabled,
        ]}
      >
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#C1C1C1"
          keyboardType={keyboardType}
          editable={editable}
          onFocus={() => setFocusedInput(id)}
          onBlur={() => setFocusedInput(null)}
        />
        {icon ? (
          <Icon
            name={icon}
            size={20}
            color={focusedInput === id ? '#FF7A00' : '#9E9E9E'}
          />
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF7A00" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fill Your Profile</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: 'https://i.imgur.com/your_image_url.png' }}
              style={styles.profileImage}
            />
            <TouchableOpacity style={styles.editButtonCircle}>
              <View style={styles.innerEditCircle} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.form}>
          <InputField
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            placeholder="Enter your full name"
            id="fullname"
          />
          <InputField
            label="Nickname"
            value={nickname}
            onChangeText={setNickname}
            placeholder="Enter your nickname"
            id="nickname"
          />
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            icon="email"
            id="email"
            keyboardType="email-address"
            editable={false}
          />

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Number</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.countryPicker}>
                <Image
                  source={{ uri: 'https://flagsapi.com/US/flat/64.png' }}
                  style={styles.flagIcon}
                />
                <Icon name="chevron-down" size={20} color="#9E9E9E" />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Phone Number"
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Gender</Text>
            <Dropdown
              style={[
                styles.dropdown,
                isFocusGender && {
                  borderColor: COLORS.primaryOrange,
                  backgroundColor: '#FFF8F2',
                },
              ]}
              containerStyle={styles.dropdownContainer}
              placeholderStyle={styles.dropdownPlaceholder}
              selectedTextStyle={styles.dropdownSelectedText}
              itemTextStyle={styles.dropdownItemText}
              data={genderData}
              maxHeight={300}
              labelField="label"
              valueField="value"
              placeholder="Select Gender"
              value={gender}
              onFocus={() => setIsFocusGender(true)}
              onBlur={() => setIsFocusGender(false)}
              onChange={item => {
                setGender(item.value);
                setIsFocusGender(false);
              }}
              renderLeftIcon={() => (
                <Icon
                  name="gender-male-female"
                  size={20}
                  color={isFocusGender ? COLORS.primaryOrange : COLORS.gray500}
                  style={{ marginRight: SPACING.sm }}
                />
              )}
              renderRightIcon={() => (
                <Icon
                  name="chevron-down"
                  size={20}
                  color={isFocusGender ? COLORS.primaryOrange : COLORS.gray500}
                />
              )}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.skipButton]}
            onPress={handleSkip}
          >
            <Text style={[styles.buttonText, styles.skipText]}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.continueButton]}
            onPress={handleSave}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={[styles.buttonText, styles.continueText]}>
                Save & Continue
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    padding: SPACING.lg,
  },
  backButton: {
    ...COMMON_STYLES.backButton,
  },
  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.white,
    marginLeft: SPACING.lg,
  },
  scrollContent: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    flexGrow: 1,
    paddingHorizontal: SPACING.xl,
    paddingBottom: SPACING.xxl,
  },
  avatarContainer: {
    alignItems: 'center',
    marginTop: -SPACING.xxl,
    marginBottom: SPACING.lg,
  },
  avatarWrapper: {
    width: 140,
    height: 140,
    position: 'relative',
  },
  profileImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 4,
    borderColor: COLORS.white,
    backgroundColor: COLORS.gray800,
  },
  editButtonCircle: {
    position: 'absolute',
    bottom: SPACING.sm,
    right: SPACING.xs,
    backgroundColor: COLORS.white,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
  },
  innerEditCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: COLORS.primaryOrange,
  },
  form: {
    marginTop: SPACING.sm,
  },
  inputContainer: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: FONTS.sm,
    fontWeight: FONTS.semiBold,
    color: COLORS.gray700,
    marginBottom: SPACING.sm,
  },
  inputWrapper: {
    ...COMMON_STYLES.inputWrapper,
    height: DIMENSIONS.inputHeight,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  inputWrapperFocused: {
    ...COMMON_STYLES.inputActive,
    borderColor: COLORS.primaryOrange,
    backgroundColor: '#FFF8F2',
  },
  inputDisabled: {
    backgroundColor: COLORS.gray100,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: FONTS.base,
    fontWeight: FONTS.medium,
  },
  countryPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SPACING.sm,
  },
  flagIcon: {
    width: 24,
    height: 16,
    marginRight: SPACING.xs,
  },
  dropdown: {
    height: DIMENSIONS.inputHeight,
    backgroundColor: COLORS.backgroundLight,
    borderRadius: BORDER_RADIUS.xxxl,
    paddingHorizontal: SPACING.xl,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dropdownContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    marginTop: SPACING.xs,
    elevation: 5,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownPlaceholder: {
    fontSize: FONTS.base,
    color: COLORS.gray400,
  },
  dropdownSelectedText: {
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    fontWeight: FONTS.medium,
  },
  dropdownItemText: {
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    padding: SPACING.sm,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACING.xxl,
  },
  button: {
    flex: 0.48,
    height: 58,
    borderRadius: BORDER_RADIUS.xxxl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButton: {
    backgroundColor: '#FFF4EB',
  },
  continueButton: {
    backgroundColor: COLORS.primaryOrange,
  },
  buttonText: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
  },
  skipText: {
    color: COLORS.primaryOrange,
  },
  continueText: {
    color: COLORS.white,
  },
});

export default AccountScreen;
