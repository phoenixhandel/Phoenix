import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhoneVerificationPage } from "./PhoneVerificationPage";

const provision = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const auth = vi.hoisted(() => ({
  auth: {
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    updateUser: vi.fn().mockResolvedValue({ error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ error: null })
  }
}));

vi.mock("./auth-client", () => ({
  getAuthClient: () => auth,
  provisionApplicationUser: provision
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("PhoneVerificationPage", () => {
  it("requests a phone change for the current account instead of passwordless sign-in", async () => {
    render(<PhoneVerificationPage />);

    fireEvent.change(screen.getByLabelText("Mobilnummer"), { target: { value: "+4915123456789" } });
    fireEvent.click(screen.getByRole("button", { name: "Code senden" }));

    await waitFor(() => expect(auth.auth.updateUser).toHaveBeenCalledWith({ phone: "+4915123456789" }));
    expect(auth.auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("verifies the phone change without replacing the signed-in user", async () => {
    render(<PhoneVerificationPage />);

    fireEvent.change(screen.getByLabelText("Mobilnummer"), { target: { value: "+4915123456789" } });
    fireEvent.click(screen.getByRole("button", { name: "Code senden" }));
    await screen.findByLabelText("Bestätigungscode");
    fireEvent.change(screen.getByLabelText("Bestätigungscode"), { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Telefonnummer bestätigen" }));

    await waitFor(() => expect(auth.auth.verifyOtp).toHaveBeenCalledWith({
      phone: "+4915123456789",
      token: "123456",
      type: "phone_change"
    }));
  });

  it("requires an E.164 phone number before sending a code", async () => {
    render(<PhoneVerificationPage />);

    fireEvent.change(screen.getByLabelText("Mobilnummer"), { target: { value: "0151 23456789" } });
    fireEvent.click(screen.getByRole("button", { name: "Code senden" }));

    expect(await screen.findByText("Bitte geben Sie eine gültige internationale Mobilnummer ein.")).toBeTruthy();
    expect(auth.auth.updateUser).not.toHaveBeenCalled();
    expect(auth.auth.signInWithOtp).not.toHaveBeenCalled();
  });
});
