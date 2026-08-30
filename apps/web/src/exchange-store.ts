import { create } from "zustand";

export type Ticker = { symbol: string; price: string; updatedAt: string; source: "BINANCE" | "MANUAL" };
export type OrderBookLevel = { price: string; amount: string; total: string };
export type OrderBook = { asks: OrderBookLevel[]; bids: OrderBookLevel[]; midMarketPrice: string; spread: string };
export type Candle = { openTime: string; closeTime: string; open: string; high: string; low: string; close: string; volume?: string; synthetic?: boolean };
export type UserTrade = { tradeId: string; pair: string; side: "BUY" | "SELL"; baseAmount: string; executionPrice: string; createdAt: string };
const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

type ExchangeState = {
  pair: string;
  pairs: string[];
  ticker: Ticker | null;
  orderBook: OrderBook | null;
  candles: Candle[];
  portfolio: Record<string, string> | null;
  userTrades: UserTrade[];
  marketStale: boolean;
  marketError: string | null;
  refreshMarket: (interval?: string) => Promise<boolean>;
  refreshPairs: () => Promise<void>;
  setPair: (pair: string) => void;
  refreshPortfolio: () => Promise<void>;
  refreshUserTrades: () => Promise<void>;
  reset: () => void;
};

const initial = { pair: "BTCUSDT", pairs: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BTCETH", "BTCSOL", "BTCXRP", "ETHSOL", "ETHXRP", "SOLXRP"], ticker: null, orderBook: null, candles: [], portfolio: null, userTrades: [], marketStale: false, marketError: null };
const readJson = async <T>(url: string): Promise<T> => {
  const response = await fetch(`${apiBase}${url}`);
  if (!response.ok) throw new Error(`Market request failed (${response.status})`);
  return response.json() as Promise<T>;
};

export const useExchangeStore = create<ExchangeState>((set, get) => ({
  ...initial,
  setPair: (pair) => set({ pair: pair.toUpperCase(), ticker: null, orderBook: null, candles: [], marketError: null }),
  refreshPairs: async () => {
    try {
      const payload = await readJson<{ pairs: string[] }>("/api/market/pairs");
      if (payload.pairs.length) set({ pairs: payload.pairs });
    } catch { /* retain the supported startup list while the public API is unavailable */ }
  },
  refreshMarket: async (interval = "1h") => {
    try {
      const [feed, orderBook, candles] = await Promise.all([
        readJson<{ tickers: Ticker[]; stale: boolean }>(`/api/market/feed?pairs=${get().pair}`),
        readJson<OrderBook>(`/api/market/${get().pair}/order-book`),
        readJson<{ candles: Candle[] }>(`/api/market/${get().pair}/candles?interval=${encodeURIComponent(interval)}&limit=100`)
      ]);
      set({ ticker: feed.tickers[0] ?? null, orderBook, candles: candles.candles, marketStale: feed.stale, marketError: null });
      return true;
    } catch (error) {
      set({ marketError: error instanceof Error ? error.message : "Market feed unavailable", marketStale: true });
      return false;
    }
  },
  refreshPortfolio: async () => {
    const token = window.localStorage.getItem("phoenix_access_token");
    if (!token) { set({ portfolio: null }); return; }
    try {
      const response = await fetch(`${apiBase}/api/me/portfolio`, { headers: { authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Portfolio request failed");
      const payload = await response.json() as { balances: Record<string, string> };
      set({ portfolio: payload.balances });
    } catch { set({ portfolio: null }); }
  },
  refreshUserTrades: async () => {
    const token = window.localStorage.getItem("phoenix_access_token");
    if (!token) { set({ userTrades: [] }); return; }
    try {
      const response = await fetch(`${apiBase}/api/me/trades?limit=5`, { headers: { authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Trade history request failed");
      const payload = await response.json() as { trades: UserTrade[] };
      set({ userTrades: payload.trades });
    } catch { set({ userTrades: [] }); }
  },
  reset: () => set(initial)
}));
