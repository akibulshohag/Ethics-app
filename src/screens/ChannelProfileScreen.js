import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  FlatList,
  StatusBar,
  Dimensions,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ShortsVideoCard from '../components/ShortsVideoCard';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Mock Data for Shorts
const MOCK_SHORTS = [
    { id: '1', title: 'Lorem ipsum dolor sit amet, consectetur adip...', views: '2.5M views', thumbnail: 'https://images.pexels.com/photos/3764642/pexels-photo-3764642.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id: '2', title: 'Excepteur sint occaecat cupidatat non proiden...', views: '3.4M views', thumbnail: 'https://images.pexels.com/photos/3944405/pexels-photo-3944405.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id: '3', title: 'Lorem ipsum dolor sit amet, consectetur adipis elit sed do eiusmod...', views: '000 views', thumbnail: 'https://images.pexels.com/photos/5965688/pexels-photo-5965688.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id: '4', title: 'Lorem ipsum dolor sit amet, consectetur adipis elit sed do eiusmod.', views: '000 views', thumbnail: 'https://images.pexels.com/photos/5965935/pexels-photo-5965935.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id: '5', title: 'Making the best coffee ☕️', views: '1.2M views', thumbnail: 'https://images.pexels.com/photos/312418/pexels-photo-312418.jpeg?auto=compress&cs=tinysrgb&w=600' },
    { id: '6', title: 'Travel Vlog #1', views: '500K views', thumbnail: 'https://images.pexels.com/photos/237272/pexels-photo-237272.jpeg?auto=compress&cs=tinysrgb&w=600' },
];

const ChannelProfileScreen = ({ navigation }) => {
  const renderHeader = () => (
      <View>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
            <View style={styles.headerRight}>
                <TouchableOpacity style={styles.headerButton}>
                    <Ionicons name="search-outline" size={24} color="#000" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.headerButton}>
                    <Ionicons name="ellipsis-horizontal-circle-outline" size={24} color="#000" />
                </TouchableOpacity>
            </View>
          </View>

          {/* Profile Section */}
          <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
                  <Image 
                    source={{ uri: 'https://randomuser.me/api/portraits/women/44.jpg' }} 
                    style={styles.avatar} 
                  />
              </View>
              
              <View style={styles.nameContainer}>
                  <Text style={styles.name}>Jenny Wilson</Text>
                  <MaterialCommunityIcons name="check-decagram" size={18} color="#3ea6ff" style={styles.verifiedIcon} />
              </View>

              <TouchableOpacity style={styles.subscribeButton}>
                  <Text style={styles.subscribeText}>Subscribe</Text>
              </TouchableOpacity>

              <Text style={styles.statsText}>
                  2.5M subscribers  •  267 shorts
              </Text>

              <TouchableOpacity style={styles.aboutLink}>
                  <Text style={styles.aboutText}>More about this channel</Text>
                  <Ionicons name="chevron-forward" size={14} color="#606060" />
              </TouchableOpacity>
          </View>
          
          <View style={styles.divider} />
      </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      
      <FlatList
        data={MOCK_SHORTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
             <ShortsVideoCard video={item} onPress={() => {}} />
        )}
        numColumns={2}
        ListHeaderComponent={renderHeader}
        columnWrapperStyle={styles.columnWrapper}
        contentContainerStyle={styles.flatListContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      height: 56,
  },
  headerRight: {
      flexDirection: 'row',
  },
  headerButton: {
      marginLeft: 20,
  },
  profileSection: {
      alignItems: 'center',
      paddingVertical: 20,
  },
  avatarContainer: {
      marginBottom: 16,
  },
  avatar: {
      width: 80,
      height: 80,
      borderRadius: 40,
  },
  nameContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 12,
  },
  name: {
      fontSize: 22,
      fontWeight: 'bold',
      color: '#000',
      marginRight: 6,
  },
  verifiedIcon: {
      marginTop: 2,
  },
  subscribeButton: {
      backgroundColor: '#F97507',
      paddingHorizontal: 40,
      paddingVertical: 10,
      borderRadius: 20,
      marginBottom: 12,
  },
  subscribeText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
  },
  statsText: {
      color: '#606060',
      fontSize: 14,
      marginBottom: 8,
  },
  aboutLink: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  aboutText: {
      color: '#606060',
      fontSize: 14,
      marginRight: 2,
  },
  divider: {
      height: 1,
      backgroundColor: '#e0e0e0',
      marginBottom: 16,
  },
  flatListContent: {
      paddingHorizontal: 16,
      paddingBottom: 20,
  },
  columnWrapper: {
      justifyContent: 'space-between',
  }
});

export default ChannelProfileScreen;
