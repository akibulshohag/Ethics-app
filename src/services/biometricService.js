import { Platform, Alert, InteractionManager } from 'react-native';
import ReactNativeBiometrics, { BiometryTypes } from 'react-native-biometrics';
import { config } from '../../config';
import {
  eatixBiometricPrompt,
  getEatixBiometricCapabilities,
  isEatixBiometricNativeAvailable,
} from './eatixBiometricNative';
import {
  dismissFaceUnlockCamera,
  releaseCameraBeforeFaceUnlock,
} from './faceUnlockCameraBridge';
import { openBiometricMethodPicker } from './biometricMethodPickerBridge';
import {
  clearBiometricSession,
  getBiometricPreferredMethod,
  getBiometricSession,
  hasBiometricSession,
  saveBiometricPreferredMethod,
  saveBiometricSession,
} from './secureStorageService';

const rnBiometrics = new ReactNativeBiometrics({
  allowDeviceCredentials: true,
});

/** Wait for RN Modal teardown / animations before system BiometricPrompt (OEM UI bugs). */
function waitForUiIdle(ms = 320) {
  return new Promise(resolve => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(resolve, ms);
    });
  });
}

export async function getBiometricSupport() {
  try {
    if (isEatixBiometricNativeAvailable()) {
      const caps = await getEatixBiometricCapabilities();
      return {
        available: !!caps?.available,
        biometryType: caps?.biometryType || BiometryTypes.Biometrics,
        faceAvailable: !!caps?.faceAvailable,
        fingerprintAvailable: !!caps?.fingerprintAvailable,
      };
    }

    const { available, biometryType } = await rnBiometrics.isSensorAvailable();
    const isFace = biometryType === BiometryTypes.FaceID;
    return {
      available: !!available,
      biometryType: biometryType || null,
      faceAvailable: isFace,
      fingerprintAvailable:
        !!available &&
        (biometryType === BiometryTypes.TouchID ||
          biometryType === BiometryTypes.Biometrics),
    };
  } catch {
    return {
      available: false,
      biometryType: null,
      faceAvailable: false,
      fingerprintAvailable: false,
    };
  }
}

export function biometricLabel(biometryType) {
  if (biometryType === BiometryTypes.FaceID) return 'Face ID';
  if (biometryType === BiometryTypes.TouchID) return 'Touch ID';
  if (biometryType === BiometryTypes.Biometrics) return 'Fingerprint';
  return 'Biometrics';
}

export function biometricIconName(biometryType) {
  if (biometryType === BiometryTypes.FaceID) return 'face-recognition';
  return 'fingerprint';
}

export function biometricLoginButtonLabel(biometryType, method) {
  if (method === 'face') return 'Face unlock';
  if (method === 'fingerprint') return 'Fingerprint';
  if (biometryType === BiometryTypes.FaceID) return 'Face ID';
  if (biometryType === BiometryTypes.TouchID) return 'Touch ID';
  if (Platform.OS === 'android' || biometryType === BiometryTypes.Biometrics) {
    return 'Fingerprint & Face unlock';
  }
  return 'Fingerprint & Face login';
}

export function biometricUnlockDescription(
  biometryType,
  enabled,
  preferredMethod,
) {
  if (preferredMethod === 'face') {
    return enabled
      ? 'Sign in quickly with face recognition on the login screen'
      : 'Use face recognition to sign in without a password';
  }
  if (preferredMethod === 'fingerprint') {
    return enabled
      ? 'Sign in quickly with fingerprint on the login screen'
      : 'Use fingerprint to sign in without a password';
  }
  if (biometryType === BiometryTypes.FaceID) {
    return enabled
      ? 'Sign in quickly with Face ID on the login screen'
      : 'Use Face ID to sign in without a password';
  }
  if (biometryType === BiometryTypes.TouchID) {
    return enabled
      ? 'Sign in quickly with Touch ID on the login screen'
      : 'Use Touch ID to sign in without a password';
  }
  if (!enabled) {
    return 'Use fingerprint or face recognition to sign in without a password';
  }
  return 'Sign in quickly with fingerprint or face on the login screen';
}

