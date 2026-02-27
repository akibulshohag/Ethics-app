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
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Ionicons from 'react-native-vector-icons/Ionicons';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 40) / 2;
const PHOTO_GRID_WIDTH = (width - 40) / 3;

const TABS = ['Home', 'Gallery', 'Promotions', 'About'];
const GALLERY_FILTERS = ['Videos', 'Photos', 'Albums'];

const DUMMY_VIDEOS = [
  {
    id: '1',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe ...',
    duration: '16:27',
    thumbnail:
      'https://images.unsplash.com/photo-1561758033-d89a9ad46330?q=80&w=400',
    channel: 'BBC Earth',
    views: '6.4M views',
    time: '2 days ago',
    promoCode: 'MULEN300FF',
  },
  {
    id: '2',
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe ...',
    duration: '56:44',
    thumbnail:
      'https://images.unsplash.com/photo-1552332386-f8dd00dc2f85?q=80&w=400',
    channel: 'World of Music',
    views: '6.4M views',
    time: '2 days ago',
    promoCode: 'MULEN300FF',
  },
];

// --- NEW: DUMMY LOCATIONS (Based on image_0dfbb0.png) ---
const LOCATIONS = [
  { id: '1', name: 'United States', address: '' },
  {
    id: '2',
    name: 'United States Embassy',
    address: '6391 Elgin St. Celina, Delaware 10299',
  },
  {
    id: '3',
    name: 'United States Minor Outlying Islands',
    address: '1901 Thornridge Cir. Shiloh, Hawaii 81063',
  },
  {
    id: '4',
    name: 'United States Virgin Islands',
    address: '2715 Ash Dr. San Jose, South Dakota 83475',
  },
  {
    id: '5',
    name: 'United States Air Force Academy',
    address: '4140 Parker Rd. Allentown, New Mexico 31134',
  },
  {
    id: '6',
    name: 'United States Bank Central',
    address: '4517 Washington Ave. Manchester, Kentucky 39495',
  },
  {
    id: '7',
    name: 'United States Police Central',
    address: '2118 Thornridge Cir. Syracuse, Connecticut 35624',
  },
];

