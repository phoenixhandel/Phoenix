import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { generateOrderBook } from "./order-book.js";
import type { CandleInterval } from "./providers.js";
import { MarketService } from "./service.js";

const candlesQuery = z.object({
  interval: z.enum(["1m", "5m", "15m", "1h", "4h", "1d"]).default("1h"),
  limit: z.coerce.number().int().min(1).max(1000).default(100)
});

const asyncRoute = (handler: RequestHandler): RequestHandler => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

const pairParam = (value: string | string[] | undefined) => (typeof value === "string" ? value.toUpperCase() : undefined);

export type OrderBookSettings = { spread: string; levels: number; volatility: string };

export const registerMarketRoutes = (app: Express, market: MarketService, getOrderBookSettings?: () => Promise<OrderBookSettings>) => {
  app.get(
    "/api/market/pairs",
    (_request, response) => response.status(200).json({ pairs: MarketService.supportedPairs() })
  );

  app.get(
    "/api/market/feed",
    asyncRoute(async (request, response) => {
      const suppliedPairs = typeof request.query.pairs === "string" ? request.query.pairs.split(",") : MarketService.supportedPairs();
      try {
        const tickers = await Promise.all(suppliedPairs.map((symbol) => market.getTicker(symbol.trim().toUpperCase())));
        response.status(200).json({ tickers, stale: tickers.some(({ symbol }) => market.isStale(symbol)) });
      } catch (error) {
        response.status(400).json({ error: { code: "INVALID_MARKET_REQUEST", message: error instanceof Error ? error.message : "Invalid market request" } });
      }
    })
  );

  app.get(
    "/api/market/:pair/candles",
    asyncRoute(async (request, response) => {
      const symbol = pairParam(request.params.pair);
      const query = candlesQuery.safeParse(request.query);
      if (!symbol || !query.success) {
        response.status(400).json({ error: { code: "INVALID_MARKET_REQUEST" } });
        return;
      }
      try {
        const candles = await market.getCandles(symbol, query.data.interval as CandleInterval, query.data.limit);
        response.status(200).json({ candles });
      } catch (error) {
        response.status(400).json({ error: { code: "INVALID_MARKET_REQUEST", message: error instanceof Error ? error.message : "Invalid market request" } });
      }
    })
  );

  const orderBook = asyncRoute(async (request, response) => {
      const symbol = pairParam(request.params.pair);
      if (!symbol) {
        response.status(400).json({ error: { code: "INVALID_MARKET_REQUEST" } });
        return;
      }
      try {
        const ticker = await market.getTicker(symbol);
        const settings = await getOrderBookSettings?.() ?? { spread: "0.0005", levels: 30, volatility: "0" };
        response.status(200).json(generateOrderBook({ pair: symbol, marketPrice: ticker.price, spread: settings.spread, levels: settings.levels, volatility: settings.volatility }));
      } catch (error) {
        response.status(400).json({ error: { code: "INVALID_MARKET_REQUEST", message: error instanceof Error ? error.message : "Invalid market request" } });
      }
    });

  app.get(
    "/api/market/:pair/order-book",
    orderBook
  );
  app.get(
    "/api/orderbook/:pair",
    orderBook
  );
};
