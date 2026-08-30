// OrderDetailPage renders very differently per status and gates the
// destructive "Cancel order" control on isCancellable. Those status branches
// (PENDING_DROPOFF drop-off confirm, QUEUED wait card, CANCELLED explainer,
// the in-flight Steps view) and the cancel/confirm flows are what these
// tests pin down. TrackingMap is stubbed — it's a Leaflet map that needs a
// real browser and isn't what this page's logic is about.
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { message } from "antd";
import OrderDetailPage from "./OrderDetailPage";
import { getOrder, confirmAtStation, cancelOrder } from "../utils";

jest.mock("../utils");
jest.mock("./TrackingMap", () => ({ TrackingMap: () => <div data-testid="tracking-map" /> }));

const baseOrder = {
  orderId: 42,
  destination: "1000 The Embarcadero, San Francisco, CA 94133",
  packageWeightLbs: 2,
  vehicle: "ROBOT",
  price: 7.35,
  time: 12,
  timeIsFallback: false,
  stationId: 1,
  status: "PENDING_DROPOFF",
};

function setup(order = baseOrder) {
  getOrder.mockResolvedValue(order);
  const navigate = jest.fn();
  render(<OrderDetailPage orderId={String(order.orderId)} navigate={navigate} />);
  return { navigate, user: userEvent.setup() };
}

beforeEach(() => {
  jest.clearAllMocks();
});

it("shows a spinner while loading, then the order once it arrives", async () => {
  let resolve;
  getOrder.mockReturnValue(new Promise((r) => { resolve = r; }));
  render(<OrderDetailPage orderId="42" navigate={jest.fn()} />);

  expect(document.querySelector(".ant-spin")).toBeInTheDocument();

  resolve(baseOrder);
  expect(await screen.findByText("Order #42")).toBeInTheDocument();
});

it("shows 'Order not found' and an error toast when the fetch rejects", async () => {
  const errorToast = jest.spyOn(message, "error").mockImplementation(() => {});
  getOrder.mockRejectedValue(new Error("Order not found."));
  render(<OrderDetailPage orderId="999" navigate={jest.fn()} />);

  expect(await screen.findByText("Order not found")).toBeInTheDocument();
  expect(errorToast).toHaveBeenCalledWith("Order not found.");
});

it("renders the order's key facts with the shared enum labels", async () => {
  setup({ ...baseOrder, status: "BEFORE_HALF_WAY" });

  expect(await screen.findByText("1000 The Embarcadero, San Francisco, CA 94133")).toBeInTheDocument();
  expect(screen.getByText("2 lb")).toBeInTheDocument();
  expect(screen.getByText("Ground Robot")).toBeInTheDocument(); // modeLabel("ROBOT")
  expect(screen.getByText("Station #1")).toBeInTheDocument();
  expect(screen.getByText("$7.35")).toBeInTheDocument();
});

it("PENDING_DROPOFF shows the drop-off prompt and confirms drop-off on click", async () => {
  confirmAtStation.mockResolvedValue({ ...baseOrder, status: "BEFORE_HALF_WAY" });
  const { user } = setup();

  const confirmBtn = await screen.findByRole("button", {
    name: /I've dropped off my package/i,
  });
  await user.click(confirmBtn);

  await waitFor(() => expect(confirmAtStation).toHaveBeenCalledWith(42));
});

it("tells the user they were queued when no vehicle was free at drop-off", async () => {
  const infoToast = jest.spyOn(message, "info").mockImplementation(() => {});
  confirmAtStation.mockResolvedValue({ ...baseOrder, status: "QUEUED", estimatedWaitMs: null });
  const { user } = setup();

  await user.click(
    await screen.findByRole("button", { name: /I've dropped off my package/i }),
  );

  await waitFor(() => expect(infoToast).toHaveBeenCalled());
  expect(
    await screen.findByText(/Waiting for a ground robot to free up/i),
  ).toBeInTheDocument();
});

it("offers Cancel order for an in-flight order and runs the cancel flow", async () => {
  const successToast = jest.spyOn(message, "success").mockImplementation(() => {});
  cancelOrder.mockResolvedValue({
    ...baseOrder,
    status: "CANCELLED",
    refundEligible: false,
  });
  const { user } = setup({ ...baseOrder, status: "HALF_WAY" });

  await user.click(await screen.findByRole("button", { name: "Cancel order" }));
  await user.click(await screen.findByRole("button", { name: "Yes, cancel it" }));

  await waitFor(() => expect(cancelOrder).toHaveBeenCalledWith(42));
  expect(successToast).toHaveBeenCalledWith(
    expect.stringMatching(/too far along to be refund-eligible/i),
  );
});

it("hides Cancel order once the order is delivered", async () => {
  setup({ ...baseOrder, status: "DELIVERED" });

  expect(await screen.findByText("Order #42")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cancel order" })).not.toBeInTheDocument();
  expect(screen.getByTestId("tracking-map")).toBeInTheDocument();
});

it("explains an auto-cancelled order that missed its drop-off window", async () => {
  setup({ ...baseOrder, status: "CANCELLED", missedDropoff: true });

  expect(
    await screen.findByText(/wasn't dropped off at the station in time/i),
  ).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Cancel order" })).not.toBeInTheDocument();
});
