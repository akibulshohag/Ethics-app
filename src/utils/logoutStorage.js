import { ASYNC_STORAGE_KEEP_ON_LOGOUT } from '../services/secureStorageService';

export function asyncStorageKeysToRemoveOnLogout(allKeys, extraKeep = []) {
  const keep = new Set([...ASYNC_STORAGE_KEEP_ON_LOGOUT, ...extraKeep]);
  return allKeys.filter(key => !keep.has(key));
}
