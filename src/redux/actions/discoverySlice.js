import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  loadDiscoveryRestaurants,
  fetchPopularMenuItemsFromApi,
  buildPopularMenuItems,
  buildCategoryOptionsFromRestaurants,
} from '../../services/discoveryService';
import { isDiscoveryCacheFresh } from '../../utils/discoveryCacheKey';

export const fetchDiscoveryData = createAsyncThunk(
  'discovery/fetch',
  async ({ currentUserId, cacheKey, locationOpts }, { signal }) => {
    const [rows, apiPopular] = await Promise.all([
      // Lightweight list only — full N+1 enrich was freezing home cold start.
      loadDiscoveryRestaurants({
        currentUserId,
        limit: 20,
        locationOpts,
        enrich: false,
      }),
      fetchPopularMenuItemsFromApi(10),
    ]);
    if (signal.aborted) {
      throw new Error('Aborted');
    }
    const popularItems =
      apiPopular.length > 0 ? apiPopular : buildPopularMenuItems(rows, 10);
    const categories = buildCategoryOptionsFromRestaurants(rows);
    return {
      cacheKey,
      restaurants: rows,
      popularItems,
      categories,
    };
  },
  {
    condition: ({ cacheKey, force }, { getState }) => {
      if (!cacheKey) return false;
      if (force) return true;
      const state = getState().discovery;
      if (
        (state.loading || state.refreshing) &&
        state.cacheKey === cacheKey
      ) {
        return false;
      }
      const hasData =
        state.cacheKey === cacheKey && (state.restaurants?.length || 0) > 0;
      if (
        hasData &&
        isDiscoveryCacheFresh(state.fetchedAt, state.cacheKey, cacheKey)
      ) {
        return false;
      }
      return true;
    },
  },
);

const discoverySlice = createSlice({
  name: 'discovery',
  initialState: {
    cacheKey: '',
    fetchedAt: 0,
    restaurants: [],
    popularItems: [],
    categories: [],
    loading: false,
    refreshing: false,
    error: null,
  },
  reducers: {
    clearDiscoveryCache: state => {
      state.cacheKey = '';
      state.fetchedAt = 0;
      state.restaurants = [];
      state.popularItems = [];
      state.categories = [];
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchDiscoveryData.pending, (state, action) => {
        const key = action.meta.arg?.cacheKey || '';
        const hasData =
          state.cacheKey === key && (state.restaurants?.length || 0) > 0;
        if (hasData) {
          state.refreshing = true;
        } else {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchDiscoveryData.fulfilled, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        const payload = action.payload || {};
        state.cacheKey = payload.cacheKey || state.cacheKey;
        state.fetchedAt = Date.now();
        state.restaurants = payload.restaurants || [];
        state.popularItems = payload.popularItems || [];
        state.categories = payload.categories || [];
      })
      .addCase(fetchDiscoveryData.rejected, (state, action) => {
        state.loading = false;
        state.refreshing = false;
        state.error = action.error?.message || 'Failed to load';
      });
  },
});

export const { clearDiscoveryCache } = discoverySlice.actions;
export default discoverySlice.reducer;
