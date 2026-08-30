import { describe, expect, it } from "vitest";
import { planMarketOrder } from "./market-order.js";

describe("market-order planning", () => {
  it("plans a buy with base credit, quote cost, and quote-denominated fee", () => {
    expect(
      planMarketOrder({
        side: "BUY",
        baseAsset: "BTC",
        quoteAsset: "USDT",
        baseAmount: "2",
        marketPrice: "100",
        spread: "0.0004",
        slippage: "0.0001",
        feeRate: "0.001"
      })
    ).toEqual({
      executionPrice: "100.050000000000",
      quoteAmount: "200.100000000000",
      feeAmount: "0.200100000000",
      requiredBalance: { asset: "USDT", amount: "200.300100000000" },
      balanceDeltas: [
        { asset: "BTC", amountDelta: "2.000000000000" },
        { asset: "USDT", amountDelta: "-200.300100000000" }
      ]
    });
  });

  it("plans a sell with a fee deducted from quote proceeds", () => {
    expect(
      planMarketOrder({
        side: "SELL",
        baseAsset: "BTC",
        quoteAsset: "USDT",
        baseAmount: "2",
        marketPrice: "100",
        spread: "0.0004",
        slippage: "0.0001",
        feeRate: "0.001"
      })
    ).toMatchObject({
      requiredBalance: { asset: "BTC", amount: "2.000000000000" },
      balanceDeltas: [
        { asset: "BTC", amountDelta: "-2.000000000000" },
        { asset: "USDT", amountDelta: "199.700100000000" }
      ]
    });
  });

  it("rejects a non-positive amount and invalid trade assets before any balance change", () => {
    expect(() => planMarketOrder({ side: "BUY", baseAsset: "BTC", quoteAsset: "USDT", baseAmount: "-1", marketPrice: "100", spread: "0.001", slippage: "0.001", feeRate: "0.001" })).toThrow("Base amount");
    expect(() => planMarketOrder({ side: "BUY", baseAsset: "BTC", quoteAsset: "BTC", baseAmount: "1", marketPrice: "100", spread: "0.001", slippage: "0.001", feeRate: "0.001" })).toThrow("Trade assets");
  });
});
