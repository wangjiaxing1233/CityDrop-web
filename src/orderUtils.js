// Small shared helpers for displaying the API contract's enum values.
// Keeping these in one place means OrderPage.js / MyOrdersPage.js /
// OrderDetailPage.js all render the same labels for the same values.

export function modeLabel(mode) {
  return mode === "DRONE" ? "Drone Delivery" : "Ground Robot";
}

// The order the six-stage progress (Steps component) moves through.
export const STATUS_SEQUENCE = [
  "PENDING_DROPOFF",
  "AT_STATION",
  "BEFORE_HALF_WAY",
  "HALF_WAY",
  "MORE_THAN_HALF_WAY",
  "DELIVERED",
];

const STATUS_LABELS = {
  PENDING_DROPOFF: "Pending drop-off",
  AT_STATION: "At station",
  BEFORE_HALF_WAY: "On the way",
  HALF_WAY: "Halfway there",
  MORE_THAN_HALF_WAY: "Almost there",
  DELIVERED: "Delivered",
};

export function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}
