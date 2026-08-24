export const PHOTO_DEFAULT_SEC = 3;
export const PHOTO_MAX_SEC = 8;
export const MAX_CLIPS = 8;

export const makeClipId = () =>
  `clip-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

const isImageMime = mime => String(mime || '').toLowerCase().startsWith('image/');

export function clipFromPickerAsset(asset, kind) {
  const isPhoto =
    kind === 'photo' ||
    isImageMime(asset?.type) ||
    isImageMime(asset?.mime);
  const durationSec = isPhoto
    ? PHOTO_DEFAULT_SEC
    : Math.max(0.5, Number(asset?.duration ?? asset?.durationSec) || 3);
  return {
    id: makeClipId(),
    type: isPhoto ? 'photo' : 'video',
    uri: String(asset?.uri || ''),
    mime: asset?.type || asset?.mime || (isPhoto ? 'image/jpeg' : 'video/mp4'),
    name: asset?.fileName || asset?.name || (isPhoto ? 'photo.jpg' : 'clip.mp4'),
    durationSec,
    width: Number(asset?.width || 0),
    height: Number(asset?.height || 0),
    trimStartSec: 0,
    trimEndSec: durationSec,
    speedFactor: 1,
    volume: 1,
  };
}

export function clipFromVideoAsset(video) {
  if (!video?.uri) return null;
  const durationSec = Math.max(0.5, Number(video.durationSec || video.duration) || 3);
  return {
    id: makeClipId(),
    type: 'video',
    uri: String(video.uri),
    mime: video.type || video.mime || 'video/mp4',
    name: video.name || 'reel.mp4',
    durationSec,
    width: Number(video.width || 0),
    height: Number(video.height || 0),
    trimStartSec: 0,
    trimEndSec: durationSec,
    speedFactor: 1,
    volume: 1,
  };
}

export function clipFromPhotoAsset(photo) {
  if (!photo?.uri) return null;
  return {
    id: makeClipId(),
    type: 'photo',
    uri: String(photo.uri),
    mime: photo.type || photo.mime || 'image/jpeg',
    name: photo.name || 'photo.jpg',
    durationSec: PHOTO_DEFAULT_SEC,
    width: Number(photo.width || 0),
    height: Number(photo.height || 0),
    trimStartSec: 0,
    trimEndSec: PHOTO_DEFAULT_SEC,
    speedFactor: 1,
    volume: 1,
  };
}

export function normalizeClip(raw, idx = 0) {
  if (!raw || !raw.uri) return null;
  const type =
    raw.type === 'photo' || isImageMime(raw.mime || raw.type) ? 'photo' : 'video';
  const durationSec = Math.max(
    0.5,
    Number(raw.durationSec || raw.duration) || (type === 'photo' ? PHOTO_DEFAULT_SEC : 3),
  );
  let trimStart = Math.max(0, Number(raw.trimStartSec || 0));
  let trimEnd = Number(raw.trimEndSec || durationSec);
  if (!Number.isFinite(trimEnd) || trimEnd <= trimStart) trimEnd = durationSec;
  trimEnd = Math.min(durationSec, Math.max(trimStart + 0.05, trimEnd));
  return {
    id: String(raw.id || `clip-${idx}-${Date.now()}`),
    type,
    uri: String(raw.uri),
    mime: raw.mime || raw.type || (type === 'photo' ? 'image/jpeg' : 'video/mp4'),
    name: raw.name || (type === 'photo' ? 'photo.jpg' : 'clip.mp4'),
    durationSec,
    width: Number(raw.width || 0),
    height: Number(raw.height || 0),
    trimStartSec: trimStart,
    trimEndSec: trimEnd,
    speedFactor: Math.max(0.25, Math.min(4, Number(raw.speedFactor || 1))),
    volume: Math.max(0, Math.min(2, Number(raw.volume ?? 1))),
  };
}

export function clipsFromDraft(draft) {
  if (Array.isArray(draft?.clips) && draft.clips.length) {
    return draft.clips.map(normalizeClip).filter(Boolean);
  }
  const fromVideo = clipFromVideoAsset(draft?.video);
  if (fromVideo) return [fromVideo];
  const fromPhoto = clipFromPhotoAsset(draft?.photo);
  if (fromPhoto) return [fromPhoto];
  return [];
}

export function clipPlayDuration(clip) {
  if (!clip) return 0.05;
  const raw = Math.max(
    0.05,
    Number(clip.trimEndSec) - Number(clip.trimStartSec || 0),
  );
  const speed = Math.max(0.25, Number(clip.speedFactor) || 1);
  return raw / speed;
}

export function totalTimelineDuration(clips) {
  const list = Array.isArray(clips) ? clips : [];
  const sum = list.reduce((s, c) => s + clipPlayDuration(c), 0);
  return Math.max(0.05, sum);
}

export function locateClipAtTime(clips, t) {
  const list = Array.isArray(clips) && clips.length ? clips : [];
  if (!list.length) {
    return {
      index: 0,
      clip: null,
      localPlay: 0,
      sourceT: 0,
      startOnTimeline: 0,
      duration: 0.05,
    };
  }
  let acc = 0;
  const x = Math.max(0, Number(t) || 0);
  for (let i = 0; i < list.length; i += 1) {
    const d = clipPlayDuration(list[i]);
    if (x < acc + d || i === list.length - 1) {
      const localPlay = Math.max(0, Math.min(d, x - acc));
      const speed = Math.max(0.25, Number(list[i].speedFactor) || 1);
      const sourceT = Number(list[i].trimStartSec || 0) + localPlay * speed;
      return {
        index: i,
        clip: list[i],
        localPlay,
        sourceT,
        startOnTimeline: acc,
        duration: d,
      };
    }
    acc += d;
  }
  return {
    index: 0,
    clip: list[0],
    localPlay: 0,
    sourceT: Number(list[0].trimStartSec || 0),
    startOnTimeline: 0,
    duration: clipPlayDuration(list[0]),
  };
}

export function timelineSecFromSource(clips, clipIndex, sourceT) {
  const loc = clips[clipIndex];
  if (!loc) return 0;
  let acc = 0;
  for (let i = 0; i < clipIndex; i += 1) acc += clipPlayDuration(clips[i]);
  const speed = Math.max(0.25, Number(loc.speedFactor) || 1);
  const local = Math.max(0, Number(sourceT) - Number(loc.trimStartSec || 0)) / speed;
  return acc + local;
}

export function primaryVideoFromClips(clips) {
  const list = Array.isArray(clips) ? clips : [];
  const firstVideo = list.find(c => c.type === 'video');
  const first = firstVideo || list[0];
  if (!first) return null;
  return {
    uri: first.uri,
    type: first.mime,
    name: first.name,
    durationSec: totalTimelineDuration(list),
    width: first.width,
    height: first.height,
    isPhoto: first.type === 'photo',
  };
}

export function firstPhotoFromClips(clips) {
  const photo = (Array.isArray(clips) ? clips : []).find(c => c.type === 'photo');
  if (!photo) return null;
  return {
    uri: photo.uri,
    type: photo.mime,
    name: photo.name,
    width: photo.width,
    height: photo.height,
  };
}

export function thumbnailFromClips(clips, existing) {
  if (existing?.uri) return existing;
  const photo = firstPhotoFromClips(clips);
  if (photo) return { uri: photo.uri, type: photo.type, name: photo.name };
  return null;
}

export function mediaKindFromClips(clips) {
  const list = Array.isArray(clips) ? clips : [];
  const hasVideo = list.some(c => c.type === 'video');
  const hasPhoto = list.some(c => c.type === 'photo');
  if (hasVideo && hasPhoto) return 'mixed';
  if (hasPhoto && !hasVideo) return 'photo';
  return 'video';
}

export function uniqueClipFiles(clips) {
  const files = [];
  const indexByUri = {};
  const mapped = [];
  (Array.isArray(clips) ? clips : []).forEach(c => {
    if (!c?.uri) return;
    if (indexByUri[c.uri] == null) {
      indexByUri[c.uri] = files.length;
      files.push(c);
    }
    mapped.push({
      fileIndex: indexByUri[c.uri],
      type: c.type,
      trimStartSec: Number(c.trimStartSec || 0),
      trimEndSec: Number(c.trimEndSec || c.durationSec || 3),
      speedFactor: Number(c.speedFactor || 1),
      volume: Number(c.volume ?? 1),
      durationSec: Number(c.durationSec || 3),
    });
  });
  return { files, clips: mapped };
}

/** Unique multipart names so 2–3 videos are not collapsed as clip.mp4. */
export function clipUploadPart(clip, index) {
  const isPhoto = clip?.type === 'photo';
  const ext =
    String(clip?.name || '').match(/\.[a-z0-9]+$/i)?.[0] ||
    (isPhoto ? '.jpg' : '.mp4');
  return {
    uri: clip.uri,
    type: clip.mime || (isPhoto ? 'image/jpeg' : 'video/mp4'),
    name: `join-clip-${index}${ext}`,
  };
}

export function splitClipAtSourceTime(clip, sourceT) {
  const t = Number(sourceT);
  const start = Number(clip.trimStartSec || 0);
  const end = Number(clip.trimEndSec || clip.durationSec);
  if (!Number.isFinite(t) || t <= start + 0.2 || t >= end - 0.2) return null;
  const left = {
    ...clip,
    id: makeClipId(),
    trimEndSec: t,
  };
  const right = {
    ...clip,
    id: makeClipId(),
    trimStartSec: t,
  };
  return [left, right];
}
