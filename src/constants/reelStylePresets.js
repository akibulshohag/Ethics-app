/**
 * Reel editor "Style" row — maps to FFmpeg filter ids in ethics-backend `shorts-ffmpeg-presets.ts`.
 * Keep in sync with FILTER_EFFECTS ids.
 */
export const REEL_STYLE_PRESETS = [
  { id: 'food-promo', label: 'Food Promo Style', filterId: null, speed: 1 },
  { id: 'restaurant', label: 'Restaurant ad Style', filterId: '2', speed: 1 },
  { id: 'trend', label: 'Trend ad Style', filterId: '4', speed: 1.15 },
  { id: 'snack', label: 'Snack reel Style', filterId: '6', speed: 1 },
];

/**
 * Effective filter for upload: manual Effect wins; else style preset's default filter.
 */
export function resolveReelUploadFilterId({ stylePresetId, selectedFilter }) {
  const manual = String(selectedFilter?.id ?? '').trim();
  if (manual && manual !== 'none') {
    return manual;
  }
  const preset = REEL_STYLE_PRESETS.find(
    p => p.id === String(stylePresetId || ''),
  );
  if (preset?.filterId) {
    return String(preset.filterId);
  }
  return 'none';
}
