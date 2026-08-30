import { Decimal } from "decimal.js";
import type { LedgerPool } from "../ledger/credit-service.js";

export type CandleInterval = "1m" | "5m" | "15m" | "1h" | "4h" | "1d";

export type MarketTicker = {
  symbol: string;
  price: string;
  updatedAt: Date;
  source: "BINANCE" | "MANUAL";
};

export type Candle = {
  openTime: Date;
  closeTime: Date;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  synthetic?: boolean;
};

export interface MarketDataProvider {
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  getTicker: (symbol: string) => Promise<MarketTicker>;
  getCandles: (symbol: string, interval: CandleInterval, limit: number) => Promise<Candle[]>;
}

type Fetcher = (input: string) => Promise<Response>;

const publicSymbol = (symbol: string) => {
  if (!/^[A-Z0-9]{4,24}$/.test(symbol)) {
    throw new Error("Invalid market symbol");
  }

  return symbol;
};

const price = (value: unknown) => {
  if (typeof value !== "string" || !/^(?:0|[1-9]\d*)(?:\.\d+)?$/.test(value)) {
    throw new Error("Market provider returned an invalid price");
  }
  const parsed = new Decimal(value);
  if (!parsed.greaterThan(0)) {
    throw new Error("Market provider returned a non-positive price");
  }

  return parsed.toFixed(12);
};

const responseJson = async (response: Response) => {
  if (!response.ok) {
    throw new Error(`Market provider request failed with ${response.status}`);
  }

  return response.json() as Promise<unknown>;
};

export class BinanceMarketProvider implements MarketDataProvider {
  private readonly fetcher: Fetcher;
  private readonly streamTickers = new Map<string, MarketTicker>();
  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempt = 0;
  private lastStreamEventAt = 0;
  private stopped = false;

  constructor({ fetcher = (input: string) => fetch(input) }: { fetcher?: Fetcher } = {}) {
    this.fetcher = fetcher;
  }

  async connect() {
    if (this.socket || this.reconnectTimer) return;
    this.stopped = false;
    this.openStream();
  }

  async disconnect() {
    this.stopped = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.reconnectTimer = null;
    this.heartbeatTimer = null;
    this.socket?.close();
    this.socket = null;
  }

  private openStream() {
    const symbols = ["btcusdt", "ethusdt", "solusdt", "xrpusdt"];
    const socket = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${symbols.map((symbol) => `${symbol}@ticker`).join("/")}`);
    this.socket = socket;
    socket.addEventListener("open", () => {
      this.lastStreamEventAt = Date.now();
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = setInterval(() => { if (Date.now() - this.lastStreamEventAt > 45_000) socket.close(); }, 15_000);
    });
    socket.addEventListener("message", (message) => {
      try {
        const parsed = JSON.parse(String(message.data)) as { data?: { s?: unknown; c?: unknown } };
        if (typeof parsed.data?.s !== "string") return;
        this.lastStreamEventAt = Date.now();
        this.reconnectAttempt = 0;
        this.streamTickers.set(parsed.data.s, { symbol: parsed.data.s, price: price(parsed.data.c), updatedAt: new Date(), source: "BINANCE" });
      } catch { /* ignore malformed public stream data; REST remains available */ }
    });
    socket.addEventListener("close", () => {
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
      if (this.socket === socket) this.socket = null;
      if (!this.stopped && !this.reconnectTimer) {
        const delay = Math.min(30_000, 1_000 * 2 ** this.reconnectAttempt++);
        this.reconnectTimer = setTimeout(() => { this.reconnectTimer = null; this.openStream(); }, delay);
      }
    });
    socket.addEventListener("error", () => socket.close());
  }

  async getTicker(symbol: string): Promise<MarketTicker> {
    const normalizedSymbol = publicSymbol(symbol);
    const streamed = this.streamTickers.get(normalizedSymbol);
    if (streamed && Date.now() - streamed.updatedAt.getTime() < 30_000) return streamed;
    const data = await responseJson(
      await this.fetcher(`https://api.binance.com/api/v3/ticker/price?symbol=${encodeURIComponent(normalizedSymbol)}`)
    );
    if (!data || typeof data !== "object") {
      throw new Error("Market provider returned an invalid ticker");
    }
    const ticker = data as { symbol?: unknown; price?: unknown };
    if (ticker.symbol !== normalizedSymbol) {
      throw new Error("Market provider returned a mismatched ticker symbol");
    }

