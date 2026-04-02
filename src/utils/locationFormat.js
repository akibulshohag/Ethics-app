/** Short country label for UI (e.g. United Kingdom → UK). */
export const abbrevCountryLabel = country => {
  if (!country || typeof country !== 'string') return '';
  const t = country.trim();
  if (/^united kingdom$/i.test(t) || /^uk$/i.test(t)) return 'UK';
  if (/^(england|scotland|wales|northern ireland)$/i.test(t)) return 'UK';
  if (/^united states(\s+of\s+america)?$/i.test(t) || /^usa?$/i.test(t))
    return 'US';
  return t;
};

/**
 * Profile / card line: no full street — e.g. "High Wycombe, UK".
 * Handles UK comma addresses and merged segments like "United Kingdom HP13 6LW".
 */
export const formatShortProfileLocationLine = full => {
  if (!full || typeof full !== 'string') return '';
  const parts = full
    .split(',')
    .map(p => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0];

  const isUkPostcode = p =>
    /^[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}$/i.test(
      String(p).replace(/\s+/g, ' ').trim(),
    );
  const isUkCountryWord = p =>
    /^united kingdom$/i.test(p) ||
    /^uk$/i.test(p) ||
    /^(england|scotland|wales|northern ireland)$/i.test(p);

  for (let i = 0; i < parts.length; i++) {
    if (isUkCountryWord(parts[i]) && i > 0) {
      return `${parts[i - 1]}, UK`;
    }
    if (
      /united kingdom/i.test(parts[i]) &&
      /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i.test(parts[i])
    ) {
      if (i > 0) return `${parts[i - 1]}, UK`;
    }
  }

  const pcIdx = parts.findIndex(isUkPostcode);
  if (pcIdx >= 0) {
    let cityIdx = pcIdx - 1;
    if (cityIdx >= 0 && isUkCountryWord(parts[cityIdx])) cityIdx -= 1;
    const city = cityIdx >= 0 ? parts[cityIdx] : parts[0];
    return `${city}, UK`;
  }

  if (parts.length >= 3) {
    const country = parts[parts.length - 1];
    const city = parts[parts.length - 2];
    if (!isUkPostcode(country) && !/^\d/.test(country)) {
      return `${city}, ${abbrevCountryLabel(country)}`;
    }
  }
  if (parts.length === 2) {
    const [a, b] = parts;
    if (isUkCountryWord(b) || /^united kingdom/i.test(b)) return `${a}, UK`;
    if (isUkPostcode(b)) return `${a}, UK`;
    if (/^\d/.test(a) && !isUkPostcode(b)) return `${b}, UK`;
    if (!isUkPostcode(b)) return `${a}, ${abbrevCountryLabel(b)}`;
  }
  return parts[1] || parts[0];
};

/** Prefer API city/town + country; else parse full address string. */
export const buildShortLocationFromUser = (u = {}) => {
  if (!u || typeof u !== 'object') return '';
  const city =
    (u.city && String(u.city).trim()) ||
    (u.town && String(u.town).trim()) ||
    '';
  const country = u.country && String(u.country).trim();
  if (city && country) return `${city}, ${abbrevCountryLabel(country)}`;
  return formatShortProfileLocationLine(u.address || '') || '';
};

/**
 * Single-line town or city for compact cards (no street, no country).
 * Uses city/town fields; else first segment of parsed address.
 */
export const townOrCityOnlyFromUser = (u = {}) => {
  if (!u || typeof u !== 'object') return '';
  const direct =
    (u.city && String(u.city).trim()) ||
    (u.town && String(u.town).trim()) ||
    '';
  if (direct) return direct;
  const shortLine = formatShortProfileLocationLine(String(u.address || '').trim());
  if (shortLine) {
    const first = shortLine.split(',')[0].trim();
    return first || shortLine;
  }
  const raw = String(u.address || '')
    .trim()
    .split(',')[0]
    .trim();
  return raw || '';
};
