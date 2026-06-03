import { config } from '../../config';

export const SIGNUP_ROLES = ['user', 'owner', 'vendor'];

export const getErrorMessage = (data, fallback = 'Request failed') => {
  if (!data) return fallback;
  if (typeof data.message === 'string') return data.message;
  if (Array.isArray(data.message)) return data.message.join(', ');
  return fallback;
};

const normalizeEmail = email => String(email || '').trim().toLowerCase();

const postJson = async (path, body) => {
  const response = await fetch(`${config.apiBaseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(getErrorMessage(data, 'Request failed'));
  }
  return data;
};

export const validatePasswordStrength = password => {
  if (!password || password.length < 8) {
    return 'Password must be at least 8 characters long';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include an uppercase letter';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include a lowercase letter';
  }
  if (!/\d/.test(password)) {
    return 'Password must include a number';
  }
  return null;
};

export const login = (email, password) =>
  postJson('/users/login', {
    email: normalizeEmail(email),
    password: password.trim(),
  });

export const socialLogin = ({ provider, idToken, accessToken }) =>
  postJson('/users/social-login', {
    provider: String(provider || '').trim().toLowerCase(),
    ...(idToken ? { idToken: String(idToken) } : {}),
    ...(accessToken ? { accessToken: String(accessToken) } : {}),
  });

export const register = ({ email, password, roleId, role }) =>
  postJson('/users/register', {
    email: normalizeEmail(email),
    password: password.trim(),
    ...(roleId ? { roleId } : {}),
    ...(role ? { role } : {}),
  });

export const verifyEmailOtp = (email, otp) =>
  postJson('/users/verify-email-verification-otp', {
    email: normalizeEmail(email),
    otp: otp.trim(),
  });

export const resendEmailVerificationOtp = email =>
  postJson('/users/request-email-verification-otp', {
    email: normalizeEmail(email),
  });

export const forgotPassword = (email, method = 'email') =>
  postJson('/users/forgot-password', {
    email: normalizeEmail(email),
    method,
  });

export const verifyOtp = (email, otp) =>
  postJson('/users/verify-otp', {
    email: normalizeEmail(email),
    otp: otp.trim(),
  });

export const resetPassword = ({
  email,
  resetToken,
  newPassword,
  confirmPassword,
}) =>
  postJson('/users/reset-password', {
    email: normalizeEmail(email),
    resetToken,
    newPassword,
    confirmPassword,
  });

export const reactivateAccount = (email, resetToken) =>
  postJson('/users/reactivate-account', {
    email: normalizeEmail(email),
    resetToken,
  });

export const changePassword = (userId, currentPassword, newPassword) =>
  postJson('/users/change-password', {
    userId,
    currentPassword,
    newPassword,
  });

export const isAccountInactiveError = message =>
  String(message || '').includes('ACCOUNT_INACTIVE');

export const isAccountPendingError = message =>
  String(message || '').includes('ACCOUNT_PENDING');
