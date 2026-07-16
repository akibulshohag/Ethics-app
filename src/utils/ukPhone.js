/** Normalize UK phone to local 0-prefixed digits (spaces removed). */
export function normalizeUkPhone(phone) {
  let p = String(phone || '').replace(/[\s\-().]/g, '');
  if (!p) return '';
  if (p.startsWith('+44')) p = `0${p.slice(3)}`;
  else if (p.startsWith('0044')) p = `0${p.slice(4)}`;
  else if (p.startsWith('44') && p.length >= 12) p = `0${p.slice(2)}`;
  return p;
}

/** UK mobile and landline (10–11 digits starting with 0). */
export function validUkPhoneNumber(phone) {
  const p = normalizeUkPhone(phone);
  if (!p) return false;
  if (/^07\d{9}$/.test(p)) return true;
  if (/^0[1-9]\d{8,9}$/.test(p)) return true;
  return false;
}

export function formatUkPhoneDisplay(phone) {
  const p = normalizeUkPhone(phone);
  if (!p) return '';
  if (/^07\d{9}$/.test(p)) {
    return `${p.slice(0, 5)} ${p.slice(5, 8)} ${p.slice(8)}`;
  }
  return p;
}
