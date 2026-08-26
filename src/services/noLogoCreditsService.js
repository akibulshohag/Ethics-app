import { config } from '../../config';
import { fetchWithAuth } from './sessionService';

const API_URL = `${config.apiBaseUrl}/no-logo-credits`;

const parseJson = async res => {
  const raw = await res.text();
  let data = {};
  try {
    data = raw ? JSON.parse(raw) : {};
  } catch {
    data = { message: raw || `HTTP ${res.status}` };
  }
  return data;
};

export const noLogoCreditsService = {
  async getPackages() {
    const res = await fetch(`${API_URL}/packages`);
    const data = await parseJson(res);
    if (!res.ok) throw new Error(data?.message || 'Failed to load packages');
    return Array.isArray(data) ? data : [];
  },

  async getBalance(token) {
    const res = await fetchWithAuth(`${API_URL}/balance`, { token });
    const data = await parseJson(res);
    if (!res.ok) throw new Error(data?.message || 'Failed to load balance');
    return {
      credits: Number(data?.credits || 0),
      packages: Array.isArray(data?.packages) ? data.packages : [],
    };
  },

  async createIntent(token, packageKey) {
    const res = await fetchWithAuth(`${API_URL}/create-intent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ packageKey }),
      token,
    });
    const data = await parseJson(res);
    if (!res.ok) {
      throw new Error(
        data?.message ||
          (Array.isArray(data?.message) ? data.message.join('\n') : null) ||
          'Failed to start payment',
      );
    }
    return data;
  },

  async confirm(token, paymentIntentId) {
    const res = await fetchWithAuth(`${API_URL}/confirm`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentIntentId }),
      token,
    });
    const data = await parseJson(res);
    if (!res.ok) {
      throw new Error(data?.message || 'Failed to confirm purchase');
    }
    return data;
  },
};
