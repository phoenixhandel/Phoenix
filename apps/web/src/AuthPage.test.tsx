import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthPage } from "./AuthPage";

const auth = vi.hoisted(() => ({
  auth: {
    signUp: vi.fn().mockResolvedValue({ error: null }),
    verifyOtp: vi.fn(),
    resend: vi.fn(),
    signInWithOAuth: vi.fn().mockResolvedValue({
      error: { message: "Unsupported provider: provider is not enabled" }
    })
  }
}));

vi.mock("./auth-client", () => ({
  getAuthClient: () => auth,
  provisionApplicationUser: vi.fn()
}));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("AuthPage", () => {
  it("moves a newly registered user to an eight-digit email confirmation step", async () => {
    render(<AuthPage mode="register" />);

    fireEvent.change(screen.getByLabelText("Vollständiger Name"), {
      target: { value: "Enes Test" }
    });
    fireEvent.change(screen.getByLabelText("E-Mail-Adresse"), {
      target: { value: "enes@example.com" }
    });
    fireEvent.change(screen.getByLabelText(/^Passwort$/), {
      target: { value: "PhoenixSecure12!" }
    });
    fireEvent.change(screen.getByLabelText(/^Passwort wiederholen$/), {
      target: { value: "PhoenixSecure12!" }
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Konto erstellen" }));

    expect(
      await screen.findByRole("heading", { name: "E-Mail-Adresse bestätigen" })
    ).toBeTruthy();
    expect(
      screen
        .getByLabelText("8-stelliger Bestätigungscode")
        .getAttribute("maxLength")
    ).toBe("8");
  });

  it("blocks registration until the password policy is met", async () => {
    render(<AuthPage mode="register" />);
    fireEvent.change(screen.getByLabelText("Vollständiger Name"), { target: { value: "Enes Test" } });
    fireEvent.change(screen.getByLabelText("E-Mail-Adresse"), { target: { value: "enes@example.com" } });
    fireEvent.change(screen.getByLabelText(/^Passwort$/), { target: { value: "alllowercase1!" } });
    fireEvent.change(screen.getByLabelText(/^Passwort wiederholen$/), { target: { value: "alllowercase1!" } });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Konto erstellen" }));
    expect(await screen.findByText(/mindestens 12 Zeichen/)).toBeTruthy();
    expect(auth.auth.signUp).not.toHaveBeenCalled();
  });

  it("offers Apple sign-in alongside Google on the access screen", () => {
    render(<AuthPage mode="login" />);

    expect(
      screen.getByRole("button", { name: "Mit Google fortfahren" })
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Mit Apple fortfahren" })
    ).toBeTruthy();
    expect(screen.getByAltText("Google logo")).toBeTruthy();
    expect(screen.getByAltText("Apple logo")).toBeTruthy();
  });

  it("explains when a selected OAuth provider has not been enabled", async () => {
    render(<AuthPage mode="login" />);

    fireEvent.click(
      screen.getByRole("button", { name: "Mit Google fortfahren" })
    );

    expect(
      await screen.findByText(
        "Die Google-Anmeldung ist noch nicht aktiviert. Bitte verwenden Sie Ihre E-Mail-Adresse oder versuchen Sie es später erneut."
      )
    ).toBeTruthy();
  });
});
