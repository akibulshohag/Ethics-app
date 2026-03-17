import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSelector } from 'react-redux';
import { launchImageLibrary } from 'react-native-image-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { uploadPromotion } from '../services/promotionService';
import { getMenuByUserId } from '../services/menuService';

const CreatePromotionModal = ({ visible, onClose, onSuccess, userId }) => {
  const token = useSelector(state => state.app?.user?.token);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [promoAmount, setPromoAmount] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expireDate, setExpireDate] = useState('');
  const [thumbnail, setThumbnail] = useState(null);
  const [video, setVideo] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [menuItems, setMenuItems] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (visible && userId) {
      setMenuLoading(true);
      getMenuByUserId(userId)
        .then(res => {
          const menu = res?.menu ?? [];
          const categories = res?.categories ?? [];
          setMenuItems(Array.isArray(menu) ? menu : []);
          setMenuCategories(Array.isArray(categories) ? categories : []);
          setSelectedMenuIds([]);
        })
        .catch(() => {
          setMenuItems([]);
          setMenuCategories([]);
        })
        .finally(() => setMenuLoading(false));
    }
  }, [visible, userId]);

  const reset = () => {
    setTitle('');
    setDescription('');
    setPromoAmount('');
    setPromoCode('');
    setStartDate('');
    setExpireDate('');
    setThumbnail(null);
    setVideo(null);
    setVideoDuration(0);
    setSelectedMenuIds([]);
    setUploading(false);
  };

  const handleClose = () => {
    if (!uploading) {
      reset();
      onClose?.();
    }
  };

  const toggleMenuId = id => {
    setSelectedMenuIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const allMenuIds = menuItems.map(i => i.id).filter(Boolean);
  const allSelected =
    allMenuIds.length > 0 &&
    allMenuIds.every(id => selectedMenuIds.includes(id));

  const toggleSelectAllMenu = () => {
    setSelectedMenuIds(prev => {
      if (allMenuIds.length === 0) return prev;
      const isAllSelected = allMenuIds.every(id => prev.includes(id));
      return isAllSelected ? [] : allMenuIds;
    });
  };

  // Group menu items by category for section-wise display
  const menuSections = React.useMemo(() => {
    const uncategorized = menuItems.filter(
      i => !i.categoryId && !i.category?.id,
    );
    const sections = [];
    (menuCategories || []).forEach(cat => {
      const items = menuItems.filter(
        i => (i.categoryId || i.category?.id) === cat.id,
      );
      if (items.length > 0) {
        sections.push({ id: cat.id, title: cat.name, data: items });
      }
    });
    if (uncategorized.length > 0) {
      sections.push({
        id: 'uncategorized',
        title: 'Uncategorized',
        data: uncategorized,
      });
    }
    if (sections.length === 0 && menuItems.length > 0) {
      sections.push({
        id: 'all',
        title: 'Menu',
        data: menuItems,
      });
    }
    return sections;
  }, [menuItems, menuCategories]);

  const pickThumbnail = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, res => {
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('Error', res.errorMessage || 'Failed to pick image');
        return;
      }
      const asset = res.assets?.[0];
      if (asset?.uri) {
        setThumbnail({
          uri: asset.uri,
          type: asset.type || 'image/jpeg',
          name: asset.fileName || 'thumbnail.jpg',
        });
      }
    });
  };

  const pickVideo = () => {
    launchImageLibrary(
      { mediaType: 'video', videoMaxDuration: 300, quality: 1 },
      res => {
        if (res.didCancel) return;
        if (res.errorCode) {
          Alert.alert('Error', res.errorMessage || 'Failed to pick video');
          return;
        }
        const asset = res.assets?.[0];
        if (asset?.uri) {
          const duration =
            asset.duration != null ? Math.round(Number(asset.duration)) : 0;
          setVideoDuration(duration);
          setVideo({
            uri: asset.uri,
            type: asset.type || 'video/mp4',
            name: asset.fileName || 'video.mp4',
          });
        }
      },
    );
  };

  const removeThumbnail = () => setThumbnail(null);
  const removeVideo = () => {
    setVideo(null);
    setVideoDuration(0);
  };

  const formatDateForInput = d => {
    if (!d) return '';
    const date = typeof d === 'string' ? new Date(d) : d;
    if (Number.isNaN(date.getTime())) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const handleSubmit = async () => {
    if (!userId || !token) {
      Alert.alert('Login required', 'Please log in to create a promotion.');
      return;
    }
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Title required', 'Please enter a title for your promotion.');
      return;
    }
    if (!thumbnail?.uri) {
      Alert.alert('Thumbnail required', 'Please add a thumbnail image.');
      return;
    }
    const amount = parseFloat(promoAmount);
    if (Number.isNaN(amount) || amount < 0) {
      Alert.alert(
        'Invalid amount',
        'Please enter a valid promo amount (e.g. 10 for 10% or 10 £).',
      );
      return;
    }
    const code = promoCode.trim();
    if (!code) {
      Alert.alert('Code required', 'Please enter a promo code (e.g. EATIX20).');
      return;
    }
    const start = startDate.trim();
    const expire = expireDate.trim();
    if (!start || !expire) {
      Alert.alert(
        'Dates required',
        'Please enter start date and expire date (YYYY-MM-DD).',
      );
      return;
    }
    const startD = new Date(start);
    const expireD = new Date(expire);
    if (Number.isNaN(startD.getTime()) || Number.isNaN(expireD.getTime())) {
      Alert.alert(
        'Invalid dates',
        'Use format YYYY-MM-DD for start and expire date.',
      );
      return;
    }
    if (expireD <= startD) {
      Alert.alert('Invalid dates', 'Expire date must be after start date.');
      return;
    }
    setUploading(true);
    try {
      await uploadPromotion({
        userId,
        token,
        title: trimmedTitle,
        description: description.trim() || undefined,
        promoAmount: amount,
        promoCode: code,
        startDate: startD.toISOString(),
        expireDate: expireD.toISOString(),
        menuItemIds: selectedMenuIds.length > 0 ? selectedMenuIds : undefined,
        thumbnailUri: thumbnail.uri,
        thumbnailType: thumbnail.type,
        thumbnailName: thumbnail.name,
        videoUri: video?.uri,
        videoType: video?.type,
        videoName: video?.name,
        duration: video ? videoDuration : undefined,
      });
      reset();
      onClose?.();
      onSuccess?.();
    } catch (err) {
      setUploading(false);
      Alert.alert(
        'Upload failed',
        err?.message || 'Could not create promotion.',
      );
    }
  };

  const today = formatDateForInput(new Date());

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={40}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />
        <View style={styles.modalBox}>
          <View style={styles.header}>
            <Text style={styles.title}>Create Promotion</Text>
            <TouchableOpacity
              onPress={handleClose}
              disabled={uploading}
              hitSlop={12}
            >
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>Thumbnail *</Text>
            <TouchableOpacity
              style={styles.mediaBox}
              onPress={pickThumbnail}
              disabled={uploading}
            >
              {thumbnail?.uri ? (
                <View style={styles.mediaPreview}>
                  <Image
                    source={{ uri: thumbnail.uri }}
                    style={styles.previewImage}
                  />
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={removeThumbnail}
                    disabled={uploading}
                  >
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={28}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.placeholder}>
                  <MaterialCommunityIcons
                    name="image-plus"
                    size={48}
                    color="#999"
                  />
                  <Text style={styles.placeholderText}>
                    Tap to add thumbnail
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Video (optional)</Text>
            <TouchableOpacity
              style={styles.mediaBox}
              onPress={pickVideo}
              disabled={uploading}
            >
              {video?.uri ? (
                <View style={styles.mediaPreview}>
                  <View style={styles.videoPreviewPlaceholder}>
                    <MaterialCommunityIcons
                      name="play-circle"
                      size={48}
                      color="rgba(255,255,255,0.9)"
                    />
                    {videoDuration > 0 && (
                      <View
                        style={[
                          styles.durationBadge,
                          styles.durationBadgeVideo,
                        ]}
                      >
                        <Text style={styles.durationText}>
                          {Math.floor(videoDuration / 60)}:
                          {String(videoDuration % 60).padStart(2, '0')}
                        </Text>
                      </View>
                    )}
                  </View>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={removeVideo}
                    disabled={uploading}
                  >
                    <MaterialCommunityIcons
                      name="close-circle"
                      size={28}
                      color="#fff"
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.placeholder}>
                  <MaterialCommunityIcons
                    name="video-plus"
                    size={48}
                    color="#999"
                  />
                  <Text style={styles.placeholderText}>Tap to add video</Text>
                </View>
              )}
            </TouchableOpacity>

            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Promotion title"
              placeholderTextColor="#999"
              editable={!uploading}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Describe your offer..."
              placeholderTextColor="#999"
              multiline
              numberOfLines={2}
              editable={!uploading}
            />

            <Text style={styles.label}>Promo amount *</Text>
            <TextInput
              style={styles.input}
              value={promoAmount}
              onChangeText={setPromoAmount}
              placeholder="e.g. 10 (for 10% or 10 )"
              placeholderTextColor="#999"
              keyboardType="decimal-pad"
              editable={!uploading}
            />

            <Text style={styles.label}>Promo code *</Text>
            <TextInput
              style={styles.input}
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder="e.g. EATIX20"
              placeholderTextColor="#999"
              autoCapitalize="characters"
              editable={!uploading}
            />

            <Text style={styles.label}>Start date * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={startDate}
              onChangeText={setStartDate}
              placeholder={today || '2025-01-01'}
              placeholderTextColor="#999"
              editable={!uploading}
            />

            <Text style={styles.label}>Expire date * (YYYY-MM-DD)</Text>
            <TextInput
              style={styles.input}
              value={expireDate}
              onChangeText={setExpireDate}
              placeholder="2025-12-31"
              placeholderTextColor="#999"
              editable={!uploading}
            />

            <Text style={styles.label}>Menu items in this offer</Text>
            {menuLoading ? (
              <ActivityIndicator
                size="small"
                color="#FF7F0B"
                style={styles.menuLoader}
              />
            ) : menuItems.length === 0 ? (
              <Text style={styles.hint}>
                No menu items yet. Add items in your menu first.
              </Text>
            ) : (
              <View style={styles.menuList}>
                <TouchableOpacity
                  style={[styles.menuRow, styles.selectAllRow]}
                  onPress={toggleSelectAllMenu}
                  disabled={uploading}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons
                    name={
                      allSelected ? 'checkbox-marked' : 'checkbox-blank-outline'
                    }
                    size={24}
                    color={allSelected ? '#FF7F0B' : '#999'}
                  />
                  <Text style={styles.menuItemName} numberOfLines={1}>
                    {allSelected ? 'Unselect all' : 'Select all'}
                  </Text>
                </TouchableOpacity>
                {menuSections.map(section => (
                  <View key={section.id} style={styles.menuSection}>
                    <Text style={styles.menuSectionTitle} numberOfLines={1}>
                      {section.title}
                    </Text>
                    {section.data.map(item => {
                      const checked = selectedMenuIds.includes(item.id);
                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={styles.menuRow}
                          onPress={() => toggleMenuId(item.id)}
                          disabled={uploading}
                          activeOpacity={0.7}
                        >
                          <MaterialCommunityIcons
                            name={
                              checked
                                ? 'checkbox-marked'
                                : 'checkbox-blank-outline'
                            }
                            size={24}
                            color={checked ? '#FF7F0B' : '#999'}
                          />
                          <Text style={styles.menuItemName} numberOfLines={1}>
                            {item.itemName || 'Unnamed'}
                          </Text>
                          {item.price != null && (
                            <Text style={styles.menuItemPrice}>
                              {typeof item.price === 'number'
                                ? item.price.toFixed(2)
                                : item.price}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitBtn, uploading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={uploading}
          >
            <Text style={styles.submitBtnText}>
              {uploading ? 'Creating...' : 'Create Promotion'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalBox: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '90%',
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: { fontSize: 18, fontWeight: '600', color: '#333' },
  scroll: { maxHeight: 420 },
  scrollContent: { padding: 16, paddingBottom: 8 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#333',
  },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  mediaBox: {
    height: 120,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
    marginBottom: 4,
  },
  mediaPreview: { flex: 1, position: 'relative' },
  previewImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  videoPreviewPlaceholder: {
    flex: 1,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  durationBadgeVideo: {},
  durationText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: { marginTop: 6, fontSize: 14, color: '#999' },
  menuLoader: { marginVertical: 12 },
  hint: { fontSize: 13, color: '#888', marginVertical: 8 },
  menuList: { marginTop: 4, marginBottom: 8 },
  menuSection: { marginTop: 12, marginBottom: 4 },
  menuSectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
    paddingLeft: 2,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectAllRow: {
    borderBottomColor: '#e6e6e6',
  },
  menuItemName: { flex: 1, fontSize: 15, color: '#333', marginLeft: 10 },
  menuItemPrice: { fontSize: 14, color: '#666', fontWeight: '500' },
  submitBtn: {
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: '#FF7F0B',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default CreatePromotionModal;
