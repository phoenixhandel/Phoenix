import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageProvider } from "./i18n";

const loadWithdrawalPage = async () =>
  import("./WithdrawalReviewPage").catch(() => null);

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("WithdrawalReviewPage", () => {
  it("uses the authenticated portfolio as the available balance for the selected asset", async () => {
    window.localStorage.setItem("phoenix_access_token", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          balances: { BTC: "1.250000000000", ETH: "0.000000000000" }
        })
      })
    );
    const withdrawal = await loadWithdrawalPage();

    expect(withdrawal).not.toBeNull();
    if (!withdrawal) return;
    const WithdrawalReviewPage = withdrawal.WithdrawalReviewPage;
    expect(WithdrawalReviewPage).toBeTypeOf("function");
    render(
      <MemoryRouter>
        <LanguageProvider>
          <WithdrawalReviewPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    expect(
      await screen.findByRole("heading", { name: "Auszahlung prüfen" })
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bitcoin · BTC" })).toBeTruthy();
    expect(screen.getByText("1.250000000000 BTC")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Betrag in BTC"), {
      target: { value: "1.5" }
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Auszahlung fortsetzen" })
    );
    expect(screen.getByRole("status").textContent).toContain(
      "überschreitet den verfügbaren BTC-Bestand"
    );
  });

  it("fills the full available asset amount and shows its EUR equivalent", async () => {
    window.localStorage.setItem("phoenix_access_token", "test-token");
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        Promise.resolve({
          ok: true,
          json: async () =>
            url.includes("coingecko")
              ? { bitcoin: { eur: 60000 } }
              : { balances: { BTC: "1.250000000000" } }
        })
      )
    );
    const withdrawal = await loadWithdrawalPage();

    expect(withdrawal).not.toBeNull();
    if (!withdrawal) return;
    render(
      <MemoryRouter>
        <LanguageProvider>
          <withdrawal.WithdrawalReviewPage />
        </LanguageProvider>
      </MemoryRouter>
    );

    await screen.findByText("1.250000000000 BTC");
    fireEvent.click(screen.getByRole("button", { name: "Max" }));
    expect(
      (screen.getByLabelText("Betrag in BTC") as HTMLInputElement).value
    ).toBe("1.25");
    expect(screen.getAllByText(/75\.000,00\s?€/)).toHaveLength(2);
  });
});
