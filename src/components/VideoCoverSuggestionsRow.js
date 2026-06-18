import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
  generateVideoCoverFrames,
  MIN_COVER_FRAMES,
  resolveCoverFrameCount,
} from '../utils/videoThumbnail';

/**
 * Inline row of auto-generated cover suggestions (6 by default).
 * Tap a frame to select; tap "See all" to open the full picker modal.
 */
const VideoCoverSuggestionsRow = ({
  videoUri,
  durationSec,
  selectedUri,
  onSelect,
  onPressSeeAll,
  frameCount,
  compact = false,
}) => {
  const [frames, setFrames] = useState([]);
  const [loading, setLoading] = useState(false);

  const count = resolveCoverFrameCount(durationSec, frameCount ?? MIN_COVER_FRAMES);

  useEffect(() => {
    const uri = String(videoUri || '').trim();
    if (!uri) {
      setFrames([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    generateVideoCoverFrames(uri, { durationSec, frameCount: count })
      .then(generated => {
        if (!cancelled) setFrames(generated);
      })
      .catch(() => {
        if (!cancelled) setFrames([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [videoUri, durationSec, count]);

  if (!videoUri) return null;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Suggested covers</Text>
        {onPressSeeAll ? (
          <TouchableOpacity style={styles.seeAllBtn} onPress={onPressSeeAll}>
            <Text style={styles.seeAllText}>See all</Text>
            <Ionicons name="chevron-forward" size={14} color="#FF7F0B" />
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#FF7F0B" />
          <Text style={styles.loadingText}>Generating previews…</Text>
        </View>
      ) : frames.length === 0 ? (
        <Text style={styles.emptyText}>Could not generate previews. Tap cover to retry.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {frames.map(item => {
            const selected =
              selectedUri &&
              String(selectedUri).trim() === String(item.uri).trim();
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.chip, selected && styles.chipSelected]}
                activeOpacity={0.85}
                onPress={() => onSelect?.(item)}
              >
                <Image source={{ uri: item.uri }} style={styles.chipImage} />
                <Text style={styles.chipTime}>{(item.timeStamp / 1000).toFixed(1)}s</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
  },
  wrapCompact: {
    marginHorizontal: 0,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  seeAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF7F0B',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#777',
  },
  emptyText: {
    fontSize: 12,
    color: '#888',
    paddingVertical: 6,
  },
  scrollContent: {
    paddingRight: 8,
    gap: 8,
  },
  chip: {
    width: 72,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  chipSelected: {
    borderColor: '#FF7F0B',
  },
  chipImage: {
    width: '100%',
    height: 96,
    resizeMode: 'cover',
  },
  chipTime: {
    fontSize: 10,
    fontWeight: '600',
    color: '#555',
    textAlign: 'center',
    paddingVertical: 4,
    backgroundColor: '#EFEFEF',
  },
});

export default VideoCoverSuggestionsRow;
