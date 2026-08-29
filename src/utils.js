import { STATUS_SEQUENCE, isRefundEligible } from "./orderUtils";

// ============================================================
// MOCK SWITCH — flip this one line when the real backend is ready.
// ============================================================
// true  = every function below returns fake data from memory, instantly
//         (well, with a short fake delay) — no backend needs to be running.
// false = every function below does what it always did: a real fetch()
//         call to the Spring Boot backend on localhost:8080.
//
// Every page (LoginPage.js, OrderPage.js, MyOrdersPage.js,
// OrderDetailPage.js) only ever imports login/register/getOrders/... from
// this file — none of them know or care which mode is active. That's the
// whole point of keeping every backend call in this one file instead of
// scattering fetch() calls across pages: swapping real for fake touches
// exactly one line, here, and nothing else in the app changes.
const USE_MOCK = false;

// Auth is session/cookie based (Spring Security), not bearer-token — every
// authenticated call needs credentials: "include" so the browser sends and
// stores the session cookie. There's no token to attach as a header.
const CREDENTIALS = { credentials: "include" };

// Every error response from the real backend is { "error": "<message>" }
// (see Endpoint+Contract.docx) — this reads that message out so each
// function below can just throw a real, human-readable Error.
async function readError(response) {
  if (response.status === 401) {
    // The session cookie is missing or the server no longer recognizes it
    // (expired, or the account behind it is gone) -- every Real function
    // below funnels its non-ok responses through here, so this is the one
    // place that can reliably notice "we're not actually logged in
    // anymore," regardless of which call surfaced it. Without this, the
    // frontend's own localStorage-based "am I logged in" flag (see App.js)
    // just keeps saying yes forever, even once the backend has stopped
    // agreeing -- every click looks like it's silently failing instead of
    // sending the user back to log in again.
    window.dispatchEvent(new Event("citydrop:unauthorized"));
  }
  try {
    const data = await response.json();
    if (data && data.error) return data.error;
  } catch (e) {
    // response body wasn't JSON (e.g. the backend isn't running at all) —
    // fall through to the generic message below.
  }
  return "Request failed (status " + response.status + ")";
}

// ============================================================
// REAL implementations — one fetch() per endpoint, unchanged from before.
// ============================================================

async function loginReal(credential) {
  // Spring Security's default formLogin() reads username/password as form
  // fields (request.getParameter), not a JSON body -- unlike /register and
  // every other real endpoint here, which do take JSON.
  const response = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(credential).toString(),
    ...CREDENTIALS,
  });
  if (!response.ok) throw new Error(await readError(response));
  // Success is 204 No Content — the backend doesn't hand back a token or
  // profile, so the logged-in identity is just the username we submitted.
  return { username: credential.username };
}

async function registerReal(credential) {
  const response = await fetch("/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credential),
    ...CREDENTIALS,
  });
  if (!response.ok) throw new Error(await readError(response));
  return { username: credential.username };
}

async function logoutReal() {
  const response = await fetch("/logout", {
    method: "POST",
    ...CREDENTIALS,
  });
  if (!response.ok) throw new Error(await readError(response));
}

// The backend's DeliveryQuote is a plain REST DTO (vehicle/stationId/price/
// time/available/recommended/...); OrderPage.js was built against the
// mock's richer, UI-shaped option (mode/stationName/etaText/expiresAt/...).
// Rather than bloat the backend response with display-only concerns, adapt
// it here -- this file is already the one place backend-shape knowledge is
// allowed to live.
function adaptDeliveryQuote(quote, quoteId, expiresAt) {
  const roundedMinutes = Math.round(quote.time);
  return {
    ...quote,
    mode: quote.vehicle,
    stationName: "Station #" + quote.stationId,
    time: roundedMinutes,
    etaText: "Approx. " + roundedMinutes + " min",
    timeIsFallback: false,
    quoteId,
    expiresAt,
    // quote.available (spread in above) is now a real field from the
    // backend -- a best-effort snapshot of stock at quote time, purely
    // informational (a "Sold out" hint). It's never re-checked or enforced
    // at submission -- placing an order always succeeds regardless, so this
    // can go stale between the quote and the submit without consequence.
  };
}

async function getDeliveryOptionsReal(fields) {
  const params = new URLSearchParams(fields);
  const response = await fetch("/delivery-options?" + params.toString(), {
    ...CREDENTIALS,
  });
  if (!response.ok) throw new Error(await readError(response));
  const quotes = await response.json(); // DeliveryQuote[]
  const quoteId = "q" + quoteCounter++;
  const expiresAt = Date.now() + QUOTE_WINDOW_MS;
  return quotes.map((quote) => adaptDeliveryQuote(quote, quoteId, expiresAt));
}

