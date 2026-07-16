/** Open short or video for a discovery restaurant row. */
export function openDiscoveryMedia(navigation, row, { onFallback } = {}) {
  if (!row?.mediaId || row?.mediaType === 'none') {
    onFallback?.(row);
    return;
  }
  if (row.mediaType === 'short') {
    navigation.navigate('ProductShortsVideo', {
      item: {
        id: row.mediaId,
        type: 'short',
        videoUrl: row.mediaUrl || row.mediaThumb,
        userId: row.id,
        title: row.name,
      },
    });
    return;
  }
  navigation.navigate('VideoDetailsScreen', { videoId: row.mediaId });
}
