import { useEffect, useState } from "react";
import { CompanyLogo } from "./CompanyLogo";
import { useLanguage } from "./i18n";
import { WorkspaceShell } from "./WorkspaceShell";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
type Page = "portfolio" | "history" | "activity" | "identity" | "settings";
type BalanceResponse = { balances?: Record<string, string> };
type TradeResponse = {
  trades?: Array<{
    tradeId: string;
    pair: string;
    side: string;
    baseAmount: string;
    quoteAmount: string;
    feeAmount: string;
    feeAsset: string;
    createdAt: string;
  }>;
};
type ActivityResponse = {
  events?: Array<{ eventId: string; eventType: string; createdAt: string }>;
};

const endpoints: Record<Exclude<Page, "identity" | "settings">, string> = {
  portfolio: "/api/me/portfolio",
  history: "/api/me/trades",
  activity: "/api/me/activity"
};
const assets: Record<string, { name: string; domain: string }> = {
  BTC: { name: "Bitcoin", domain: "bitcoin.org" },
  ETH: { name: "Ethereum", domain: "ethereum.org" },
  SOL: { name: "Solana", domain: "solana.com" },
  XRP: { name: "XRP", domain: "ripple.com" },
  USDT: { name: "Tether", domain: "tether.to" }
};

const content = {
  de: {
    nav: [
      ["Konto", "/account"],
      ["Portfolio", "/portfolio"],
      ["Märkte", "/markets"],
      ["Aktivität", "/activity"],
      ["Sicherheit", "/account/security"]
    ],
    overview: "Dein Krypto-Überblick",
    intro:
      "Deine Assets, Kontoaktivität und wichtigen Kontoschritte an einem Ort.",
    markets: "Märkte entdecken",
    active: "Zugang aktiv",
    activeCopy: "Deine E-Mail-Adresse wurde bestätigt.",
    assets: "Deine Assets",
    assetsCopy: "Eine klare Übersicht deiner verfügbaren Bestände.",
    loading: "Portfolio wird geladen…",
    emptyTitle: "Noch keine Assets in deinem Konto.",
    emptyCopy: "Entdecke unterstützte Märkte, sobald du bereit bist.",
    actions: "Nächste Schritte",
    verification: "Verifizierung",
    verificationCopy: "Überprüfe deinen Konto- und Identitätsstatus.",
    security: "Sicherheit",
    securityCopy: "Passwort und Zugangsoptionen verwalten.",
    support: "Support",
    supportCopy: "Antworten und Hilfe im Phoenix Workspace finden.",
    activity: "Aktuelle Aktivität",
    activityCopy: "Neue Kontoaktivität erscheint hier.",
    history: "Orderhistorie",
    historyCopy: "Deine abgeschlossenen Orders werden hier gespeichert.",
    settings: "Kontoeinstellungen",
    settingsCopy:
      "Verwalte die wichtigen Einstellungen deines Phoenix Zugangs.",
    identity: "Identität verifizieren",
    identityCopy:
      "Dieser Dienst wird derzeit vorbereitet. Derzeit werden keine Identitätsdokumente entgegengenommen oder verarbeitet.",
    verify: "Vorübergehend außer Betrieb",
    noOrders: "Noch keine Orders",
    noOrdersCopy:
      "Deine letzten Orders erscheinen hier, sobald du einen Markt geöffnet hast.",
    noActivity: "Noch keine Aktivität",
    noActivityCopy:
      "Wichtige Aktionen in deinem Konto werden hier festgehalten.",
    retry: "Erneut versuchen",
    unavailable:
      "Kontodaten sind gerade nicht verfügbar. Bitte versuche es gleich noch einmal."
  },
  en: {
    nav: [
      ["Account", "/account"],
      ["Portfolio", "/portfolio"],
      ["Markets", "/markets"],
      ["Activity", "/activity"],
      ["Security", "/account/security"]
    ],
    overview: "Your crypto overview",
    intro:
      "Your assets, account activity, and important account steps in one place.",
    markets: "Explore markets",
    active: "Access active",
    activeCopy: "Your email address has been confirmed.",
    assets: "Your assets",
    assetsCopy: "A clear overview of your available balances.",
    loading: "Loading portfolio…",
    emptyTitle: "No assets in your account yet.",
    emptyCopy: "Explore supported markets whenever you are ready.",
    actions: "Next steps",
    verification: "Verification",
    verificationCopy: "Review your account and identity status.",
    security: "Security",
    securityCopy: "Manage your password and access options.",
    support: "Support",
    supportCopy: "Find answers and help in the Phoenix workspace.",
    activity: "Recent activity",
    activityCopy: "New account activity will appear here.",
    history: "Order history",
    historyCopy: "Completed orders are saved here.",
    settings: "Account settings",
    settingsCopy: "Manage the essential settings for your Phoenix access.",
    identity: "Verify identity",
    identityCopy:
      "This service is currently being prepared. No identity documents are being accepted or processed at this time.",
    verify: "Temporarily unavailable",
    noOrders: "No orders yet",
    noOrdersCopy:
      "Your latest orders will appear here after you open a market.",
    noActivity: "No activity yet",
    noActivityCopy: "Important actions in your account are recorded here.",
    retry: "Try again",
    unavailable:
      "Account data is temporarily unavailable. Please try again shortly."
  }
} as const;

