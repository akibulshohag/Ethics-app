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
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import VideoCard from '../components/VideoCard';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const MOCK_VIDEO_DATA = [
  {
    id: '1',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    channelName: 'BBC Earth',
    views: '9.5M views',
    publishedAt: '5 months ago',
    thumbnail:
      'https://images.unsplash.com/photo-1532550907401-a500c9a57435?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    channelAvatar:
      'https://ui-avatars.com/api/?name=Dalchini&background=000&color=fff',
    duration: '15:27',
  },
  {
    id: '2',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    channelName: 'BBC Earth',
    views: '9.5M views',
    publishedAt: '5 months ago',
    thumbnail:
      'https://images.unsplash.com/photo-1532550907401-a500c9a57435?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80',
    channelAvatar:
      'https://ui-avatars.com/api/?name=Dalchini&background=111&color=fff',
    duration: '15:27',
  },
];

const CHANNELS = [
  {
    id: '1',
    name: 'Dalchini',
    image: 'https://ui-avatars.com/api/?name=D&background=000&color=fff',
    hasNew: true,
  },
  {
    id: '2',
    name: 'James Watson',
    image: 'https://ui-avatars.com/api/?name=JW&background=F5E6CC&color=8B4513',
    isLive: true,
  },
  {
    id: '3',
    name: 'Netflix',
    image: 'https://ui-avatars.com/api/?name=NF&background=E4002B&color=fff',
    hasNew: true,
  },
  {
    id: '4',
    name: 'Jenny Wilson',
    image: 'https://ui-avatars.com/api/?name=JW&background=00704A&color=fff',
  },
  {
    id: '5',
    name: 'Maryland Winkles',
    image: 'https://ui-avatars.com/api/?name=MW&background=FFC72C&color=DA291C',
    hasNew: true,
  },
];

