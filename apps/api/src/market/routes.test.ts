import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { registerMarketRoutes } from "./routes.js";
import { MarketService } from "./service.js";
import type { MarketDataProvider } from "./providers.js";

const provider: MarketDataProvider = {
  connect: async () => undefined,
  disconnect: async () => undefined,
  getTicker: async (symbol) => ({ symbol, price: "64000.000000000000", updatedAt: new Date(), source: "MANUAL" }),
  getCandles: async () => []
};

describe("market routes", () => {
  it("returns public current prices and generated depth", async () => {
    const app = express();
    registerMarketRoutes(app, new MarketService(provider));

    const feed = await request(app).get("/api/market/feed?pairs=BTCUSDT");
    const book = await request(app).get("/api/market/BTCUSDT/order-book");

    expect(feed.status).toBe(200);
    expect(feed.body).toMatchObject({ tickers: [{ symbol: "BTCUSDT", source: "MANUAL" }] });
    expect(book.status).toBe(200);
    expect(book.body.asks).toHaveLength(30);
    expect(book.body.bids).toHaveLength(30);
  });

  it("uses the administrator-configured public depth settings", async () => {
    const app = express();
    registerMarketRoutes(app, new MarketService(provider), async () => ({ spread: "0.01", levels: 20, volatility: "0.02" }));

    const book = await request(app).get("/api/market/BTCUSDT/order-book");

    expect(book.status).toBe(200);
    expect(book.body).toMatchObject({ pair: "BTCUSDT", spread: "1.00000000" });
    expect(book.body.asks).toHaveLength(20);
    expect(book.body.bids).toHaveLength(20);

    const alias = await request(app).get("/api/orderbook/BTCUSDT");
    expect(alias.status).toBe(200);
  });
});