const AssetMark = ({ asset }: { asset: string }) => {
  const item = assets[asset];
  return item ? (
    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#15345b] p-1.5">
      <CompanyLogo domain={item.domain} name={item.name} size={28} />
    </span>
  ) : (
    <span className="grid h-10 w-10 place-items-center rounded-full bg-[#15345b] font-mono text-xs font-bold text-cyan-100">
      {asset.slice(0, 2)}
    </span>
  );
};

export const AccountPage = ({ page }: { page: Page }) => {
  const { language } = useLanguage();
  const copy = content[language];
  const [data, setData] = useState<
    BalanceResponse | TradeResponse | ActivityResponse | null
  >(null);
  const [requestState, setRequestState] = useState<
    "loading" | "ready" | "unavailable"
  >("loading");
  const token = window.localStorage.getItem("phoenix_access_token");
  const route =
    page in endpoints ? endpoints[page as keyof typeof endpoints] : null;

  useEffect(() => {
    if (!route) return;
    if (!token) {
      setRequestState("unavailable");
      return;
    }
    let active = true;
    setData(null);
    setRequestState("loading");
    void fetch(`${apiBase}${route}`, {
      headers: { authorization: `Bearer ${token}` }
    })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<
          BalanceResponse | TradeResponse | ActivityResponse
        >;
      })
      .then((payload) => {
        if (active) {
          setData(payload);
          setRequestState("ready");
        }
      })
      .catch(() => {
        if (active) {
          setRequestState("unavailable");
        }
      });
    return () => {
      active = false;
    };
  }, [route, token]);

  const balances = (data as BalanceResponse | null)?.balances;
  const trades = (data as TradeResponse | null)?.trades;
  const events = (data as ActivityResponse | null)?.events;
  const balanceRows = Object.entries(balances ?? {});
  const isReady = requestState === "ready";
  const isUnavailable = requestState === "unavailable";
  const detailTitle =
    page === "history"
      ? copy.history
      : page === "activity"
        ? copy.activity
        : page === "settings"
          ? copy.settings
          : page === "identity"
            ? copy.identity
            : copy.overview;
  const detailCopy =
    page === "history"
      ? copy.historyCopy
      : page === "activity"
        ? copy.activityCopy
        : page === "settings"
          ? copy.settingsCopy
          : page === "identity"
            ? copy.identityCopy
            : copy.intro;

  const portfolio = (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(300px,.65fr)]">
      <section className="border border-[#1e2a40] bg-[#0d1727]">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#1e2a40] px-5 py-5">
          <div>
            <h2 className="text-lg font-semibold text-white">{copy.assets}</h2>
            <p className="mt-1 text-sm text-slate-400">{copy.assetsCopy}</p>
          </div>
          <a
            href="/markets"
            className="text-sm font-semibold text-cyan-200 hover:text-cyan-100"
          >
            {copy.markets} →
          </a>
        </div>
        {balanceRows.length ? (
          <div>
            {balanceRows.map(([asset, value]) => (
              <div
                key={asset}
                className="flex items-center justify-between gap-4 border-b border-[#1e2a40] px-5 py-4 last:border-b-0"
              >
                <div className="flex items-center gap-3">
                  <AssetMark asset={asset} />
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      {assets[asset]?.name ?? asset}
                    </h3>
                    <p className="mt-0.5 font-mono text-xs text-slate-500">
                      {asset}
                    </p>
                  </div>
                </div>
                <p className="font-mono text-sm tabular-nums text-slate-200">
                  {value}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-10">
            <h3 className="text-base font-semibold text-white">
              {isReady
                ? copy.emptyTitle
                : isUnavailable
                  ? copy.unavailable
                  : copy.loading}
            </h3>
            <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
              {isReady ? copy.emptyCopy : copy.assetsCopy}
            </p>
            {isReady ? (
              <a
                href="/markets"
                className="mt-5 inline-flex min-h-11 items-center bg-cyan-300 px-4 text-sm font-bold text-[#07101e] hover:bg-cyan-200"
              >
                {copy.markets}
              </a>
            ) : isUnavailable ? (
              <a
                href={window.location.pathname}
                className="mt-5 inline-flex min-h-11 items-center border border-cyan-300/50 px-4 text-sm font-bold text-cyan-100 hover:border-cyan-200 hover:text-white"
              >
                {copy.retry}
              </a>
            ) : null}
          </div>
        )}
      </section>
      <aside className="border border-[#1e2a40] bg-[#0d1727]">
        <div className="border-b border-[#1e2a40] px-5 py-5">
          <h2 className="text-lg font-semibold text-white">{copy.actions}</h2>
        </div>
        <div className="divide-y divide-[#1e2a40]">
          <a
            href="/account/verification"
            className="block p-5 transition hover:bg-[#101d30]"
          >
            <h3 className="text-sm font-semibold text-white">
              {copy.verification}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              {copy.verificationCopy}
            </p>
          </a>
          <a
            href="/account/security"
            className="block p-5 transition hover:bg-[#101d30]"
          >
            <h3 className="text-sm font-semibold text-white">
              {copy.security}
            </h3>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              {copy.securityCopy}
            </p>
          </a>
          <a
            href="/support"
            className="block p-5 transition hover:bg-[#101d30]"
          >
            <h3 className="text-sm font-semibold text-white">{copy.support}</h3>
            <p className="mt-1 text-sm leading-6 text-slate-400">
              {copy.supportCopy}
            </p>
          </a>
        </div>
      </aside>
    </div>
  );

  const history = (
    <section className="border border-[#1e2a40] bg-[#0d1727]">
      <div className="border-b border-[#1e2a40] px-5 py-5">
        <h2 className="text-lg font-semibold text-white">{copy.history}</h2>
        <p className="mt-1 text-sm text-slate-400">{copy.historyCopy}</p>
      </div>
      {trades?.length ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <thead className="border-b border-[#1e2a40] text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              <tr>
                <th className="px-5 py-3">Pair</th>
                <th>Side</th>
                <th>Amount</th>
                <th>Fee</th>
                <th className="px-5 text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((trade) => (
                <tr
                  key={trade.tradeId}
                  className="border-b border-[#1e2a40] last:border-b-0"
                >
                  <td className="px-5 py-4 font-mono text-slate-200">
                    {trade.pair}
                  </td>
                  <td
                    className={
                      trade.side === "BUY"
                        ? "text-emerald-300"
                        : "text-rose-300"
                    }
                  >
                    {trade.side}
                  </td>
                  <td className="font-mono text-slate-300">
                    {trade.baseAmount} · {trade.quoteAmount}
                  </td>
                  <td className="font-mono text-slate-400">
                    {trade.feeAmount} {trade.feeAsset}
                  </td>
                  <td className="px-5 text-right text-xs text-slate-500">
                    {new Date(trade.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="px-5 py-10">
          <h3 className="text-base font-semibold text-white">
            {isReady
              ? copy.noOrders
              : isUnavailable
                ? copy.unavailable
                : copy.loading}
          </h3>
          <p className="mt-2 text-sm text-slate-400">{copy.noOrdersCopy}</p>
          {isReady ? (
            <a
              href="/markets"
              className="mt-5 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100"
            >
              {copy.markets} →
            </a>
          ) : isUnavailable ? (
            <a
              href={window.location.pathname}
              className="mt-5 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100"
            >
              {copy.retry} →
            </a>
          ) : null}
        </div>
      )}
    </section>
  );
  const activity = (
    <section className="border border-[#1e2a40] bg-[#0d1727]">
      <div className="border-b border-[#1e2a40] px-5 py-5">
        <h2 className="text-lg font-semibold text-white">{copy.activity}</h2>
        <p className="mt-1 text-sm text-slate-400">{copy.activityCopy}</p>
      </div>
      {events?.length ? (
        <div>
          {events.map((event) => (
            <div
              key={event.eventId}
              className="flex items-center justify-between gap-5 border-b border-[#1e2a40] px-5 py-4 last:border-b-0"
            >
              <span className="text-sm text-slate-200">
                {event.eventType.replaceAll("_", " ")}
              </span>
              <span className="text-xs text-slate-500">
                {new Date(event.createdAt).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-10">
          <h3 className="text-base font-semibold text-white">
            {isReady
              ? copy.noActivity
              : isUnavailable
                ? copy.unavailable
                : copy.loading}
          </h3>
          <p className="mt-2 text-sm text-slate-400">{copy.noActivityCopy}</p>
          {isUnavailable ? (
            <a
              href={window.location.pathname}
              className="mt-5 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100"
            >
              {copy.retry} →
            </a>
          ) : null}
        </div>
      )}
    </section>
  );
  const settings = (
    <section className="divide-y divide-[#1e2a40] border border-[#1e2a40] bg-[#0d1727]">
      <a
        href="/account/verification"
        className="block p-5 transition hover:bg-[#101d30]"
      >
        <h2 className="text-lg font-semibold text-white">
          {copy.verification}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {copy.verificationCopy}
        </p>
      </a>
      <a
        href="/reset-password"
        className="block p-5 transition hover:bg-[#101d30]"
      >
        <h2 className="text-lg font-semibold text-white">{copy.security}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          {copy.securityCopy}
        </p>
      </a>
    </section>
  );
  const identity = (
    <section className="border border-[#1e2a40] bg-[#0d1727] px-5 py-6">
      <h2 className="text-lg font-semibold text-white">{copy.identity}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">
        {copy.identityCopy}
      </p>
      <p className="mt-6 inline-flex min-h-11 items-center border border-amber-300/40 bg-amber-300/5 px-4 text-sm font-semibold text-amber-100">
        {copy.verify}
      </p>
    </section>
  );

  const active = page === "activity" || page === "history" ? "activity" : page === "identity" ? "verification" : "account";
  return (
    <WorkspaceShell
      active={active}
      title={detailTitle}
      description={detailCopy}
      meta={<div className="flex items-center gap-2 text-sm text-emerald-300"><span className="phoenix-status-dot h-2 w-2 rounded-full bg-emerald-300" />{copy.active}</div>}
      actions={<a href="/markets" className="inline-flex min-h-11 items-center border border-cyan-300/50 px-4 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-300 hover:text-[#07101e]">{copy.markets}</a>}
    >
        <div className="mb-8 grid gap-5 border-b border-[#1e2a40] pb-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="phoenix-data-panel p-5"><p className="phoenix-kicker">{copy.active}</p><p className="mt-3 text-sm leading-6 text-slate-400">{copy.activeCopy}</p></div>
          <a href="/account/verification" className="phoenix-data-panel phoenix-lift block p-5 transition hover:border-cyan-300/70"><p className="phoenix-kicker">{copy.verification}</p><p className="mt-3 text-sm leading-6 text-slate-400">{copy.verificationCopy}</p><span className="mt-4 inline-block text-sm font-semibold text-cyan-200">{copy.verification} →</span></a>
        </div>
        <div>
          {page === "portfolio"
            ? portfolio
            : page === "history"
              ? history
              : page === "activity"
                ? activity
                : page === "settings"
                  ? settings
                  : identity}
        </div>
    </WorkspaceShell>
  );
};
