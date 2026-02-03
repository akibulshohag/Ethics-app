import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, FONTS } from '../constants/theme';

const NOTIFICATIONS = [
  {
    id: '1',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe ...',
    time: '2 hours ago',
    image:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=300',
  },
  {
    id: '2',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe ...',
    time: '2 hours ago',
    image:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=300',
  },
  {
    id: '3',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe ...',
    time: '2 hours ago',
    image:
      'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?q=80&w=300',
  },
  {
    id: '4',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe ...',
    time: '2 hours ago',
    image:
      'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?q=80&w=300',
  },
  {
    id: '5',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe ...',
    time: '2 hours ago',
    image:
      'https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=300',
  },
];

const NotificationScreen = ({ onBack }) => {
  const [activeSubTab, setActiveSubTab] = useState('All');

  const renderNotification = ({ item }) => (
    <View style={styles.notiRow}>
      <View style={styles.channelCircle} />
      <View style={styles.notiInfo}>
        <Text style={styles.notiTitle} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.notiTime}>• {item.time}</Text>
      </View>
      <Image source={{ uri: item.image }} style={styles.notiThumb} />
      <TouchableOpacity>
        <Icon name="dots-vertical" size={20} color="#000" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Icon name="arrow-left" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification</Text>
        <Icon
          name="magnify"
          size={26}
          color="#000"
          style={{ marginRight: 15 }}
        />
        <Icon name="dots-vertical" size={26} color="#000" />
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {['All', 'Mentions'].map(tab => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeSubTab === tab && styles.activeTab]}
            onPress={() => setActiveSubTab(tab)}
          >
            <Text
              style={[
                styles.tabText,
                activeSubTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={NOTIFICATIONS}
        keyExtractor={item => item.id}
        renderItem={renderNotification}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', padding: SPACING.lg },
  headerTitle: {
    flex: 1,
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 15,
    color: '#000',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 15 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: COLORS.primaryOrange },
  tabText: { fontSize: 16, color: '#666', fontWeight: '600' },
  activeTabText: { color: COLORS.primaryOrange },
  notiRow: { flexDirection: 'row', padding: 15, alignItems: 'flex-start' },
  channelCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#222',
    marginRight: 12,
  },
  notiInfo: { flex: 1, marginRight: 10 },
  notiTitle: { fontSize: 14, color: '#000', fontWeight: '500', lineHeight: 20 },
  notiTime: { fontSize: 12, color: '#666', marginTop: 5 },
  notiThumb: { width: 80, height: 50, borderRadius: 8, marginRight: 10 },
});

export default NotificationScreen;
