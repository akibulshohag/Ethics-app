import React, { useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS } from '../constants/theme';
import { getNotificationIcon, navigateFromNotification } from '../utils/notificationNavigation';

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

const NotificationsBottomSheet = ({
  visible,
  onClose,
  notifications = [],
  loading = false,
  unreadCount = 0,
  onMarkRead,
  onMarkAllRead,
  navigation,
  currentUser,
}) => {
  const handlePress = useCallback(
    async item => {
      if (item.status !== 'read') {
        try {
          await onMarkRead?.(item.id);
        } catch {}
      }
      onClose?.();
      setTimeout(() => {
        navigateFromNotification(navigation, item, currentUser).catch(() => {});
      }, 200);
    },
    [onMarkRead, onClose, navigation, currentUser],
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.row, item.status !== 'read' && styles.rowUnread]}
      onPress={() => handlePress(item)}
      activeOpacity={0.75}
    >
      <View style={styles.iconWrap}>
        <Icon
          name={getNotificationIcon(item.type)}
          size={22}
          color={COLORS.primaryOrange || '#FF7A00'}
        />
      </View>
      <View style={styles.info}>
        <Text style={styles.message} numberOfLines={3}>
          {item.message}
        </Text>
        <Text style={styles.time}>{formatTime(item.createdAt)}</Text>
      </View>
      {item.status !== 'read' ? <View style={styles.unreadDot} /> : null}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={e => e.stopPropagation()}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Notifications</Text>
              {unreadCount > 0 ? (
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>{unreadCount} new</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.headerActions}>
              {unreadCount > 0 ? (
                <TouchableOpacity onPress={onMarkAllRead} style={styles.markAllBtn}>
                  <Text style={styles.markAllText}>Mark all read</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>
          </View>

          {loading && notifications.length === 0 ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color={COLORS.primaryOrange || '#FF7A00'} />
            </View>
          ) : (
            <FlatList
              data={notifications}
              keyExtractor={item => String(item.id)}
              renderItem={renderItem}
              style={styles.list}
              contentContainerStyle={
                notifications.length === 0 ? styles.emptyList : styles.listContent
              }
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Icon name="bell-outline" size={48} color="#CCC" />
                  <Text style={styles.emptyText}>No notifications yet</Text>
                  <Text style={styles.emptySubtext}>
                    Orders, chats, likes, and nearby offers will show here.
                  </Text>
                </View>
              }
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    maxHeight: '82%',
    minHeight: 280,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    marginTop: 10,
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#EEE',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
  },
  countPill: {
    backgroundColor: '#FFF0E6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countPillText: {
    color: '#FF7A00',
    fontSize: 12,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  markAllBtn: {
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  markAllText: {
    color: '#FF7A00',
    fontSize: 13,
    fontWeight: '600',
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyList: {
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 220,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#F0F0F0',
  },
  rowUnread: {
    backgroundColor: '#FFF8F2',
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF5F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  info: {
    flex: 1,
    paddingRight: 8,
  },
  message: {
    fontSize: 14,
    color: '#222',
    lineHeight: 20,
    fontWeight: '500',
  },
  time: {
    fontSize: 12,
    color: '#888',
    marginTop: 4,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF7A00',
    marginTop: 6,
  },
  loadingWrap: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyWrap: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginTop: 12,
    fontWeight: '600',
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 18,
  },
});

export default NotificationsBottomSheet;
