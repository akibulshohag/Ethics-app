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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import CustomHeader from '../components/CustomHeader';
import VideoCard from '../components/VideoCard';
import CompactVideoCard from '../components/CompactVideoCard';
import ShortsVideoCard from '../components/ShortsVideoCard';
import PlaylistCard from '../components/PlaylistCard';
import ChannelAbout from '../components/ChannelAbout';

const MOCK_CHANNEL_VIDEOS = [
  {
    id: '1',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    channelName: 'BBC Earth',
    views: '6.4M views',
    publishedAt: '2 days ago',
    thumbnail: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    channelAvatar: 'https://ui-avatars.com/api/?name=BBC+Earth&background=000&color=fff',
    duration: '06:42',
  },
  {
    id: '2',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    channelName: 'BBC Earth',
    views: '6.4M views',
    publishedAt: '2 days ago',
    thumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    channelAvatar: 'https://ui-avatars.com/api/?name=BBC+Earth&background=000&color=fff',
    duration: '04:20',
  },
  {
      id: '3',
      title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
      channelName: 'BBC Earth',
      views: '6.4M views',
      publishedAt: '2 days ago',
      thumbnail: 'https://images.unsplash.com/photo-1482049016688-2d3e1b311543?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      channelAvatar: 'https://ui-avatars.com/api/?name=BBC+Earth&background=000&color=fff',
      duration: '08:15',
    },
    {
      id: '4',
      title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
      channelName: 'BBC Earth',
      views: '6.4M views',
      publishedAt: '2 days ago',
      thumbnail: 'https://images.unsplash.com/photo-1484723091739-30a097e8f959?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      channelAvatar: 'https://ui-avatars.com/api/?name=BBC+Earth&background=000&color=fff',
      duration: '05:30',
    },
    {
      id: '5',
      title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
      channelName: 'BBC Earth',
      views: '6.4M views',
      publishedAt: '2 days ago',
      thumbnail: 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      channelAvatar: 'https://ui-avatars.com/api/?name=BBC+Earth&background=000&color=fff',
      duration: '10:05',
    },
        {
      id: '6',
      title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
      channelName: 'BBC Earth',
      views: '6.4M views',
      publishedAt: '2 days ago',
      thumbnail: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      channelAvatar: 'https://ui-avatars.com/api/?name=BBC+Earth&background=000&color=fff',
      duration: '10:05',
    },
];

