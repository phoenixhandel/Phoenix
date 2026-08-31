import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "./i18n";

const loadConfirmationPage = async () =>
  import("./WithdrawalConfirmationPage").catch(() => null);

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("WithdrawalConfirmationPage", () => {
  it("prefills the verified email and records a valid balance review without changing the portfolio", async () => {
    window.localStorage.setItem("phoenix_access_token", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve({
          ok: true,
          json: async () =>
            url.includes("settings")
              ? {
                  email: "member@example.test",
                  emailVerified: true,
                  displayCurrency: "EUR"
                }
              : { balances: { BTC: "1.250000000000" } }
        })
      )
    );
    const confirmation = await loadConfirmationPage();

    expect(confirmation).not.toBeNull();
    if (!confirmation) return;
    render(
      <MemoryRouter
        initialEntries={["/withdraw/confirm?asset=BTC&amount=1.25"]}
      >
        <LanguageProvider>
          <confirmation.WithdrawalConfirmationPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(
      ((await screen.findByLabelText("E-Mail-Adresse")) as HTMLInputElement)
        .value
    ).toBe("member@example.test");
    fireEvent.change(screen.getByLabelText("Vorname"), {
      target: { value: "Maria" }
    });
    fireEvent.change(screen.getByLabelText("Nachname"), {
      target: { value: "Muster" }
    });
    fireEvent.click(screen.getByRole("button", { name: "Bestätigen" }));
    expect(screen.getByRole("dialog").textContent).toContain(
      "Prüfung bestätigt"
    );
  });
});
