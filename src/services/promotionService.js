import axios from 'axios';
import { Platform } from 'react-native';
import ReactNativeBlobUtil from 'react-native-blob-util';
import { config } from '../../config';
import { ensureVideoThumbnailFields } from '../utils/videoThumbnail';
import { normalizeUploadUri, isLocalMediaUri } from '../utils/helper';

const API_URL = `${config.apiBaseUrl}/promotions`;
const UPLOAD_TIMEOUT_MS = 120000;

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

const toFormFile = (uri, type, name) => ({
  uri: normalizeUploadUri(uri),
  type: type || 'application/octet-stream',
  name: name || 'file',
});

const normalizeFormDataFiles = formData => {
  if (!formData || !Array.isArray(formData._parts)) return formData;
  const normalized = new FormData();
  for (const part of formData._parts) {
    const key = part?.[0];
    const value = part?.[1];
    if (!key) continue;
    if (value && typeof value === 'object' && typeof value.uri === 'string') {
      normalized.append(key, {
        ...value,
        uri: normalizeUploadUri(value.uri),
      });
    } else {
      normalized.append(key, value);
    }
  }
  return normalized;
};

const resolveLocalPathForBlob = async uri => {
  const normalized = normalizeUploadUri(uri);
  if (!normalized) return '';
  if (normalized.startsWith('content://')) {
    try {
      const st = await ReactNativeBlobUtil.fs.stat(normalized);
      const path = st?.path || st?.originalFilepath;
      if (path) return String(path).replace(/^file:\/\//, '');
    } catch (e) {
      if (__DEV__) {
        console.warn('[uploadPromotion] could not stat content uri', e?.message || e);
      }
    }
  }
  return normalized.replace(/^file:\/\//, '');
};

const appendPromotionFields = (formData, prepared) => {
  formData.append('userId', prepared.userId);
  formData.append('title', prepared.title.trim());
  if (prepared.description?.trim()) {
    formData.append('description', prepared.description.trim());
  }
  formData.append('promoAmount', String(Number(prepared.promoAmount ?? 0)));
  formData.append('promoCode', (prepared.promoCode || '').trim());
  formData.append('startDate', prepared.startDate);
  formData.append('expireDate', prepared.expireDate);
  if (prepared.offerType) formData.append('offerType', prepared.offerType);
  if (
    Array.isArray(prepared.fulfillmentScopes) &&
    prepared.fulfillmentScopes.length
  ) {
    formData.append(
      'fulfillmentScopes',
      JSON.stringify(prepared.fulfillmentScopes),
    );
  }
  if (Array.isArray(prepared.discountTiers) && prepared.discountTiers.length) {
    formData.append('discountTiers', JSON.stringify(prepared.discountTiers));
  }
  if (prepared.tierMetricType) {
    formData.append('tierMetricType', prepared.tierMetricType);
  }
  if (Array.isArray(prepared.menuItemIds) && prepared.menuItemIds.length > 0) {
    formData.append('menuItemIds', JSON.stringify(prepared.menuItemIds));
  }
  if (
    prepared.duration !== undefined &&
    prepared.duration != null &&
    !Number.isNaN(Number(prepared.duration))
  ) {
    formData.append('duration', String(Math.floor(Number(prepared.duration))));
  }
};

const buildPromotionFormData = prepared => {
  const formData = new FormData();
  if (prepared.thumbnailUri) {
    formData.append(
      'files',
      toFormFile(
        prepared.thumbnailUri,
        prepared.thumbnailType || 'image/jpeg',
        prepared.thumbnailName || 'thumbnail.jpg',
      ),
    );
  }
  if (prepared.videoUri) {
    formData.append(
      'files',
      toFormFile(
        prepared.videoUri,
        prepared.videoType || 'video/mp4',
        prepared.videoName || 'video.mp4',
      ),
    );
  }
  appendPromotionFields(formData, prepared);
  return normalizeFormDataFiles(formData);
};

const buildPromotionBlobParts = async prepared => {
  const parts = [];
  if (prepared.thumbnailUri) {
    const path = await resolveLocalPathForBlob(prepared.thumbnailUri);
    if (path) {
      parts.push({
        name: 'files',
        filename: prepared.thumbnailName || 'thumbnail.jpg',
        type: prepared.thumbnailType || 'image/jpeg',
        data: ReactNativeBlobUtil.wrap(path),
      });
    }
  }
  if (prepared.videoUri) {
    const path = await resolveLocalPathForBlob(prepared.videoUri);
    if (path) {
      parts.push({
        name: 'files',
        filename: prepared.videoName || 'video.mp4',
        type: prepared.videoType || 'video/mp4',
        data: ReactNativeBlobUtil.wrap(path),
      });
    }
  }
  parts.push({ name: 'userId', data: String(prepared.userId) });
  parts.push({ name: 'title', data: prepared.title.trim() });
  if (prepared.description?.trim()) {
    parts.push({ name: 'description', data: prepared.description.trim() });
  }
  parts.push({
    name: 'promoAmount',
    data: String(Number(prepared.promoAmount ?? 0)),
  });
  parts.push({ name: 'promoCode', data: (prepared.promoCode || '').trim() });
  parts.push({ name: 'startDate', data: String(prepared.startDate) });
  parts.push({ name: 'expireDate', data: String(prepared.expireDate) });
  if (prepared.offerType) {
    parts.push({ name: 'offerType', data: String(prepared.offerType) });
  }
  if (
    Array.isArray(prepared.fulfillmentScopes) &&
    prepared.fulfillmentScopes.length
  ) {
    parts.push({
      name: 'fulfillmentScopes',
      data: JSON.stringify(prepared.fulfillmentScopes),
    });
  }
  if (Array.isArray(prepared.discountTiers) && prepared.discountTiers.length) {
    parts.push({
      name: 'discountTiers',
      data: JSON.stringify(prepared.discountTiers),
    });
  }
  if (prepared.tierMetricType) {
    parts.push({ name: 'tierMetricType', data: String(prepared.tierMetricType) });
  }
  if (Array.isArray(prepared.menuItemIds) && prepared.menuItemIds.length > 0) {
    parts.push({
      name: 'menuItemIds',
      data: JSON.stringify(prepared.menuItemIds),
    });
  }
  if (
    prepared.duration !== undefined &&
    prepared.duration != null &&
    !Number.isNaN(Number(prepared.duration))
  ) {
    parts.push({
      name: 'duration',
      data: String(Math.floor(Number(prepared.duration))),
    });
  }
  return parts;
};

const parseFetchResponse = async response => {
  try {
    return await response.json();
  } catch {
    return {};
  }
};

const parseBlobUtilResponse = async res => {
  try {
    const result = res.json();
    if (result != null && typeof result.then === 'function') {
      return await result;
    }
    return result ?? {};
  } catch {
    try {
      const text = res.text();
      const body = typeof text?.then === 'function' ? await text : text;
      return JSON.parse(String(body || '{}'));
    } catch {
      try {
        return JSON.parse(String(res.data || '{}'));
      } catch {
        return {};
      }
    }
  }
};

const isNetworkFailure = err => {
  const msg = String(err?.message || '');
  return (
    err?.name === 'AbortError' ||
    /network request failed|network error|failed to fetch/i.test(msg)
  );
};

const shouldPreferBlobUpload = prepared =>
  Platform.OS === 'android' &&
  [prepared.thumbnailUri, prepared.videoUri].some(uri =>
    String(uri || '').startsWith('content://'),
  );

const uploadViaFetch = async (url, headers, formData, method = 'POST') => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method,
      headers: { ...headers },
      body: formData,
      signal: controller.signal,
    });
    const resData = await parseFetchResponse(response);
    if (!response.ok) {
      const msg =
        resData?.message ||
        (Array.isArray(resData?.message) ? resData.message.join(' ') : null) ||
        `Upload failed (${response.status})`;
      throw new Error(msg);
    }
    return resData;
  } finally {
    clearTimeout(timeoutId);
  }
};

