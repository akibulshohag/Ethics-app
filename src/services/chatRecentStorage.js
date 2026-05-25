import AsyncStorage from '@react-native-async-storage/async-storage';

const RECENT_CHATS_KEY = '@eatix/recent_chat_partners';
const MAX_RECENT = 50;

export const normalizeChatUserId = id =>
  String(id ?? '')
    .trim()
    .toLowerCase();

/**
 * Remember a chat partner so the inbox can list threads the API omits
 * (e.g. you messaged a follower who has not replied yet).
 */
export async function recordRecentChatPartner({
  partnerId,
  partnerName,
  partnerAvatar,
  partnerRole,
  lastMessage,
}) {
  const originalPartnerId = String(partnerId ?? '').trim();
  const id = normalizeChatUserId(originalPartnerId);
  if (!id) return;
  try {
    const raw = await AsyncStorage.getItem(RECENT_CHATS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const next = [
      {
        partnerId: id,
        originalPartnerId,
        partnerName: partnerName || 'User',
        partnerAvatar: partnerAvatar || '',
        partnerRole: partnerRole || '',
        lastMessage: lastMessage ? String(lastMessage) : '',
        updatedAt: Date.now(),
      },
      ...list.filter(p => normalizeChatUserId(p.partnerId) !== id),
    ].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(RECENT_CHATS_KEY, JSON.stringify(next));
  } catch {
    // ignore storage errors
  }
}

export async function getRecentChatPartners() {
  try {
    const raw = await AsyncStorage.getItem(RECENT_CHATS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
