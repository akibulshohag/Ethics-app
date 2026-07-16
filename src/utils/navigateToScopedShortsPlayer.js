/**
 * Build media rows for ShortsVideoScreen when limiting the feed to one owner.
 * Includes shorts and full videos that have a playable URL.
 */
import { CommonActions } from '@react-navigation/native';

export function buildOwnerScopedShortsFeed(ownerMediaList, profileUserId) {
  const list = Array.isArray(ownerMediaList) ? ownerMediaList : [];
  return list
    .map(v => ({
      ...v,
      id: v.id,
      userId: v.userId || profileUserId,
      videoUrl: String(v.videoUrl || v.mediaUrl || '').trim(),
      thumbnailUrl: v.thumbnailUrl || v.coverUrl || v.thumbnail,
      _type: v._type || v.type || 'video',
    }))
    .filter(v => v.id && v.videoUrl)
    .sort((a, b) => {
      const ta = new Date(a.publishedAt || a.createdAt || 0).getTime();
      const tb = new Date(b.publishedAt || b.createdAt || 0).getTime();
      return tb - ta;
    });
}

/**
 * Put the tapped item first so ShortsVideoScreen opens on the correct video.
 */
export function orderFeedWithClickedFirst(feed, mediaId, videoUrl) {
  const id = String(mediaId || '').trim();
  const url = String(videoUrl || '').trim();
  const list = Array.isArray(feed) ? feed : [];
  if (list.length === 0) return list;

  let idx = -1;
  if (id) {
    idx = list.findIndex(v => String(v?.id) === id);
  }
  if (idx < 0 && url) {
    idx = list.findIndex(
      v => String(v?.videoUrl || v?.mediaUrl || '').trim() === url,
    );
  }
  if (idx <= 0) return list;
  return [list[idx], ...list.filter((_, i) => i !== idx)];
}

function findNavigatorWithRoute(navigation, routeName) {
  let nav = navigation;
  for (let i = 0; i < 16 && nav; i++) {
    const names = nav.getState?.()?.routeNames;
    if (Array.isArray(names) && names.includes(routeName)) {
      return nav;
    }
    nav = nav.getParent?.();
  }
  return null;
}

/**
 * Open ShortsVideoScreen with optional owner-scoped feed (swipe only that user's shorts).
 * Pushes on the current stack when possible so Back returns to UserViewsScreen / profile.
 */
export function navigateToScopedShortsPlayer(navigation, params) {
  const {
    shortId,
    initialShortItem,
    scopedShortsFeed,
    shortsFeedMode,
    returnTo,
    returnUserId,
  } = params;
  const sid = String(shortId || '').trim();
  if (!sid) return;

  const seedUrl = String(
    initialShortItem?.videoUrl || initialShortItem?.mediaUrl || '',
  ).trim();
  const orderedFeed = orderFeedWithClickedFirst(
    scopedShortsFeed,
    sid,
    seedUrl,
  );

  const navParams = {
    shortId: sid,
    initialShortId: sid,
    initialShortItem,
    playerSessionId: Date.now(),
    ...(returnTo ? { returnTo } : {}),
    ...(returnUserId != null && returnUserId !== ''
      ? { returnUserId: String(returnUserId) }
      : {}),
    ...(shortsFeedMode === 'owner' &&
    Array.isArray(orderedFeed) &&
    orderedFeed.length > 0
      ? { shortsFeedMode: 'owner', scopedShortsFeed: orderedFeed }
      : {}),
  };

  const stackNav = findNavigatorWithRoute(navigation, 'ShortsVideoScreen');
  if (stackNav?.push) {
    stackNav.push('ShortsVideoScreen', navParams);
    return;
  }

  const dispatchTo = (nav, rootName, tabName) => {
    nav.dispatch(
      CommonActions.navigate({
        name: rootName || tabName,
        ...(rootName
          ? {
              params: {
                screen: tabName,
                params: {
                  screen: 'ShortsVideoScreen',
                  params: navParams,
                },
              },
            }
          : {
              params: {
                screen: 'ShortsVideoScreen',
                params: navParams,
              },
            }),
      }),
    );
  };

  let nav = navigation;
  for (let i = 0; i < 16 && nav; i++) {
    const names = nav.getState?.()?.routeNames;
    if (Array.isArray(names) && names.includes('Shorts')) {
      dispatchTo(nav, null, 'Shorts');
      return;
    }
    nav = nav.getParent?.();
  }
  nav = navigation;
  for (let i = 0; i < 16 && nav; i++) {
    const names = nav.getState?.()?.routeNames;
    if (Array.isArray(names) && names.includes('Library')) {
      dispatchTo(nav, null, 'Library');
      return;
    }
    nav = nav.getParent?.();
  }
  dispatchTo(navigation, 'Root', 'Shorts');
}
