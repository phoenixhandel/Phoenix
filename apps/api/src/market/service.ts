import { deriveCrossPrice, isMarketDataStale } from "./engine.js";
import { Decimal } from "decimal.js";
import type { Candle, CandleInterval, MarketDataProvider, MarketTicker } from "./providers.js";

const canonicalPairs = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BTCETH", "BTCSOL", "BTCXRP", "ETHSOL", "ETHXRP", "SOLXRP"] as const;
type CanonicalPair = (typeof canonicalPairs)[number];

const crossPairAssets: Record<Exclude<CanonicalPair, `${string}USDT`>, [string, string]> = {
  BTCETH: ["BTC", "ETH"],
  BTCSOL: ["BTC", "SOL"],
  BTCXRP: ["BTC", "XRP"],
  ETHSOL: ["ETH", "SOL"],
  ETHXRP: ["ETH", "XRP"],
  SOLXRP: ["SOL", "XRP"]
};

const pair = (symbol: string): CanonicalPair => {
  if (!canonicalPairs.includes(symbol as CanonicalPair)) {
    throw new Error(`Unsupported market pair ${symbol}`);
  }

  return symbol as CanonicalPair;
};

export class MarketService {
  private readonly cache = new Map<string, MarketTicker>();
  private readonly staleAfterMs: number;

  constructor(
    private readonly provider: MarketDataProvider,
    { staleAfterMs = 30_000 }: { staleAfterMs?: number } = {}
  ) {
    this.staleAfterMs = staleAfterMs;
  }

  async getTicker(symbol: string): Promise<MarketTicker> {
    const normalizedPair = pair(symbol);
    const references = crossPairAssets[normalizedPair as keyof typeof crossPairAssets];
    if (!references) {
      const ticker = await this.provider.getTicker(normalizedPair);
      this.cache.set(normalizedPair, ticker);
      return ticker;
    }

    const [baseAsset, quoteAsset] = references;
    const [baseTicker, quoteTicker] = await Promise.all([
      this.getTicker(`${baseAsset}USDT`),
      this.getTicker(`${quoteAsset}USDT`)
    ]);
    const derived: MarketTicker = {
      symbol: normalizedPair,
      price: deriveCrossPrice({ baseUsdtPrice: baseTicker.price, quoteUsdtPrice: quoteTicker.price }),
      updatedAt: baseTicker.updatedAt > quoteTicker.updatedAt ? baseTicker.updatedAt : quoteTicker.updatedAt,
      source: baseTicker.source === "MANUAL" && quoteTicker.source === "MANUAL" ? "MANUAL" : "BINANCE"
    };
    this.cache.set(normalizedPair, derived);
    return derived;
  }

  async connect() { await this.provider.connect(); }
  async disconnect() { await this.provider.disconnect(); }

  async getCandles(symbol: string, interval: CandleInterval, limit: number): Promise<Candle[]> {
    const normalizedPair = pair(symbol);
    const references = crossPairAssets[normalizedPair as keyof typeof crossPairAssets];
    if (!references) return this.provider.getCandles(normalizedPair, interval, limit);
    const [baseAsset, quoteAsset] = references;
    const [base, quote] = await Promise.all([this.provider.getCandles(`${baseAsset}USDT`, interval, limit), this.provider.getCandles(`${quoteAsset}USDT`, interval, limit)]);
    const quoteByOpenTime = new Map(quote.map((candle) => [candle.openTime.getTime(), candle]));
    return base.flatMap((baseCandle) => {
      const quoteCandle = quoteByOpenTime.get(baseCandle.openTime.getTime());
      if (!quoteCandle) return [];
      const divide = (left: string, right: string) => new Decimal(left).dividedBy(right).toFixed(12);
      return [{
        openTime: baseCandle.openTime, closeTime: baseCandle.closeTime,
        open: divide(baseCandle.open, quoteCandle.open), high: divide(baseCandle.high, quoteCandle.low),
        low: divide(baseCandle.low, quoteCandle.high), close: divide(baseCandle.close, quoteCandle.close),
        volume: baseCandle.volume, synthetic: true
      }];
    });
  }

  isStale(symbol: string, now = new Date()) {
    const ticker = this.cache.get(pair(symbol));
    return !ticker || isMarketDataStale({ updatedAt: ticker.updatedAt, now, maximumAgeMs: this.staleAfterMs });
  }

  clearCache() {
    this.cache.clear();
  }

  static supportedPairs() {
    return [...canonicalPairs];
  }
}
