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

function authHeader() {
  const token = localStorage.getItem('authToken');
  return token ? { Authorization: 'Bearer ' + token } : {};
}

// Every error response from the real backend is { "error": "<message>" }
// (see CityDrop_API_Contract.docx) — this reads that message out so each
// function below can just throw a real, human-readable Error.
async function readError(response) {
  try {
    const data = await response.json();
    if (data && data.error) return data.error;
  } catch (e) {
    // response body wasn't JSON (e.g. the backend isn't running at all) —
    // fall through to the generic message below.
  }
  return 'Request failed (status ' + response.status + ')';
}

// ============================================================
// REAL implementations — one fetch() per endpoint, unchanged from before.
// ============================================================

async function loginReal(credential) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credential),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json(); // { token, email }
}

async function registerReal(credential) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credential),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json(); // { email }
}

async function getQuoteReal(fields) {
  const response = await fetch('/api/orders/quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(fields),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json();
}

async function placeOrderReal(fields) {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify(fields),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json(); // Order
}

async function getOrdersReal() {
  const response = await fetch('/api/orders', { headers: authHeader() });
  if (!response.ok) throw new Error(await readError(response));
  return response.json(); // Order[]
}

async function getOrderReal(orderId) {
  const response = await fetch('/api/orders/' + orderId, { headers: authHeader() });
  if (!response.ok) throw new Error(await readError(response));
  return response.json(); // Order
}

async function cancelOrderReal(orderId) {
  const response = await fetch('/api/orders/' + orderId + '/cancel', {
    method: 'POST',
    headers: authHeader(),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json(); // Order, or { requiresPickupConfirmation, message }
}

async function confirmPickupReal(orderId) {
  const response = await fetch('/api/orders/' + orderId + '/confirm-pickup', {
    method: 'POST',
    headers: authHeader(),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json(); // Order
}

async function simulateNextReal(orderId) {
  const response = await fetch('/api/orders/' + orderId + '/simulate-next', {
    method: 'POST',
    headers: authHeader(),
  });
  if (!response.ok) throw new Error(await readError(response));
  return response.json(); // Order
}

// ============================================================
// MOCK implementations — an in-memory fake "database" (just a plain
// array, alive only while the browser tab is open) so the same status
// rules from CityDrop_API_Contract.docx actually run while you click
// around, instead of the UI just showing static placeholder data.
// ============================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let mockOrders = [];
let mockOrderCounter = 1000;

const STATUS_SEQUENCE = [
  'QUEUED',
  'PENDING_DROPOFF',
  'ARRIVED_AT_STATION',
  'LEFT_STATION',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

async function loginMock(credential) {
  await sleep(400);
  return { token: 'mock-token', email: credential.email };
}

async function registerMock(credential) {
  await sleep(400);
  return { email: credential.email };
}

async function getQuoteMock(fields) {
  await sleep(500);
  const transport = fields.preferSpeed ? 'DRONE' : 'GROUND_ROBOT';
  return {
    destination: fields.destination,
    weightLb: fields.weightLb,
    transport,
    price: transport === 'DRONE' ? 8.5 : 4.8,
    etaText: transport === 'DRONE' ? 'Approx. 15-20 min' : 'Approx. 35-50 min',
    station: 'Mission St Station',
    stationAutoAssigned: !fields.preferStation,
  };
}

async function placeOrderMock(fields) {
  await sleep(500);
  const order = {
    id: 'A' + mockOrderCounter++,
    destination: fields.destination,
    weightLb: fields.weightLb,
    transport: fields.preferSpeed ? 'DRONE' : 'GROUND_ROBOT',
    price: fields.preferSpeed ? 8.5 : 4.8,
    station: 'Mission St Station',
    status: 'PENDING_DROPOFF',
    createdAt: new Date().toISOString(),
  };
  mockOrders = [order, ...mockOrders];
  return order;
}

async function getOrdersMock() {
  await sleep(400);
  return mockOrders;
}

async function getOrderMock(orderId) {
  await sleep(300);
  const order = mockOrders.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found.');
  return order;
}

async function cancelOrderMock(orderId) {
  await sleep(400);
  const order = mockOrders.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found.');

  if (order.status === 'DELIVERED') {
    throw new Error("Delivered orders can't be cancelled.");
  }
  if (order.status === 'QUEUED' || order.status === 'PENDING_DROPOFF') {
    order.status = 'CANCELLED';
    return order;
  }
  // ARRIVED_AT_STATION / LEFT_STATION / OUT_FOR_DELIVERY — needs a second step.
  return { requiresPickupConfirmation: true, message: 'Please retrieve your package to finish cancelling.' };
}

async function confirmPickupMock(orderId) {
  await sleep(400);
  const order = mockOrders.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found.');
  order.status = 'CANCELLED';
  return order;
}

async function simulateNextMock(orderId) {
  await sleep(300);
  const order = mockOrders.find((o) => o.id === orderId);
  if (!order) throw new Error('Order not found.');
  const currentIndex = STATUS_SEQUENCE.indexOf(order.status);
  const nextIndex = Math.min(currentIndex + 1, STATUS_SEQUENCE.length - 1);
  order.status = STATUS_SEQUENCE[nextIndex];
  return order;
}

// ============================================================
// Exported functions — every page imports these names. Which
// implementation each name points to depends only on USE_MOCK above.
// ============================================================

export const login = USE_MOCK ? loginMock : loginReal;
export const register = USE_MOCK ? registerMock : registerReal;
export const getQuote = USE_MOCK ? getQuoteMock : getQuoteReal;
export const placeOrder = USE_MOCK ? placeOrderMock : placeOrderReal;
export const getOrders = USE_MOCK ? getOrdersMock : getOrdersReal;
export const getOrder = USE_MOCK ? getOrderMock : getOrderReal;
export const cancelOrder = USE_MOCK ? cancelOrderMock : cancelOrderReal;
export const confirmPickup = USE_MOCK ? confirmPickupMock : confirmPickupReal;
export const simulateNext = USE_MOCK ? simulateNextMock : simulateNextReal;
