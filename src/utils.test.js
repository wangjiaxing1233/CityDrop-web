// Tests the REAL backend layer in src/utils.js — the functions actually used
// in production (USE_MOCK is false). `fetch` is the only seam, so we stub it
// and assert the request shape (URL, method, headers, body, credentials) and
// how each response is turned into the value pages consume. This is the
// frontend's half of the API contract; if the backend changes a URL or
// payload, these break instead of a user finding out.
import {
  login,
  register,
  logout,
  getDeliveryOptions,
  placeOrder,
  getOrders,
  confirmAtStation,
  cancelOrder,
  sendChatMessage,
  QUOTE_WINDOW_MS,
} from "./utils";

// Minimal stand-ins for the parts of a fetch Response that utils.js reads.
function ok(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => (typeof body === "string" ? body : JSON.stringify(body)),
    blob: async () => body,
  };
}

function fail(body, status = 400) {
  return {
    ok: false,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

beforeEach(() => {
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.restoreAllMocks();
  delete global.fetch;
});

describe("login", () => {
  it("posts form-encoded credentials to /login with the session cookie and returns the username", async () => {
    fetch.mockResolvedValueOnce(ok(null, 204));

    const result = await login({ username: "alice", password: "s3cret" });

    expect(result).toEqual({ username: "alice" });
    expect(fetch).toHaveBeenCalledWith(
      "/login",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "username=alice&password=s3cret",
      }),
    );
  });

  it("throws the backend's error message when the credentials are rejected", async () => {
    fetch.mockResolvedValueOnce(fail({ error: "Bad credentials" }, 401));

    await expect(login({ username: "x", password: "y" })).rejects.toThrow(
      "Bad credentials",
    );
  });
});

describe("readError (via the real calls that funnel through it)", () => {
  it("dispatches citydrop:unauthorized on a 401 so App can force a logout", async () => {
    const handler = jest.fn();
    window.addEventListener("citydrop:unauthorized", handler);
    fetch.mockResolvedValueOnce(fail({ error: "session gone" }, 401));

    await expect(getOrders()).rejects.toBeInstanceOf(Error);

    expect(handler).toHaveBeenCalledTimes(1);
    window.removeEventListener("citydrop:unauthorized", handler);
  });

  it("falls back to a generic message when the error body is not JSON", async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => {
        throw new SyntaxError("Unexpected token < in JSON");
      },
      text: async () => "<html>502</html>",
    });

    await expect(register({ username: "x", password: "y" })).rejects.toThrow(
      "Request failed (status 500)",
    );
  });
});

describe("register", () => {
  it("posts a JSON body to /register", async () => {
    fetch.mockResolvedValueOnce(ok({ username: "bob" }));

    const result = await register({ username: "bob", password: "pw" });

    expect(result).toEqual({ username: "bob" });
    expect(fetch).toHaveBeenCalledWith(
      "/register",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "bob", password: "pw" }),
      }),
    );
  });
});

describe("logout", () => {
  it("posts to /logout with credentials", async () => {
    fetch.mockResolvedValueOnce(ok(null, 204));

    await logout();

    expect(fetch).toHaveBeenCalledWith(
      "/logout",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });
});

describe("getDeliveryOptions", () => {
  it("sends the address as query params and adapts each backend quote to the UI shape", async () => {
    fetch.mockResolvedValueOnce(
      ok([
        {
          vehicle: "ROBOT",
          stationId: 2,
          price: 7.35,
          time: 12.4,
          available: true,
          recommended: true,
        },
        {
          vehicle: "DRONE",
          stationId: 2,
          price: 11.2,
          time: 5.8,
          available: false,
          recommended: false,
        },
      ]),
    );
    const before = Date.now();

    const options = await getDeliveryOptions({
      destStreet: "1 Main St",
      destCity: "SF",
      destState: "CA",
      destZip: "94105",
      packageWeight: 3,
    });

    const requestedUrl = fetch.mock.calls[0][0];
    expect(requestedUrl).toContain("/delivery-options?");
    expect(requestedUrl).toContain("destStreet=1+Main+St");
    expect(requestedUrl).toContain("packageWeight=3");

    expect(options[0]).toMatchObject({
      vehicle: "ROBOT",
      mode: "ROBOT",
      stationId: 2,
      stationName: "Station #2",
      price: 7.35,
      time: 12, // rounded from 12.4
      etaText: "Approx. 12 min",
      timeIsFallback: false,
      available: true,
      recommended: true,
    });
    expect(options[1]).toMatchObject({
      mode: "DRONE",
      time: 6, // rounded from 5.8
      etaText: "Approx. 6 min",
      available: false,
    });

    // Every option in one response shares a quote id and expiry window.
    expect(typeof options[0].quoteId).toBe("string");
    expect(options[0].quoteId).toBe(options[1].quoteId);
    expect(options[0].expiresAt).toBeGreaterThanOrEqual(before + QUOTE_WINDOW_MS);
  });
});

describe("placeOrder", () => {
  it("posts the order fields as JSON and returns the created order", async () => {
    const created = { orderId: 1001, status: "PENDING_DROPOFF" };
    fetch.mockResolvedValueOnce(ok(created));

    const fields = {
      destination: "1 Main St, SF, CA, 94105",
      packageWeightLbs: 3,
      stationId: 2,
      vehicle: "ROBOT",
    };
    const result = await placeOrder(fields);

    expect(result).toEqual(created);
    expect(fetch).toHaveBeenCalledWith(
      "/order",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      }),
    );
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual(fields);
  });
});

