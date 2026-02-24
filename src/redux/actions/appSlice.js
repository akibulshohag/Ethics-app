import { createSlice } from '@reduxjs/toolkit';

const appSlice = createSlice({
  name: 'app',
  initialState: {
    user: null,
    onboardingDone: false,
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
  },
});

export const { appSetUser, setOnboardingDone } = appSlice.actions;

export default appSlice.reducer;