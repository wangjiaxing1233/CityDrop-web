import { STATUS_SEQUENCE } from "./orderUtils";

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
const USE_MOCK = true;

// Auth is session/cookie based (Spring Security), not bearer-token — every
// authenticated call needs credentials: "include" so the browser sends and
// stores the session cookie. There's no token to attach as a header.
const CREDENTIALS = { credentials: "include" };

// Every error response from the real backend is { "error": "<message>" }
// (see Endpoint+Contract.docx) — this reads that message out so each
// function below can just throw a real, human-readable Error.
async function readError(response) {
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
  const response = await fetch("/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(credential),
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

async function getDeliveryOptionsReal(fields) {
  const params = new URLSearchParams(fields);
  const response = await fetch("/delivery-options?" + params.toString(), {
    ...CREDENTIALS,
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json(); // DeliveryOption[]
}

async function placeOrderReal(fields) {
  const response = await fetch("/order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fields),
    ...CREDENTIALS,
  });
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

// The contract doesn't spell out each delivery option's fields, only that
// GET /delivery-options returns six of them — read as "the 3 nearest
// stations the backend geocoded, times the 2 delivery modes." Mock mode
// can't actually geocode the submitted address, so distanceMiles is a
// fixed stand-in for "how far this station happens to be" rather than
// something computed from destStreet/destCity/etc.
const MOCK_STATIONS = [
  { stationId: 1, stationName: "Mission St Station", distanceMiles: 1.2 },
  { stationId: 2, stationName: "SoMa Station", distanceMiles: 2.5 },
  { stationId: 3, stationName: "Fisherman's Wharf Station", distanceMiles: 4.0 },
];

const MODE_PRICING = {
  ROBOT: { base: 3.0, perLb: 0.3, perMile: 0.5, etaText: "Approx. 35-50 min" },
  DRONE: { base: 5.5, perLb: 0.5, perMile: 0.8, etaText: "Approx. 15-20 min" },
};

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
  const options = [];
  for (const station of MOCK_STATIONS) {
    for (const mode of ["ROBOT", "DRONE"]) {
      const pricing = MODE_PRICING[mode];
      const rawPrice =
        pricing.base +
        pricing.perLb * weightLb +
        pricing.perMile * station.distanceMiles;
      options.push({
        stationId: station.stationId,
        stationName: station.stationName,
        mode,
        price: Math.round(rawPrice * 100) / 100,
        etaText: pricing.etaText,
      });
    }
  }
  return options;
}

async function placeOrderMock(fields) {
  await sleep(500);
  // Recompute with the same formula getDeliveryOptionsMock used, so the
  // price on the order matches the quote the user picked — the contract's
  // POST /order body doesn't carry a price, only the station/vehicle choice.
  const station = MOCK_STATIONS.find(
    (s) => s.stationId === fields.stationId,
  );
  const pricing = MODE_PRICING[fields.vehicle];
  const rawPrice =
    pricing.base +
    pricing.perLb * fields.packageWeightLbs +
    pricing.perMile * station.distanceMiles;

  const order = {
    orderId: mockOrderCounter++,
    destination: fields.destination,
    packageWeightLbs: fields.packageWeightLbs,
    vehicle: fields.vehicle,
    price: Math.round(rawPrice * 100) / 100,
    stationId: fields.stationId,
    status: "PENDING_DROPOFF",
    createdAt: new Date().toISOString(),
  };
  mockOrders = [order, ...mockOrders];
  return order;
}

async function getOrdersMock() {
  await sleep(400);
  return {
    active: mockOrders.filter((o) => o.status !== "DELIVERED"),
    completed: mockOrders.filter((o) => o.status === "DELIVERED"),
  };
}

async function getOrderMock(orderId) {
  await sleep(300);
  const order = mockOrders.find((o) => String(o.orderId) === String(orderId));
  if (!order) throw new Error("Order not found.");
  return order;
}

// The contract has no simulate-next endpoint — a real backend drives status
// changes on its own, so this ticker is what stands in for that in mock
// mode, nudging every non-delivered order one stage forward periodically.
if (USE_MOCK) {
  setInterval(() => {
    mockOrders.forEach((order) => {
      const index = STATUS_SEQUENCE.indexOf(order.status);
      if (index !== -1 && index < STATUS_SEQUENCE.length - 1) {
        order.status = STATUS_SEQUENCE[index + 1];
      }
    });
  }, 6000);
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
