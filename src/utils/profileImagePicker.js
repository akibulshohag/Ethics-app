import ImagePicker from 'react-native-image-crop-picker';

const normalizeFileUri = path => {
  if (!path) return '';
  const p = String(path);
  if (
    p.startsWith('file://') ||
    p.startsWith('content://') ||
    p.startsWith('ph://')
  ) {
    return p;
  }
  return `file://${p}`;
};

const isPickerCancelled = err => err?.code === 'E_PICKER_CANCELLED';

const toUploadFile = image => ({
  uri: normalizeFileUri(image.path),
  type: image.mime || 'image/jpeg',
  name: 'image.jpg',
});

/**
 * Facebook-style profile photo: pick then crop/zoom with circular mask.
 * @returns {Promise<{ uri: string, type: string, name: string } | null>} null if user cancels
 */
export async function pickProfileAvatarCrop() {
  try {
    const image = await ImagePicker.openPicker({
      mediaType: 'photo',
      cropping: true,
      width: 1024,
      height: 1024,
      cropperCircleOverlay: true,
      compressImageQuality: 0.88,
      forceJpg: true,
      cropperToolbarTitle: 'Move and scale',
      cropperChooseText: 'Done',
      cropperCancelText: 'Cancel',
    });
    return { ...toUploadFile(image), name: 'avatar.jpg' };
  } catch (e) {
    if (isPickerCancelled(e)) return null;
    throw e;
  }
}

/**
 * Cover / banner: wide crop with pan/zoom (Facebook-style positioning).
 * @returns {Promise<{ uri: string, type: string, name: string } | null>} null if user cancels
 */
export async function pickProfileCoverCrop() {
  try {
    const image = await ImagePicker.openPicker({
      mediaType: 'photo',
      cropping: true,
      width: 2000,
      height: 750,
      freeStyleCropEnabled: false,
      compressImageQuality: 0.88,
      forceJpg: true,
      cropperToolbarTitle: 'Move and scale',
      cropperChooseText: 'Done',
      cropperCancelText: 'Cancel',
    });
    return { ...toUploadFile(image), name: 'cover.jpg' };
  } catch (e) {
    if (isPickerCancelled(e)) return null;
    throw e;
  }
}
