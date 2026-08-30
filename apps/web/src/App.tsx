import { useEffect, useMemo, useState } from "react";
import { MarketChart } from "./MarketChart.js";
import { useExchangeStore } from "./exchange-store";
import { AuthPage } from "./AuthPage";
import { AuthCallbackPage } from "./AuthCallbackPage";
import { AccountPage } from "./AccountPage";
import { AdminPage } from "./AdminPage";
import { getAuthClient, provisionApplicationUser } from "./auth-client";
import { PhoneVerificationPage } from "./PhoneVerificationPage";
import { AdminMarketPage } from "./AdminMarketPage";
import { AdminUserPage } from "./AdminUserPage";
import { AdminAuditPage } from "./AdminAuditPage";
import { LandingPage } from "./LandingPage";
import { SupportChatWidget } from "./SupportChatWidget";
import { VerificationPage } from "./VerificationPage";
import { InformationPage } from "./InformationPage";
import { MarketsPage } from "./MarketsPage";
import { LanguageProvider } from "./i18n";
import { AuthSessionProvider, PublicOnlyRoute, RequireVerifiedSession } from "./auth-session";
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams
} from "react-router-dom";

const asks = [
  ["64,318.20", "0.0842", "5,417.59"],
  ["64,309.60", "0.1921", "12,354.47"],
  ["64,301.10", "0.3260", "20,962.16"],
  ["64,293.80", "0.0915", "5,883.88"]
];
const bids = [
  ["64,280.10", "0.2470", "15,876.18"],
  ["64,272.40", "0.4382", "28,165.23"],
  ["64,266.10", "0.1186", "7,622.03"],
  ["64,258.50", "0.3013", "19,364.07"]
];
const pairAssets: Record<string, [string, string]> = {
  BTCUSDT: ["BTC", "USDT"],
  ETHUSDT: ["ETH", "USDT"],
  SOLUSDT: ["SOL", "USDT"],
  XRPUSDT: ["XRP", "USDT"],
  BTCETH: ["BTC", "ETH"],
  BTCSOL: ["BTC", "SOL"],
  BTCXRP: ["BTC", "XRP"],
  ETHSOL: ["ETH", "SOL"],
  ETHXRP: ["ETH", "XRP"],
  SOLXRP: ["SOL", "XRP"]
};

const Icon = ({ children }: { children: React.ReactNode }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    className="h-4 w-4"
  >
    {children}
  </svg>
);

const DepthRow = ({
  row,
  side,
  index
}: {
  row: string[];
  side: "ask" | "bid";
  index: number;
}) => (
  <div className="relative grid grid-cols-3 px-3 py-1.5 font-mono text-[11px] tabular-nums">
    <span
      aria-hidden="true"
      className={`absolute inset-y-0 right-0 ${side === "ask" ? "bg-rose-400/10" : "bg-emerald-400/10"}`}
      style={{ width: `${32 + index * 12}%` }}
    />
    <span
      className={`relative ${side === "ask" ? "text-rose-300" : "text-emerald-300"}`}
    >
      {row[0]}
    </span>
    <span className="relative text-right text-slate-300">{row[1]}</span>
    <span className="relative text-right text-slate-500">{row[2]}</span>
  </div>
);

