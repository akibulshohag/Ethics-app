import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import CompactVideoCard from '../components/CompactVideoCard';
import { getFavorites } from '../services/playlistService';
import { mapVideoApiToDisplay, mapShortApiToDisplay } from '../utils/playlistMappers';
import { navigateToHomeOneLibraryDetail } from '../utils/navigateHomeLibraryDetail';

const FavoritesScreen = ({ navigation }) => {
  const { user: currentUser } = useSelector(state => state.app) || {};
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    if (!currentUser?.id) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      const res = await getFavorites(currentUser.id, 1, 100);
      const videos = (res?.videos || []).map(v => mapVideoApiToDisplay(v));
      const shorts = (res?.shorts || []).map(s => mapShortApiToDisplay(s));
      const merged = [...videos, ...shorts].sort(
        (a, b) => (b.addedAt || 0) - (a.addedAt || 0),
      );
      setItems(merged);
    } catch (e) {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    setLoading(true);
    loadData();
  }, [loadData]);

  const handleItemPress = useCallback(
    item => {
      navigateToHomeOneLibraryDetail(navigation, item);
    },
    [navigation],
  );

  if (!currentUser?.id) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation?.goBack()}>
            <MaterialCommunityIcons name="arrow-left" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Favorites</Text>
        </View>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="heart-outline" size={64} color="#ccc" />
          <Text style={styles.emptyStateText}>Please log in to see favorites</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.backBtn}>
          <MaterialCommunityIcons name="arrow-left" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Favorites</Text>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97507" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => item.id || String(i)}
          renderItem={({ item }) => (
            <CompactVideoCard video={item} onPress={() => handleItemPress(item)} />
          )}
          contentContainerStyle={[styles.listContent, items.length === 0 && styles.emptyListContent]}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="heart-outline" size={64} color="#ccc" />
              <Text style={styles.emptyStateText}>No videos in favorites</Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              colors={['#F97507']}
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
    paddingHorizontal: 16,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backBtn: { padding: 5 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 12, color: '#1a1a1a' },
  listContent: { paddingTop: 10 },
  emptyListContent: { flexGrow: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 16 },
});

export default FavoritesScreen;
