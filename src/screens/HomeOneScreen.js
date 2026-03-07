import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  Image,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  Dimensions,
  ImageBackground
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
const { width, height } = Dimensions.get('window');

const HomeOneScreen = () => {
  const [isLanding, setIsLanding] = useState(true);
  const [isVideoDetail, setIsVideoDetail] = useState(false);
  const [isRestaurantDetail, setIsRestaurantDetail] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const navigation = useNavigation();

  const openVideo = (item) => {
    navigation.navigate('ProductShortsVideo', { item });
  };

  const openRestaurantDetail = (item) => {
    setSelectedItem(item);
    setIsRestaurantDetail(true);
  };

  // --- RENDERING HELPERS ---

  const renderLanding = () => (
    <View style={styles.landingContainer}>
      <SafeAreaView style={styles.centerContent}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>eat<Text style={{ fontWeight: 'bold' }}>ix</Text></Text>
        </View>
        <TouchableOpacity
          activeOpacity={1}
          style={styles.landingSearchBox}
          onPress={() => setIsLanding(false)}
        >
          <Icon name="magnify" size={22} color="#999" />
          <Text style={styles.landingSearchPlaceholder}>Search Your address</Text>
        </TouchableOpacity>
        <Text style={styles.slogan}>See it, Love it, order it</Text>
      </SafeAreaView>
    </View>
  );

  const renderResults = () => (
    <View style={styles.mainContainer}>
      <View style={styles.header}>
        <View style={styles.navRow}>
          <TouchableOpacity onPress={() => setIsLanding(true)} style={styles.navBtn}>
            <Text style={styles.navBtnText}>{'<'} Home</Text>
          </TouchableOpacity>
          <Text style={styles.headerLogo}>eatix</Text>
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: '#F5A623' }]}>
            <Text style={styles.navBtnText}>Login {'>'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.resultsTitle}>Your search results in Manchester...</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.bannerWrapper}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd' }}
            style={styles.bannerImage}
            resizeMode="cover"
          />
          <TouchableOpacity
            style={styles.featuredBadge}
            onPress={() => openRestaurantDetail({ title: 'Tandoori Planet', location: 'Birmingham, UK', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd' })}
          >
            <Text style={styles.featuredText}>Featured</Text>
            <Icon name="chevron-right" size={16} color="#FFF" />
          </TouchableOpacity>
        </View>

        <View style={styles.locationSection}>
          <View style={styles.homeDropdown}>
            <Icon name="map-marker-radius" size={24} color="#FFF" />
            <Text style={styles.homeText}>Home</Text>
            <Icon name="chevron-down" size={24} color="#FFF" />
          </View>
          <Text style={styles.addressSubtext}>Ground floor, p17/7 park street, s ...</Text>

          <View style={styles.innerSearchBox}>
            <Icon name="magnify" size={20} color="#999" />
            <TextInput placeholder="Food Search" style={styles.innerInput} />
          </View>
        </View>

        <View style={styles.feedPadding}>
          <Text style={styles.feedHint}>your search, served fresh... watch and choose</Text>

          <FoodCard
            title="Tandoori Planet"
            location="Birmingham, UK"
            isSponsored={true}
            img="https://images.unsplash.com/photo-1541544741938-0af808871cc0"
            onPress={() => openVideo({ title: 'Tandoori Planet', img: 'https://images.unsplash.com/photo-1541544741938-0af808871cc0' })}
          />
          <FoodCard
            title="Abbots Burger"
            location="Birmingham, UK"
            isSponsored={false}
            img="https://images.unsplash.com/photo-1568901346375-23c9450c58cd"
            onPress={() => openVideo({ title: 'Abbots Burger', img: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd' })}
          />
        </View>
      </ScrollView>
    </View>
  );

  const renderVideoDetail = () => (
    <ImageBackground source={{ uri: selectedItem?.img }} style={styles.videoBackground}>
      <StatusBar hidden />
      <SafeAreaView style={styles.videoOverlay}>
        <View style={styles.videoHeader}>
          <TouchableOpacity onPress={() => setIsVideoDetail(false)} style={styles.backBtn}>
            <Icon name="chevron-left" size={24} color="#FFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <View style={styles.videoHeaderIcons}>
            <Icon name="magnify" size={26} color="#FFF" style={{ marginRight: 15 }} />
            <Icon name="dots-vertical" size={26} color="#FFF" />
          </View>
        </View>

        <View style={styles.rightActions}>
          <View style={styles.actionItem}>
            <View style={styles.iconCircle}>
              <Icon name="account-circle" size={30} color="#FFF" />
            </View>
            <Text style={styles.actionText}>100k</Text>
          </View>
          <View style={styles.actionItem}>
            <Icon name="heart" size={32} color="#FF4D4D" />
            <Text style={styles.actionText}>100k</Text>
          </View>
          <View style={styles.actionItem}>
            <Icon name="comment-text" size={32} color="#FFF" />
            <Text style={styles.actionText}>Com</Text>
          </View>
          <View style={styles.actionItem}>
            <Icon name="share" size={32} color="#FFF" />
            <Text style={styles.actionText}>Share</Text>
          </View>
        </View>

        <View style={styles.videoFooter}>
          <Text style={styles.videoUser}>@{selectedItem?.title.toLowerCase().replace(' ', '')}</Text>
          <Text style={styles.videoDesc}>Description goes here</Text>
          <Text style={styles.videoHashtags}>#hashtags #music #dance</Text>
          <Text style={styles.translationText}>See translation</Text>
          <View style={styles.footerRow}>
            <View style={styles.audioRow}>
              <Icon name="music" size={18} color="#FFF" />
              <Text style={styles.audioText}>Original Sound</Text>
              <Icon name="volume-off" size={18} color="#FFF" style={{ marginLeft: 15 }} />
              <Text style={styles.audioText}>Mute</Text>
            </View>
            <TouchableOpacity style={styles.orderNowBtn}>
              <Text style={styles.orderNowText}>Order Now</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.bottomArrow}>
            <Icon name="chevron-down" size={40} color="#FFF" />
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );

  const renderRestaurantDetail = () => (
    <SafeAreaView style={styles.resContainer}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.resHeader}>
          <TouchableOpacity onPress={() => setIsRestaurantDetail(false)} style={styles.resBackBtn}>
            <Icon name="chevron-left" size={20} color="#FFF" />
            <Text style={styles.resBackText}>Back</Text>
          </TouchableOpacity>
          <Icon name="dots-vertical" size={24} color="#666" />
        </View>

        <View style={styles.resTitleRow}>
          <View>
            <Text style={styles.resMainTitle}>{selectedItem?.title}</Text>
            <Text style={styles.resSubLoc}>{selectedItem?.location}</Text>
          </View>
          <TouchableOpacity style={styles.resOrderBtn}>
            <Text style={styles.resOrderText}>Order Now</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.resVideoCard}>
          <Image source={{ uri: selectedItem?.img }} style={styles.resVideoImg} />
          <View style={styles.resPlayOverlay}>
            <Icon name="play-circle" size={60} color="rgba(255,255,255,0.8)" />
          </View>
        </View>

        <View style={styles.resSocialRow}>
          <View style={styles.resIconGroup}>
            <Icon name="instagram" size={24} color="#333" style={styles.socialIcon} />
            <Icon name="facebook" size={24} color="#333" style={styles.socialIcon} />
            <Icon name="twitter" size={24} color="#333" style={styles.socialIcon} />
            <Icon name="google" size={24} color="#333" style={styles.socialIcon} />
            <Icon name="web" size={24} color="#333" style={styles.socialIcon} />
          </View>
          <View>
            <TouchableOpacity style={styles.bookNowBtn}>
              <Text style={styles.bookNowText}>Book Now</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.galleryBtn}>
              <Text style={styles.galleryText}>Gallery</Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.webText}>www.tandoriplanet.com</Text>

        <View style={styles.descContainer}>
          <Text style={styles.sectionTitle}>Description</Text>
          <View style={styles.descBox}>
            <Text style={styles.descText}>
              A cozy restaurant serving fresh, delicious food made with quality ingredients.
              Enjoy great taste, warm service, and a comfortable dining experience.
            </Text>
          </View>
        </View>

        <View style={styles.contactContainer}>
          <Text style={styles.sectionTitle}>Contact : <Text style={{ fontWeight: 'normal' }}>44-236656784548</Text></Text>
          <Text style={styles.contactEmail}>tandoriplanet.hc.bd@gmail.com</Text>
          <Text style={styles.contactAddr}>Address : United kingdom</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );

  return (
    <View style={{ flex: 1 }}>
      <StatusBar barStyle="light-content" backgroundColor="#F5A623" />
      {isRestaurantDetail ? renderRestaurantDetail() : (isVideoDetail ? renderVideoDetail() : (isLanding ? renderLanding() : renderResults()))}
    </View>
  );
};

