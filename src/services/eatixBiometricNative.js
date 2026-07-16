import { NativeModules, Platform } from 'react-native';

const { EatixBiometric } = NativeModules;

export function isEatixBiometricNativeAvailable() {
  return Platform.OS === 'android' && !!EatixBiometric?.simplePrompt;
}

export async function getEatixBiometricCapabilities() {
  if (!isEatixBiometricNativeAvailable()) {
    return null;
  }
  return EatixBiometric.getCapabilities();
}

export async function eatixBiometricPrompt({
  promptMessage,
  cancelButtonText = 'Cancel',
  biometricMethod = 'any',
  allowDeviceCredentials = false,
}) {
  if (!isEatixBiometricNativeAvailable()) {
    throw new Error('Eatix biometric module is not available');
  }
  const result = await EatixBiometric.simplePrompt({
    promptMessage,
    cancelButtonText,
    biometricMethod,
    allowDeviceCredentials,
  });
  return result;
}
