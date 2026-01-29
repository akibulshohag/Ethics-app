import React from 'react';
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

const MOCK_CHANNEL_VIDEOS = [
  {
    id: '1',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    channelName: 'BBC Earth',
    views: '9.5M views',
    publishedAt: '5 months ago',
    thumbnail: 'https://images.unsplash.com/photo-1532550907401-a500c9a57435?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    channelAvatar: 'https://ui-avatars.com/api/?name=BBC+Earth&background=000&color=fff',
    duration: '15:27',
  },
  {
    id: '2',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    channelName: 'BBC Earth',
    views: '9.5M views',
    publishedAt: '5 months ago',
    thumbnail: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    channelAvatar: 'https://ui-avatars.com/api/?name=BBC+Earth&background=000&color=fff',
    duration: '15:27',
  },
  {
      id: '3',
      title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
      channelName: 'BBC Earth',
      views: '9.5M views',
      publishedAt: '5 months ago',
      thumbnail: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
      channelAvatar: 'https://ui-avatars.com/api/?name=BBC+Earth&background=000&color=fff',
      duration: '15:27',
    },
];

const TABS = ['Home', 'Videos', 'Playlists', 'About'];

const ChannelDetailsScreen = () => {
  const renderHeader = () => (
    <View style={styles.headerContent}>
      {/* Tabs */}
      <View 
        style={styles.tabsContainer}
      >
        {TABS.map((tab, index) => (
          <TouchableOpacity key={tab} style={[styles.tabItem, index === 0 && styles.activeTabItem]}>
            <Text style={[styles.tabText, index === 0 && styles.activeTabText]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Channel Profile */}
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
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      <CustomHeader title="Kristo Restaurant" />
      <FlatList
        data={MOCK_CHANNEL_VIDEOS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <VideoCard video={item} onPress={() => {}} />}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
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
});