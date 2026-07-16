let hostApi = null;

export function registerBiometricMethodPickerHost(api) {
  hostApi = api;
}

export function unregisterBiometricMethodPickerHost() {
  hostApi = null;
}

/**
 * Samsung-style Fingerprint | Face chooser.
 * Resolves 'fingerprint' | 'face' | null (cancel).
 */
export function openBiometricMethodPicker(options = {}) {
  if (!hostApi?.open) {
    return Promise.resolve(null);
  }
  return hostApi.open(options);
}
