/**
 * Normalized text anchor for overlay layers (preview + upload burn-in).
 * Matches ASS \\an alignment used in ethics-backend shorts-transcode.
 */
export const TEXT_ANCHOR_IDS = [
  'tl',
  'tc',
  'tr',
  'cl',
  'cc',
  'cr',
  'bl',
  'bc',
  'br',
];

export function normalizeAnchor(value) {
  const a = String(value || '').toLowerCase();
  return TEXT_ANCHOR_IDS.includes(a) ? a : 'tl';
}

/**
 * Absolute left/top for a layer inside a video box of size videoW x videoH,
 * given measured text box layoutW x layoutH and anchor point at (xPct, yPct).
 */
export function computeOverlayPositionStyle({
  anchor,
  xPct,
  yPct,
  videoW,
  videoH,
  layoutW,
  layoutH,
}) {
  const ax = normalizeAnchor(anchor);
  const x = Number(xPct) * videoW;
  const y = Number(yPct) * videoH;
  const lw = Math.max(0, Number(layoutW) || 0);
  const lh = Math.max(0, Number(layoutH) || 0);
  let left = x;
  let top = y;
  switch (ax) {
    case 'tl':
      break;
    case 'tc':
      left = x - lw / 2;
      break;
    case 'tr':
      left = x - lw;
      break;
    case 'cl':
      top = y - lh / 2;
      break;
    case 'cc':
      left = x - lw / 2;
      top = y - lh / 2;
      break;
    case 'cr':
      left = x - lw;
      top = y - lh / 2;
      break;
    case 'bl':
      top = y - lh;
      break;
    case 'bc':
      left = x - lw / 2;
      top = y - lh;
      break;
    case 'br':
      left = x - lw;
      top = y - lh;
      break;
    default:
      break;
  }
  return { left, top };
}
