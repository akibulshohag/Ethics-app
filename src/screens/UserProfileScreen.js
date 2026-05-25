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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 40) / 2;

const TABS = ['Profile', 'Promotions', 'About'];
const PROMO_CHIPS = [
  'Tandoori Planet',
  'Steely Balky',
  'Bangla Food',
  'UK Grill',
];

const DUMMY_VIDEOS = [
  {
    id: '1',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix',
    duration: '16:27',
    thumbnail:
      'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=400',
    channel: 'BBC Earth',
    views: '9.5M views',
    time: '5 months ago',
    promoCode: 'MULEN300FF',
  },
  {
    id: '2',
    title: 'Bang Bang Chicken Skewers - Quick....',
    duration: '56:44',
    thumbnail:
      'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400',
    channel: 'World of Music',
    promoCode: 'MULEN300FF',
  },
];

const UserProfileScreen = () => {
  const [activeTab, setActiveTab] = useState('Profile');
  const [selectedPromo, setSelectedPromo] = useState(null);

  // --- TAB CONTENT: ABOUT ---
  const renderAboutTab = () => (
    <View style={styles.aboutContainer}>
      <View style={styles.aboutSection}>
        <View style={styles.aboutHeaderRow}>
          <Text style={styles.aboutTitle}>Description</Text>
          <MaterialCommunityIcons
            name="pencil-outline"
            size={20}
            color="#000"
          />
        </View>
        <Text style={styles.aboutText}>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco laboris nisi ut
          aliquip ex ea commodo consequat. Duis aute irure dolor in
          reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
          pariatur.
        </Text>
      </View>

      <View style={styles.aboutSection}>
        <View style={styles.aboutHeaderRow}>
          <Text style={styles.aboutTitle}>Links</Text>
          <MaterialCommunityIcons
            name="pencil-outline"
            size={20}
            color="#000"
          />
        </View>
        <TouchableOpacity style={styles.linkRow}>
          <MaterialCommunityIcons name="instagram" size={24} color="#FF7F00" />
          <Text style={styles.linkText}>Instagram</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow}>
          <MaterialCommunityIcons name="facebook" size={24} color="#FF7F00" />
          <Text style={styles.linkText}>Facebook</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow}>
          <MaterialCommunityIcons name="twitter" size={24} color="#FF7F00" />
          <Text style={styles.linkText}>Twitter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow}>
          <MaterialCommunityIcons name="web" size={24} color="#FF7F00" />
          <Text style={styles.linkText}>Website</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.aboutSection}>
        <View style={styles.aboutHeaderRow}>
          <Text style={styles.aboutTitle}>More Info</Text>
          <MaterialCommunityIcons
            name="pencil-outline"
            size={20}
            color="#000"
          />
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="map-marker-outline"
            size={22}
            color="#757575"
          />
          <Text style={styles.infoText}>United kingdom</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="information-outline"
            size={22}
            color="#757575"
          />
          <Text style={styles.infoText}>Joined December 20, 2026</Text>
        </View>
        <View style={styles.infoRow}>
          <MaterialCommunityIcons
            name="trending-up"
            size={22}
            color="#757575"
          />
          <Text style={styles.infoText}>8,367,027,349 views</Text>
        </View>
      </View>
    </View>
  );

  // --- RENDER: PROMOTION DETAIL ---
  const renderPromotionDetail = () => (
    <ScrollView
      style={styles.detailContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.promoCard}>
        <View style={styles.promoCardHeader}>
          <Text style={styles.promoCardTitle}>Bang Bang Chicken</Text>
          <TouchableOpacity style={styles.orderBtn}>
            <Text style={styles.orderBtnText}>Order Now</Text>
          </TouchableOpacity>
        </View>
        <Image
          source={{ uri: selectedPromo.thumbnail }}
          style={styles.promoDetailImage}
        />
        <Text style={styles.promoCodeLabel}>Promo Code</Text>
        <View style={styles.promoCodeBox}>
          <Text style={styles.promoCodeText}>{selectedPromo.promoCode}</Text>
          <TouchableOpacity style={styles.copyBtn}>
            <Text style={styles.copyBtnText}>Copy</Text>
          </TouchableOpacity>
        </View>
        {[1, 2, 3].map((_, i) => (
          <View key={i} style={styles.checkRow}>
            <MaterialCommunityIcons
              name="check-circle-outline"
              size={16}
              color="#757575"
            />
            <Text style={styles.checkText}>More about this channel</Text>
          </View>
        ))}
      </View>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.sectionTitle}>More Offers</Text>
        <MaterialCommunityIcons name="chevron-right" size={24} color="#000" />
      </View>
      <View style={styles.gridContainer}>
        {[...DUMMY_VIDEOS, ...DUMMY_VIDEOS].map((item, index) => (
          <View key={index} style={styles.gridItem}>
            <Image source={{ uri: item.thumbnail }} style={styles.gridThumb} />
            <View style={styles.gridMetaRow}>
              <Text style={styles.gridItemTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <MaterialCommunityIcons
                name="dots-vertical"
                size={18}
                color="#757575"
              />
            </View>
            <Text style={styles.promoHighlight}>
              Get Flat <Text style={{ color: '#FF7F00' }}>30% Off</Text>
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderHeader = () => (
    <View style={styles.bgWhite}>
      <View style={styles.topNav}>
        <TouchableOpacity
          onPress={() => (selectedPromo ? setSelectedPromo(null) : null)}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.topNavRight}>
          <TouchableOpacity style={{ marginRight: 20 }}>
            <Ionicons name="search-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity>
            <MaterialCommunityIcons
              name="comment-text-outline"
              size={24}
              color="#000"
            />
          </TouchableOpacity>
        </View>
      </View>

      {!selectedPromo && (
        <>
          <View style={styles.tabBar}>
            {TABS.map(tab => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabButton,
                  activeTab === tab && styles.activeTabBorder,
                ]}
              >
                <Text
                  style={[
                    styles.tabLabel,
                    activeTab === tab && styles.activeTabLabel,
                  ]}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {activeTab === 'Profile' && (
            <View style={styles.profileHeader}>
              <Image
                source={{ uri: 'https://via.placeholder.com/100' }}
                style={styles.avatar}
              />
              <View style={styles.nameRow}>
                <Text style={styles.userName}>Habibur Rahman</Text>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={18}
                  color="#4A89F3"
                />
              </View>
              <Text style={styles.userStats}>
                9.5M subscribers • 769 videos
              </Text>
              <TouchableOpacity style={styles.moreChannelRow}>
                <Text style={styles.moreChannelText}>
                  More about this channel
                </Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={16}
                  color="#757575"
                />
              </TouchableOpacity>

              <View style={styles.featuredSection}>
                <Text style={styles.sectionTitle}>Most Like Video</Text>
                <Text style={styles.featuredDesc} numberOfLines={4}>
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
                  do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                </Text>
                <TouchableOpacity style={styles.learnMoreBtn}>
                  <Text style={styles.learnMoreText}>Learn More</Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={16}
                    color="#000"
                  />
                </TouchableOpacity>
              </View>

              {/* Horizontal Scroll Section */}
              <View style={{ marginTop: 20, width: '100%' }}>
                <View style={styles.sectionHeaderRow}>
                  <Text style={styles.sectionTitle}>Most Like Video</Text>
                </View>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 16 }}
                >
                  {DUMMY_VIDEOS.map((item, index) => (
                    <View key={index} style={styles.horizontalCard}>
                      <View>
                        <Image
                          source={{ uri: item.thumbnail }}
                          style={styles.horizontalThumb}
                        />
                        <View style={styles.durationBadge}>
                          <Text style={styles.durationText}>
                            {item.duration}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.horizontalMeta}>
                        <Text style={styles.horizontalTitle} numberOfLines={2}>
                          {item.title}
                        </Text>
                        <MaterialCommunityIcons
                          name="dots-vertical"
                          size={16}
                          color="#000"
                        />
                      </View>
                      <Text style={styles.horizontalChannel}>
                        World of Music
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          {activeTab === 'Promotions' && (
            <View style={styles.promoTabTitleArea}>
              <View style={styles.promoMainRow}>
                <Text style={styles.promoMainTitle}>Offers & Promotions</Text>
                <MaterialCommunityIcons
                  name="check-circle"
                  size={20}
                  color="#4A89F3"
                />
              </View>
            </View>
          )}

          {activeTab !== 'About' && (
            <>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>Promotions</Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="#757575"
                />
              </View>
              <View style={styles.chipsContainer}>
                {PROMO_CHIPS.map((chip, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.chip,
                      i === 0 &&
                        activeTab === 'Promotions' &&
                        styles.activeChip,
                    ]}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        i === 0 &&
                          activeTab === 'Promotions' &&
                          styles.activeChipText,
                      ]}
                    >
                      {chip}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={[styles.sectionHeaderRow, { marginTop: 10 }]}>
                <Text style={styles.sectionTitle}>Video</Text>
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={20}
                  color="#757575"
                />
              </View>
            </>
          )}
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {selectedPromo ? (
        <>
          <View style={styles.topNav}>
            <TouchableOpacity onPress={() => setSelectedPromo(null)}>
              <Ionicons name="arrow-back" size={24} color="#000" />
            </TouchableOpacity>
          </View>
          {renderPromotionDetail()}
        </>
      ) : activeTab === 'About' ? (
        <ScrollView ListHeaderComponent={renderHeader}>
          {renderHeader()}
          {renderAboutTab()}
        </ScrollView>
      ) : (
        <FlatList
          ListHeaderComponent={renderHeader}
          data={
            activeTab === 'Profile'
              ? DUMMY_VIDEOS
              : [...DUMMY_VIDEOS, ...DUMMY_VIDEOS]
          }
          keyExtractor={(item, index) => `${activeTab}-${item.id}-${index}`}
          key={activeTab}
          numColumns={activeTab === 'Promotions' ? 2 : 1}
          columnWrapperStyle={
            activeTab === 'Promotions'
              ? { paddingHorizontal: 16, justifyContent: 'space-between' }
              : null
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                activeTab === 'Promotions' && setSelectedPromo(item)
              }
              style={
                activeTab === 'Promotions'
                  ? styles.gridItem
                  : styles.fullVideoItem
              }
            >
              <View>
                <Image
                  source={{ uri: item.thumbnail }}
                  style={
                    activeTab === 'Promotions'
                      ? styles.gridThumb
                      : styles.fullThumb
                  }
                />
                <View style={styles.durationBadge}>
                  <Text style={styles.durationText}>{item.duration}</Text>
                </View>
              </View>
              <View style={styles.fullVideoInfo}>
                <View style={styles.channelAvatarSmall} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fullVideoTitle} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <Text style={styles.fullVideoMeta}>
                    {item.channel} • {item.views}
                  </Text>
                </View>
                <MaterialCommunityIcons
                  name="dots-vertical"
                  size={20}
                  color="#757575"
                />
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default UserProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  bgWhite: { backgroundColor: '#fff' },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
  },
  topNavRight: { flexDirection: 'row' },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tabButton: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  activeTabBorder: { borderBottomWidth: 3, borderBottomColor: '#FF7F00' },
  tabLabel: { fontSize: 16, color: '#888', fontWeight: '600' },
  activeTabLabel: { color: '#FF7F00' },
  profileHeader: { alignItems: 'center', paddingVertical: 20 },
  avatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    marginBottom: 12,
    backgroundColor: '#eee',
  },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  userName: { fontSize: 22, fontWeight: 'bold', marginRight: 5 },
  userStats: { fontSize: 13, color: '#757575', marginTop: 4 },
  moreChannelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  moreChannelText: { fontSize: 13, color: '#757575', marginRight: 4 },
  featuredSection: { paddingHorizontal: 16, marginTop: 20, width: '100%' },
  featuredDesc: {
    fontSize: 13,
    color: '#616161',
    lineHeight: 18,
    marginVertical: 10,
  },
  learnMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
  },
  learnMoreText: { fontWeight: '600', marginRight: 5 },

  // HORIZONTAL SECTION
  horizontalCard: { width: width * 0.45, marginRight: 12 },
  horizontalThumb: { width: '100%', height: 100, borderRadius: 12 },
  horizontalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  horizontalTitle: { fontSize: 13, fontWeight: 'bold', flex: 1 },
  horizontalChannel: { fontSize: 11, color: '#757575', marginTop: 2 },

  // ABOUT TAB STYLES
  aboutContainer: { padding: 16 },
  aboutSection: { marginBottom: 25 },
  aboutHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  aboutTitle: { fontSize: 18, fontWeight: 'bold' },
  aboutText: { fontSize: 14, color: '#444', lineHeight: 22 },
  linkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  linkText: { fontSize: 16, color: '#FF7F00', marginLeft: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  infoText: { fontSize: 15, color: '#000', marginLeft: 12 },

  promoTabTitleArea: { paddingVertical: 15, alignItems: 'center' },
  promoMainRow: { flexDirection: 'row', alignItems: 'center' },
  promoMainTitle: { fontSize: 20, fontWeight: 'bold', marginRight: 6 },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 15,
  },
  chip: {
    borderWidth: 1,
    borderColor: '#FF7F00',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  activeChip: { backgroundColor: '#FF7F00' },
  chipText: { color: '#FF7F00', fontWeight: '500' },
  activeChipText: { color: '#fff' },

  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 10,
  },
  sectionTitle: { fontSize: 18, fontWeight: 'bold' },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  durationText: { color: '#fff', fontSize: 10 },

  fullVideoItem: { paddingHorizontal: 16, marginBottom: 20 },
  fullThumb: { width: '100%', height: 200, borderRadius: 12 },
  fullVideoInfo: { flexDirection: 'row', marginTop: 12 },
  channelAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#333',
    marginRight: 12,
  },
  fullVideoTitle: { fontSize: 15, fontWeight: '600' },
  fullVideoMeta: { fontSize: 12, color: '#757575', marginTop: 4 },

  gridItem: { width: COLUMN_WIDTH, marginBottom: 20 },
  gridThumb: { width: '100%', height: 100, borderRadius: 12 },
  gridMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  gridItemTitle: { fontSize: 13, fontWeight: '600', flex: 1 },
  promoHighlight: {
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 4,
    color: '#757575',
  },

  detailContainer: { flex: 1, backgroundColor: '#fff' },
  promoCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#FFF8F2',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#FFE8D1',
  },
  promoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  promoCardTitle: { fontSize: 18, fontWeight: 'bold' },
  orderBtn: {
    backgroundColor: '#FF7F00',
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
  },
  orderBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  promoDetailImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 15,
  },
  promoCodeLabel: { fontSize: 15, fontWeight: 'bold', marginBottom: 10 },
  promoCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#FF7F00',
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#fff',
    marginBottom: 15,
  },
  promoCodeText: { fontSize: 16, fontWeight: 'bold' },
  copyBtn: {
    backgroundColor: '#FF7F00',
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
  },
  copyBtnText: { color: '#fff', fontWeight: 'bold' },
  checkRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  checkText: { fontSize: 11, color: '#757575', marginLeft: 6 },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
});
