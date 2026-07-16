import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from '@react-navigation/native';
import { fetchDiscoveryData } from '../redux/actions/discoverySlice';
import {
  buildDiscoveryCacheKey,
  isDiscoveryCacheFresh,
} from '../utils/discoveryCacheKey';

/**
 * Cached restaurant discovery for search + category screens.
 * Shows Redux data immediately; refetches only when stale or location changes.
 */
export function useDiscoveryData(locationOpts, options = {}) {
  const { autoLoad = true, forceOnFocus = false } = options;
  const dispatch = useDispatch();
  const user = useSelector(state => state.app?.user);
  const discovery = useSelector(state => state.discovery);

  const cacheKey = useMemo(
    () => buildDiscoveryCacheKey(locationOpts, user?.id),
    [
      locationOpts?.viewerLat,
      locationOpts?.viewerLng,
      locationOpts?.lat,
      locationOpts?.lng,
      user?.id,
    ],
  );

  const cacheMatches = discovery.cacheKey === cacheKey;

  const restaurants = cacheMatches ? discovery.restaurants : [];
  const popularItems = cacheMatches ? discovery.popularItems : [];
  const categories = cacheMatches ? discovery.categories : [];

  const isFresh = isDiscoveryCacheFresh(
    discovery.fetchedAt,
    discovery.cacheKey,
    cacheKey,
  );

  const load = useCallback(
    (force = false) => {
      if (!cacheKey) return Promise.resolve();
      const shouldForce =
        force || forceOnFocus || !isFresh || !restaurants.length;
      if (!shouldForce && isFresh) {
        return Promise.resolve();
      }
      return dispatch(
        fetchDiscoveryData({
          currentUserId: user?.id || null,
          cacheKey,
          locationOpts,
          force: shouldForce,
        }),
      );
    },
    [
      dispatch,
      cacheKey,
      user?.id,
      isFresh,
      restaurants.length,
      forceOnFocus,
    ],
  );

  useFocusEffect(
    useCallback(() => {
      if (autoLoad) load(false);
    }, [autoLoad, load]),
  );

  const loading =
    cacheMatches &&
    discovery.loading &&
    !restaurants.length &&
    !discovery.refreshing;

  const refreshing = cacheMatches && discovery.refreshing;

  return {
    restaurants,
    popularItems,
    categories,
    loading,
    refreshing,
    isFresh,
    cacheKey,
    reload: () => load(true),
  };
}
