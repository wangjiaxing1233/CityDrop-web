// MSW request handlers — fake responses for the real backend endpoints that
// src/utils.js calls (see its "REAL implementations" section). Component and
// integration tests import `server` from ./server and let these stand in for
// a running Spring Boot backend, so a test never makes a real network call.
//
// Only the happy path lives here. A test that needs a specific outcome
// (a 401, a 500, an empty order list, ...) overrides the one handler it
// cares about with server.use(...) for the duration of that test.
import { http, HttpResponse } from "msw";

const sampleOrder = {
  orderId: 1001,
  username: "testuser",
  destination: "1000 The Embarcadero, San Francisco, CA 94133",
  packageWeightLbs: 2,
  vehicle: "ROBOT",
  price: 7.35,
  time: 12,
  timeIsFallback: false,
  stationId: 1,
  status: "PENDING_DROPOFF",
  createdAt: "2026-08-29T12:00:00.000Z",
};

export const handlers = [
  // Spring Security formLogin — success is 204 No Content.
  http.post("/login", () => new HttpResponse(null, { status: 204 })),

  http.post("/register", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ username: body.username });
  }),

  http.post("/logout", () => new HttpResponse(null, { status: 204 })),

  // GET /delivery-options -> DeliveryQuote[] (backend shape, pre-adapt).
  http.get("/delivery-options", () =>
    HttpResponse.json([
      {
        vehicle: "ROBOT",
        stationId: 1,
        price: 7.35,
        time: 12.4,
        available: true,
        recommended: true,
      },
      {
        vehicle: "DRONE",
        stationId: 1,
        price: 11.2,
        time: 5.1,
        available: true,
        recommended: false,
      },
    ]),
  ),

  http.post("/order", () => HttpResponse.json(sampleOrder)),

  // GET /order -> { active: [{orderId}], completed: [{orderId}] }
  http.get("/order", () =>
    HttpResponse.json({ active: [{ orderId: 1001 }], completed: [] }),
  ),

  http.get("/order/:orderId", ({ params }) =>
    HttpResponse.json({ ...sampleOrder, orderId: Number(params.orderId) }),
  ),

  // PATCH .../dropped-off -> success body is just the new status string.
  http.patch("/order/:orderId/dropped-off", () =>
    HttpResponse.text("BEFORE_HALF_WAY"),
  ),

  // POST .../cancel -> CancelOrderResponse { order, refundEligible }
  http.post("/order/:orderId/cancel", ({ params }) =>
    HttpResponse.json({
      order: {
        ...sampleOrder,
        orderId: Number(params.orderId),
        status: "CANCELLED",
      },
      refundEligible: true,
    }),
  ),

  // Feature 4 (AI Customer Support).
  http.post("/chat", () =>
    HttpResponse.json({
      reply: "Sure, I can help with that.",
      suggestCreateOrder: false,
      offerHumanHelp: false,
      suggestCancelOrderId: null,
    }),
  ),

  http.post("/chat/transcribe", () =>
    HttpResponse.json({ text: "transcribed text" }),
  ),

  http.post("/chat/speak", () =>
    HttpResponse.json({}, { status: 200 }),
  ),
];
