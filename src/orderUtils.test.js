import {
  modeLabel,
  STATUS_SEQUENCE,
  isCancellable,
  isRefundEligible,
  statusLabel,
  parseAddress,
  parseAddressLoose,
} from "./orderUtils";

describe("modeLabel", () => {
  it("labels DRONE as 'Drone Delivery'", () => {
    expect(modeLabel("DRONE")).toBe("Drone Delivery");
  });

  it("labels anything that is not DRONE as 'Ground Robot'", () => {
    expect(modeLabel("ROBOT")).toBe("Ground Robot");
    expect(modeLabel("GROUND_ROBOT")).toBe("Ground Robot");
    expect(modeLabel(undefined)).toBe("Ground Robot");
  });
});

describe("STATUS_SEQUENCE", () => {
  it("is the five happy-path stages, in delivery order", () => {
    expect(STATUS_SEQUENCE).toEqual([
      "PENDING_DROPOFF",
      "BEFORE_HALF_WAY",
      "HALF_WAY",
      "MORE_THAN_HALF_WAY",
      "DELIVERED",
    ]);
  });

  it("excludes the off-line branches CANCELLED and QUEUED", () => {
    expect(STATUS_SEQUENCE).not.toContain("CANCELLED");
    expect(STATUS_SEQUENCE).not.toContain("QUEUED");
  });
});

describe("isCancellable", () => {
  it("allows cancellation while the order is still in progress", () => {
    for (const status of [
      "PENDING_DROPOFF",
      "QUEUED",
      "BEFORE_HALF_WAY",
      "HALF_WAY",
      "MORE_THAN_HALF_WAY",
    ]) {
      expect(isCancellable(status)).toBe(true);
    }
  });

  it("blocks cancellation once the order is delivered or already cancelled", () => {
    expect(isCancellable("DELIVERED")).toBe(false);
    expect(isCancellable("CANCELLED")).toBe(false);
  });
});

describe("isRefundEligible", () => {
  it("is eligible only before any vehicle has been claimed", () => {
    expect(isRefundEligible("PENDING_DROPOFF")).toBe(true);
    expect(isRefundEligible("QUEUED")).toBe(true);
  });

  it("is not eligible from BEFORE_HALF_WAY onward", () => {
    for (const status of [
      "BEFORE_HALF_WAY",
      "HALF_WAY",
      "MORE_THAN_HALF_WAY",
      "DELIVERED",
      "CANCELLED",
    ]) {
      expect(isRefundEligible(status)).toBe(false);
    }
  });
});

describe("statusLabel", () => {
  it("maps every known status to human-readable text", () => {
    expect(statusLabel("PENDING_DROPOFF")).toBe("Pending drop-off");
    expect(statusLabel("BEFORE_HALF_WAY")).toBe("On the way");
    expect(statusLabel("HALF_WAY")).toBe("Halfway there");
    expect(statusLabel("MORE_THAN_HALF_WAY")).toBe("Almost there");
    expect(statusLabel("DELIVERED")).toBe("Delivered");
    expect(statusLabel("CANCELLED")).toBe("Cancelled");
    expect(statusLabel("QUEUED")).toBe("Queued");
  });

  it("falls back to the raw value for an unknown status", () => {
    expect(statusLabel("SOMETHING_NEW")).toBe("SOMETHING_NEW");
  });
});

describe("parseAddress", () => {
  it("parses a standard 'street, city, ST zip' address", () => {
    expect(
      parseAddress("1000 The Embarcadero, San Francisco, CA 94133"),
    ).toEqual({
      street: "1000 The Embarcadero",
      city: "San Francisco",
      state: "CA",
      zip: "94133",
    });
  });

  it("trims surrounding whitespace and uppercases the state", () => {
    expect(
      parseAddress("  742 Evergreen Terrace, Springfield, or 97403  "),
    ).toEqual({
      street: "742 Evergreen Terrace",
      city: "Springfield",
      state: "OR",
      zip: "97403",
    });
  });

  it("accepts an optional ZIP+4 but keeps only the 5-digit ZIP", () => {
    expect(parseAddress("1 Infinite Loop, Cupertino, CA 95014-2083")).toEqual({
      street: "1 Infinite Loop",
      city: "Cupertino",
      state: "CA",
      zip: "95014",
    });
  });

  it("tolerates a comma between the state and the ZIP", () => {
    expect(parseAddress("350 Fifth Ave, New York, NY, 10118")).toEqual({
      street: "350 Fifth Ave",
      city: "New York",
      state: "NY",
      zip: "10118",
    });
  });

  it("returns null for empty or missing input", () => {
    expect(parseAddress("")).toBeNull();
    expect(parseAddress(null)).toBeNull();
    expect(parseAddress(undefined)).toBeNull();
  });

  it("returns null when the text is not a well-formed US address", () => {
    expect(parseAddress("just some free text")).toBeNull();
    // no street segment
    expect(parseAddress("San Francisco, CA 94133")).toBeNull();
    // state spelled out, not a 2-letter code
    expect(
      parseAddress("1000 Main St, San Francisco, California 94133"),
    ).toBeNull();
    // ZIP too short
    expect(parseAddress("1000 Main St, San Francisco, CA 941")).toBeNull();
  });
});

describe("parseAddressLoose", () => {
  it("defers to parseAddress for a well-formed address", () => {
    expect(
      parseAddressLoose("1000 The Embarcadero, San Francisco, CA 94133"),
    ).toEqual({
      street: "1000 The Embarcadero",
      city: "San Francisco",
      state: "CA",
      zip: "94133",
    });
  });

  it("recovers street/city/state from a chat prefill with no zip", () => {
    // This is exactly what the backend sends for a bare street the user
    // mentioned in chat: normalized to "<street>, San Francisco, CA".
    expect(parseAddressLoose("1600 Market St, San Francisco, CA")).toEqual({
      street: "1600 Market St",
      city: "San Francisco",
      state: "CA",
    });
  });

  it("picks up a zip that trails as its own comma-separated part", () => {
    expect(
      parseAddressLoose("1600 Market St, San Francisco, CA, 94102"),
    ).toEqual({
      street: "1600 Market St",
      city: "San Francisco",
      state: "CA",
      zip: "94102",
    });
  });

  it("fills what it can when only a street is given", () => {
    expect(parseAddressLoose("1600 Market St")).toEqual({
      street: "1600 Market St",
    });
  });

  it("returns null for empty or missing input", () => {
    expect(parseAddressLoose("")).toBeNull();
    expect(parseAddressLoose(null)).toBeNull();
    expect(parseAddressLoose(undefined)).toBeNull();
  });
});
