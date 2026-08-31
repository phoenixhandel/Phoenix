import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuthSession } from "./auth-session";
import { useLanguage } from "./i18n";
import { getPortfolioAssetPrices } from "./market-data";
import { WorkspaceShell } from "./WorkspaceShell";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
const validAssets = new Set(["BTC", "ETH", "SOL", "XRP", "USDT"]);
const formatEuro = (value: number, language: "de" | "en") =>
  new Intl.NumberFormat(language === "de" ? "de-DE" : "en-IE", {
    style: "currency",
    currency: "EUR"
  }).format(value);

const copy = {
  de: {
    title: "Auszahlung bestätigen",
    description: "Prüfe die Angaben für deine Kontodokumentation.",
    simulated: "SIMULIERTE KONTOAKTION",
    firstName: "Vorname",
    lastName: "Nachname",
    email: "E-Mail-Adresse",
    amount: "Geprüfter Betrag",
    equivalent: "Geschätzter Gegenwert",
    confirm: "Bestätigen",
    invalid:
      "Diese Prüfung ist nicht mehr gültig. Bitte beginne erneut im Portfolio.",
    exceeds: "Der Betrag überschreitet deinen aktuellen Bestand.",
    confirmedTitle: "Prüfung bestätigt",
    confirmedCopy:
      "Deine Angaben wurden für diese simulierte Kontoprüfung bestätigt. Es wurde keine Auszahlung ausgelöst und kein Portfolio-Bestand verändert.",
    close: "Schließen"
  },
  en: {
    title: "Confirm withdrawal review",
    description: "Review the details for your account record.",
    simulated: "SIMULATED ACCOUNT ACTION",
    firstName: "First name",
    lastName: "Last name",
    email: "Email address",
    amount: "Reviewed amount",
    equivalent: "Estimated EUR value",
    confirm: "Confirm",
    invalid:
      "This review is no longer valid. Please start again from your portfolio.",
    exceeds: "The amount exceeds your current balance.",
    confirmedTitle: "Review confirmed",
    confirmedCopy:
      "Your details were confirmed for this simulated account review. No withdrawal was submitted and no portfolio balance changed.",
    close: "Close"
  }
} as const;

