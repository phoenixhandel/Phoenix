import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MarketsPage } from "./MarketsPage";
import { LanguageProvider } from "./i18n";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe("MarketsPage", () => {
  it("shows ranked live assets and takes a person to an asset history view", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: "bitcoin",
            symbol: "btc",
            name: "Bitcoin",
            image: "https://assets.example/bitcoin.png",
            market_cap_rank: 1,
            current_price: 104321.52,
            market_cap: 2078000000000,
            price_change_percentage_24h: 2.48,
            total_volume: 48100000000
          }
        ]
      })
    );

    render(
      <LanguageProvider>
        <MarketsPage />
      </LanguageProvider>
    );

    expect(
      screen.getByRole("heading", { name: "Top 10 nach Marktkapitalisierung" })
    ).toBeTruthy();
    expect(
      (await screen.findByRole("link", { name: /Bitcoin/ })).getAttribute(
        "href"
      )
    ).toBe("/markets/bitcoin");
  });
});
