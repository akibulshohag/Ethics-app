import { config } from '../../config';
import { fetchWithAuth } from './sessionService';
import { store } from '../redux';
import { setBlockedUserIds } from '../redux/actions/appSlice';

export async function fetchBlockedUserIds() {
  const res = await fetchWithAuth(`${config.apiBaseUrl}/users/blocks/ids`);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || 'Could not load blocked users');
  }
  const ids = Array.isArray(data?.ids) ? data.ids.map(String) : [];
  store.dispatch(setBlockedUserIds(ids));
  return ids;
}

export async function blockUser(blockedUserId, reason = '') {
  const res = await fetchWithAuth(`${config.apiBaseUrl}/users/blocks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blockedUserId: String(blockedUserId),
      ...(reason ? { reason: String(reason) } : {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || 'Could not block user');
  }
  await fetchBlockedUserIds();
  return data;
}

export async function deleteMyAccount() {
  const res = await fetchWithAuth(`${config.apiBaseUrl}/users/me/account`, {
    method: 'DELETE',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || 'Could not delete account');
  }
  return data;
}

export async function refreshUserSafetyAfterLogin() {
  try {
    await fetchBlockedUserIds();
  } catch (_) {
    store.dispatch(setBlockedUserIds([]));
  }
}
