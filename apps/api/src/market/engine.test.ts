import { describe, expect, it } from "vitest";
import { calculateExecution, deriveCrossPrice, isMarketDataStale } from "./engine.js";

describe("market engine", () => {
  it("derives cross-market prices with decimal arithmetic", () => {
    expect(deriveCrossPrice({ baseUsdtPrice: "64000.000000000000", quoteUsdtPrice: "3200.000000000000" })).toBe(
      "20.000000000000"
    );
  });

  it("applies spread, slippage, and the configured fee to market execution", () => {
    expect(
      calculateExecution({
        side: "BUY",
        marketPrice: "100.000000000000",
        baseAmount: "2.000000000000",
        spread: "0.0004",
        slippage: "0.0001",
        feeRate: "0.001"
      })
    ).toEqual({ executionPrice: "100.050000000000", quoteAmount: "200.100000000000", feeAmount: "0.200100000000" });
  });

  it("marks a feed as stale once it exceeds its configured age", () => {
    expect(isMarketDataStale({ updatedAt: new Date("2026-08-24T00:00:00.000Z"), now: new Date("2026-08-24T00:00:31.000Z") })).toBe(
      true
    );
  });
});