const SubscriptionScreen = () => {
  const navigation = useNavigation();
  const [selectedChannelId, setSelectedChannelId] = useState(null);
  const [showAllChannels, setShowAllChannels] = useState(false); // State for View All toggle

  const handleBackPress = () => {
    if (showAllChannels) {
      setShowAllChannels(false);
    } else if (selectedChannelId) {
      setSelectedChannelId(null);
    } else {
      navigation.goBack();
    }
  };

  const renderChannelListItem = ({ item }) => (
    <TouchableOpacity style={styles.channelRowFull}>
      <View style={styles.channelRowLeft}>
        <Image source={{ uri: item.image }} style={styles.fullListAvatar} />
        <Text style={styles.fullListChannelName}>{item.name}</Text>
      </View>
      <View style={styles.channelRowRight}>
        {item.isLive && <Text style={styles.liveLabel}>LIVE</Text>}
        {item.hasNew && <View style={styles.newDot} />}
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.headerWrapper}>
      <View style={styles.topBar}>
        <View style={styles.logoRow}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={26} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {showAllChannels ? 'Channel List (36)' : 'Subscriptions'}
          </Text>
        </View>
        <View style={styles.iconRow}>
          <TouchableOpacity>
            <MaterialCommunityIcons name="magnify" size={26} color="#333" />
          </TouchableOpacity>
          {showAllChannels ? (
            <TouchableOpacity style={styles.iconMargin}>
              <MaterialCommunityIcons
                name="dots-vertical"
                size={26}
                color="#333"
              />
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity style={styles.iconMargin}>
                <MaterialCommunityIcons
                  name="bell-outline"
                  size={26}
                  color="#333"
                />
              </TouchableOpacity>
              <Image
                source={{ uri: 'https://i.pravatar.cc/100' }}
                style={styles.profilePic}
              />
            </>
          )}
        </View>
      </View>

      {!showAllChannels && (
        <>
          <View style={styles.channelHeader}>
            <Text style={styles.channelHeaderText}>
              Subscriptions Channel (36)
            </Text>
            <TouchableOpacity onPress={() => setShowAllChannels(true)}>
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            {CHANNELS.map(item => (
              <TouchableOpacity
                key={item.id}
                style={styles.channelItem}
                onPress={() => setSelectedChannelId(item.id)}
              >
                <View
                  style={[
                    styles.avatarContainer,
                    selectedChannelId === item.id && styles.activeAvatarBorder,
                  ]}
                >
                  <Image
                    source={{ uri: item.image }}
                    style={styles.circularAvatar}
                  />
                </View>
                <Text style={styles.tinyChannelName} numberOfLines={1}>
                  {item.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selectedChannelId ? (
            <View style={styles.newVideosRow}>
              <View style={styles.newVideosLabel}>
                <MaterialCommunityIcons
                  name="play-circle"
                  size={24}
                  color="#F97507"
                />
                <Text style={styles.newVideosText}>5 New Videos</Text>
              </View>
              <TouchableOpacity style={styles.viewChannelBtn}>
                <Text style={styles.viewChannelBtnText}>View Channel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.chipRow}>
              <TouchableOpacity style={[styles.chip, styles.activeChip]}>
                <Text style={styles.activeChipText}>All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.chip}>
                <Text style={styles.chipText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.chip}>
                <Text style={styles.chipText}>Continue Watching</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {showAllChannels ? (
        <View style={{ flex: 1 }}>
          {renderHeader()}
          <View style={styles.filterSection}>
            <TouchableOpacity style={styles.relevanceBtn}>
              <Text style={styles.relevanceText}>Most Relevant</Text>
              <MaterialCommunityIcons
                name="swap-vertical"
                size={16}
                color="#F97507"
              />
            </TouchableOpacity>
          </View>
          <FlatList
            data={[...CHANNELS, ...CHANNELS]} // Mocking a longer list
            keyExtractor={(item, index) => index.toString()}
            renderItem={renderChannelListItem}
            showsVerticalScrollIndicator={false}
          />
        </View>
      ) : (
        <FlatList
          data={MOCK_VIDEO_DATA}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <VideoCard video={item} onPress={() => {}} />
          )}
          ListHeaderComponent={renderHeader}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

export default SubscriptionScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  headerWrapper: {
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 56,
  },
  logoRow: { flexDirection: 'row', alignItems: 'center' },
  backButton: { marginRight: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  iconRow: { flexDirection: 'row', alignItems: 'center' },
  iconMargin: { marginHorizontal: 15 },
  profilePic: { width: 30, height: 30, borderRadius: 15 },
  channelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 15,
    alignItems: 'center',
  },
  channelHeaderText: { fontSize: 16, fontWeight: '700', color: '#333' },
  viewAllText: { color: '#F97507', fontWeight: '600' },
  horizontalScroll: { paddingLeft: 16, paddingVertical: 15 },
  channelItem: { alignItems: 'center', marginRight: 18, width: 60 },
  avatarContainer: {
    padding: 2,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  activeAvatarBorder: { borderColor: '#F97507' },
  circularAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#eee',
  },
  tinyChannelName: {
    fontSize: 11,
    marginTop: 5,
    color: '#666',
    textAlign: 'center',
  },
  newVideosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  newVideosLabel: { flexDirection: 'row', alignItems: 'center' },
  newVideosText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  viewChannelBtn: {
    borderWidth: 1,
    borderColor: '#F97507',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  viewChannelBtnText: { color: '#F97507', fontWeight: '600', fontSize: 14 },
  chipRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#F97507',
    marginRight: 10,
  },
  activeChip: { backgroundColor: '#F97507' },
  activeChipText: { color: '#fff', fontWeight: 'bold' },
  chipText: { color: '#F97507', fontWeight: '600' },

  filterSection: { padding: 16 },
  relevanceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F97507',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  relevanceText: { color: '#F97507', marginRight: 4, fontWeight: '600' },
  channelRowFull: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  channelRowLeft: { flexDirection: 'row', alignItems: 'center' },
  fullListAvatar: { width: 56, height: 56, borderRadius: 28, marginRight: 16 },
  fullListChannelName: { fontSize: 16, fontWeight: '600', color: '#333' },
  channelRowRight: { flexDirection: 'row', alignItems: 'center' },
  liveLabel: {
    color: '#F97507',
    fontWeight: 'bold',
    fontSize: 14,
    marginRight: 8,
  },
  newDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#F97507' },
});
