import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, CommonActions } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  COMMON_STYLES,
} from '../constants/theme';
import { appSetUser } from '../redux/actions/appSlice';
import { deleteMyAccount } from '../services/userSafetyService';

const DARK_MODE_KEY = '@ethics_dark_mode';

const SecurityScreen = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  const [deleting, setDeleting] = React.useState(false);

  const SecurityOption = ({
    iconName,
    title,
    subtitle,
    onPress,
    iconColor,
  }) => (
    <TouchableOpacity style={styles.optionCard} onPress={onPress}>
      <View
        style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}
      >
        <Icon name={iconName} size={32} color={iconColor} />
      </View>
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{title}</Text>
        <Text style={styles.optionSubtitle}>{subtitle}</Text>
      </View>
      <Icon name="chevron-right" size={24} color={COLORS.gray400} />
    </TouchableOpacity>
  );

  const resetToLogin = async () => {
    dispatch(appSetUser(null));
    const KEEP_KEYS = [DARK_MODE_KEY];
    const allKeys = await AsyncStorage.getAllKeys();
    const toRemove = allKeys.filter(k => !KEEP_KEYS.includes(k));
    if (toRemove.length > 0) {
      await AsyncStorage.multiRemove(toRemove);
    }
    let rootNav = navigation;
    while (rootNav?.getParent?.()) rootNav = rootNav.getParent();
    rootNav.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [
          {
            name: 'Root',
            state: {
              index: 0,
              routes: [
                {
                  name: 'Home1',
                  state: {
                    index: 1,
                    routes: [
                      { name: 'HomeOneScreen' },
                      { name: 'HomeSevenScreen' },
                    ],
                  },
                },
              ],
            },
          },
        ],
      }),
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete account?',
      'This permanently deletes your EatWaze account and associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Confirm deletion',
              'Are you sure you want to permanently delete your account?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await deleteMyAccount();
                      await resetToLogin();
                    } catch (error) {
                      Alert.alert(
                        'Could not delete account',
                        error?.message ||
                          'Please try again or contact support.',
                      );
                    } finally {
                      setDeleting(false);
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.description}>
          Manage your security settings to keep your account safe
        </Text>

        <View style={styles.optionsContainer}>
          <SecurityOption
            iconName="shield-key"
            title="PIN Security"
            subtitle="Manage your 5-digit PIN for app access"
            iconColor={COLORS.primaryOrange}
            onPress={() => navigation.navigate('CreatePin')}
          />

          <SecurityOption
            iconName="fingerprint"
            title="Fingerprint"
            subtitle="Enable or disable fingerprint authentication"
            iconColor="#4CAF50"
            onPress={() => navigation.navigate('SetFingerprint')}
          />

          <SecurityOption
            iconName="lock-reset"
            title="Change Password"
            subtitle="Update your account password"
            iconColor="#2196F3"
            onPress={() => navigation.navigate('ChangePasswordScreen')}
          />
        </View>

        <View style={styles.infoBox}>
          <Icon name="information" size={20} color={COLORS.primaryOrange} />
          <Text style={styles.infoText}>
            These security features help protect your account from unauthorized
            access
          </Text>
        </View>

        <TouchableOpacity
          style={styles.deleteCard}
          onPress={handleDeleteAccount}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator color={COLORS.error} />
          ) : (
            <>
              <Icon name="account-remove-outline" size={28} color={COLORS.error} />
              <View style={styles.deleteContent}>
                <Text style={styles.deleteTitle}>Delete account</Text>
                <Text style={styles.deleteSubtitle}>
                  Permanently remove your account and data from EatWaze
                </Text>
              </View>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.white,
  },
  backButton: {
    ...COMMON_STYLES.backButton,
  },
  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
  },
  description: {
    fontSize: FONTS.base,
    color: COLORS.gray600,
    marginBottom: SPACING.xxl,
    textAlign: 'center',
  },
  optionsContainer: {
    gap: SPACING.lg,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.semiBold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  optionSubtitle: {
    fontSize: FONTS.sm,
    color: COLORS.gray600,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#FFF4EB',
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    marginTop: SPACING.xxl,
    borderWidth: 1,
    borderColor: COLORS.primaryOrange + '20',
  },
  infoText: {
    flex: 1,
    fontSize: FONTS.sm,
    color: COLORS.textPrimary,
    marginLeft: SPACING.sm,
    lineHeight: 20,
  },
  deleteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.xxl,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.error + '40',
    backgroundColor: '#FFF5F5',
    gap: SPACING.md,
  },
  deleteContent: {
    flex: 1,
  },
  deleteTitle: {
    fontSize: FONTS.lg,
    fontWeight: FONTS.semiBold,
    color: COLORS.error,
    marginBottom: SPACING.xs,
  },
  deleteSubtitle: {
    fontSize: FONTS.sm,
    color: COLORS.gray600,
    lineHeight: 18,
  },
});

export default SecurityScreen;
