import AsyncStorage from '@react-native-async-storage/async-storage';

export const EDIT_DRAFT_STORAGE_KEY = 'reel-editor-draft-v2';

export async function clearReelEditorDraft() {
  try {
    await AsyncStorage.removeItem(EDIT_DRAFT_STORAGE_KEY);
  } catch {
    // non-blocking
  }
}

export function newShortSessionKey() {
  return Date.now();
}
