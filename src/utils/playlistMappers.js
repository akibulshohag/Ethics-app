const formatCount = n => {
  if (!n || n < 0) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return String(n);
};

const safeUri = val =>
  typeof val === 'string' && val.trim().length > 0 ? val.trim() : 'https://via.placeholder.com/100';

const formatDuration = seconds => {
  if (!seconds || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const formatTimeAgo = dateStr => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);
  if (diffYears > 0) return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
  if (diffMonths > 0) return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  return 'Recently';
};

export const mapVideoApiToDisplay = v => {
  const user = v.user || {};
  const viewCount = v.viewCount ?? v._count?.views ?? 0;
  const channelName = user.nickname || user.name || 'Unknown';
  const pubAt = v.publishedAt || v.createdAt;
  return {
    id: v.id,
    type: 'video',
    title: v.title || 'Untitled',
    channelName,
    views: `${formatCount(viewCount)} views`,
    publishedAt: formatTimeAgo(pubAt),
    thumbnail: safeUri(v.thumbnailUrl || v.videoUrl) || 'https://via.placeholder.com/300',
    duration: formatDuration(v.duration),
    addedAt: v.addedAt ? new Date(v.addedAt).getTime() : 0,
  };
};

export const mapShortApiToDisplay = s => {
  const user = s.user || {};
  const viewCount = s.viewCount ?? s._count?.views ?? 0;
  const pubAt = s.publishedAt || s.createdAt;
  const channelName = user.nickname || user.name || 'Unknown';
  return {
    id: s.id,
    type: 'short',
    title: (s.title || 'Untitled').slice(0, 80) + (s.title?.length > 80 ? '...' : ''),
    channelName,
    views: `${formatCount(viewCount)} views`,
    publishedAt: formatTimeAgo(pubAt),
    thumbnail: safeUri(s.thumbnailUrl || s.videoUrl) || 'https://via.placeholder.com/300',
    duration: s.duration ? formatDuration(s.duration) : 'SHORT',
    addedAt: s.addedAt ? new Date(s.addedAt).getTime() : 0,
  };
};