export const WithdrawalConfirmationPage = () => {
  const { language } = useLanguage();
  const { session } = useAuthSession();
  const [params] = useSearchParams();
  const text = copy[language];
  const asset = (params.get("asset") ?? "").toUpperCase();
  const amount = Number(params.get("amount"));
  const token = window.localStorage.getItem("phoenix_access_token");
  const metadata = session?.user.user_metadata ?? {};
  const fullName =
    typeof metadata.full_name === "string"
      ? metadata.full_name.trim().split(/\s+/, 2)
      : [];
  const [firstName, setFirstName] = useState(
    typeof metadata.first_name === "string"
      ? metadata.first_name
      : (fullName[0] ?? "")
  );
  const [lastName, setLastName] = useState(
    typeof metadata.last_name === "string"
      ? metadata.last_name
      : (fullName[1] ?? "")
  );
  const [email, setEmail] = useState("");
  const [available, setAvailable] = useState<number | null>(null);
  const [price, setPrice] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const isRequestValid =
    validAssets.has(asset) && Number.isFinite(amount) && amount > 0;
  const canConfirm = Boolean(
    isRequestValid &&
    available !== null &&
    amount <= available &&
    firstName.trim() &&
    lastName.trim() &&
    email.trim()
  );

  useEffect(() => {
    if (!token || !isRequestValid) return;
    void Promise.all([
      fetch(`${apiBase}/api/me/portfolio`, {
        headers: { authorization: `Bearer ${token}` }
      }).then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ balances: Record<string, string> }>;
      }),
      fetch(`${apiBase}/api/me/settings`, {
        headers: { authorization: `Bearer ${token}` }
      }).then(async (response) => {
        if (!response.ok) throw new Error();
        return response.json() as Promise<{ email: string | null }>;
      }),
      getPortfolioAssetPrices("EUR").catch((): Record<string, number> => ({}))
    ])
      .then(([portfolio, settings, prices]) => {
        setAvailable(Number(portfolio.balances[asset] ?? 0));
        setEmail(settings.email ?? "");
        setPrice(prices[asset] ?? null);
      })
      .catch(() => setAvailable(0));
  }, [asset, isRequestValid, token]);

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
          href="/withdraw"
          className="inline-flex min-h-10 items-center border border-[#2a3a54] px-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-white"
        >
          {language === "de" ? "Zurück" : "Back"}
        </a>
      }
    >
      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,.72fr)]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (canConfirm) setConfirmed(true);
          }}
          className="border border-[#1e2a40] bg-[#0d1727] p-5"
        >
          {!isRequestValid ||
          available === 0 ||
          (available !== null && amount > available) ? (
            <p
              role="alert"
              className="border border-rose-300/40 bg-rose-300/5 px-4 py-3 text-sm text-rose-100"
            >
              {!isRequestValid ? text.invalid : text.exceeds}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm text-slate-300">
              {text.firstName}
              <input
                aria-label={text.firstName}
                required
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                className="mt-2 w-full border border-[#2a3a54] bg-[#0a1322] px-3 py-3 text-white outline-none focus:border-cyan-300"
              />
            </label>
            <label className="block text-sm text-slate-300">
              {text.lastName}
              <input
                aria-label={text.lastName}
                required
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                className="mt-2 w-full border border-[#2a3a54] bg-[#0a1322] px-3 py-3 text-white outline-none focus:border-cyan-300"
              />
            </label>
          </div>
          <label className="mt-4 block text-sm text-slate-300">
            {text.email}
            <input
              aria-label={text.email}
              required
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full border border-[#2a3a54] bg-[#0a1322] px-3 py-3 text-white outline-none focus:border-cyan-300"
            />
          </label>
          <button
            disabled={!canConfirm}
            className="mt-6 min-h-11 bg-cyan-300 px-5 text-sm font-bold text-[#07101e] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {text.confirm}
          </button>
        </form>
        <aside className="border border-[#1e2a40] bg-[#0d1727] p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
            {text.amount}
          </p>
          <p className="mt-5 font-mono text-3xl font-semibold tabular-nums text-white">
            {isRequestValid ? `${amount.toFixed(12)} ${asset}` : "—"}
          </p>
          <p className="mt-2 font-mono text-sm tabular-nums text-slate-400">
            {price ? formatEuro(amount * price, language) : "—"}
          </p>
          <div className="mt-7 border-t border-[#1e2a40] pt-5">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">
              {text.equivalent}
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              {language === "de"
                ? "Der Betrag wird vor der Bestätigung erneut gegen deinen aktuellen Bestand geprüft."
                : "The amount is checked against your current balance again before confirmation."}
            </p>
          </div>
        </aside>
      </section>
      {confirmed ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="withdrawal-confirmed-title"
          className="fixed inset-0 z-50 grid place-items-center bg-[#030914]/75 p-5 backdrop-blur-sm"
        >
          <section className="w-full max-w-md border border-emerald-300/50 bg-[#0d1727] p-8 text-center">
            <div
              aria-hidden="true"
              className="mx-auto grid h-20 w-20 place-items-center rounded-full border-2 border-emerald-300 bg-emerald-300/10 text-5xl font-light text-emerald-200"
            >
              ✓
            </div>
            <h2
              id="withdrawal-confirmed-title"
              className="mt-6 text-2xl font-semibold text-white"
            >
              {text.confirmedTitle}
            </h2>
            <p className="mt-3 text-sm leading-6 text-slate-300">
              {text.confirmedCopy}
            </p>
            <button
              type="button"
              onClick={() => setConfirmed(false)}
              className="mt-7 min-h-11 border border-[#2a3a54] px-5 text-sm font-semibold text-slate-200 transition hover:border-cyan-300 hover:text-white"
            >
              {text.close}
            </button>
          </section>
        </div>
      ) : null}
    </WorkspaceShell>
  );
};
