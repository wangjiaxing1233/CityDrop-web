// Small shared helpers for displaying the API contract's enum values.
// Keeping these in one place means OrderPage.js / MyOrdersPage.js /
// OrderDetailPage.js all render the same labels for the same values.

export function modeLabel(mode) {
  return mode === "DRONE" ? "Drone Delivery" : "Ground Robot";
}

// The order the five-stage progress (Steps component) moves through. There
// is no separate "arrived but not yet moving" stage on the backend anymore
// -- claimVehicleAtDropoff assigns BEFORE_HALF_WAY directly the moment a
// vehicle is claimed at drop-off (see OrderQueueService), so PENDING_DROPOFF
// goes straight to BEFORE_HALF_WAY with nothing in between.
export const STATUS_SEQUENCE = [
  "PENDING_DROPOFF",
  "BEFORE_HALF_WAY",
  "HALF_WAY",
  "MORE_THAN_HALF_WAY",
  "DELIVERED",
];

const STATUS_LABELS = {
  PENDING_DROPOFF: "Pending drop-off",
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

// Matches the backend exactly (see OrderRepository.markDroppedOff /
// assignQueuedOrderAtStation, both of which flip refund_eligible to false in
// the same statement that sets BEFORE_HALF_WAY): still PENDING_DROPOFF or
// QUEUED at the moment of cancellation -> refund-eligible (no vehicle was
// ever claimed yet); BEFORE_HALF_WAY onward -> not.
export function isRefundEligible(status) {
  return status === "PENDING_DROPOFF" || status === "QUEUED";
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
