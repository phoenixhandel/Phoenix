import { useEffect, useState } from "react";
import { getAuthClient, provisionApplicationUser } from "./auth-client";
import { useLanguage } from "./i18n";
import { nextOtpSendAt, otpCooldownSeconds } from "./otp-cooldown";

export const PhoneVerificationPage = () => {
  const { language } = useLanguage();
  const de = language === "de";
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [availableAt, setAvailableAt] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const remaining = otpCooldownSeconds(availableAt, clock);

  useEffect(() => {
    if (!remaining) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [remaining]);

  const sendCode = async () => {
    if (remaining) { setMessage(de ? "Bitte warten Sie kurz, bevor Sie einen weiteren Code anfordern." : "Please wait briefly before requesting another code."); return; }
    const auth = getAuthClient();
    if (!auth) { setMessage(de ? "Die SMS-Bestätigung ist in dieser Umgebung noch nicht eingerichtet." : "Phone verification is not configured in this environment."); return; }
    const { error } = await auth.auth.signInWithOtp({ phone });
    setMessage(error?.message ?? (de ? "Bestätigungscode gesendet." : "Verification code sent."));
    setSent(!error);
    if (!error) setAvailableAt(nextOtpSendAt());
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    const auth = getAuthClient();
    if (!auth) return;
    const { error } = await auth.auth.verifyOtp({ phone, token: code, type: "sms" });
    if (error) { setMessage(error.message); return; }
    await provisionApplicationUser();
    setMessage(de ? "Telefonnummer bestätigt." : "Phone number verified.");
  };

  const title = de ? "Telefonnummer bestätigen" : "Verify phone";
  return <main className="grid min-h-screen place-items-center bg-[#07101e] p-5 text-slate-100"><section className="w-full max-w-md border border-[#1e2a40] bg-[#0d1727] p-7"><a href="/" className="text-sm font-semibold tracking-[0.18em] text-cyan-200">PHOENIX</a><p className="mt-8 text-[11px] font-bold tracking-[.14em] text-cyan-200">TIER 2 / CONTACT</p><h1 className="mt-3 text-2xl font-semibold text-white">{title}</h1><p className="mt-2 text-sm leading-6 text-slate-400">{de ? "Fügen Sie eine Mobilnummer als zusätzlichen Kontaktweg hinzu. Diese Funktion wird aktiviert, sobald der SMS-Anbieter in Supabase eingerichtet ist." : "Add a mobile number as an additional contact route. This feature becomes available once the SMS provider is configured in Supabase."}</p><label className="mt-6 block text-sm text-slate-300">{de ? "Mobilnummer" : "Phone number"}<input type="tel" required value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+4915123456789" className="mt-1.5 w-full border border-[#2a3a54] bg-[#0a1322] px-3 py-3 text-white outline-none focus:border-cyan-300" /></label>{sent ? <form onSubmit={verify} className="mt-4"><label className="block text-sm text-slate-300">{de ? "Bestätigungscode" : "Verification code"}<input required autoComplete="one-time-code" inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, ""))} className="mt-1.5 w-full border border-[#2a3a54] bg-[#0a1322] px-3 py-3 text-white outline-none focus:border-cyan-300" /></label><button className="mt-4 w-full bg-cyan-300 py-3 text-sm font-bold text-[#07101e]">{de ? "Telefonnummer bestätigen" : "Verify phone"}</button><button type="button" disabled={Boolean(remaining)} onClick={() => void sendCode()} className="mt-4 text-sm font-semibold text-cyan-200 disabled:cursor-not-allowed disabled:text-slate-500">{remaining ? `${de ? "Neuen Code senden" : "Send a new code"} (${remaining}s)` : de ? "Neuen Code senden" : "Send a new code"}</button></form> : <button onClick={() => void sendCode()} className="mt-4 w-full bg-cyan-300 py-3 text-sm font-bold text-[#07101e]">{de ? "Code senden" : "Send code"}</button>}{message ? <p role="status" className="mt-4 border-l-2 border-cyan-300 bg-cyan-300/5 px-3 py-3 text-sm leading-6 text-cyan-100">{message}</p> : null}</section></main>;
};
