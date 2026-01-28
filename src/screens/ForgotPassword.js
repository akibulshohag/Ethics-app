import React, { useState } from 'react';
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
  SHADOWS,
  DIMENSIONS,
  COMMON_STYLES,
} from '../constants/theme';

const ForgotPassword = () => {
  const navigation = useNavigation();
  const [selectedMethod, setSelectedMethod] = useState('sms');

  const SelectionCard = ({ id, icon, title, value }) => {
    const isSelected = selectedMethod === id;
    return (
      <TouchableOpacity
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => setSelectedMethod(id)}
        activeOpacity={0.8}
      >
        <View style={styles.iconCircle}>
          <Icon name={icon} size={28} color={COLORS.primaryOrange} />
        </View>
        <View style={styles.cardTextContainer}>
          <Text style={styles.methodLabel}>{title}</Text>
          <Text style={styles.methodValue}>{value}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#FF7A00" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Icon name="arrow-left" size={28} color={COLORS.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Forgot Password</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.instructionText}>
          Select which contact details should we use to reset your password
        </Text>

        <SelectionCard
          id="sms"
          icon="chat-processing"
          title="via SMS:"
          value="+1 111 ******99"
        />

        <SelectionCard
          id="email"
          icon="email"
          title="via Email:"
          value="and***ley@yourdomain.com"
        />

        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => navigation.navigate('OtpVerification')}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  backButton: {
    ...COMMON_STYLES.backButton,
  },
  headerTitle: {
    fontSize: FONTS.xxxl,
    fontWeight: FONTS.bold,
    color: COLORS.white,
    marginLeft: SPACING.lg,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xxl,
    borderTopRightRadius: BORDER_RADIUS.xxl,
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xxl,
  },
  instructionText: {
    fontSize: FONTS.lg,
    color: COLORS.textSecondary,
    lineHeight: 26,
    marginBottom: SPACING.xxl,
    fontWeight: FONTS.medium,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xxl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
    borderWidth: 2,
    borderColor: COLORS.gray200,
    elevation: 2,
    ...SHADOWS.small,
  },
  cardSelected: {
    borderColor: COLORS.primaryOrange,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFF4EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.lg,
  },
  cardTextContainer: {
    flex: 1,
  },
  methodLabel: {
    fontSize: FONTS.sm,
    color: COLORS.gray600,
    marginBottom: SPACING.xs,
  },
  methodValue: {
    fontSize: FONTS.base,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  continueButton: {
    backgroundColor: COLORS.primaryOrange,
    height: 60,
    borderRadius: BORDER_RADIUS.xxxl,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: SPACING.xxl,
    elevation: 8,
    ...SHADOWS.medium,
  },
  continueText: {
    color: COLORS.white,
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
  },
});

export default ForgotPassword;
