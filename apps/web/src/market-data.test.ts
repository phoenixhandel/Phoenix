import { describe, expect, it, vi } from "vitest";
import { getPortfolioAssetPrices, normalizeTopCoins } from "./market-data";

describe("normalizeTopCoins", () => {
  it("keeps the market-cap rank, logo, price, and 24-hour move for a discovery row", () => {
    const rows = normalizeTopCoins([
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
    ]);

    expect(rows).toEqual([
      {
        id: "bitcoin",
        symbol: "BTC",
        name: "Bitcoin",
        image: "https://assets.example/bitcoin.png",
        rank: 1,
        price: 104321.52,
        marketCap: 2078000000000,
        change24h: 2.48,
        volume24h: 48100000000
      }
    ]);
  });
});

describe("portfolio prices", () => {
  it("returns symbol-indexed prices in the selected display currency", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ bitcoin: { eur: 6000 }, tether: { eur: 0.92 } }) }));
    await expect(getPortfolioAssetPrices("EUR")).resolves.toEqual({ BTC: 6000, USDT: 0.92 });
    vi.unstubAllGlobals();
  });
});
