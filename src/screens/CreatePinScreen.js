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
  COMMON_STYLES,
} from '../constants/theme';

const CreatePinScreen = () => {
  const navigation = useNavigation();
  const [pin, setPin] = useState('');
  const pinLength = 5;

  const handleKeyPress = value => {
    if (pin.length < pinLength) {
      setPin(prev => prev + value);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const renderPinInputs = () => {
    const inputs = [];
    for (let i = 0; i < pinLength; i++) {
      const isFocused = pin.length === i;
      const isFilled = pin.length > i;

      inputs.push(
        <View
          key={i}
          style={[
            styles.pinBox,
            isFocused && styles.pinBoxFocused,
            isFilled && !isFocused && styles.pinBoxFilled,
          ]}
        >
          {isFilled ? (
            i < pin.length - 2 ? (
              <View style={styles.dot} />
            ) : (
              <Text style={styles.pinText}>{pin[i]}</Text>
            )
          ) : null}
        </View>,
      );
    }
    return inputs;
  };

  const Key = ({ value, icon }) => (
    <TouchableOpacity
      style={styles.key}
      onPress={() =>
        value === 'back' ? handleBackspace() : handleKeyPress(value)
      }
    >
      {icon ? (
        <Icon name={icon} size={28} color={COLORS.textPrimary} />
      ) : (
        <Text style={styles.keyText}>{value}</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton}>
          <Icon name="arrow-left" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New PIN</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.description}>
          Add a PIN number to make your account more secure.
        </Text>

        <View style={styles.pinContainer}>{renderPinInputs()}</View>

        <TouchableOpacity
          style={[
            styles.continueButton,
            pin.length === pinLength ? styles.btnActive : styles.btnDisabled,
          ]}
          disabled={pin.length !== pinLength}
          onPress={() => navigation.navigate('SetFingerprint')}
        >
          <Text style={styles.continueText}>Continue</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.numpad}>
        <View style={styles.row}>
          <Key value="1" />
          <Key value="2" />
          <Key value="3" />
        </View>
        <View style={styles.row}>
          <Key value="4" />
          <Key value="5" />
          <Key value="6" />
        </View>
        <View style={styles.row}>
          <Key value="7" />
          <Key value="8" />
          <Key value="9" />
        </View>
        <View style={styles.row}>
          <Key value="*" />
          <Key value="0" />
          <Key value="back" icon="backspace-outline" />
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
    padding: SPACING.lg,
    marginTop: SPACING.md,
  },
  backButton: {
    ...COMMON_STYLES.backButton,
  },
  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
    marginLeft: SPACING.lg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: SPACING.xxl,
    paddingTop: SPACING.xxl,
  },
  description: {
    fontSize: FONTS.base,
    color: COLORS.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: SPACING.xxxl,
  },
  pinContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: SPACING.xxxl,
  },
  pinBox: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.gray100,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray300,
  },
  pinBoxFocused: {
    borderColor: COLORS.primaryOrange,
    backgroundColor: '#FFF8F2',
  },
  pinBoxFilled: {
    backgroundColor: COLORS.gray100,
  },
  pinText: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  dot: {
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: COLORS.black,
  },
  continueButton: {
    width: '100%',
    height: 58,
    borderRadius: BORDER_RADIUS.xxxl,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primaryOrange,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  btnActive: {
    backgroundColor: COLORS.primaryOrange,
  },
  btnDisabled: {
    backgroundColor: COLORS.orange300,
  },
  continueText: {
    color: COLORS.white,
    fontSize: FONTS.lg,
    fontWeight: FONTS.bold,
  },

  numpad: {
    paddingBottom: SPACING.xxl,
    paddingHorizontal: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: SPACING.md,
  },
  key: {
    width: 80,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: FONTS.xxl,
    fontWeight: FONTS.medium,
    color: COLORS.textPrimary,
  },
});

export default CreatePinScreen;
