/**
 * Opens HomeOneScreen full video detail. Pass returnContext so Back returns to the right place.
 * returnContext: { returnTo: 'watch_later'|'liked'|'favorites'|'library'|'user_views'|'business_profile'|'promotion', returnUserId?: string }
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

export function navigateToHomeOneLibraryDetail(navigation, item, returnContext) {
  const id = item?.id;
  if (!id) return;
  const contentType = item?.type === 'short' ? 'short' : 'video';
  const openLibraryDetail = {
    contentType,
    contentId: String(id),
  };
  if (returnContext?.returnTo) {
    openLibraryDetail.returnTo = returnContext.returnTo;
  }
  if (returnContext?.returnUserId != null && returnContext.returnUserId !== '') {
    openLibraryDetail.returnUserId = String(returnContext.returnUserId);
  }
  const homeOneParams = {
    screen: 'HomeOneScreen',
    params: { openLibraryDetail },
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
