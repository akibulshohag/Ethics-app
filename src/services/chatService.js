/**
 * Chat API: messages history + file upload for attachments/voice.
 * Backend: GET/POST /messages, POST /chat-files/upload
 */
import { config } from '../../config';
import {
  getChannelFollowers,
  getChannelFollowing,
} from './channelService';
import {
  getRecentChatPartners,
  normalizeChatUserId,
} from './chatRecentStorage';

const MESSAGES_URL = `${config.apiBaseUrl}/messages`;
const CHAT_FILES_URL = `${config.apiBaseUrl}/chat-files`;

function getUploadBaseUrl() {
  return (config.apiBaseUrl || '').replace(/\/v1\/?$/, '');
}

function normalizeMessagesPayload(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const candidates = [data.messages, data.data, data.items, data.results];
  for (let i = 0; i < candidates.length; i += 1) {
    if (Array.isArray(candidates[i])) return candidates[i];
  }
  return [];
}

export function normalizeConversationsPayload(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const candidates = [
    data.conversations,
    data.data,
    data.items,
    data.results,
    data.list,
  ];
  for (let i = 0; i < candidates.length; i += 1) {
    if (Array.isArray(candidates[i])) return candidates[i];
  }
  return [];
}

export function normalizeConversationItem(item, myId) {
  if (!item || typeof item !== 'object') return null;
  const partnerId = normalizeChatUserId(
    item.partnerId ||
      item.partnerUserId ||
      item.userId ||
      item.id ||
      item._id,
  );
  if (!partnerId || partnerId === myId) return null;

  const lastMessage =
    item.lastMessage ??
    item.message ??
    item.lastMessageText ??
    item.content ??
    '';

  const lastMessageAt =
    item.lastMessageAt ??
    item.updatedAt ??
    item.createdAt ??
    item.timestamp ??
    null;

  return {
    partnerId,
    partnerName:
      item.partnerName ||
      item.name ||
      item.channelName ||
      item.nickname ||
      'User',
    partnerAvatar:
      item.partnerAvatar || item.avatar || item.channelAvatar || '',
    partnerRole: item.partnerRole || item.role || item.partnerType || '',
    lastMessage: String(lastMessage || ''),
    lastMessageAt,
  };
}

function messageTimestamp(m) {
  const t = m?.createdAt ?? m?.timestamp ?? m?.updatedAt;
  if (t == null) return 0;
  const n = typeof t === 'number' ? t : new Date(t).getTime();
  return Number.isFinite(n) ? n : 0;
}

function messageDedupeKey(m) {
  if (m?.id != null) return String(m.id);
  return `${m?.senderId}-${m?.receiverId}-${m?.createdAt}-${m?.timestamp}-${m?.content}`;
}

function conversationFromMessages(partner, messages, myId) {
  if (!messages?.length) return null;
  const sorted = [...messages].sort(
    (a, b) => messageTimestamp(b) - messageTimestamp(a),
  );
  const last = sorted[0];
  const lastSender = normalizeChatUserId(last?.senderId);
  const lastReceiver = normalizeChatUserId(last?.receiverId);
  const partnerFromMsg =
    lastSender === myId ? lastReceiver : lastSender || partner.partnerId;

  return {
    partnerId: normalizeChatUserId(partnerFromMsg || partner.partnerId),
    partnerName: partner.partnerName || 'User',
    partnerAvatar: partner.partnerAvatar || '',
    partnerRole: partner.partnerRole || '',
    lastMessage: String(last?.content ?? last?.message ?? ''),
    lastMessageAt:
      last?.createdAt ?? last?.timestamp ?? last?.updatedAt ?? null,
  };
}

/**
 * Load full thread (both directions). Backend may only return one direction per query.
 */
export async function getThreadMessages(token, userId, partnerId) {
  const pairs = [];
  const addPair = (a, b) => {
    const sa = String(a ?? '').trim();
    const sb = String(b ?? '').trim();
    if (!sa || !sb) return;
    const key = `${sa}|${sb}`;
    if (!pairs.some(p => p.key === key)) pairs.push({ key, senderId: sa, receiverId: sb });
  };

  const uid = String(userId ?? '').trim();
  const pid = String(partnerId ?? '').trim();
  addPair(uid, pid);
  addPair(normalizeChatUserId(uid), normalizeChatUserId(pid));

  const byKey = new Map();
  await Promise.all(
    pairs.map(async ({ senderId, receiverId }) => {
      try {
        const raw = await getMessages(token, senderId, receiverId);
        normalizeMessagesPayload(raw).forEach(m => {
          const k = messageDedupeKey(m);
          if (!byKey.has(k)) byKey.set(k, m);
        });
      } catch {
        // ignore single direction failures
      }
    }),
  );
  return [...byKey.values()];
}

async function buildConversationFromThread(token, myId, myIdOriginal, partner) {
  const partnerKey = normalizeChatUserId(partner.partnerId);
  const apiPartnerId =
    String(partner.originalPartnerId || partner.partnerId || '').trim() ||
    partnerKey;
  if (!partnerKey) return null;

  try {
    const messages = await getThreadMessages(
      token,
      myIdOriginal || myId,
      apiPartnerId,
    );
    const row = conversationFromMessages(partner, messages, myId);
    if (row) return row;
  } catch {
    // fall through to recent-only row
  }

  if (partner.lastMessage || partner.updatedAt) {
    return {
      partnerId: partnerKey,
      partnerName: partner.partnerName || 'User',
      partnerAvatar: partner.partnerAvatar || '',
      partnerRole: partner.partnerRole || '',
      lastMessage: String(partner.lastMessage || ''),
      lastMessageAt: partner.updatedAt || null,
    };
  }
  return null;
}

