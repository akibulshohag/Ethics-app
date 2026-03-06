import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import UserProfileCard from '../../components/UserProfileCard';
import VideoCard from '../../components/VideoCard';
import CompactVideoCard from '../../components/CompactVideoCard';
import BusinessVideoCard from '../../components/BusinessVideoCard';
import PromotionCard from '../../components/PromotionCard';

const { width } = Dimensions.get('window');

const TABS = ['Home', 'Posts', 'Grid', 'Videos', 'Playlists'];

const MOCK_GRID_IMAGES = [
  { id: '1', image: 'https://images.pexels.com/photos/2641886/pexels-photo-2641886.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
  { id: '2', image: 'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
  { id: '3', image: 'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
  { id: '4', image: 'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
  { id: '5', image: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
  { id: '6', image: 'https://images.pexels.com/photos/1146760/pexels-photo-1146760.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
  { id: '7', image: 'https://images.pexels.com/photos/699953/pexels-photo-699953.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
  { id: '8', image: 'https://images.pexels.com/photos/718742/pexels-photo-718742.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
  { id: '9', image: 'https://images.pexels.com/photos/675951/pexels-photo-675951.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1' },
];

const MOCK_VIDEOS = [
  {
    id: '1',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    channelName: 'BBC Earth',
    channelAvatar: 'https://via.placeholder.com/100',
    publishedAt: '5 months ago',
    thumbnail: 'https://images.pexels.com/photos/2641886/pexels-photo-2641886.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    duration: '15:27',
    views: '9.5M views',
  },
  {
    id: '2',
    title: 'Special Beef Burger - Homemade Style',
    channelName: 'BBC Earth',
    channelAvatar: 'https://via.placeholder.com/100',
    publishedAt: '2 months ago',
    thumbnail: 'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    duration: '10:15',
    views: '5.1M views',
  },
];

const MOCK_PLAYLISTS = [
  {
    id: '1',
    title: 'Dance Competition 2022',
    price: 'World of Music\n\n120 videos', // Repurposing price field for multi-line subtitle as seen in image
    image: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '120',
  },
  {
    id: '2',
    title: 'Top Music of All Time',
    price: 'World of Music\n\n250 videos',
    image: 'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '250',
  },
  {
    id: '3',
    title: 'Most Listened Song in Century',
    price: 'World of Music\n\n300 videos',
    image: 'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '300',
  },
];

const UserViewsScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Home');

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Navigation - OUTSIDE the image */}
      <View style={styles.topNavigation}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation?.goBack()}>
          <View style={styles.backButtonInner}>
            <MaterialCommunityIcons name="chevron-left" size={16} color="#fff" />
            <Text style={styles.backText}>Back</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.moreIcon}>
          <MaterialCommunityIcons name="dots-vertical" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <UserProfileCard />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {TABS.map(tab => {
          const isGrid = tab === 'Grid';
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabItem,
                isActive && styles.activeTabItem,
                isGrid && styles.gridTabItem
              ]}
              onPress={() => setActiveTab(tab)}
            >
              {isGrid ? (
                <MaterialCommunityIcons
                  name="view-grid"
                  size={22}
                  color={isActive ? "#FF7F0B" : "#444"}
                />
              ) : (
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                  {tab}
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );

  const getListData = () => {
    switch (activeTab) {
      case 'Home': return MOCK_VIDEOS;
      case 'Posts': return MOCK_VIDEOS;
      case 'Grid': return MOCK_GRID_IMAGES;
      case 'Videos': return MOCK_VIDEOS; // Reuse same mock data for now, just render differently
      case 'Playlists': return MOCK_PLAYLISTS;
      default: return [];
    }
  };

  const renderContentItem = ({ item }) => {
    if (activeTab === 'Home') return <VideoCard video={item} />;
    if (activeTab === 'Posts') return <BusinessVideoCard video={item} />;
    if (activeTab === 'Grid') {
      return (
        <View style={styles.gridImageContainer}>
          <Image source={{ uri: item.image }} style={styles.gridImage} />
        </View>
      );
    }
    if (activeTab === 'Videos') return <CompactVideoCard video={item} />;
    if (activeTab === 'Playlists') return (
      <View style={{ position: 'relative' }}>
        <PromotionCard item={item} />
        {/* Inject dots menu over the promotion card right side since promotion card doesn't have it natively */}
        <TouchableOpacity style={{ position: 'absolute', top: 12, right: 16, padding: 4 }}>
          <MaterialCommunityIcons name="dots-vertical" size={20} color="#333" />
        </TouchableOpacity>
      </View>
    );
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        key={activeTab === 'Grid' ? 'grid-3-col' : `list-1-col-${activeTab}`}
        data={getListData()}
        keyExtractor={item => item.id}
        renderItem={renderContentItem}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        numColumns={activeTab === 'Grid' ? 3 : 1}
        columnWrapperStyle={activeTab === 'Grid' ? styles.gridColumnWrapper : undefined}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  listContent: {
    paddingBottom: 20,
  },
  headerContainer: {
    paddingBottom: 0,
  },
  topNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backButton: {
    backgroundColor: '#1a1a1a',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  backButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
  },
  moreIcon: {
    padding: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around', // Distribute evenly
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginVertical: 5,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  tabItem: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    minWidth: 50,
    alignItems: 'center',
  },
  activeTabItem: {
    borderBottomWidth: 3,
    borderBottomColor: '#FFAD33', // Orange active border
  },
  gridTabItem: {
    paddingBottom: 8, // slight adjustment for icon centering
  },
  tabText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '500',
  },
  activeTabText: {
    color: '#FFAD33',
    fontWeight: '600',
  },
  gridColumnWrapper: {
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    gap: 8,
  },
  gridImageContainer: {
    width: (width - 32 - 16) / 3, // Full width minus horizontal padding (16*2) minus inner gaps (8*2)
    aspectRatio: 0.8, // Slightly taller than square exactly as done before
    marginBottom: 8,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
});

export default UserViewsScreen;
