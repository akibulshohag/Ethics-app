import axios from 'axios';
import { config } from '../../config';

const API_URL = `${config.apiBaseUrl}/promotions`;

const getAuthHeaders = () => {
  try {
    const { store } = require('../redux');
    const token = store.getState()?.app?.user?.token;
    if (token) {
      return { Authorization: `Bearer ${token}` };
    }
  } catch (e) {}
  return {};
};

/**
 * Get promotions from owners or vendors near the given location.
 * creatorRole: 'owner' | 'vendor' — show promotions created by that role nearby. Default 'owner'.
 * Returns { promotions: [...], pagination: { total, page, limit, totalPages } }
 */
export const getNearbyPromotions = async (
  latitude,
  longitude,
  radiusKm = 50,
  page = 1,
  limit = 50,
  creatorRole = 'owner',
) => {
  if (
    latitude == null ||
    longitude == null ||
    Number.isNaN(latitude) ||
    Number.isNaN(longitude)
  ) {
    return {
      promotions: [],
      pagination: { total: 0, page: 1, limit, totalPages: 0 },
    };
  }
  try {
    const response = await axios.get(`${API_URL}/nearby`, {
      params: { latitude, longitude, radiusKm, page, limit, creatorRole },
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching nearby promotions:', error);
    return {
      promotions: [],
      pagination: { total: 0, page: 1, limit, totalPages: 0 },
    };
  }
};

/**
 * Get promotions by owner user ID (public, for profile Promotions tab).
 * Returns { promotions: [...], pagination: { total, page, limit, totalPages } }
 */
export const getPromotionsByUser = async (
  userId,
  page = 1,
  limit = 50,
  offerType,
) => {
  if (!userId)
    return {
      promotions: [],
      pagination: { total: 0, page: 1, limit, totalPages: 0 },
    };
  try {
    const response = await axios.get(`${API_URL}/user/${userId}`, {
      params: { page, limit, ...(offerType ? { offerType } : {}) },
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching promotions:', error);
    return {
      promotions: [],
      pagination: { total: 0, page: 1, limit, totalPages: 0 },
    };
  }
};

/**
 * Create promotion (JSON body). Owner only. Use uploadPromotion when you have thumbnail/video files.
 */
export const createPromotion = async data => {
  if (!data?.userId) {
    throw new Error('User ID is required. Please log in.');
  }
  try {
    const response = await axios.post(API_URL, data, {
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    });
    return response.data;
  } catch (error) {
    const msg =
      error.response?.data?.message ||
      (Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(' ')
        : null) ||
      error.message ||
      'Failed to create promotion';
    throw new Error(msg);
  }
};

/**
 * Upload promotion with thumbnail (required) and optional video. Same pattern as post upload.
 * data: { userId, title, description?, promoAmount, promoCode, startDate, expireDate, menuItemIds?, thumbnailUri, thumbnailType?, thumbnailName?, videoUri?, videoType?, videoName?, duration?, token? }
 * Pass token when calling (e.g. from Redux) so auth is guaranteed; otherwise getAuthHeaders() is used.
 */
export const uploadPromotion = async data => {
  if (!data?.userId) {
    throw new Error('User ID is required. Please log in.');
  }
  if (!data?.title?.trim()) {
    throw new Error('Title is required.');
  }
  if (!data?.thumbnailUri && !data?.videoUri) {
    throw new Error('Either thumbnail image or video is required.');
  }
  if (
    data?.promoAmount == null ||
    data?.promoCode?.trim() === '' ||
    !data?.startDate ||
    !data?.expireDate
  ) {
    const isTierOffer =
      data?.offerType === 'amount_discount' ||
      data?.offerType === 'booking_discount';
    if (!isTierOffer) {
      throw new Error(
        'Promo amount, code, start date and expire date are required.',
      );
    }
  }
  const formData = new FormData();
  if (data?.thumbnailUri) {
    formData.append('files', {
      uri: data.thumbnailUri,
      type: data.thumbnailType || 'image/jpeg',
      name: data.thumbnailName || 'thumbnail.jpg',
    });
  }
  if (data?.videoUri) {
    formData.append('files', {
      uri: data.videoUri,
      type: data.videoType || 'video/mp4',
      name: data.videoName || 'video.mp4',
    });
  }
  formData.append('userId', data.userId);
  formData.append('title', data.title.trim());
  if (data.description?.trim()) {
    formData.append('description', data.description.trim());
  }
  formData.append('promoAmount', String(Number(data.promoAmount ?? 0)));
  formData.append('promoCode', (data.promoCode || '').trim());
  formData.append('startDate', data.startDate);
  formData.append('expireDate', data.expireDate);
  if (data.offerType) formData.append('offerType', data.offerType);
  if (Array.isArray(data.fulfillmentScopes) && data.fulfillmentScopes.length) {
    formData.append('fulfillmentScopes', JSON.stringify(data.fulfillmentScopes));
  }
  if (Array.isArray(data.discountTiers) && data.discountTiers.length) {
    formData.append('discountTiers', JSON.stringify(data.discountTiers));
  }
  if (data.tierMetricType) formData.append('tierMetricType', data.tierMetricType);
  if (Array.isArray(data.menuItemIds) && data.menuItemIds.length > 0) {
    formData.append('menuItemIds', JSON.stringify(data.menuItemIds));
  }
  if (
    data.duration !== undefined &&
    data.duration != null &&
    !Number.isNaN(Number(data.duration))
  ) {
    formData.append('duration', String(Math.floor(Number(data.duration))));
  }
  const headers = data.token
    ? { Authorization: `Bearer ${data.token}` }
    : getAuthHeaders();
  if (!headers.Authorization) {
    throw new Error('You must be logged in to create a promotion.');
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000);
    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: { ...headers },
      body: formData,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const resData = await response.json().catch(() => ({}));
    if (!response.ok) {
      const msg =
        resData?.message ||
        (Array.isArray(resData?.message) ? resData.message.join(' ') : null) ||
        `Upload failed (${response.status})`;
      throw new Error(msg);
    }
    return resData;
  } catch (err) {
    const isNetworkFailure =
      err.name === 'AbortError' ||
      (err.message &&
        (err.message === 'Network request failed' ||
          err.message.includes('Network Error')));
    const msg =
      err.name === 'AbortError'
        ? 'Upload timed out. Try again.'
        : isNetworkFailure
        ? 'Network request failed. Check your internet connection and try again.'
        : err.message || 'Failed to upload promotion';
    if (__DEV__) {
      console.warn('[uploadPromotion]', err.message || err, err);
    }
    throw new Error(msg);
  }
};

/**
 * Update promotion
 */
export const updatePromotion = async (promotionId, userId, updateData = {}) => {
  if (!promotionId) throw new Error('Promotion ID is required');
  if (!userId) throw new Error('User ID is required');
  try {
    const response = await axios.patch(
      `${API_URL}/${promotionId}`,
      {
        userId,
        ...updateData,
      },
      {
        headers: getAuthHeaders(),
      },
    );
    return response.data;
  } catch (error) {
    const msg =
      error.response?.data?.message ||
      (Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(' ')
        : null) ||
      error.message ||
      'Failed to update promotion';
    throw new Error(msg);
  }
};

/**
 * Delete promotion
 */
export const deletePromotion = async (promotionId, userId) => {
  if (!promotionId) throw new Error('Promotion ID is required');
  if (!userId) throw new Error('User ID is required');
  try {
    const response = await axios.delete(`${API_URL}/${promotionId}`, {
      data: { userId },
      headers: getAuthHeaders(),
    });
    return response.data;
  } catch (error) {
    const msg =
      error.response?.data?.message ||
      (Array.isArray(error.response?.data?.message)
        ? error.response.data.message.join(' ')
        : null) ||
      error.message ||
      'Failed to delete promotion';
    throw new Error(msg);
  }
};