const uploadViaBlobUtil = async (url, headers, prepared, method = 'POST') => {
  const parts = await buildPromotionBlobParts(prepared);
  if (!parts.some(part => part.name === 'files')) {
    throw new Error('Could not read the selected image or video file.');
  }
  const res = await ReactNativeBlobUtil.config({ timeout: UPLOAD_TIMEOUT_MS }).fetch(
    method,
    url,
    {
      ...headers,
      'Content-Type': 'multipart/form-data',
    },
    parts,
  );
  const status = res.info().status;
  const resData = await parseBlobUtilResponse(res);
  if (status < 200 || status >= 300) {
    const msg =
      resData?.message ||
      (Array.isArray(resData?.message) ? resData.message.join(' ') : null) ||
      `Upload failed (${status})`;
    throw new Error(msg);
  }
  return resData;
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

  const prepared = await ensureVideoThumbnailFields({ ...data });
  if (!prepared?.thumbnailUri && !prepared?.videoUri) {
    throw new Error('Either thumbnail image or video is required.');
  }
  if (
    prepared?.promoAmount == null ||
    prepared?.promoCode?.trim() === '' ||
    !prepared?.startDate ||
    !prepared?.expireDate
  ) {
    const isTierOffer =
      prepared?.offerType === 'amount_discount' ||
      prepared?.offerType === 'booking_discount';
    if (!isTierOffer) {
      throw new Error(
        'Promo amount, code, start date and expire date are required.',
      );
    }
  }

  const formData = buildPromotionFormData(prepared);
  const url = `${API_URL}/upload`;
  const headers = prepared.token
    ? { Authorization: `Bearer ${prepared.token}` }
    : getAuthHeaders();
  if (!headers.Authorization) {
    throw new Error('You must be logged in to create a promotion.');
  }

  try {
    if (shouldPreferBlobUpload(prepared)) {
      try {
        return await uploadViaBlobUtil(url, headers, prepared);
      } catch (blobErr) {
        if (__DEV__) {
          console.warn('[uploadPromotion] blob upload failed, retrying fetch', blobErr?.message);
        }
      }
    }
    return await uploadViaFetch(url, headers, formData);
  } catch (err) {
    const errMsg = String(err?.message || '');
    if (isNetworkFailure(err) || /undefined is not a function/i.test(errMsg)) {
      try {
        return await uploadViaBlobUtil(url, headers, prepared);
      } catch (fallbackErr) {
        if (__DEV__) {
          console.warn(
            '[uploadPromotion] fetch and blob upload failed',
            err?.message,
            fallbackErr?.message,
          );
        }
        throw fallbackErr;
      }
    }
    if (err?.name === 'AbortError') {
      throw new Error('Upload timed out. Try again on Wi‑Fi.');
    }
    throw err;
  }
};

