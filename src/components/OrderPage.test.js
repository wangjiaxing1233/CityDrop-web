// OrderPage is the two-step create-order flow: an address form that fetches
// quotes, then a locked-quote selection screen that places the order. The
// tests cover the step transition, the request/payload shapes, the quote
// badges (Best Value / Sold out), the expiry lockout, the success screen,
// and the QuoteExpiredError path that bounces the user back to the form.
// Only the three network functions are stubbed; QuoteExpiredError, parseAddress
// and the enum labels are the real implementations.
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { message } from "antd";
import OrderPage from "./OrderPage";
import { getDeliveryOptions, placeOrder, QuoteExpiredError } from "../utils";

jest.mock("../utils", () => {
  const actual = jest.requireActual("../utils");
  return {
    ...actual,
    getDeliveryOptions: jest.fn(),
    placeOrder: jest.fn(),
    cancelOrder: jest.fn(),
  };
});

// Four quotes: 2 stations x 2 modes. Station 1 ROBOT is the cheapest;
// station 1 DRONE is sold out. `expiresAt` far in the future unless a test
// overrides it.
function quotes({ expiresAt = Date.now() + 5 * 60 * 1000 } = {}) {
  const common = { quoteId: "q1", expiresAt, timeIsFallback: false };
  return [
    { ...common, stationId: 1, stationName: "Mission St Station", mode: "ROBOT", price: 5, time: 20, etaText: "Approx. 20 min", available: true },
    { ...common, stationId: 1, stationName: "Mission St Station", mode: "DRONE", price: 9, time: 7, etaText: "Approx. 7 min", available: false },
    { ...common, stationId: 2, stationName: "SoMa Station", mode: "ROBOT", price: 6, time: 24, etaText: "Approx. 24 min", available: true },
    { ...common, stationId: 2, stationName: "SoMa Station", mode: "DRONE", price: 8, time: 9, etaText: "Approx. 9 min", available: true },
  ];
}

function setup(props = {}) {
  const navigate = jest.fn();
  render(<OrderPage navigate={navigate} {...props} />);
  return { navigate, user: userEvent.setup() };
}

async function goToOptions(user) {
  await user.click(screen.getByRole("button", { name: /see delivery options/i }));
  await screen.findByText("Mission St Station");
}

beforeEach(() => {
  jest.clearAllMocks();
  getDeliveryOptions.mockResolvedValue(quotes());
});

it("prefills the form with the default placeholder address", () => {
  setup();
  expect(screen.getByDisplayValue("88 Mission St")).toBeInTheDocument();
  expect(screen.getByDisplayValue("94105")).toBeInTheDocument();
});

it("prefills from a chat hand-off by parsing the discussed address", () => {
  setup({
    prefill: {
      destination: "500 Terry A Francois Blvd, San Francisco, CA 94158",
      weightLb: 7,
    },
  });
  expect(
    screen.getByDisplayValue("500 Terry A Francois Blvd"),
  ).toBeInTheDocument();
  expect(screen.getByDisplayValue("94158")).toBeInTheDocument();
  expect(screen.getByDisplayValue("7")).toBeInTheDocument();
});

it("requests quotes with the address fields and advances to the options step", async () => {
  const { user } = setup();
  await goToOptions(user);

  expect(getDeliveryOptions).toHaveBeenCalledWith({
    destStreet: "88 Mission St",
    destCity: "San Francisco",
    destState: "CA",
    destZip: "94105",
    packageWeight: 3,
  });
  expect(screen.getByText("SoMa Station")).toBeInTheDocument();
});

it("stays on the form and toasts when the quote request fails", async () => {
  const errorToast = jest.spyOn(message, "error").mockImplementation(() => {});
  getDeliveryOptions.mockRejectedValue(new Error("No stations nearby"));
  const { user } = setup();

  await user.click(screen.getByRole("button", { name: /see delivery options/i }));

  await waitFor(() =>
    expect(errorToast).toHaveBeenCalledWith("No stations nearby"),
  );
  expect(
    screen.getByRole("button", { name: /see delivery options/i }),
  ).toBeInTheDocument();
});

it("tags the cheapest quote Best Value and an unavailable one Sold out", async () => {
  const { user } = setup();
  await goToOptions(user);

  expect(screen.getByText("Best Value")).toBeInTheDocument();
  expect(screen.getByText("Sold out")).toBeInTheDocument();
});

it("shows a summary and enables Confirm only after an option is picked", async () => {
  const { user } = setup();
  await goToOptions(user);

  expect(screen.getByRole("button", { name: /confirm order/i })).toBeDisabled();

  await user.click(screen.getAllByRole("radio")[0]); // station 1, ROBOT, $5
  expect(screen.getByRole("button", { name: /confirm order/i })).toBeEnabled();
  // Summary row echoes the picked quote.
  expect(screen.getAllByText("Mission St Station").length).toBeGreaterThan(1);
});

it("places the order with the joined destination and shows the confirmation screen", async () => {
  placeOrder.mockResolvedValue({
    orderId: 5001,
    vehicle: "ROBOT",
    status: "PENDING_DROPOFF",
    dropoffDeadline: Date.now() + 3 * 60 * 60 * 1000,
  });
  const { user } = setup();
  await goToOptions(user);
  await user.click(screen.getAllByRole("radio")[0]);
  await user.click(screen.getByRole("button", { name: /confirm order/i }));

  expect(await screen.findByText(/Order #5001 confirmed/i)).toBeInTheDocument();
  expect(placeOrder).toHaveBeenCalledWith({
    destination: "88 Mission St, San Francisco, CA, 94105",
    packageWeightLbs: 3,
    stationId: 1,
    vehicle: "ROBOT",
  });
});

it("locks out Confirm and warns when the quote has already expired", async () => {
  getDeliveryOptions.mockResolvedValue(quotes({ expiresAt: Date.now() - 1000 }));
  const { user } = setup();
  await goToOptions(user);
  await user.click(screen.getAllByRole("radio")[2]); // an available option

  expect(screen.getByText(/prices have expired/i)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /confirm order/i })).toBeDisabled();
});

it("bounces back to the form when the backend rejects the quote as expired", async () => {
  const errorToast = jest.spyOn(message, "error").mockImplementation(() => {});
  placeOrder.mockRejectedValue(new QuoteExpiredError("This quote has expired."));
  const { user } = setup();
  await goToOptions(user);
  await user.click(screen.getAllByRole("radio")[0]);
  await user.click(screen.getByRole("button", { name: /confirm order/i }));

  await waitFor(() =>
    expect(
      screen.getByRole("button", { name: /see delivery options/i }),
    ).toBeInTheDocument(),
  );
  expect(errorToast).toHaveBeenCalled();
});

it("shows a queued confirmation when the placed order comes back QUEUED", async () => {
  placeOrder.mockResolvedValue({
    orderId: 5002,
    vehicle: "DRONE",
    status: "QUEUED",
  });
  const { user } = setup();
  await goToOptions(user);
  await user.click(screen.getAllByRole("radio")[3]); // station 2, DRONE
  await user.click(screen.getByRole("button", { name: /confirm order/i }));

  expect(await screen.findByText(/Order #5002 is queued/i)).toBeInTheDocument();
});
