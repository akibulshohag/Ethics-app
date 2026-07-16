export function getVendorOrderLimits(profile) {
  const role = String(profile?.role || '').toLowerCase();
  if (role !== 'vendor') {
    return { isVendor: false, min: null, max: null };
  }

  const minRaw = profile?.vendorMinOrderQty;
  const maxRaw = profile?.vendorMaxOrderQty;
  const min =
    minRaw != null && Number(minRaw) > 0 ? Math.floor(Number(minRaw)) : null;
  const max =
    maxRaw != null && Number(maxRaw) > 0 ? Math.floor(Number(maxRaw)) : null;

  return { isVendor: true, min, max };
}

export function validateVendorOrderItems(items, limits) {
  if (!limits?.isVendor) return { ok: true };

  const errors = [];
  for (const item of items || []) {
    const qty = Math.floor(Number(item?.quantity) || 0);
    if (qty <= 0) continue;
    const name = item?.itemName || 'Item';
    if (limits.min != null && qty < limits.min) {
      errors.push(`${name}: minimum ${limits.min} (you have ${qty})`);
    }
    if (limits.max != null && qty > limits.max) {
      errors.push(`${name}: maximum ${limits.max} (you have ${qty})`);
    }
  }

  if (!errors.length) return { ok: true };
  return {
    ok: false,
    message: errors.join('. '),
    firstError: errors[0],
  };
}

export function adjustVendorItemQty(currentQty, delta, limits) {
  const cur = Math.max(0, Math.floor(Number(currentQty) || 0));
  const step = Number(delta) || 0;
  if (!step) return { qty: cur, toast: null };

  if (!limits?.isVendor || (limits.min == null && limits.max == null)) {
    return { qty: Math.max(0, cur + step), toast: null };
  }

  if (step > 0) {
    if (cur === 0 && limits.min != null) {
      return { qty: limits.min, toast: null };
    }
    const next = cur + step;
    if (limits.max != null && next > limits.max) {
      return {
        qty: cur,
        toast: `Maximum ${limits.max} per item for this vendor`,
      };
    }
    return { qty: next, toast: null };
  }

  if (cur === 0) return { qty: 0, toast: null };
  if (limits.min != null && cur <= limits.min) {
    return { qty: 0, toast: null };
  }
  const next = cur + step;
  if (next > 0 && limits.min != null && next < limits.min) {
    return { qty: 0, toast: null };
  }
  return { qty: Math.max(0, next), toast: null };
}

export function vendorOrderLimitsHint(limits) {
  if (!limits?.isVendor) return '';
  const parts = [];
  if (limits.min != null) parts.push(`Min ${limits.min} per item`);
  if (limits.max != null) parts.push(`Max ${limits.max} per item`);
  return parts.join(' · ');
}
