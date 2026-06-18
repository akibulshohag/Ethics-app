// logo.png is 1000×323 — wide wordmark; always set explicit width + height.
export const LOGO_ASPECT_RATIO = 1000 / 323;

export function logoImageStyle(width) {
  return {
    width,
    height: Math.round(width / LOGO_ASPECT_RATIO),
    alignSelf: 'flex-start',
  };
}

/** Home / search headers */
export const HEADER_LOGO_STYLE = logoImageStyle(168);

/** Landing / onboarding header */
export const LANDING_LOGO_STYLE = logoImageStyle(196);
