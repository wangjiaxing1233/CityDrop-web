// MyOrdersPage has three visual states (loading / empty / populated), splits
// orders across Active and Completed tabs whose counts must match, and is a
// class component driven by tab state that lives in the URL (App passes it
// down). These tests cover the state switching, the counts, the per-status
// badge, and that a card click routes to the detail page.
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MyOrdersPage from "./MyOrdersPage";
import { getOrders } from "../utils";

jest.mock("../utils");

function setup({ active = [], completed = [], activeTab = "1" } = {}) {
  getOrders.mockResolvedValue({ active, completed });
  const navigate = jest.fn();
  const setActiveTab = jest.fn();
  render(
    <MyOrdersPage
      navigate={navigate}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    />,
  );
  return { navigate, setActiveTab, user: userEvent.setup() };
}

const order = (over) => ({
  orderId: 1001,
  destination: "1 Market St, San Francisco, CA 94105",
  vehicle: "ROBOT",
  price: 7.35,
  time: 12,
  status: "BEFORE_HALF_WAY",
  ...over,
});

beforeEach(() => {
  jest.clearAllMocks();
});

it("shows a spinner until the orders load", async () => {
  let resolve;
  getOrders.mockReturnValue(new Promise((r) => { resolve = r; }));
  render(<MyOrdersPage navigate={jest.fn()} activeTab="1" setActiveTab={jest.fn()} />);

  expect(document.querySelector(".ant-spin")).toBeInTheDocument();
  resolve({ active: [], completed: [] });
  await waitFor(() =>
    expect(document.querySelector(".ant-spin")).not.toBeInTheDocument(),
  );
});

it("shows an empty state with a shortcut to the order form when there are no orders", async () => {
  const { user, navigate } = setup();

  const cta = await screen.findByRole("button", { name: /place an order/i });
  await user.click(cta);
  expect(navigate).toHaveBeenCalledWith("/order");
});

it("labels the tabs with live counts and lists the active orders", async () => {
  setup({
    active: [order({ orderId: 1001 }), order({ orderId: 1002, vehicle: "DRONE" })],
    completed: [order({ orderId: 900, status: "DELIVERED" })],
  });

  expect(await screen.findByRole("tab", { name: "Active (2)" })).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Completed (1)" })).toBeInTheDocument();
  expect(screen.getByText("#1001")).toBeInTheDocument();
  expect(screen.getByText("#1002")).toBeInTheDocument();
});

it("routes to the order detail page when a card is clicked", async () => {
  const { user, navigate } = setup({ active: [order({ orderId: 1001 })] });

  await user.click(await screen.findByText("#1001"));
  expect(navigate).toHaveBeenCalledWith("/orders/1001");
});

it("asks App to switch tabs (URL state) when the Completed tab is clicked", async () => {
  const { user, setActiveTab } = setup({
    active: [order({ orderId: 1001 })],
    completed: [order({ orderId: 900, status: "DELIVERED" })],
  });

  await user.click(await screen.findByRole("tab", { name: "Completed (1)" }));
  expect(setActiveTab).toHaveBeenCalledWith("2");
});

it("renders the completed list when App says tab 2 is active", async () => {
  setup({
    active: [order({ orderId: 1001 })],
    completed: [order({ orderId: 900, status: "DELIVERED" })],
    activeTab: "2",
  });

  expect(await screen.findByText("#900")).toBeInTheDocument();
  expect(screen.getByText("Delivered")).toBeInTheDocument();
});

it("shows a wait estimate and a Queued badge for a queued order", async () => {
  setup({
    active: [order({ orderId: 1001, status: "QUEUED", estimatedWaitMs: 180000 })],
  });

  expect(await screen.findByText("Queued")).toBeInTheDocument();
  expect(screen.getByText(/Estimated wait: ~3 min/)).toBeInTheDocument();
});
