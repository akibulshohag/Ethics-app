import AsyncStorage from '@react-native-async-storage/async-storage';
import TcpSocket from 'react-native-tcp-socket';

const PRINTER_SETTINGS_KEY = '@eatix_wifi_printer_settings';

const ESC = '\x1b';
const GS = '\x1d';

export const DEFAULT_PRINTER_PORT = 9100;

export async function getPrinterSettings() {
  try {
    const raw = await AsyncStorage.getItem(PRINTER_SETTINGS_KEY);
    if (!raw) {
      return { ip: '', port: DEFAULT_PRINTER_PORT, autoPrint: false, enabled: false };
    }
    const parsed = JSON.parse(raw);
    return {
      ip: String(parsed.ip || '').trim(),
      port: Number(parsed.port) || DEFAULT_PRINTER_PORT,
      autoPrint: !!parsed.autoPrint,
      enabled: !!parsed.enabled,
    };
  } catch {
    return { ip: '', port: DEFAULT_PRINTER_PORT, autoPrint: false, enabled: false };
  }
}

export async function savePrinterSettings(settings) {
  const next = {
    ip: String(settings?.ip || '').trim(),
    port: Number(settings?.port) || DEFAULT_PRINTER_PORT,
    autoPrint: !!settings?.autoPrint,
    enabled: !!settings?.enabled,
  };
  await AsyncStorage.setItem(PRINTER_SETTINGS_KEY, JSON.stringify(next));
  return next;
}

function line(text = '') {
  return `${String(text || '')}\n`;
}

function center(text) {
  return `${ESC}a\x01${line(text)}${ESC}a\x00`;
}

function bold(text) {
  return `${ESC}E\x01${text}${ESC}E\x00`;
}

export function buildEscPosReceipt(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const rows = [
    center(bold('EATWAZE INVOICE')),
    line(`Order #${order?.orderNumber || order?.id || '-'}`),
    line(`Date: ${order?.createdAt ? new Date(order.createdAt).toLocaleString() : new Date().toLocaleString()}`),
    line(`Restaurant: ${order?.ownerName || order?.restaurantName || '-'}`),
    line(`Customer: ${order?.customerName || order?.userName || '-'}`),
    line(`Phone: ${order?.customerPhone || '-'}`),
    line('--------------------------------'),
  ];

  items.forEach(item => {
    const qty = item.quantity || 1;
    const name = item.name || item.menuItemName || 'Item';
    const price = Number(item.price || item.unitPrice || 0);
    rows.push(line(`${qty}x ${name}`));
    rows.push(line(`   ${(qty * price).toFixed(2)}`));
  });

  rows.push(
    line('--------------------------------'),
    line(`Subtotal: ${Number(order?.subtotal || order?.totalAmount || 0).toFixed(2)}`),
    line(`Tax/Charges: ${Number(order?.taxCharge || 0).toFixed(2)}`),
    line(`Discount: ${Number(order?.discountAmount || 0).toFixed(2)}`),
    bold(line(`TOTAL: ${Number(order?.totalAmount || 0).toFixed(2)} ${String(order?.currency || 'GBP').toUpperCase()}`)),
    line(''),
    center('Thank you for your order!'),
    line('\n\n\n'),
    `${GS}V\x00`,
  );

  return rows.join('');
}

function sendToPrinter(ip, port, payload, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const client = TcpSocket.createConnection({ host: ip, port }, () => {
      client.write(payload, 'binary', err => {
        if (err) {
          client.destroy();
          reject(err);
          return;
        }
        setTimeout(() => {
          client.destroy();
          resolve(true);
        }, 300);
      });
    });

    const timer = setTimeout(() => {
      client.destroy();
      reject(new Error('Printer connection timed out'));
    }, timeoutMs);

    client.on('error', err => {
      clearTimeout(timer);
      client.destroy();
      reject(err);
    });

    client.on('close', () => clearTimeout(timer));
  });
}

export async function printReceiptOverWifi(order, settingsOverride) {
  const settings = settingsOverride || (await getPrinterSettings());
  const ip = String(settings?.ip || '').trim();
  const port = Number(settings?.port) || DEFAULT_PRINTER_PORT;

  if (!ip) {
    throw new Error('WiFi printer IP is not configured');
  }

  const payload = buildEscPosReceipt(order);
  await sendToPrinter(ip, port, payload);
  return { ip, port };
}

export async function autoPrintInvoiceIfEnabled(order) {
  const settings = await getPrinterSettings();
  if (!settings.enabled || !settings.autoPrint || !settings.ip) {
    return { printed: false, reason: 'disabled' };
  }
  await printReceiptOverWifi(order, settings);
  return { printed: true, ip: settings.ip };
}

export async function testPrinterConnection(ip, port = DEFAULT_PRINTER_PORT) {
  const payload = `${ESC}@\n${center('Eatwaze printer test OK')}\n\n\n${GS}V\x00`;
  await sendToPrinter(ip, port, payload);
  return true;
}