const VendorProfileScreen = () => {
  const [activeTab, setActiveTab] = useState('Home');
  const [gallerySubFilter, setGallerySubFilter] = useState('Videos');
  const [selectedPromo, setSelectedPromo] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isSelectingLocation, setIsSelectingLocation] = useState(false); // NEW STATE

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

  // --- NEW: LOCATION PICKER UI (Matches image_0dfbb0.png) ---
  const renderLocationPicker = () => (
    <View style={styles.uploadContainer}>
      <View style={styles.locationHeader}>
        <TouchableOpacity onPress={() => setIsSelectingLocation(false)}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.searchBarContainer}>
          <Ionicons
            name="search-outline"
            size={20}
            color="#888"
            style={{ marginRight: 10 }}
          />
          <TextInput
            placeholder="United States"
            placeholderTextColor="#000"
            style={styles.locationSearchInput}
          />
        </View>
      </View>

      <FlatList
        data={LOCATIONS}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.locationItem}
            onPress={() => setIsSelectingLocation(false)}
          >
            <MaterialCommunityIcons name="map-marker" size={24} color="#444" />
            <View style={styles.locationTextContainer}>
              <Text style={styles.locationName}>{item.name}</Text>
              {item.address !== '' && (
                <Text style={styles.locationAddress}>{item.address}</Text>
              )}
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );

  const renderDescriptionEditor = () => (
    <View style={styles.uploadContainer}>
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => setIsEditingDescription(false)}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Promotion</Text>
        <TouchableOpacity>
          <MaterialCommunityIcons
            name="dots-horizontal"
            size={24}
            color="#000"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 16 }}
      >
        <Text style={styles.descHeading}>Description</Text>
        <View style={styles.descBox}>
          <TextInput
            multiline
            style={styles.descInput}
            placeholder="Enter description..."
            defaultValue="Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua..."
          />
        </View>

        <Text style={styles.descHeading}>Hashtag</Text>
        <View style={styles.hashtagInputRow}>
          <TextInput
            style={styles.hashtagInput}
            placeholder="Type and enter"
            placeholderTextColor="#CCC"
          />
        </View>

        <View style={styles.tagContainer}>
          {['#shorts', '#fashion', '#vintage'].map(tag => (
            <View key={tag} style={styles.tagChip}>
              <Text style={styles.tagText}>{tag}</Text>
              <TouchableOpacity>
                <Ionicons name="close" size={14} color="#FF7F00" />
              </TouchableOpacity>
            </View>
          ))}
        </View>

        <Text style={styles.descHeading}>Promo Offer</Text>
        <View style={styles.promoInputRow}>
          <TextInput
            style={styles.promoInput}
            placeholder="Flat 30"
            defaultValue="Flat 30"
          />
          <MaterialCommunityIcons
            name="percent-outline"
            size={20}
            color="#666"
          />
        </View>

        <TouchableOpacity
          style={styles.applyBtn}
          onPress={() => setIsEditingDescription(false)}
        >
          <Text style={styles.applyBtnText}>Apply</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderUploadPromotion = () => (
    <View style={styles.uploadContainer}>
      <View style={styles.topNav}>
        <TouchableOpacity onPress={() => setIsUploading(false)}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Promotion</Text>
        <TouchableOpacity>
          <MaterialCommunityIcons
            name="dots-horizontal"
            size={24}
            color="#000"
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 30 }}
      >
        <View style={styles.imageUploadPlaceholder}>
          <Image
            source={{
              uri: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?q=80&w=600',
            }}
            style={styles.uploadedImage}
          />
          <View style={styles.uploadOverlay}>
            <Text style={styles.uploadOverlayText}>Upload Promotion</Text>
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.inputLabel}>Add a Title</Text>
          <TextInput
            style={styles.titleInput}
            placeholder="Your title here..."
            placeholderTextColor="#CCC"
          />

          <TouchableOpacity
            style={styles.formRow}
            onPress={() => setIsEditingDescription(true)}
          >
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons
                name="pencil-outline"
                size={22}
                color="#444"
              />
              <Text style={styles.rowLabel}>Add Description</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#444"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.formRow}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons
                name="eye-outline"
                size={22}
                color="#444"
              />
              <Text style={styles.rowLabel}>Visibility</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>Public</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="#444"
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.formRow}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons
                name="account-group-outline"
                size={22}
                color="#444"
              />
              <Text style={styles.rowLabel}>Select Audience</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#444"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.formRow}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons
                name="calendar-blank-outline"
                size={22}
                color="#444"
              />
              <Text style={styles.rowLabel}>Schedule</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>Now</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="#444"
              />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.formRow}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons
                name="comment-text-outline"
                size={22}
                color="#444"
              />
              <Text style={styles.rowLabel}>Comments</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>Allow all comments</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={24}
                color="#444"
              />
            </View>
          </TouchableOpacity>

          {/* UPDATED: onPress calls setIsSelectingLocation(true) */}
          <TouchableOpacity
            style={styles.formRow}
            onPress={() => setIsSelectingLocation(true)}
          >
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons
                name="map-marker-outline"
                size={22}
                color="#444"
              />
              <Text style={styles.rowLabel}>Location</Text>
            </View>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color="#444"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.formRow}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons
                name="play-circle-outline"
                size={22}
                color="#444"
              />
              <Text style={styles.rowLabel}>Add to Playlist</Text>
            </View>
            <MaterialCommunityIcons
              name="plus-circle-outline"
              size={22}
              color="#444"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.submitBtn}>
          <Text style={styles.submitBtnText}>Upload Promotion</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderItem = ({ item }) => {
    if (activeTab === 'Gallery' && gallerySubFilter === 'Photos') {
      return (
        <View style={styles.photoGridItem}>
          <Image source={{ uri: item.thumbnail }} style={styles.photoThumb} />
        </View>
      );
    }
    if (activeTab === 'Gallery' && gallerySubFilter === 'Videos') {
      return (
        <View style={styles.galleryListItem}>
          <Image source={{ uri: item.thumbnail }} style={styles.galleryThumb} />
          <View style={styles.galleryInfo}>
            <Text style={styles.galleryTitle} numberOfLines={3}>
              {item.title}
            </Text>
            <Text style={styles.galleryMeta}>
              {item.views} • {item.time}
            </Text>
          </View>
          <TouchableOpacity>
            <MaterialCommunityIcons
              name="dots-vertical"
              size={20}
              color="#000"
            />
          </TouchableOpacity>
        </View>
      );
    }
    if (activeTab === 'Promotions') {
      return (
        <TouchableOpacity
          style={styles.promoGridItem}
          onPress={() => setSelectedPromo(item)}
        >
          <View>
            <Image
              source={{ uri: item.thumbnail }}
              style={styles.promoGridThumb}
            />
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{item.duration}</Text>
            </View>
          </View>
          <View style={styles.promoGridInfo}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fullVideoTitle} numberOfLines={2}>
                {item.title}
              </Text>
              <Text style={styles.promoHighlight}>
                Get Flat <Text style={{ color: '#FF7F00' }}>30% Off</Text>
              </Text>
            </View>
            <MaterialCommunityIcons
              name="dots-vertical"
              size={18}
              color="#000"
            />
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity style={styles.fullVideoItem}>
        <View>
          <Image source={{ uri: item.thumbnail }} style={styles.fullThumb} />
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
    );
  };

  const renderHeader = () => (
    <View style={styles.bgWhite}>
      <View style={styles.topNav}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setSelectedPromo(null)}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Kristo Restaurant</Text>
        </View>
        <View style={styles.topNavRight}>
          <TouchableOpacity style={{ marginRight: 20 }}>
            <Ionicons name="search-outline" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity>
            <MaterialCommunityIcons
              name="dots-horizontal"
              size={24}
              color="#000"
            />
          </TouchableOpacity>
        </View>
      </View>

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

      {activeTab === 'Home' && (
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
          <Text style={styles.userStats}>9.5M subscribers • 769 videos</Text>
          <TouchableOpacity style={styles.moreChannelRow}>
            <Text style={styles.moreChannelText}>More about this channel</Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={16}
              color="#757575"
            />
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'Gallery' && (
        <>
          <View style={styles.galleryFilterRow}>
            <TouchableOpacity style={styles.sortBtn}>
              <Text style={styles.sortBtnText}>Sort by</Text>
              <MaterialCommunityIcons
                name="swap-vertical"
                size={16}
                color="#FF7F00"
              />
            </TouchableOpacity>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {GALLERY_FILTERS.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setGallerySubFilter(item)}
                  style={[
                    styles.galleryChip,
                    gallerySubFilter === item && styles.activeGalleryChip,
                  ]}
                >
                  <Text
                    style={[
                      styles.galleryChipText,
                      gallerySubFilter === item && styles.activeGalleryChipText,
                    ]}
                  >
                    {item}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          {gallerySubFilter === 'Photos' && (
            <View style={styles.photoIconTabs}>
              <TouchableOpacity
                style={[
                  styles.photoIconBtn,
                  { borderBottomColor: '#FF7F00', borderBottomWidth: 2 },
                ]}
              >
                <MaterialCommunityIcons name="grid" size={22} color="#FF7F00" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoIconBtn}>
                <MaterialCommunityIcons
                  name="format-list-bulleted"
                  size={22}
                  color="#CCC"
                />
              </TouchableOpacity>
              <TouchableOpacity style={styles.photoIconBtn}>
                <MaterialCommunityIcons
                  name="heart-outline"
                  size={22}
                  color="#CCC"
                />
              </TouchableOpacity>
            </View>
          )}
        </>
      )}

      {activeTab === 'Promotions' && (
        <View style={styles.promoTabHeader}>
          <View style={styles.promoLogoCircle}>
            <Image
              source={{ uri: 'https://via.placeholder.com/50' }}
              style={styles.promoLogo}
            />
          </View>
          <Text style={styles.promoTitleText}>Offers and Promotions</Text>
          <Text style={styles.promoStatsText}>9 Offers • 7 Promotions</Text>
          <TouchableOpacity
            style={styles.uploadPromoBtn}
            onPress={() => setIsUploading(true)}
          >
            <Text style={styles.uploadPromoBtnText}>Upload Promotion</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fff" />
      {/* Priority navigation logic */}
      {isSelectingLocation ? (
        renderLocationPicker()
      ) : isEditingDescription ? (
        renderDescriptionEditor()
      ) : isUploading ? (
        renderUploadPromotion()
      ) : activeTab === 'About' ? (
        <ScrollView>
          {renderHeader()}
          {renderAboutTab()}
        </ScrollView>
      ) : (
        <FlatList
          ListHeaderComponent={renderHeader}
          data={[...DUMMY_VIDEOS, ...DUMMY_VIDEOS, ...DUMMY_VIDEOS]}
          keyExtractor={(item, index) =>
            `${activeTab}-${gallerySubFilter}-${index}`
          }
          key={
            activeTab === 'Gallery' && gallerySubFilter === 'Photos'
              ? '3'
              : activeTab === 'Promotions'
              ? '2'
              : '1'
          }
          numColumns={
            activeTab === 'Gallery' && gallerySubFilter === 'Photos'
              ? 3
              : activeTab === 'Promotions'
              ? 2
              : 1
          }
          columnWrapperStyle={
            (activeTab === 'Gallery' && gallerySubFilter === 'Photos') ||
            activeTab === 'Promotions'
              ? { paddingHorizontal: 12, justifyContent: 'flex-start' }
              : null
          }
          renderItem={renderItem}
        />
      )}
    </SafeAreaView>
  );
};

