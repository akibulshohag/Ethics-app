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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { Dropdown } from 'react-native-element-dropdown';
import { useNavigation } from '@react-navigation/native';
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
  const [gender, setGender] = useState(null);
  const [focusedInput, setFocusedInput] = useState(null);

  const genderData = [
    { label: 'Male', value: '1' },
    { label: 'Female', value: '2' },
  ];

  const InputField = ({
    label,
    value,
    placeholder,
    icon,
    id,
    keyboardType = 'default',
  }) => (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <View
        style={[
          styles.inputWrapper,
          focusedInput === id && styles.inputWrapperFocused,
        ]}
      >
        <TextInput
          style={styles.input}
          defaultValue={value}
          placeholder={placeholder}
          placeholderTextColor="#C1C1C1"
          keyboardType={keyboardType}
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
        <TouchableOpacity style={styles.backButton}>
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
          <InputField label="Full Name" value="Habibur Rahman" id="fullname" />
          <InputField label="Nickname" value="Habib" id="nickname" />
          <InputField
            label="Email"
            value="habib.hc.bd@gmail.com"
            icon="email"
            id="email"
            keyboardType="email-address"
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
                keyboardType="phone-pad"
              />
            </View>
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Gender</Text>
            <Dropdown
              style={styles.dropdown}
              data={genderData}
              labelField="label"
              valueField="value"
              placeholder="Gender"
              value={gender}
              onChange={item => setGender(item.value)}
              renderRightIcon={() => (
                <Icon name="chevron-down" size={20} color="#9E9E9E" />
              )}
            />
          </View>
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.skipButton]}>
            <Text style={[styles.buttonText, styles.skipText]}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.continueButton]}
            onPress={() => navigation.navigate('CreatePin')}
          >
            <Text style={[styles.buttonText, styles.continueText]}>
              Continue
            </Text>
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
    ...COMMON_STYLES.inputWrapper,
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
