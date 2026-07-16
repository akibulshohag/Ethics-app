import axios from 'axios';
import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/reports`;

const getAuthHeaders = () => {
  try {
    const { store } = require('../redux');
    const token = store.getState()?.app?.user?.token;
    if (token) return { Authorization: `Bearer ${token}` };
  } catch (_) {}
  return {};
};

/**
 * Submit a content report (video or short). Requires login — reporter is taken from JWT.
 */
export const submitReport = async ({
  contentType,
  contentId,
  reason,
  details,
}) => {
  const res = await axios.post(
    API_URL,
    {
      contentType,
      contentId,
      reason,
      details: details || undefined,
    },
    { headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' } },
  );
  return res.data;
};

/**
 * Admin: list all reports (who reported what, reason, content title).
 */
export const listContentReports = async (token, params = {}) => {
  const q = new URLSearchParams();
  if (params.page != null) q.set('page', String(params.page));
  if (params.limit != null) q.set('limit', String(params.limit));
  const url = q.toString() ? `${API_URL}?${q}` : API_URL;
  const res = await axios.get(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return res.data;
};
