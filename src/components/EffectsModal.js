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
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const {width, height} = Dimensions.get('window');

const EFFECTS_DATA = [
  { id: '1', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80' },
  { id: '2', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&q=80' },
  { id: '3', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500&q=80' },
  { id: '4', image: 'https://images.unsplash.com/photo-1521119989659-a83eee488004?w=500&q=80' },
  { id: '5', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&q=80' },
  { id: '6', image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&q=80' },
  { id: '7', image: 'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=500&q=80' },
  { id: '8', image: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&q=80' },
  { id: '9', image: 'https://images.unsplash.com/photo-1111111111111?w=500&q=80' }, // Placeholder fallback
  { id: '10', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&q=80' },
  { id: '11', image: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&q=80' },
  { id: '12', image: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500&q=80' },
];

const EffectsModal = ({visible, onClose}) => {
  const [activeTab, setActiveTab] = useState('Trending');

  const renderEffectItem = ({item}) => (
    <TouchableOpacity style={styles.effectItem}>
      <Image source={{uri: item.image}} style={styles.effectImage} />
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              <View style={styles.handle} />
              <View style={styles.header}>
                <Text style={styles.headerText}>Effects</Text>
              </View>
              <View style={styles.divider} />
              <View style={styles.tabsRow}>
                <View style={styles.leftIcons}>
                  <TouchableOpacity style={styles.tabIcon}>
                    <Ionicons name="search" size={24} color="#666" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.tabIcon}>
                    <Ionicons name="bookmark-outline" size={24} color="#666" />
                  </TouchableOpacity>
                </View>
                <View style={styles.textTabs}>
                  <TouchableOpacity 
                    onPress={() => setActiveTab('Trending')}
                    style={[styles.textTab, activeTab === 'Trending' ? styles.activeTab : null]}>
                    <Text style={[styles.tabText, activeTab === 'Trending' ? styles.activeTabText : null]}>Trending</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => setActiveTab('New')}
                    style={[styles.textTab, activeTab === 'New' ? styles.activeTab : null]}>
                    <Text style={[styles.tabText, activeTab === 'New' ? styles.activeTabText : null]}>New</Text>
                  </TouchableOpacity>
                </View>
                <View style={{width: 60}} />
              </View>
              <FlatList
                data={EFFECTS_DATA}
                renderItem={renderEffectItem}
                keyExtractor={item => item.id}
                numColumns={4}
                contentContainerStyle={styles.gridContainer}
                showsVerticalScrollIndicator={false}
                removeClippedSubviews={Platform.OS === 'android'}
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    height: height * 0.65,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
  },
  header: {
    paddingVertical: 15,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  leftIcons: {
    flexDirection: 'row',
    width: 60,
  },
  tabIcon: {
    marginRight: 15,
  },
  textTabs: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  textTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 10,
  },
  activeTab: {
    borderBottomWidth: 3,
    borderBottomColor: '#FF8C00',
  },
  tabText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '600',
  },
  activeTabText: {
    color: '#FF8C00',
  },
  gridContainer: {
    padding: 10,
  },
  effectItem: {
    width: width / 4,
    aspectRatio: 1,
    padding: 5,
  },
  effectImage: {
    flex: 1,
    borderRadius: 15,
    backgroundColor: '#F0F0F0',
  },
});

export default EffectsModal;
