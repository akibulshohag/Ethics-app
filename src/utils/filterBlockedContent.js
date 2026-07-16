export function getContentOwnerId(item) {
  if (!item || typeof item !== 'object') return '';
  return String(
    item.userId ??
      item.user?.id ??
      item.ownerId ??
      item._campaignOwnerUser?.id ??
      '',
  ).trim();
}

export function filterBlockedContent(items, blockedUserIds) {
  const blocked = new Set(
    (blockedUserIds || []).map(id => String(id).trim()).filter(Boolean),
  );
  if (!blocked.size) return items || [];
  return (items || []).filter(item => {
    const ownerId = getContentOwnerId(item);
    return !ownerId || !blocked.has(ownerId);
  });
}

export function isUserBlocked(blockedUserIds, userId) {
  const id = String(userId || '').trim();
  if (!id) return false;
  return (blockedUserIds || []).some(b => String(b) === id);
}
