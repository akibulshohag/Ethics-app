import { createSlice } from '@reduxjs/toolkit';

const appSlice = createSlice({
  name: 'app',
  initialState: {
    user: null,
    onboardingDone: false,
    shortsMuted: true,
    browseLocation: {
      lat: null,
      lng: null,
      postcode: '',
      addressText: '',
      areaLabel: '',
      updatedAt: 0,
    },
    blockedUserIds: [],
  },
  reducers: {
    appSetUser: (state, action) => {
      if (!action.payload) {
        state.user = null;
      } else {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setBrowseLocation: (state, action) => {
      const p = action.payload || {};
      state.browseLocation = {
        lat: p.lat ?? null,
        lng: p.lng ?? null,
        postcode: String(p.postcode || ''),
        addressText: String(p.addressText || ''),
        areaLabel: String(p.areaLabel || ''),
        updatedAt: p.updatedAt ?? Date.now(),
      };
    },
    clearBrowseLocation: state => {
      state.browseLocation = {
        lat: null,
        lng: null,
        postcode: '',
        addressText: '',
        areaLabel: '',
        updatedAt: 0,
      };
    },
    setOnboardingDone: (state, action) => {
      state.onboardingDone = action.payload !== false;
    },
    setShortsMuted: (state, action) => {
      state.shortsMuted = action.payload !== false;
    },
    setBlockedUserIds: (state, action) => {
      state.blockedUserIds = Array.isArray(action.payload)
        ? action.payload.map(String)
        : [];
    },
  },
});

export const { appSetUser, setOnboardingDone, setShortsMuted, setBrowseLocation, clearBrowseLocation, setBlockedUserIds } = appSlice.actions;

export default appSlice.reducer;