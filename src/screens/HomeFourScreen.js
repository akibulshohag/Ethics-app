import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  CommonActions,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import Toast from 'react-native-toast-message';
import { appSetUser } from '../redux/actions/appSlice';
import { createRestaurantOrder } from '../services/orderService';
import { getPromotionsByUser } from '../services/promotionService';
import { getChannelProfile } from '../services/channelService';
import MapLocationPicker from '../components/MapLocationPicker';
import { distanceKmBetween, formatDistanceKm, resolveTaxChargeForDistanceKm } from '../utils/geoDistance';
import { getOwnerAreaKm } from '../utils/promotionUtils';
import { config } from '../../config';
import {
  getCurrentPositionSafe,
  reverseGeocode,
} from '../utils/geolocation';
import {
  getVendorOrderLimits,
  validateVendorOrderItems,
  adjustVendorItemQty,
} from '../utils/vendorOrderLimits';
import { browseAreaLabel, normalizeUkPostcode } from '../utils/ukPostcode';
import {
  formatUkPhoneDisplay,
  normalizeUkPhone,
  validUkPhoneNumber,
} from '../utils/ukPhone';
import {
  calcPercentDiscount,
  findBestAmountDiscount,
  findMatchingTier,
  formatFreeTaxChargeSummary,
  getFreeTaxChargeTier,
  isFreeTaxChargePromotion,
  matchesFulfillmentScope,
  OFFER_TYPES,
  parsePercentDiscountTiers,
  parsePromotionTiers,
} from '../utils/promotionUtils';

const ORDER_NOTE_MARKER = '||NOTE||';

