/**
 * Opens the same full video/short detail as Home feed (renderRestaurantDetail on HomeOneScreen).
 * - Library stack: walk up to bottom tabs, then Home1 → HomeOneScreen.
 * - Root stack (UserViewsScreen, etc.): Root (tab container) → Home1 → HomeOneScreen.
 */
function findTabNavigation(navigation) {
  let parent = navigation?.getParent?.();
  while (parent) {
    const names = parent.getState?.()?.routeNames;
    if (Array.isArray(names) && names.includes('Home1')) {
      return parent;
    }
    parent = parent.getParent?.();
  }
  return null;
}

/** Find a navigator that can reach the main tab app (screen name "Root" in RootStack). */
function findNavigatorWithRootRoute(navigation) {
  let nav = navigation;
  for (let i = 0; i < 8 && nav; i++) {
    const names = nav.getState?.()?.routeNames;
    if (Array.isArray(names) && names.includes('Root')) {
      return nav;
    }
    nav = nav.getParent?.();
  }
  return null;
}

export function navigateToHomeOneLibraryDetail(navigation, item) {
  const id = item?.id;
  if (!id) return;
  const contentType = item?.type === 'short' ? 'short' : 'video';
  const detailParams = {
    openLibraryDetail: { contentType, contentId: String(id) },
  };
  const homeOneParams = {
    screen: 'HomeOneScreen',
    params: detailParams,
  };

  const tabNav = findTabNavigation(navigation);
  if (tabNav?.navigate) {
    tabNav.navigate('Home1', homeOneParams);
    return;
  }

  const rootStackNav = findNavigatorWithRootRoute(navigation);
  if (rootStackNav?.navigate) {
    rootStackNav.navigate('Root', {
      screen: 'Home1',
      params: homeOneParams,
    });
    return;
  }

  if (navigation?.navigate) {
    navigation.navigate('Root', {
      screen: 'Home1',
      params: homeOneParams,
    });
  }
}
