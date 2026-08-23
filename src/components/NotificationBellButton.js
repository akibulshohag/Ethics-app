import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const NotificationBellButton = ({
  unreadCount = 0,
  onPress,
  iconColor = '#FFF',
  size = 26,
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={styles.wrap}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    accessibilityRole="button"
    accessibilityLabel={
      unreadCount > 0
        ? `Notifications, ${unreadCount} unread`
        : 'Notifications'
    }
  >
    <Icon name="bell-outline" size={size} color={iconColor} />
    {unreadCount > 0 ? (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>
          {unreadCount > 99 ? '99+' : String(unreadCount)}
        </Text>
      </View>
    ) : null}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    padding: 4,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F97507',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  badgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
  },
});

export default NotificationBellButton;
