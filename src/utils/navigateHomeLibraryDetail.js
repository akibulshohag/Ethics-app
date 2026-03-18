/**
 * Opens the same full video/short detail as Home feed (renderRestaurantDetail on HomeOneScreen).
 * Library playlist screens live under Library stack → walk up to the bottom tab navigator.
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

export function navigateToHomeOneLibraryDetail(navigation, item) {
  const id = item?.id;
  if (!id) return;
  const contentType = item?.type === 'short' ? 'short' : 'video';
  const params = {
    openLibraryDetail: { contentType, contentId: String(id) },
  };
  const tabNav = findTabNavigation(navigation);
  if (tabNav?.navigate) {
    tabNav.navigate('Home1', {
      screen: 'HomeOneScreen',
      params,
    });
    return;
  }
  navigation?.navigate?.('Home1', {
    screen: 'HomeOneScreen',
    params,
  });
}
