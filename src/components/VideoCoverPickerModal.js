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
import {
  generateVideoCoverFrames,
  MAX_COVER_FRAMES,
  MIN_COVER_FRAMES,
  resolveCoverFrameCount,
} from '../utils/videoThumbnail';

const normalizeUri = uri => String(uri || '').trim();

const VideoCoverPickerModal = ({
  visible,
  onClose,
  videoUri,
  durationSec,
  onSelect,
  title = 'Select cover from video',
  initialFrameCount,
  maxFrameCount = MAX_COVER_FRAMES,
}) => {
  const [loading, setLoading] = useState(false);
  const [frames, setFrames] = useState([]);
  const [showCount, setShowCount] = useState(MIN_COVER_FRAMES);

  const recommendedCount = useMemo(
    () => resolveCoverFrameCount(durationSec, initialFrameCount),
    [durationSec, initialFrameCount],
  );

  const canShowMore = useMemo(() => {
    const cap = Math.min(MAX_COVER_FRAMES, Math.max(MIN_COVER_FRAMES, maxFrameCount));
    return cap > MIN_COVER_FRAMES && showCount < cap;
  }, [maxFrameCount, showCount]);

  useEffect(() => {
    if (!visible) return;
    setShowCount(Math.min(recommendedCount, maxFrameCount));
  }, [visible, recommendedCount, maxFrameCount, videoUri]);

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
        const generated = await generateVideoCoverFrames(uri, {
          durationSec,
          frameCount: showCount,
        });
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
  }, [visible, videoUri, durationSec, showCount]);

  const handleShowMore = () => {
    setShowCount(prev =>
      Math.min(MAX_COVER_FRAMES, Math.max(MIN_COVER_FRAMES, maxFrameCount), prev + 6),
    );
  };

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

          <Text style={styles.subtitle}>
            {loading
              ? 'Generating frames from your video…'
              : `${frames.length} suggested frame${frames.length === 1 ? '' : 's'} · tap to select`}
          </Text>

          {loading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator size="large" color="#FF7F0B" />
              <Text style={styles.loadingText}>Preparing cover frames...</Text>
            </View>
          ) : (
            <>
              <FlatList
                data={frames}
                keyExtractor={item => item.id}
                numColumns={2}
                columnWrapperStyle={styles.columnWrap}
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
                    <View style={styles.timePill}>
                      <Text style={styles.timeText}>
                        {(item.timeStamp / 1000).toFixed(1)}s
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Text style={styles.emptyText}>No frames available</Text>
                  </View>
                }
              />
              {canShowMore ? (
                <TouchableOpacity style={styles.moreBtn} onPress={handleShowMore}>
                  <Ionicons name="add-circle-outline" size={18} color="#FF7F0B" />
                  <Text style={styles.moreBtnText}>
                    Show {Math.min(6, MAX_COVER_FRAMES - showCount)} more suggestions
                    ({Math.min(MAX_COVER_FRAMES, showCount + 6)} total)
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
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
    maxHeight: '82%',
    minHeight: '52%',
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
  subtitle: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 4,
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
    paddingHorizontal: 10,
    paddingBottom: 8,
  },
  columnWrap: {
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F7F7F7',
  },
  thumb: {
    width: '100%',
    aspectRatio: 0.72,
    resizeMode: 'cover',
  },
  timePill: {
    alignSelf: 'flex-start',
    marginTop: 6,
    marginLeft: 8,
    marginBottom: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: '#EFEFEF',
  },
  timeText: {
    fontSize: 11,
    color: '#444',
    fontWeight: '600',
  },
  moreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#FFF4EA',
    borderWidth: 1,
    borderColor: '#FFD6AD',
  },
  moreBtnText: {
    color: '#FF7F0B',
    fontWeight: '600',
    fontSize: 13,
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
