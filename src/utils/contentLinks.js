const APP_SCHEME = 'eatwaze';
const LEGACY_APP_SCHEME = 'eatix';
const APP_WEB_HOST = 'eatwaze.app';
const LEGACY_WEB_HOSTS = ['eatix.app', 'eatwaze.app'];

const normalizeType = type => {
  const t = String(type || '').toLowerCase();
  if (t.startsWith('short')) return 'shorts';
  return 'video';
};

const isAppWebHost = host => {
  const h = String(host || '').toLowerCase();
  return LEGACY_WEB_HOSTS.some(
    legacy => h === legacy || h.endsWith(`.${legacy}`),
  );
};

export const buildContentDeepLink = (type, id) => {
  const sid = encodeURIComponent(String(id || '').trim());
  const t = normalizeType(type);
  return `${APP_SCHEME}://${t}/${sid}`;
};

export const buildContentUniversalLink = (type, id) => {
  const sid = encodeURIComponent(String(id || '').trim());
  const t = normalizeType(type);
  const path = t === 'shorts' ? 'shorts' : 'video';
  return `https://${APP_WEB_HOST}/${path}/${sid}`;
};

export const buildPostUniversalLink = id => {
  const sid = encodeURIComponent(String(id || '').trim());
  return `https://${APP_WEB_HOST}/post/${sid}`;
};

export const buildContentShareMessage = ({ type, id }) => {
  const web = buildContentUniversalLink(type, id);
  return web;
};

export const buildPostShareMessage = ({ id }) => buildPostUniversalLink(id);

export const parseSharedContentUrl = rawUrl => {
  const s = String(rawUrl || '').trim();
  if (!s) return null;
  try {
    const u = new URL(s);
    const scheme = (u.protocol || '').replace(':', '').toLowerCase();
    const host = String(u.hostname || '').toLowerCase();
    const pathParts = (u.pathname || '/')
      .split('/')
      .map(x => x.trim())
      .filter(Boolean);

    let type = null;
    let id = null;

    if (scheme === APP_SCHEME || scheme === LEGACY_APP_SCHEME) {
      const hostPart = String(u.host || '').toLowerCase();
      const firstPath = pathParts[0] || null;
      if (hostPart === 'shorts' || hostPart === 'short') {
        type = 'short';
        id = firstPath;
      } else if (hostPart === 'video' || hostPart === 'videos') {
        type = 'video';
        id = firstPath;
      } else if (hostPart === 'post' || hostPart === 'posts') {
        type = 'post';
        id = firstPath;
      } else if (firstPath === 'shorts' || firstPath === 'short') {
        type = 'short';
        id = pathParts[1] || null;
      } else if (firstPath === 'video' || firstPath === 'videos') {
        type = 'video';
        id = pathParts[1] || null;
      } else if (firstPath === 'post' || firstPath === 'posts') {
        type = 'post';
        id = pathParts[1] || null;
      }
    } else if (scheme === 'https' || scheme === 'http') {
      if (isAppWebHost(host)) {
        const first = pathParts[0] || null;
        if (first === 'shorts' || first === 'short') {
          type = 'short';
          id = pathParts[1] || null;
        } else if (first === 'video' || first === 'videos') {
          type = 'video';
          id = pathParts[1] || null;
        } else if (first === 'post' || first === 'posts') {
          type = 'post';
          id = pathParts[1] || null;
        }
      }
    }

    if (!type || !id) return null;
    return { type, id: decodeURIComponent(id) };
  } catch {
    return null;
  }
};
