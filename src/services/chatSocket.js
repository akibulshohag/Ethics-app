/**
 * Real-time chat socket (Socket.IO) - default namespace.
 * Backend ChatGateway: connect with userId (normalized lowercase), send_message, typing.
 */
import { io } from 'socket.io-client';
import { config } from '../../config';

let socket = null;
const messageListeners = [];
const typingListeners = [];

function getSocketServerUrl() {
  return (config.apiBaseUrl || '').replace(/\/v1\/?$/, '');
}

function normalizeUserId(id) {
  return String(id ?? '').trim().toLowerCase();
}

/**
 * Connect to chat gateway. Call when user is logged in (e.g. when entering ChatScreen).
 * @param {string} userId - Current user id (will be normalized to lowercase)
 */
export function connectChatSocket(userId) {
  if (!userId) return;
  disconnectChatSocket();
  const url = getSocketServerUrl();
  const normalizedId = normalizeUserId(userId);
  socket = io(url, {
    path: '/socket.io',
    query: { userId: normalizedId },
    transports: ['websocket', 'polling'],
  });
  socket.on('connect', () => {
    console.log('[ChatSocket] Connected');
  });
  socket.on('disconnect', (reason) => {
    console.log('[ChatSocket] Disconnected', reason);
  });
  socket.on('message', (payload) => {
    messageListeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {}
    });
  });
  socket.on('typing', (payload) => {
    typingListeners.forEach((fn) => {
      try {
        fn(payload);
      } catch (e) {}
    });
  });
}

export function disconnectChatSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function isChatSocketConnected() {
  return socket?.connected ?? false;
}

/**
 * Send a DM message. from/to are normalized to lowercase by backend.
 * @param {{ to: string, from: string, message: string, timestamp: number, type?: string, attachments?: string[], voiceUrl?: string, duration?: number }}
 */
export function sendChatMessage(payload) {
  if (!socket?.connected) return Promise.reject(new Error('Not connected'));
  const normalized = {
    ...payload,
    from: normalizeUserId(payload.from),
    to: normalizeUserId(payload.to),
  };
  return new Promise((resolve, reject) => {
    socket.emit('send_message', normalized, (res) => {
      if (res?.success) resolve(res);
      else reject(new Error(res?.error || 'Send failed'));
    });
  });
}

/**
 * Emit typing indicator to partner.
 */
export function emitTyping(to) {
  if (!socket?.connected) return;
  socket.emit('typing', {
    from: normalizeUserId(socket.handshake?.query?.userId),
    to: normalizeUserId(to),
  });
}

export function onChatMessage(callback) {
  messageListeners.push(callback);
  return () => {
    const i = messageListeners.indexOf(callback);
    if (i !== -1) messageListeners.splice(i, 1);
  };
}

export function onChatTyping(callback) {
  typingListeners.push(callback);
  return () => {
    const i = typingListeners.indexOf(callback);
    if (i !== -1) typingListeners.splice(i, 1);
  };
}
