import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

const PromotionThreeScreen = () => {
  
  // Video Item Component
  const VideoCard = ({ name, location, distance, views }) => (
    <View style={styles.videoCard}>
      <View style={styles.videoContainer}>
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd' }} 
          style={styles.videoThumbnail}
        />
        <View style={styles.playButtonOverlay}>
          <Icon name="play-circle-outline" size={50} color="rgba(255,255,255,0.9)" />
        </View>
      </View>
      <View style={styles.videoDetails}>
        <View style={styles.videoHeaderRow}>
          <Text style={styles.videoTitle}>{name}</Text>
          <View style={styles.viewCountRow}>
             <Text style={styles.viewText}>{views}</Text>
             <Icon name="eye-outline" size={16} color="#BDC3C7" />
          </View>
        </View>
        <View style={styles.locationRow}>
          <View style={styles.locLeft}>
            <Icon name="map-marker" size={14} color="#2980B9" />
            <Text style={styles.locationText}>{location}</Text>
          </View>
          <Text style={styles.distanceText}>{distance}</Text>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      
      {/* Top Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn}>
          <Icon name="chevron-left" size={18} color="#FFF" />
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Icon name="dots-vertical" size={24} color="#666" />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.headerCard}>
          <View style={styles.brandContainer}>
            <Image 
                source={require('../assets/short-logo.png')}
                style={styles.logoImage}
                resizeMode="contain"
            />

            <View style={styles.avatarWrapper}>
               <Image 
                 source={{ uri: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330' }} 
                 style={styles.avatar} 
               />
               <View style={styles.editCircle}>
                 <Icon name="pencil-outline" size={12} color="#666" />
               </View>
            </View>
            <Text style={styles.brandText}>ix</Text>
          </View>
          <Text style={styles.profileName}>MC Mulen</Text>
          <Text style={styles.profileLoc}>Birmingham</Text>
        </View>

        {/* Bio Section */}
        <View style={styles.bioBox}>
          <Text style={styles.bioText}>
            A cozy restaurant serving fresh, delicious food made with quality ingredients. Enjoy great taste
          </Text>
          <TouchableOpacity>
            <Icon name="pencil-box-outline" size={22} color="#999" />
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>625k</Text>
            <Text style={styles.statLabel}>Followers</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>124k</Text>
            <Text style={styles.statLabel}>Following</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>89</Text>
            <Text style={styles.statLabel}>MSG</Text>
          </View>
        </View>

        {/* Subscribe Button */}
        <TouchableOpacity style={styles.subscribeBtn}>
          <Text style={styles.subscribeText}>Subscribe</Text>
        </TouchableOpacity>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity style={[styles.tab, styles.activeTab]}>
            <Text style={[styles.tabText, styles.activeTabText]}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Text style={styles.tabText}>Posts</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Icon name="view-grid" size={22} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Text style={styles.tabText}>Videos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.tab}>
            <Text style={styles.tabText}>Playlists</Text>
          </TouchableOpacity>
        </View>

        {/* Video Feed */}
        <View style={styles.feedContainer}>
          <VideoCard 
            name="Tandoori Planet" 
            location="Birmingham, UK" 
            distance="12 Km" 
            views="100k" 
          />
          <VideoCard 
            name="Tandoori Planet" 
            location="Birmingham, UK" 
            distance="12 Km" 
            views="100k" 
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  navBar: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1A1A', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  backText: { color: '#FFF', fontSize: 13, fontWeight: 'bold', marginLeft: 4 },
  
  // Header
  headerCard: { backgroundColor: '#2C3E50', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingVertical: 25, alignItems: 'center', marginHorizontal: 15 },
  brandContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  brandText: { color: '#FFF', fontSize: 40, fontWeight: 'bold', marginHorizontal: 15 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 85, height: 85, borderRadius: 42.5, borderWidth: 2, borderColor: '#000' },
  editCircle: { position: 'absolute', right: -2, top: 5, backgroundColor: '#FFF', borderRadius: 12, padding: 3, elevation: 2 },
  profileName: { color: '#FFF', fontSize: 22, fontWeight: 'bold', marginTop: 12 },
  profileLoc: { color: '#BDC3C7', fontSize: 14, marginTop: 2 },

  // Bio
  bioBox: { flexDirection: 'row', backgroundColor: '#F2F2F2', marginHorizontal: 15, padding: 18, borderBottomLeftRadius: 20, borderBottomRightRadius: 20, alignItems: 'center' },
  bioText: { flex: 1, fontSize: 13, color: '#333', lineHeight: 18 },

  // Stats
  statsContainer: { flexDirection: 'row', backgroundColor: '#EBEBEB', marginHorizontal: 15, marginTop: 15, borderRadius: 15, paddingVertical: 15 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  statLabel: { fontSize: 12, color: '#666', marginTop: 2 },
  statDivider: { width: 1, height: '70%', backgroundColor: '#D1D1D1', alignSelf: 'center' },

  // Subscribe Button
  subscribeBtn: { backgroundColor: '#F5A623', width: width * 0.45, alignSelf: 'center', marginTop: 15, paddingVertical: 12, borderRadius: 20, alignItems: 'center', elevation: 2 },
  subscribeText: { color: '#FFF', fontWeight: 'bold', fontSize: 18 },

  // Tabs
  tabContainer: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F0F0F0', marginTop: 20 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTab: { borderBottomWidth: 3, borderBottomColor: '#F5A623' },
  tabText: { fontSize: 13, color: '#999', fontWeight: '500' },
  activeTabText: { color: '#F5A623', fontWeight: 'bold' },

  // Video Card
  feedContainer: { padding: 15 },
  videoCard: { marginBottom: 25, backgroundColor: '#FFF', borderRadius: 25, overflow: 'hidden', elevation: 2 },
  videoContainer: { position: 'relative', height: 230 },
  videoThumbnail: { width: '100%', height: '100%' },
  playButtonOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  videoDetails: { padding: 15, backgroundColor: '#F8F9FA' },
  videoHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  videoTitle: { fontSize: 18, fontWeight: 'bold', color: '#1A1A1A' },
  viewCountRow: { flexDirection: 'row', alignItems: 'center' },
  viewText: { fontSize: 14, color: '#BDC3C7', marginRight: 5 },
  locationRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  locLeft: { flexDirection: 'row', alignItems: 'center' },
  locationText: { fontSize: 13, color: '#7F8C8D', marginLeft: 4 },
  distanceText: { fontSize: 13, color: '#7F8C8D' },
  logoImage: {
    marginRight: 15,
  },
});

export default PromotionThreeScreen;