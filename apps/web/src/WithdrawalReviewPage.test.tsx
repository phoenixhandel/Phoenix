import { cleanup, fireEvent, render, screen } from "@testing-library/react";
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ balances: { BTC: "1.250000000000", ETH: "0.000000000000" } })
    }));
    const withdrawal = await loadWithdrawalPage();

    expect(withdrawal).not.toBeNull();
    if (!withdrawal) return;
    const WithdrawalReviewPage = withdrawal.WithdrawalReviewPage;
    expect(WithdrawalReviewPage).toBeTypeOf("function");
    render(<LanguageProvider><WithdrawalReviewPage /></LanguageProvider>);

    expect(await screen.findByRole("heading", { name: "Auszahlung prüfen" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Bitcoin · BTC" })).toBeTruthy();
    expect(screen.getByText("1.250000000000 BTC")).toBeTruthy();

    fireEvent.change(screen.getByLabelText("Betrag in BTC"), { target: { value: "1.5" } });
    fireEvent.click(screen.getByRole("button", { name: "Betrag prüfen" }));
    expect(screen.getByRole("status").textContent).toContain("überschreitet den verfügbaren BTC-Bestand");
  });
});