const HomeFourScreen = ({ onBack }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const user = useSelector(state => state.app?.user) || {};
  const browseLocation = useSelector(state => state.app?.browseLocation);
  const { ownerId, items: paramItems = [], ownerName } = route.params || {};
  const returnToKey = route.params?.returnToKey;
  const initialItems = Array.isArray(paramItems) ? paramItems : [];

  const [items, setItems] = useState(
    initialItems.map(i => ({ ...i, quantity: Math.max(1, i.quantity || 1) })),
  );
  const [restaurantNote, setRestaurantNote] = useState('');
  const [customDeliveryAddress, setCustomDeliveryAddress] = useState('');
  const [isAddressEditing, setIsAddressEditing] = useState(false);
  const [addressDraft, setAddressDraft] = useState('');
  const [placing, setPlacing] = useState(false);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromotion, setAppliedPromotion] = useState(null);
  const [autoAmountDiscount, setAutoAmountDiscount] = useState(null);
  const [ownerPromotions, setOwnerPromotions] = useState([]);
  const [promoApplyError, setPromoApplyError] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [contactPhone, setContactPhone] = useState(String(user?.phone || '').trim());
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [mapPickerVisible, setMapPickerVisible] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [deliveryCoords, setDeliveryCoords] = useState(() => {
    const lat = Number(user?.latitude);
    const lng = Number(user?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    if (browseLocation?.lat != null && browseLocation?.lng != null) {
      return { lat: Number(browseLocation.lat), lng: Number(browseLocation.lng) };
    }
    return null;
  });
  const [deliveryPostcode, setDeliveryPostcode] = useState(
    String(user?.postcode || browseLocation?.postcode || '').trim(),
  );
  const [saveAddressToProfile, setSaveAddressToProfile] = useState(true);
  const [savingAddress, setSavingAddress] = useState(false);
  const [ownerProfile, setOwnerProfile] = useState(null);
  const [ownerProfileLoading, setOwnerProfileLoading] = useState(false);
  const [fulfillmentType, setFulfillmentType] = useState('delivery');

  const isPickup = fulfillmentType === 'collection';
  const isDelivery = fulfillmentType === 'delivery';

  const syncAndBackToMenu = useCallback(() => {
    const syncParams = {
      syncedCheckoutItems: items,
      syncedOwnerId: ownerId || null,
      syncedAt: Date.now(),
    };
    if (returnToKey) {
      try {
        navigation.dispatch({
          ...CommonActions.setParams(syncParams),
          source: returnToKey,
        });
      } catch (_) {
        // no-op fallback; still goBack below
      }
    }
    navigation.goBack();
  }, [navigation, items, ownerId, returnToKey]);

  const updateItemQty = (index, delta) => {
    setItems(prev => {
      const next = Array.isArray(prev) ? [...prev] : [];
      const row = next[index];
      if (!row) return prev;
      const currentQty = Math.max(0, Number(row.quantity) || 0);
      const { qty: nextQty, toast } = adjustVendorItemQty(
        currentQty,
        delta,
        vendorLimits,
      );
      if (toast) {
        Toast.show({ type: 'error', text1: 'Order quantity', text2: toast });
      }
      if (nextQty <= 0) {
        next.splice(index, 1);
      } else {
        next[index] = { ...row, quantity: nextQty };
      }
      return next;
    });
  };

  const subtotal = items.reduce(
    (sum, i) => sum + (Number(i.price) || 0) * (i.quantity || 1),
    0,
  );
  const currency = '£';

  const removePromo = () => {
    setAppliedPromotion(null);
    setPromoCodeInput('');
    setPromoApplyError('');
  };
  const restaurantName = ownerName || 'Restaurant';
  const profileAddress = String(user?.address || '').trim();
  const browseAddress = String(browseLocation?.addressText || '').trim();
  const browseFallback =
    browseAddress ||
    (browseLocation?.areaLabel && browseLocation?.postcode
      ? `${browseLocation.areaLabel}, ${browseLocation.postcode}`
      : String(browseLocation?.areaLabel || '').trim());
  const defaultDeliveryAddress = profileAddress || browseFallback;
  const selectedDeliveryAddress =
    String(customDeliveryAddress || '').trim() || defaultDeliveryAddress;
  const hasDeliveryAddress = String(selectedDeliveryAddress || '').trim().length > 0;
  const addressSourceLabel = customDeliveryAddress
    ? 'Address for this order'
    : profileAddress
      ? 'Your saved address'
      : browseFallback
        ? 'From your location'
        : 'Delivery address';
  const displayPostcode =
    deliveryPostcode ||
    String(user?.postcode || browseLocation?.postcode || '').trim();

  useEffect(() => {
    if (!customDeliveryAddress && !profileAddress && browseFallback) {
      setCustomDeliveryAddress(browseFallback);
      if (
        browseLocation?.lat != null &&
        browseLocation?.lng != null &&
        Number.isFinite(Number(browseLocation.lat)) &&
        Number.isFinite(Number(browseLocation.lng))
      ) {
        setDeliveryCoords({
          lat: Number(browseLocation.lat),
          lng: Number(browseLocation.lng),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seed once from browse/home location
  }, []);

  useEffect(() => {
    if (!ownerId) {
      setOwnerProfile(null);
      return;
    }
    let cancelled = false;
    setOwnerProfileLoading(true);
    getChannelProfile(ownerId, user?.id)
      .then(data => {
        if (!cancelled) setOwnerProfile(data || null);
      })
      .catch(() => {
        if (!cancelled) setOwnerProfile(null);
      })
      .finally(() => {
        if (!cancelled) setOwnerProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId, user?.id]);

  useEffect(() => {
    if (!ownerId) {
      setOwnerPromotions([]);
      return;
    }
    let cancelled = false;
    getPromotionsByUser(ownerId, 1, 50)
      .then(res => {
        if (!cancelled) setOwnerPromotions(res?.promotions ?? []);
      })
      .catch(() => {
        if (!cancelled) setOwnerPromotions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [ownerId]);

  const ownerDeliveryTime = String(ownerProfile?.deliveryTime || '').trim();
  const ownerDeliveryAreaKm = getOwnerAreaKm(ownerProfile, 'delivery');
  const ownerPickupAreaKm = getOwnerAreaKm(ownerProfile, 'pickup');
  const vendorLimits = useMemo(
    () => getVendorOrderLimits(ownerProfile),
    [ownerProfile],
  );
  const customerLatLng = useMemo(() => {
    if (deliveryCoords?.lat != null && deliveryCoords?.lng != null) {
      return { lat: deliveryCoords.lat, lng: deliveryCoords.lng };
    }
    const lat = Number(user?.latitude);
    const lng = Number(user?.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    if (browseLocation?.lat != null && browseLocation?.lng != null) {
      return {
        lat: Number(browseLocation.lat),
        lng: Number(browseLocation.lng),
      };
    }
    return null;
  }, [deliveryCoords, user?.latitude, user?.longitude, browseLocation]);
  const distanceToRestaurantKm = useMemo(() => {
    if (
      ownerProfile?.latitude == null ||
      ownerProfile?.longitude == null ||
      !customerLatLng
    ) {
      return null;
    }
    return distanceKmBetween(
      ownerProfile.latitude,
      ownerProfile.longitude,
      customerLatLng.lat,
      customerLatLng.lng,
    );
  }, [ownerProfile, customerLatLng]);
  const isOutsideDeliveryArea =
    isDelivery &&
    ownerDeliveryAreaKm != null &&
    distanceToRestaurantKm != null &&
    distanceToRestaurantKm > ownerDeliveryAreaKm;
  const isOutsidePickupArea =
    isPickup &&
    ownerPickupAreaKm != null &&
    distanceToRestaurantKm != null &&
    distanceToRestaurantKm > ownerPickupAreaKm;
  const fulfillmentKey = isPickup ? 'collection' : 'delivery';
  const taxChargeBeforePromo = useMemo(() => {
    if (isPickup) return 0;
    return resolveTaxChargeForDistanceKm(distanceToRestaurantKm, ownerProfile);
  }, [isPickup, distanceToRestaurantKm, ownerProfile]);

  const promoWaivesTax = useMemo(() => {
    if (!appliedPromotion || isPickup) return false;
    if (
      !matchesFulfillmentScope(
        appliedPromotion.fulfillmentScopes,
        fulfillmentKey,
      )
    ) {
      return false;
    }
    return !!getFreeTaxChargeTier(appliedPromotion, subtotal);
  }, [appliedPromotion, subtotal, isPickup, fulfillmentKey]);

  const taxChargeAmount = promoWaivesTax ? 0 : taxChargeBeforePromo;
  const billBeforeDiscount = subtotal + taxChargeAmount;

  const handleApplyPromo = useCallback(async () => {
    const code = (promoCodeInput || '').trim();
    if (!code) {
      setPromoApplyError('Enter a promo code');
      return;
    }
    if (!ownerId) {
      setPromoApplyError('Restaurant not set');
      return;
    }
    setApplyingPromo(true);
    setPromoApplyError('');
    try {
      const res = await getPromotionsByUser(ownerId, 1, 50);
      const list = res?.promotions ?? [];
      const now = new Date();
      const match = list.find(p => {
        if ((p.offerType || OFFER_TYPES.ORDER) !== OFFER_TYPES.ORDER) {
          return false;
        }
        const pCode = (p.promoCode || '').trim().toUpperCase();
        if (pCode !== code.toUpperCase()) return false;
        const start = p.startDate ? new Date(p.startDate) : null;
        const end = p.expireDate ? new Date(p.expireDate) : null;
        if (start && start > now) return false;
        if (end && end < now) return false;
        return true;
      });
      if (match) {
        const allTiers = parsePromotionTiers(match.discountTiers);
        const freeTaxTier = getFreeTaxChargeTier(match, subtotal);
        const percentTiers = parsePercentDiscountTiers(match.discountTiers);
        const isDeliveryFreePromo = isFreeTaxChargePromotion(match);

        if (
          (percentTiers.length || isDeliveryFreePromo) &&
          !matchesFulfillmentScope(match.fulfillmentScopes, fulfillmentKey)
        ) {
          setAppliedPromotion(null);
          setPromoApplyError(
            'This promo does not apply to your selected order type',
          );
          return;
        }

        if (isDeliveryFreePromo) {
          if (isPickup) {
            setAppliedPromotion(null);
            setPromoApplyError('This promo applies to delivery orders only');
            return;
          }
          if (!freeTaxTier) {
            setAppliedPromotion(null);
            setPromoApplyError(
              `Minimum order £${Number(allTiers.find(t => t.benefit)?.minValue || 0).toFixed(0)} required for free tax & charges`,
            );
            return;
          }
        }

        const tier = percentTiers.length
          ? findMatchingTier(percentTiers, billBeforeDiscount, 'amount')
          : null;
        if (percentTiers.length && !tier && !freeTaxTier) {
          setAppliedPromotion(null);
          setPromoApplyError('Order total does not qualify for this promo');
          return;
        }

        setAutoAmountDiscount(null);
        setAppliedPromotion({
          id: match.id,
          promoCode: match.promoCode,
          promoAmount: tier?.percent ?? match.promoAmount,
          offerType: OFFER_TYPES.ORDER,
          discountTiers: match.discountTiers,
          fulfillmentScopes: match.fulfillmentScopes,
          tierPercent: tier?.percent,
          freeTaxTier,
        });
        Toast.show({
          type: 'success',
          text1: `${match.promoCode} applied`,
          text2: freeTaxTier
            ? formatFreeTaxChargeSummary(freeTaxTier)
            : tier?.percent
              ? `${tier.percent}% off (bill tier)`
              : match.promoAmount != null
                ? `${match.promoAmount}% off`
                : 'Discount applied',
        });
      } else {
        setAppliedPromotion(null);
        setPromoApplyError('Invalid or expired promo code');
      }
    } catch (e) {
      setAppliedPromotion(null);
      setPromoApplyError('Could not verify promo code');
    } finally {
      setApplyingPromo(false);
    }
  }, [promoCodeInput, ownerId, fulfillmentKey, billBeforeDiscount, subtotal]);

  useEffect(() => {
    if (appliedPromotion) {
      setAutoAmountDiscount(null);
      return;
    }
    const match = findBestAmountDiscount(
      ownerPromotions,
      billBeforeDiscount,
      fulfillmentKey,
    );
    setAutoAmountDiscount(match);
  }, [
    appliedPromotion,
    ownerPromotions,
    billBeforeDiscount,
    fulfillmentKey,
  ]);

  const discountAmount = useMemo(() => {
    if (appliedPromotion?.offerType === OFFER_TYPES.ORDER) {
      const percentTiers = parsePercentDiscountTiers(
        appliedPromotion.discountTiers,
      );
      if (percentTiers.length) {
        if (
          !matchesFulfillmentScope(
            appliedPromotion.fulfillmentScopes,
            fulfillmentKey,
          )
        ) {
          return 0;
        }
        const tier = findMatchingTier(
          percentTiers,
          billBeforeDiscount,
          'amount',
        );
        if (tier) {
          return calcPercentDiscount(billBeforeDiscount, tier.percent);
        }
      }
      if (promoWaivesTax) {
        return 0;
      }
      return calcPercentDiscount(subtotal, appliedPromotion.promoAmount);
    }
    if (autoAmountDiscount?.percent) {
      return calcPercentDiscount(billBeforeDiscount, autoAmountDiscount.percent);
    }
    return 0;
  }, [
    appliedPromotion,
    autoAmountDiscount,
    subtotal,
    billBeforeDiscount,
    fulfillmentKey,
    promoWaivesTax,
  ]);
  const itemsNetAmount = Math.max(
    0,
    appliedPromotion ? subtotal - discountAmount : subtotal,
  );
  const total = Math.max(0, itemsNetAmount + taxChargeAmount);
  const displayTotal = total.toFixed(2);
  const displaySubtotal = subtotal.toFixed(2);
  const displayItemsNet = itemsNetAmount.toFixed(2);
  const displayDiscount = discountAmount.toFixed(2);
  const displayTaxCharge = isPickup
    ? '0.00'
    : distanceToRestaurantKm != null
      ? taxChargeAmount.toFixed(2)
      : null;
  const restaurantCollectionAddress = useMemo(() => {
    const label = ownerProfile?.nickname || ownerProfile?.name || restaurantName;
    const parts = [
      String(ownerProfile?.address || '').trim(),
      String(ownerProfile?.postcode || '').trim(),
    ].filter(Boolean);
    return parts.length ? `${label}, ${parts.join(', ')}` : label;
  }, [ownerProfile, restaurantName]);

  const applyDeliveryLocation = useCallback(
    (lat, lng, addressText, postcode = '') => {
      const addr = String(addressText || '').trim();
      if (!addr) return false;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setDeliveryCoords({ lat, lng });
      }
      const pc = normalizeUkPostcode(postcode) || String(postcode || '').trim();
      if (pc) setDeliveryPostcode(pc);
      if (isAddressEditing) {
        setAddressDraft(addr);
      } else {
        setCustomDeliveryAddress(addr);
      }
      return true;
    },
    [isAddressEditing],
  );

  const handleUseMyLocation = useCallback(() => {
    setGpsLoading(true);
    getCurrentPositionSafe(
      async pos => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const addr = await reverseGeocode(lat, lng);
          if (!addr) {
            Alert.alert(
              'Location',
              'Got GPS position but could not resolve a street address. Try Pick on map.',
            );
            return;
          }
          const pcMatch = addr.match(/([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})/i);
          const pc = pcMatch ? normalizeUkPostcode(pcMatch[1]) : '';
          if (applyDeliveryLocation(lat, lng, addr, pc)) {
            if (!isAddressEditing) setIsAddressEditing(false);
            Toast.show({
              type: 'success',
              text1: 'Location applied',
              text2: addr.split(',')[0] || addr,
            });
          }
        } finally {
          setGpsLoading(false);
        }
      },
      err => {
        setGpsLoading(false);
        Alert.alert('Location', err || 'Could not get your location.');
      },
      { enableHighAccuracy: true, timeout: 20000 },
    );
  }, [applyDeliveryLocation, isAddressEditing]);

  const handleMapLocationConfirm = useCallback(
    browse => {
      const addr =
        String(browse?.addressText || '').trim() ||
        browseAreaLabel({
          postcode: browse?.postcode,
          addressText: browse?.addressText,
          areaLabel: browse?.areaLabel,
        });
      applyDeliveryLocation(
        browse?.lat,
        browse?.lng,
        addr,
        browse?.postcode || '',
      );
      setMapPickerVisible(false);
      Toast.show({ type: 'success', text1: 'Delivery address updated' });
    },
    [applyDeliveryLocation],
  );
  const normalizedPhone = useMemo(
    () => normalizeUkPhone(contactPhone),
    [contactPhone],
  );
  const hasValidPhone = validUkPhoneNumber(contactPhone);
  const phoneError =
    phoneTouched && contactPhone.trim() && !hasValidPhone
      ? 'Enter a valid UK phone number (e.g. 07xxx xxxxxx)'
      : phoneTouched && !contactPhone.trim()
        ? 'Phone number is required for delivery contact'
        : '';
  const userName = user?.name || user?.nickname || '—';

  const startEditAddress = () => {
    setAddressDraft(selectedDeliveryAddress || '');
    setIsAddressEditing(true);
  };

  const cancelEditAddress = () => {
    setAddressDraft('');
    setIsAddressEditing(false);
  };

  const saveCustomAddress = async () => {
    const next = String(addressDraft || '').trim();
    if (!next) {
      Alert.alert('Address required', 'Please enter a valid delivery address.');
      return;
    }
    setCustomDeliveryAddress(next);
    setIsAddressEditing(false);

    if (saveAddressToProfile && user?.token && user?.id) {
      setSavingAddress(true);
      try {
        const body = {
          address: next,
          postcode: displayPostcode
            ? normalizeUkPostcode(displayPostcode) || displayPostcode
            : undefined,
        };
        if (deliveryCoords?.lat != null && deliveryCoords?.lng != null) {
          body.latitude = deliveryCoords.lat;
          body.longitude = deliveryCoords.lng;
        }
        const res = await fetch(`${config.apiBaseUrl}/users/${user.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify(body),
        });
        if (res.ok) {
          const data = await res.json();
          const u = data.userUpdate || {};
          dispatch(
            appSetUser({
              ...user,
              address: u.address ?? next,
              postcode: u.postcode ?? body.postcode ?? user.postcode,
              latitude: u.latitude ?? body.latitude ?? user.latitude,
              longitude: u.longitude ?? body.longitude ?? user.longitude,
            }),
          );
        }
      } catch (_) {
        // Order can still use custom address locally
      } finally {
        setSavingAddress(false);
      }
    }
  };

  const useDefaultAddress = () => {
    setCustomDeliveryAddress('');
    setAddressDraft('');
    setIsAddressEditing(false);
  };

  const handlePlaceOrder = async () => {
    if (!user?.token) {
      navigation.navigate('HomeSevenScreen');
      return;
    }
    const phone = normalizeUkPhone(contactPhone);
    if (!phone || !validUkPhoneNumber(phone)) {
      setPhoneTouched(true);
      Alert.alert(
        'Contact phone required',
        'Enter a valid UK mobile or landline number so the restaurant can reach you about your order.',
      );
      return;
    }
    if (!ownerId || items.length === 0) {
      Alert.alert('No items', 'Add items from the menu to place an order.');
      return;
    }

    const vendorQtyCheck = validateVendorOrderItems(items, vendorLimits);
    if (!vendorQtyCheck.ok) {
      Toast.show({
        type: 'error',
        text1: 'Order quantity',
        text2: vendorQtyCheck.message,
      });
      return;
    }

    let deliveryAddressPayload = '';
    if (isDelivery) {
      const addressText = String(selectedDeliveryAddress || '').trim();
      if (!addressText) {
        Alert.alert(
          'Delivery address required',
          'Add an address in your profile, tap Edit to enter a delivery address for this order, or use your default address when it is set.',
        );
        return;
      }
      if (ownerDeliveryAreaKm != null) {
        if (!customerLatLng) {
          Alert.alert(
            'Delivery location required',
            'Use My location or Pick on map so we can check you are within this restaurant delivery area.',
          );
          return;
        }
        if (isOutsideDeliveryArea) {
          Alert.alert(
            'Outside delivery area',
            `${restaurantName} only delivers within ${ownerDeliveryAreaKm} km. Your location is about ${distanceToRestaurantKm.toFixed(1)} km away.`,
          );
          return;
        }
      }
      const noteText = String(restaurantNote || '').trim();
      deliveryAddressPayload = noteText
        ? `${addressText}${ORDER_NOTE_MARKER}${noteText}`
        : addressText;
    } else {
      if (ownerPickupAreaKm != null) {
        if (!customerLatLng) {
          Alert.alert(
            'Location required',
            'Set your location in your profile so we can check you are within this restaurant pickup area.',
          );
          return;
        }
        if (isOutsidePickupArea) {
          Alert.alert(
            'Outside pickup area',
            `${restaurantName} only accepts pickup within ${ownerPickupAreaKm} km. Your location is about ${distanceToRestaurantKm.toFixed(1)} km away.`,
          );
          return;
        }
      }
      const noteText = String(restaurantNote || '').trim();
      const collectionBase = `Pick up — ${restaurantCollectionAddress}`;
      deliveryAddressPayload = noteText
        ? `${collectionBase}${ORDER_NOTE_MARKER}${noteText}`
        : collectionBase;
    }

    setPlacing(true);
    try {
      await createRestaurantOrder(user.token, {
        ownerId,
        items: items.map(i => ({
          menuItemId: i.menuItemId,
          quantity: i.quantity || 1,
        })),
        deliveryAddress: deliveryAddressPayload,
        customerPhone: phone,
        fulfillmentType,
        ...(customerLatLng && {
          customerLatitude: customerLatLng.lat,
          customerLongitude: customerLatLng.lng,
        }),
        ...(appliedPromotion?.promoCode && {
          promoCode: appliedPromotion.promoCode,
          promotionId: appliedPromotion.id,
        }),
        ...(autoAmountDiscount?.id &&
          !appliedPromotion && {
            promotionId: autoAmountDiscount.id,
          }),
      });
      dispatch(appSetUser({ ...user, phone }));
      Toast.show({ type: 'success', text1: 'Order placed successfully' });
      navigation.navigate('HomeFiveScreen');
    } catch (e) {
      console.warn('[HomeFour] place order failed:', e?.message, e);
      Alert.alert('Error', e?.message || 'Failed to place order.');
    } finally {
      setPlacing(false);
    }
  };

  const hasItems = items.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            onPress={() => (onBack ? onBack() : syncAndBackToMenu())}
            style={styles.backBtn}
          >
            <Icon name="chevron-left" size={18} color="#FFF" />
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {restaurantName}
          </Text>
        </View>
        {/* <Icon name="dots-vertical" size={24} color="#999" /> */}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
        <Text style={styles.deliveryTitle}>
          {isPickup ? 'Pick up from restaurant' : 'Delivery at home'}
        </Text>

        <View style={styles.fulfillmentToggleRow}>
          <TouchableOpacity
            style={[
              styles.fulfillmentBtn,
              isPickup && styles.fulfillmentBtnActive,
            ]}
            onPress={() => setFulfillmentType('collection')}
            activeOpacity={0.85}
          >
            <Icon
              name="storefront-outline"
              size={18}
              color={isPickup ? '#FFF' : '#1A1A1A'}
            />
            <Text
              style={[
                styles.fulfillmentBtnText,
                isPickup && styles.fulfillmentBtnTextActive,
              ]}
            >
              Pick Up
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.fulfillmentBtn,
              isDelivery && styles.fulfillmentBtnActive,
            ]}
            onPress={() => setFulfillmentType('delivery')}
            activeOpacity={0.85}
          >
            <Icon
              name="truck-delivery-outline"
              size={18}
              color={isDelivery ? '#FFF' : '#1A1A1A'}
            />
            <Text
              style={[
                styles.fulfillmentBtnText,
                isDelivery && styles.fulfillmentBtnTextActive,
              ]}
            >
              Delivery
            </Text>
          </TouchableOpacity>
        </View>

        {isDelivery &&
        (ownerDeliveryTime || ownerDeliveryAreaKm != null || ownerProfileLoading) ? (
          <View style={styles.deliveryInfoCard}>
            {ownerProfileLoading ? (
              <ActivityIndicator size="small" color="#F5A623" />
            ) : (
              <>
                {ownerDeliveryTime ? (
                  <View style={styles.deliveryInfoRow}>
                    <Icon name="clock-outline" size={18} color="#666" />
                    <Text style={styles.deliveryInfoText}>
                      Delivery time: {ownerDeliveryTime}
                    </Text>
                  </View>
                ) : null}
                {ownerDeliveryAreaKm != null ? (
                  <View style={styles.deliveryInfoRow}>
                    <Icon name="map-marker-radius" size={18} color="#666" />
                    <Text style={styles.deliveryInfoText}>
                      Delivers within {ownerDeliveryAreaKm} km
                      {distanceToRestaurantKm != null
                        ? ` · You are ${formatDistanceKm(distanceToRestaurantKm)} away`
                        : ''}
                    </Text>
                  </View>
                ) : null}
                {isOutsideDeliveryArea ? (
                  <Text style={styles.deliveryAreaWarning}>
                    Your delivery location is outside this restaurant area. Change
                    your address or pick a closer location to order.
                  </Text>
                ) : null}
              </>
            )}
          </View>
        ) : null}

        {isPickup &&
        (ownerPickupAreaKm != null || ownerProfileLoading) ? (
          <View style={styles.collectionInfoCard}>
            <Icon name="storefront-outline" size={22} color="#F5A623" />
            <View style={styles.collectionInfoBody}>
              <Text style={styles.collectionInfoTitle}>Pick up at restaurant</Text>
              <Text style={styles.collectionInfoText}>
                You will collect your order from the restaurant. No delivery charge
                applies.
              </Text>
              {ownerPickupAreaKm != null ? (
                <Text style={styles.collectionInfoText}>
                  Pickup within {ownerPickupAreaKm} km
                  {distanceToRestaurantKm != null
                    ? ` · You are ${formatDistanceKm(distanceToRestaurantKm)} away`
                    : ''}
                </Text>
              ) : null}
              {isOutsidePickupArea ? (
                <Text style={styles.deliveryAreaWarning}>
                  Your location is outside this restaurant pickup area. Update your
                  profile address to order for pickup.
                </Text>
              ) : null}
              <Text style={styles.collectionInfoAddress} numberOfLines={4}>
                {restaurantCollectionAddress}
              </Text>
            </View>
          </View>
        ) : isPickup ? (
          <View style={styles.collectionInfoCard}>
            <Icon name="storefront-outline" size={22} color="#F5A623" />
            <View style={styles.collectionInfoBody}>
              <Text style={styles.collectionInfoTitle}>Pick up at restaurant</Text>
              <Text style={styles.collectionInfoText}>
                You will collect your order from the restaurant. No delivery charge
                applies.
              </Text>
              <Text style={styles.collectionInfoAddress} numberOfLines={4}>
                {restaurantCollectionAddress}
              </Text>
            </View>
          </View>
        ) : null}

        <View style={styles.itemsCard}>
          {hasItems ? (
            items.map((item, index) => {
              const qty = item.quantity || 1;
              const price = Number(item.price) || 0;
              return (
                <View key={item.menuItemId || index} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Icon name="circle-slice-8" size={18} color="#F5A623" />
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemName}>
                        {item.itemName || 'Item'}
                      </Text>
                      {item.description ? (
                        <Text style={styles.itemDescription} numberOfLines={2}>
                          {item.description}
                        </Text>
                      ) : null}
                      <Text style={styles.itemPrice}>
                        {currency} {price.toFixed(2)}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.stepperContainer}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => updateItemQty(index, -1)}
                    >
                      <Text style={styles.stepperChar}>—</Text>
                    </TouchableOpacity>
                    <Text style={styles.stepperVal}>{qty}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => updateItemQty(index, 1)}
                    >
                      <Text style={styles.stepperChar}>+</Text>
                    </TouchableOpacity>
                  </View>
                  {/* <Text style={styles.itemLineTotal}>
                    {currency} {lineTotal.toFixed(2)}
                  </Text> */}
                </View>
              );
            })
          ) : (
            <>
              {[1, 2, 3].map((_, index) => (
                <View key={index} style={styles.itemRow}>
                  <View style={styles.itemInfo}>
                    <Icon name="circle-slice-8" size={18} color="#F5A623" />
                    <View style={styles.itemTextContainer}>
                      <Text style={styles.itemName}>—</Text>
                      <Text style={styles.itemPrice}>—</Text>
                    </View>
                  </View>
                  <Text style={styles.itemLineTotal}>—</Text>
                </View>
              ))}
            </>
          )}

          <TouchableOpacity
            style={styles.addItemsBtn}
            onPress={syncAndBackToMenu}
          >
            <Text style={styles.addItemsText}>+ Add items</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.noteContainer} onPress={() => {}}>
          <Icon name="notebook-outline" size={22} color="#1A1A1A" />
          <TextInput
            style={styles.noteInput}
            placeholder="Add a note for the restaurant"
            placeholderTextColor="#999"
            value={restaurantNote}
            onChangeText={setRestaurantNote}
          />
        </TouchableOpacity>

        <View style={styles.promoContainer}>
          <View style={styles.promoInputWrapper}>
            <TextInput
              placeholder="Promo code"
              placeholderTextColor="#999"
              style={styles.promoInput}
              value={promoCodeInput}
              onChangeText={v => {
                setPromoCodeInput(v);
                setPromoApplyError('');
              }}
              editable={!appliedPromotion}
              autoCapitalize="characters"
            />
            {appliedPromotion ? (
              <TouchableOpacity
                onPress={removePromo}
                style={styles.removePromoBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="close-circle" size={22} color="#F5A623" />
              </TouchableOpacity>
            ) : null}
          </View>
          {appliedPromotion ? (
            <Text style={styles.appliedPromoText}>
              {promoWaivesTax
                ? formatFreeTaxChargeSummary(
                    getFreeTaxChargeTier(appliedPromotion, subtotal),
                  )
                : appliedPromotion.tierPercent
                  ? `${appliedPromotion.tierPercent}% off`
                  : appliedPromotion.promoAmount != null &&
                      Number(appliedPromotion.promoAmount) > 0
                    ? `${appliedPromotion.promoAmount}% off`
                    : 'Applied'}
            </Text>
          ) : (
            <TouchableOpacity
              style={[
                styles.applyBtn,
                applyingPromo && styles.applyBtnDisabled,
              ]}
              onPress={handleApplyPromo}
              disabled={applyingPromo}
            >
              {applyingPromo ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.applyText}>Apply</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        {promoApplyError ? (
          <Text style={styles.promoErrorText}>{promoApplyError}</Text>
        ) : null}

        {isDelivery ? (
          <>
            <View style={styles.infoRow}>
              <View style={styles.infoLeft}>
                <Icon name="truck-delivery-outline" size={24} color="#1A1A1A" />
                <Text style={styles.infoText}>
                  {ownerDeliveryTime
                    ? `Delivery in ${ownerDeliveryTime}`
                    : 'Delivery in 42 mins'}
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color="#1A1A1A" />
            </View>

            <View style={styles.deliveryAddressCard}>
          <View style={styles.deliveryAddressHeader}>
            <View style={styles.deliveryAddressHeaderLeft}>
              <Icon name="home-map-marker" size={22} color="#F5A623" />
              <Text style={styles.deliveryAddressTitle}>Delivery address</Text>
            </View>
            {!isAddressEditing ? (
              <TouchableOpacity onPress={startEditAddress} activeOpacity={0.8}>
                <Text style={styles.addressEditText}>Edit</Text>
              </TouchableOpacity>
            ) : null}
          </View>
          <Text style={styles.deliveryAddressSub}>
            {addressSourceLabel}. Required so your order can be delivered.
          </Text>

          {!isAddressEditing ? (
            <>
              <Text style={styles.deliveryAddressValue} numberOfLines={4}>
                {hasDeliveryAddress
                  ? selectedDeliveryAddress
                  : 'No address yet — use My location or Edit'}
              </Text>
              {displayPostcode ? (
                <Text style={styles.deliveryPostcodeText}>
                  Postcode: {displayPostcode}
                </Text>
              ) : null}
              <View style={styles.locationActionRow}>
                <TouchableOpacity
                  style={[
                    styles.locationActionBtn,
                    gpsLoading && styles.locationActionBtnDisabled,
                  ]}
                  onPress={handleUseMyLocation}
                  disabled={gpsLoading}
                  activeOpacity={0.85}
                >
                  {gpsLoading ? (
                    <ActivityIndicator size="small" color="#1A1A1A" />
                  ) : (
                    <Icon name="crosshairs-gps" size={18} color="#1A1A1A" />
                  )}
                  <Text style={styles.locationActionText}>My location</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.locationActionBtn}
                  onPress={() => setMapPickerVisible(true)}
                  activeOpacity={0.85}
                >
                  <Icon name="map-marker-radius" size={18} color="#1A1A1A" />
                  <Text style={styles.locationActionText}>Pick on map</Text>
                </TouchableOpacity>
              </View>
              {customDeliveryAddress && profileAddress ? (
                <TouchableOpacity
                  onPress={useDefaultAddress}
                  activeOpacity={0.8}
                  style={styles.useDefaultBtn}
                >
                  <Text style={styles.useDefaultText}>
                    Use saved profile address
                  </Text>
                </TouchableOpacity>
              ) : null}
            </>
          ) : (
            <>
              <TextInput
                style={styles.customAddressInput}
                placeholder="House number, street, city, postcode"
                placeholderTextColor="#999"
                multiline
                value={addressDraft}
                onChangeText={setAddressDraft}
              />
              <View style={styles.locationActionRow}>
                <TouchableOpacity
                  style={[
                    styles.locationActionBtn,
                    gpsLoading && styles.locationActionBtnDisabled,
                  ]}
                  onPress={handleUseMyLocation}
                  disabled={gpsLoading}
                  activeOpacity={0.85}
                >
                  {gpsLoading ? (
                    <ActivityIndicator size="small" color="#1A1A1A" />
                  ) : (
                    <Icon name="crosshairs-gps" size={18} color="#1A1A1A" />
                  )}
                  <Text style={styles.locationActionText}>My location</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.locationActionBtn}
                  onPress={() => setMapPickerVisible(true)}
                  activeOpacity={0.85}
                >
                  <Icon name="map-marker-radius" size={18} color="#1A1A1A" />
                  <Text style={styles.locationActionText}>Pick on map</Text>
                </TouchableOpacity>
              </View>
              {user?.token ? (
                <TouchableOpacity
                  style={styles.saveProfileRow}
                  onPress={() => setSaveAddressToProfile(v => !v)}
                  activeOpacity={0.8}
                >
                  <Icon
                    name={
                      saveAddressToProfile
                        ? 'checkbox-marked'
                        : 'checkbox-blank-outline'
                    }
                    size={22}
                    color="#F5A623"
                  />
                  <Text style={styles.saveProfileText}>
                    Save as my default address
                  </Text>
                </TouchableOpacity>
              ) : null}
              <View style={styles.customAddressActions}>
                <TouchableOpacity
                  onPress={cancelEditAddress}
                  style={styles.addressCancelBtn}
                  activeOpacity={0.8}
                  disabled={savingAddress}
                >
                  <Text style={styles.addressCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={saveCustomAddress}
                  style={styles.addressSaveBtn}
                  activeOpacity={0.8}
                  disabled={savingAddress}
                >
                  {savingAddress ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.addressSaveText}>Save</Text>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}

          {!hasDeliveryAddress && user?.token ? (
            <View style={styles.addressWarningBanner}>
              <Icon name="alert-circle-outline" size={20} color="#C62828" />
              <Text style={styles.addressWarningText}>
                Add your delivery address with My location, Pick on map, or
                Edit before placing your order.
              </Text>
            </View>
          ) : null}
        </View>
          </>
        ) : null}

        <View style={styles.contactCard}>
          <Text style={styles.contactTitle}>Contact details</Text>
          <Text style={styles.contactSub}>
            {isPickup
              ? 'Required so the restaurant can reach you about your order.'
              : 'Required so the restaurant can reach you about delivery.'}
          </Text>
          <Text style={styles.contactLabel}>Name</Text>
          <Text style={styles.contactValue}>{userName}</Text>
          <Text style={styles.contactLabel}>Mobile number</Text>
          <TextInput
            style={[
              styles.phoneInput,
              phoneError ? styles.phoneInputError : null,
            ]}
            placeholder="07xxx xxxxxx"
            placeholderTextColor="#999"
            keyboardType="phone-pad"
            value={contactPhone}
            onChangeText={v => {
              setContactPhone(v);
              if (!phoneTouched) setPhoneTouched(true);
            }}
            onBlur={() => setPhoneTouched(true)}
          />
          {hasValidPhone && normalizedPhone ? (
            <Text style={styles.phoneHint}>
              {formatUkPhoneDisplay(normalizedPhone)}
            </Text>
          ) : null}
          {phoneError ? (
            <Text style={styles.phoneErrorText}>{phoneError}</Text>
          ) : null}
          {!hasValidPhone && user?.token ? (
            <View style={styles.phoneWarningBanner}>
              <Icon name="alert-circle-outline" size={18} color="#C62828" />
              <Text style={styles.phoneWarningText}>
                Add a valid UK phone number before placing your order.
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.billSection}>
          <View style={styles.billHeader}>
            <Icon name="calendar-text-outline" size={24} color="#1A1A1A" />
            <View style={styles.billTitleContainer}>
              <Text style={styles.billMainTitle}>Total Bill</Text>
              <Text style={styles.billSubTitle}>Incl. taxes and charges</Text>
            </View>
            <Text style={styles.totalAmountMain}>
              {currency} {displayTotal}
            </Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Items Bill</Text>
            <Text style={styles.billValue}>
              {currency} {displaySubtotal}
            </Text>
          </View>
          {discountAmount > 0 || promoWaivesTax ? (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>
                {appliedPromotion?.promoCode
                  ? `Promo (${appliedPromotion.promoCode})${
                      promoWaivesTax
                        ? ' · tax & charges free'
                        : appliedPromotion.tierPercent
                          ? ` ${appliedPromotion.tierPercent}% off`
                          : appliedPromotion.promoAmount != null &&
                              Number(appliedPromotion.promoAmount) > 0
                            ? ` ${appliedPromotion.promoAmount}% off`
                            : ''
                    }`
                  : `Amount discount (${autoAmountDiscount?.percent || 0}% off)`}
              </Text>
              {discountAmount > 0 ? (
                <Text style={styles.billValueDiscount}>
                  -{currency} {displayDiscount}
                </Text>
              ) : (
                <Text style={styles.billValueDiscount}>Free</Text>
              )}
            </View>
          ) : null}
          {appliedPromotion && discountAmount > 0 ? (
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Items after promo</Text>
              <Text style={styles.billValue}>
                {currency} {displayItemsNet}
              </Text>
            </View>
          ) : null}
          <View style={styles.billRow}>
            <Text style={styles.billLabel}>taxes and charges</Text>
            <Text style={styles.billValue}>
              {displayTaxCharge != null
                ? `${currency} ${displayTaxCharge}`
                : '—'}
            </Text>
          </View>
          {isDelivery && distanceToRestaurantKm != null && taxChargeAmount > 0 ? (
            <Text style={styles.billHint}>
              Based on {formatDistanceKm(distanceToRestaurantKm)} from restaurant
            </Text>
          ) : null}
          <View style={styles.billTotalDivider} />
          <View style={styles.billRow}>
            <Text style={styles.billTotalLabel}>Total</Text>
            <Text style={styles.billTotalValue}>
              {currency} {displayTotal}
            </Text>
          </View>
          <Text style={styles.billFormulaHint}>
            Items {appliedPromotion && discountAmount > 0 ? 'after promo' : 'bill'}
            {autoAmountDiscount && !appliedPromotion
              ? ' + taxes/charges − amount discount'
              : ' + taxes/charges'}
            {appliedPromotion && discountAmount > 0 ? ' (promo on items)' : ''}
          </Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.paymentMethod}>
          <TouchableOpacity style={styles.payUsingBtn}>
            <Text style={styles.payUsingLabel}>Pay Using</Text>
            <Icon name="menu-up" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.methodName}>Credit Card</Text>
        </View>

        <TouchableOpacity
          style={[
            styles.placeOrderBtn,
            (!hasItems ||
              !ownerId ||
              (isDelivery && !!user?.token && !hasDeliveryAddress) ||
              (!!user?.token && !hasValidPhone) ||
              (isDelivery && isOutsideDeliveryArea) ||
              (isPickup && isOutsidePickupArea)) &&
              styles.placeOrderBtnDisabled,
          ]}
          onPress={handlePlaceOrder}
          disabled={
            placing ||
            !hasItems ||
            !ownerId ||
            (isDelivery && !!user?.token && !hasDeliveryAddress) ||
            (!!user?.token && !hasValidPhone) ||
            (isDelivery && isOutsideDeliveryArea) ||
            (isPickup && isOutsidePickupArea)
          }
        >
          <View>
            <Text style={styles.footerPrice}>
              {currency} {displayTotal}
            </Text>
            <Text style={styles.footerTotalLabel}>Total Bill</Text>
          </View>
          {placing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <Text style={styles.placeOrderText}>Place Order</Text>
          )}
        </TouchableOpacity>
      </View>

      <MapLocationPicker
        visible={mapPickerVisible}
        onClose={() => setMapPickerVisible(false)}
        onConfirm={handleMapLocationConfirm}
        initialLat={deliveryCoords?.lat ?? browseLocation?.lat ?? user?.latitude}
        initialLng={deliveryCoords?.lng ?? browseLocation?.lng ?? user?.longitude}
        initialPostcode={displayPostcode}
        initialAddress={addressDraft || selectedDeliveryAddress}
        title="Delivery address"
        requirePostcode={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomColor: '#F0F0F0',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  backBtn: {
    backgroundColor: '#1E1E1E',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginRight: 12,
  },
  backText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A', flex: 1 },
  content: { flex: 1, paddingHorizontal: 15 },
  deliveryTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 15,
  },
  fulfillmentToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    marginBottom: 4,
  },
  fulfillmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    backgroundColor: '#FFF',
  },
  fulfillmentBtnActive: {
    backgroundColor: '#1E1E1E',
    borderColor: '#1E1E1E',
  },
  fulfillmentBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  fulfillmentBtnTextActive: {
    color: '#FFF',
  },
  collectionInfoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    marginBottom: 4,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E6D2',
    backgroundColor: '#FFFBF5',
    gap: 10,
  },
  collectionInfoBody: { flex: 1 },
  collectionInfoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 4,
  },
  collectionInfoText: {
    fontSize: 13,
    color: '#667085',
    lineHeight: 18,
    marginBottom: 8,
  },
  collectionInfoAddress: {
    fontSize: 14,
    color: '#1A1A1A',
    lineHeight: 20,
    fontWeight: '600',
  },
  deliveryInfoCard: {
    marginTop: 12,
    marginBottom: 4,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E6D2',
    backgroundColor: '#FFFBF5',
  },
  deliveryInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  deliveryInfoText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
    color: '#444',
    lineHeight: 18,
  },
  deliveryAreaWarning: {
    marginTop: 8,
    fontSize: 12,
    color: '#B45309',
    lineHeight: 17,
  },
  deliverySub: { fontSize: 13, color: '#777', marginTop: 4, marginBottom: 12 },
  deliveryAddressCard: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    backgroundColor: '#FAFAFA',
  },
  deliveryAddressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deliveryAddressHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryAddressTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
    marginLeft: 6,
  },
  deliveryAddressSub: {
    fontSize: 12,
    color: '#667085',
    marginTop: 6,
    marginBottom: 10,
    lineHeight: 17,
  },
  deliveryAddressValue: {
    fontSize: 15,
    color: '#1A1A1A',
    lineHeight: 22,
    fontWeight: '500',
  },
  deliveryPostcodeText: {
    fontSize: 13,
    color: '#667085',
    marginTop: 6,
  },
  locationActionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
  },
  locationActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    backgroundColor: '#FFF',
    marginRight: 10,
    marginBottom: 8,
  },
  locationActionBtnDisabled: { opacity: 0.6 },
  locationActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1A1A1A',
    marginLeft: 6,
  },
  saveProfileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  saveProfileText: {
    fontSize: 13,
    color: '#344054',
    flex: 1,
    marginLeft: 8,
  },
  addressEditText: { color: '#F5A623', fontWeight: '700', fontSize: 13 },
  useDefaultBtn: { alignSelf: 'flex-start', marginTop: 10 },
  useDefaultText: { color: '#667085', fontSize: 12, fontWeight: '600' },
  customAddressInput: {
    minHeight: 70,
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#1A1A1A',
    textAlignVertical: 'top',
  },
  customAddressActions: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  addressCancelBtn: { paddingHorizontal: 12, paddingVertical: 8 },
  addressCancelText: { color: '#667085', fontWeight: '600' },
  addressSaveBtn: {
    backgroundColor: '#F5A623',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginLeft: 8,
  },
  addressSaveText: { color: '#FFF', fontWeight: '700' },
  addressWarningBanner: {
    marginTop: 12,
    marginBottom: 0,
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#FFEBEE',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  addressWarningText: {
    flex: 1,
    marginLeft: 8,
    color: '#C62828',
    fontSize: 13,
    lineHeight: 18,
  },
  contactCard: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    backgroundColor: '#FAFAFA',
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  contactSub: {
    fontSize: 12,
    color: '#667085',
    marginTop: 4,
    marginBottom: 12,
  },
  contactLabel: {
    fontSize: 12,
    color: '#98A2B3',
    fontWeight: '600',
    marginBottom: 4,
  },
  contactValue: {
    fontSize: 15,
    color: '#1A1A1A',
    marginBottom: 12,
  },
  phoneInput: {
    borderWidth: 1,
    borderColor: '#E4E7EC',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1A1A1A',
    backgroundColor: '#FFF',
  },
  phoneInputError: {
    borderColor: '#E53935',
  },
  phoneHint: {
    marginTop: 6,
    fontSize: 12,
    color: '#667085',
  },
  phoneErrorText: {
    marginTop: 6,
    fontSize: 12,
    color: '#C62828',
  },
  phoneWarningBanner: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#FFEBEE',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  phoneWarningText: {
    flex: 1,
    marginLeft: 8,
    color: '#C62828',
    fontSize: 12,
    lineHeight: 17,
  },
  itemsCard: {
    backgroundColor: '#F2F6F8',
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  itemInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  itemTextContainer: { marginLeft: 10, flex: 1 },
  itemName: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A' },
  itemDescription: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
    marginTop: 2,
  },
  itemPrice: { fontSize: 14, color: '#666' },
  stepperContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5A623',
    borderRadius: 8,
    alignItems: 'center',
    height: 32,
    paddingHorizontal: 8,
    marginHorizontal: 10,
  },
  stepperBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  stepperChar: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  stepperCharDisabled: { color: 'rgba(255,255,255,0.5)' },
  stepperVal: {
    color: '#FFF',
    fontWeight: 'bold',
    marginHorizontal: 8,
    fontSize: 15,
    minWidth: 20,
    textAlign: 'center',
  },
  itemLineTotal: { fontSize: 14, fontWeight: '600', color: '#1A1A1A' },
  addItemsBtn: { marginTop: 5 },
  addItemsText: { color: '#F5A623', fontWeight: 'bold', fontSize: 15 },
  noteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  noteInput: {
    flex: 1,
    marginLeft: 10,
    color: '#424242',
    fontSize: 15,
    padding: 0,
    fontWeight: '600',
  },
  promoContainer: {
    flexDirection: 'row',
    backgroundColor: '#F2F6F8',
    borderRadius: 12,
    padding: 10,
    marginBottom: 25,
    alignItems: 'center',
  },
  promoInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 8,
    height: 45,
    paddingHorizontal: 15,
  },
  promoInput: { flex: 1, fontSize: 14, color: '#333', padding: 0 },
  removePromoBtn: { marginLeft: 8 },
  appliedPromoText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '600',
    color: '#0d8a0d',
  },
  applyBtn: {
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    minWidth: 80,
    alignItems: 'center',
  },
  applyBtnDisabled: { opacity: 0.7 },
  applyText: { color: '#2E7D32', fontWeight: 'bold', fontSize: 16 },
  promoErrorText: {
    fontSize: 13,
    color: '#c62828',
    marginTop: -18,
    marginBottom: 8,
  },
  billValueDiscount: { color: '#2E7D32', fontSize: 14, fontWeight: '600' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  infoLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  infoText: { marginLeft: 15, fontSize: 15, color: '#333', flex: 1 },
  billSection: { marginTop: 25 },
  billHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  billTitleContainer: { flex: 1, marginLeft: 15 },
  billMainTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  billSubTitle: { fontSize: 13, color: '#999' },
  totalAmountMain: { fontSize: 20, fontWeight: 'bold', color: '#1A1A1A' },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingLeft: 40,
    marginBottom: 10,
  },
  billLabel: { color: '#777', fontSize: 14 },
  billValue: { color: '#777', fontSize: 14 },
  billHint: { color: '#999', fontSize: 12, marginTop: 4, paddingLeft: 40 },
  billTotalDivider: {
    height: 1,
    backgroundColor: '#E8E8E8',
    marginLeft: 40,
    marginTop: 8,
    marginBottom: 12,
  },
  billTotalLabel: { color: '#1A1A1A', fontSize: 16, fontWeight: '700' },
  billTotalValue: { color: '#1A1A1A', fontSize: 16, fontWeight: '700' },
  billFormulaHint: {
    color: '#999',
    fontSize: 12,
    paddingLeft: 40,
    marginTop: 4,
  },
  bottomSpacer: { height: 120 },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentMethod: {
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 15,
    padding: 10,
    width: '35%',
  },
  payUsingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  payUsingLabel: { fontSize: 12, color: '#999' },
  methodName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginTop: 2,
  },
  placeOrderBtn: {
    backgroundColor: '#F5A623',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 15,
    paddingHorizontal: 20,
    height: 70,
    width: '60%',
  },
  placeOrderBtnDisabled: { opacity: 0.6 },
  footerPrice: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
  footerTotalLabel: { color: '#FFF', fontSize: 12, opacity: 0.8 },
  placeOrderText: { color: '#FFF', fontSize: 14, fontWeight: 'bold' },
});

export default HomeFourScreen;
