import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { createThumbnail } from 'react-native-create-thumbnail';

const FRAME_COUNT = 6;

const normalizeUri = uri => String(uri || '').trim();

const buildTimestamps = durationSec => {
  const duration = Number(durationSec || 0);
  if (!Number.isFinite(duration) || duration <= 0) {
    return [600, 1200, 1800, 2400, 3000, 3600];
  }
  const safeDurationMs = Math.max(2000, Math.floor(duration * 1000));
  const step = Math.floor(safeDurationMs / (FRAME_COUNT + 1));
  return Array.from({ length: FRAME_COUNT }, (_, i) => (i + 1) * step);
};

const VideoCoverPickerModal = ({
  visible,
  onClose,
  videoUri,
  durationSec,
  onSelect,
  title = 'Select cover from video',
}) => {
  const [loading, setLoading] = useState(false);
  const [frames, setFrames] = useState([]);

  const timestamps = useMemo(
    () => buildTimestamps(durationSec),
    [durationSec, videoUri],
  );

  useEffect(() => {
    if (!visible) return;
    const uri = normalizeUri(videoUri);
    if (!uri) {
      setFrames([]);
      return;
    }
    let cancelled = false;

    const generate = async () => {
      setLoading(true);
      setFrames([]);
      try {
        const reqs = timestamps.map((ts, i) =>
          createThumbnail({
            url: uri,
            timeStamp: ts,
            format: 'jpeg',
            cacheName: `cover_${Date.now()}_${i}`,
            maxWidth: 540,
            maxHeight: 960,
          })
            .then(shot =>
              shot?.path
                ? {
                    id: `${ts}-${i}`,
                    uri: shot.path,
                    timeStamp: ts,
                    type: 'image/jpeg',
                    fileName: `cover_${i + 1}.jpg`,
                  }
                : null,
            )
            .catch(() => null),
        );
        const generated = (await Promise.all(reqs)).filter(Boolean);
        if (!cancelled) {
          setFrames(generated);
          if (generated.length === 0) {
            Alert.alert(
              'Cover selection unavailable',
              'Could not generate preview frames from this video.',
            );
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    generate();
    return () => {
      cancelled = true;
    };
  }, [visible, videoUri, timestamps]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <Ionicons name="close" size={24} color="#111" />
            </TouchableOpacity>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.headerBtn} />
          </View>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#FF7F0B" />
              <Text style={styles.loadingText}>Preparing cover frames...</Text>
            </View>
          ) : (
            <FlatList
              data={frames}
              keyExtractor={item => item.id}
              numColumns={2}
              contentContainerStyle={styles.grid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.85}
                  style={styles.card}
                  onPress={() => {
                    onSelect?.(item);
                    onClose?.();
                  }}
                >
                  <Image source={{ uri: item.uri }} style={styles.thumb} />
                  <Text style={styles.timeText}>
                    {(item.timeStamp / 1000).toFixed(1)}s
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Text style={styles.emptyText}>No frames available</Text>
                </View>
              }
            />
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerBtn: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111',
  },
  loadingWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  loadingText: {
    color: '#555',
    fontSize: 13,
  },
  grid: {
    padding: 12,
  },
  card: {
    flex: 1,
    margin: 6,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#F7F7F7',
  },
  thumb: {
    width: '100%',
    aspectRatio: 1.35,
    resizeMode: 'cover',
  },
  timeText: {
    fontSize: 11,
    color: '#555',
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontWeight: '600',
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    color: '#666',
    fontSize: 14,
  },
});

export default VideoCoverPickerModal;
