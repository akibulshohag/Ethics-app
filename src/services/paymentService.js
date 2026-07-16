import { config } from '../../config';
import { fetchWithAuth } from './sessionService';

const API_URL = `${config.apiBaseUrl}/payments`;

function formatPaymentError(err, fallback = 'Payment failed') {
  if (!err || typeof err !== 'object') return fallback;
  const errors = err.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    const first = errors[0];
    const msg = first?.constraints && Object.values(first.constraints)[0];
    if (msg) {
      return `${msg}${first.property ? ` (${first.property})` : ''}`;
    }
  }
  if (typeof err.message === 'string' && err.message.trim()) {
    return err.message;
  }
  return fallback;
}

export const normalizePaymentConfig = data => ({
  enabled: !!data?.enabled,
  publishableKey: String(data?.publishableKey || ''),
  currency: data?.currency || 'gbp',
  merchantCountryCode: data?.merchantCountryCode || 'GB',
  keysMatch: data?.keysMatch !== false,
  stripeMode: data?.stripeMode || 'unknown',
});

/** Public Stripe config (enabled, publishableKey, currency). */
export const getPaymentConfig = async () => {
  const res = await fetch(`${API_URL}/config`);
  if (!res.ok) {
    return normalizePaymentConfig(null);
  }
  return normalizePaymentConfig(await res.json());
};

/**
 * Create a PaymentIntent for the same payload used to place a restaurant order.
 * Returns { requiresPayment, clientSecret?, paymentIntentId?, totalAmount, currency }.
 */
export const createPaymentIntent = async (token, orderBody) => {
  const res = await fetchWithAuth(`${API_URL}/create-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(orderBody),
    token,
  });

  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch (_) {
    data = { message: raw || `HTTP ${res.status}` };
  }

  if (!res.ok) {
    throw new Error(formatPaymentError(data, 'Failed to start payment'));
  }

  return data;
};
