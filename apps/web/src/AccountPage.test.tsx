import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AccountPage } from "./AccountPage";
import { LanguageProvider } from "./i18n";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("AccountPage", () => {
  it("shows zero-value wallets and account actions for a verified account", async () => {
    window.localStorage.setItem("phoenix_access_token", "test-token");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ balances: { BTC: "0.000000000000", ETH: "0.000000000000", SOL: "0.000000000000", XRP: "0.000000000000", USDT: "0.000000000000" } }) })
    );

    render(
      <LanguageProvider>
        <AccountPage page="portfolio" />
      </LanguageProvider>
    );

    expect(
      screen.getByRole("heading", { name: "Dein Krypto-Überblick" })
    ).toBeTruthy();
    expect(screen.getByRole("link", { name: "Märkte entdecken" })).toBeTruthy();
    expect(
      await screen.findByText("Bitcoin")
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Einzahlen" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Konvertieren" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Auszahlen" })).toBeTruthy();
  });

  it("keeps the dashboard useful when account data cannot be reached", async () => {
    window.localStorage.setItem("phoenix_access_token", "test-token");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    render(
      <LanguageProvider>
        <AccountPage page="portfolio" />
      </LanguageProvider>
    );

    expect(
      await screen.findByText(
        "Kontodaten sind gerade nicht verfügbar. Bitte versuche es gleich noch einmal."
      )
    ).toBeTruthy();
    expect(screen.queryByText("Portfolio wird geladen…")).toBeNull();
  });

  it("offers account currency, password, email, and contact controls in settings", () => {
    render(<LanguageProvider><AccountPage page="settings" /></LanguageProvider>);
    expect((screen.getByLabelText("Anzeigewährung") as HTMLSelectElement).value).toBe("EUR");
    expect(screen.getByLabelText("Neues Passwort")).toBeTruthy();
    expect(screen.getByLabelText("Neue E-Mail-Adresse")).toBeTruthy();
    expect(screen.getByLabelText("Betreff")).toBeTruthy();
  });
});
