import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, FONTS, SPACING } from '../constants/theme';

const INCOGNITO_KEY = '@ethics_incognito';

const IncognitoScreen = () => {
  const navigation = useNavigation();
  const [incognito, setIncognito] = useState(false);

  const loadIncognito = async () => {
    try {
      const val = await AsyncStorage.getItem(INCOGNITO_KEY);
      setIncognito(val === 'true');
    } catch {}
  };

  React.useEffect(() => {
    loadIncognito();
  }, []);

  const toggleIncognito = async value => {
    setIncognito(value);
    try {
      await AsyncStorage.setItem(INCOGNITO_KEY, String(value));
    } catch {}
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Incognito</Text>
        <View style={{ width: 24 }} />
      </View>
      <View style={styles.content}>
        <View style={styles.card}>
          <View style={styles.row}>
            <Icon name="shield-check-outline" size={28} color={COLORS.primaryOrange} />
            <View style={styles.textBox}>
              <Text style={styles.title}>Turn on Incognito</Text>
              <Text style={styles.subtitle}>
                Your watch history won't be saved when Incognito is on.
              </Text>
            </View>
            <Switch
              value={incognito}
              onValueChange={toggleIncognito}
              trackColor={{ false: COLORS.gray200, true: COLORS.primaryOrange }}
              thumbColor={COLORS.white}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray200,
  },
  headerTitle: {
    fontSize: FONTS.xl,
    fontWeight: FONTS.bold,
    color: COLORS.textPrimary,
  },
  content: { flex: 1, padding: SPACING.xl },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.gray200,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  textBox: { flex: 1, marginLeft: SPACING.lg, marginRight: SPACING.lg },
  title: {
    fontSize: FONTS.base,
    fontWeight: FONTS.semibold,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: FONTS.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
});

export default IncognitoScreen;
