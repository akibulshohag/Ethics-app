import axios from 'axios';
import { AppState } from 'react-native';
import { config } from '../../config';
import { store } from '../redux';
import { appSetUser } from '../redux/actions/appSlice';

let refreshInFlight = null;
let interceptorInstalled = false;

function getStoredUser() {
  return store.getState()?.app?.user || null;
}

export async function refreshSession() {
  const user = getStoredUser();
  if (!user?.token) return { ok: false, reason: 'no_token' };

  try {
    const res = await axios.post(
      `${config.apiBaseUrl}/users/refresh-session`,
      {},
      {
        headers: { Authorization: `Bearer ${user.token}` },
        timeout: 15000,
      },
    );
    const { token, user: userData } = res.data || {};
    if (!token || !userData?.id) {
      return { ok: false, reason: 'invalid_response' };
    }
    store.dispatch(
      appSetUser({
        ...user,
        ...userData,
        token,
        rememberMe: user.rememberMe !== false,
      }),
    );
    return { ok: true };
  } catch (error) {
    const status = error?.response?.status;
    if (status === 401 || status === 403) {
      return { ok: false, reason: 'unauthorized' };
    }
    return { ok: false, reason: 'network' };
  }
}

export async function ensureSessionOnStartup() {
  const user = getStoredUser();
  if (!user?.id || !user?.token) return;

  if (!refreshInFlight) {
    refreshInFlight = refreshSession().finally(() => {
      refreshInFlight = null;
    });
  }
  const result = await refreshInFlight;
  if (!result.ok && result.reason === 'unauthorized') {
    store.dispatch(appSetUser(null));
  }
}

export function setupAuthInterceptor() {
  if (interceptorInstalled) return;
  interceptorInstalled = true;

  axios.interceptors.response.use(
    response => response,
    async error => {
      const status = error?.response?.status;
      const original = error?.config;
      if (
        status !== 401 ||
        !original ||
        original._authRetry ||
        original.url?.includes('/users/refresh-session')
      ) {
        return Promise.reject(error);
      }

      const user = getStoredUser();
      if (!user?.token) {
        return Promise.reject(error);
      }

      if (!refreshInFlight) {
        refreshInFlight = refreshSession().finally(() => {
          refreshInFlight = null;
        });
      }
      const result = await refreshInFlight;
      if (!result.ok) {
        if (result.reason === 'unauthorized') {
          store.dispatch(appSetUser(null));
        }
        return Promise.reject(error);
      }

      const nextToken = getStoredUser()?.token;
      if (!nextToken) {
        return Promise.reject(error);
      }

      original._authRetry = true;
      original.headers = {
        ...(original.headers || {}),
        Authorization: `Bearer ${nextToken}`,
      };
      return axios(original);
    },
  );
}

export function setupSessionLifecycle() {
  setupAuthInterceptor();

  let appState = AppState.currentState;
  const sub = AppState.addEventListener('change', nextState => {
    if (appState.match(/inactive|background/) && nextState === 'active') {
      ensureSessionOnStartup();
    }
    appState = nextState;
  });

  return () => sub.remove();
}

export async function fetchWithAuth(url, options = {}) {
  const user = getStoredUser();
  let token = options.token || user?.token;

  const buildRequest = authToken => {
    const { token: _ignored, ...rest } = options;
    return {
      ...rest,
      headers: {
        ...(rest.headers || {}),
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
    };
  };

  let res = await fetch(url, buildRequest(token));
  if (res.status !== 401 || !token) {
    return res;
  }

  const result = await refreshSession();
  if (!result.ok) {
    return res;
  }

  token = getStoredUser()?.token;
  if (!token) {
    return res;
  }

  return fetch(url, buildRequest(token));
}
