// HomePage is mostly presentational, but it's the landing screen and every
// quick-action tile / floating button is just an onClick -> navigate(path).
// A broken path here strands the user on the home screen, so the routing
// wiring is worth a couple of cheap checks.
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import HomePage from "./HomePage";

it("routes each quick-action tile to its path", async () => {
  const navigate = jest.fn();
  const user = userEvent.setup();
  render(<HomePage user="alice" navigate={navigate} />);

  await user.click(screen.getByText("Create New Order"));
  expect(navigate).toHaveBeenCalledWith("/order");

  await user.click(screen.getByText("Manage Orders"));
  expect(navigate).toHaveBeenCalledWith("/orders");
});

it("routes the floating buttons to support and settings", async () => {
  const navigate = jest.fn();
  const user = userEvent.setup();
  render(<HomePage user="alice" navigate={navigate} />);

  await user.click(screen.getByTitle("Customer Support"));
  expect(navigate).toHaveBeenCalledWith("/support");

  await user.click(screen.getByTitle("Settings"));
  expect(navigate).toHaveBeenCalledWith("/settings");
});
