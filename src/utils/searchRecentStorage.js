import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@eatwaze/recent_searches';
const MAX = 8;

export async function getRecentSearches() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list)
      ? list.filter(q => String(q || '').trim()).slice(0, MAX)
      : [];
  } catch {
    return [];
  }
}

export async function addRecentSearch(query) {
  const q = String(query || '').trim();
  if (!q || q.length < 2) return;
  try {
    const prev = await getRecentSearches();
    const next = [q, ...prev.filter(x => x.toLowerCase() !== q.toLowerCase())].slice(
      0,
      MAX,
    );
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export async function clearRecentSearches() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
