import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  FlatList,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { height } = Dimensions.get('window');

const PLAYLISTS = [
  { id: '1', name: 'Watch Later', isPrivate: true },
  { id: '2', name: 'My Favorite Animal Videos', isPrivate: true },
  { id: '3', name: 'My Favorite Nature Videos', isPrivate: true },
  { id: '4', name: 'My Best Song', isPrivate: true },
  { id: '5', name: 'Most Popular Video Clips', isPrivate: true },
  { id: '6', name: 'Animal Life', isPrivate: true },
];

const SaveModal = ({ visible, onClose }) => {
  const [selectedPlaylists, setSelectedPlaylists] = useState(['2']); // Pre-selecting 'My Favorite Animal Videos' as per image

  const togglePlaylist = (id) => {
    if (selectedPlaylists.includes(id)) {
      setSelectedPlaylists(selectedPlaylists.filter((pid) => pid !== id));
    } else {
      setSelectedPlaylists([...selectedPlaylists, id]);
    }
  };

  const renderItem = ({ item }) => {
    const isSelected = selectedPlaylists.includes(item.id);
    return (
      <TouchableOpacity
        style={styles.playlistItem}
        onPress={() => togglePlaylist(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
          {isSelected && (
            <MaterialCommunityIcons name="check" size={16} color="#fff" />
          )}
        </View>
        <Text style={styles.playlistName}>{item.name}</Text>
        {item.isPrivate && (
          <MaterialCommunityIcons name="lock-outline" size={20} color="#424242" style={styles.lockIcon} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              <View style={styles.dragHandle} />
              
              <View style={styles.header}>
                <Text style={styles.title}>Save Video to ...</Text>
                <TouchableOpacity style={styles.newPlaylistButton}>
                  <MaterialCommunityIcons name="plus" size={16} color="#F97507" />
                  <Text style={styles.newPlaylistText}>New Playlist</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.divider} />

              <FlatList
                data={PLAYLISTS}
                keyExtractor={(item) => item.id}
                renderItem={renderItem}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />

              <View style={styles.divider} />

              <View style={styles.footer}>
                <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={onClose}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 12,
    paddingBottom: 30, // Safe area padding
    maxHeight: height * 0.7,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212121',
  },
  newPlaylistButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F97507',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  newPlaylistText: {
    color: '#F97507',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#f2f2f2',
  },
  listContent: {
    paddingVertical: 10,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#F97507',
    marginRight: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#F97507',
  },
  playlistName: {
    fontSize: 16,
    color: '#212121',
    flex: 1,
    fontWeight: '600',
  },
  lockIcon: {
    marginLeft: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#FFF2E5', // Light orange
    paddingVertical: 14,
    borderRadius: 25,
    marginRight: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#F97507',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#F97507',
    paddingVertical: 14,
    borderRadius: 25,
    marginLeft: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SaveModal;
