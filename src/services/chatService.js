/**
 * Chat API: messages history + file upload for attachments/voice.
 * Backend: GET/POST /messages, POST /chat-files/upload
 */
import { config } from '../../config';

const MESSAGES_URL = `${config.apiBaseUrl}/messages`;
const CHAT_FILES_URL = `${config.apiBaseUrl}/chat-files`;

function getUploadBaseUrl() {
  return (config.apiBaseUrl || '').replace(/\/v1\/?$/, '');
}

/**
 * Get message history between two users (both directions).
 * @param {string} token - Auth token (optional; backend may not require it yet)
 * @param {string} senderId - Current user id
 * @param {string} receiverId - Partner user id
 */
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

/**
 * Upload files for chat (images, documents, or voice).
 * Backend returns { files: [{ filename, url, type }] } with url like /uploads/xxx
 * @param {string} token - Auth token (optional)
 * @param {FormData} formData - Must append key 'files' (one or more files)
 * @returns {Promise<{ files: Array<{ filename: string, url: string, type: string }> }>}
 */
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
  const files = (data.files || []).map((f) => ({
    ...f,
    url: f.url && f.url.startsWith('/') ? `${base}${f.url}` : f.url,
  }));
  return { files };
}

/**
 * Full URL for an attachment (when backend returns relative /uploads/xxx).
 */
export function getAttachmentFullUrl(relativeUrl) {
  if (!relativeUrl) return '';
  if (relativeUrl.startsWith('http')) return relativeUrl;
  return `${getUploadBaseUrl()}${relativeUrl}`;
}
