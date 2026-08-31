import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CompanyLogo } from "./CompanyLogo";
import { useLanguage } from "./i18n";
import { getPortfolioAssetPrices } from "./market-data";
import { WorkspaceShell } from "./WorkspaceShell";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

const assets: Record<string, { name: string; domain: string }> = {
  BTC: { name: "Bitcoin", domain: "bitcoin.org" },
  ETH: { name: "Ethereum", domain: "ethereum.org" },
  SOL: { name: "Solana", domain: "solana.com" },
  XRP: { name: "XRP", domain: "ripple.com" },
  USDT: { name: "Tether", domain: "tether.to" }
};

const copy = {
  de: {
    title: "Auszahlung prüfen",
    description:
      "Wähle ein Asset und prüfe den Betrag gegen den aktuellen Portfolio-Bestand.",
    simulated: "SIMULIERTE KONTOAKTION",
    asset: "Asset auswählen",
    available: "Verfügbarer Bestand",
    equivalent: "Geschätzter Gegenwert",
    amount: "Betrag in",
    max: "Max",
    review: "Auszahlung fortsetzen",
    reset: "Zurücksetzen",
    loading: "Portfolio wird geladen…",
    unavailable:
      "Der Portfolio-Bestand konnte nicht geladen werden. Bitte versuche es erneut.",
    required: "Gib einen Betrag größer als 0 ein.",
    exceeds: "Der Betrag überschreitet den verfügbaren",
    balanceSuffix: "-Bestand",
    success:
      "Der Betrag wurde gegen deinen aktuellen Bestand geprüft. Es wurde keine Transaktion ausgeführt.",
    footer:
      "Diese Ansicht prüft ausschließlich den angezeigten Portfolio-Bestand."
  },
  en: {
    title: "Review withdrawal",
    description:
      "Choose an asset and compare an amount against the current portfolio balance.",
    simulated: "SIMULATED ACCOUNT ACTION",
    asset: "Choose asset",
    available: "Available balance",
    equivalent: "Estimated EUR value",
    amount: "Amount in",
    max: "Max",
    review: "Continue withdrawal review",
    reset: "Reset",
    loading: "Loading portfolio…",
    unavailable: "The portfolio balance could not be loaded. Please try again.",
    required: "Enter an amount greater than 0.",
    exceeds: "The amount exceeds the available",
    balanceSuffix: " balance",
    success:
      "The amount was checked against your current balance. No transaction was executed.",
    footer: "This view only checks the displayed portfolio balance."
  }
} as const;

const formatBalance = (value: string) => Number(value).toFixed(12);
const formatEuro = (value: number, language: "de" | "en") =>
  new Intl.NumberFormat(language === "de" ? "de-DE" : "en-IE", {
    style: "currency",
    currency: "EUR"
  }).format(value);

