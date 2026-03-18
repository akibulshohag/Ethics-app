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

const ROWS = [
  { key: 'playlist', label: 'Save to Playlist', icon: 'playlist-plus' },
  { key: 'watchLater', label: 'Save to Watch Later', icon: 'clock-outline' },
  { key: 'download', label: 'Download Video', icon: 'download-outline' },
  { key: 'share', label: 'Share', icon: 'share-variant-outline' },
  { key: 'notInterested', label: 'Not Interested', icon: 'close-circle-outline' },
  { key: 'report', label: 'Report', icon: 'alert-circle-outline', accent: true },
];

const HomeMoreOptionModal = ({
  visible,
  onClose,
  onPlaylist,
  onWatchLater,
  onDownload,
  onShare,
  onNotInterested,
  onReport,
}) => {
  const run = key => {
    if (key === 'report') {
      onReport?.();
      onClose?.();
      return;
    }
    onClose?.();
    const map = {
      playlist: onPlaylist,
      watchLater: onWatchLater,
      download: onDownload,
      share: onShare,
      notInterested: onNotInterested,
    };
    setTimeout(() => map[key]?.(), 0);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.sheet}>
              <View style={styles.handle} />
              <Text style={styles.title}>More Option</Text>
              <View style={styles.divider} />
              {ROWS.map(row => (
                <TouchableOpacity
                  key={row.key}
                  style={styles.row}
                  onPress={() => run(row.key)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={row.icon}
                    size={26}
                    color={row.accent ? '#F5A623' : '#212121'}
                  />
                  <Text
                    style={[
                      styles.rowText,
                      row.accent && styles.rowTextAccent,
                    ]}
                  >
                    {row.label}
                  </Text>
                </TouchableOpacity>
              ))}
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
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#e0e0e0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 14,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e8e8e8',
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 16,
  },
  rowText: {
    fontSize: 16,
    color: '#212121',
    fontWeight: '500',
  },
  rowTextAccent: {
    color: '#F5A623',
    fontWeight: '600',
  },
});

export default HomeMoreOptionModal;
