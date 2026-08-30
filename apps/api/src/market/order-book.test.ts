import { describe, expect, it } from "vitest";
import { generateOrderBook } from "./order-book.js";

describe("generated order book", () => {
  it("creates the configured depth symmetrically around the market price", () => {
    const book = generateOrderBook({ marketPrice: "100.000000000000", spread: "0.001", levels: 20 });

    expect(book.asks).toHaveLength(20);
    expect(book.bids).toHaveLength(20);
    expect(book.asks.every(({ price }) => Number(price) > 100)).toBe(true);
    expect(book.bids.every(({ price }) => Number(price) < 100)).toBe(true);
    expect(book.midMarketPrice).toBe("100.000000000000");
    expect(book.spread).toBe("0.10000000");
  });
});
