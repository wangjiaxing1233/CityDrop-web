// Small shared helpers for displaying the API contract's enum values.
// Keeping these in one place means OrderPage.js / MyOrdersPage.js /
// OrderDetailPage.js all render the same labels for the same values.

export function transportLabel(transport) {
  return transport === 'DRONE' ? 'Drone' : 'Ground Robot';
}

export const ACTIVE_STATUSES = [
  'QUEUED',
  'PENDING_DROPOFF',
  'ARRIVED_AT_STATION',
  'LEFT_STATION',
  'OUT_FOR_DELIVERY',
];

const STATUS_LABELS = {
  QUEUED: 'Queued',
  PENDING_DROPOFF: 'Pending drop-off',
  ARRIVED_AT_STATION: 'Arrived at station',
  LEFT_STATION: 'Left station',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

export function isActive(order) {
  return ACTIVE_STATUSES.includes(order.status);
}

export function isCompleted(order) {
  return order.status === 'DELIVERED' || order.status === 'CANCELLED';
}
