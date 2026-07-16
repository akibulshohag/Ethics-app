let hostApi = null;

export function registerFaceUnlockCameraHost(api) {
  hostApi = api;
}

export function unregisterFaceUnlockCameraHost() {
  hostApi = null;
}

/** Show front-camera preview; resolves when stream is ready, rejects if user cancels. */
export function openFaceUnlockCamera(options = {}) {
  if (!hostApi?.open) {
    return Promise.resolve();
  }
  return hostApi.open(options);
}

export function dismissFaceUnlockCamera() {
  hostApi?.dismiss?.();
}

/** Release app camera so Android system face unlock can use the front sensor. */
export async function releaseCameraBeforeFaceUnlock(delayMs = 500) {
  dismissFaceUnlockCamera();
  await new Promise(resolve => setTimeout(resolve, delayMs));
}
