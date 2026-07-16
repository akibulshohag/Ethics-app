import { TabActions } from '@react-navigation/native';

/** Bottom tab navigator: Home1 + Library + Create (and others) */
function isMainTabNavigatorState(state) {
  const names = state?.routeNames;
  if (!Array.isArray(names)) return false;
  return names.includes('Home1') && names.includes('Library');
}

/**
 * Switch to the bottom tab "Home1" and show HomeOneScreen (main map/home).
 * Uses TabActions.jumpTo on the tab navigator so the tab bar active highlight
 * moves to Home1 (navigate() alone can leave "Create" looking selected).
 * Walks up getParent() so it works from nested Library / Shorts stacks.
 */
export function navigateToHomeOne(navigation) {
  if (!navigation) return;
  const params = { screen: 'HomeOneScreen' };
  let nav = navigation;
  for (let i = 0; i < 8 && nav; i += 1) {
    const state = nav.getState?.();
    if (isMainTabNavigatorState(state)) {
      nav.dispatch(TabActions.jumpTo('Home1', params));
      return;
    }
    nav = nav.getParent?.();
  }
  navigation.navigate('Home1', params);
}
