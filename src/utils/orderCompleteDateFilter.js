/** Date-range filters for order lists (Today / Week / Month / custom date). */

export const COMPLETE_DATE_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'week', label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'date', label: 'Pick Date' },
];

export const RIDER_COMPLETE_STATUSES = ['delivery_complete', 'completed'];

export function isRiderCompleteStatus(status) {
  return RIDER_COMPLETE_STATUSES.includes(String(status || '').toLowerCase());
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function orderTimestamp(order) {
  const raw = order?.updatedAt || order?.createdAt;
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Whether an order falls in the selected date filter. */
export function matchesOrderDateFilter(order, filterId, customDate) {
  const id = String(filterId || 'all').toLowerCase();
  if (id === 'all') return true;

  const d = orderTimestamp(order);
  if (!d) return false;

  const now = new Date();

  if (id === 'today') {
    const start = startOfDay(now);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    return d >= start && d < end;
  }

  if (id === 'week') {
    const start = startOfDay(now);
    const day = start.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    start.setDate(start.getDate() - mondayOffset);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    return d >= start && d < end;
  }

  if (id === 'month') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return d >= start && d < end;
  }

  if (id === 'date') {
    if (!customDate) return true;
    const pick = startOfDay(new Date(customDate));
    if (Number.isNaN(pick.getTime())) return true;
    const end = new Date(pick);
    end.setDate(end.getDate() + 1);
    return d >= pick && d < end;
  }

  return true;
}

export { matchesOrderDateFilter as matchesCompleteDateFilter };
