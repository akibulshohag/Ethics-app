import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import {
  COLORS,
  FONTS,
  SPACING,
  BORDER_RADIUS,
  COMMON_STYLES,
} from '../constants/theme';

const SecurityScreen = () => {
  const navigation = useNavigation();

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

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
});

export default SecurityScreen;
