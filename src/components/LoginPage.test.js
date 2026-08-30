// LoginPage owns the auth entry point: form validation, the login vs.
// register mode switch, and turning a backend result into either a
// handleLoginSuccess call or an error toast. Those branches are easy to
// break and impossible to fully cover by clicking around, so they're tested
// here. The network itself is stubbed (see src/utils.test.js for that half).
import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { message } from "antd";
import LoginPage from "./LoginPage";
import { login, register } from "../utils";

jest.mock("../utils");

function setup() {
  const handleLoginSuccess = jest.fn();
  render(<LoginPage handleLoginSuccess={handleLoginSuccess} />);
  return { handleLoginSuccess, user: userEvent.setup() };
}

beforeEach(() => {
  jest.clearAllMocks();
});

it("starts on the Login tab with a Login submit button", () => {
  setup();
  expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
});

it("switches to the Register tab and relabels the submit button", async () => {
  const { user } = setup();
  await user.click(screen.getByRole("tab", { name: "Register" }));
  expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();
});

it("blocks submission and shows field errors when username/password are empty", async () => {
  const { user } = setup();
  await user.click(screen.getByRole("button", { name: "Login" }));

  expect(await screen.findByText("Please input your username")).toBeInTheDocument();
  expect(screen.getByText("Please input your password")).toBeInTheDocument();
  expect(login).not.toHaveBeenCalled();
});

it("on a successful login, calls the backend then hands the username up to App", async () => {
  login.mockResolvedValue({ username: "alice" });
  const successToast = jest.spyOn(message, "success").mockImplementation(() => {});
  const { user, handleLoginSuccess } = setup();

  await user.type(screen.getByPlaceholderText("enter your username"), "alice");
  await user.type(screen.getByPlaceholderText("enter your password"), "s3cret");
  await user.click(screen.getByRole("button", { name: "Login" }));

  await waitFor(() =>
    expect(login).toHaveBeenCalledWith({ username: "alice", password: "s3cret" }),
  );
  expect(handleLoginSuccess).toHaveBeenCalledWith("alice");
  expect(successToast).toHaveBeenCalledWith("Welcome back!");
});

it("shows the backend's error message and does not navigate when login fails", async () => {
  login.mockRejectedValue(new Error("Bad credentials"));
  const errorToast = jest.spyOn(message, "error").mockImplementation(() => {});
  const { user, handleLoginSuccess } = setup();

  await user.type(screen.getByPlaceholderText("enter your username"), "alice");
  await user.type(screen.getByPlaceholderText("enter your password"), "wrong");
  await user.click(screen.getByRole("button", { name: "Login" }));

  await waitFor(() => expect(errorToast).toHaveBeenCalledWith("Bad credentials"));
  expect(handleLoginSuccess).not.toHaveBeenCalled();
});

it("after registering, shows a confirmation and drops the user back on the Login tab", async () => {
  register.mockResolvedValue({ username: "bob" });
  const successToast = jest.spyOn(message, "success").mockImplementation(() => {});
  const { user, handleLoginSuccess } = setup();

  await user.click(screen.getByRole("tab", { name: "Register" }));
  await user.type(screen.getByPlaceholderText("enter your username"), "bob");
  await user.type(screen.getByPlaceholderText("enter your password"), "pw123456");
  await user.click(screen.getByRole("button", { name: "Register" }));

  await waitFor(() =>
    expect(register).toHaveBeenCalledWith({ username: "bob", password: "pw123456" }),
  );
  expect(successToast).toHaveBeenCalledWith(
    "Registration successful! Please login.",
  );
  expect(handleLoginSuccess).not.toHaveBeenCalled();
  await waitFor(() =>
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument(),
  );
});
