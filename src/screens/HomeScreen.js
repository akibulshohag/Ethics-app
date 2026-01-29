import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const { width } = Dimensions.get('window');

// Mock Data
const CONTINUE_WATCHING_DATA = [
  { id: 'c1', image: 'https://picsum.photos/id/237/400/225' },
  { id: 'c2', image: 'https://picsum.photos/id/238/400/225' },
];

const SHORTS_DATA = [
  { id: 's1', title: 'Beauty Makeup Tutorials Before You Go Out...', views: '3.4M views', image: 'https://picsum.photos/400/700' },
  { id: 's2', title: 'Be Beautiful with Make-up Made from Natural...', views: '2.8M views', image: 'https://picsum.photos/401/701' },
];

const REPORT_REASONS = [
  'Sexual Content',
  'Violent or Repulsive Content',
  'Hateful or Abusive Content',
  'Harmful or Dangerous Acts',
  'Spam or Misleading',
  'Child Abuse',
  'Others',
];

const MAIN_FEED = [
  { type: 'SHORTS', id: 'header-shorts' },
  { 
    type: 'VIDEO', 
    id: 'v1', 
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix', 
    author: 'BBC Earth', views: '9.5M views', time: '5 months ago', duration: '15:27', 
    thumbnail: 'https://picsum.photos/800/450' 
  },
  { 
    type: 'VIDEO', 
    id: 'v2', 
    title: 'Classic Cheeseburger - Homemade Professional Style', 
    author: 'Food Network', views: '2.1M views', time: '2 months ago', duration: '10:45', 
    thumbnail: 'https://picsum.photos/801/451' 
  },
  { type: 'CONTINUE', id: 'continue-watching' },
  { 
    type: 'VIDEO', 
    id: 'v3', 
    title: 'Bang Bang Chicken Skewers - Quick and Easy Recipe! eatix', 
    author: 'BBC Earth', views: '9.5M views', time: '5 months ago', duration: '15:27', 
    thumbnail: 'https://picsum.photos/802/452' 
  },
  { type: 'SHORTS', id: 'footer-shorts' },
];

