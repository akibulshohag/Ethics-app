import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation } from '@react-navigation/native';
import {
  DEFAULT_PRINTER_PORT,
  getPrinterSettings,
  savePrinterSettings,
  testPrinterConnection,
} from '../services/wifiPrinterService';
import { COLORS, FONTS, SPACING, BORDER_RADIUS } from '../constants/theme';

const PrinterSettingsScreen = () => {
  const navigation = useNavigation();
  const [ip, setIp] = useState('');
  const [port, setPort] = useState(String(DEFAULT_PRINTER_PORT));
  const [enabled, setEnabled] = useState(false);
  const [autoPrint, setAutoPrint] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    getPrinterSettings().then(settings => {
      setIp(settings.ip || '');
      setPort(String(settings.port || DEFAULT_PRINTER_PORT));
      setEnabled(!!settings.enabled);
      setAutoPrint(!!settings.autoPrint);
    });
  }, []);

  const handleSave = async () => {
    setLoading(true);
    try {
      await savePrinterSettings({
        ip: ip.trim(),
        port: Number(port) || DEFAULT_PRINTER_PORT,
        enabled,
        autoPrint,
      });
      Alert.alert('Saved', 'WiFi printer settings updated.');
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Could not save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!ip.trim()) {
      Alert.alert('Printer IP required', 'Enter your printer IP address on the same WiFi network.');
      return;
    }
    setLoading(true);
    try {
      await testPrinterConnection(ip.trim(), Number(port) || DEFAULT_PRINTER_PORT);
      Alert.alert('Success', 'Test print sent to the WiFi printer.');
    } catch (e) {
      Alert.alert('Printer error', e?.message || 'Could not reach the printer.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={28} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>WiFi printer</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.help}>
          Connect phone and printer to the same WiFi. Enter the printer IP (often port 9100 for thermal printers).
        </Text>

        <Text style={styles.label}>Printer IP</Text>
        <TextInput
          style={styles.input}
          placeholder="192.168.1.50"
          keyboardType="numbers-and-punctuation"
          value={ip}
          onChangeText={setIp}
        />

        <Text style={styles.label}>Port</Text>
        <TextInput
          style={styles.input}
          placeholder="9100"
          keyboardType="number-pad"
          value={port}
          onChangeText={setPort}
        />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Enable WiFi printing</Text>
          <Switch value={enabled} onValueChange={setEnabled} />
        </View>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Auto-print invoices on same WiFi</Text>
          <Switch value={autoPrint} onValueChange={setAutoPrint} />
        </View>

        <TouchableOpacity style={styles.testBtn} onPress={handleTest} disabled={loading}>
          <Text style={styles.testBtnText}>Test print</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
          {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveBtnText}>Save</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  headerTitle: { fontSize: FONTS.xl, fontWeight: FONTS.bold, marginLeft: SPACING.md },
  content: { padding: SPACING.xl },
  help: { color: COLORS.textSecondary, marginBottom: SPACING.xl, lineHeight: 22 },
  label: { fontWeight: FONTS.bold, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    marginBottom: SPACING.lg,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  rowLabel: { flex: 1, paddingRight: 12 },
  testBtn: {
    borderWidth: 1,
    borderColor: COLORS.primaryOrange,
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.md,
  },
  testBtnText: { color: COLORS.primaryOrange, fontWeight: FONTS.bold },
  saveBtn: {
    backgroundColor: '#2B1A00',
    borderRadius: 12,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: { color: '#FFF', fontWeight: FONTS.bold },
});

export default PrinterSettingsScreen;
