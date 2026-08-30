import { beforeEach, describe, expect, it, vi } from "vitest";
import { useExchangeStore } from "./exchange-store";

describe("exchange store", () => {
  beforeEach(() => useExchangeStore.getState().reset());
  it("hydrates live ticker and order-book data from the Phoenix API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ tickers: [{ symbol: "BTCUSDT", price: "65000", updatedAt: "2026-08-24T00:00:00.000Z", source: "MANUAL" }], stale: false }))).mockResolvedValueOnce(new Response(JSON.stringify({ asks: [], bids: [], spread: "0.1" }))).mockResolvedValueOnce(new Response(JSON.stringify({ candles: [{ openTime: "2026-08-24T00:00:00.000Z", open: "64000", high: "65000", low: "63000", close: "64500" }] }))));
    await useExchangeStore.getState().refreshMarket();
    expect(useExchangeStore.getState().ticker?.price).toBe("65000");
    expect(useExchangeStore.getState().orderBook?.spread).toBe("0.1");
    expect(useExchangeStore.getState().candles).toHaveLength(1);
  });

  it("changes the selected pair before requesting its market data", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ tickers: [], stale: false, asks: [], bids: [], candles: [] }))));
    useExchangeStore.getState().setPair("ETHUSDT");
    await useExchangeStore.getState().refreshMarket();
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/api\/market\/feed\?pairs=ETHUSDT$/)
    );
  });
});
