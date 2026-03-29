/**
 * Navigate to a screen registered on the root stack (sibling of the main tab "Root").
 * Walks up getParent() until a navigator lists the route name.
 */
export function navigateToRootRoute(navigation, routeName, params) {
  if (!navigation || !routeName) return false;
  let nav = navigation;
  for (let i = 0; i < 10 && nav; i += 1) {
    const names = nav.getState?.()?.routeNames;
    if (Array.isArray(names) && names.includes(routeName)) {
      if (params !== undefined) nav.navigate(routeName, params);
      else nav.navigate(routeName);
      return true;
    }
    nav = nav.getParent?.();
  }
  if (params !== undefined) navigation.navigate(routeName, params);
  else navigation.navigate(routeName);
  return true;
}
