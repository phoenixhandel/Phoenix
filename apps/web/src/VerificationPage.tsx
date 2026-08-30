import { useEffect, useState } from "react";
import { getAuthClient } from "./auth-client";
import { useLanguage } from "./i18n";
import { PublicPage } from "./PublicPage";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

type Account = { emailVerified: boolean; kycStatus: "NOT_STARTED" | "PENDING" | "VERIFIED" };
type Level = { tier: string; heading: string; detail: string; complete: boolean; href?: string; action?: string; unavailable?: boolean };

export const VerificationPage = () => {
  const { language } = useLanguage();
  const de = language === "de";
  const [account, setAccount] = useState<Account | null>(null);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const token = window.localStorage.getItem("phoenix_access_token");

  useEffect(() => {
    const load = async () => {
      if (!token) { setMessage(de ? "Melden Sie sich an, um Ihren Status zu sehen." : "Sign in to see your verification status."); return; }
      try {
        const response = await fetch(`${apiBase}/api/me`, { headers: { authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error(de ? "Ihr Kontostatus ist derzeit nicht verfügbar." : "Your account status is unavailable right now.");
        setAccount(await response.json() as Account);
        const auth = getAuthClient();
        const user = auth ? (await auth.auth.getUser()).data.user : null;
        setPhoneVerified(Boolean(user?.phone_confirmed_at));
      } catch (error) {
        setMessage(error instanceof Error ? error.message : de ? "Ihr Kontostatus ist derzeit nicht verfügbar." : "Your account status is unavailable right now.");
      }
    };
    void load();
  }, [de, token]);

  const levels: Level[] = de
    ? [
        { tier: "01", heading: "Konto", detail: "Eine bestätigte E-Mail-Adresse ist Voraussetzung für ein Phoenix Konto und den geschützten Workspace.", complete: account?.emailVerified ?? false, href: "/account", action: "Kontoeinstellungen öffnen" },
        { tier: "02", heading: "Kontakt", detail: "Bestätigen Sie eine Mobilnummer als zusätzlichen Kontaktweg, sobald der SMS-Anbieter eingerichtet ist.", complete: phoneVerified, href: "/verify-phone", action: "Telefonnummer bestätigen" },
        { tier: "03", heading: "Identität", detail: "Die Identitätsprüfung wird derzeit vorbereitet. Es werden keine Identitätsdokumente entgegengenommen oder verarbeitet.", complete: false, unavailable: true }
      ]
    : [
        { tier: "01", heading: "Account", detail: "A confirmed email address is required for a Phoenix account and the protected workspace.", complete: account?.emailVerified ?? false, href: "/account", action: "Open account settings" },
        { tier: "02", heading: "Contact", detail: "Confirm a mobile number as an additional contact route once the SMS provider is configured.", complete: phoneVerified, href: "/verify-phone", action: "Verify phone" },
        { tier: "03", heading: "Identity", detail: "Identity verification is currently being prepared. No identity documents are being accepted or processed.", complete: false, unavailable: true }
      ];

  return <PublicPage active="verification" eyebrow={de ? "KONTOVERIFIZIERUNG" : "ACCOUNT VERIFICATION"} title={de ? "Sehen Sie genau, was Ihr Konto bestätigt hat." : "See exactly what your account has verified."} description={de ? "Jede Stufe zeigt einen klaren Status. Tier 1 ist mit der erforderlichen E-Mail-Bestätigung abgeschlossen." : "Each level has a clear status. Tier 1 is complete with the required email confirmation."}>
    <section className="mx-auto max-w-5xl py-2">
      <div className="grid gap-4 lg:grid-cols-3">
        {levels.map((level) => {
          const state = level.complete ? (de ? "Abgeschlossen" : "Complete") : level.unavailable ? (de ? "Vorübergehend außer Betrieb" : "Temporarily unavailable") : (de ? "Nicht abgeschlossen" : "Not complete");
          const color = level.complete ? "text-emerald-300" : level.unavailable ? "text-amber-200" : "text-slate-500";
          return <article key={level.tier} className={`phoenix-lift relative border bg-[#0b1626] p-6 transition ${level.complete ? "border-emerald-300/50" : level.unavailable ? "border-amber-300/30" : "border-[#1e2a40]"}`}>
            <div className="absolute inset-x-0 top-0 h-px bg-cyan-300/50" />
            <div className="flex items-center justify-between gap-4"><span className="font-mono text-xs text-cyan-200">{level.tier}</span><span className={`text-right text-xs font-semibold ${color}`}>{state}</span></div>
            <h2 className="mt-7 text-xl font-semibold text-white">{level.heading}</h2>
            <p className="mt-3 min-h-24 text-sm leading-6 text-slate-400">{level.detail}</p>
            {level.href && level.action ? <a href={level.href} className="mt-6 inline-flex min-h-11 items-center border border-[#2a3a54] px-3 text-sm font-semibold text-slate-200 hover:border-cyan-300 hover:bg-cyan-300/5 hover:text-white">{level.action} →</a> : <span className="mt-6 inline-flex min-h-11 items-center border border-amber-300/40 bg-amber-300/5 px-3 text-sm font-semibold text-amber-100">{de ? "Derzeit nicht verfügbar" : "Not available at this time"}</span>}
          </article>;
        })}
      </div>
      <section className="mt-8 border-l-2 border-cyan-300 bg-[#0b1626] p-6">
        <h2 className="text-lg font-semibold text-white">{de ? "So funktioniert der Zugang" : "How access works"}</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-400">{de ? "Der geschützte Workspace setzt eine bestätigte E-Mail-Adresse voraus. Die Telefonnummer kann anschließend als zweiter Kontaktweg ergänzt werden." : "The protected workspace requires a confirmed email address. A phone number can then be added as a second contact route."}</p>
        {message ? <p role="status" className="mt-4 text-sm text-cyan-200">{message}</p> : null}
      </section>
    </section>
  </PublicPage>;
};
