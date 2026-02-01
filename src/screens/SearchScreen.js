import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { COLORS, SPACING, FONTS } from '../constants/theme';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const RECENT_SEARCHES = ['Food vlog', 'Food vlog Bangladesh', 'Food Challenge', 'Food Education Platform'];
const SUGGESTED_SEARCHES = ['Food vlog', 'Food vlog Bangladesh', 'Food Challenge', 'Best Education Platform'];

const CHANNEL_RESULTS = [
  { id: '1', name: 'Kristo Restaurant', subs: '12.6M', videos: '978', image: 'https://i.pravatar.cc/150?u=1' },
  { id: '2', name: 'Kabab Studio', subs: '12.6M', videos: '978', image: 'https://i.pravatar.cc/150?u=2' },
  { id: '3', name: 'Juice Glary', subs: '12.6M', videos: '978', image: 'https://i.pravatar.cc/150?u=6' },
  { id: '4', name: 'Vegetables Garden', subs: '12.6M', videos: '978', image: 'https://i.pravatar.cc/150?u=4' },
  { id: '5', name: 'Good Health Restora', subs: '12.6M', videos: '978', image: 'https://i.pravatar.cc/150?u=5' },
];

const SearchScreen = ({ onBack }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [isFilterApplied, setIsFilterApplied] = useState(false);

  const isNotFound = searchQuery.toLowerCase() === 'abc';

  const handleApplyFilter = () => {
    setShowFilter(false);
    setIsFilterApplied(true);
  };

  const FilterRow = ({ label, value }) => (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label} :</Text>
      <TouchableOpacity style={styles.filterDropdown}>
        <Text style={styles.filterValueText}>{value}</Text>
        <Icon name="chevron-down" size={24} color="#333" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <Modal visible={showFilter} animationType="slide" transparent={true} onRequestClose={() => setShowFilter(false)}>
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloser} onPress={() => setShowFilter(false)} />
          <View style={styles.filterSheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Search Filter</Text>
            <View style={styles.divider} />
            <ScrollView contentContainerStyle={styles.filterContent}>
              <FilterRow label="Sort by" value="Relevance" />
              <FilterRow label="Type" value="Channel" />
              <FilterRow label="Upload Date" value="Anytime" />
              <FilterRow label="Duration" value="5-20 minutes" />
              <Text style={styles.moreFeaturesTitle}>More Features</Text>
              <View style={styles.featuresGrid}>
                {['Live', '4K', '3D', 'HD', 'HDR', 'Subtitles/CC', '360°'].map((feature) => (
                  <TouchableOpacity key={feature} style={[styles.featureTag, feature === 'Live' && styles.featureTagActive]}>
                    <Text style={[styles.featureText, feature === 'Live' && styles.featureTextActive]}>{feature}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <View style={styles.sheetFooter}>
              <TouchableOpacity style={styles.resetButton} onPress={() => {setIsFilterApplied(false); setShowFilter(false);}}>
                <Text style={styles.resetButtonText}>Reset</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyButton} onPress={handleApplyFilter}>
                <Text style={styles.applyButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={isListening} animationType="fade" transparent={false}>
         <View style={styles.voiceContainer}>
            <TouchableOpacity style={styles.closeVoice} onPress={() => setIsListening(false)}>
               <Icon name="close" size={30} color="#000" /><Text style={styles.listeningText}>Listening...</Text>
            </TouchableOpacity>
            <View style={styles.voiceContent}>
               <Text style={styles.saySomethingText}>Say Something to Search...</Text>
               <TouchableOpacity style={styles.largeMicButton} onPress={() => setIsListening(false)}>
                  <Icon name="microphone" size={50} color={COLORS.primaryOrange} />
               </TouchableOpacity>
            </View>
         </View>
      </Modal>

      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}><Icon name="arrow-left" size={28} color="#333" /></TouchableOpacity>
        <View style={styles.searchBarWrapper}>
          <Icon name="magnify" size={24} color={COLORS.primaryOrange} style={styles.searchIcon} />
          <TextInput 
            placeholder="Food" style={styles.input} placeholderTextColor="#666"
            value={searchQuery} onChangeText={(t) => {setSearchQuery(t); setIsFilterApplied(false);}} autoFocus
          />
          <TouchableOpacity onPress={() => setShowFilter(true)}>
             <Icon name="tune-variant" size={20} color={COLORS.primaryOrange} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.micButton} onPress={() => setIsListening(true)}>
          <Icon name="microphone" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {isNotFound ? (
        <View style={styles.noDataContainer}>
          <Image source={require('../assets/img/no-data.png')} style={styles.noDataImage} resizeMode="contain" />
          <Text style={styles.noDataTitle}>Not Found</Text>
          <Text style={styles.noDataSubTitle}>We're sorry, the video could not be found.</Text>
        </View>
      ) : isFilterApplied ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.resultsContent}>
          {CHANNEL_RESULTS.map((item) => (
            <View key={item.id} style={styles.channelCard}>
              <Image source={{ uri: item.image }} style={styles.channelAvatar} />
              <View style={styles.channelInfo}>
                <View style={styles.channelTitleRow}>
                  <Text style={styles.channelName}>{item.name}</Text>
                  <Icon name="check-circle" size={16} color="#4A90E2" style={{ marginLeft: 5 }} />
                </View>
                <Text style={styles.channelStats}>{item.subs} subscribers  •  {item.videos} videos</Text>
                <View style={styles.channelActionRow}>
                  <TouchableOpacity style={styles.subscribedBtn}>
                    <Text style={styles.subscribedText}>Subscribed</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.viewChannelBtn}>
                    <Text style={styles.viewChannelText}>View Channel</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent</Text>
            <TouchableOpacity><Text style={styles.clearText}>Clear All</Text></TouchableOpacity>
          </View>
          {RECENT_SEARCHES.map((item, index) => (
            <View key={`recent-${index}`} style={styles.searchRow}>
              <Text style={styles.searchText}>{item}</Text>
              <TouchableOpacity><Icon name="close" size={20} color="#999" /></TouchableOpacity>
            </View>
          ))}
          <Text style={[styles.sectionTitle, { marginTop: 30, marginBottom: 20 }]}>Suggested Searches</Text>
          {SUGGESTED_SEARCHES.map((item, index) => (
            <View key={`suggest-${index}`} style={styles.searchRow}>
              <Text style={styles.searchText}>{item}</Text>
              <TouchableOpacity><Icon name="circle-outline" size={22} color="#999" /></TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', paddingTop: SPACING.xxl },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, marginBottom: 10 },
  searchBarWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F0', borderRadius: 30, borderWidth: 1, borderColor: '#FFD7C2', paddingHorizontal: 15, height: 45, marginHorizontal: 10 },
  searchIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: '#333' },
  micButton: { backgroundColor: '#F97507', width: 45, height: 45, borderRadius: 22.5, justifyContent: 'center', alignItems: 'center' },
  content: { paddingHorizontal: SPACING.lg, paddingTop: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  clearText: { color: COLORS.primaryOrange, fontWeight: '600', fontSize: 16 },
  searchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 15 },
  searchText: { fontSize: 16, color: '#666' },
  
  resultsContent: { paddingHorizontal: SPACING.lg, paddingTop: 10 },
  channelCard: { flexDirection: 'row', marginBottom: 25, alignItems: 'flex-start' },
  channelAvatar: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#f0f0f0' },
  channelInfo: { flex: 1, marginLeft: 15 },
  channelTitleRow: { flexDirection: 'row', alignItems: 'center' },
  channelName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  channelStats: { fontSize: 14, color: '#777', marginVertical: 4 },
  channelActionRow: { flexDirection: 'row', marginTop: 8, gap: 10 },
  subscribedBtn: { backgroundColor: '#222', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  subscribedText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  viewChannelBtn: { borderWidth: 1, borderColor: COLORS.primaryOrange, paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  viewChannelText: { color: COLORS.primaryOrange, fontWeight: 'bold', fontSize: 13 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCloser: { flex: 1 },
  filterSheet: { backgroundColor: '#fff', borderTopLeftRadius: 30, borderTopRightRadius: 30, paddingBottom: 30, maxHeight: SCREEN_HEIGHT * 0.8 },
  sheetHandle: { width: 50, height: 5, backgroundColor: '#E0E0E0', borderRadius: 5, alignSelf: 'center', marginVertical: 15 },
  sheetTitle: { fontSize: 22, fontWeight: 'bold', textAlign: 'center', color: '#000', marginBottom: 15 },
  divider: { height: 1, backgroundColor: '#F0F0F0', width: '100%' },
  filterContent: { padding: 20 },
  filterRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  filterLabel: { fontSize: 18, color: '#333', fontWeight: '500' },
  filterDropdown: { flexDirection: 'row', alignItems: 'center' },
  filterValueText: { fontSize: 18, fontWeight: 'bold', color: '#333', marginRight: 5 },
  moreFeaturesTitle: { fontSize: 18, fontWeight: 'bold', color: '#000', marginTop: 10, marginBottom: 15 },
  featuresGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  featureTag: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 25, borderWidth: 1, borderColor: COLORS.primaryOrange },
  featureTagActive: { backgroundColor: COLORS.primaryOrange },
  featureText: { color: COLORS.primaryOrange, fontWeight: '600' },
  featureTextActive: { color: '#fff' },
  sheetFooter: { flexDirection: 'row', paddingHorizontal: 20, gap: 15, marginTop: 20 },
  resetButton: { flex: 1, height: 55, backgroundColor: '#FFF5F0', borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  resetButtonText: { color: COLORS.primaryOrange, fontSize: 18, fontWeight: 'bold' },
  applyButton: { flex: 1, height: 55, backgroundColor: COLORS.primaryOrange, borderRadius: 30, justifyContent: 'center', alignItems: 'center' },
  applyButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },

  noDataContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  noDataImage: { width: 250, height: 250, marginBottom: 20 },
  noDataTitle: { fontSize: 24, fontWeight: 'bold', color: '#000', marginBottom: 10 },
  noDataSubTitle: { fontSize: 14, color: '#666', textAlign: 'center', lineHeight: 20 },
  voiceContainer: { flex: 1, backgroundColor: '#fff', paddingTop: SPACING.xxl },
  closeVoice: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg },
  listeningText: { fontSize: 22, fontWeight: '600', marginLeft: 15, color: '#000' },
  voiceContent: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingBottom: 100 },
  saySomethingText: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 60 },
  largeMicButton: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#FFF5F0', justifyContent: 'center', alignItems: 'center' }
});

export default SearchScreen;