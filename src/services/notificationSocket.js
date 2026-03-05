/**
 * Real-time notification socket (Socket.IO).
 * Connect with userId so the server can push notifications (like, comment, order) to the user.
 */
import { io } from 'socket.io-client';
import { config } from '../../config';

let socket = null;
let listeners = [];

function getSocketServerUrl() {
  const base = config.apiBaseUrl || '';
  return base.replace(/\/v1\/?$/, '');
}

export function connectNotificationSocket(userId) {
  if (!userId) return;
  disconnectNotificationSocket();
  const url = getSocketServerUrl();
  socket = io(`${url}/notification`, {
    path: '/socket.io',
    query: { userId },
    transports: ['websocket', 'polling'],
  });
  socket.on('connect', () => {
    console.log('[NotificationSocket] Connected');
  });
  socket.on('disconnect', reason => {
    console.log('[NotificationSocket] Disconnected', reason);
  });
  socket.on('notification', payload => {
    listeners.forEach(fn => {
      try {
        fn(payload);
      } catch (e) {}
    });
  });
}

export function disconnectNotificationSocket() {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

export function onNotification(callback) {
  listeners.push(callback);
  return () => {
    listeners = listeners.filter(f => f !== callback);
  };
}