    return { symbol: normalizedSymbol, price: price(ticker.price), updatedAt: new Date(), source: "BINANCE" };
  }

  async getCandles(symbol: string, interval: CandleInterval, limit: number): Promise<Candle[]> {
    const normalizedSymbol = publicSymbol(symbol);
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
      throw new Error("Candle limit must be an integer between 1 and 1000");
    }
    const data = await responseJson(
      await this.fetcher(
        `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(normalizedSymbol)}&interval=${interval}&limit=${limit}`
      )
    );
    if (!Array.isArray(data)) {
      throw new Error("Market provider returned invalid candles");
    }

    return data.map((row) => {
      if (!Array.isArray(row)) {
        throw new Error("Market provider returned an invalid candle");
      }
      const [openTime, open, high, low, close, volume, closeTime] = row;
      if (typeof openTime !== "number" || typeof closeTime !== "number") {
        throw new Error("Market provider returned invalid candle times");
      }

      return {
        openTime: new Date(openTime),
        closeTime: new Date(closeTime),
        open: price(open),
        high: price(high),
        low: price(low),
        close: price(close),
        volume: price(volume)
      };
    });
  }
}

export class ManualMarketProvider implements MarketDataProvider {
  private readonly prices = new Map<string, string>();

  constructor(initialPrices: Record<string, string> = {}) {
    for (const [symbol, value] of Object.entries(initialPrices)) {
      this.setTicker(symbol, value);
    }
  }

  async connect() {}

  async disconnect() {}

  setTicker(symbol: string, value: string) {
    this.prices.set(publicSymbol(symbol), price(value));
  }

  async getTicker(symbol: string): Promise<MarketTicker> {
    const normalizedSymbol = publicSymbol(symbol);
    const value = this.prices.get(normalizedSymbol);
    if (!value) {
      throw new Error(`No manual price is configured for ${normalizedSymbol}`);
    }

    return { symbol: normalizedSymbol, price: value, updatedAt: new Date(), source: "MANUAL" };
  }

  async getCandles(): Promise<Candle[]> {
    return [];
  }
}

/** Selects the public feed or administrator-controlled prices from the database. */
export class DatabaseMarketProvider implements MarketDataProvider {
  constructor(private readonly pool: LedgerPool, private readonly publicProvider: MarketDataProvider = new BinanceMarketProvider()) {}

  async connect() { await this.publicProvider.connect(); }
  async disconnect() { await this.publicProvider.disconnect(); }

  async getTicker(symbol: string): Promise<MarketTicker> {
    const normalizedSymbol = publicSymbol(symbol);
    try {
      const client = await this.pool.connect();
      try {
        const configuration = await client.query<{ mode: "REAL" | "MANUAL" }>("SELECT mode FROM market_configuration WHERE singleton = true");
        if (configuration.rows[0]?.mode !== "MANUAL") return this.publicProvider.getTicker(normalizedSymbol);
        if (!normalizedSymbol.endsWith("USDT")) throw new Error(`No manual price is configured for ${normalizedSymbol}`);
        const asset = normalizedSymbol.slice(0, -4);
        const result = await client.query<{ reference_price: string }>("SELECT reference_price::text AS reference_price FROM manual_market_prices WHERE asset_symbol = $1", [asset]);
        const value = result.rows[0]?.reference_price;
        if (!value) throw new Error(`No manual price is configured for ${normalizedSymbol}`);
        return { symbol: normalizedSymbol, price: price(value), updatedAt: new Date(), source: "MANUAL" };
      } finally { client.release(); }
    } catch {
      return this.publicProvider.getTicker(normalizedSymbol);
    }
  }

  async getCandles(symbol: string, interval: CandleInterval, limit: number): Promise<Candle[]> {
    return this.publicProvider.getCandles(symbol, interval, limit);
  }
}
