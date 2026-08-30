import { useEffect, useMemo, useState } from "react";
import { PublicPage } from "./PublicPage";
import {
  getCoinHistory,
  getTopCoins,
  type HistoryRange,
  type PricePoint,
  type TopCoin
} from "./market-data";
import { useLanguage } from "./i18n";

const supportedPairs: Record<string, string> = {
  BTC: "BTCUSDT",
  ETH: "ETHUSDT",
  SOL: "SOLUSDT",
  XRP: "XRPUSDT"
};
const ranges: Array<{ label: string; value: HistoryRange }> = [
  { label: "24H", value: "1" },
  { label: "7T", value: "7" },
  { label: "30T", value: "30" },
  { label: "90T", value: "90" },
  { label: "1J", value: "365" },
  { label: "Max", value: "max" }
];
const usd = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2
});
const compactUsd = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2
});

const PriceHistory = ({
  points,
  label
}: {
  points: PricePoint[];
  label: string;
}) => {
  const plot = useMemo(() => {
    if (points.length < 2) return "";
    const values = points.map((point) => point.price);
    const lowest = Math.min(...values);
    const highest = Math.max(...values);
    const span = Math.max(highest - lowest, highest * 0.005);
    return points
      .map(
        (point, index) =>
          `${((index / (points.length - 1)) * 100).toFixed(2)},${(92 - ((point.price - lowest) / span) * 78).toFixed(2)}`
      )
      .join(" ");
  }, [points]);
  return (
    <div className="relative h-[320px] overflow-hidden border border-[#1e2a40] bg-[#091321] sm:h-[420px]">
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-1/4 border-t border-dashed border-[#1e2a40]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-1/2 border-t border-dashed border-[#1e2a40]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 top-3/4 border-t border-dashed border-[#1e2a40]"
      />
      {plot ? (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="relative h-full w-full"
          role="img"
          aria-label={label}
        >
          <polyline
            fill="none"
            stroke="#67e8f9"
            strokeWidth="0.7"
            vectorEffect="non-scaling-stroke"
            points={plot}
          />
        </svg>
      ) : (
        <div className="grid h-full place-items-center text-sm text-slate-400">
          Kursverlauf wird geladen…
        </div>
      )}
    </div>
  );
};

const MarketTable = ({ coins }: { coins: TopCoin[] }) => (
  <div className="overflow-x-auto border border-[#1e2a40] bg-[#0d1727]">
    <table className="w-full min-w-[760px] text-left">
      <thead className="border-b border-[#1e2a40] text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        <tr>
          <th className="px-5 py-4">#</th>
          <th>Asset</th>
          <th className="text-right">Preis</th>
          <th className="text-right">24H</th>
          <th className="text-right">Marktkapitalisierung</th>
          <th className="px-5 text-right">24H Volumen</th>
        </tr>
      </thead>
      <tbody>
        {coins.map((coin) => (
          <tr
            key={coin.id}
            className="border-b border-[#1e2a40] last:border-b-0"
          >
            <td className="px-5 py-4 font-mono text-sm text-slate-500">
              {coin.rank}
            </td>
            <td>
              <a
                href={`/markets/${coin.id}`}
                className="group flex items-center gap-3 py-3"
              >
                <img
                  src={coin.image}
                  alt=""
                  width="36"
                  height="36"
                  loading="lazy"
                  className="h-9 w-9 rounded-full bg-[#15345b]"
                />
                <span>
                  <span className="block text-sm font-semibold text-white group-hover:text-cyan-100">
                    {coin.name}
                  </span>
                  <span className="mt-0.5 block font-mono text-xs text-slate-500">
                    {coin.symbol}
                  </span>
                </span>
              </a>
            </td>
            <td className="text-right font-mono text-sm tabular-nums text-slate-200">
              {usd.format(coin.price)}
            </td>
            <td
              className={`text-right font-mono text-sm tabular-nums ${coin.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}
            >
              {coin.change24h >= 0 ? "+" : ""}
              {coin.change24h.toFixed(2)}%
            </td>
            <td className="text-right font-mono text-sm tabular-nums text-slate-300">
              {compactUsd.format(coin.marketCap)}
            </td>
            <td className="px-5 text-right font-mono text-sm tabular-nums text-slate-400">
              {compactUsd.format(coin.volume24h)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

export const MarketsPage = ({
  coinId
}: { coinId?: string | undefined } = {}) => {
  const { language } = useLanguage();
  const de = language === "de";
  const [coins, setCoins] = useState<TopCoin[]>([]);
  const [history, setHistory] = useState<PricePoint[]>([]);
  const [range, setRange] = useState<HistoryRange>("1");
  const [error, setError] = useState<string | null>(null);
  const selected = coins.find((coin) => coin.id === coinId);
  useEffect(() => {
    let active = true;
    const refresh = async () => {
      try {
        const next = await getTopCoins();
        if (active) {
          setCoins(next);
          setError(null);
        }
      } catch {
        if (active)
          setError(
            de
              ? "Marktdaten sind gerade nicht verfügbar."
              : "Market data is temporarily unavailable."
          );
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 30_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [de]);
  useEffect(() => {
    if (!selected) return;
    let active = true;
    setHistory([]);
    void getCoinHistory(selected.id, range)
      .then((points) => {
        if (active) setHistory(points);
      })
      .catch(() => {
        if (active)
          setError(
            de
              ? "Kursverlauf ist gerade nicht verfügbar."
              : "Price history is temporarily unavailable."
          );
      });
    return () => {
      active = false;
    };
  }, [de, range, selected]);

  if (coinId) {
    const pair = selected ? supportedPairs[selected.symbol] : undefined;
    return (
      <PublicPage
        active="markets"
        eyebrow={de ? "KRYPTO-MÄRKTE" : "CRYPTO MARKETS"}
        title={selected ? `${selected.name} Kursverlauf` : "Asset wird geladen"}
        description={
          selected
            ? `${selected.symbol} im Fokus: Live-Preis, Marktdaten und ein frei wählbarer Kursverlauf.`
            : "Die Assetdaten werden geladen."
        }
      >
        <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
          <a
            href="/markets"
            className="text-sm font-semibold text-cyan-200 hover:text-cyan-100"
          >
            ← {de ? "Alle Märkte" : "All markets"}
          </a>
          {selected ? (
            <>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-5 border-b border-[#1e2a40] pb-7">
                <div className="flex items-center gap-4">
                  <img
                    src={selected.image}
                    alt=""
                    width="56"
                    height="56"
                    className="h-14 w-14 rounded-full bg-[#15345b]"
                  />
                  <div>
                    <h2 className="text-2xl font-semibold text-white">
                      {selected.name}{" "}
                      <span className="font-mono text-base text-slate-500">
                        {selected.symbol}
                      </span>
                    </h2>
                    <p className="mt-1 font-mono text-xl tabular-nums text-white">
                      {usd.format(selected.price)}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pair ? (
                    <>
                      <a
                        href={`/trade/${pair}`}
                        className="inline-flex min-h-11 items-center bg-emerald-300 px-4 text-sm font-bold text-[#06131a] hover:bg-emerald-200"
                      >
                        {de ? "Kaufen" : "Buy"}
                      </a>
                      <a
                        href={`/trade/${pair}`}
                        className="inline-flex min-h-11 items-center border border-rose-300/60 px-4 text-sm font-bold text-rose-200 hover:border-rose-200 hover:text-white"
                      >
                        {de ? "Verkaufen" : "Sell"}
                      </a>
                    </>
                  ) : null}
                  <a
                    href="/account"
                    className="inline-flex min-h-11 items-center border border-[#2a3a54] px-4 text-sm font-semibold text-slate-200 hover:border-cyan-300 hover:text-white"
                  >
                    {de ? "Umwandeln" : "Convert"}
                  </a>
                  <a
                    href="/account"
                    className="inline-flex min-h-11 items-center border border-[#2a3a54] px-4 text-sm font-semibold text-slate-200 hover:border-cyan-300 hover:text-white"
                  >
                    {de ? "Übertragen" : "Transfer"}
                  </a>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-5 gap-y-5 border-b border-[#1e2a40] py-7 sm:grid-cols-4">
                <div>
                  <dt className="text-xs text-slate-500">24H</dt>
                  <dd
                    className={`mt-1 font-mono text-sm ${selected.change24h >= 0 ? "text-emerald-300" : "text-rose-300"}`}
                  >
                    {selected.change24h >= 0 ? "+" : ""}
                    {selected.change24h.toFixed(2)}%
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">
                    {de ? "Marktkapitalisierung" : "Market cap"}
                  </dt>
                  <dd className="mt-1 font-mono text-sm text-slate-200">
                    {compactUsd.format(selected.marketCap)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">
                    {de ? "24H Volumen" : "24H volume"}
                  </dt>
                  <dd className="mt-1 font-mono text-sm text-slate-200">
                    {compactUsd.format(selected.volume24h)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">
                    {de ? "Quelle" : "Source"}
                  </dt>
                  <dd className="mt-1 text-sm text-slate-200">CoinGecko</dd>
                </div>
              </dl>
              <div className="mt-7 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold text-white">
                  {de ? "Kursverlauf" : "Price history"}
                </h2>
                <div
                  className="flex flex-wrap gap-1"
                  aria-label={de ? "Zeitraum" : "Time range"}
                >
                  {ranges.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      onClick={() => setRange(item.value)}
                      className={
                        range === item.value
                          ? "min-h-10 bg-cyan-300 px-3 text-xs font-semibold text-[#07101e] transition"
                          : "min-h-10 px-3 text-xs font-semibold text-slate-400 transition hover:bg-[#101d30] hover:text-white"
                      }
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4">
                <PriceHistory
                  points={history}
                  label={`${selected.name} price history`}
                />
              </div>
            </>
          ) : (
            <div className="mt-8 border border-[#1e2a40] bg-[#0d1727] p-6 text-sm text-slate-400">
              {de ? "Assetdaten werden geladen…" : "Loading asset data…"}
            </div>
          )}
          {error ? (
            <p role="status" className="mt-5 text-sm text-amber-100">
              {error}
            </p>
          ) : null}
        </section>
      </PublicPage>
    );
  }
  return (
    <PublicPage
      active="markets"
      eyebrow={de ? "KRYPTO-MÄRKTE" : "CRYPTO MARKETS"}
      title={
        de
          ? "Krypto im Blick – mit Daten, die sich bewegen."
          : "Crypto in view, with data that moves."
      }
      description={
        de
          ? "Die zehn größten Assets nach Marktkapitalisierung, mit aktuellen Preisen, 24-Stunden-Bewegung und direktem Zugang zum Kursverlauf."
          : "The ten largest assets by market capitalization with current prices, 24-hour movement, and direct access to price history."
      }
    >
      <section className="phoenix-reveal mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">
              {de
                ? "Top 10 nach Marktkapitalisierung"
                : "Top 10 by market capitalization"}
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {de
                ? "Aktualisierung im 30-Sekunden-Takt · Preise in USD"
                : "Refreshes every 30 seconds · prices in USD"}
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-300 motion-safe:animate-pulse" />
            {de ? "Live-Daten" : "Live data"}
          </span>
        </div>
        {coins.length ? (
          <MarketTable coins={coins} />
        ) : (
          <div className="border border-[#1e2a40] bg-[#0d1727] p-8 text-sm text-slate-400">
            {de ? "Marktdaten werden geladen…" : "Loading market data…"}
          </div>
        )}
        {error ? (
          <p role="status" className="mt-5 text-sm text-amber-100">
            {error}
          </p>
        ) : null}
      </section>
    </PublicPage>
  );
};
