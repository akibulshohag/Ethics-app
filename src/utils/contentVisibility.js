/** Viewer role for content APIs (user | owner | vendor | admin). */
export const viewerRoleFromUser = user =>
  (user?.role && String(user.role).toLowerCase()) || 'user';

/** Params for profile content APIs: role, viewer id, and browse location. */
export const viewerContentParams = (user, browseLocation) => {
  const params = { viewerRole: viewerRoleFromUser(user) };
  if (user?.id) params.viewerUserId = user.id;

  const lat =
    browseLocation?.lat != null
      ? Number(browseLocation.lat)
      : user?.savedLastLocation?.lat != null
      ? Number(user.savedLastLocation.lat)
      : user?.latitude != null
      ? Number(user.latitude)
      : null;
  const lng =
    browseLocation?.lng != null
      ? Number(browseLocation.lng)
      : user?.savedLastLocation?.lng != null
      ? Number(user.savedLastLocation.lng)
      : user?.longitude != null
      ? Number(user.longitude)
      : null;

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    params.viewerLat = lat;
    params.viewerLng = lng;
  }
  return params;
};

/** Client-side safety filter when API returns mixed creators. */
export const canViewerSeeCreatorContent = (viewerRole, creatorRole) => {
  const viewer = viewerRoleFromUser({ role: viewerRole });
  const creator = viewerRoleFromUser({ role: creatorRole });
  if (viewer === 'user' && creator === 'vendor') return false;
  if (viewer === 'vendor') return true;
  return true;
};

export const filterContentByViewerRole = (items, viewerRole, roleKey = 'role') =>
  (items || []).filter(item => {
    const creatorRole =
      item?.user?.[roleKey] ||
      item?.[roleKey] ||
      item?.owner?.[roleKey] ||
      item?.creatorRole;
    return canViewerSeeCreatorContent(viewerRole, creatorRole);
  });
