import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import BusinessProfileCard from '../../components/BusinessProfileCard';
import PromotionCard from '../../components/PromotionCard';
import BusinessVideoCard from '../../components/BusinessVideoCard';

const { width } = Dimensions.get('window');

const TABS = ['Posts', 'Promotions', 'Grid', 'Video', 'Notification'];
// ... (I will handle the rest in the next edit chunk for the render function to avoid giant replaces)

const MOCK_POSTS = [
  {
    id: '1',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    channelName: 'Dalchini',
    channelAvatar: 'https://via.placeholder.com/100',
    publishedAt: '5 months ago',
    thumbnail: 'https://images.pexels.com/photos/2641886/pexels-photo-2641886.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    duration: '15:27',
    views: '3.2K',
    likes: '3.2K',
    dislikes: '368',
    comments: '675',
    shares: '675',
    website: 'www.tandoriplanet.com',
    hashtags: ['steak', 'food', 'fries'],
  },
  {
    id: '2',
    title: 'Special Beef Burger - Homemade Style',
    channelName: 'Dalchini',
    channelAvatar: 'https://via.placeholder.com/100',
    publishedAt: '2 months ago',
    thumbnail: 'https://images.pexels.com/photos/1639562/pexels-photo-1639562.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    duration: '10:15',
    views: '5.1K',
    likes: '4.2K',
    dislikes: '120',
    comments: '890',
    shares: '450',
    website: 'www.tandoriplanet.com',
    hashtags: ['burger', 'beef', 'fastfood'],
  },
  {
    id: '3',
    title: 'Fresh Garden Salad with Lemon Dressing',
    channelName: 'Dalchini',
    channelAvatar: 'https://via.placeholder.com/100',
    publishedAt: '1 month ago',
    thumbnail: 'https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    duration: '05:45',
    views: '1.2K',
    likes: '900',
    dislikes: '15',
    comments: '120',
    shares: '80',
    website: 'www.tandoriplanet.com',
    hashtags: ['salad', 'healthy', 'vegan'],
  },
];

const MOCK_PROMOTIONS = [
  {
    id: '1',
    title: '10 Rice Bag',
    price: '$100',
    image: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '120',
  },
  {
    id: '2',
    title: '10 Rice Bag',
    price: '$100',
    image: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '120',
  },
  {
    id: '3',
    title: '10 Rice Bag',
    price: '$100',
    image: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1',
    views: '120',
  },
];

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

const BusinessProfileViewScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('Posts');

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

      <BusinessProfileCard/>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabItem, activeTab === tab && styles.activeTabItem]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {activeTab === 'Grid' ? 'Gallery' : activeTab}
        </Text>
        <TouchableOpacity>
          <MaterialCommunityIcons name="plus" size={24} color="#333" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const getListData = () => {
    switch (activeTab) {
      case 'Posts': return MOCK_POSTS;
      case 'Promotions': return MOCK_PROMOTIONS;
      case 'Grid': return MOCK_GRID_IMAGES;
      default: return []; // Return empty array for unimplemented tabs
    }
  };

  const renderContentItem = ({ item }) => {
    if (activeTab === 'Posts') return <BusinessVideoCard video={item} />;
    if (activeTab === 'Promotions') return <PromotionCard item={item} />;
    if (activeTab === 'Grid') {
      return (
        <View style={styles.gridImageContainer}>
          <Image source={{ uri: item.image }} style={styles.gridImage} />
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <FlatList
        key={activeTab === 'Grid' ? 'grid-3-col' : 'list-1-col'}
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
    paddingBottom: 10,
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
  mainCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: '#eee',
  },
  coverArea: {
    width: '100%',
    height: 400,
    backgroundColor: '#eee',
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  badgeContainer: {
    position: 'absolute',
    top: 15,
    right: 15,
    alignItems: 'flex-end',
  },
  twoPartBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  badgeIconPart: {
    backgroundColor: '#fff',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  badgeTextPart: {
    backgroundColor: '#FFAD33',
    paddingLeft: 20,
    paddingRight: 15,
    paddingVertical: 6,
    borderRadius: 15,
    marginLeft: -16,
    minWidth: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  profileOverlayBox: {
    position: 'absolute',
    bottom: 20,
    left: 10,
    right: 10,
    backgroundColor: 'rgba(184, 115, 0, 0.65)',
    borderRadius: 20,
    padding: 15,
  },
  profileMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarWrapper: {
    position: 'relative',
  },
  profileAvatar: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 2,
    borderColor: '#fff',
    backgroundColor: '#333',
  },
  avatarEditIcon: {
    position: 'absolute',
    top: 5,
    right: -5,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    elevation: 2,
  },
  profileNameGroup: {
    marginLeft: 15,
  },
  businessName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 14,
    color: '#fff',
    marginLeft: 5,
  },
  dotSeparator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.4)',
    marginLeft: 8,
  },
  headerButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  editProfileBtnLarge: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 12,
    flex: 1,
  },
  editBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  squareIconBtn: {
    backgroundColor: '#fff',
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBottomPart: {
    backgroundColor: '#dcdcdc',
    paddingTop: 15,
    paddingBottom: 20,
  },
  statsBar: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#333',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  statusMsgContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 15,
    borderTopRightRadius: 15,
    paddingTop: 15,
    paddingHorizontal: 20,
  },
  statusMsg: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    marginVertical: 10,
    paddingHorizontal: 8,
  },
  tabItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginRight: 5,
  },
  activeTabItem: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF7F0B',
  },
  tabText: {
    fontSize: 14,
    color: '#999',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FF7F0B',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  gridColumnWrapper: {
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
    gap: 8,
  },
  gridImageContainer: {
    width: (width - 24 - 16) / 3, // Full width minus horizontal padding minus inner gaps
    aspectRatio: 0.8, // Slightly taller than square as per Figma
    marginBottom: 8,
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    resizeMode: 'cover',
  },
});

export default BusinessProfileViewScreen;