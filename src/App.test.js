// App owns routing, the cookie-session auth gate (requireAuth), the top-nav
// auth affordances, and the global "citydrop:unauthorized" -> force-logout
// listener. These tests drive it through a MemoryRouter and check which page
// each path renders and how the logged-in/out chrome reacts. TrackingMap is
// stubbed so the order-detail route doesn't pull Leaflet into jsdom.
import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { getOrders, logout } from "./utils";

jest.mock("./utils");
jest.mock("./components/TrackingMap", () => ({ TrackingMap: () => null }));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  getOrders.mockResolvedValue({ active: [], completed: [] });
  logout.mockResolvedValue();
});

it("renders the home page and a signed-out nav at /", async () => {
  renderAt("/");
  expect(await screen.findByText("Create New Order")).toBeInTheDocument();
  expect(screen.getByText("Sign in / Register")).toBeInTheDocument();
});

it("redirects an unknown path back to home", async () => {
  renderAt("/does-not-exist");
  expect(await screen.findByText("Create New Order")).toBeInTheDocument();
});

it("shows the login page instead of a guarded route when signed out", async () => {
  renderAt("/order");
  expect(await screen.findByRole("button", { name: "Login" })).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: /see delivery options/i }),
  ).not.toBeInTheDocument();
});

it("renders the guarded route when a username is restored from localStorage", async () => {
  localStorage.setItem("username", "alice");
  renderAt("/order");
  expect(
    await screen.findByRole("button", { name: /see delivery options/i }),
  ).toBeInTheDocument();
});

it("logs out from the nav: clears the session and returns to a signed-out state", async () => {
  localStorage.setItem("username", "alice");
  renderAt("/");
  const user = userEvent.setup();

  await user.click(await screen.findByText("Log out"));

  expect(logout).toHaveBeenCalled();
  expect(localStorage.getItem("username")).toBeNull();
  expect(await screen.findByText("Sign in / Register")).toBeInTheDocument();
});

it("forces a logout when a citydrop:unauthorized event fires anywhere in the app", async () => {
  localStorage.setItem("username", "alice");
  renderAt("/");
  expect(await screen.findByText("Log out")).toBeInTheDocument();

  act(() => {
    window.dispatchEvent(new Event("citydrop:unauthorized"));
  });

  expect(await screen.findByText("Sign in / Register")).toBeInTheDocument();
  expect(localStorage.getItem("username")).toBeNull();
});
