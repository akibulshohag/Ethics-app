import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import CompactVideoCard from '../components/CompactVideoCard'; 

const HISTORY_DATA = [
  {
    id: '1',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    channelName: 'BBC Earth',
    views: '6.4M views',
    publishedAt: '2 days ago',
    thumbnail: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
    duration: '06:42',
  },
  {
    id: '2',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    channelName: 'BBC Earth',
    views: '6.4M views',
    publishedAt: '2 days ago',
    thumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=400&q=80',
    duration: '04:20',
  },
  {
      id: '3',
      title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
      channelName: 'BBC Earth',
      views: '6.4M views',
      publishedAt: '2 days ago',
      thumbnail: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=400&q=80',
      duration: '08:15',
    },
    {
      id: '4',
      title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
      channelName: 'BBC Earth',
      views: '6.4M views',
      publishedAt: '2 days ago',
      thumbnail: 'https://images.unsplash.com/photo-1484723091739-30a097e8f959?auto=format&fit=crop&w=400&q=80',
      duration: '05:30',
    },
];

const LibraryScreen = () => {
  const [currentView, setCurrentView] = useState('library'); // 'library', 'history', 'yourVideos'

  const renderHeader = () => {
    const isLibrary = currentView === 'library';
    const title = currentView === 'history' ? 'History' : currentView === 'yourVideos' ? 'Your Videos' : 'Library';

    return (
      <View style={styles.header}>
        <View style={styles.logoRow}>
          {!isLibrary ? (
            <TouchableOpacity onPress={() => setCurrentView('library')}>
              <MaterialCommunityIcons name="arrow-left" size={28} color="#333" />
            </TouchableOpacity>
          ) : (
            <MaterialCommunityIcons name="play-box" size={28} color="#F97507" />
          )}
          <Text style={styles.headerTitle}>{title}</Text>
        </View>
        <View style={styles.headerIcons}>
          <TouchableOpacity><MaterialCommunityIcons name="magnify" size={26} color="#333" /></TouchableOpacity>
          {!isLibrary ? (
             <TouchableOpacity style={styles.iconMargin}><MaterialCommunityIcons name="dots-vertical" size={26} color="#333" /></TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.iconMargin}><MaterialCommunityIcons name="bell-outline" size={26} color="#333" /></TouchableOpacity>
              <Image source={{ uri: 'https://i.pravatar.cc/100' }} style={styles.profilePic} />
            </>
          )}
        </View>
      </View>
    );
  };

  // --- Sub-View: History ---
  if (currentView === 'history') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        {renderHeader()}
        <View style={styles.searchSection}>
          <View style={styles.searchBar}>
            <MaterialCommunityIcons name="magnify" size={20} color="#999" />
            <TextInput placeholder="Search watch history" style={styles.searchInput} placeholderTextColor="#999" />
            <MaterialCommunityIcons name="tune" size={20} color="#F97507" />
          </View>
        </View>
        <FlatList
          data={HISTORY_DATA}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <CompactVideoCard video={item} onPress={() => {}} />}
        />
      </SafeAreaView>
    );
  }

  // --- Sub-View: Your Videos ---
  if (currentView === 'yourVideos') {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />
        {renderHeader()}
        <View style={styles.filterWrapper}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
            <TouchableOpacity style={styles.filterChipActive}>
              <Text style={styles.filterTextActive}>Sort by</Text>
              <MaterialCommunityIcons name="swap-vertical" size={16} color="#F97507" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip}>
              <Text style={styles.filterText}>Videos</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.filterChip}>
              <Text style={styles.filterText}>Shorts</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
        <FlatList
          data={[...HISTORY_DATA, ...HISTORY_DATA]} // Duplicated for demo
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => <CompactVideoCard video={item} onPress={() => {}} />}
          contentContainerStyle={{ paddingTop: 10 }}
        />
      </SafeAreaView>
    );
  }

  // --- Main View: Library ---
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {renderHeader()}

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>History</Text>
          <TouchableOpacity onPress={() => setCurrentView('history')}>
            <Text style={styles.viewAllText}>View All</Text>
          </TouchableOpacity>
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyScroll}>
          {HISTORY_DATA.map((item) => (
            <View key={item.id} style={styles.historyCard}>
              <View>
                <Image source={{ uri: item.thumbnail }} style={styles.historyThumb} />
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{item.duration}</Text>
                </View>
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyTitle} numberOfLines={2}>{item.title}</Text>
                <View style={styles.historyMetaRow}>
                    <Text style={styles.historyChannel}>{item.channelName}</Text>
                    <TouchableOpacity><MaterialCommunityIcons name="dots-vertical" size={16} color="#666" /></TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.menuItem} onPress={() => setCurrentView('yourVideos')}>
          <View style={styles.menuIconContainer}>
            <MaterialCommunityIcons name="play-circle" size={24} color="#F97507" />
          </View>
          <Text style={styles.menuText}>Your Videos</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuIconContainer}>
            <MaterialCommunityIcons name="download-circle" size={24} color="#F97507" />
          </View>
          <Text style={styles.menuText}>Downloads</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        {/* Playlists Section continues... */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Playlists</Text>
          <TouchableOpacity style={styles.recentlyAdded}>
            <Text style={styles.sortText}>Recently Added</Text>
            <MaterialCommunityIcons name="chevron-down" size={20} color="#F97507" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.playlistItem}>
          <View style={styles.menuIconContainer}><MaterialCommunityIcons name="plus" size={28} color="#F97507" /></View>
          <Text style={styles.menuText}>New Playlist</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.playlistItem}>
          <View style={styles.menuIconContainer}><MaterialCommunityIcons name="clock-outline" size={24} color="#F97507" /></View>
          <View>
            <Text style={styles.menuText}>Watch Later</Text>
            <Text style={styles.subText}>24 unwatched videos</Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 16, 
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0'
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 12, color: '#1a1a1a' },
  headerIcons: { flexDirection: 'row', alignItems: 'center' },
  iconMargin: { marginHorizontal: 15 },
  profilePic: { width: 30, height: 30, borderRadius: 15 },
  
  // Sub-View Styles (History & Your Videos)
  searchSection: { padding: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 45,
  },
  searchInput: { flex: 1, marginHorizontal: 10, fontSize: 14, color: '#333' },
  filterWrapper: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  filterScroll: { paddingHorizontal: 16 },
  filterChipActive: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF5EE', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#F97507',
    marginRight: 8 
  },
  filterChip: { 
    paddingHorizontal: 15, 
    paddingVertical: 6, 
    borderRadius: 20, 
    borderWidth: 1, 
    borderColor: '#ddd', 
    marginRight: 8 
  },
  filterTextActive: { color: '#F97507', fontWeight: 'bold', marginRight: 4 },
  filterText: { color: '#666' },

  // Library Screen Styles
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 20, alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a1a' },
  viewAllText: { color: '#F97507', fontWeight: '600' },
  historyScroll: { paddingLeft: 16, paddingVertical: 15 },
  historyCard: { width: 160, marginRight: 15 },
  historyThumb: { width: 160, height: 90, borderRadius: 8 },
  durationBadge: {
    position: 'absolute', bottom: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 4, borderRadius: 2,
  },
  durationText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  historyInfo: { marginTop: 8 },
  historyTitle: { fontSize: 13, fontWeight: '600', color: '#333', lineHeight: 18 },
  historyMetaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  historyChannel: { fontSize: 11, color: '#666' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 10 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  menuIconContainer: { 
    width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#FFF5EE', 
    justifyContent: 'center', alignItems: 'center', marginRight: 15
  },
  menuText: { fontSize: 16, fontWeight: '600', color: '#333' },
  recentlyAdded: { flexDirection: 'row', alignItems: 'center' },
  sortText: { color: '#F97507', fontWeight: '600', marginRight: 4 },
  playlistItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  subText: { fontSize: 12, color: '#666', marginTop: 2 },
});

export default LibraryScreen;