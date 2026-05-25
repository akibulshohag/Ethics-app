import {configureStore} from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {persistStore, persistReducer} from 'redux-persist';
import {combineReducers} from 'redux';
import appReducer from './actions/appSlice';
import discoveryReducer from './actions/discoverySlice';
import homeFeedReducer from './actions/homeFeedSlice';

const rootReducer = combineReducers({
    app: appReducer,
    discovery: discoveryReducer,
    homeFeed: homeFeedReducer,
});

const persistConfig = {
    key: 'root',
    storage: AsyncStorage,
    timeout: 0,
    blacklist: ['discovery', 'homeFeed'],
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