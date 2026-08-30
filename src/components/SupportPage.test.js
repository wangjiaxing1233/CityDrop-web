// SupportPage is Feature 4 (AI Customer Support). The parts worth locking
// down are all frontend behaviour, not the model: the optimistic user
// bubble, wiring the reply's flags to the right follow-up buttons, the
// confirm-before-cancel shortcut, error bubbles on a failed call, and the
// per-user localStorage transcript. The backend call is stubbed.
import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SupportPage from "./SupportPage";
import { sendChatMessage, cancelOrder } from "../utils";

jest.mock("../utils");

const GREETING = /I'm the CityDrop assistant/;

function setup(props = {}) {
  const navigate = jest.fn();
  render(<SupportPage navigate={navigate} user="alice" {...props} />);
  return { navigate, user: userEvent.setup() };
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

it("opens with the assistant greeting when there is no saved transcript", () => {
  setup();
  expect(screen.getByText(GREETING)).toBeInTheDocument();
});

it("shows the typed message immediately, then the assistant reply, and clears the input", async () => {
  sendChatMessage.mockResolvedValue({
    reply: "Order #12 is on the way.",
    suggestCreateOrder: false,
    offerHumanHelp: false,
    suggestCancelOrderId: null,
  });
  const { user } = setup();
  const input = screen.getByPlaceholderText(/Ask about an order/);

  await user.type(input, "where is order 12");
  await user.click(screen.getByRole("button", { name: "Send" }));

  expect(screen.getByText("where is order 12")).toBeInTheDocument();
  expect(await screen.findByText("Order #12 is on the way.")).toBeInTheDocument();
  expect(input).toHaveValue("");
});

it("passes the prior conversation as history on each send", async () => {
  sendChatMessage.mockResolvedValue({ reply: "ok" });
  const { user } = setup();

  await user.type(screen.getByPlaceholderText(/Ask about an order/), "hi");
  await user.click(screen.getByRole("button", { name: "Send" }));

  await waitFor(() => expect(sendChatMessage).toHaveBeenCalled());
  const [text, history] = sendChatMessage.mock.calls[0];
  expect(text).toBe("hi");
  expect(history).toEqual([
    { role: "assistant", content: expect.stringContaining("CityDrop assistant") },
  ]);
});

it("keeps Send disabled for empty/whitespace input and sends on Enter", async () => {
  sendChatMessage.mockResolvedValue({ reply: "got it" });
  const { user } = setup();
  const input = screen.getByPlaceholderText(/Ask about an order/);

  expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
  await user.type(input, "   ");
  expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();

  await user.clear(input);
  await user.type(input, "hello{Enter}");
  expect(await screen.findByText("got it")).toBeInTheDocument();
});

it("renders an error bubble when the chat call fails, without losing the question", async () => {
  sendChatMessage.mockRejectedValue(new Error("Service unavailable"));
  const { user } = setup();

  await user.type(screen.getByPlaceholderText(/Ask about an order/), "hello?");
  await user.click(screen.getByRole("button", { name: "Send" }));

  expect(screen.getByText("hello?")).toBeInTheDocument();
  expect(await screen.findByText("Service unavailable")).toBeInTheDocument();
});

it("turns a suggestCreateOrder reply into a shortcut that carries the discussed address into the order form", async () => {
  sendChatMessage.mockResolvedValue({
    reply: "I've pulled up the order form for you.",
    suggestCreateOrder: true,
    suggestedDestination: "1 Main St, San Francisco, CA 94105",
    suggestedWeightLbs: 4,
  });
  const { user, navigate } = setup();

  await user.type(screen.getByPlaceholderText(/Ask about an order/), "new delivery");
  await user.click(screen.getByRole("button", { name: "Send" }));

  const cta = await screen.findByRole("button", { name: /create order/i });
  await user.click(cta);
  expect(navigate).toHaveBeenCalledWith("/order", {
    state: { destination: "1 Main St, San Francisco, CA 94105", weightLb: 4 },
  });
});

it("cancels through chat only after a confirm, then reports the refund outcome", async () => {
  jest.spyOn(window, "confirm").mockReturnValue(true);
  sendChatMessage.mockResolvedValue({
    reply: "I've pulled up a cancel confirmation for order #15.",
    suggestCancelOrderId: 15,
  });
  cancelOrder.mockResolvedValue({ orderId: 15, status: "CANCELLED", refundEligible: true });
  const { user } = setup();

  await user.type(screen.getByPlaceholderText(/Ask about an order/), "cancel 15");
  await user.click(screen.getByRole("button", { name: "Send" }));

  await user.click(await screen.findByRole("button", { name: /cancel order #15/i }));

  expect(window.confirm).toHaveBeenCalled();
  await waitFor(() => expect(cancelOrder).toHaveBeenCalledWith(15));
  expect(
    await screen.findByText(/Order #15 has been cancelled\..*eligible for a refund/i),
  ).toBeInTheDocument();
});

it("does not cancel when the user declines the confirm", async () => {
  jest.spyOn(window, "confirm").mockReturnValue(false);
  sendChatMessage.mockResolvedValue({
    reply: "confirm?",
    suggestCancelOrderId: 15,
  });
  const { user } = setup();

  await user.type(screen.getByPlaceholderText(/Ask about an order/), "cancel 15");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await user.click(await screen.findByRole("button", { name: /cancel order #15/i }));

  expect(cancelOrder).not.toHaveBeenCalled();
});

it("persists the transcript under a per-user key so accounts don't share history", async () => {
  sendChatMessage.mockResolvedValue({ reply: "saved reply" });
  const { user } = setup();

  await user.type(screen.getByPlaceholderText(/Ask about an order/), "remember this");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByText("saved reply");

  const stored = JSON.parse(localStorage.getItem("citydrop:chatHistory:alice"));
  expect(stored).toEqual(
    expect.arrayContaining([
      { role: "user", content: "remember this" },
      expect.objectContaining({ role: "assistant", content: "saved reply" }),
    ]),
  );
});

it("restores a saved transcript on mount", () => {
  localStorage.setItem(
    "citydrop:chatHistory:alice",
    JSON.stringify([
      { role: "assistant", content: "Hi! I'm the CityDrop assistant." },
      { role: "user", content: "earlier question" },
    ]),
  );
  setup();
  expect(screen.getByText("earlier question")).toBeInTheDocument();
});

it("falls back to a fresh greeting when the saved value is corrupt", () => {
  localStorage.setItem("citydrop:chatHistory:alice", "{ not valid json");
  setup();
  expect(screen.getByText(GREETING)).toBeInTheDocument();
});

it("clears the conversation back to just the greeting after confirming", async () => {
  jest.spyOn(window, "confirm").mockReturnValue(true);
  sendChatMessage.mockResolvedValue({ reply: "reply one" });
  const { user } = setup();

  await user.type(screen.getByPlaceholderText(/Ask about an order/), "first message");
  await user.click(screen.getByRole("button", { name: "Send" }));
  await screen.findByText("reply one");

  await user.click(screen.getByText("Clear conversation"));

  expect(screen.queryByText("first message")).not.toBeInTheDocument();
  expect(screen.getByText(GREETING)).toBeInTheDocument();
});

it("surfaces a mic-permission error as an error bubble when getUserMedia is unavailable", async () => {
  const { user } = setup();
  await user.click(screen.getByTitle("Talk instead of typing"));
  expect(
    await screen.findByText(/Couldn't access the microphone/i),
  ).toBeInTheDocument();
});
