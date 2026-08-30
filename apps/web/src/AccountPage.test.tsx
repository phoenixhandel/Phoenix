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
  it("shows a useful crypto dashboard when a verified account has no assets yet", async () => {
    window.localStorage.setItem("phoenix_access_token", "test-token");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue({ ok: true, json: async () => ({ balances: {} }) })
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
      await screen.findByText("Noch keine Assets in deinem Konto.")
    ).toBeTruthy();
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
});
