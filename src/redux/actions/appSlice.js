import { createSlice } from '@reduxjs/toolkit';

const appSlice = createSlice({
  name: 'app',
  initialState: {
    user: null,
    onboardingDone: false,
    shortsMuted: true,
  },
  reducers: {
    appSetUser: (state, action) => {
      if (!action.payload) {
        state.user = null;
      } else {
        state.user = { ...state.user, ...action.payload };
      }
    },
    setOnboardingDone: (state, action) => {
      state.onboardingDone = action.payload !== false;
    },
    setShortsMuted: (state, action) => {
      state.shortsMuted = action.payload !== false;
    },
  },
});

export const { appSetUser, setOnboardingDone, setShortsMuted } = appSlice.actions;

export default appSlice.reducer;