import React, { useEffect, useState } from 'react';
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
import VideoCoverPickerModal from './VideoCoverPickerModal';
import VideoCoverSuggestionsRow from './VideoCoverSuggestionsRow';
import { frameToThumbnailAsset, thumbnailFromVideoFrame } from '../utils/videoThumbnail';
import { OFFER_TYPES, parsePromotionTiers, combineDateAndTime, normalizeHhMm, parseScheduleSlots } from '../utils/promotionUtils';
import { normalizeUploadUri } from '../utils/helper';
import PromotionScheduleEditor from './PromotionScheduleEditor';

const toMediaAsset = asset => ({
  uri: normalizeUploadUri(asset.uri),
  type: asset.type || 'image/jpeg',
  name: asset.name || asset.fileName || 'media.jpg',
});

const emptyTier = () => ({ minValue: '', maxValue: '', percent: '' });

const formatDateForInput = d => {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const CreateTierDiscountModal = ({
  visible,
  onClose,
  onSuccess,
  userId,
  offerType = OFFER_TYPES.AMOUNT,
  promotionToEdit = null,
}) => {
  const token = useSelector(state => state.app?.user?.token);
  const isBooking = offerType === OFFER_TYPES.BOOKING;
  const isEdit = Boolean(promotionToEdit?.id);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [expireDate, setExpireDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [scheduleSlots, setScheduleSlots] = useState([]);
  const [thumbnail, setThumbnail] = useState(null);
  const [video, setVideo] = useState(null);
  const [videoDuration, setVideoDuration] = useState(0);
  const [coverPickerVisible, setCoverPickerVisible] = useState(false);
  const [tiers, setTiers] = useState([emptyTier()]);
  const [collectionChecked, setCollectionChecked] = useState(false);
  const [deliveryChecked, setDeliveryChecked] = useState(false);
  const [bothChecked, setBothChecked] = useState(false);
  const [tierMetricType, setTierMetricType] = useState('people');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    if (isEdit) {
      const promo = promotionToEdit;
      setTitle(String(promo.title || ''));
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
      } else setThumbnail(null);
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
      setTierMetricType(promo.tierMetricType === 'amount' ? 'amount' : 'people');
      const parsed = parsePromotionTiers(promo.discountTiers);
      setTiers(
        parsed.length
          ? parsed.map(t => ({
              minValue: String(t.minValue ?? ''),
              maxValue: t.maxValue != null ? String(t.maxValue) : '',
              percent: String(t.percent ?? ''),
            }))
          : [emptyTier()],
      );
      const scopes = Array.isArray(promo.fulfillmentScopes)
        ? promo.fulfillmentScopes
        : [];
      setBothChecked(scopes.includes('both'));
      setCollectionChecked(scopes.includes('collection'));
      setDeliveryChecked(scopes.includes('delivery'));
    } else {
      reset();
      const today = formatDateForInput(new Date());
      setStartDate(today);
      const nextMonth = new Date();
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      setExpireDate(formatDateForInput(nextMonth));
    }
  }, [visible, isEdit, promotionToEdit]);

  const reset = () => {
    setTitle('');
    setStartDate('');
    setExpireDate('');
    setStartTime('');
    setEndTime('');
    setScheduleSlots([]);
    setThumbnail(null);
    setVideo(null);
    setVideoDuration(0);
    setCoverPickerVisible(false);
    setTiers([emptyTier()]);
    setCollectionChecked(false);
    setDeliveryChecked(false);
    setBothChecked(false);
    setTierMetricType('people');
    setSubmitting(false);
  };

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

  const handleClose = () => {
    if (!submitting) {
      reset();
      onClose?.();
    }
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

  const submit = async () => {
    if (!userId || !token) {
      Alert.alert('Login required', 'Please log in to create a promotion.');
      return;
    }
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      Alert.alert('Title required', 'Please enter a promotion title.');
      return;
    }
    if (!thumbnail?.uri && !video?.uri) {
      Alert.alert(
        'Media required',
        'Please add a thumbnail image or select a video.',
      );
      return;
    }
    if (!isBooking) {
      const scopes = buildFulfillmentScopes();
      if (!scopes.length) {
        Alert.alert(
          'Fulfillment required',
          'Select Collection, Delivery, or Both.',
        );
        return;
      }
    }
    const parsedTiers = tiers
      .map(t => ({
        minValue: parseFloat(t.minValue),
        maxValue: t.maxValue.trim() ? parseFloat(t.maxValue) : null,
        percent: parseFloat(t.percent),
        metricType: isBooking ? tierMetricType : 'amount',
      }))
      .filter(
        t =>
          Number.isFinite(t.minValue) &&
          Number.isFinite(t.percent) &&
          t.percent > 0,
      );
    if (!parsedTiers.length) {
      Alert.alert('Tiers required', 'Add at least one valid discount tier.');
      return;
    }
    for (const t of parsedTiers) {
      if (t.maxValue != null && t.maxValue < t.minValue) {
        Alert.alert('Invalid tier', 'Max value must be greater than min value.');
        return;
      }
    }
    const start = startDate.trim();
    const expire = expireDate.trim();
    const startD = combineDateAndTime(start, startTime, false);
    const expireD = combineDateAndTime(expire, endTime, true);
    if (!start || !expire || !startD || !expireD) {
      Alert.alert('Invalid dates', 'Select start and expire date.');
      return;
    }
    if (expireD <= startD) {
      Alert.alert(
        'Invalid dates',
        'Expire date and time must be after start date and time.',
      );
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        userId,
        token,
        title: trimmedTitle,
        offerType,
        startDate: startD.toISOString(),
        expireDate: expireD.toISOString(),
        startTime: normalizeHhMm(startTime) || '',
        endTime: normalizeHhMm(endTime) || '',
        scheduleSlots,
        discountTiers: parsedTiers,
        fulfillmentScopes: isBooking ? [] : buildFulfillmentScopes(),
        tierMetricType: isBooking ? tierMetricType : undefined,
        promoAmount: 0,
        promoCode: '',
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
              duration: videoDuration || undefined,
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
      Alert.alert(
        isEdit ? 'Save failed' : 'Failed',
        err?.message || `Could not ${isEdit ? 'save' : 'create'} promotion.`,
      );
    } finally {
      setSubmitting(false);
    }
  };

  const metricLabel = isBooking
    ? tierMetricType === 'amount'
      ? 'Amount (£)'
      : 'People'
    : 'Bill amount (£)';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>
              {isEdit
                ? isBooking
                  ? 'Edit Booking Discount'
                  : 'Edit Amount Discount'
                : isBooking
                ? 'Booking Discount'
                : 'Amount Discount'}
            </Text>
            <TouchableOpacity onPress={handleClose} disabled={submitting}>
              <MaterialCommunityIcons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Thumbnail / Video Upload</Text>
            <TouchableOpacity
              style={styles.mediaBox}
              onPress={() => {
                if (submitting) return;
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
              disabled={submitting}
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
                    disabled={submitting}
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
                      <View style={styles.durationBadge}>
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
                    disabled={submitting}
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

            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Weekend bill discount"
              editable={!submitting}
            />

            {!isBooking ? (
              <>
                <Text style={styles.label}>Applies to</Text>
                <View style={styles.scopeRow}>
                  <TouchableOpacity
                    style={[styles.scopeChip, collectionChecked && styles.scopeChipActive]}
                    onPress={() => toggleScope('collection')}
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
                  >
                    <MaterialCommunityIcons
                      name={bothChecked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                      size={20}
                      color={bothChecked ? '#FF7F0B' : '#666'}
                    />
                    <Text style={styles.scopeText}>Both</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.label}>Discount based on</Text>
                <View style={styles.scopeRow}>
                  <TouchableOpacity
                    style={[styles.scopeChip, tierMetricType === 'people' && styles.scopeChipActive]}
                    onPress={() => setTierMetricType('people')}
                  >
                    <Text style={styles.scopeText}>People count</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.scopeChip, tierMetricType === 'amount' && styles.scopeChipActive]}
                    onPress={() => setTierMetricType('amount')}
                  >
                    <Text style={styles.scopeText}>Amount (£)</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <Text style={styles.label}>Discount tiers</Text>
            <Text style={styles.hint}>
              Add ranges like 30–50 → 5%, 51–70 → 10%. Leave max empty for open-ended.
            </Text>
            {tiers.map((tier, index) => (
              <View key={`tier-${index}`} style={styles.tierRow}>
                <View style={styles.tierFields}>
                  <TextInput
                    style={[styles.input, styles.tierInput]}
                    value={tier.minValue}
                    onChangeText={v => updateTier(index, 'minValue', v)}
                    placeholder={`Min ${metricLabel}`}
                    keyboardType="decimal-pad"
                  />
                  <Text style={styles.tierDash}>–</Text>
                  <TextInput
                    style={[styles.input, styles.tierInput]}
                    value={tier.maxValue}
                    onChangeText={v => updateTier(index, 'maxValue', v)}
                    placeholder="Max"
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[styles.input, styles.percentInput]}
                    value={tier.percent}
                    onChangeText={v => updateTier(index, 'percent', v)}
                    placeholder="%"
                    keyboardType="decimal-pad"
                  />
                </View>
                {tiers.length > 1 ? (
                  <TouchableOpacity onPress={() => removeTier(index)}>
                    <MaterialCommunityIcons name="minus-circle" size={22} color="#C62828" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ))}
            <TouchableOpacity style={styles.addTierBtn} onPress={addTier}>
              <MaterialCommunityIcons name="plus-circle" size={20} color="#FF7F0B" />
              <Text style={styles.addTierText}>Add another tier</Text>
            </TouchableOpacity>

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
              disabled={submitting}
            />
          </ScrollView>
          <TouchableOpacity
            style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
            onPress={submit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>
                {submitting
                  ? isEdit
                    ? 'Saving...'
                    : 'Creating...'
                  : isEdit
                  ? 'Save promotion'
                  : 'Create promotion'}
              </Text>
            )}
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
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 16, borderTopRightRadius: 16, maxHeight: '92%' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#222' },
  body: { paddingHorizontal: 16, paddingBottom: 8 },
  label: { fontSize: 14, fontWeight: '600', color: '#333', marginTop: 12, marginBottom: 6 },
  hint: { fontSize: 12, color: '#777', marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#222',
    backgroundColor: '#FAFAFA',
  },
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
  tierRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  tierFields: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 },
  tierInput: { flex: 1 },
  percentInput: { width: 56 },
  tierDash: { color: '#666' },
  addTierBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  addTierText: { color: '#FF7F0B', fontWeight: '600' },
  submitBtn: {
    margin: 16,
    backgroundColor: '#FF7F0B',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: { color: '#fff', fontWeight: '700', fontSize: 16 },
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
  durationText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  removeBtn: { position: 'absolute', top: 6, right: 6 },
  placeholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { marginTop: 6, fontSize: 14, color: '#999' },
});

export default CreateTierDiscountModal;
