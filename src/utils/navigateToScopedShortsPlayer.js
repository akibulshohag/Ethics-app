/**
 * Build raw short rows for ShortsVideoScreen when limiting the feed to one owner's shorts.
 * Accepts lists shaped like getUserShorts / ownerVideos / myVideos entries.
 */
export function buildOwnerScopedShortsFeed(ownerMediaList, profileUserId) {
  const list = Array.isArray(ownerMediaList) ? ownerMediaList : [];
  return list
    .filter(v => {
      const t = String(v._type || v.type || '').toLowerCase();
      return t === 'short' || t === 'shorts';
    })
    .map(v => ({
      ...v,
      id: v.id,
      userId: v.userId || profileUserId,
      videoUrl: String(v.videoUrl || v.mediaUrl || '').trim(),
      thumbnailUrl: v.thumbnailUrl || v.coverUrl || v.thumbnail,
    }))
    .filter(v => v.id && v.videoUrl);
}

/**
 * Open ShortsVideoScreen with optional owner-scoped feed (swipe only that user's shorts).
 */
export function navigateToScopedShortsPlayer(navigation, params) {
  const {
    shortId,
    initialShortItem,
    scopedShortsFeed,
    shortsFeedMode,
  } = params;
  const sid = String(shortId || '').trim();
  if (!sid) return;

  const navParams = {
    shortId: sid,
    initialShortItem,
    ...(shortsFeedMode === 'owner' &&
    Array.isArray(scopedShortsFeed) &&
    scopedShortsFeed.length > 0
      ? { shortsFeedMode: 'owner', scopedShortsFeed }
      : {}),
  };

  let nav = navigation;
  for (let i = 0; i < 16 && nav; i++) {
    const names = nav.getState?.()?.routeNames;
    if (Array.isArray(names) && names.includes('Shorts')) {
      nav.navigate('Shorts', {
        screen: 'ShortsVideoScreen',
        params: navParams,
      });
      return;
    }
    nav = nav.getParent?.();
  }
  nav = navigation;
  for (let i = 0; i < 16 && nav; i++) {
    const names = nav.getState?.()?.routeNames;
    if (Array.isArray(names) && names.includes('Library')) {
      nav.navigate('Library', {
        screen: 'ShortsVideoScreen',
        params: navParams,
      });
      return;
    }
    nav = nav.getParent?.();
  }
  navigation.navigate('Root', {
    screen: 'Shorts',
    params: {
      screen: 'ShortsVideoScreen',
      params: navParams,
    },
  });
}
