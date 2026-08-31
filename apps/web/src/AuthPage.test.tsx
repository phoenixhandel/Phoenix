import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthPage } from "./AuthPage";

const provision = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const auth = vi.hoisted(() => ({
  auth: {
    signUp: vi.fn().mockResolvedValue({ data: { user: { identities: [{}] } }, error: null }),
    verifyOtp: vi.fn(),
    resend: vi.fn(),
    signInWithPassword: vi.fn()
  }
}));

vi.mock("./auth-client", () => ({
  getAuthClient: () => auth,
  provisionApplicationUser: provision
}));

vi.mock("./TurnstileCaptcha", () => ({
  TurnstileCaptcha: ({ onToken }: { onToken: (token: string) => void }) => (
    <button type="button" onClick={() => onToken("captcha-token")}>
      Sicherheitsprüfung abschließen
    </button>
  )
}));

const completeCaptcha = () => fireEvent.click(screen.getByRole("button", { name: "Sicherheitsprüfung abschließen" }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("AuthPage", () => {
  it("moves a newly registered user to an eight-digit email confirmation step", async () => {
    render(<AuthPage mode="register" />);

    completeCaptcha();
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
    completeCaptcha();
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

    completeCaptcha();
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

    completeCaptcha();
    fireEvent.change(screen.getByLabelText("E-Mail-Adresse"), { target: { value: "member@example.com" } });
    fireEvent.change(screen.getByLabelText("Passwort"), { target: { value: "PhoenixSecure12!" } });
    fireEvent.click(screen.getByRole("button", { name: "Anmelden" }));

    expect(await screen.findByText(/Konto konnte nicht vorbereitet werden/)).toBeTruthy();
  });

  it("does not render Google or Apple sign-in controls", () => {
    render(<AuthPage mode="login" />);

    expect(screen.queryByRole("button", { name: /Google|Apple/i })).toBeNull();
  });

  it("lets a user reveal and hide their password while signing in", () => {
    render(<AuthPage mode="login" />);

    const password = screen.getByLabelText("Passwort");
    expect(password.getAttribute("type")).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Passwort anzeigen" }));
    expect(password.getAttribute("type")).toBe("text");

    fireEvent.click(screen.getByRole("button", { name: "Passwort verbergen" }));
    expect(password.getAttribute("type")).toBe("password");
  });

  it("lets a user reveal their registration password and confirmation independently", () => {
    render(<AuthPage mode="register" />);

    const password = screen.getByLabelText(/^Passwort$/);
    const confirmation = screen.getByLabelText("Passwort wiederholen");

    fireEvent.click(screen.getByRole("button", { name: "Passwort anzeigen" }));
    expect(password.getAttribute("type")).toBe("text");
    expect(confirmation.getAttribute("type")).toBe("password");

    fireEvent.click(screen.getByRole("button", { name: "Passwort wiederholen anzeigen" }));
    expect(confirmation.getAttribute("type")).toBe("text");
  });

  it("passes the completed CAPTCHA token when registering", async () => {
    render(<AuthPage mode="register" />);

    completeCaptcha();
    fireEvent.change(screen.getByLabelText("Vollständiger Name"), { target: { value: "Enes Test" } });
    fireEvent.change(screen.getByLabelText("E-Mail-Adresse"), { target: { value: "enes@example.com" } });
    fireEvent.change(screen.getByLabelText(/^Passwort$/), { target: { value: "PhoenixSecure12!" } });
    fireEvent.change(screen.getByLabelText(/^Passwort wiederholen$/), { target: { value: "PhoenixSecure12!" } });
    fireEvent.click(screen.getByRole("checkbox", { name: /Ich akzeptiere/i }));
    fireEvent.click(screen.getByRole("button", { name: "Konto erstellen" }));

    await waitFor(() => expect(auth.auth.signUp).toHaveBeenCalledWith(expect.objectContaining({
      options: expect.objectContaining({ captchaToken: "captcha-token" })
    })));
  });

  it("passes the completed CAPTCHA token when signing in", async () => {
    auth.auth.signInWithPassword.mockResolvedValueOnce({
      data: { user: { email_confirmed_at: "2026-08-30T20:00:00.000Z" } },
      error: null
    });
    provision.mockRejectedValueOnce(new Error("ACCOUNT_PROVISIONING_FAILED"));
    render(<AuthPage mode="login" />);

    completeCaptcha();
    fireEvent.change(screen.getByLabelText("E-Mail-Adresse"), { target: { value: "member@example.com" } });
    fireEvent.change(screen.getByLabelText("Passwort"), { target: { value: "PhoenixSecure12!" } });
    fireEvent.click(screen.getByRole("button", { name: "Anmelden" }));

    await waitFor(() => expect(auth.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "member@example.com",
      password: "PhoenixSecure12!",
      options: { captchaToken: "captcha-token" }
    }));
  });
});