export default VendorProfileScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  bgWhite: { backgroundColor: '#fff' },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    alignItems: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
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

  // LOCATION PICKER STYLES (image_0dfbb0.png)
  locationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchBarContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F2F2F2',
    borderRadius: 25,
    paddingHorizontal: 15,
    marginLeft: 15,
    height: 45,
  },
  locationSearchInput: { flex: 1, fontSize: 14, color: '#000' },
  locationItem: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
    borderBottomWidth: 0.5,
    borderBottomColor: '#f0f0f0',
  },
  locationTextContainer: { marginLeft: 15, flex: 1 },
  locationName: { fontSize: 16, fontWeight: '600', color: '#333' },
  locationAddress: { fontSize: 12, color: '#888', marginTop: 4 },

  // UPLOAD SCREEN STYLES
  uploadContainer: { flex: 1, backgroundColor: '#fff' },
  imageUploadPlaceholder: {
    margin: 16,
    height: 200,
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  uploadedImage: { width: '100%', height: '100%' },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadOverlayText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  formSection: { paddingHorizontal: 16 },
  inputLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
    color: '#000',
  },
  titleInput: {
    backgroundColor: '#F8F8F8',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 10,
    fontSize: 14,
    color: '#000',
  },
  formRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 0.5,
    borderBottomColor: '#eee',
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { marginLeft: 15, fontSize: 15, color: '#000' },
  rowRight: { flexDirection: 'row', alignItems: 'center' },
  rowValue: { marginRight: 5, color: '#777', fontSize: 14 },
  submitBtn: {
    backgroundColor: '#FF7F00',
    margin: 20,
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
  },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // DESCRIPTION EDITOR STYLES
  descHeading: {
    fontSize: 17,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
    color: '#333',
  },
  descBox: {
    backgroundColor: '#F9F9F9',
    borderRadius: 15,
    padding: 15,
    minHeight: 150,
  },
  descInput: { fontSize: 14, color: '#666', lineHeight: 20 },
  hashtagInputRow: {
    backgroundColor: '#F9F9F9',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  hashtagInput: { fontSize: 14, color: '#000' },
  tagContainer: { flexDirection: 'row', marginTop: 15, flexWrap: 'wrap' },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF7F00',
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 5,
    marginRight: 10,
    marginBottom: 10,
  },
  tagText: { color: '#FF7F00', fontSize: 13, marginRight: 5 },
  promoInputRow: {
    backgroundColor: '#F9F9F9',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promoInput: { flex: 1, fontSize: 14, color: '#000' },
  applyBtn: {
    backgroundColor: '#FF7F00',
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 30,
  },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },

  // HOME / PROFILE STYLES
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

  // PROMOTIONS STYLES
  promoTabHeader: { alignItems: 'center', paddingVertical: 20 },
  promoLogoCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  promoLogo: { width: 40, height: 40 },
  promoTitleText: { fontSize: 20, fontWeight: 'bold' },
  promoStatsText: { fontSize: 13, color: '#757575', marginVertical: 8 },
  uploadPromoBtn: {
    backgroundColor: '#3A3F44',
    paddingVertical: 12,
    paddingHorizontal: 60,
    borderRadius: 25,
  },
  uploadPromoBtnText: { color: '#fff', fontWeight: 'bold' },
  promoGridItem: { width: COLUMN_WIDTH, marginBottom: 20, marginRight: 10 },
  promoGridThumb: { width: '100%', height: 110, borderRadius: 12 },
  promoGridInfo: { flexDirection: 'row', marginTop: 8 },
  promoHighlight: { fontSize: 12, fontWeight: 'bold', color: '#757575' },

  // GALLERY / PHOTOS STYLES
  galleryFilterRow: { flexDirection: 'row', alignItems: 'center', padding: 15 },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF7F00',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 10,
  },
  sortBtnText: { color: '#FF7F00', fontSize: 13 },
  galleryChip: {
    paddingHorizontal: 18,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#eee',
    marginRight: 8,
  },
  activeGalleryChip: { backgroundColor: '#FF7F00', borderColor: '#FF7F00' },
  galleryChipText: { color: '#444', fontSize: 13 },
  activeGalleryChipText: { color: '#fff' },
  photoIconTabs: {
    flexDirection: 'row',
    backgroundColor: '#F5F5F5',
    marginBottom: 10,
  },
  photoIconBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  photoGridItem: { width: PHOTO_GRID_WIDTH, padding: 4 },
  photoThumb: { width: '100%', height: PHOTO_GRID_WIDTH, borderRadius: 8 },
  galleryListItem: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 20,
  },
  galleryThumb: { width: 130, height: 85, borderRadius: 10 },
  galleryInfo: { flex: 1, paddingHorizontal: 12 },
  galleryTitle: { fontSize: 14, fontWeight: '600' },
  galleryMeta: { fontSize: 11, color: '#757575' },

  // VIDEO LIST STYLES
  fullVideoItem: { paddingHorizontal: 16, marginBottom: 20 },
  fullThumb: { width: '100%', height: 200, borderRadius: 12 },
  fullVideoInfo: { flexDirection: 'row', marginTop: 12 },
  channelAvatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eee',
    marginRight: 12,
  },
  fullVideoTitle: { fontSize: 15, fontWeight: '600' },
  fullVideoMeta: { fontSize: 12, color: '#757575' },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  durationText: { color: '#fff', fontSize: 10 },
  aboutContainer: { padding: 20 },
  aboutTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  aboutText: { fontSize: 14, color: '#444' },

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
});
