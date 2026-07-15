import {configureStore} from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {persistStore, persistReducer, createTransform} from 'redux-persist';
import {combineReducers} from 'redux';
import appReducer from './actions/appSlice';
import discoveryReducer from './actions/discoverySlice';
import homeFeedReducer from './actions/homeFeedSlice';

const rootReducer = combineReducers({
  app: appReducer,
  discovery: discoveryReducer,
  homeFeed: homeFeedReducer,
});

/** Keep persisted home snapshot small for fast rehydrate (Foodpanda-style cold start). */
const slimHomeFeedTransform = createTransform(
  inboundState => {
    if (!inboundState || typeof inboundState !== 'object') return inboundState;
    return {
      cacheKey: inboundState.cacheKey || '',
      fetchedAt: inboundState.fetchedAt || 0,
      feedVideos: (inboundState.feedVideos || []).slice(0, 12),
      feedShorts: (inboundState.feedShorts || []).slice(0, 12),
      popularShorts: (inboundState.popularShorts || []).slice(0, 8),
      newShorts: (inboundState.newShorts || []).slice(0, 8),
      mostOrderedRestaurants: (
        inboundState.mostOrderedRestaurants || []
      ).slice(0, 10),
      cuisineOptions: (inboundState.cuisineOptions || []).slice(0, 24),
      featuredVideo: inboundState.featuredVideo || null,
      sponsoredVideo: inboundState.sponsoredVideo || null,
    };
  },
  outboundState => outboundState,
  {whitelist: ['homeFeed']},
);

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  timeout: 0,
  // Persist homeFeed so reopen paints instantly; discovery stays session-only.
  blacklist: ['discovery'],
  transforms: [slimHomeFeedTransform],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({serializableCheck: false}),
});

export const persistor = persistStore(store);

export const getDispatch = () => {
  return store.dispatch;
};