export const ExchangePage = () => {
  const { pair: routePair } = useParams();
  const navigate = useNavigate();
  const [side, setSide] = useState<"BUY" | "SELL">("BUY");
  const [orderType, setOrderType] = useState<"MARKET" | "LIMIT" | "STOP">(
    "MARKET"
  );
  const [amount, setAmount] = useState("0.10");
  const [limitPrice, setLimitPrice] = useState("");
  const [interval, setInterval] = useState("1h");
  const [orderMessage, setOrderMessage] = useState<string | null>(null);
  const {
    pair,
    pairs,
    ticker,
    orderBook,
    candles,
    portfolio,
    userTrades,
    marketStale,
    marketError,
    refreshMarket,
    refreshPairs,
    refreshPortfolio,
    refreshUserTrades,
    setPair
  } = useExchangeStore();
  const [baseAsset, quoteAsset] = pairAssets[pair] ?? ["BTC", "USDT"];
  const availableAsset = side === "BUY" ? quoteAsset : baseAsset;
  const availableBalance = Number(portfolio?.[availableAsset] ?? "0");
  const visiblePortfolio = portfolio ?? {
    USDT: "0",
    BTC: "0",
    ETH: "0",
    SOL: "0",
    XRP: "0"
  };
  const marketPrice = Number(ticker?.price ?? "64280.10");
  const priceLabel = marketPrice.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  const estimate = useMemo(
    () =>
      (Number(amount || 0) * marketPrice).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
    [amount, marketPrice]
  );
  const liveAsks =
    orderBook?.asks.slice(0, 4).map((level) => [
      Number(level.price).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      Number(level.amount).toFixed(4),
      Number(level.total).toLocaleString("en-US", {
        maximumFractionDigits: 2
      })
    ]) ?? asks;
  const liveBids =
    orderBook?.bids.slice(0, 4).map((level) => [
      Number(level.price).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }),
      Number(level.amount).toFixed(4),
      Number(level.total).toLocaleString("en-US", {
        maximumFractionDigits: 2
      })
    ]) ?? bids;

  useEffect(() => {
    if (routePair && pairAssets[routePair.toUpperCase()]) setPair(routePair);
  }, [routePair, setPair]);

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;
    let retryDelay = 1_000;
    const poll = async () => {
      if (cancelled) return;
      if (document.visibilityState === "hidden") {
        timer = window.setTimeout(poll, 30_000);
        return;
      }
      const successful = await refreshMarket(interval);
      retryDelay = successful ? 1_000 : Math.min(retryDelay * 2, 30_000);
      timer = window.setTimeout(poll, retryDelay);
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        retryDelay = 1_000;
        window.clearTimeout(timer);
        void poll();
      }
    };
    void poll();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [interval, pair, refreshMarket]);

  useEffect(() => {
    void refreshPortfolio();
  }, [refreshPortfolio]);

  useEffect(() => {
    void refreshUserTrades();
  }, [refreshUserTrades]);

  useEffect(() => {
    void refreshPairs();
  }, [refreshPairs]);

  useEffect(() => {
    void provisionApplicationUser();
  }, []);

  const submitOrder = async () => {
    if (orderType !== "MARKET") {
      setOrderMessage(
        `${orderType === "LIMIT" ? "Limit" : "Stop"} orders are not enabled in this environment yet.`
      );
      return;
    }
    const token = window.localStorage.getItem("phoenix_access_token");
    if (!token) {
      setOrderMessage("Sign in to place an order.");
      return;
    }
    setOrderMessage("Submitting order…");
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL ?? ""}/api/trades/market`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            authorization: `Bearer ${token}`,
            "idempotency-key": crypto.randomUUID()
          },
          body: JSON.stringify({ pair, side, baseAmount: amount })
        }
      );
      if (!response.ok) throw new Error("Order was rejected");
      await Promise.all([refreshPortfolio(), refreshUserTrades()]);
      setOrderMessage("Order processed. Portfolio updated.");
    } catch (error) {
      setOrderMessage(
        error instanceof Error ? error.message : "Order could not be submitted"
      );
    }
  };
  const signOut = async () => {
    const auth = getAuthClient();
    if (!auth) {
      setOrderMessage("Authentication is not configured in this environment.");
      return;
    }
    const { error } = await auth.auth.signOut();
    if (error) {
      setOrderMessage(error.message);
      return;
    }
    window.localStorage.removeItem("phoenix_access_token");
    await refreshPortfolio();
    setOrderMessage("Signed out.");
  };

  return (
    <main className="min-h-screen bg-[#07101e] text-[#f1f5f9] selection:bg-cyan-300/30">
      <header className="sticky top-0 z-10 border-b border-[#1e2a40] bg-[#091321]/95 px-4 backdrop-blur sm:px-6">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-5">
          <a
            href="/"
            className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.18em] text-white"
            aria-label="Phoenix home"
          >
            <span className="grid h-7 w-7 place-items-center bg-cyan-300 text-[13px] font-black tracking-normal text-[#07101e]">
              P
            </span>
            PHOENIX
          </a>
          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-5 text-sm text-slate-400 md:flex"
          >
            <a href="/account">Account</a>
            <a href="/portfolio">Portfolio</a>
            <a href="/markets">Markets</a>
            <a href="/history">History</a>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => void signOut()}
              className="flex items-center gap-2 border border-[#2a3a54] px-3 py-1.5 text-sm text-slate-200 transition hover:border-cyan-300/60 hover:text-white"
            >
              Sign out{" "}
              <Icon>
                <path d="m7 10 5 5 5-5" />
              </Icon>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1600px] px-4 py-4 sm:px-6">
        <div className="mb-4 flex items-center justify-between border border-[#1e2a40] bg-[#0d1727] px-4 py-3 sm:hidden">
          <span className="text-[10px] font-bold tracking-[0.14em] text-cyan-200">
            MARKET WORKSPACE
          </span>
          <span className="text-xs text-slate-500">
            Account access required
          </span>
        </div>
        <section className="grid gap-4 xl:grid-cols-12">
          <div className="space-y-4 xl:col-span-8">
            <section className="border border-[#1e2a40] bg-[#0d1727]">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-4 py-4">
                <div className="min-w-[182px]">
                  <div className="mb-1 flex items-center gap-2 text-xs text-[#94a3b8]">
                    <span className="h-2 w-2 rounded-full bg-cyan-300" /> Market
                    reference
                  </div>
                  <h1 className="text-xl font-semibold tracking-tight text-white">
                    {baseAsset}/{quoteAsset}
                  </h1>
                  <label className="sr-only" htmlFor="market-pair">
                    Market pair
                  </label>
                  <select
                    id="market-pair"
                    value={pair}
                    onChange={(event) => {
                      const next = event.target.value;
                      setPair(next);
                      navigate(`/trade/${next}`);
                    }}
                    className="mt-1 bg-transparent text-xs text-cyan-200 outline-none"
                  >
                    <>
                      {pairs.map((symbol) => (
                        <option
                          key={symbol}
                          value={symbol}
                          className="bg-[#0d1727]"
                        >
                          {pairAssets[symbol]?.join("/") ?? symbol}
                        </option>
                      ))}
                    </>
                  </select>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    Last price
                  </p>
                  <p className="mt-1 font-mono text-lg tabular-nums text-emerald-300">
                    {priceLabel}{" "}
                    <span className="text-xs text-slate-500">{quoteAsset}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    24h change
                  </p>
                  <p className="mt-1 font-mono text-sm tabular-nums text-emerald-300">
                    +2.84%
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    24h high
                  </p>
                  <p className="mt-1 font-mono text-sm tabular-nums text-slate-200">
                    64,842.70
                  </p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.12em] text-slate-500">
                    24h volume
                  </p>
                  <p className="mt-1 font-mono text-sm tabular-nums text-slate-200">
                    18.42K BTC
                  </p>
                </div>
              </div>
            </section>

            <section className="border border-[#1e2a40] bg-[#0d1727]">
              <div className="flex items-center justify-between border-b border-[#1e2a40] px-4 py-2.5">
                <div
                  className="flex items-center gap-1"
                  aria-label="Chart interval"
                >
                  {["1m", "5m", "15m", "1h", "4h", "1d"].map((value) => (
                    <button
                      key={value}
                      onClick={() => setInterval(value)}
                      className={`px-2 py-1 text-xs transition ${interval === value ? "bg-[#1d3046] text-cyan-200" : "text-slate-500 hover:text-slate-200"}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#94a3b8]">
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${marketStale || marketError ? "bg-amber-300" : "bg-emerald-300"}`}
                  />{" "}
                  {marketError
                    ? "Feed unavailable"
                    : marketStale
                      ? "Feed delayed"
                      : "Feed live"}
                </div>
              </div>
              <MarketChart candles={candles} />
            </section>

            <div className="grid gap-4 lg:grid-cols-2">
              <section className="border border-[#1e2a40] bg-[#0d1727]">
                <div className="flex items-center justify-between px-4 pb-3 pt-4">
                  <h2 className="text-sm font-semibold text-white">
                    Order book
                  </h2>
                  <span className="text-xs text-slate-500">
                    {orderBook?.spread ?? "—"}% spread
                  </span>
                </div>
                <div className="grid grid-cols-3 border-y border-[#1e2a40] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                  <span>Price ({quoteAsset})</span>
                  <span className="text-right">Amount ({baseAsset})</span>
                  <span className="text-right">Total</span>
                </div>
                <div>
                  {liveAsks.map((row, index) => (
                    <DepthRow key={row[0]} row={row} side="ask" index={index} />
                  ))}
                </div>
                <div className="flex items-center gap-3 border-y border-[#1e2a40] px-3 py-2 font-mono text-sm tabular-nums text-emerald-300">
                  <span>{priceLabel}</span>
                  <span className="text-[10px] text-slate-500">
                    Mid · {orderBook?.spread ?? "—"}%
                  </span>
                </div>
                <div>
                  {liveBids.map((row, index) => (
                    <DepthRow key={row[0]} row={row} side="bid" index={index} />
                  ))}
                </div>
              </section>
              <section className="border border-[#1e2a40] bg-[#0d1727]">
                <div className="flex items-center justify-between px-4 pb-3 pt-4">
                  <h2 className="text-sm font-semibold text-white">
                    Market activity
                  </h2>
                  <span className="text-xs text-slate-500">Live</span>
                </div>
                <div className="grid grid-cols-3 border-y border-[#1e2a40] px-4 py-2 text-[10px] uppercase tracking-[0.12em] text-slate-500">
                  <span>Price</span>
                  <span className="text-right">Amount</span>
                  <span className="text-right">Time</span>
                </div>
                {[
                  ["64,280.10", "0.0214", "12:42:18"],
                  ["64,276.80", "0.1035", "12:42:15"],
                  ["64,289.40", "0.0081", "12:42:10"],
                  ["64,271.20", "0.0629", "12:42:04"],
                  ["64,265.60", "0.1742", "12:41:59"]
                ].map((trade, index) => (
                  <div
                    key={trade[2]}
                    className="grid grid-cols-3 px-4 py-2 font-mono text-[11px] tabular-nums"
                  >
                    <span
                      className={
                        index % 2 ? "text-rose-300" : "text-emerald-300"
                      }
                    >
                      {trade[0]}
                    </span>
                    <span className="text-right text-slate-300">
                      {trade[1]}
                    </span>
                    <span className="text-right text-slate-500">
                      {trade[2]}
                    </span>
                  </div>
                ))}
              </section>
            </div>
          </div>

          <aside className="space-y-4 xl:col-span-4">
            <section className="border border-[#1e2a40] bg-[#0d1727]">
              <div className="grid grid-cols-2 border-b border-[#1e2a40] p-1.5">
                {(["BUY", "SELL"] as const).map((value) => (
                  <button
                    key={value}
                    onClick={() => setSide(value)}
                    className={`py-2 text-sm font-semibold transition ${side === value ? (value === "BUY" ? "bg-emerald-300 text-[#06131a]" : "bg-rose-300 text-[#280b12]") : "text-[#8da0b8] hover:text-[#e5edf8]"}`}
                  >
                    {value === "BUY" ? "Buy" : "Sell"}
                  </button>
                ))}
              </div>
              <form
                className="space-y-4 p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  void submitOrder();
                }}
              >
                <div className="grid grid-cols-3 gap-1 border border-[#1e2a40] p-1">
                  {(["MARKET", "LIMIT", "STOP"] as const).map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setOrderType(value)}
                      className={`min-h-9 text-[11px] font-semibold transition ${orderType === value ? "bg-[#1d3046] text-cyan-100" : "text-slate-500 hover:text-white"}`}
                    >
                      {value[0]}
                      {value.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <h2 className="shrink-0 text-sm font-semibold text-white">
                    {orderType[0]}
                    {orderType.slice(1).toLowerCase()} order
                  </h2>
                  <span className="min-w-0 text-right text-xs text-slate-500">
                    Available{" "}
                    <strong className="font-mono text-slate-300">
                      {availableBalance.toLocaleString("en-US", {
                        maximumFractionDigits: 8
                      })}{" "}
                      {availableAsset}
                    </strong>
                  </span>
                </div>
                {orderType !== "MARKET" ? (
                  <label className="block text-xs text-slate-400">
                    {orderType === "LIMIT" ? "Limit price" : "Stop trigger"}
                    <div className="mt-1 flex border border-[#2a3a54] bg-[#0a1322] focus-within:border-cyan-300">
                      <input
                        aria-label={`${orderType} price`}
                        value={limitPrice}
                        onChange={(event) => setLimitPrice(event.target.value)}
                        inputMode="decimal"
                        className="min-w-0 flex-1 bg-transparent px-3 py-3 font-mono text-sm text-white outline-none"
                      />
                      <span className="flex items-center px-3 font-mono text-xs text-slate-500">
                        {quoteAsset}
                      </span>
                    </div>
                  </label>
                ) : null}
                <label className="block text-xs text-slate-400">
                  Amount{" "}
                  <div className="mt-1 flex border border-[#2a3a54] bg-[#0a1322] focus-within:border-cyan-300">
                    <input
                      aria-label={`${baseAsset} amount`}
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      inputMode="decimal"
                      className="min-w-0 flex-1 bg-transparent px-3 py-3 font-mono text-sm text-white outline-none"
                    />
                    <span className="flex items-center px-3 font-mono text-xs text-slate-500">
                      {baseAsset}
                    </span>
                  </div>
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {[25, 50, 75, 100].map((value) => (
                    <button
                      type="button"
                      key={value}
                      onClick={() =>
                        setAmount(((value / 100) * availableBalance).toFixed(8))
                      }
                      className="border border-[#26364d] py-1.5 text-[11px] text-slate-400 transition hover:border-cyan-300/70 hover:text-cyan-100"
                    >
                      {value}%
                    </button>
                  ))}
                </div>
                <div className="space-y-2 border-y border-[#1e2a40] py-3 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Market price</span>
                    <span className="font-mono text-slate-300">
                      {priceLabel} {quoteAsset}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Estimated execution</span>
                    <span className="font-mono text-slate-300">
                      {priceLabel} {quoteAsset}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Estimated fee</span>
                    <span className="font-mono text-slate-300">0.10%</span>
                  </div>
                  <div className="flex justify-between pt-1 text-slate-300">
                    <span>Estimated total</span>
                    <span className="font-mono text-white">
                      {estimate} {quoteAsset}
                    </span>
                  </div>
                </div>
                <button
                  type="submit"
                  aria-label={`${side === "BUY" ? "Buy" : "Sell"} ${baseAsset}`}
                  className={`w-full py-3 text-sm font-bold transition ${side === "BUY" ? "bg-emerald-300 text-[#06131a] hover:bg-emerald-200" : "bg-rose-300 text-[#280b12] hover:bg-rose-200"}`}
                >
                  {side === "BUY" ? `Buy ${baseAsset}` : `Sell ${baseAsset}`}
                </button>
                <p className="text-center text-[11px] leading-4 text-slate-500">
                  Phoenix does not accept client funds or provide custody,
                  withdrawals, or external execution.
                </p>
                {orderMessage ? (
                  <p
                    role="status"
                    className="text-center text-xs text-cyan-200"
                  >
                    {orderMessage}
                  </p>
                ) : null}
              </form>
            </section>

            <section className="border border-[#1e2a40] bg-[#0d1727] p-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-white">Portfolio</h2>
                <a
                  className="text-xs text-cyan-300 hover:text-cyan-200"
                  href="/portfolio"
                >
                  View all
                </a>
              </div>
              <div className="mt-4 space-y-3">
                {Object.entries(visiblePortfolio)
                  .slice(0, 5)
                  .map(([asset, value], index) => (
                    <div
                      key={asset}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2 text-sm">
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: [
                              "#2dd4a8",
                              "#f59e0b",
                              "#a78bfa",
                              "#60a5fa",
                              "#f472b6"
                            ][index]
                          }}
                        />
                        {asset}
                      </div>
                      <span className="font-mono text-xs tabular-nums text-slate-300">
                        {value}
                      </span>
                    </div>
                  ))}
              </div>
            </section>
            <section className="border border-[#1e2a40] bg-[#0d1727]">
              <div className="flex items-center justify-between px-4 pb-3 pt-4">
                <h2 className="text-sm font-semibold text-white">
                  Your recent trades
                </h2>
                <a href="/history" className="text-xs text-cyan-300">
                  View all
                </a>
              </div>
              {userTrades.length ? (
                userTrades.map((trade) => (
                  <div
                    key={trade.tradeId}
                    className="grid grid-cols-3 border-t border-[#1e2a40] px-4 py-2 font-mono text-[11px]"
                  >
                    <span
                      className={
                        trade.side === "BUY"
                          ? "text-emerald-300"
                          : "text-rose-300"
                      }
                    >
                      {trade.side} {trade.pair}
                    </span>
                    <span className="text-right text-slate-300">
                      {trade.baseAmount}
                    </span>
                    <span className="text-right text-slate-500">
                      {new Date(trade.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="border-t border-[#1e2a40] px-4 py-4 text-xs text-slate-500">
                  Place an order to see your history.
                </p>
              )}
            </section>
          </aside>
        </section>
      </div>
    </main>
  );
};

const MarketsRoute = () => {
  const { coinId } = useParams();
  return <MarketsPage coinId={coinId} />;
};

const guarded = (element: React.ReactNode) => (
  <RequireVerifiedSession>{element}</RequireVerifiedSession>
);

export const App = () => (
  <LanguageProvider>
    <BrowserRouter>
      <AuthSessionProvider>
      <Routes>
        <Route path="/" element={<PublicOnlyRoute><LandingPage /></PublicOnlyRoute>} />
        <Route path="/login" element={<PublicOnlyRoute><AuthPage mode="login" /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><AuthPage mode="register" /></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<PublicOnlyRoute><AuthPage mode="reset" /></PublicOnlyRoute>} />
        <Route path="/reset-password" element={<PublicOnlyRoute><AuthPage mode="reset" /></PublicOnlyRoute>} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route
          path="/verify-email"
          element={guarded(<AccountPage page="settings" />)}
        />
        <Route
          path="/verify-phone"
          element={guarded(<PhoneVerificationPage />)}
        />
        <Route
          path="/account"
          element={guarded(<AccountPage page="portfolio" />)}
        />
        <Route
          path="/account/security"
          element={guarded(<AccountPage page="settings" />)}
        />
        <Route
          path="/account/verification"
          element={guarded(<VerificationPage />)}
        />
        <Route
          path="/portfolio"
          element={guarded(<AccountPage page="portfolio" />)}
        />
        <Route
          path="/history"
          element={guarded(<AccountPage page="history" />)}
        />
        <Route
          path="/activity"
          element={guarded(<AccountPage page="activity" />)}
        />
        <Route
          path="/settings"
          element={guarded(<AccountPage page="settings" />)}
        />
        <Route
          path="/verify-identity"
          element={guarded(<AccountPage page="identity" />)}
        />
        <Route path="/markets" element={guarded(<MarketsRoute />)} />
        <Route path="/markets/:coinId" element={guarded(<MarketsRoute />)} />
        <Route path="/support" element={<Navigate to="/account" replace />} />
        <Route
          path="/how-it-works"
          element={guarded(<InformationPage kind="how" />)}
        />
        <Route
          path="/fees"
          element={guarded(<InformationPage kind="fees" />)}
        />
        <Route
          path="/status"
          element={guarded(<InformationPage kind="status" />)}
        />
        <Route
          path="/security"
          element={guarded(<InformationPage kind="security" />)}
        />
        <Route
          path="/terms"
          element={guarded(<InformationPage kind="terms" />)}
        />
        <Route
          path="/privacy"
          element={guarded(<InformationPage kind="privacy" />)}
        />
        <Route
          path="/kyc-policy"
          element={guarded(<InformationPage kind="kyc" />)}
        />
        <Route
          path="/risk"
          element={guarded(<InformationPage kind="risk" />)}
        />
        <Route
          path="/cookies"
          element={guarded(<InformationPage kind="cookies" />)}
        />
        <Route path="/admin/market" element={guarded(<AdminMarketPage />)} />
        <Route path="/admin/audit" element={guarded(<AdminAuditPage />)} />
        <Route path="/admin/users/:id" element={guarded(<AdminUserPage />)} />
        <Route path="/admin/*" element={guarded(<AdminPage />)} />
        <Route path="/trade/:pair" element={guarded(<ExchangePage />)} />
        <Route path="*" element={guarded(<LandingPage />)} />
      </Routes>
      <SupportChatWidget />
      </AuthSessionProvider>
    </BrowserRouter>
  </LanguageProvider>
);
