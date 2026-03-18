import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ORANGE = '#FF8C00';

const OPTIONS = [
  {
    id: 'playlist',
    label: 'Save to Playlist',
    icon: 'playlist-plus',
    highlight: false,
  },
  {
    id: 'watch_later',
    label: 'Save to Watch Later',
    icon: 'clock-outline',
    highlight: false,
  },
  {
    id: 'download',
    label: 'Download Video',
    icon: 'tray-arrow-down',
    highlight: false,
  },
  { id: 'share', label: 'Share', icon: 'send', highlight: false },
  {
    id: 'not_interested',
    label: 'Not Interested',
    icon: 'close-circle-outline',
    highlight: false,
  },
  {
    id: 'report',
    label: 'Report',
    icon: 'alert-circle-outline',
    highlight: true,
  },
];

/**
 * Bottom sheet: More Option (shorts / product shorts).
 */
const ShortsMoreOptionsModal = ({
  visible,
  onClose,
  onSaveToPlaylist,
  onSaveToWatchLater,
  onDownload,
  onShare,
  onNotInterested,
  onReport,
}) => {
  const insets = useSafeAreaInsets();

  const handlePress = item => {
    onClose();
    setTimeout(() => {
      if (item.id === 'playlist' && onSaveToPlaylist) onSaveToPlaylist();
      else if (item.id === 'watch_later' && onSaveToWatchLater)
        onSaveToWatchLater();
      else if (item.id === 'download' && onDownload) onDownload();
      else if (item.id === 'share' && onShare) onShare();
      else if (item.id === 'not_interested' && onNotInterested)
        onNotInterested();
      else if (item.id === 'report' && onReport) onReport();
    }, 280);
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.container,
                { paddingBottom: Math.max(24, insets.bottom + 16) },
              ]}
            >
              <View style={styles.dragHandle} />
              <Text style={styles.headerTitle}>More Option</Text>
              <View style={styles.divider} />
              <View style={styles.optionsContainer}>
                {OPTIONS.map(item => {
                  const color = item.highlight ? ORANGE : '#212121';
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.optionItem}
                      onPress={() => handlePress(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.iconContainer}>
                        <MaterialCommunityIcons
                          name={item.icon}
                          size={26}
                          color={color}
                        />
                      </View>
                      <Text
                        style={[
                          styles.optionText,
                          item.highlight && styles.optionTextHighlight,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
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
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 12,
  },
  divider: {
    height: 1,
    backgroundColor: '#eee',
    marginBottom: 4,
  },
  optionsContainer: {
    paddingHorizontal: 20,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  iconContainer: {
    width: 40,
    alignItems: 'center',
    marginRight: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#212121',
    fontWeight: '500',
  },
  optionTextHighlight: {
    color: ORANGE,
    fontWeight: '600',
  },
});

export default ShortsMoreOptionsModal;