describe("getOrders", () => {
  it("expands the active/completed id lists into full orders, in order", async () => {
    fetch
      .mockResolvedValueOnce(
        ok({ active: [{ orderId: 1 }, { orderId: 2 }], completed: [{ orderId: 3 }] }),
      )
      .mockResolvedValueOnce(ok({ orderId: 1, status: "BEFORE_HALF_WAY" }))
      .mockResolvedValueOnce(ok({ orderId: 2, status: "PENDING_DROPOFF" }))
      .mockResolvedValueOnce(ok({ orderId: 3, status: "DELIVERED" }));

    const { active, completed } = await getOrders();

    expect(active).toEqual([
      { orderId: 1, status: "BEFORE_HALF_WAY" },
      { orderId: 2, status: "PENDING_DROPOFF" },
    ]);
    expect(completed).toEqual([{ orderId: 3, status: "DELIVERED" }]);
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/order",
      expect.objectContaining({ credentials: "include" }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/order/1",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});

describe("confirmAtStation", () => {
  it("PATCHes .../dropped-off then re-fetches the full order", async () => {
    fetch
      .mockResolvedValueOnce(ok("BEFORE_HALF_WAY"))
      .mockResolvedValueOnce(ok({ orderId: 7, status: "BEFORE_HALF_WAY" }));

    const updated = await confirmAtStation(7);

    expect(updated).toEqual({ orderId: 7, status: "BEFORE_HALF_WAY" });
    expect(fetch).toHaveBeenNthCalledWith(
      1,
      "/order/7/dropped-off",
      expect.objectContaining({ method: "PATCH", credentials: "include" }),
    );
    expect(fetch).toHaveBeenNthCalledWith(
      2,
      "/order/7",
      expect.objectContaining({ credentials: "include" }),
    );
  });
});

describe("cancelOrder", () => {
  it("posts to /order/:id/cancel and flattens refundEligible onto the order", async () => {
    fetch.mockResolvedValueOnce(
      ok({ order: { orderId: 9, status: "CANCELLED" }, refundEligible: true }),
    );

    const result = await cancelOrder(9);

    expect(result).toEqual({ orderId: 9, status: "CANCELLED", refundEligible: true });
    expect(fetch).toHaveBeenCalledWith(
      "/order/9/cancel",
      expect.objectContaining({ method: "POST", credentials: "include" }),
    );
  });
});

describe("sendChatMessage", () => {
  it("posts the message plus prior history to /chat and returns the assistant payload", async () => {
    const payload = {
      reply: "Order #12 is on the way.",
      suggestCreateOrder: false,
      offerHumanHelp: false,
      suggestCancelOrderId: null,
    };
    fetch.mockResolvedValueOnce(ok(payload));
    const history = [{ role: "assistant", content: "Hi! I'm the CityDrop assistant." }];

    const result = await sendChatMessage("where is order 12", history);

    expect(result).toEqual(payload);
    const [url, opts] = fetch.mock.calls[0];
    expect(url).toBe("/chat");
    expect(opts.method).toBe("POST");
    expect(opts.credentials).toBe("include");
    expect(JSON.parse(opts.body)).toEqual({
      message: "where is order 12",
      history,
    });
  });
});
