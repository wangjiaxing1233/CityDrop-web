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
  // Not part of STATUS_SEQUENCE — a cancelled order is a terminal branch off
  // the normal progress line, not a further step in it.
  CANCELLED: "Cancelled",
  // Also not part of STATUS_SEQUENCE — waiting for a vehicle, hasn't been
  // dispatched yet, so it isn't "on" the progress line at all.
  QUEUED: "Queued",
};

// Orders in these statuses can still be cancelled. Once DELIVERED or
// CANCELLED, cancellation is no longer offered.
export function isCancellable(status) {
  return status !== "DELIVERED" && status !== "CANCELLED";
}

// Per the Advanced Features doc: still PENDING_DROPOFF/AT_STATION at the
// moment of cancellation -> refund-eligible; BEFORE_HALF_WAY onward -> not.
// A QUEUED order never had a vehicle dispatched at all, so it's eligible too.
export function isRefundEligible(status) {
  return (
    status === "PENDING_DROPOFF" ||
    status === "AT_STATION" ||
    status === "QUEUED"
  );
}

export function statusLabel(status) {
  return STATUS_LABELS[status] || status;
}

// Parses a standard US "street, city, ST zip" address into its parts, e.g.
// "1000 The Embarcadero, San Francisco, CA 94133". This is a fixed postal
// format (not free-form language), so plain regex is faster and more
// reliable here than a model call — no network round trip, no risk of the
// wrong city being guessed. Returns null when the text doesn't match, so
// the caller can leave the form fields untouched rather than fill them with
// garbage.
export function parseAddress(text) {
  if (!text) return null;
  const match = text
    .trim()
    .match(/^(.+?),\s*([^,]+?),\s*([A-Za-z]{2})\s*,?\s*(\d{5})(-\d{4})?$/);
  if (!match) return null;
  return {
    street: match[1].trim(),
    city: match[2].trim(),
    state: match[3].toUpperCase(),
    zip: match[4],
  };
}
