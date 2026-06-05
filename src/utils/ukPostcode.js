/** UK postcode validation and normalisation (GB). */

import { formatCityCountryPostcodeLine } from './locationFormat';

const UK_FULL_POSTCODE =
  /^([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/i;

const UK_OUTWARD =
  /^([A-Z]{1,2}\d[A-Z\d]?)$/i;

/** Normalise to "WD5 0AB" format. Returns null if empty/invalid. */
export function normalizeUkPostcode(raw) {
  const s = String(raw || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '');
  if (!s) return null;
  if (s.length <= 4) {
    return UK_OUTWARD.test(s) ? s : null;
  }
  const inward = s.slice(-3);
  const outward = s.slice(0, -3);
  const combined = `${outward} ${inward}`;
  return UK_FULL_POSTCODE.test(combined) ? combined : null;
}

export function isValidUkPostcode(raw) {
  const n = normalizeUkPostcode(raw);
  return n != null && n.length > 0;
}

/** Outward code e.g. WD5 from WD5 0AB */
export function outwardUkPostcode(postcode) {
  const n = normalizeUkPostcode(postcode);
  if (!n) return '';
  return n.split(/\s+/)[0] || '';
}

/** Pull first UK postcode from a free-text address. */
export function extractUkPostcodeFromText(text) {
  const m = String(text || '').match(
    /\b([A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})\b/i,
  );
  return m ? normalizeUkPostcode(m[1]) : null;
}

/** Short label for header: "City, United Kingdom, POSTCODE" */
export function browseAreaLabel({ postcode, addressText, areaLabel }) {
  const formatted = formatCityCountryPostcodeLine({
    addressText,
    postcode,
    areaLabel,
  });
  if (formatted && formatted !== 'Set your area') return formatted;
  const pc = String(postcode || '').trim();
  if (pc) return pc;
  const area = String(areaLabel || '').trim();
  if (area) return area;
  return 'Set your area';
}

export const UK_DEFAULT_RADIUS_KM = 15;

export const UK_POPULAR_AREAS = [
  'London SW1A',
  'London E1',
  'Manchester M1',
  'Birmingham B1',
  'Leeds LS1',
  'Liverpool L1',
  'Bristol BS1',
  'Abbots Langley WD5',
  'Watford WD17',
  'Reading RG1',
  'Brighton BN1',
  'Edinburgh EH1',
  'Glasgow G1',
  'Cardiff CF10',
];
