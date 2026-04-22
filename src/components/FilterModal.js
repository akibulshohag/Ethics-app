import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {shortsService} from '../services/shortsService';
import {FILTER_EFFECTS} from '../constants/filterEffects';

const {width} = Dimensions.get('window');

/**
 * FilterModal - YouTube/Messenger style
 * - Horizontal filter strip at bottom
 * - Live preview: tapping a filter updates parent preview immediately (effect changes)
 * - Does NOT close on filter tap - user can browse and see effects in real-time
 * - Apply/Done button to confirm and close
 */
const FilterModal = ({
  visible,
  onClose,
  onSelect,
  onPreviewChange,
  selectedFilter,
}) => {
  const [filters, setFilters] = useState(FILTER_EFFECTS);
  const [loading, setLoading] = useState(false);
  const [previewing, setPreviewing] = useState(selectedFilter);

  useEffect(() => {
    if (visible) {
      setPreviewing(selectedFilter);
      loadFilters();
    }
  }, [visible, selectedFilter]);

  const loadFilters = async () => {
    try {
      setLoading(true);
      const res = await shortsService.getFilters();
      if (res?.filters?.length > 0) {
        const noneRow = {
          id: 'none',
          name: 'None',
          thumbnailUrl: null,
          overlayColor: 'transparent',
          overlayOpacity: 0,
          isTrending: false,
        };
        const fromApi = res.filters.map(f => ({
          ...f,
          overlayColor: f.config?.overlayColor || '#888',
          overlayOpacity: f.config?.overlayOpacity ?? 0.25,
        }));
        const apiIds = new Set(fromApi.map(f => String(f.id)));
        const appOnly = FILTER_EFFECTS.filter(
          f => f.id !== 'none' && !apiIds.has(String(f.id)),
        );
        const merged = [noneRow, ...fromApi, ...appOnly];
        setFilters(merged);
      }
    } catch (e) {
      // Use defaults from FILTER_EFFECTS
    } finally {
      setLoading(false);
    }
  };

  const handleFilterTap = filter => {
    setPreviewing(filter);
    onPreviewChange?.(filter);
    onSelect?.(filter);
  };

  const handleApply = () => {
    onSelect?.(previewing);
    onClose?.();
  };

  return (
    <Modal
      animationType="slide"
      transparent
      visible={visible}
      onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              <View style={styles.handle} />
              <Text style={styles.title}>Filters</Text>
              <Text style={styles.subtitle}>
                Tap to preview • Changes apply in real-time
              </Text>
              {loading ? (
                <ActivityIndicator
                  size="large"
                  color="#FF8C00"
                  style={styles.loader}
                />
              ) : (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.filterStrip}
                  style={styles.filterScroll}>
                  {filters.map(item => {
                    const isSelected =
                      previewing?.id === item.id || selectedFilter?.id === item.id;
                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={styles.filterItem}
                        onPress={() => handleFilterTap(item)}
                        activeOpacity={0.8}>
                        <View
                          style={[
                            styles.filterThumb,
                            isSelected && styles.filterThumbSelected,
                          ]}>
                          {item.thumbnailUrl ? (
                            <Image
                              source={{uri: item.thumbnailUrl}}
                              style={styles.filterImage}
                            />
                          ) : (
                            <View style={styles.filterPlaceholder}>
                              <Ionicons
                                name="close"
                                size={20}
                                color="#666"
                              />
                            </View>
                          )}
                          {isSelected && (
                            <View style={styles.checkOverlay}>
                              <Ionicons
                                name="checkmark-circle"
                                size={22}
                                color="#FF8C00"
                              />
                            </View>
                          )}
                        </View>
                        <Text
                          style={[
                            styles.filterName,
                            isSelected && styles.filterNameSelected,
                          ]}
                          numberOfLines={1}>
                          {item.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
              <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
                <Text style={styles.applyBtnText}>Done</Text>
              </TouchableOpacity>
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
  content: {
    backgroundColor: 'white',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    paddingHorizontal: 16,
    paddingBottom: 36,
    paddingTop: 8,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  filterScroll: {
    maxHeight: 120,
  },
  filterStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
    gap: 16,
  },
  filterItem: {
    alignItems: 'center',
    width: 64,
  },
  filterThumb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 3,
    borderColor: 'transparent',
  },
  filterThumbSelected: {
    borderColor: '#FF8C00',
  },
  filterImage: {
    width: '100%',
    height: '100%',
  },
  filterPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkOverlay: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: 'white',
    borderRadius: 11,
  },
  filterName: {
    fontSize: 11,
    color: '#666',
    marginTop: 6,
    fontWeight: '500',
  },
  filterNameSelected: {
    color: '#FF8C00',
    fontWeight: '600',
  },
  applyBtn: {
    backgroundColor: '#FF8C00',
    borderRadius: 24,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  applyBtnText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loader: {
    marginVertical: 24,
  },
});

export default FilterModal;
