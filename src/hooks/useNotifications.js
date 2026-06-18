import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  getNotificationsByUserId,
  markNotificationRead,
  markAllNotificationsRead,
} from '../services/notificationService';
import { onNotification } from '../services/notificationSocket';

export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    try {
      const data = await getNotificationsByUserId(userId);
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    setLoading(true);
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    if (!userId) return undefined;
    return onNotification(payload => {
      if (payload?.id) {
        setNotifications(prev => {
          const exists = prev.some(n => n.id === payload.id);
          if (exists) return prev;
          return [payload, ...prev];
        });
      }
      loadNotifications();
    });
  }, [userId, loadNotifications]);

  const unreadCount = useMemo(
    () => notifications.filter(n => n.status !== 'read').length,
    [notifications],
  );

  const markRead = useCallback(async notificationId => {
    if (!notificationId) return;
    await markNotificationRead(notificationId);
    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, status: 'read' } : n)),
    );
  }, []);

  const markAllRead = useCallback(async () => {
    if (!userId) return;
    await markAllNotificationsRead(userId);
    setNotifications(prev => prev.map(n => ({ ...n, status: 'read' })));
  }, [userId]);

  return {
    notifications,
    unreadCount,
    loading,
    refresh: loadNotifications,
    markRead,
    markAllRead,
  };
}
