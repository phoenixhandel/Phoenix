import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthPage } from "./AuthPage";

const provision = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const auth = vi.hoisted(() => ({
  auth: {
    signUp: vi.fn().mockResolvedValue({ data: { user: { identities: [{}] } }, error: null }),
    verifyOtp: vi.fn(),
    resend: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn().mockResolvedValue({
      error: { message: "Unsupported provider: provider is not enabled" }
    })
  }
}));

vi.mock("./auth-client", () => ({
  getAuthClient: () => auth,
  provisionApplicationUser: provision
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
    fireEvent.click(screen.getByRole("checkbox", { name: /Ich akzeptiere/i }));
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
    fireEvent.click(screen.getByRole("checkbox", { name: /Ich akzeptiere/i }));
    fireEvent.click(screen.getByRole("button", { name: "Konto erstellen" }));
    expect(await screen.findByText(/mindestens 12 Zeichen/)).toBeTruthy();
    expect(auth.auth.signUp).not.toHaveBeenCalled();
  });

  it("shows each password requirement as it is satisfied while registering", () => {
    render(<AuthPage mode="register" />);

    expect((screen.getByRole("checkbox", { name: "Mindestens 12 Zeichen" }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("checkbox", { name: "Kleinbuchstabe" }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("checkbox", { name: "Großbuchstabe" }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("checkbox", { name: "Zahl" }) as HTMLInputElement).checked).toBe(false);
    expect((screen.getByRole("checkbox", { name: "Sonderzeichen" }) as HTMLInputElement).checked).toBe(false);

    fireEvent.change(screen.getByLabelText(/^Passwort$/), { target: { value: "PhoenixSecure12!" } });

    expect((screen.getByRole("checkbox", { name: "Mindestens 12 Zeichen" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "Kleinbuchstabe" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "Großbuchstabe" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "Zahl" }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole("checkbox", { name: "Sonderzeichen" }) as HTMLInputElement).checked).toBe(true);
  });

  it("does not move an existing email to the confirmation-code step", async () => {
    auth.auth.signUp.mockResolvedValueOnce({
      data: { user: { identities: [] } },
      error: null
    });
    render(<AuthPage mode="register" />);

    fireEvent.change(screen.getByLabelText("Vollständiger Name"), { target: { value: "Enes Test" } });
    fireEvent.change(screen.getByLabelText("E-Mail-Adresse"), { target: { value: "existing@example.com" } });
    fireEvent.change(screen.getByLabelText(/^Passwort$/), { target: { value: "PhoenixSecure12!" } });
    fireEvent.change(screen.getByLabelText(/^Passwort wiederholen$/), { target: { value: "PhoenixSecure12!" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Ich akzeptiere/i }));
    fireEvent.click(screen.getByRole("button", { name: "Konto erstellen" }));

    expect(await screen.findByText(/Für diese E-Mail-Adresse besteht bereits ein Konto/)).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "E-Mail-Adresse bestätigen" })).toBeNull();
  });

  it("keeps a verified user on the sign-in page when account provisioning fails", async () => {
    auth.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: { email_confirmed_at: "2026-08-30T20:00:00.000Z" } },
      error: null
    });
    provision.mockRejectedValueOnce(new Error("ACCOUNT_PROVISIONING_FAILED"));
    render(<AuthPage mode="login" />);

    fireEvent.change(screen.getByLabelText("E-Mail-Adresse"), { target: { value: "member@example.com" } });
    fireEvent.change(screen.getByLabelText("Passwort"), { target: { value: "PhoenixSecure12!" } });
    fireEvent.click(screen.getByRole("button", { name: "Anmelden" }));

    expect(await screen.findByText(/Konto konnte nicht vorbereitet werden/)).toBeTruthy();
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