/**
 * Update promotion with optional new local media files.
 */
export const updatePromotionUpload = async (promotionId, data) => {
  if (!promotionId) throw new Error('Promotion ID is required');
  if (!data?.userId) throw new Error('User ID is required');

  const prepared = await ensureVideoThumbnailFields({ ...data });
  const formData = new FormData();
  let hasLocalFiles = false;
  if (prepared.thumbnailUri && isLocalMediaUri(prepared.thumbnailUri)) {
    formData.append(
      'files',
      toFormFile(
        prepared.thumbnailUri,
        prepared.thumbnailType || 'image/jpeg',
        prepared.thumbnailName || 'thumbnail.jpg',
      ),
    );
    hasLocalFiles = true;
  }
  if (prepared.videoUri && isLocalMediaUri(prepared.videoUri)) {
    formData.append(
      'files',
      toFormFile(
        prepared.videoUri,
        prepared.videoType || 'video/mp4',
        prepared.videoName || 'video.mp4',
      ),
    );
    hasLocalFiles = true;
  }

  const jsonPayload = {
    title: prepared.title?.trim(),
    description: prepared.description?.trim() || undefined,
    promoAmount: prepared.promoAmount,
    promoCode: prepared.promoCode,
    startDate: prepared.startDate,
    expireDate: prepared.expireDate,
    offerType: prepared.offerType,
    fulfillmentScopes: prepared.fulfillmentScopes,
    discountTiers: prepared.discountTiers,
    tierMetricType: prepared.tierMetricType,
    menuItemIds: prepared.menuItemIds,
    duration: prepared.duration,
    thumbnailUrl:
      prepared.thumbnailUri && !isLocalMediaUri(prepared.thumbnailUri)
        ? prepared.thumbnailUri
        : undefined,
    videoUrl:
      prepared.videoUri && !isLocalMediaUri(prepared.videoUri)
        ? prepared.videoUri
        : undefined,
  };

  if (!hasLocalFiles) {
    return updatePromotion(promotionId, prepared.userId, jsonPayload);
  }

  appendPromotionFields(formData, prepared);
  const url = `${API_URL}/${promotionId}/upload`;
  const headers = prepared.token
    ? { Authorization: `Bearer ${prepared.token}` }
    : getAuthHeaders();
  if (!headers.Authorization) {
    throw new Error('You must be logged in to update a promotion.');
  }

  try {
    if (shouldPreferBlobUpload(prepared)) {
      try {
        return await uploadViaBlobUtil(url, headers, prepared, 'PATCH');
      } catch (blobErr) {
        if (__DEV__) {
          console.warn('[updatePromotionUpload] blob failed, retrying fetch', blobErr?.message);
        }
      }
    }
    return await uploadViaFetch(url, headers, formData, 'PATCH');
  } catch (err) {
    const errMsg = String(err?.message || '');
    if (isNetworkFailure(err) || /undefined is not a function/i.test(errMsg)) {
      return uploadViaBlobUtil(url, headers, prepared, 'PATCH');
    }
    if (err?.name === 'AbortError') {
      throw new Error('Upload timed out. Try again on Wi‑Fi.');
    }
    throw err;
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
    const data = error.response?.data;
    const msg =
      (typeof data?.message === 'string' ? data.message : null) ||
      (Array.isArray(data?.message) ? data.message.join(' ') : null) ||
      (Array.isArray(data?.errors)
        ? data.errors
            .map(e =>
              e?.constraints ? Object.values(e.constraints)[0] : e?.property,
            )
            .filter(Boolean)
            .join('; ')
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
