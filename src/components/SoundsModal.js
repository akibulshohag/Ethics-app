import React, {useState, useEffect, useMemo, useRef} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Image,
  TextInput,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';
import {shortsService} from '../services/shortsService';

const MIXKIT_PREVIEW = 'https://assets.mixkit.co/music/preview';

const LOCAL_SOUNDS = [
  { id: '1', title: 'Tech House Vibes', artist: 'Mixkit', duration: '01:00', usage: 'Trending', category: 'upbeat', premium: false, image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80', previewUrl: `${MIXKIT_PREVIEW}/mixkit-tech-house-vibes-130.mp3`, soundUrl: `${MIXKIT_PREVIEW}/mixkit-tech-house-vibes-130.mp3` },
  { id: '2', title: 'Driving Ambient', artist: 'Mixkit', duration: '00:40', usage: 'Popular', category: 'chill', premium: false, image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80', previewUrl: `${MIXKIT_PREVIEW}/mixkit-driving-ambient-138.mp3`, soundUrl: `${MIXKIT_PREVIEW}/mixkit-driving-ambient-138.mp3` },
  { id: '3', title: 'Happy Rock', artist: 'Mixkit', duration: '01:30', usage: '21K', category: 'upbeat', premium: false, image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=500&q=80', previewUrl: `${MIXKIT_PREVIEW}/mixkit-happy-rock-615.mp3`, soundUrl: `${MIXKIT_PREVIEW}/mixkit-happy-rock-615.mp3` },
  { id: '4', title: 'Sweet Waiting', artist: 'Mixkit', duration: '00:50', usage: '32K', category: 'food', premium: false, image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&q=80', previewUrl: `${MIXKIT_PREVIEW}/mixkit-sweet-waiting-831.mp3`, soundUrl: `${MIXKIT_PREVIEW}/mixkit-sweet-waiting-831.mp3` },
  { id: '5', title: 'Motivated', artist: 'Mixkit', duration: '01:00', usage: '92K', category: 'upbeat', premium: true, image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=500&q=80', previewUrl: `${MIXKIT_PREVIEW}/mixkit-motivated-641.mp3`, soundUrl: `${MIXKIT_PREVIEW}/mixkit-motivated-641.mp3` },
  { id: '6', title: 'Just Chill', artist: 'Mixkit', duration: '00:45', usage: '38K', category: 'chill', premium: false, image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80', previewUrl: `${MIXKIT_PREVIEW}/mixkit-just-chill-16.mp3`, soundUrl: `${MIXKIT_PREVIEW}/mixkit-just-chill-16.mp3` },
  { id: '7', title: 'Slow Trail', artist: 'Mixkit', duration: '01:00', usage: '87K', category: 'chill', premium: false, image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&q=80', previewUrl: `${MIXKIT_PREVIEW}/mixkit-slow-trail-701.mp3`, soundUrl: `${MIXKIT_PREVIEW}/mixkit-slow-trail-701.mp3` },
  { id: 'p1', title: 'Kitchen Groove', artist: 'Eatwaze Premium', duration: '01:10', usage: 'Premium', category: 'food', premium: true, image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&q=80', previewUrl: `${MIXKIT_PREVIEW}/mixkit-tech-house-vibes-130.mp3`, soundUrl: `${MIXKIT_PREVIEW}/mixkit-tech-house-vibes-130.mp3` },
  { id: 'p2', title: 'Spice Market', artist: 'Eatwaze Premium', duration: '00:55', usage: 'Premium', category: 'food', premium: true, image: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80', previewUrl: `${MIXKIT_PREVIEW}/mixkit-driving-ambient-138.mp3`, soundUrl: `${MIXKIT_PREVIEW}/mixkit-driving-ambient-138.mp3` },
  { id: 'p3', title: 'Late Night Bites', artist: 'Eatwaze Premium', duration: '01:20', usage: 'Premium', category: 'chill', premium: true, image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&q=80', previewUrl: `${MIXKIT_PREVIEW}/mixkit-just-chill-16.mp3`, soundUrl: `${MIXKIT_PREVIEW}/mixkit-just-chill-16.mp3` },
  { id: 'p4', title: 'Street Food Beat', artist: 'Eatwaze Premium', duration: '00:48', usage: 'Premium', category: 'upbeat', premium: true, image: 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=500&q=80', previewUrl: `${MIXKIT_PREVIEW}/mixkit-happy-rock-615.mp3`, soundUrl: `${MIXKIT_PREVIEW}/mixkit-happy-rock-615.mp3` },
  { id: 'p5', title: 'Dessert Glow', artist: 'Eatwaze Premium', duration: '01:05', usage: 'Premium', category: 'food', premium: true, image: 'https://images.unsplash.com/photo-1488477183347-2e0e4ebbc22c?w=500&q=80', previewUrl: `${MIXKIT_PREVIEW}/mixkit-sweet-waiting-831.mp3`, soundUrl: `${MIXKIT_PREVIEW}/mixkit-sweet-waiting-831.mp3` },
];

const TABS = ['Discover', 'Premium', 'Food', 'Favorites'];

const mapApiSound = row => {
  const url = String(row?.soundUrl || row?.previewUrl || row?.url || '').trim();
  if (!url) return null;
  return {
    id: String(row.id || url),
    title: String(row.title || 'Untitled'),
    artist: String(row.artist || 'Eatwaze'),
    duration: row.duration
      ? `${String(Math.floor(Number(row.duration) / 60)).padStart(2, '0')}:${String(
          Math.floor(Number(row.duration) % 60),
        ).padStart(2, '0')}`
      : '--:--',
    usage: row.isTrending ? 'Trending' : `${row.usageCount || 0}`,
    category: row.isTrending ? 'upbeat' : 'discover',
    premium: Boolean(row.isTrending),
    image:
      row.coverUrl ||
      'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80',
    previewUrl: url,
    soundUrl: url,
  };
};

const SoundsModal = ({visible, onClose, onSelect, selectedSoundId}) => {
  const [activeTab, setActiveTab] = useState('Discover');
  const [selectedId, setSelectedId] = useState('');
  const [previewId, setPreviewId] = useState(null);
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState(['4', '6', 'p1']);
  const [remote, setRemote] = useState([]);
  const previewRef = useRef(null);

  useEffect(() => {
    if (visible && selectedSoundId) {
      setSelectedId(String(selectedSoundId));
    }
    if (!visible) setPreviewId(null);
  }, [visible, selectedSoundId]);

  useEffect(() => {
    if (!visible) return undefined;
    let cancelled = false;
    shortsService
      .getSounds()
      .then(data => {
        if (cancelled) return;
        const rows = Array.isArray(data?.sounds) ? data.sounds : Array.isArray(data) ? data : [];
        setRemote(rows.map(mapApiSound).filter(Boolean));
      })
      .catch(() => {
        if (!cancelled) setRemote([]);
      });
    return () => {
      cancelled = true;
    };
  }, [visible]);

  const catalog = useMemo(() => {
    const byId = {};
    [...LOCAL_SOUNDS, ...remote].forEach(s => {
      if (s?.id) byId[s.id] = s;
    });
    return Object.values(byId);
  }, [remote]);

  const filteredData = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter(s => {
      if (activeTab === 'Favorites' && !favorites.includes(s.id)) return false;
      if (activeTab === 'Premium' && !s.premium) return false;
      if (activeTab === 'Food' && s.category !== 'food') return false;
      if (!q) return true;
      return (
        String(s.title).toLowerCase().includes(q) ||
        String(s.artist).toLowerCase().includes(q)
      );
    });
  }, [activeTab, catalog, favorites, query]);

  const previewUrl = useMemo(() => {
    const item = catalog.find(s => s.id === previewId);
    return String(item?.previewUrl || item?.soundUrl || '').trim();
  }, [catalog, previewId]);

  const handleUse = item => {
    setSelectedId(item.id);
    setPreviewId(null);
    onSelect({
      ...item,
      soundUrl: item.soundUrl || item.previewUrl,
    });
  };

  const toggleFavorite = id => {
    setFavorites(prev =>
      prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id],
    );
  };

  const renderSoundItem = ({item}) => {
    const isItemSelected = selectedId === item.id;
    const isItemFavorite = favorites.includes(item.id);
    const isPreviewing = previewId === item.id;

    return (
      <View style={styles.soundItem}>
        <TouchableOpacity
          style={styles.thumbnailContainer}
          onPress={() => setPreviewId(isPreviewing ? null : item.id)}
        >
          <Image source={{uri: item.image}} style={styles.thumbnail} />
          <View style={styles.playIconOverlay}>
            <Ionicons name={isPreviewing ? 'pause' : 'play'} size={16} color="white" />
          </View>
          {item.premium ? (
            <View style={styles.premiumBadge}>
              <Ionicons name="diamond" size={10} color="#fff" />
            </View>
          ) : null}
        </TouchableOpacity>
        <View style={styles.soundDetails}>
          <Text style={styles.soundTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.soundArtist} numberOfLines={1}>
            {item.premium ? 'Premium · ' : ''}
            {item.artist}
          </Text>
          <Text style={styles.soundDuration}>{item.duration}</Text>
        </View>
        <View style={styles.soundAction}>
          <Text style={styles.usageText}>{item.usage}</Text>
          <TouchableOpacity style={styles.iconButton} onPress={() => toggleFavorite(item.id)}>
            <Ionicons
              name={isItemFavorite ? 'bookmark' : 'bookmark-outline'}
              size={22}
              color={isItemFavorite ? '#FF8C00' : '#CCC'}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.useBtn, isItemSelected && styles.useBtnOn]}
            onPress={() => handleUse(item)}
          >
            <Text style={[styles.useBtnText, isItemSelected && styles.useBtnTextOn]}>
              {isItemSelected ? 'Using' : 'Use'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={28} color="#1a1a1a" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Sounds</Text>
            <Text style={styles.headerSub}>CapCut-style library</Text>
          </View>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#AAA" />
            <TextInput
              placeholder="Search tracks, artists"
              style={styles.searchInput}
              placeholderTextColor="#AAA"
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
          </View>
        </View>

        <View style={styles.tabsContainer}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={[styles.tab, activeTab === tab ? styles.activeTab : null]}>
              <Text style={[styles.tabText, activeTab === tab ? styles.activeTabText : null]}>
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filteredData}
          renderItem={renderSoundItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No tracks in this list yet.</Text>
          }
        />
        {previewUrl ? (
          <Video
            ref={previewRef}
            source={{uri: previewUrl}}
            audioOnly
            paused={false}
            repeat
            playInBackground={false}
            ignoreSilentSwitch="ignore"
            style={styles.hiddenAudio}
          />
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    height: 60,
  },
  headerButton: {
    padding: 5,
    width: 40,
  },
  titleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  headerSub: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  searchContainer: {
    paddingHorizontal: 15,
    paddingVertical: 10,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 50,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF8C00',
  },
  tabText: {
    fontSize: 14,
    color: '#888',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FF8C00',
  },
  listContainer: {
    paddingVertical: 10,
    paddingBottom: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
  },
  soundItem: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    paddingVertical: 12,
    alignItems: 'center',
  },
  thumbnailContainer: {
    width: 80,
    height: 80,
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  playIconOverlay: {
    position: 'absolute',
    top: '30%',
    left: '30%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'white',
  },
  premiumBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: '#F5A623',
    borderRadius: 8,
    padding: 3,
  },
  soundDetails: {
    flex: 1,
    marginLeft: 15,
  },
  soundTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  soundArtist: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  soundDuration: {
    fontSize: 14,
    color: '#999',
  },
  soundAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  usageText: {
    fontSize: 12,
    color: '#666',
    marginRight: 6,
  },
  iconButton: {
    padding: 5,
  },
  useBtn: {
    marginLeft: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#FFF5E6',
    borderWidth: 1,
    borderColor: '#F5A623',
  },
  useBtnOn: {
    backgroundColor: '#F5A623',
  },
  useBtnText: {
    color: '#F5A623',
    fontSize: 12,
    fontWeight: '800',
  },
  useBtnTextOn: {
    color: '#fff',
  },
  hiddenAudio: {
    width: 1,
    height: 1,
    opacity: 0,
  },
});

export default SoundsModal;