// --- SUB-COMPONENT ---

const FoodCard = ({ title, location, isSponsored, img, onPress }) => (
  <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.9}>
    <View style={styles.cardImageContainer}>
      <Image source={{ uri: img }} style={styles.cardImage} />
      <View style={styles.playIconOverlay}>
        <Icon name="play-circle" size={50} color="rgba(255,255,255,0.8)" />
      </View>
      {isSponsored && (
        <View style={styles.sponsoredTag}>
          <Text style={styles.sponsoredTagText}>Sponsored</Text>
        </View>
      )}
    </View>
    <View style={styles.cardInfo}>
      <View>
        <Text style={styles.cardTitle}>{title}</Text>
        <View style={styles.cardLocRow}>
          <Icon name="map-marker" size={14} color="#4A90E2" />
          <Text style={styles.cardLocText}>{location}</Text>
        </View>
      </View>
      <View style={styles.cardStats}>
        <Text style={styles.statSmall}>100k views</Text>
        <Text style={styles.statSmall}>1.2 Km</Text>
      </View>
    </View>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  // Landing/Feed Styles
  landingContainer: { flex: 1, backgroundColor: '#F5A623' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  logoText: { fontSize: 80, color: '#FFF', letterSpacing: -3 },
  landingSearchBox: { flexDirection: 'row', backgroundColor: '#FFF', width: '100%', height: 55, borderRadius: 10, alignItems: 'center', paddingHorizontal: 15, elevation: 5 },
  landingSearchPlaceholder: { color: '#999', fontSize: 16, marginLeft: 10 },
  slogan: { color: '#FFF', marginTop: 20, fontSize: 14, fontWeight: '500' },
  mainContainer: { flex: 1, backgroundColor: '#FFF' },
  header: { backgroundColor: '#F5A623', padding: 15, paddingTop: 10 },
  navRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  navBtn: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  navBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
  headerLogo: { color: '#FFF', fontSize: 26, fontWeight: 'bold' },
  resultsTitle: { color: '#FFF', marginTop: 15, fontSize: 17, fontWeight: '500' },
  bannerWrapper: { width: '100%', height: 210, position: 'relative' },
  bannerImage: { width: '100%', height: '100%' },
  featuredBadge: { position: 'absolute', bottom: 20, left: 15, backgroundColor: '#FF7A00', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 25 },
  featuredText: { color: '#FFF', fontWeight: 'bold', fontSize: 15, marginRight: 5 },
  locationSection: { backgroundColor: '#F5A623', paddingHorizontal: 15, paddingBottom: 20, paddingTop: 10 },
  homeDropdown: { flexDirection: 'row', alignItems: 'center' },
  homeText: { color: '#FFF', fontSize: 20, fontWeight: 'bold', marginHorizontal: 10 },
  addressSubtext: { color: '#FFF', fontSize: 12, opacity: 0.9, marginBottom: 15 },
  innerSearchBox: { flexDirection: 'row', backgroundColor: '#FFF', height: 45, borderRadius: 8, alignItems: 'center', paddingHorizontal: 12 },
  innerInput: { flex: 1, marginLeft: 10, fontSize: 15 },
  feedPadding: { padding: 15 },
  feedHint: { textAlign: 'center', fontSize: 11, color: '#777', marginBottom: 20 },
  card: { backgroundColor: '#FFF', borderRadius: 15, marginBottom: 25, elevation: 3, overflow: 'hidden' },
  cardImageContainer: { height: 200, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  playIconOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  sponsoredTag: { position: 'absolute', bottom: 10, left: 10, backgroundColor: '#F5A623', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 5 },
  sponsoredTagText: { color: '#FFF', fontSize: 11, fontWeight: 'bold' },
  cardInfo: { padding: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 18, fontWeight: 'bold', color: '#222' },
  cardLocRow: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  cardLocText: { color: '#666', fontSize: 13, marginLeft: 5 },
  cardStats: { alignItems: 'flex-end' },
  statSmall: { fontSize: 12, color: '#999' },

  // Video Detail
  videoBackground: { flex: 1, width: width, height: height },
  videoOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'space-between' },
  videoHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  backBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.3)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 5 },
  backText: { color: '#FFF', fontWeight: 'bold', marginLeft: 5 },
  videoHeaderIcons: { flexDirection: 'row', alignItems: 'center' },
  rightActions: { position: 'absolute', right: 15, bottom: height * 0.25, alignItems: 'center' },
  actionItem: { alignItems: 'center', marginBottom: 20 },
  iconCircle: { width: 45, height: 45, borderRadius: 22.5, borderWidth: 2, borderColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
  actionText: { color: '#FFF', fontSize: 12, marginTop: 5, fontWeight: '600' },
  videoFooter: { padding: 20, paddingBottom: 40 },
  videoUser: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  videoDesc: { color: '#FFF', fontSize: 15, marginBottom: 5 },
  videoHashtags: { color: '#FFF', fontSize: 14, fontWeight: '500', marginBottom: 5 },
  translationText: { color: '#FFF', fontSize: 13, textDecorationLine: 'underline', marginBottom: 15 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  audioRow: { flexDirection: 'row', alignItems: 'center' },
  audioText: { color: '#FFF', fontSize: 13, marginLeft: 5 },
  orderNowBtn: { backgroundColor: '#F5A623', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 10 },
  orderNowText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
  bottomArrow: { alignItems: 'center', marginTop: 20 },

  // Restaurant Detail
  resContainer: { flex: 1, backgroundColor: '#FFF' },
  resHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center' },
  resBackBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  resBackText: { color: '#FFF', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  resTitleRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, alignItems: 'center', marginBottom: 15 },
  resMainTitle: { fontSize: 24, fontWeight: 'bold', color: '#333' },
  resSubLoc: { fontSize: 14, color: '#999' },
  resOrderBtn: { backgroundColor: '#F5A623', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  resOrderText: { color: '#FFF', fontWeight: 'bold' },
  resVideoCard: { paddingHorizontal: 15, height: 220, position: 'relative', marginBottom: 20 },
  resVideoImg: { width: '100%', height: '100%', borderRadius: 15 },
  resPlayOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  resSocialRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, alignItems: 'flex-start' },
  resIconGroup: { flexDirection: 'row', flexWrap: 'wrap', width: '60%' },
  socialIcon: { marginRight: 15, marginBottom: 10 },
  bookNowBtn: { backgroundColor: '#F5A623', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 20, marginBottom: 10 },
  bookNowText: { color: '#FFF', fontWeight: 'bold' },
  galleryBtn: { backgroundColor: '#222', paddingHorizontal: 30, paddingVertical: 12, borderRadius: 20 },
  galleryText: { color: '#FFF', fontWeight: 'bold' },
  webText: { paddingHorizontal: 15, color: '#666', fontSize: 13, marginBottom: 20 },
  descContainer: { paddingHorizontal: 15, marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 10 },
  descBox: { backgroundColor: '#F0F0F0', padding: 15, borderRadius: 12 },
  descText: { fontSize: 14, color: '#555', lineHeight: 20 },
  contactContainer: { paddingHorizontal: 15, paddingBottom: 30 },
  contactEmail: { color: '#555', marginTop: 5 },
  contactAddr: { color: '#555', marginTop: 5 }
});

export default HomeOneScreen;