export const WithdrawalReviewPage = () => {
  const { language } = useLanguage();
  const text = copy[language];
  const [balances, setBalances] = useState<Record<string, string> | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});
  const [selectedAsset, setSelectedAsset] = useState("BTC");
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const token = window.localStorage.getItem("phoenix_access_token");
  const navigate = useNavigate();
  const assetSymbols = Object.keys(balances ?? {});
  const available = Number(balances?.[selectedAsset] ?? 0);
  const amountValue = Number(amount) || 0;
  const euroValue = prices[selectedAsset]
    ? amountValue * prices[selectedAsset]
    : null;

  useEffect(() => {
    if (!token) return;
    let active = true;
    void Promise.all([
      fetch(`${apiBase}/api/me/portfolio`, {
        headers: { authorization: `Bearer ${token}` }
      }).then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ balances: Record<string, string> }>;
      }),
      getPortfolioAssetPrices("EUR").catch(() => ({}))
    ])
      .then(([{ balances: nextBalances }, nextPrices]) => {
        if (!active) return;
        setBalances(nextBalances);
        setPrices(nextPrices);
        if (!nextBalances.BTC)
          setSelectedAsset(Object.keys(nextBalances)[0] ?? "BTC");
      })
      .catch(() => active && setBalances({}));
    return () => {
      active = false;
    };
  }, [token]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setMessage(text.required);
      return;
    }
    if (parsedAmount > available) {
      setMessage(`${text.exceeds} ${selectedAsset}${text.balanceSuffix}.`);
      return;
    }
    navigate(
      `/withdraw/confirm?asset=${encodeURIComponent(selectedAsset)}&amount=${encodeURIComponent(parsedAmount)}`
    );
  };

  return (
    <WorkspaceShell
      active="account"
      title={text.title}
      description={text.description}
      meta={
        <span className="border border-amber-300/40 bg-amber-300/5 px-2 py-1 font-mono text-[10px] font-bold tracking-[0.12em] text-amber-100">
          {text.simulated}
        </span>
      }
      actions={
        <a
          href="/portfolio"
          className="inline-flex min-h-10 items-center border border-[#2a3a54] px-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-white"
        >
          {language === "de" ? "Zurück zum Portfolio" : "Back to portfolio"}
        </a>
      }
    >
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.72fr)]">
        <form
          onSubmit={submit}
          className="border border-[#1e2a40] bg-[#0d1727]"
        >
          <div className="border-b border-[#1e2a40] px-5 py-5">
            <h2 className="text-lg font-semibold text-white">{text.asset}</h2>
            <div
              aria-label={text.asset}
              className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {assetSymbols.map((symbol) => {
                const asset = assets[symbol] ?? {
                  name: symbol,
                  domain: "logo.dev"
                };
                const selected = symbol === selectedAsset;
                return (
                  <button
                    key={symbol}
                    type="button"
                    aria-label={`${asset.name} · ${symbol}`}
                    onClick={() => {
                      setSelectedAsset(symbol);
                      setMessage(null);
                    }}
                    className={`flex min-h-14 items-center gap-3 border px-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${selected ? "border-cyan-300 bg-cyan-300/10" : "border-[#2a3a54] hover:border-cyan-300/70"}`}
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-full bg-[#15345b] p-1">
                      <CompanyLogo
                        domain={asset.domain}
                        name={asset.name}
                        size={22}
                      />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">
                        {asset.name}
                      </span>
                      <span className="font-mono text-xs text-slate-500">
                        {symbol}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="px-5 py-5">
            <label
              className="block text-sm text-slate-300"
              htmlFor="withdrawal-amount"
            >
              {text.amount} {selectedAsset}
            </label>
            <div className="mt-2 flex border border-[#2a3a54] bg-[#0a1322] focus-within:border-cyan-300">
              <input
                id="withdrawal-amount"
                aria-label={`${text.amount} ${selectedAsset}`}
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                className="min-w-0 flex-1 bg-transparent px-3 py-3 font-mono tabular-nums text-white outline-none"
                placeholder="0.00000000"
              />
              <button
                type="button"
                onClick={() => setAmount(String(available))}
                disabled={!balances}
                className="border-l border-[#2a3a54] px-3 text-xs font-bold text-cyan-200 transition hover:bg-cyan-300/10 hover:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {text.max}
              </button>
              <span className="flex items-center border-l border-[#2a3a54] px-3 font-mono text-sm text-slate-400">
                {selectedAsset}
              </span>
            </div>
            <p className="mt-2 font-mono text-xs tabular-nums text-slate-500">
              {text.equivalent}:{" "}
              {euroValue === null ? "—" : formatEuro(euroValue, language)}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                disabled={!balances}
                className="min-h-11 bg-cyan-300 px-4 text-sm font-bold text-[#07101e] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {text.review}
              </button>
              <button
                type="button"
                onClick={() => {
                  setAmount("");
                  setMessage(null);
                }}
                className="min-h-11 border border-[#2a3a54] px-4 text-sm font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-white"
              >
                {text.reset}
              </button>
            </div>
            {message ? (
              <p
                role="status"
                className="mt-5 border border-[#2a3a54] bg-[#091321] px-4 py-3 text-sm leading-6 text-slate-300"
              >
                {message}
              </p>
            ) : null}
          </div>
        </form>
        <aside className="border border-[#1e2a40] bg-[#0d1727] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            {text.available}
          </p>
          <p className="mt-5 font-mono text-3xl font-semibold tabular-nums text-white">
            {balances === null
              ? "—"
              : `${formatBalance(balances[selectedAsset] ?? "0")} ${selectedAsset}`}
          </p>
          <p className="mt-2 font-mono text-sm tabular-nums text-slate-400">
            {prices[selectedAsset]
              ? formatEuro(available * prices[selectedAsset], language)
              : "—"}
          </p>
          <div className="mt-7 border-t border-[#1e2a40] pt-5 text-sm leading-6 text-slate-400">
            <p>
              {balances === null
                ? text.loading
                : assetSymbols.length
                  ? text.footer
                  : text.unavailable}
            </p>
          </div>
        </aside>
      </section>
    </WorkspaceShell>
  );
};