const MOCK_SHORTS = [
    { id: 's1', title: 'Only You - New Single Release Music by Worl...', views: '4.8M views', thumbnail: 'https://images.unsplash.com/photo-1515003197210-e0cd71810b5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' },
    { id: 's2', title: 'International Bastau Concert Video Clips', views: '6.5M views', thumbnail: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' },
    { id: 's3', title: 'International Music Competition in New York', views: '2.8M views', thumbnail: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' },
    { id: 's4', title: 'Music & Dance Festival Sydney, Australia', views: '3.9M views', thumbnail: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' },
    { id: 's5', title: 'Lorem ipsum dolor sit amet, consectetur adipis elit sed do eiusmod.', views: '000 views', thumbnail: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' },
    { id: 's6', title: 'Lorem ipsum dolor sit amet, consectetur adipis elit sed do eiusmod.', views: '000 views', thumbnail: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' },
];

const MOCK_PLAYLISTS = [
    { id: 'p1', title: 'Dance Competition 2022', videoCount: '120', channelName: 'World of Music', thumbnail: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' },
    { id: 'p2', title: 'Top Music of All Time', videoCount: '250', channelName: 'World of Music', thumbnail: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' },
    { id: 'p3', title: 'Most Listened Song in Century', videoCount: '300', channelName: 'World of Music', thumbnail: 'https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' },
    { id: 'p4', title: 'International Music Festival', videoCount: '32', channelName: 'World of Music', thumbnail: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' },
    { id: 'p5', title: 'Most Epic Moment in Music Concert', videoCount: '50', channelName: 'World of Music', thumbnail: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80' },
];

const TABS = ['Home', 'Videos', 'Playlists', 'About'];
const FILTERS = ['Videos', 'Shorts', 'Live'];

const ChannelDetailsScreen = () => {
  const [activeTab, setActiveTab] = useState('Home');
  const [activeFilter, setActiveFilter] = useState('Videos');

  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map((tab, index) => (
          <TouchableOpacity 
            key={tab} 
            style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'Home' && (
      /* Channel Profile - Only visible in Home tab */
      <View style={styles.profileContainer}>
        <Image 
          source={{ uri: 'https://ui-avatars.com/api/?name=Bang+Bang+Chicken&background=111&color=fff&size=128' }} 
          style={styles.profileAvatar} 
        />
        <View style={styles.nameContainer}>
             <Text style={styles.profileName}>Bang Bang Chicken</Text>
             <MaterialCommunityIcons name="check-decagram" size={16} color="#3ea6ff" style={styles.verifiedIcon} />
        </View>
        
        <TouchableOpacity style={styles.subscribeButton}>
            <Text style={styles.subscribeText}>Subscribe</Text>
        </TouchableOpacity>

        <Text style={styles.statsText}>9.5M subscribers  •  769 videos</Text>
        
        <TouchableOpacity style={styles.moreInfoContainer}>
            <Text style={styles.moreInfoText}>More about this channel</Text>
            <MaterialCommunityIcons name="chevron-right" size={16} color="#616161" />
        </TouchableOpacity>
      </View>
      )}
      
      {(activeTab === 'Videos' || activeTab === 'Playlists') &&(
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersWrapper}>
              <TouchableOpacity style={styles.sortByButton}>
                  <Text style={styles.sortByText}>Sort by</Text>
                  <MaterialCommunityIcons name="code-tags" size={16} color="#212121" style={{transform: [{rotate: '90deg'}]}} />
              </TouchableOpacity>
              {activeTab == 'Videos' && (
              <>
              {FILTERS.map(filter => (
                  <TouchableOpacity 
                    key={filter} 
                    style={[styles.filterChip, activeFilter === filter && styles.activeFilterChip]}
                    onPress={() => setActiveFilter(filter)}
                  >
                      <Text style={[styles.filterChipText, activeFilter === filter && styles.activeFilterChipText]}>{filter}</Text>
                  </TouchableOpacity>
              ))}
              </>
          )}
          </ScrollView>
      )}
    </View>
  );
  
  const renderItem = ({ item }) => {
      if (activeTab === 'Videos') {
          if (activeFilter === 'Shorts') {
              return <ShortsVideoCard video={item} onPress={() => {}} />;
          }
           return <CompactVideoCard video={item} onPress={() => {}} />;
      }
      if (activeTab === 'Playlists') {
          return <PlaylistCard playlist={item} onPress={() => {}} />;
      }
      if (activeTab === 'About') {
          return <ChannelAbout />;
      }
      return <VideoCard video={item} onPress={() => {}} />;
  };

  const getData = () => {
       if (activeTab === 'Videos' && activeFilter === 'Shorts') {
           return MOCK_SHORTS;
       }
       if (activeTab === 'Playlists') {
           return MOCK_PLAYLISTS;
       }
       if (activeTab === 'About') {
           return [{id: 'about'}]; // Dummy data for rendering the about component as item
       }
       return MOCK_CHANNEL_VIDEOS;
  };

  const getNumColumns = () => {
      if (activeTab === 'Videos' && activeFilter === 'Shorts') return 2;
      return 1;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <CustomHeader title="Kristo Restaurant" />
      <FlatList
        key={activeFilter + activeTab} // Force re-render when changing activeTab or layout
        data={getData()}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderItem({ item })}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        // stickyHeaderIndices={[0]}
        numColumns={getNumColumns()}
        columnWrapperStyle={getNumColumns() === 2 ? styles.columnWrapper : null}
      />
    </SafeAreaView>
  );
};

export default ChannelDetailsScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
      paddingBottom: 20,
  },
  headerContent: {
      backgroundColor: '#fff',
  },
  tabsContainer: {
      paddingHorizontal: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#f2f2f2',
      flexDirection: 'row',
      justifyContent: 'space-between',
  },
  tabItem: {
      marginRight: 24,
      paddingVertical: 8,
      paddingHorizontal: 8,
  },
  activeTabItem: {
      borderBottomWidth: 2,
      borderBottomColor: '#F97507',
  },
  tabText: {
      fontSize: 16,
      color: '#616161',
      fontWeight: '500',
  },
  activeTabText: {
      color: '#F97507',
      fontWeight: '600',
  },
  profileContainer: {
      alignItems: 'center',
      paddingVertical: 24,
  },
  profileAvatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#111',
      marginBottom: 12,
  },
  nameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
  },
  profileName: {
      fontSize: 20,
      fontWeight: '700',
      color: '#212121',
  },
  verifiedIcon: {
      marginLeft: 4,
  },
  subscribeButton: {
      backgroundColor: '#F97507',
      paddingHorizontal: 24,
      paddingVertical: 10,
      borderRadius: 20,
      marginBottom: 12,
  },
  subscribeText: {
      color: '#fff',
      fontWeight: '600',
      fontSize: 14,
  },
  statsText: {
      fontSize: 12,
      color: '#616161',
      marginBottom: 8,
  },
  moreInfoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  moreInfoText: {
      fontSize: 12,
      color: '#616161',
      marginRight: 4,
  },
  filtersWrapper: {
      paddingHorizontal: 16,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: '#fff',
  },
  sortByButton: {
      flexDirection: 'row',
      alignItems: 'center',
      marginRight: 12,
      borderWidth: 1,
      borderColor: '#F97507',
      borderRadius: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
  },
  sortByText: {
      fontSize: 14,
      color: '#F97507',
      marginRight: 4,
      fontWeight: '500',
  },
  filterChip: {
      marginRight: 8,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: '#F97507',
  },
  activeFilterChip: {
      backgroundColor: '#F97507',
  },
  filterChipText: {
      color: '#F97507',
      fontWeight: '500',
      fontSize: 14,
  },
  activeFilterChipText: {
      color: '#fff',
  },
  columnWrapper: {
      justifyContent: 'space-between',
      paddingHorizontal: 16, 
  },
});