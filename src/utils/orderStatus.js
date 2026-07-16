/** Shared restaurant order status labels and groupings. */

export const ORDER_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  PREPARING: 'preparing',
  READY: 'ready',
  RIDER_ASSIGNED: 'rider_assigned',
  RIDER_ACCEPTED: 'rider_accepted',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERY_COMPLETE: 'delivery_complete',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
};

/** Pick up at restaurant (stored as fulfillmentType collection). */
export function isPickupFulfillment(fulfillmentType) {
  return String(fulfillmentType || '').toLowerCase() === 'collection';
}

/** Home delivery with rider (stored as fulfillmentType delivery). UI label: Collection. */
export function isDeliveryFulfillment(fulfillmentType) {
  return !isPickupFulfillment(fulfillmentType);
}

export const OWNER_IN_PROGRESS_STATUSES = [
  'preparing',
  'ready',
  'rider_assigned',
  'rider_accepted',
  'out_for_delivery',
  'confirmed',
];

/** Owner Live Orders — preparing only (assign rider from order details). */
export const OWNER_PREPARING_STATUSES = ['preparing'];

/** Owner Live Orders — accepted by rider / out for delivery / ready for pick-up. */
export const OWNER_DELIVERY_IN_PROGRESS_STATUSES = [
  'ready',
  'rider_assigned',
  'rider_accepted',
  'out_for_delivery',
  'delivery_complete',
  'confirmed',
];

export const CUSTOMER_IN_PROGRESS_STATUSES = [
  'preparing',
  'ready',
  'rider_assigned',
  'rider_accepted',
  'out_for_delivery',
  'delivery_complete',
  'confirmed',
];

export const RIDER_ASSIGNED_TAB = ['rider_assigned'];
export const RIDER_IN_PROGRESS_TAB = ['rider_accepted', 'out_for_delivery'];

export function orderStatusLabel(status) {
  const s = String(status || '').toLowerCase();
  switch (s) {
    case 'pending':
      return 'Pending';
    case 'confirmed':
      return 'Accepted';
    case 'preparing':
      return 'Preparing';
    case 'ready':
      return 'Ready';
    case 'rider_assigned':
      return 'Awaiting rider';
    case 'rider_accepted':
      return 'Rider accepted';
    case 'out_for_delivery':
      return 'On the way';
    case 'delivery_complete':
      return 'Delivery complete';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Rejected';
    default:
      return status || 'Pending';
  }
}

export function orderStatusColor(status) {
  switch (String(status || '').toLowerCase()) {
    case 'completed':
      return '#22c55e';
    case 'cancelled':
      return '#F04438';
    case 'ready':
      return '#16a34a';
    case 'out_for_delivery':
      return '#2563eb';
    case 'delivery_complete':
      return '#0ea5e9';
    case 'rider_accepted':
    case 'rider_assigned':
    case 'preparing':
    case 'confirmed':
      return '#FDB022';
    default:
      return '#666';
  }
}

/** Customer-facing label — delivery rider steps stay "Preparing" until owner starts. */
export function customerOrderStatusLabel(status, fulfillmentType) {
  const s = String(status || '').toLowerCase();
  const pickup = isPickupFulfillment(fulfillmentType);

  if (pickup) {
    switch (s) {
      case 'pending':
        return 'Pending';
      case 'confirmed':
      case 'preparing':
        return 'Preparing';
      case 'ready':
        return 'Ready';
      case 'completed':
        return 'Completed';
      case 'cancelled':
        return 'Rejected';
      default:
        return orderStatusLabel(status);
    }
  }

  switch (s) {
    case 'pending':
      return 'Pending';
    case 'confirmed':
    case 'preparing':
    case 'rider_assigned':
    case 'rider_accepted':
      return 'Preparing';
    case 'out_for_delivery':
      return 'On the way';
    case 'delivery_complete':
      return 'Delivered';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Rejected';
    default:
      return orderStatusLabel(status);
  }
}

export function customerOrderStatusColor(status, fulfillmentType) {
  const s = String(status || '').toLowerCase();
  const pickup = isPickupFulfillment(fulfillmentType);

  if (pickup && s === 'ready') {
    return '#16a34a';
  }

  switch (s) {
    case 'completed':
      return '#22c55e';
    case 'cancelled':
      return '#F04438';
    case 'out_for_delivery':
      return '#2563eb';
    case 'delivery_complete':
      return '#0ea5e9';
    case 'confirmed':
    case 'preparing':
    case 'rider_assigned':
    case 'rider_accepted':
      return '#FDB022';
    case 'pending':
      return '#666';
    default:
      return '#666';
  }
}
