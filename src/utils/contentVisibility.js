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

/**
 * Params for a specific channel profile's Gallery / Videos / Posts.
 * Use the channel's coordinates (not the viewer's browse postcode) so content
 * still loads when the restaurant was opened from Shorts/search but the browse
 * location is outside that channel's contentAreaKm.
 */
export const viewerProfileContentParams = (user, channelLocation) => {
  const params = { viewerRole: viewerRoleFromUser(user) };
  if (user?.id) params.viewerUserId = user.id;

  const lat = Number(
    channelLocation?.lat ?? channelLocation?.latitude ?? NaN,
  );
  const lng = Number(
    channelLocation?.lng ?? channelLocation?.longitude ?? NaN,
  );
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

/** Normalize diner/user aliases to `user`. */
export const normalizeCreatorRole = role => {
  const r = String(role || '').toLowerCase().trim();
  if (!r) return '';
  if (
    r === 'user' ||
    r === 'dinner' ||
    r === 'dynner' ||
    r === 'diner' ||
    r === 'customer'
  ) {
    return 'user';
  }
  return r;
};

/** Creator role from a feed / video / campaign item. */
export const creatorRoleFromItem = item => {
  const raw =
    item?.creatorRole ||
    item?.user?.role ||
    item?.owner?.role ||
    item?._campaignOwnerUser?.role ||
    item?.role ||
    '';
  return normalizeCreatorRole(raw);
};

export const isBusinessCreator = item => {
  const role = creatorRoleFromItem(item);
  return role === 'owner' || role === 'vendor';
};

/** Order / Book CTAs only for business creators; hidden on own content. */
export const shouldShowOrderBookButtons = (item, viewerUserId) => {
  if (!isBusinessCreator(item)) return false;
  const ownerId =
    item?.userId ??
    item?.user?.id ??
    item?._campaignOwnerUser?.id ??
    null;
  if (
    viewerUserId != null &&
    ownerId != null &&
    String(viewerUserId) === String(ownerId)
  ) {
    return false;
  }
  return true;
};