async function placeOrderReal(fields) {
  const response = await fetch("/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
    ...CREDENTIALS,
  });
  // Submission always succeeds as PENDING_DROPOFF regardless of station stock
  // -- it's just a commitment, not a vehicle claim. A vehicle is only ever
  // actually claimed later, at drop-off (confirmAtStation), where the order
  // queues automatically if none is idle then. There's no "sold out" outcome
  // to special-case here anymore.
  if (!response.ok) throw new Error(await readError(response));
  return response.json(); // Order
}

async function getOrdersReal() {
  const response = await fetch("/order", { ...CREDENTIALS });
  if (!response.ok) throw new Error(await readError(response));
  const { active, completed } = await response.json(); // { active: [{orderId}], completed: [{orderId}] }
  const [activeOrders, completedOrders] = await Promise.all([
    Promise.all(active.map((o) => getOrderReal(o.orderId))),
    Promise.all(completed.map((o) => getOrderReal(o.orderId))),
  ]);
  return { active: activeOrders, completed: completedOrders };
}

async function getOrderReal(orderId) {
  const response = await fetch("/order/" + orderId, {
    ...CREDENTIALS,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json(); // Order
}

// User-triggered: they physically dropped the package at the station and
// are confirming it themselves, unlike every later stage which the backend
// advances on its own.
async function confirmAtStationReal(orderId) {
  const response = await fetch("/order/" + orderId + "/dropped-off", {
    method: "PATCH",
    ...CREDENTIALS,
  });
  if (!response.ok) throw new Error(await readError(response));
  // The endpoint's success body is just the new status string (e.g.
  // "BEFORE_HALF_WAY"), not a full Order — re-fetch so callers always get
  // the same Order shape getOrder() returns everywhere else.
  await response.text();
  return getOrderReal(orderId);
}

// Feature 4 (AI Customer Support): `history` is every prior {role, content}
// turn in this conversation so far (the backend is stateless per request —
// it has no memory of earlier messages unless we hand them back each time).
// The backend re-derives which user this is from the session cookie, same
// as every other Real function here — it never trusts a userId from us.
async function sendChatMessageReal(message, history) {
  const response = await fetch("/chat", {
    method: "POST",
    ...CREDENTIALS,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json(); // { reply, suggestCreateOrder, offerHumanHelp, suggestCancelOrderId }
}

// Feature 4 (AI Customer Support), voice: uploads a recorded clip and gets
// back the transcribed text. multipart/form-data, not JSON — the browser
// sets the boundary itself from the FormData body, so no Content-Type
// header is set here (setting one manually would drop the boundary).
async function transcribeAudioReal(audioBlob) {
  const formData = new FormData();
  formData.append("audio", audioBlob, "recording.webm");
  const response = await fetch("/chat/transcribe", {
    method: "POST",
    ...CREDENTIALS,
    body: formData,
  });
  if (!response.ok) throw new Error(await readError(response));
  const { text } = await response.json();
  return text;
}

// Feature 4 (AI Customer Support), voice: turns reply text into a playable
// audio clip.
async function speakTextReal(text) {
  const response = await fetch("/chat/speak", {
    method: "POST",
    ...CREDENTIALS,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.blob();
}

// ============================================================
// MOCK implementations — an in-memory fake "database" (just a plain
// array, alive only while the browser tab is open) so the same status
// rules from Endpoint+Contract.docx actually run while you click around,
// instead of the UI just showing static placeholder data.
// ============================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let mockOrders = [];
let mockOrderCounter = 1000;

// Mock mode has no session/cookie to scope requests to — every mock call
// runs in the same browser tab regardless of who's "logged in," so without
// this, mockOrders is really just one shared array every account reads and
// writes. App.js already persists the logged-in username to localStorage on
// login/logout (see its useEffect restore), so that's the one source of
// truth this reads from rather than tracking a second, easily-desynced copy.
function currentUsername() {
  return localStorage.getItem("username");
}

// The contract doesn't spell out each delivery option's fields, only that
// GET /delivery-options returns six of them — read as "the 3 nearest
// stations the backend geocoded, times the 2 delivery modes." Mock mode
// can't actually geocode the submitted address, so distanceMiles is a
// fixed stand-in for "how far this station happens to be" rather than
// something computed from destStreet/destCity/etc.
// robotCount/droneCount mirror the real schema's stations.robot_count /
// drone_count. Cancelling or delivering an order releases its vehicle back
// here (see releaseVehicle); placeOrderMock blocks (or queues, per Feature
// 2) a submission once a station+vehicle combo hits 0.
//
// robotCapacity/droneCapacity are each station's *starting* fleet size —
// separate from the live count so computeDemandMultiplier below can still
// tell "how depleted is this station" after the count changes. Mission St's
// robot capacity is deliberately smaller than the other two stations: a
// vehicle isn't actually claimed until confirmAtStation (see placeOrderMock),
// so demoing "sold out" means placing an order *and* confirming drop-off for
// each one — a smaller fleet here means only two round trips instead of
// three before a third order hits the queue.
const MOCK_STATIONS = [
  {
    stationId: 1,
    stationName: "Mission St Station",
    distanceMiles: 1.2,
    robotCount: 2,
    robotCapacity: 2,
    droneCount: 2,
    droneCapacity: 2,
  },
  {
    stationId: 2,
    stationName: "SoMa Station",
    distanceMiles: 2.5,
    robotCount: 3,
    robotCapacity: 3,
    droneCount: 2,
    droneCapacity: 2,
  },
  {
    stationId: 3,
    stationName: "Fisherman's Wharf Station",
    distanceMiles: 4.0,
    robotCount: 3,
    robotCapacity: 3,
    droneCount: 2,
    droneCapacity: 2,
  },
];

const MODE_PRICING = {
  ROBOT: { base: 3.0, perLb: 0.3, perMile: 0.5 },
  DRONE: { base: 5.5, perLb: 0.5, perMile: 0.8 },
};

// Matches the backend DeliveryAlgorithm's constants (10/30 mph).
const SPEED_MPH = { ROBOT: 10, DRONE: 30 };

// Advanced Features doc, Feature 3 (Real Travel Time):
// - ROBOT time must come from a real road-network mapping service (Google
//   Maps), not a straight-line estimate — simulated here since there's no
//   Maps API key wired up yet (see Cross-feature notes: this only touches
//   *time*, Feature 5 below only touches *price*, so they don't collide).
// - DRONE time stays straight-line — drones aren't road-constrained.
// - If the "mapping service" is unavailable, fall back to a straight-line
//   estimate rather than failing the whole quote, and flag that the number
//   is an approximation so the frontend can show that to the user.
const MAPS_SERVICE_FAILURE_RATE = 0.15;
const ROAD_DISTANCE_FACTOR_RANGE = [1.25, 1.6]; // roads are never a straight line

// Stands in for an external mapping API call — "fails" at random to
// exercise the fallback path, the same way a real network call would.
function callMapsService(straightLineMiles) {
  if (Math.random() < MAPS_SERVICE_FAILURE_RATE) {
    return { ok: false };
  }
  const [min, max] = ROAD_DISTANCE_FACTOR_RANGE;
  const roadFactor = min + Math.random() * (max - min);
  return { ok: true, roadMiles: straightLineMiles * roadFactor };
}

// Returns { minutes, isFallback }. isFallback is only ever true for ROBOT —
// DRONE is *always* straight-line by design, not a degraded result, so it's
// never flagged as a fallback.
function estimateTravelMinutes(vehicle, straightLineMiles) {
  if (vehicle === "DRONE") {
    return {
      minutes: (straightLineMiles / SPEED_MPH.DRONE) * 60,
      isFallback: false,
    };
  }
  const maps = callMapsService(straightLineMiles);
  if (maps.ok) {
    return {
      minutes: (maps.roadMiles / SPEED_MPH.ROBOT) * 60,
      isFallback: false,
    };
  }
  return {
    minutes: (straightLineMiles / SPEED_MPH.ROBOT) * 60,
    isFallback: true,
  };
}

// Advanced Features doc, Feature 5 (Simulated Demand Fluctuation):
// - price must reflect how busy a station currently is for that vehicle
//   type (closer to running out -> higher price)
// - the adjustment is capped so quotes never go past a 1.5x (50% markup)
//   worst case
// - a scheduled function simulates demand rising and falling over the
//   course of a day, humping around midday
//
// Cross-feature note from the doc: this and Feature 3 (Real Travel Time)
// both touch the price/time calculation — Feature 3 only changes robot
// *time* (via a mapping API), this only changes *price*, so the two don't
// actually collide, but both live in getDeliveryOptionsMock.
const MAX_DEMAND_MARKUP = 0.5; // 50%, matches "no more than 50% at worst case"

// A full simulated "day" is compressed into a few real minutes so the hump
// is actually observable while testing, instead of requiring you to wait
// for real noon. This is what "simulate demand change throughout the day"
// means for a mock — the shape is what matters, not the real duration.
const SIMULATED_DAY_MS = 3 * 60 * 1000;
const demandCycleStart = Date.now();

// 0 (quietest point in the simulated day) .. 1 (peak, simulated "noon").
// Recomputed on a schedule below rather than inline at quote time, per the
// doc's "IMPLEMENT scheduled update function."
let currentDemandTimeRatio = 0;

function updateDemandLevel() {
  const fractionOfDay =
    ((Date.now() - demandCycleStart) % SIMULATED_DAY_MS) / SIMULATED_DAY_MS;
  // sin(0..π) traces exactly one hump: 0 at the start/end of the cycle, 1
  // at the midpoint ("noon").
  currentDemandTimeRatio = Math.sin(Math.PI * fractionOfDay);
}

if (USE_MOCK) {
  updateDemandLevel();
  setInterval(updateDemandLevel, 5000);
}

// Combines station-scarcity demand (weighted higher, since requirement 1 is
// specifically about a station running low) with the time-of-day hump, then
// caps the total at MAX_DEMAND_MARKUP so quotes never become absurd.
function computeDemandMultiplier(station, vehicle) {
  const capacity =
    vehicle === "ROBOT" ? station.robotCapacity : station.droneCapacity;
  const count = vehicle === "ROBOT" ? station.robotCount : station.droneCount;
  const scarcityRatio = capacity > 0 ? Math.max(0, 1 - count / capacity) : 1;
  const demandRatio = Math.min(
    1,
    0.7 * scarcityRatio + 0.3 * currentDemandTimeRatio,
  );
  return 1 + demandRatio * MAX_DEMAND_MARKUP;
}

// Advanced Features doc, Feature 4 (Quote Locking): a quote's numbers are
// good for this long, from the moment GET /delivery-options is called.
export const QUOTE_WINDOW_MS = 5 * 60 * 1000;

// Not part of the doc — a product call made alongside it: without some
// deadline, a confirmed order could sit as an open commitment forever with
// no consequence for never showing up. This system dispatches one order at
// a time rather than batching for a daily cutoff, so the window is a fixed
// duration from confirmation rather than a time-of-day deadline.
const DROPOFF_WINDOW_MS = 3 * 60 * 60 * 1000; // 3 hours

// Thrown when placeOrder is submitted against a quote that's expired or been
// replaced by a newer one — distinguishable from a generic Error so the
// frontend can specifically send the user back to re-request delivery
// options instead of showing a generic failure toast.
export class QuoteExpiredError extends Error {}

// The one quote batch currently valid for (mock) submission — set by the
// most recent getDeliveryOptions call, and replaced (not merged) by the
// next one, per requirement 3: re-requesting options starts a fresh window
// and retires whatever was active before, even if it hadn't expired yet.
let activeQuote = null;
let quoteCounter = 1;

async function loginMock(credential) {
  await sleep(400);
  return { username: credential.username };
}

async function registerMock(credential) {
  await sleep(400);
  return { username: credential.username };
}

async function logoutMock() {
  await sleep(200);
}

async function getDeliveryOptionsMock(fields) {
  await sleep(500);
  const weightLb = Number(fields.packageWeight) || 0;
  const quoteId = "q" + quoteCounter++;
  const expiresAt = Date.now() + QUOTE_WINDOW_MS;
  const options = [];
  for (const station of MOCK_STATIONS) {
    for (const mode of ["ROBOT", "DRONE"]) {
      const pricing = MODE_PRICING[mode];
      const demandMultiplier = computeDemandMultiplier(station, mode);
      const rawPrice =
        (pricing.base +
          pricing.perLb * weightLb +
          pricing.perMile * station.distanceMiles) *
        demandMultiplier;
      const count = mode === "ROBOT" ? station.robotCount : station.droneCount;
      const { minutes, isFallback } = estimateTravelMinutes(
        mode,
        station.distanceMiles,
      );
      const roundedMinutes = Math.round(minutes);
      options.push({
        stationId: station.stationId,
        stationName: station.stationName,
        mode,
        price: Math.round(rawPrice * 100) / 100,
        time: roundedMinutes,
        etaText:
          "Approx. " +
          roundedMinutes +
          " min" +
          (isFallback ? " (estimated)" : ""),
        timeIsFallback: isFallback,
        quoteId,
        expiresAt,
        available: count > 0,
        // Exposed so the UI can show a "High demand" hint — not itself part
        // of the locked quote contract, just a display hint.
        highDemand: demandMultiplier >= 1.15,
      });
    }
  }
  // Replaces whatever quote batch was previously active, even if it hadn't
  // expired yet — re-requesting options always starts a fresh window.
  activeQuote = { quoteId, expiresAt, options };
  return options;
}

async function placeOrderMock(fields) {
  await sleep(500);

  if (!activeQuote || activeQuote.quoteId !== fields.quoteId) {
    throw new QuoteExpiredError(
      "This quote is no longer active — please request delivery options again.",
    );
  }
  if (Date.now() >= activeQuote.expiresAt) {
    throw new QuoteExpiredError(
      "This quote has expired — please request delivery options again.",
    );
  }
  // The price/time charged must match what the user was shown, not a
  // number recalculated now — so look up the locked option rather than
  // recomputing the pricing formula here.
  const lockedOption = activeQuote.options.find(
    (o) => o.stationId === fields.stationId && o.mode === fields.vehicle,
  );
  if (!lockedOption) {
    throw new QuoteExpiredError(
      "This delivery option is no longer available — please request delivery options again.",
    );
  }

  // Submission always succeeds as PENDING_DROPOFF, matching the real
  // backend — it's just a commitment to show up, never a vehicle claim, so
  // station stock (MOCK_STATIONS[...].robotCount/droneCount) isn't even
  // consulted here. A vehicle is only actually claimed later, at drop-off
  // (confirmAtStationMock), which is where "nothing idle right now" gets
  // decided and the order queues automatically if so.
  const now = Date.now();
  const order = {
    orderId: mockOrderCounter++,
    username: currentUsername(),
    destination: fields.destination,
    packageWeightLbs: fields.packageWeightLbs,
    vehicle: fields.vehicle,
    price: lockedOption.price,
    time: lockedOption.time,
    timeIsFallback: lockedOption.timeIsFallback,
    stationId: fields.stationId,
    status: "PENDING_DROPOFF",
    createdAt: new Date().toISOString(),
    statusChangedAt: now,
    dropoffDeadline: now + DROPOFF_WINDOW_MS,
  };

  mockOrders = [order, ...mockOrders];
  return order;
}

// Advanced Features doc, Feature 2 (Order Queue): called whenever a vehicle
// actually becomes idle again (delivery completes, or an order that had
// already reached the station is cancelled). The vehicle genuinely is idle
// now, so the count always goes up — unlike the old placement-time model,
// promoting a queued order doesn't cancel that out, because PENDING_DROPOFF
// no longer claims a vehicle either (see placeOrderMock/confirmAtStationMock:
// that only happens once someone actually shows up). Promotion here is just
// "you're next in line, go head to the station" — first come first served,
// oldest queuedAt wins.
function releaseVehicle(stationId, vehicle) {
  const station = MOCK_STATIONS.find((s) => s.stationId === stationId);
  if (!station) return;

  const countKey = vehicle === "ROBOT" ? "robotCount" : "droneCount";
  station[countKey] += 1;

  const waiting = mockOrders
    .filter(
      (o) =>
        o.status === "QUEUED" &&
        o.stationId === stationId &&
        o.vehicle === vehicle,
    )
    .sort((a, b) => a.queuedAt - b.queuedAt);

  if (waiting.length > 0) {
    const next = waiting[0];
    const promotedAt = Date.now();
    next.status = "PENDING_DROPOFF";
    next.statusChangedAt = promotedAt;
    // The drop-off clock starts now, not at original queue-join time.
    next.dropoffDeadline = promotedAt + DROPOFF_WINDOW_MS;
  }
}

// How long an order sits at each step before auto-advancing to the next
// (BEFORE_HALF_WAY -> ... -> DELIVERED; PENDING_DROPOFF is exempt, see
// catchUpStatus). 3 steps separate BEFORE_HALF_WAY from DELIVERED, so 50s
// here gives a live demo ~2:30 of real time before an order finishes
// delivering itself out from under you — enough to place/confirm several
// orders and show off "vehicle occupied" states (sold out, queueing,
// confirmAtStation falling back to QUEUED) without racing the clock. For the
// "a vehicle just freed up" beat specifically, don't wait on this timer at
// all — cancelling a BEFORE_HALF_WAY-or-later order releases its vehicle the
// same way DELIVERED does, so that moment can be triggered on cue instead of
// by chance.
const ADVANCE_INTERVAL_MS = 50 * 1000;

// Advances by wall-clock time elapsed rather than counting timer ticks, so
// a backgrounded tab (where browsers throttle or pause setInterval) still
// shows the correct status the moment you read it again — it catches up
// instead of staying stuck at whatever step it was on when the tab lost focus.
function catchUpStatus(order) {
  // PENDING_DROPOFF doesn't advance on its own (see below) — the user drives
  // that step by physically showing up — so it needs its own check here for
  // the one thing that *should* happen automatically: missing the drop-off
  // window cancels the order. No releaseVehicle call here — a PENDING_DROPOFF
  // order hasn't claimed a vehicle yet (that happens at confirmAtStation), so
  // there's nothing to release; letting it expire just clears the commitment.
  if (
    order.status === "PENDING_DROPOFF" &&
    order.dropoffDeadline != null &&
    Date.now() >= order.dropoffDeadline
  ) {
    order.status = "CANCELLED";
    order.statusChangedAt = Date.now();
    order.refundEligible = isRefundEligible("PENDING_DROPOFF");
    order.missedDropoff = true;
    return;
  }

  let index = STATUS_SEQUENCE.indexOf(order.status);
  // PENDING_DROPOFF (index 0) waits for the user's own confirmAtStation
  // call instead of advancing on a timer — see confirmAtStationMock.
  if (index <= 0 || index >= STATUS_SEQUENCE.length - 1) return;
  while (
    index < STATUS_SEQUENCE.length - 1 &&
    Date.now() - order.statusChangedAt >= ADVANCE_INTERVAL_MS
  ) {
    index += 1;
    order.status = STATUS_SEQUENCE[index];
    order.statusChangedAt += ADVANCE_INTERVAL_MS;
  }
  // vehicleReleased guards against releasing the same order's vehicle twice
  // — catchUpStatus runs on every poll, including ones after it's already
  // DELIVERED, but the vehicle should only go back to the pool (or to the
  // next queued order) once.
  if (order.status === "DELIVERED" && !order.vehicleReleased) {
    order.vehicleReleased = true;
    releaseVehicle(order.stationId, order.vehicle);
  }
}

// A cancelled order is done moving, same as a delivered one — neither
// belongs in the "still in progress" Active tab.
function isTerminal(status) {
  return status === "DELIVERED" || status === "CANCELLED";
}

// Ownership check lives in one place so every entry point (list, detail,
// confirm, cancel) enforces it the same way — a mismatch is reported exactly
// like a missing order (never "forbidden"), so a curious user poking at
// someone else's orderId in the URL can't even confirm it exists.
function findOwnOrder(orderId) {
  const order = mockOrders.find((o) => String(o.orderId) === String(orderId));
  if (!order || order.username !== currentUsername()) return null;
  return order;
}

// Not part of the doc — a queue with nothing but "you're in line" is a bit
// bleak, so give it a rough ETA where one's actually knowable. That's only
// as many queue positions deep as there are vehicles currently out on a run
// for this station+vehicle: each one frees a slot once it reaches DELIVERED,
// which — unlike PENDING_DROPOFF — advances on a fixed timer (see
// ADVANCE_INTERVAL_MS), so "time left in its current step" is a real number.
// Past that many positions there's no fixed timer to count down from: the
// next slot only opens once whoever gets promoted ahead of this order
// actually walks over and drops off, which nothing here can predict — so
// those deeper positions just don't get an estimate.
const IN_FLIGHT_STATUSES = [
  "BEFORE_HALF_WAY",
  "HALF_WAY",
  "MORE_THAN_HALF_WAY",
];

function estimateQueueWaitMs(order) {
  if (order.status !== "QUEUED") return null;

  const queue = mockOrders
    .filter(
      (o) =>
        o.status === "QUEUED" &&
        o.stationId === order.stationId &&
        o.vehicle === order.vehicle,
    )
    .sort((a, b) => a.queuedAt - b.queuedAt);
  const position = queue.findIndex((o) => o.orderId === order.orderId);

  const remainingPerVehicle = mockOrders
    .filter(
      (o) =>
        o.stationId === order.stationId &&
        o.vehicle === order.vehicle &&
        IN_FLIGHT_STATUSES.includes(o.status),
    )
    .map((o) => {
      const index = STATUS_SEQUENCE.indexOf(o.status);
      const stepsLeft = STATUS_SEQUENCE.length - 1 - index;
      const elapsedInStep = Date.now() - o.statusChangedAt;
      return Math.max(0, stepsLeft * ADVANCE_INTERVAL_MS - elapsedInStep);
    })
    .sort((a, b) => a - b);

  return position < remainingPerVehicle.length
    ? remainingPerVehicle[position]
    : null;
}

async function getOrdersMock() {
  await sleep(400);
  const mine = mockOrders.filter((o) => o.username === currentUsername());
  mine.forEach(catchUpStatus);
  mine.forEach((o) => {
    o.estimatedWaitMs = estimateQueueWaitMs(o);
  });
  return {
    active: mine.filter((o) => !isTerminal(o.status)),
    completed: mine.filter((o) => isTerminal(o.status)),
  };
}

async function getOrderMock(orderId) {
  await sleep(300);
  const order = findOwnOrder(orderId);
  if (!order) throw new Error("Order not found.");
  catchUpStatus(order);
  order.estimatedWaitMs = estimateQueueWaitMs(order);
  return order;
}

async function confirmAtStationMock(orderId) {
  await sleep(300);
  const order = findOwnOrder(orderId);
  if (!order) throw new Error("Order not found.");
  if (order.status === "PENDING_DROPOFF") {
    // This is the moment a vehicle is actually claimed — not order placement
    // (see placeOrderMock). Any number of people can be PENDING_DROPOFF for
    // the same station+vehicle at once, so it's only here, when someone
    // actually shows up, that "is one still free?" gets answered — first
    // confirmAtStation call to land wins.
    const station = MOCK_STATIONS.find((s) => s.stationId === order.stationId);
    const countKey = order.vehicle === "ROBOT" ? "robotCount" : "droneCount";
    const available = station && station[countKey] > 0;
    const now = Date.now();

    if (available) {
      // Matches the real backend exactly -- claimVehicleAtDropoff assigns
      // BEFORE_HALF_WAY directly the moment a vehicle is claimed, no
      // separate "arrived but not yet moving" status in between.
      order.status = "BEFORE_HALF_WAY";
      order.statusChangedAt = now;
      station[countKey] -= 1;
    } else {
      // Nothing free right now, even though there was when this order was
      // placed (or accepted) — same fallback the "sold out" path at
      // placement time uses, just arriving here instead: join the FCFS
      // queue rather than pretending a vehicle was assigned. No separate
      // opt-in prompt — the user is already standing there with the
      // package, and "I don't want to wait" is what Cancel order is for.
      order.status = "QUEUED";
      order.statusChangedAt = now;
      order.queuedAt = now;
      order.dropoffDeadline = null;
    }
  }
  return order;
}

// Advanced Features doc, Feature 1 (Cancel Order):
// - fails if the order doesn't exist, or is already DELIVERED/CANCELLED
// - refund-eligible only if still PENDING_DROPOFF/QUEUED at the moment of
//   cancellation (BEFORE_HALF_WAY onward is not)
// - releases the reserved vehicle back to the station's count (or straight
//   to the next queued order), regardless of how far the trip had
//   progressed (no return-trip modeling) — except QUEUED and PENDING_DROPOFF
//   orders, neither of which have actually claimed a vehicle yet (a vehicle
//   is only claimed at confirmAtStation, see placeOrderMock/
//   confirmAtStationMock — Feature 2, requirement 6 for the QUEUED half)
async function cancelOrderMock(orderId) {
  await sleep(300);
  const order = findOwnOrder(orderId);
  if (!order) throw new Error("Order not found.");
  // Bring status up to date with wall-clock time first — otherwise the
  // eligibility check below could read a stale, not-yet-caught-up status
  // (e.g. still shows BEFORE_HALF_WAY when enough time has actually passed
  // that it should already be HALF_WAY), granting a refund the order
  // shouldn't be eligible for.
  catchUpStatus(order);
  if (isTerminal(order.status)) {
    throw new Error(
      order.status === "CANCELLED"
        ? "This order has already been cancelled."
        : "This order has already been delivered and can no longer be cancelled.",
    );
  }

  const refundEligible = isRefundEligible(order.status);
  const hadVehicle =
    order.status !== "QUEUED" && order.status !== "PENDING_DROPOFF";
  order.status = "CANCELLED";
  order.statusChangedAt = Date.now();
  order.refundEligible = refundEligible;

  if (hadVehicle) {
    releaseVehicle(order.stationId, order.vehicle);
  }

  return order;
}

async function cancelOrderReal(orderId) {
  const response = await fetch("/order/" + orderId + "/cancel", {
    method: "POST",
    ...CREDENTIALS,
  });
  if (!response.ok) throw new Error(await readError(response));
  const { order, refundEligible } = await response.json(); // CancelOrderResponse
  return { ...order, refundEligible };
}

// Feature 4 (AI Customer Support), mock mode: there's no LLM to actually
// call here, so this is simple pattern matching instead — just enough to
// demo the chat UI without a backend running. It never claims to cancel
// anything, matching what the real assistant is told (see ChatService's
// system prompt on the backend).
async function sendChatMessageMock(message) {
  await sleep(500);
  const lower = message.toLowerCase();

  // Mirrors the real assistant's flag_frustrated_user tool: a plain keyword
  // check stands in for reading tone here. Real sentiment isn't classified
  // in mock mode either — this is just enough to demo the "offer a human"
  // banner without a backend running.
  const frustrated =
    /\b(angry|furious|terrible|worst|ridiculous|useless|fed up)\b/.test(
      lower,
    ) || /!!/.test(message);
  if (frustrated) {
    return {
      reply:
        "I'm sorry this hasn't gone well — I've flagged it so a human can help if this doesn't get you sorted.",
      suggestCreateOrder: false,
      offerHumanHelp: true,
      suggestCancelOrderId: null,
    };
  }

  // Mirrors the real assistant's suggest_cancel_order tool: cancelling
  // through chat is a suggest-and-confirm shortcut, not a direct action, so
  // this only surfaces the order id for the frontend's confirm button — it
  // never calls cancelOrder itself.
  if (/cancel/.test(lower)) {
    const idMatch = message.match(/#?(\d+)/);
    const order = idMatch ? findOwnOrder(Number(idMatch[1])) : null;
    if (order) {
      return {
        reply:
          "I've pulled up a cancel confirmation for order #" +
          order.orderId +
          ".",
        suggestCreateOrder: false,
        offerHumanHelp: false,
        suggestCancelOrderId: order.orderId,
      };
    }
    return {
      reply: "Which order would you like to cancel? Give me its order number.",
      suggestCreateOrder: false,
      offerHumanHelp: false,
      suggestCancelOrderId: null,
    };
  }

  // Mirrors the real assistant's suggest_create_order tool: a plain keyword
  // check stands in for the model's intent detection here, just enough to
  // demo the "jump to the order form" shortcut without a backend running.
  if (
    /\b(new order|place an order|send a package|create an? order)\b/.test(lower)
  ) {
    return {
      reply: "I've pulled up the order form for you.",
      suggestCreateOrder: true,
      offerHumanHelp: false,
      suggestCancelOrderId: null,
    };
  }

  const idMatch = message.match(/#?(\d+)/);
  if (idMatch) {
    const order = findOwnOrder(Number(idMatch[1]));
    if (!order) {
      return {
        reply: "I couldn't find an order #" + idMatch[1] + " on your account.",
        suggestCreateOrder: false,
        offerHumanHelp: false,
        suggestCancelOrderId: null,
      };
    }
    catchUpStatus(order);
    let reply =
      "Order #" +
      order.orderId +
      " is currently " +
      order.status.replaceAll("_", " ").toLowerCase() +
      ". It's a " +
      order.vehicle.toLowerCase() +
      " delivery to " +
      order.destination +
      ", $" +
      order.price.toFixed(2) +
      ".";
    if (order.status === "QUEUED") {
      const waitMs = estimateQueueWaitMs(order);
      reply +=
        waitMs != null
          ? " You're queued, roughly " +
            Math.ceil(waitMs / 60000) +
            " min estimated wait."
          : " You're queued for a vehicle to free up.";
    }
    return {
      reply,
      suggestCreateOrder: false,
      offerHumanHelp: false,
      suggestCancelOrderId: null,
    };
  }

  const mine = mockOrders.filter((o) => o.username === currentUsername());
  if (mine.length === 0) {
    return {
      reply:
        "You don't have any orders yet — I can look one up once you've placed one.",
      suggestCreateOrder: false,
      offerHumanHelp: false,
      suggestCancelOrderId: null,
    };
  }
  const active = mine.filter((o) => !isTerminal(o.status));
  return {
    reply:
      active.length > 0
        ? "You have " +
          active.length +
          " active order(s): " +
          active.map((o) => "#" + o.orderId).join(", ") +
          ". Ask me about a specific order number for details."
        : 'All your orders are complete. Ask me about a specific order number (e.g. "how\'s order #12") for details.',
    suggestCreateOrder: false,
    offerHumanHelp: false,
    suggestCancelOrderId: null,
  };
}

// Feature 4 (AI Customer Support), voice, mock mode: no LLM or Whisper call
// to actually transcribe a Blob against, so this is a fixed placeholder —
// enough to demo the mic button and the send-after-transcribe flow without
// a backend running.
async function transcribeAudioMock(audioBlob) {
  await sleep(500);
  return "(mock transcription — connect the real backend to use your voice)";
}

// Feature 4 (AI Customer Support), voice, mock mode: no TTS call to
// synthesize from, so there's no audio to hand back — SupportPage already
// treats a null/falsy result as "nothing to play."
async function speakTextMock(text) {
  await sleep(200);
  return null;
}

// The contract has no simulate-next endpoint — a real backend drives status
// changes on its own, so this ticker is what stands in for that in mock
// mode, nudging every non-delivered order forward periodically. It's a
// convenience for pages that aren't actively polling; catchUpStatus (run on
// every getOrder/getOrders call above) is what actually guarantees the
// status is correct, since this timer alone can't be trusted in a
// backgrounded tab. PENDING_DROPOFF is excluded: that first step waits for
// the user to hit "confirm drop-off" (confirmAtStation) instead of
// advancing on its own.
if (USE_MOCK) {
  setInterval(() => {
    mockOrders.forEach(catchUpStatus);
  }, ADVANCE_INTERVAL_MS);
}

// ============================================================
// Exported functions — every page imports these names. Which
// implementation each name points to depends only on USE_MOCK above.
// ============================================================

export const login = USE_MOCK ? loginMock : loginReal;
export const register = USE_MOCK ? registerMock : registerReal;
export const logout = USE_MOCK ? logoutMock : logoutReal;
export const getDeliveryOptions = USE_MOCK
  ? getDeliveryOptionsMock
  : getDeliveryOptionsReal;
export const placeOrder = USE_MOCK ? placeOrderMock : placeOrderReal;
export const getOrders = USE_MOCK ? getOrdersMock : getOrdersReal;
export const getOrder = USE_MOCK ? getOrderMock : getOrderReal;
export const confirmAtStation = USE_MOCK
  ? confirmAtStationMock
  : confirmAtStationReal;
export const cancelOrder = USE_MOCK ? cancelOrderMock : cancelOrderReal;
export const sendChatMessage = USE_MOCK
  ? sendChatMessageMock
  : sendChatMessageReal;
export const transcribeAudio = USE_MOCK
  ? transcribeAudioMock
  : transcribeAudioReal;
export const speakText = USE_MOCK ? speakTextMock : speakTextReal;
