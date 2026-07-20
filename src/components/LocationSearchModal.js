import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { COLORS, SPACING } from '../constants/theme';
import { getPlaceSuggestions } from '../utils/geolocation';
import { UK_POPULAR_AREAS } from '../utils/ukPostcode';

const NOMINATIM_HEADERS = {
  Accept: 'application/json',
  'User-Agent': 'EatwazeApp/1.0 (React Native)',
};

/**
 * Extra UK results via OpenStreetMap when Google / local list returns nothing.
 */
async function searchUkNominatim(query) {
  const q = String(query || '').trim();
  if (q.length < 2) return [];
  try {
    const url =
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}` +
      '&format=json&addressdetails=1&limit=8&countrycodes=gb';
    const res = await fetch(url, { headers: NOMINATIM_HEADERS });
    const arr = await res.json();
    if (!Array.isArray(arr)) return [];
    return arr
      .map((hit, i) => {
        const title =
          hit?.name ||
          hit?.address?.city ||
          hit?.address?.town ||
          hit?.address?.village ||
          hit?.display_name?.split(',')[0] ||
          'Location';
        const address = hit?.display_name || '';
        return {
          id: `nom-${hit.place_id || i}`,
          title: String(title).trim(),
          address: String(address).trim(),
          selectValue: address || title,
        };
      })
      .filter(r => r.title);
  } catch (_) {
    return [];
  }
}

/** UK postcode autocomplete via postcodes.io (no API key). */
async function searchUkPostcodes(query) {
  const raw = String(query || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (raw.length < 2 || raw.length > 7) return [];
  try {
    const res = await fetch(
      `https://api.postcodes.io/postcodes/${encodeURIComponent(raw)}/autocomplete`,
      { headers: { Accept: 'application/json' } },
    );
    const data = await res.json();
    const list = Array.isArray(data?.result) ? data.result : [];
    return list.slice(0, 8).map(pc => ({
      id: `pc-${pc}`,
      title: pc,
      address: `${pc}, United Kingdom`,
      selectValue: `${pc}, United Kingdom`,
    }));
  } catch (_) {
    return [];
  }
}

function popularUkRows() {
  return UK_POPULAR_AREAS.map((area, i) => ({
    id: `popular-${i}`,
    title: area,
    address: 'United Kingdom',
    selectValue: area,
  }));
}

const LocationSearchModal = ({ visible, onClose, onSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState(popularUkRows());
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!visible) return;
    setSearchQuery('');
    setResults(popularUkRows());
    setLoading(false);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const trimmed = searchQuery.trim();
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!trimmed) {
      setResults(popularUkRows());
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const reqId = ++requestIdRef.current;
      setLoading(true);
      try {
        const [places, postcodes] = await Promise.all([
          getPlaceSuggestions(trimmed, { region: 'uk' }),
          searchUkPostcodes(trimmed),
        ]);

        let rows = (places || [])
          .map((p, i) => ({
            id: p.place_id || `place-${i}-${p.description}`,
            title: (p.description || '').split(',')[0].trim() || p.description,
            address: p.description || '',
            selectValue: p.description || '',
          }))
          .filter(r => r.selectValue);

        // Merge unique postcode suggestions
        for (const pc of postcodes) {
          if (!rows.some(r => r.selectValue.toUpperCase().includes(pc.title))) {
            rows.push(pc);
          }
        }

        if (rows.length === 0) {
          rows = await searchUkNominatim(trimmed);
        }

        if (reqId === requestIdRef.current) {
          setResults(rows);
        }
      } catch (_) {
        if (reqId === requestIdRef.current) {
          setResults([]);
        }
      } finally {
        if (reqId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, visible]);

  const renderLocationItem = ({ item }) => (
    <TouchableOpacity
      style={styles.locationItem}
      onPress={() => {
        onSelect(item.selectValue || item.title);
        onClose();
      }}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="location-outline" size={24} color="#333" />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.locationTitle}>{item.title}</Text>
        {!!item.address && (
          <Text style={styles.locationAddress}>{item.address}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="#fff" />

        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color="#000" />
          </TouchableOpacity>
          <View style={styles.searchBar}>
            <Ionicons
              name="search-outline"
              size={20}
              color="#999"
              style={styles.searchIcon}
            />
            <TextInput
              style={styles.searchInput}
              placeholder="Search UK city, area or postcode"
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
            />
            {searchQuery.length > 0 ? (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={18} color="#bbb" />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator size="small" color={COLORS.primaryOrange} />
            <Text style={styles.loadingText}>Searching UK locations…</Text>
          </View>
        ) : null}

        <FlatList
          data={results}
          renderItem={renderLocationItem}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>
                  No UK locations found. Try a city (e.g. London) or postcode
                  (e.g. WC2N 5DN).
                </Text>
              </View>
            ) : null
          }
          ListHeaderComponent={
            !searchQuery.trim() && results.length > 0 ? (
              <Text style={styles.sectionHint}>Popular UK areas</Text>
            ) : null
          }
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 25,
    paddingHorizontal: 15,
    height: 46,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#888',
  },
  sectionHint: {
    fontSize: 13,
    fontWeight: '600',
    color: '#888',
    paddingHorizontal: SPACING.lg,
    paddingTop: 8,
    paddingBottom: 4,
  },
  listContent: {
    paddingVertical: SPACING.sm,
    flexGrow: 1,
  },
  emptyWrap: {
    paddingHorizontal: SPACING.lg,
    paddingTop: 32,
  },
  emptyText: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
    textAlign: 'center',
  },
  locationItem: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: 15,
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 15,
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  locationTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    lineHeight: 22,
  },
  locationAddress: {
    fontSize: 13,
    color: '#888',
    marginTop: 4,
    lineHeight: 18,
  },
});

export default LocationSearchModal;
