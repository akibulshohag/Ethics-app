import ReactNativeBlobUtil from 'react-native-blob-util';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DOWNLOADS_KEY = '@ethics_downloaded_videos';

const getDownloads = async () => {
  try {
    const raw = await AsyncStorage.getItem(DOWNLOADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const saveDownloads = async list => {
  await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(list));
};

/**
 * Download video to device for offline playback.
 * @param {object} video - { id, title, videoUrl, thumbnail, channelName, duration }
 * @param {function} onProgress - (percent) => {} 0-100
 * @returns {Promise<{path: string}>}
 */
export const downloadVideo = async (video, onProgress) => {
  if (!video?.videoUrl || !video?.id) {
    throw new Error('Invalid video: missing videoUrl or id');
  }
  const { fs } = ReactNativeBlobUtil;
  const dirs = fs.dirs;
  const filename = `video_${video.id}.mp4`;
  const path = `${dirs.CacheDir}/${filename}`;

  const downloads = await getDownloads();
  const existing = downloads.find(d => d.videoId === video.id);
  if (existing) {
    const exists = await fs.exists(existing.localPath);
    if (exists) {
      return { path: existing.localPath, alreadyDownloaded: true };
    }
    // File missing, remove from list
    await saveDownloads(downloads.filter(d => d.videoId !== video.id));
  }

  return ReactNativeBlobUtil.config({
    path,
    overwrite: true,
    fileCache: false,
  })
    .fetch('GET', video.videoUrl, {})
    .progress((received, total) => {
      if (onProgress && total > 0) {
        const pct = Math.round((received / total) * 100);
        onProgress(Math.min(100, pct));
      }
    })
    .then(async res => {
      const filePath = res.path();
      const entry = {
        videoId: video.id,
        localPath: filePath,
        title: video.title || 'Untitled',
        thumbnail: video.thumbnail,
        channelName: video.channelName,
        duration: video.duration,
        downloadedAt: Date.now(),
      };
      const list = await getDownloads();
      const filtered = list.filter(d => d.videoId !== video.id);
      await saveDownloads([...filtered, entry]);
      return { path: filePath };
    });
};

/**
 * Check if video is downloaded.
 */
export const isVideoDownloaded = async videoId => {
  const list = await getDownloads();
  const entry = list.find(d => d.videoId === videoId);
  if (!entry) return false;
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(entry.localPath);
    if (!exists) {
      await saveDownloads(list.filter(d => d.videoId !== videoId));
      return false;
    }
    return true;
  } catch {
    return false;
  }
};

/**
 * Get local file path for downloaded video. Returns null if not downloaded.
 */
export const getLocalPath = async videoId => {
  const list = await getDownloads();
  const entry = list.find(d => d.videoId === videoId);
  if (!entry) return null;
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(entry.localPath);
    if (!exists) {
      await saveDownloads(list.filter(d => d.videoId !== videoId));
      return null;
    }
    return `file://${entry.localPath}`;
  } catch {
    return null;
  }
};

/**
 * Get all downloaded videos for Library.
 */
export const getDownloadedVideos = async () => {
  const list = await getDownloads();
  const valid = [];
  for (const d of list) {
    try {
      const exists = await ReactNativeBlobUtil.fs.exists(d.localPath);
      if (exists) {
        valid.push({
          id: d.videoId,
          type: 'video',
          title: d.title,
          channelName: d.channelName,
          thumbnail: d.thumbnail,
          duration: d.duration,
          localPath: `file://${d.localPath}`,
          downloadedAt: d.downloadedAt,
          views: 'Offline',
          publishedAt: 'Downloaded',
        });
      }
    } catch {}
  }
  // Clean stale entries
  if (valid.length !== list.length) {
    await saveDownloads(
      valid.map(v => ({
        videoId: v.id,
        localPath: v.localPath.replace('file://', ''),
        title: v.title,
        thumbnail: v.thumbnail,
        channelName: v.channelName,
        duration: v.duration,
        downloadedAt: Date.now(),
      })),
    );
  }
  return valid.sort((a, b) => (b.downloadedAt || 0) - (a.downloadedAt || 0));
};

/**
 * Get downloaded video metadata by id (for offline playback).
 */
export const getDownloadedVideoById = async videoId => {
  const list = await getDownloads();
  const entry = list.find(d => d.videoId === videoId);
  if (!entry) return null;
  try {
    const exists = await ReactNativeBlobUtil.fs.exists(entry.localPath);
    if (!exists) return null;
    return {
      id: entry.videoId,
      title: entry.title,
      thumbnail: entry.thumbnail,
      channelName: entry.channelName,
      duration: entry.duration,
      localPath: `file://${entry.localPath}`,
    };
  } catch {
    return null;
  }
};

/**
 * Remove downloaded video.
 */
export const removeDownload = async videoId => {
  const list = await getDownloads();
  const entry = list.find(d => d.videoId === videoId);
  if (entry) {
    try {
      await ReactNativeBlobUtil.fs.unlink(entry.localPath);
    } catch {}
    await saveDownloads(list.filter(d => d.videoId !== videoId));
  }
};
