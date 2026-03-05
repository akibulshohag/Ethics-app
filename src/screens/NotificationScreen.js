import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, FONTS } from '../constants/theme';
import { useSelector } from 'react-redux';
import { getNotificationsByUserId, markNotificationRead } from '../services/notificationService';
import { onNotification } from '../services/notificationSocket';

const formatTime = createdAt => {
  if (!createdAt) return '';
  const d = new Date(createdAt);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
};

const getIconForType = type => {
  switch (type) {
    case 'video_like':
    case 'short_like':
      return 'thumb-up-outline';
    case 'video_comment':
    case 'short_comment':
      return 'comment-outline';
    case 'restaurant_order':
      return 'cart-outline';
    default:
      return 'bell-outline';
  }
};

const NotificationScreen = ({ onBack }) => {
  const { user: currentUser } = useSelector(state => state.app) || {};
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!currentUser?.id) {
      setNotifications([]);
      setLoading(false);
      return;
    }
    try {
      const data = await getNotificationsByUserId(currentUser.id);
      setNotifications(Array.isArray(data) ? data : []);
    } catch (e) {
      setNotifications([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  useEffect(() => {
    const unsubscribe = onNotification(() => {
      loadNotifications();
    });
    return unsubscribe;
  }, [loadNotifications]);

  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };

  const handlePressNotification = async item => {
    if (item.status !== 'read') {
      try {
        await markNotificationRead(item.id);
        setNotifications(prev =>
          prev.map(n => (n.id === item.id ? { ...n, status: 'read' } : n)),
        );
      } catch (e) {}
    }
    // TODO: navigate to content (video/short/order) using item.contentId and item.type
  };

  const renderNotification = ({ item }) => (
    <TouchableOpacity
      style={[styles.notiRow, item.status !== 'read' && styles.notiRowUnread]}
      onPress={() => handlePressNotification(item)}
      activeOpacity={0.7}
    >
      <View style={styles.iconWrap}>
        <Icon
          name={getIconForType(item.type)}
          size={24}
          color={COLORS.primaryOrange}
        />
      </View>
      <View style={styles.notiInfo}>
        <Text style={styles.notiTitle} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.notiTime}>• {formatTime(item.createdAt)}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Icon name="arrow-left" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 28 }} />
      </View>

      {!currentUser?.id ? (
        <View style={styles.emptyWrap}>
          <Icon name="bell-outline" size={64} color="#ccc" />
          <Text style={styles.emptyText}>Log in to see notifications</Text>
        </View>
      ) : loading && notifications.length === 0 ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primaryOrange} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={item => item.id}
          renderItem={renderNotification}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Icon name="bell-outline" size={64} color="#ccc" />
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[COLORS.primaryOrange]}
              tintColor={COLORS.primaryOrange}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 15,
    color: '#000',
  },
  notiRow: {
    flexDirection: 'row',
    padding: 15,
    alignItems: 'flex-start',
    backgroundColor: '#fff',
  },
  notiRowUnread: {
    backgroundColor: '#FFF8F2',
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  notiInfo: { flex: 1 },
  notiTitle: {
    fontSize: 14,
    color: '#000',
    fontWeight: '500',
    lineHeight: 20,
  },
  notiTime: { fontSize: 12, color: '#666', marginTop: 5 },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: { fontSize: 16, color: '#666', marginTop: 12 },
});

export default NotificationScreen;