const HomeScreen = () => {
  const [optionsVisible, setOptionsVisible] = useState(false);
  const [reportVisible, setReportVisible] = useState(false);
  const [selectedReason, setSelectedReason] = useState('Sexual Content');

  const SectionHeader = ({ icon, title }) => (
    <View style={styles.feedHeaderRow}>
      <Icon name={icon} size={24} color="#FF6B00" />
      <Text style={styles.feedHeaderText}>{title}</Text>
    </View>
  );

  // Switching from More Options to Report
  const openReportModal = () => {
    setOptionsVisible(false);
    // Use a tiny timeout to ensure the first modal is gone before opening the second
    // This prevents UI glitches on some Android versions
    setTimeout(() => {
        setReportVisible(true);
    }, 100);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={MAIN_FEED}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          if (item.type === 'SHORTS') return (
            <View style={styles.whiteSection}>
              <SectionHeader icon="video-outline" title="Shorts" />
              <FlatList
                horizontal
                data={SHORTS_DATA}
                renderItem={({ item: short }) => (
                  <View style={styles.shortCard}>
                    <Image source={{ uri: short.image }} style={styles.shortImage} />
                    <View style={styles.shortOverlay}>
                      <Text style={styles.shortTitle} numberOfLines={2}>{short.title}</Text>
                      <Text style={styles.shortViews}>{short.views}</Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.moreIconShort} 
                      onPress={() => setOptionsVisible(true)}
                    >
                       <Icon name="dots-vertical" size={18} color="#fff" />
                    </TouchableOpacity>
                  </View>
                )}
                keyExtractor={(s) => s.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 20 }}
              />
            </View>
          );
          if (item.type === 'CONTINUE') return (
            <View style={styles.continueSection}>
              <SectionHeader icon="video-vintage" title="Continue watching" />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                {CONTINUE_WATCHING_DATA.map((c) => (
                  <View key={c.id} style={styles.continueCard}>
                    <Image source={{ uri: c.image }} style={styles.continueImage} />
                    <View style={styles.playButtonSmall}>
                       <Icon name="play" size={16} color="#fff" />
                    </View>
                    <View style={styles.progressBar} />
                  </View>
                ))}
              </ScrollView>
            </View>
          );
          if (item.type === 'VIDEO') return (
            <View style={styles.videoCard}>
              <View style={styles.thumbnailWrapper}>
                <Image source={{ uri: item.thumbnail }} style={styles.videoThumbnail} />
                <View style={styles.durationBadge}><Text style={styles.durationText}>{item.duration}</Text></View>
              </View>
              <View style={styles.videoDetails}>
                <View style={styles.avatar} />
                <View style={styles.videoInfo}>
                  <Text style={styles.videoTitle}>{item.title}</Text>
                  <Text style={styles.videoSubTitle}>{item.author} • {item.views} • {item.time}</Text>
                </View>
                <TouchableOpacity onPress={() => setOptionsVisible(true)}>
                    <Icon name="dots-vertical" size={20} color="#000" />
                </TouchableOpacity>
              </View>
            </View>
          );
          return null;
        }}
        showsVerticalScrollIndicator={false}
      />

      {/* --- POPUP 1: MORE OPTIONS --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={optionsVisible}
        onRequestClose={() => setOptionsVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setOptionsVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>More Option</Text>
            <View style={styles.divider} />
            <TouchableOpacity style={styles.optionRow}><Icon name="playlist-plus" size={24} color="#333" /><Text style={styles.optionText}>Save to Playlist</Text></TouchableOpacity>
            <TouchableOpacity style={styles.optionRow}><Icon name="clock-outline" size={24} color="#333" /><Text style={styles.optionText}>Save to Watch Later</Text></TouchableOpacity>
            <TouchableOpacity style={styles.optionRow}><Icon name="download-outline" size={24} color="#333" /><Text style={styles.optionText}>Download Video</Text></TouchableOpacity>
            <TouchableOpacity style={styles.optionRow}><Icon name="share-variant-outline" size={24} color="#333" /><Text style={styles.optionText}>Share</Text></TouchableOpacity>
            <TouchableOpacity style={styles.optionRow}><Icon name="close-circle-outline" size={24} color="#333" /><Text style={styles.optionText}>Not Interested</Text></TouchableOpacity>
            <TouchableOpacity style={styles.optionRow} onPress={openReportModal}>
              <Icon name="alert-circle-outline" size={24} color="#FF6B00" />
              <Text style={[styles.optionText, { color: '#FF6B00' }]}>Report</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* --- POPUP 2: DETAILED REPORT (Fixed Selection) --- */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={reportVisible}
        onRequestClose={() => setReportVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setReportVisible(false)}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Report</Text>
            <View style={styles.divider} />
            
            {REPORT_REASONS.map((reason) => (
              <TouchableOpacity 
                key={reason} 
                activeOpacity={0.8}
                style={styles.reportOptionRow}
                onPress={() => setSelectedReason(reason)} // Pure state update, no modal close
              >
                <Icon 
                  name={selectedReason === reason ? "radiobox-marked" : "radiobox-blank"} 
                  size={24} 
                  color="#FF6B00" 
                />
                <Text style={styles.reportOptionText}>{reason}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.reportActionRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={() => setReportVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.submitButton} onPress={() => setReportVisible(false)}>
                <Text style={styles.submitButtonText}>Report</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  feedHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginVertical: 12 },
  feedHeaderText: { fontSize: 18, fontWeight: 'bold', marginLeft: 8, color: '#000' },
  whiteSection: { backgroundColor: '#fff' },
  shortCard: { width: width * 0.45, height: 280, borderRadius: 15, overflow: 'hidden', marginHorizontal: 5 },
  shortImage: { width: '100%', height: '100%' },
  shortOverlay: { position: 'absolute', bottom: 0, padding: 10, width: '100%', backgroundColor: 'rgba(0,0,0,0.3)' },
  shortTitle: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  shortViews: { color: '#fff', fontSize: 11, marginTop: 4 },
  moreIconShort: { position: 'absolute', top: 10, right: 5, padding: 5 },
  continueSection: { backgroundColor: '#fff', paddingVertical: 10 },
  continueCard: { width: 170, height: 100, marginRight: 12, borderRadius: 12, overflow: 'hidden', position: 'relative' },
  continueImage: { width: '100%', height: '100%' },
  playButtonSmall: { position: 'absolute', bottom: 8, left: 8, backgroundColor: '#FF6B00', borderRadius: 4, padding: 2 },
  progressBar: { position: 'absolute', bottom: 0, left: 0, height: 3, width: '70%', backgroundColor: '#FF6B00' },
  videoCard: { marginBottom: 15 },
  thumbnailWrapper: { width: '100%', height: 220 },
  videoThumbnail: { width: '100%', height: '100%' },
  durationBadge: { position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.8)', paddingHorizontal: 5, borderRadius: 4 },
  durationText: { color: '#fff', fontSize: 12 },
  videoDetails: { flexDirection: 'row', padding: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#F5E6E6' },
  videoInfo: { flex: 1, marginHorizontal: 12 },
  videoTitle: { fontSize: 15, fontWeight: '500', color: '#000', lineHeight: 20 },
  videoSubTitle: { fontSize: 12, color: '#606060', marginTop: 2 },
  
  // Modal Common
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 20, paddingBottom: 30, paddingTop: 10 },
  modalHandle: { width: 40, height: 4, backgroundColor: '#ddd', borderRadius: 2, alignSelf: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#000', textAlign: 'center', marginBottom: 15 },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 15 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15 },
  optionText: { fontSize: 16, color: '#333', marginLeft: 15, fontWeight: '500' },

  // Report Styles
  reportOptionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  reportOptionText: { fontSize: 16, color: '#333', marginLeft: 12 },
  reportActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 25 },
  cancelButton: { flex: 1, backgroundColor: '#FFF5F0', paddingVertical: 15, borderRadius: 30, marginRight: 10, alignItems: 'center' },
  cancelButtonText: { color: '#FF6B00', fontWeight: 'bold', fontSize: 16 },
  submitButton: { flex: 1, backgroundColor: '#FF6B00', paddingVertical: 15, borderRadius: 30, marginLeft: 10, alignItems: 'center' },
  submitButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
});