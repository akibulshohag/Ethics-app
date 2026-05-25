import { createSlice } from '@reduxjs/toolkit';

export const HOME_FEED_STALE_MS = 5 * 60 * 1000;

export function isHomeFeedCacheFresh(fetchedAt, cacheKey, expectedKey) {
  if (!expectedKey || cacheKey !== expectedKey) return false;
  if (!fetchedAt) return false;
  return Date.now() - fetchedAt < HOME_FEED_STALE_MS;
}

const homeFeedSlice = createSlice({
  name: 'homeFeed',
  initialState: {
    cacheKey: '',
    fetchedAt: 0,
    feedVideos: [],
    feedShorts: [],
    popularShorts: [],
    newShorts: [],
    mostOrderedRestaurants: [],
    cuisineOptions: [],
    featuredVideo: null,
    sponsoredVideo: null,
  },
  reducers: {
    setHomeFeedCache: (state, action) => {
      const p = action.payload || {};
      state.cacheKey = p.cacheKey || '';
      state.fetchedAt = Date.now();
      if (Array.isArray(p.feedVideos)) state.feedVideos = p.feedVideos;
      if (Array.isArray(p.feedShorts)) state.feedShorts = p.feedShorts;
      if (Array.isArray(p.popularShorts)) state.popularShorts = p.popularShorts;
      if (Array.isArray(p.newShorts)) state.newShorts = p.newShorts;
      if (Array.isArray(p.mostOrderedRestaurants)) {
        state.mostOrderedRestaurants = p.mostOrderedRestaurants;
      }
      if (Array.isArray(p.cuisineOptions)) state.cuisineOptions = p.cuisineOptions;
      if (p.featuredVideo !== undefined) state.featuredVideo = p.featuredVideo;
      if (p.sponsoredVideo !== undefined) state.sponsoredVideo = p.sponsoredVideo;
    },
    clearHomeFeedCache: state => {
      state.cacheKey = '';
      state.fetchedAt = 0;
      state.feedVideos = [];
      state.feedShorts = [];
      state.popularShorts = [];
      state.newShorts = [];
      state.mostOrderedRestaurants = [];
      state.cuisineOptions = [];
      state.featuredVideo = null;
      state.sponsoredVideo = null;
    },
  },
});

export const { setHomeFeedCache, clearHomeFeedCache } = homeFeedSlice.actions;
export default homeFeedSlice.reducer;
