import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useSelector } from 'react-redux';
import { getConversations } from '../services/chatService';

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  const pad = (n) => String(n).padStart(2, '0');
  if (sameDay) return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}

export default function MessageListScreen() {
  const navigation = useNavigation();
  const user = useSelector((s) => s?.app?.user);
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadConversations = useCallback(async (isRefresh = false) => {
    if (!user?.token) {
      setConversations([]);
      setLoading(false);
      return;
    }
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const list = await getConversations(user.token);
      setConversations(Array.isArray(list) ? list : []);
    } catch (e) {
      setConversations([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.token]);

  useFocusEffect(
    useCallback(() => {
      loadConversations();
    }, [loadConversations]),
  );

  const openChat = (item) => {
    navigation.navigate('DetailedChatScreen', {
      partnerId: item.partnerId,
      partnerName: item.partnerName,
      partnerAvatar: item.partnerAvatar,
    });
  };

  const filtered = search.trim()
    ? conversations.filter(
        (c) =>
          (c.partnerName || '').toLowerCase().includes(search.toLowerCase()) ||
          (c.lastMessage || '').toLowerCase().includes(search.toLowerCase()),
      )
    : conversations;

  const storyPartners = filtered.slice(0, 8);

  if (!user?.token) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.centered}>
          <Text style={styles.helperText}>Sign in to see messages</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <SafeAreaView>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
            <Icon name="chevron-left" size={22} color="white" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>

          <View style={styles.searchContainer}>
            <Icon name="magnify" size={20} color="#A0A0A0" style={styles.searchIcon} />
            <TextInput
              placeholder="Search Chats"
              placeholderTextColor="#A0A0A0"
              style={styles.searchInput}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storiesContainer}>
            {storyPartners.map((c) => (
              <TouchableOpacity
                key={c.partnerId}
                style={styles.storyItem}
                onPress={() => openChat(c)}
                activeOpacity={0.7}
              >
                <View style={styles.storyRing}>
                  <Image
                    source={{
                      uri: c.partnerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.partnerName || '')}&background=111&color=fff`,
                    }}
                    style={styles.storyImage}
                  />
                </View>
                <Text style={styles.storyName} numberOfLines={1}>{c.partnerName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#FDB022" />
        </View>
      ) : (
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => loadConversations(true)} colors={['#FDB022']} />
          }
        >
          <Text style={styles.sectionTitle}>Messages</Text>
          {filtered.length === 0 ? (
            <Text style={styles.emptyText}>No conversations yet</Text>
          ) : (
            filtered.map((item) => (
              <TouchableOpacity
                key={item.partnerId}
                style={styles.chatCard}
                onPress={() => openChat(item)}
                activeOpacity={0.7}
              >
                <Image
                  source={{
                    uri: item.partnerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(item.partnerName || '')}&background=111&color=fff`,
                  }}
                  style={styles.avatar}
                />
                <View style={styles.chatInfo}>
                  <View style={styles.chatHeader}>
                    <Text style={styles.userName} numberOfLines={1}>{item.partnerName}</Text>
                    <Text style={styles.timeText}>{formatTime(item.lastMessageAt)}</Text>
                  </View>
                  <View style={styles.messageRow}>
                    <Text style={styles.messageText} numberOfLines={1}>
                      {item.lastMessage || 'No message'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  helperText: { fontSize: 16, color: '#666' },
  emptyText: { fontSize: 14, color: '#98A2B3', marginTop: 10 },
  header: {
    backgroundColor: '#FDB022',
    paddingBottom: 20,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1C1E',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginLeft: 20,
    marginTop: 10,
  },
  backText: { color: 'white', fontWeight: 'bold', marginLeft: 4 },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 55,
  },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 16 },
  storiesContainer: { paddingLeft: 20, marginTop: 25 },
  storyItem: { alignItems: 'center', marginRight: 15 },
  storyRing: {
    padding: 3,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: '#F04438',
  },
  storyImage: { width: 60, height: 60, borderRadius: 30 },
  storyName: { width: 70, textAlign: 'center', color: '#1A1C1E', marginTop: 5, fontSize: 12, fontWeight: '600' },
  content: { flex: 1, paddingHorizontal: 20 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', color: '#1A1C1E', marginTop: 25, marginBottom: 15 },
  chatCard: {
    flexDirection: 'row',
    backgroundColor: '#F7F9FC',
    padding: 15,
    borderRadius: 16,
    marginBottom: 12,
    alignItems: 'center',
  },
  avatar: { width: 80, height: 80, borderRadius: 12 },
  chatInfo: { flex: 1, marginLeft: 15 },
  chatHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  userName: { fontSize: 18, fontWeight: '600', color: '#616161', flex: 1 },
  timeText: { fontSize: 14, color: '#9E9E9E' },
  messageRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  messageText: { fontSize: 14, color: '#9E9E9E', flex: 1, marginRight: 10 },
});
