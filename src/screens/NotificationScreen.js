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
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING } from '../constants/theme';
import { useSelector } from 'react-redux';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getNotificationsByUserId, markNotificationRead } from '../services/notificationService';
import { onNotification } from '../services/notificationSocket';

const NotificationScreen = ({ onBack }) => {
  const navigation = useNavigation();
  const handleBack = onBack || (() => navigation.goBack());
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
      setNotifications(
        Array.isArray(data) ? data : data?.notifications ?? [],
      );
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
    if (item.status === 'unread' || item.status !== 'read') {
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
      style={[styles.notiRow, item.status === 'unread' && styles.notiRowUnread]}
      onPress={() => handlePressNotification(item)}
      activeOpacity={0.7}
    >
      <Icon
        name="bell"
        size={22}
        color="#666"
        style={styles.notiBellIcon}
      />
      <View style={styles.notiInfo}>
        <Text style={styles.notiTitle} numberOfLines={2}>
          {item.message}
        </Text>
        <Text style={styles.notiMeta}>
          {item.type || 'general'} •{' '}
          {item.createdAt
            ? new Date(item.createdAt).toLocaleDateString()
            : ''}
        </Text>
      </View>
      {item.status === 'unread' ? <View style={styles.unreadDot} /> : null}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="arrow-left" size={26} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.headerSpacer} />
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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    marginLeft: 4,
    color: '#111',
  },
  headerSpacer: {
    width: 40,
  },
  notiRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  notiRowUnread: {
    backgroundColor: '#FFFAF8',
  },
  notiBellIcon: {
    marginRight: 12,
  },
  notiInfo: { flex: 1, minWidth: 0 },
  notiTitle: {
    fontSize: 14,
    color: '#111',
    fontWeight: '500',
    lineHeight: 20,
  },
  notiMeta: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryOrange,
    marginLeft: 8,
  },
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
