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
    firstName: "Vorname",
    lastName: "Nachname",
    email: "E-Mail-Adresse",
    iban: "IBAN",
    agentCode: "Agent-Code",
    amount: "Geprüfter Betrag",
    equivalent: "Geschätzter Gegenwert",
    confirm: "Bestätigen",
    sending: "Wird bestätigt…",
    invalidAgentCode: "Der Agent-Code ist ungültig.",
    submitFailed: "Die Auszahlungsanfrage konnte nicht bestätigt werden. Bitte versuche es erneut.",
    invalid:
      "Diese Prüfung ist nicht mehr gültig. Bitte beginne erneut im Portfolio.",
    exceeds: "Der Betrag überschreitet deinen aktuellen Bestand.",
    confirmedTitle: "Auszahlungsanfrage bestätigt",
    confirmedCopy:
      "Deine Auszahlungsanfrage wurde bestätigt. Eine Bestätigung wurde an deine E-Mail-Adresse gesendet. Dein Portfolio-Bestand wurde nicht automatisch geändert.",
    close: "Schließen"
  },
  en: {
    title: "Confirm withdrawal review",
    description: "Review the details for your account record.",
    firstName: "First name",
    lastName: "Last name",
    email: "Email address",
    iban: "IBAN",
    agentCode: "Agent code",
    amount: "Reviewed amount",
    equivalent: "Estimated EUR value",
    confirm: "Confirm",
    sending: "Confirming…",
    invalidAgentCode: "The agent code is invalid.",
    submitFailed: "The withdrawal request could not be confirmed. Please try again.",
    invalid:
      "This review is no longer valid. Please start again from your portfolio.",
    exceeds: "The amount exceeds your current balance.",
    confirmedTitle: "Withdrawal request confirmed",
    confirmedCopy:
      "Your withdrawal request was confirmed. A confirmation was sent to your email address. Your portfolio balance was not changed automatically.",
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
  const [iban, setIban] = useState("");
  const [agentCode, setAgentCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
    email.trim() &&
    iban.trim() &&
    agentCode.trim() &&
    !submitting
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

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canConfirm || !token) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await fetch(`${apiBase}/api/me/withdrawal-confirmations`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          iban: iban.trim(),
          agentCode: agentCode.trim(),
          asset,
          amount
        })
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: { code?: string } }
          | null;
        setSubmitError(
          body?.error?.code === "INVALID_AGENT_CODE"
            ? text.invalidAgentCode
            : text.submitFailed
        );
        return;
      }

      setConfirmed(true);
    } catch {
      setSubmitError(text.submitFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <WorkspaceShell
      active="account"
      title={text.title}
      description={text.description}
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
          onSubmit={submit}
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
          <label className="mt-4 block text-sm text-slate-300">
            {text.iban}
            <input
              aria-label={text.iban}
              required
              autoComplete="off"
              value={iban}
              onChange={(event) => setIban(event.target.value)}
              placeholder="DE89 3704 0044 0532 0130 00"
              className="mt-2 w-full border border-[#2a3a54] bg-[#0a1322] px-3 py-3 font-mono text-white outline-none focus:border-cyan-300"
            />
          </label>
          <label className="mt-4 block text-sm text-slate-300">
            {text.agentCode}
            <input
              aria-label={text.agentCode}
              required
              type="password"
              autoComplete="off"
              value={agentCode}
              onChange={(event) => setAgentCode(event.target.value)}
              className="mt-2 w-full border border-[#2a3a54] bg-[#0a1322] px-3 py-3 font-mono text-white outline-none focus:border-cyan-300"
            />
          </label>
          {submitError ? (
            <p
              role="alert"
              className="mt-4 border border-rose-300/40 bg-rose-300/5 px-4 py-3 text-sm text-rose-100"
            >
              {submitError}
            </p>
          ) : null}
          <button
            disabled={!canConfirm}
            className="mt-6 min-h-11 bg-cyan-300 px-5 text-sm font-bold text-[#07101e] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? text.sending : text.confirm}
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