export async function syncBiometricSessionForUser(user) {
  if (!user?.fingerprintEnabled || !user?.id || !user?.token) return;
  await saveBiometricSession({ userId: user.id, token: user.token });
}

function resolvePromptMethod(explicitMethod, support) {
  if (explicitMethod === 'face' || explicitMethod === 'fingerprint') {
    return explicitMethod;
  }
  if (support?.faceAvailable && !support?.fingerprintAvailable) return 'face';
  if (support?.fingerprintAvailable && !support?.faceAvailable)
    return 'fingerprint';
  if (support?.fingerprintAvailable && support?.faceAvailable) {
    // Android: never request combined STRONG+WEAK authenticators. Samsung
    // renders that as a clean Fingerprint/Face switcher, but Vivo/OPPO OEM
    // skins stack both hint lines full-screen with no switcher — looks broken.
    // Fall back to a single concrete method instead of 'any' (also applies
    // to a stale/legacy 'any' explicitMethod persisted before this fix).
    return Platform.OS === 'android' ? 'fingerprint' : 'any';
  }
  return 'any';
}

export async function promptBiometric(
  message = 'Confirm your identity',
  { method, persistMethod = false } = {},
) {
  const support = await getBiometricSupport();
  if (!support.available) {
    throw new Error('Biometric authentication is not available on this device');
  }

  const storedMethod = await getBiometricPreferredMethod();
  let promptMethod = resolvePromptMethod(method || storedMethod, support);

  // Stale preference after capability fix (e.g. old "face" on FP-only Vivo).
  if (promptMethod === 'face' && !support.faceAvailable) {
    if (support.fingerprintAvailable) promptMethod = 'fingerprint';
    else {
      throw new Error(
        'Face unlock is not set up. Add face unlock in phone Settings.',
      );
    }
  }
  if (promptMethod === 'fingerprint' && !support.fingerprintAvailable) {
    if (support.faceAvailable) promptMethod = 'face';
    else {
      throw new Error(
        'Fingerprint is not set up. Add fingerprint in phone Settings.',
      );
    }
  }

  if (method === 'face' && !support.faceAvailable && !support.fingerprintAvailable) {
    throw new Error(
      'Face unlock is not set up. Add face unlock in phone Settings.',
    );
  }
  if (
    method === 'fingerprint' &&
    !support.fingerprintAvailable &&
    !support.faceAvailable
  ) {
    throw new Error(
      'Fingerprint is not set up. Add fingerprint in phone Settings.',
    );
  }

  if (persistMethod && method) {
    await saveBiometricPreferredMethod(method);
  }

  if (Platform.OS === 'android') {
    await waitForUiIdle(280);
  }

  try {
    if (isEatixBiometricNativeAvailable()) {
      // Face unlock must use the OS biometric prompt (real face match).
      // Never treat "camera open + Confirm" as login — that was insecure.
      // Release any leftover preview camera first so the system face sensor can run.
      if (promptMethod === 'face' && Platform.OS === 'android') {
        dismissFaceUnlockCamera();
        await releaseCameraBeforeFaceUnlock(200);
      }

      try {
        const { success, error } = await eatixBiometricPrompt({
          promptMessage: message,
          cancelButtonText: 'Cancel',
          biometricMethod:
            promptMethod === 'any' ? 'fingerprint' : promptMethod,
          allowDeviceCredentials: false,
        });
        if (!success) {
          throw new Error(error || 'Biometric authentication cancelled');
        }
        return true;
      } finally {
        dismissFaceUnlockCamera();
      }
    }

    const { success, error } = await rnBiometrics.simplePrompt({
      promptMessage: message,
      cancelButtonText: 'Cancel',
    });
    if (!success) {
      throw new Error(error || 'Biometric authentication cancelled');
    }
    return true;
  } catch (e) {
    if (e?.message) throw e;
    throw new Error('Biometric authentication failed');
  }
}

