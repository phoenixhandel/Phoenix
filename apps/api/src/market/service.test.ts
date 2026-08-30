import { describe, expect, it } from "vitest";
import { MarketService } from "./service.js";
import type { MarketDataProvider } from "./providers.js";

const provider: MarketDataProvider = {
  connect: async () => undefined,
  disconnect: async () => undefined,
  getTicker: async (symbol) => ({
    symbol,
    price: symbol === "BTCUSDT" ? "64000.000000000000" : "3200.000000000000",
    updatedAt: new Date("2026-08-24T00:00:00.000Z"),
    source: "MANUAL"
  }),
  getCandles: async (symbol) => [{ openTime: new Date("2026-08-24T00:00:00.000Z"), closeTime: new Date("2026-08-24T01:00:00.000Z"), open: symbol === "BTCUSDT" ? "64000" : "3200", high: symbol === "BTCUSDT" ? "65000" : "3250", low: symbol === "BTCUSDT" ? "63000" : "3150", close: symbol === "BTCUSDT" ? "64500" : "3225", volume: "10" }]
};

describe("MarketService", () => {
  it("derives configured crypto cross pairs from USDT references", async () => {
    const service = new MarketService(provider);

    await expect(service.getTicker("BTCETH")).resolves.toMatchObject({
      symbol: "BTCETH",
      price: "20.000000000000",
      source: "MANUAL"
    });
  });

  it("reports stale cached market data", async () => {
    const service = new MarketService(provider, { staleAfterMs: 30_000 });
    await service.getTicker("BTCUSDT");

    expect(service.isStale("BTCUSDT", new Date("2026-08-24T00:00:31.000Z"))).toBe(true);
  });

  it("derives approximate synchronized candles for crypto cross markets", async () => {
    const service = new MarketService(provider);
    await expect(service.getCandles("BTCETH", "1h", 1)).resolves.toEqual([expect.objectContaining({ open: "20.000000000000", close: "20.000000000000", synthetic: true })]);
  });
});
