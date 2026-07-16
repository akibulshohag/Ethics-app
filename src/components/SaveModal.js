import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSelector } from 'react-redux';
import {
  getSaveMembership,
  setPlaylist,
  listCustomPlaylists,
  setCustomPlaylistItem,
} from '../services/playlistService';

const { height } = Dimensions.get('window');

const BASE_ROWS = [
  { id: 'watch_later', name: 'Watch Later', isPrivate: true },
  { id: 'favorites', name: 'Favorites', isPrivate: true },
];

const SaveModal = ({ visible, onClose, contentType = 'video', contentId }) => {
  const { user: currentUser } = useSelector(state => state.app) || {};
  const [selectedPlaylists, setSelectedPlaylists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customPlaylists, setCustomPlaylists] = useState([]);
  const membershipRef = useRef(null);

  const loadStatus = useCallback(async () => {
    if (!currentUser?.id || !contentId) {
      setSelectedPlaylists([]);
      setCustomPlaylists([]);
      membershipRef.current = null;
      return;
    }
    setLoading(true);
    try {
      const [mem, pls] = await Promise.all([
        getSaveMembership(contentType, contentId),
        listCustomPlaylists(currentUser.id),
      ]);
      membershipRef.current = mem;
      setCustomPlaylists(Array.isArray(pls) ? pls : []);
      const sel = [];
      if (mem.inWatchLater) sel.push('watch_later');
      if (mem.inFavorites) sel.push('favorites');
      (mem.customPlaylistIds || []).forEach(id => {
        if (id && !sel.includes(id)) sel.push(id);
      });
      setSelectedPlaylists(sel);
    } catch (e) {
      setSelectedPlaylists([]);
      setCustomPlaylists([]);
      membershipRef.current = null;
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id, contentType, contentId]);

  useEffect(() => {
    if (visible && contentId) {
      loadStatus();
    }
  }, [visible, contentId, loadStatus]);

  const listData = [
    ...BASE_ROWS,
    ...customPlaylists.map(p => ({
      id: p.id,
      name: p.name,
      isPrivate: true,
      isCustom: true,
    })),
  ];

  const togglePlaylist = id => {
    if (selectedPlaylists.includes(id)) {
      setSelectedPlaylists(selectedPlaylists.filter(pid => pid !== id));
    } else {
      setSelectedPlaylists([...selectedPlaylists, id]);
    }
  };

  const handleSave = async () => {
    if (!currentUser?.id || !contentId) {
      onClose();
      return;
    }
    setSaving(true);
    try {
      const prev = membershipRef.current || {
        inWatchLater: false,
        inFavorites: false,
        customPlaylistIds: [],
      };
      const watchLaterSelected = selectedPlaylists.includes('watch_later');
      const favoritesSelected = selectedPlaylists.includes('favorites');
      const tasks = [];

      if (watchLaterSelected !== !!prev.inWatchLater) {
        tasks.push(
          setPlaylist(
            currentUser.id,
            'watch_later',
            contentType,
            contentId,
            watchLaterSelected,
          ),
        );
      }
      if (favoritesSelected !== !!prev.inFavorites) {
        tasks.push(
          setPlaylist(
            currentUser.id,
            'favorites',
            contentType,
            contentId,
            favoritesSelected,
          ),
        );
      }

      const prevCustom = new Set(prev.customPlaylistIds || []);
      const selectedCustom = new Set(
        selectedPlaylists.filter(
          x => x !== 'watch_later' && x !== 'favorites',
        ),
      );
      for (const pid of prevCustom) {
        if (!selectedCustom.has(pid)) {
          tasks.push(
            setCustomPlaylistItem(pid, contentType, contentId, false),
          );
        }
      }
      for (const pid of selectedCustom) {
        if (!prevCustom.has(pid)) {
          tasks.push(
            setCustomPlaylistItem(pid, contentType, contentId, true),
          );
        }
      }

      await Promise.all(tasks);
      onClose();
    } catch (e) {
      console.error('Save to playlist failed:', e);
    } finally {
      setSaving(false);
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
          <MaterialCommunityIcons
            name="lock-outline"
            size={20}
            color="#424242"
            style={styles.lockIcon}
          />
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
                <Text style={styles.title}>Save to...</Text>
              </View>

              <View style={styles.divider} />

              {loading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#F97507" />
                </View>
              ) : !currentUser?.id ? (
                <View style={styles.loginHint}>
                  <Text style={styles.loginHintText}>Log in to save videos</Text>
                </View>
              ) : (
                <FlatList
                  data={listData}
                  keyExtractor={item => String(item.id)}
                  renderItem={renderItem}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                  ListEmptyComponent={
                    <Text style={styles.hintBelow}>
                      Create playlists from Library → New Playlist
                    </Text>
                  }
                />
              )}

              <View style={styles.divider} />

              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  disabled={saving}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.saveButton, saving && styles.saveButtonDisabled]}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveButtonText}>Save</Text>
                  )}
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
    paddingBottom: 30,
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
  divider: {
    height: 1,
    backgroundColor: '#f2f2f2',
  },
  loadingRow: {
    padding: 24,
    alignItems: 'center',
  },
  loginHint: {
    padding: 24,
    alignItems: 'center',
  },
  loginHintText: {
    fontSize: 16,
    color: '#666',
  },
  hintBelow: {
    padding: 16,
    textAlign: 'center',
    color: '#888',
    fontSize: 14,
  },
  listContent: {
    paddingVertical: 10,
    maxHeight: height * 0.42,
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
    backgroundColor: '#FFF2E5',
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
    justifyContent: 'center',
    minHeight: 48,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SaveModal;
