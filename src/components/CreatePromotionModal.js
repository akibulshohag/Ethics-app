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
import { uploadPromotion, updatePromotionUpload } from '../services/promotionService';
import { getMenuByUserId } from '../services/menuService';
import VideoCoverPickerModal from './VideoCoverPickerModal';
import VideoCoverSuggestionsRow from './VideoCoverSuggestionsRow';
import { frameToThumbnailAsset, thumbnailFromVideoFrame } from '../utils/videoThumbnail';
import {
  ORDER_DISCOUNT_MODES,
  OFFER_TYPES,
  PROMO_BENEFITS,
  combineDateAndTime,
  normalizeHhMm,
  parsePromotionTiers,
  parseScheduleSlots,
} from '../utils/promotionUtils';
import { normalizeUploadUri } from '../utils/helper';
import PromotionScheduleEditor from './PromotionScheduleEditor';

const toMediaAsset = asset => ({
  uri: normalizeUploadUri(asset.uri),
  type: asset.type || 'image/jpeg',
  name: asset.name || asset.fileName || 'media.jpg',
});

const normalizeMenuId = id => String(id ?? '').trim();

const emptyTier = () => ({ minValue: '', maxValue: '', percent: '' });

const formatDateForInput = d => {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const CreatePromotionModal = ({
  visible,
  onClose,
  onSuccess,
  userId,
  promotionToEdit = null,
  offerType: offerTypeProp = OFFER_TYPES.ORDER,
}) => {
  const token = useSelector(state => state.app?.user?.token);
  const isEdit = Boolean(promotionToEdit?.id);
  const offerType =
    promotionToEdit?.offerType || offerTypeProp || OFFER_TYPES.ORDER;
  const isBoth = offerType === OFFER_TYPES.BOTH;
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expireDate, setExpireDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);
  const [video, setVideo] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [menuItems, setMenuItems] = useState([]);
  const [menuCategories, setMenuCategories] = useState([]);
  const [selectedMenuIds, setSelectedMenuIds] = useState([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [coverPickerVisible, setCoverPickerVisible] = useState(false);
  const [tiers, setTiers] = useState([emptyTier()]);
  const [collectionChecked, setCollectionChecked] = useState(false);
  const [deliveryChecked, setDeliveryChecked] = useState(false);
  const [bothChecked, setBothChecked] = useState(false);
  const [discountMode, setDiscountMode] = useState(ORDER_DISCOUNT_MODES.AMOUNT);
  const [freeDeliveryMinOrder, setFreeDeliveryMinOrder] = useState('');

  const populateFromPromotion = React.useCallback(promo => {
    if (!promo) return;
    setTitle(String(promo.title || ''));
    setDescription(String(promo.description || ''));
    setPromoCode(String(promo.promoCode || ''));
    setStartDate(formatDateForInput(promo.startDate));
    setExpireDate(formatDateForInput(promo.expireDate));
    setStartTime(normalizeHhMm(promo.startTime) || '');
    setEndTime(normalizeHhMm(promo.endTime) || '');
    setScheduleSlots(parseScheduleSlots(promo.scheduleSlots));
    if (promo.thumbnailUrl) {
      setThumbnail({
        uri: normalizeUploadUri(promo.thumbnailUrl),
        type: 'image/jpeg',
        name: 'thumbnail.jpg',
      });
    } else {
      setThumbnail(null);
    }
    if (promo.videoUrl) {
      setVideo({
        uri: normalizeUploadUri(promo.videoUrl),
        type: 'video/mp4',
        name: 'video.mp4',
      });
      setVideoDuration(Number(promo.duration) || 0);
    } else {
      setVideo(null);
      setVideoDuration(0);
    }
    setSelectedMenuIds(
      Array.isArray(promo.menuItemIds)
        ? promo.menuItemIds.map(normalizeMenuId).filter(Boolean)
        : [],
    );
    const scopes = Array.isArray(promo.fulfillmentScopes)
      ? promo.fulfillmentScopes
      : [];
    setBothChecked(scopes.includes('both'));
    setCollectionChecked(scopes.includes('collection'));
    setDeliveryChecked(scopes.includes('delivery'));
    const tiers = parsePromotionTiers(promo.discountTiers);
    const freeTax = tiers.find(t => t.benefit === PROMO_BENEFITS.FREE_TAX_CHARGE);
    if (freeTax) {
      setDiscountMode(ORDER_DISCOUNT_MODES.DELIVERY_FREE);
      setFreeDeliveryMinOrder(String(freeTax.minValue ?? ''));
      setTiers([emptyTier()]);
    } else {
      setDiscountMode(ORDER_DISCOUNT_MODES.AMOUNT);
      setFreeDeliveryMinOrder('');
      if (tiers.length) {
        setTiers(
          tiers.map(t => ({
            minValue: String(t.minValue ?? ''),
            maxValue: t.maxValue != null ? String(t.maxValue) : '',
            percent: String(t.percent ?? ''),
          })),
        );
      } else {
        setTiers([emptyTier()]);
      }
    }
  }, []);

  useEffect(() => {
    if (visible && userId) {
      if (isEdit) {
        populateFromPromotion(promotionToEdit);
      } else {
        reset();
        const today = formatDateForInput(new Date());
        setStartDate(today);
        const nextMonth = new Date();
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        setExpireDate(formatDateForInput(nextMonth));
      }
      setMenuLoading(true);
      getMenuByUserId(userId)
        .then(res => {
          const menu = res?.menu ?? [];
          const categories = res?.categories ?? [];
          setMenuItems(Array.isArray(menu) ? menu : []);
          setMenuCategories(Array.isArray(categories) ? categories : []);
          if (!isEdit) {
            setSelectedMenuIds([]);
          } else if (Array.isArray(promotionToEdit?.menuItemIds)) {
            setSelectedMenuIds(
              promotionToEdit.menuItemIds.map(normalizeMenuId).filter(Boolean),
            );
          }
        })
        .catch(() => {
          setMenuItems([]);
          setMenuCategories([]);
        })
        .finally(() => setMenuLoading(false));
    }
  }, [visible, userId, isEdit, promotionToEdit, populateFromPromotion]);

  const reset = () => {
    setTitle('');
    setDescription('');
    setPromoCode('');
    setStartDate('');
    setExpireDate('');
    setStartTime('');
    setEndTime('');
    setScheduleSlots([]);
    setThumbnail(null);
    setVideo(null);
    setVideoDuration(0);
    setSelectedMenuIds([]);
    setTiers([emptyTier()]);
    setCollectionChecked(false);
    setDeliveryChecked(false);
    setBothChecked(false);
    setDiscountMode(ORDER_DISCOUNT_MODES.AMOUNT);
    setFreeDeliveryMinOrder('');
    setUploading(false);
  };

  const handleClose = () => {
    if (!uploading) {
      reset();
      onClose?.();
    }
  };

  const toggleMenuId = id => {
    const key = normalizeMenuId(id);
    if (!key) return;
    setSelectedMenuIds(prev =>
      prev.includes(key) ? prev.filter(x => x !== key) : [...prev, key],
    );
  };

  const allMenuIds = menuItems.map(i => normalizeMenuId(i.id)).filter(Boolean);
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
    if (video?.uri) {
      openCoverPicker();
      return;
    }
    launchImageLibrary({ mediaType: 'photo', quality: 0.8 }, res => {
      if (res.didCancel) return;
      if (res.errorCode) {
        Alert.alert('Error', res.errorMessage || 'Failed to pick image');
        return;
      }
      const asset = res.assets?.[0];
      if (asset?.uri) {
        setThumbnail({
          uri: normalizeUploadUri(asset.uri),
          type: asset.type || 'image/jpeg',
          name: asset.fileName || 'thumbnail.jpg',
        });
        // Single-media behavior: thumbnail and video are mutually exclusive.
        setVideo(null);
        setVideoDuration(0);
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
            uri: normalizeUploadUri(asset.uri),
            type: asset.type || 'video/mp4',
            name: asset.fileName || 'video.mp4',
          });
          setThumbnail(null);
          thumbnailFromVideoFrame(asset.uri).then(thumb => {
            if (thumb) setThumbnail(toMediaAsset(thumb));
          });
        }
      },
    );
  };

  const removeThumbnail = () => setThumbnail(null);
  const removeVideo = () => {
    setVideo(null);
    setVideoDuration(0);
    setThumbnail(null);
  };

  const applyCoverFrame = frame => {
    const asset = frameToThumbnailAsset(frame);
    if (asset) setThumbnail(toMediaAsset(asset));
  };

  const openCoverPicker = () => {
    if (!video?.uri) {
      Alert.alert('Select video first', 'Add a video to choose a cover frame.');
      return;
    }
    setCoverPickerVisible(true);
  };

  const updateTier = (index, field, value) => {
    setTiers(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addTier = () => setTiers(prev => [...prev, emptyTier()]);

  const removeTier = index => {
    setTiers(prev => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)));
  };

  const toggleScope = scope => {
    if (scope === 'both') {
      const next = !bothChecked;
      setBothChecked(next);
      if (next) {
        setCollectionChecked(false);
        setDeliveryChecked(false);
      }
      return;
    }
    if (scope === 'collection') {
      setCollectionChecked(v => !v);
      setBothChecked(false);
      return;
    }
    setDeliveryChecked(v => !v);
    setBothChecked(false);
  };

  const buildFulfillmentScopes = () => {
    if (bothChecked) return ['both'];
    const scopes = [];
    if (collectionChecked) scopes.push('collection');
    if (deliveryChecked) scopes.push('delivery');
    return scopes;
  };

  const parseDiscountTiersForSubmit = () =>
    tiers
      .map(t => ({
        minValue: parseFloat(t.minValue),
        maxValue: t.maxValue.trim() ? parseFloat(t.maxValue) : null,
        percent: parseFloat(t.percent),
        metricType: 'amount',
      }))
      .filter(
        t =>
          Number.isFinite(t.minValue) &&
          Number.isFinite(t.percent) &&
          t.percent > 0,
      );

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
    if (!thumbnail?.uri && !video?.uri) {
      Alert.alert(
        'Media required',
        'Please add a thumbnail image or select a video.',
      );
      return;
    }
    const start = startDate.trim();
    const expire = expireDate.trim();
    if (!start || !expire) {
      Alert.alert(
        'Dates required',
        'Please enter start date and expire date.',
      );
      return;
    }
    const startD = combineDateAndTime(start, startTime, false);
    const expireD = combineDateAndTime(expire, endTime, true);
    if (!startD || !expireD) {
      Alert.alert(
        'Invalid dates',
        'Use format YYYY-MM-DD for start and expire date.',
      );
      return;
    }
    if (expireD <= startD) {
      Alert.alert(
        'Invalid dates',
        'Expire date and time must be after start date and time.',
      );
      return;
    }

    let fulfillmentScopes = [];
    let discountTiers = [];

    if (discountMode === ORDER_DISCOUNT_MODES.DELIVERY_FREE && !isBoth) {
      const minOrder = parseFloat(freeDeliveryMinOrder);
      if (!Number.isFinite(minOrder) || minOrder <= 0) {
        Alert.alert(
          'Minimum order required',
          'Enter the minimum order amount for free tax & charges (e.g. 20).',
        );
        return;
      }
      fulfillmentScopes = ['delivery'];
      discountTiers = [
        {
          minValue: minOrder,
          maxValue: null,
          percent: 0,
          metricType: 'amount',
          benefit: PROMO_BENEFITS.FREE_TAX_CHARGE,
        },
      ];
    } else {
      fulfillmentScopes = buildFulfillmentScopes();
      if (!fulfillmentScopes.length) {
        Alert.alert(
          'Fulfillment required',
          'Select Collection, Delivery, or Both.',
        );
        return;
      }
      discountTiers = parseDiscountTiersForSubmit();
      if (!discountTiers.length) {
        Alert.alert('Tiers required', 'Add at least one valid discount tier.');
        return;
      }
      for (const t of discountTiers) {
        if (t.maxValue != null && t.maxValue < t.minValue) {
          Alert.alert('Invalid tier', 'Max value must be greater than min value.');
          return;
        }
      }
    }

    const code = promoCode.trim();
    if (!code) {
      Alert.alert('Code required', 'Please enter a promo code (e.g. EATWAZE20).');
      return;
    }
    setUploading(true);
    try {
      const payload = {
        userId,
        token,
        offerType,
        title: trimmedTitle,
        description: description.trim() || undefined,
        promoAmount: 0,
        promoCode: code,
        startDate: startD.toISOString(),
        expireDate: expireD.toISOString(),
        startTime: normalizeHhMm(startTime) || '',
        endTime: normalizeHhMm(endTime) || '',
        scheduleSlots,
        fulfillmentScopes,
        discountTiers,
        tierMetricType: isBoth ? 'amount' : undefined,
        menuItemIds: selectedMenuIds.length > 0 ? selectedMenuIds : undefined,
        ...(thumbnail?.uri
          ? {
              thumbnailUri: thumbnail.uri,
              thumbnailType: thumbnail.type,
              thumbnailName: thumbnail.name,
            }
          : {}),
        ...(video?.uri
          ? {
              videoUri: video.uri,
              videoType: video.type,
              videoName: video.name,
              duration: video ? videoDuration : undefined,
            }
          : {}),
      };

      if (isEdit) {
        await updatePromotionUpload(promotionToEdit.id, payload);
      } else {
        await uploadPromotion(payload);
      }
      reset();
      onClose?.();
      onSuccess?.();
    } catch (err) {
      setUploading(false);
      Alert.alert(
        isEdit ? 'Save failed' : 'Upload failed',
        err?.message || `Could not ${isEdit ? 'save' : 'create'} promotion.`,
      );
    }
  };

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
            <Text style={styles.title}>
              {isEdit
                ? isBoth
                  ? 'Edit Both Discount'
                  : 'Edit Promotion'
                : isBoth
                ? 'Create Both Discount'
                : 'Create Promotion'}
            </Text>
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
            <Text style={styles.label}>Thumbnail / Video Upload</Text>
            <TouchableOpacity
              style={styles.mediaBox}
              onPress={() => {
                if (uploading) return;
                if (video?.uri) {
                  openCoverPicker();
                  return;
                }
                Alert.alert('Choose media type', 'Select one option:', [
                  { text: 'Image (thumbnail)', onPress: pickThumbnail },
                  { text: 'Video', onPress: pickVideo },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }}
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
              ) : video?.uri ? (
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
                    name="image-video"
                    size={48}
                    color="#999"
                  />
                  <Text style={styles.placeholderText}>
                    Tap to add thumbnail or video
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {video?.uri ? (
              <VideoCoverSuggestionsRow
                videoUri={video.uri}
                durationSec={videoDuration}
                selectedUri={thumbnail?.uri}
                onSelect={applyCoverFrame}
                onPressSeeAll={openCoverPicker}
                compact
              />
            ) : null}

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

            <Text style={styles.label}>Discount type *</Text>
            <View style={styles.scopeRow}>
              <TouchableOpacity
                style={[
                  styles.typeChip,
                  discountMode === ORDER_DISCOUNT_MODES.AMOUNT &&
                    styles.scopeChipActive,
                ]}
                onPress={() => setDiscountMode(ORDER_DISCOUNT_MODES.AMOUNT)}
                disabled={uploading}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    discountMode === ORDER_DISCOUNT_MODES.AMOUNT &&
                      styles.typeChipTextActive,
                  ]}
                >
                  Amount Discount
                </Text>
              </TouchableOpacity>
              {!isBoth ? (
              <TouchableOpacity
                style={[
                  styles.typeChip,
                  discountMode === ORDER_DISCOUNT_MODES.DELIVERY_FREE &&
                    styles.scopeChipActive,
                ]}
                onPress={() => setDiscountMode(ORDER_DISCOUNT_MODES.DELIVERY_FREE)}
                disabled={uploading}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    discountMode === ORDER_DISCOUNT_MODES.DELIVERY_FREE &&
                      styles.typeChipTextActive,
                  ]}
                >
                  Delivery Free
                </Text>
              </TouchableOpacity>
              ) : null}
            </View>

            {discountMode === ORDER_DISCOUNT_MODES.DELIVERY_FREE && !isBoth ? (
              <>
                <Text style={styles.sectionHeading}>Delivery free</Text>
                <Text style={styles.hint}>
                  On delivery orders, tax & charges become £0 when the items
                  subtotal reaches your minimum.
                </Text>
                <Text style={styles.label}>Minimum order amount (£) *</Text>
                <TextInput
                  style={styles.input}
                  value={freeDeliveryMinOrder}
                  onChangeText={setFreeDeliveryMinOrder}
                  placeholder="e.g. 20"
                  placeholderTextColor="#999"
                  keyboardType="decimal-pad"
                  editable={!uploading}
                />
              </>
            ) : (
              <>
            <Text style={styles.sectionHeading}>Amount discount</Text>
            <Text style={styles.hint}>
              {isBoth
                ? 'This offer applies to order checkout and table bookings when the date and time match. Booking discount uses estimated spend against the same bill tiers.'
                : 'Bill tiers apply by order total when customers use your promo code or qualify automatically at checkout.'}
            </Text>

            <Text style={styles.label}>Applies to *</Text>
            <View style={styles.scopeRow}>
              <TouchableOpacity
                style={[styles.scopeChip, collectionChecked && styles.scopeChipActive]}
                onPress={() => toggleScope('collection')}
                disabled={uploading}
              >
                <MaterialCommunityIcons
                  name={collectionChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={20}
                  color={collectionChecked ? '#FF7F0B' : '#666'}
                />
                <Text style={styles.scopeText}>Collection</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scopeChip, deliveryChecked && styles.scopeChipActive]}
                onPress={() => toggleScope('delivery')}
                disabled={uploading}
              >
                <MaterialCommunityIcons
                  name={deliveryChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={20}
                  color={deliveryChecked ? '#FF7F0B' : '#666'}
                />
                <Text style={styles.scopeText}>Delivery</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.scopeChip, bothChecked && styles.scopeChipActive]}
                onPress={() => toggleScope('both')}
                disabled={uploading}
              >
                <MaterialCommunityIcons
                  name={bothChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={20}
                  color={bothChecked ? '#FF7F0B' : '#666'}
                />
                <Text style={styles.scopeText}>Both</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Discount tiers *</Text>
            <Text style={styles.hint}>
              Add ranges like 30–50 → 5%, 51–70 → 10%. Leave max empty for
              open-ended.
            </Text>
            {tiers.map((tier, index) => (
              <View key={`tier-${index}`} style={styles.tierRow}>
                <View style={styles.tierFields}>
                  <TextInput
                    style={[styles.input, styles.tierInput]}
                    value={tier.minValue}
                    onChangeText={v => updateTier(index, 'minValue', v)}
                    placeholder="Min Bill amount (£)"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                    editable={!uploading}
                  />
                  <Text style={styles.tierDash}>–</Text>
                  <TextInput
                    style={[styles.input, styles.tierInput]}
                    value={tier.maxValue}
                    onChangeText={v => updateTier(index, 'maxValue', v)}
                    placeholder="Max"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                    editable={!uploading}
                  />
                  <TextInput
                    style={[styles.input, styles.percentInput]}
                    value={tier.percent}
                    onChangeText={v => updateTier(index, 'percent', v)}
                    placeholder="%"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                    editable={!uploading}
                  />
                </View>
                {tiers.length > 1 ? (
                  <TouchableOpacity
                    onPress={() => removeTier(index)}
                    disabled={uploading}
                  >
                    <MaterialCommunityIcons
                      name="minus-circle"
                      size={22}
                      color="#C62828"
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            <TouchableOpacity
              style={styles.addTierBtn}
              onPress={addTier}
              disabled={uploading}
            >
              <MaterialCommunityIcons name="plus-circle" size={20} color="#FF7F0B" />
              <Text style={styles.addTierText}>Add another tier</Text>
            </TouchableOpacity>
              </>
            )}

            <Text style={styles.label}>Promo code *</Text>
            <TextInput
              style={styles.input}
              value={promoCode}
              onChangeText={setPromoCode}
              placeholder="e.g. EATWAZE20"
              placeholderTextColor="#999"
              autoCapitalize="characters"
              editable={!uploading}
            />

            <PromotionScheduleEditor
              startDate={startDate}
              expireDate={expireDate}
              startTime={startTime}
              endTime={endTime}
              slots={scheduleSlots}
              onStartDateChange={setStartDate}
              onExpireDateChange={setExpireDate}
              onStartTimeChange={setStartTime}
              onEndTimeChange={setEndTime}
              onSlotsChange={setScheduleSlots}
              disabled={uploading}
            />

            <Text style={styles.label}>Menu items in this offer</Text>
            {menuLoading ? (
              <ActivityIndicator
                size="small"
                color="#FF7F0B"
                style={styles.menuLoader}
              />
            ) : menuItems.length === 0 ? (
              <Text style={styles.menuHint}>
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
                      const menuId = normalizeMenuId(item.id);
                      const checked = selectedMenuIds.includes(menuId);
                      return (
                        <TouchableOpacity
                          key={menuId || item.id}
                          style={styles.menuRow}
                          onPress={() => toggleMenuId(menuId)}
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
              {uploading
                ? isEdit
                  ? 'Saving...'
                  : 'Creating...'
                : isEdit
                ? 'Save Promotion'
                : 'Create Promotion'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
      <VideoCoverPickerModal
        visible={coverPickerVisible}
        onClose={() => setCoverPickerVisible(false)}
        videoUri={video?.uri}
        durationSec={videoDuration}
        title="Select promotion cover"
        onSelect={applyCoverFrame}
      />
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
  scroll: { maxHeight: 520 },
  scrollContent: { padding: 16, paddingBottom: 8 },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF7F0B',
    marginTop: 16,
    marginBottom: 4,
  },
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
  hint: { fontSize: 12, color: '#777', marginBottom: 8 },
  scopeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  scopeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FAFAFA',
  },
  scopeChipActive: { borderColor: '#FF7F0B', backgroundColor: '#FFF4EA' },
  scopeText: { fontSize: 13, color: '#333' },
  typeChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    backgroundColor: '#FAFAFA',
  },
  typeChipText: { fontSize: 13, fontWeight: '600', color: '#333' },
  typeChipTextActive: { color: '#FF7F0B' },
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tierFields: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tierInput: { flex: 1 },
  percentInput: { width: 56 },
  tierDash: { color: '#666' },
  addTierBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addTierText: { color: '#FF7F0B', fontWeight: '600' },
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
  menuHint: { fontSize: 13, color: '#888', marginVertical: 8 },
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
