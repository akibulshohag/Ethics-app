import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  FlatList,
  Image,
  Dimensions,
  TextInput,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const {width, height} = Dimensions.get('window');

const SOUNDS_DATA = [
  { id: '1', title: 'As It Was', artist: 'Harry Styles', duration: '01:00', usage: '65.1M', image: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=500&q=80', isFavorite: false, isSelected: true },
  { id: '2', title: 'Jiggle Jiggle', artist: 'Duke & Jones, Thero...', duration: '00:40', usage: '91.54M', image: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=500&q=80', isFavorite: false, isSelected: false },
  { id: '3', title: 'About Damn Time', artist: 'Lizzo', duration: '01:30', usage: '21.05K', image: 'https://images.unsplash.com/photo-1493225255756-d9584f8606e9?w=500&q=80', isFavorite: false, isSelected: false },
  { id: '4', title: 'Sunroof', artist: 'Nicky Youre, Dazy', duration: '00:50', usage: '32.17K', image: 'https://images.unsplash.com/photo-1514525253361-bee8a487409e?w=500&q=80', isFavorite: true, isSelected: false },
  { id: '5', title: 'Late Night Talking', artist: 'Harry Styles', duration: '01:00', usage: '91.82M', image: 'https://images.unsplash.com/photo-1459749411177-042180ce673c?w=500&q=80', isFavorite: false, isSelected: false },
  { id: '6', title: 'STAY', artist: 'The Kid Laroi, Bieb...', duration: '00:45', usage: '37.97M', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=500&q=80', isFavorite: true, isSelected: false },
  { id: '7', title: 'Heat Waves', artist: 'Glass Animals', duration: '01:00', usage: '86.67K', image: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=500&q=80', isFavorite: false, isSelected: false },
];

const SoundsModal = ({visible, onClose}) => {
  const [activeTab, setActiveTab] = useState('Discover');
  const [selectedId, setSelectedId] = useState('1');
  const [favorites, setFavorites] = useState(['4', '6']);

  const toggleFavorite = (id) => {
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const renderSoundItem = ({item}) => {
    const isItemSelected = selectedId === item.id;
    const isItemFavorite = favorites.includes(item.id);

    return (
      <TouchableOpacity 
        style={styles.soundItem}
        onPress={() => setSelectedId(item.id)}>
        <View style={styles.thumbnailContainer}>
          <Image source={{uri: item.image}} style={styles.thumbnail} />
          <View style={styles.playIconOverlay}>
            <Ionicons name="play" size={16} color="white" />
          </View>
        </View>
        <View style={styles.soundDetails}>
          <Text style={styles.soundTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.soundArtist} numberOfLines={1}>{item.artist}</Text>
          <Text style={styles.soundDuration}>{item.duration}</Text>
        </View>
        <View style={styles.soundAction}>
          <Text style={styles.usageText}>{item.usage}</Text>
          <TouchableOpacity 
            style={styles.iconButton} 
            onPress={() => item.id !== selectedId && toggleFavorite(item.id)}>
            <Ionicons 
              name={isItemSelected ? "checkmark" : (isItemFavorite ? "bookmark" : "bookmark-outline")} 
              size={24} 
              color={isItemSelected ? "#FF8C00" : (isItemFavorite ? "#FF8C00" : "#CCC")} 
            />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const filteredData = activeTab === 'Favorites' 
    ? SOUNDS_DATA.filter(s => favorites.includes(s.id))
    : SOUNDS_DATA;

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
          <TouchableOpacity style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Sounds</Text>
            <Ionicons name="chevron-down" size={18} color="#1a1a1a" style={{marginLeft: 4}} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-horizontal-circle-outline" size={28} color="#1a1a1a" />
          </TouchableOpacity>
        </View>

        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#AAA" />
            <TextInput 
              placeholder="Search" 
              style={styles.searchInput}
              placeholderTextColor="#AAA"
            />
            <TouchableOpacity>
               <Ionicons name="options-outline" size={20} color="#FF8C00" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabsContainer}>
          <TouchableOpacity 
            onPress={() => setActiveTab('Discover')}
            style={[styles.tab, activeTab === 'Discover' ? styles.activeTab : null]}>
            <Text style={[styles.tabText, activeTab === 'Discover' ? styles.activeTabText : null]}>Discover</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('Favorites')}
            style={[styles.tab, activeTab === 'Favorites' ? styles.activeTab : null]}>
            <Text style={[styles.tabText, activeTab === 'Favorites' ? styles.activeTabText : null]}>Favorites</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          data={filteredData}
          renderItem={renderSoundItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
        />
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
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a1a',
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
    paddingVertical: 15,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF8C00',
  },
  tabText: {
    fontSize: 18,
    color: '#888',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FF8C00',
  },
  listContainer: {
    paddingVertical: 10,
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
    fontSize: 14,
    color: '#666',
    marginRight: 10,
  },
  iconButton: {
    padding: 5,
  },
});

export default SoundsModal;