async function fetchConversationsFromApi(token) {
  const res = await fetch(`${MESSAGES_URL}/conversations`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to load conversations');
  const json = await res.json();
  return normalizeConversationsPayload(json);
}

function contactToPartner(it) {
  const originalPartnerId = String(
    it.userId || it.id || it._id || '',
  ).trim();
  const partnerId = normalizeChatUserId(originalPartnerId);
  if (!partnerId) return null;
  return {
    partnerId,
    originalPartnerId,
    partnerName:
      it.channelName || it.nickname || it.name || 'User',
    partnerAvatar: it.channelAvatar || it.avatar || '',
    partnerRole: it.role || '',
  };
}

/** Discover threads with followers / following (e.g. messaged AuS from Followers). */
async function enrichFromContacts(token, myId, myIdOriginal, byPartner) {
  let items = [];
  try {
    const [followersRes, followingRes] = await Promise.all([
      getChannelFollowers(myIdOriginal, myIdOriginal, 1, 50),
      getChannelFollowing(myIdOriginal, myIdOriginal, 1, 50),
    ]);
    const followerItems = Array.isArray(followersRes?.items)
      ? followersRes.items
      : [];
    const followingItems = Array.isArray(followingRes?.items)
      ? followingRes.items
      : [];
    items = [...followerItems, ...followingItems];
  } catch {
    return;
  }

  const pending = [];
  const seen = new Set();
  items.forEach(it => {
    const p = contactToPartner(it);
    if (!p || p.partnerId === myId || seen.has(p.partnerId)) return;
    seen.add(p.partnerId);
    if (!byPartner.has(p.partnerId)) pending.push(p);
  });

  const chunkSize = 6;
  for (let i = 0; i < pending.length; i += chunkSize) {
    const chunk = pending.slice(i, i + chunkSize);
    const built = await Promise.all(
      chunk.map(p =>
        buildConversationFromThread(token, myId, myIdOriginal, p),
      ),
    );
    built.forEach(row => {
      if (row && !byPartner.has(row.partnerId)) {
        byPartner.set(row.partnerId, row);
      }
    });
  }
}

/**
 * API inbox + recent local partners + followers/following threads.
 */
export async function getMergedConversations(token, userId) {
  const myIdOriginal = String(userId ?? '').trim();
  const myId = normalizeChatUserId(userId);
  if (!token || !myId) return [];

  let apiRaw = [];
  try {
    apiRaw = await fetchConversationsFromApi(token);
  } catch {
    apiRaw = [];
  }

  const byPartner = new Map();
  apiRaw.forEach(item => {
    const row = normalizeConversationItem(item, myId);
    if (row) byPartner.set(row.partnerId, row);
  });

  const recent = await getRecentChatPartners();
  const missingRecent = recent.filter(
    p => !byPartner.has(normalizeChatUserId(p.partnerId)),
  );

  if (missingRecent.length) {
    const built = await Promise.all(
      missingRecent.map(p =>
        buildConversationFromThread(token, myId, myIdOriginal, {
          partnerId: p.partnerId,
          originalPartnerId: p.originalPartnerId || p.partnerId,
          partnerName: p.partnerName,
          partnerAvatar: p.partnerAvatar,
          partnerRole: p.partnerRole,
          lastMessage: p.lastMessage,
          updatedAt: p.updatedAt,
        }),
      ),
    );
    built.forEach(row => {
      if (row && !byPartner.has(row.partnerId)) {
        byPartner.set(row.partnerId, row);
      }
    });
  }

  await enrichFromContacts(token, myId, myIdOriginal, byPartner);

  const merged = [...byPartner.values()];
  merged.sort(
    (a, b) =>
      messageTimestamp({ createdAt: b.lastMessageAt }) -
      messageTimestamp({ createdAt: a.lastMessageAt }),
  );
  return merged;
}

export async function getConversations(token, userId) {
  if (!token) throw new Error('Login required');
  if (userId) return getMergedConversations(token, userId);
  const apiRaw = await fetchConversationsFromApi(token);
  const myId = '';
  return apiRaw
    .map(item => normalizeConversationItem(item, myId))
    .filter(Boolean);
}

export async function getMessages(token, senderId, receiverId) {
  const params = new URLSearchParams({
    senderId: String(senderId).trim(),
    receiverId: String(receiverId).trim(),
  });
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${MESSAGES_URL}?${params}`, { headers });
  if (!res.ok) throw new Error('Failed to load messages');
  return res.json();
}

export async function uploadChatFiles(token, formData) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${CHAT_FILES_URL}/upload`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Upload failed');
  }
  const data = await res.json();
  const base = getUploadBaseUrl();
  const files = (data.files || []).map(f => ({
    ...f,
    url: f.url && f.url.startsWith('/') ? `${base}${f.url}` : f.url,
  }));
  return { files };
}

export function getAttachmentFullUrl(relativeUrl) {
  if (!relativeUrl) return '';
  if (relativeUrl.startsWith('http')) return relativeUrl;
  return `${getUploadBaseUrl()}${relativeUrl}`;
}
