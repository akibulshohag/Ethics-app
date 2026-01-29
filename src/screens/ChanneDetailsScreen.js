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
      
      {activeTab === 'Videos' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersWrapper}>
              <TouchableOpacity style={styles.sortByButton}>
                  <Text style={styles.sortByText}>Sort by</Text>
                  <MaterialCommunityIcons name="code-tags" size={16} color="#212121" style={{transform: [{rotate: '90deg'}]}} />
              </TouchableOpacity>
              {FILTERS.map(filter => (
                  <TouchableOpacity 
                    key={filter} 
                    style={[styles.filterChip, activeFilter === filter && styles.activeFilterChip]}
                    onPress={() => setActiveFilter(filter)}
                  >
                      <Text style={[styles.filterChipText, activeFilter === filter && styles.activeFilterChipText]}>{filter}</Text>
                  </TouchableOpacity>
              ))}
          </ScrollView>
      )}
    </View>
  );
  
  const renderItem = ({ item }) => {
      if (activeTab === 'Videos') {
          return <CompactVideoCard video={item} onPress={() => {}} />;
      }
      return <VideoCard video={item} onPress={() => {}} />;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <CustomHeader title="Kristo Restaurant" />
      <FlatList
        data={MOCK_CHANNEL_VIDEOS}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        stickyHeaderIndices={[0]} 
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
});