export async function updateFingerprintEnabled(
  user,
  nextEnabled,
  { method } = {},
) {
  if (!user?.id || !user?.token) {
    throw new Error('You must be logged in to change biometric settings');
  }

  if (nextEnabled) {
    const support = await getBiometricSupport();
    if (!support.available) {
      throw new Error(
        'Biometric authentication is not available on this device',
      );
    }
    const enableMethod = resolvePromptMethod(method, support);
    await promptBiometric('Enable biometric login for Eatwaze', {
      method: enableMethod,
      persistMethod: !!method,
    });
    if (method) {
      await saveBiometricPreferredMethod(method);
    }
    await saveBiometricSession({ userId: user.id, token: user.token });
  } else {
    await disableBiometricLogin();
  }

  const response = await fetch(`${config.apiBaseUrl}/users/set-fingerprint`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${user.token}`,
    },
    body: JSON.stringify({
      userId: user.id,
      fingerprintEnabled: nextEnabled,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (nextEnabled) {
      await disableBiometricLogin();
    }
    throw new Error(data?.message || 'Failed to update biometric setting');
  }

  return nextEnabled;
}

export async function enableBiometricLogin(user, { method } = {}) {
  if (!user?.id || !user?.token) {
    throw new Error('You must be logged in to enable biometric login');
  }
  const support = await getBiometricSupport();
  if (!support.available) {
    throw new Error('Biometric authentication is not available on this device');
  }
  const enableMethod = resolvePromptMethod(method, support);
  await promptBiometric('Enable biometric login for Eatwaze', {
    method: enableMethod,
    persistMethod: !!method,
  });
  if (method) {
    await saveBiometricPreferredMethod(method);
  }
  await saveBiometricSession({ userId: user.id, token: user.token });
  return true;
}

export async function disableBiometricLogin() {
  await clearBiometricSession();
  await saveBiometricPreferredMethod(null);
}

export async function tryBiometricLogin(method) {
  const exists = await hasBiometricSession();
  if (!exists) {
    throw new Error('Biometric login is not set up');
  }

  const storedMethod = await getBiometricPreferredMethod();
  const unlockMethod = method || storedMethod || 'any';
  const unlockMessage =
    unlockMethod === 'face'
      ? 'Sign in to Eatwaze with face recognition'
      : unlockMethod === 'fingerprint'
      ? 'Sign in to Eatwaze with fingerprint'
      : 'Sign in to Eatwaze with fingerprint or face';

  await promptBiometric(unlockMessage, {
    method: unlockMethod,
  });
  const session = await getBiometricSession();
  if (!session?.token || !session?.userId) {
    throw new Error('Saved biometric session is invalid');
  }
  return session;
}

export async function chooseBiometricMethodOnEnable(support) {
  if (!support?.faceAvailable || !support?.fingerprintAvailable) {
    if (support?.faceAvailable) return 'face';
    if (support?.fingerprintAvailable) return 'fingerprint';
    return 'any';
  }

  if (Platform.OS === 'android') {
    const picked = await openBiometricMethodPicker({
      title: 'Eatwaze',
      subtitle: 'Enable biometric login for Eatwaze',
      faceAvailable: true,
      fingerprintAvailable: true,
      initialMethod: 'fingerprint',
    });
    return picked;
  }

  return new Promise(resolve => {
    Alert.alert(
      'Choose unlock method',
      'Face unlock opens the front camera. Fingerprint uses the sensor.',
      [
        {
          text: 'Face unlock (camera)',
          onPress: () => resolve('face'),
        },
        {
          text: 'Fingerprint',
          onPress: () => resolve('fingerprint'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
