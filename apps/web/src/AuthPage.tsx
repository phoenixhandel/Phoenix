import { useEffect, useState } from "react";
import { getAuthClient, provisionApplicationUser } from "./auth-client";
import { LanguageSelect, useLanguage } from "./i18n";
import { passwordIssue } from "./password-policy";
import { nextOtpSendAt, otpCooldownSeconds } from "./otp-cooldown";
import { TurnstileCaptcha } from "./TurnstileCaptcha";

const copy = {
  de: {
    register: "Konto eröffnen",
    login: "Willkommen zurück",
    reset: "Passwort zurücksetzen",
    registerIntro:
      "Richten Sie Ihren Phoenix Zugang in wenigen klaren Schritten ein.",
    loginIntro: "Melden Sie sich mit Ihrer bestätigten E-Mail-Adresse an.",
    resetIntro:
      "Wir senden Ihnen einen sicheren Link zum Zurücksetzen Ihres Passworts.",
    name: "Vollständiger Name",
    email: "E-Mail-Adresse",
    password: "Passwort",
    confirm: "Passwort wiederholen",
    passwordRequirements: [
      "Mindestens 12 Zeichen",
      "Kleinbuchstabe",
      "Großbuchstabe",
      "Zahl",
      "Sonderzeichen"
    ],
    terms: "Ich akzeptiere die",
    termsLink: "Nutzungsbedingungen",
    create: "Konto erstellen",
    enter: "Anmelden",
    send: "Link senden",
    registered:
      "Prüfen Sie Ihr Postfach. Bestätigen Sie Ihre E-Mail-Adresse, bevor Sie sich anmelden.",
    existingAccount:
      "Für diese E-Mail-Adresse besteht bereits ein Konto. Bitte melden Sie sich an oder setzen Sie Ihr Passwort zurück.",
    provisionFailed:
      "Ihr Konto konnte nicht vorbereitet werden. Bitte versuchen Sie es erneut.",
    resetSent:
      "Wenn ein Konto existiert, wurde ein Link zum Zurücksetzen versendet.",
    unconfigured:
      "Die Anmeldung ist in dieser Umgebung noch nicht konfiguriert.",
    captchaTitle: "Sicherheitsprüfung",
    captchaPending: "Bitte schließen Sie die Sicherheitsprüfung ab, um fortzufahren.",
    captchaUnavailable: "Die Sicherheitsprüfung ist derzeit nicht verfügbar. Bitte versuchen Sie es später erneut.",
    mismatch: "Die Passwörter stimmen nicht überein.",
    agreement: "Bitte akzeptieren Sie die Nutzungsbedingungen.",
    verify:
      "Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse. Anschließend können Sie sich anmelden.",
    verifyTitle: "E-Mail-Adresse bestätigen",
    verifyCopy:
      "Wir haben einen achtstelligen Code an Ihre E-Mail-Adresse gesendet. Geben Sie ihn hier ein, um Ihren Zugang zu aktivieren.",
    code: "8-stelliger Bestätigungscode",
    confirmCode: "Code bestätigen",
    resend: "Neuen Code senden",
    resent: "Ein neuer Bestätigungscode wurde an Ihre E-Mail-Adresse gesendet.",
    cooldown: "Bitte warten Sie einen Moment, bevor Sie einen weiteren Code oder Link anfordern.",
    verified: "E-Mail-Adresse bestätigt. Ihr Konto wird geöffnet.",
    account: "Noch kein Konto?",
    createLink: "Konto erstellen",
    back: "Zur Anmeldung",
    forgot: "Passwort vergessen?",
    securityTitle: "Zugang, der mit Ihnen Schritt hält.",
    securityCopy:
      "E-Mail-Bestätigung ist vor dem Eintritt in den geschützten Phoenix Workspace erforderlich.",
    securityItems: [
      "Klarer Registrierungsprozess",
      "Bestätigter E-Mail-Zugang",
      "Kontobewegungen an einem Ort"
    ]
  },
  en: {
    register: "Open your account",
    login: "Welcome back",
    reset: "Reset your password",
    registerIntro: "Set up your Phoenix access in a few clear steps.",
    loginIntro: "Sign in with your confirmed email address.",
    resetIntro: "We will send a secure link to reset your password.",
    name: "Full name",
    email: "Email address",
    password: "Password",
    confirm: "Confirm password",
    passwordRequirements: [
      "At least 12 characters",
      "Lowercase letter",
      "Uppercase letter",
      "Number",
      "Special character"
    ],
    terms: "I accept the",
    termsLink: "Terms of Use",
    create: "Create account",
    enter: "Sign in",
    send: "Send link",
    registered:
      "Check your inbox. Confirm your email address before signing in.",
    existingAccount:
      "An account already exists for this email address. Sign in or reset your password.",
    provisionFailed:
      "Your account could not be prepared. Please try again.",
    resetSent: "If an account exists, a password reset link has been sent.",
    unconfigured: "Authentication is not configured in this environment yet.",
    captchaTitle: "Security check",
    captchaPending: "Complete the security check to continue.",
    captchaUnavailable: "The security check is currently unavailable. Please try again later.",
    mismatch: "The passwords do not match.",
    agreement: "Please accept the Terms of Use.",
    verify: "Please confirm your email address first, then sign in.",
    verifyTitle: "Confirm your email address",
    verifyCopy:
      "We sent an eight-digit code to your email address. Enter it here to activate your access.",
    code: "8-digit confirmation code",
    confirmCode: "Confirm code",
    resend: "Send a new code",
    resent: "A new confirmation code has been sent to your email address.",
    cooldown: "Please wait a moment before requesting another code or link.",
    verified: "Email address confirmed. Opening your account.",
    account: "New to Phoenix?",
    createLink: "Create an account",
    back: "Back to sign in",
    forgot: "Forgot password?",
    securityTitle: "Access designed to keep pace with you.",
    securityCopy:
      "Email confirmation is required before entering the protected Phoenix workspace.",
    securityItems: [
      "Clear registration flow",
      "Confirmed email access",
      "Account activity in one place"
    ]
  }
} as const;

export const AuthPage = ({
  mode
}: {
  mode: "login" | "register" | "reset";
}) => {
  const { language } = useLanguage();
  const text = copy[language];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(
    null
  );
  const [verificationCode, setVerificationCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaRefreshKey, setCaptchaRefreshKey] = useState(0);
  const [captchaUnavailable, setCaptchaUnavailable] = useState(false);
  const [emailSendAvailableAt, setEmailSendAvailableAt] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const cooldownSeconds = otpCooldownSeconds(emailSendAvailableAt, clock);
  const passwordRequirements = [
    password.length >= 12,
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^A-Za-z0-9]/.test(password)
  ];

  useEffect(() => {
    if (!cooldownSeconds) return;
    const timer = window.setInterval(() => setClock(Date.now()), 1_000);
    return () => window.clearInterval(timer);
  }, [cooldownSeconds]);
  const title =
    mode === "register"
      ? text.register
      : mode === "reset"
        ? text.reset
        : text.login;
  const intro =
    mode === "register"
      ? text.registerIntro
      : mode === "reset"
        ? text.resetIntro
        : text.loginIntro;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setMessage(null);
    const auth = getAuthClient();
    if (!auth) {
      setMessage(text.unconfigured);
      return;
    }
    if (mode === "register" && password !== confirmation) {
      setMessage(text.mismatch);
      return;
    }
    if (mode === "register") {
      const issue = passwordIssue(password, language);
      if (issue) {
        setMessage(issue);
        return;
      }
    }
    if (mode === "register" && !acceptedTerms) {
      setMessage(text.agreement);
      return;
    }
    if (mode === "reset") {
      if (cooldownSeconds) {
        setMessage(text.cooldown);
        return;
      }
      const { error } = await auth.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`
      });
      setMessage(error?.message ?? text.resetSent);
      if (!error) setEmailSendAvailableAt(nextOtpSendAt());
      return;
    }
    if (!captchaToken) {
      setMessage(captchaUnavailable ? text.captchaUnavailable : text.captchaPending);
      return;
    }
    if (mode === "register") {
      const result = await auth.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          captchaToken
        }
      });
      setCaptchaToken(null);
      setCaptchaRefreshKey((key) => key + 1);
      if (result.error) {
        setMessage(result.error.message);
        return;
      }
      if (Array.isArray(result.data.user?.identities) && result.data.user.identities.length === 0) {
        setMessage(text.existingAccount);
        return;
      }
      setVerificationEmail(email);
      setEmailSendAvailableAt(nextOtpSendAt());
      setMessage(null);
      return;
    }
    const result = await auth.auth.signInWithPassword({
      email,
      password,
      options: { captchaToken }
    });
    setCaptchaToken(null);
    setCaptchaRefreshKey((key) => key + 1);
    if (result.error) {
      setMessage(result.error.message);
      return;
    }
    if (!result.data.user?.email_confirmed_at) {
      await auth.auth.signOut();
      setMessage(text.verify);
      return;
    }
    try {
      await provisionApplicationUser();
    } catch {
      setMessage(text.provisionFailed);
      return;
    }
    window.location.assign("/account");
  };
  const confirmEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    const auth = getAuthClient();
    if (!auth || !verificationEmail) {
      setMessage(text.unconfigured);
      return;
    }
    const { error } = await auth.auth.verifyOtp({
      email: verificationEmail,
      token: verificationCode,
      type: "email"
    });
    if (error) {
      setMessage(error.message);
      return;
    }
    try {
      await provisionApplicationUser();
    } catch {
      setMessage(text.provisionFailed);
      return;
    }
    setMessage(text.verified);
    window.location.assign("/verify-identity");
  };
  const resendCode = async () => {
    if (cooldownSeconds) {
      setMessage(text.cooldown);
      return;
    }
    const auth = getAuthClient();
    if (!auth || !verificationEmail) {
      setMessage(text.unconfigured);
      return;
    }
    const { error } = await auth.auth.resend({
      type: "signup",
      email: verificationEmail
    });
    setMessage(error?.message ?? text.resent);
    if (!error) setEmailSendAvailableAt(nextOtpSendAt());
  };
  if (verificationEmail)
    return (
      <main className="phoenix-shell min-h-screen text-slate-100 lg:grid lg:grid-cols-[minmax(0,520px)_1fr]">
        <section className="relative flex min-h-screen flex-col px-6 py-6 sm:px-10 lg:px-14">
          <div className="flex items-center justify-between">
            <a
              href="/"
              className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.18em] text-white"
            >
              <span className="grid h-7 w-7 place-items-center bg-cyan-300 text-[13px] font-black tracking-normal text-[#07101e]">
                P
              </span>
              PHOENIX
            </a>
            <LanguageSelect />
          </div>
          <div className="my-auto w-full max-w-md py-12">
            <p className="text-[11px] font-bold tracking-[0.14em] text-cyan-200">
              02 / EMAIL VERIFICATION
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
              {text.verifyTitle}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              {text.verifyCopy}
            </p>
            <p className="mt-5 border border-[#1e2a40] bg-[#0a1322] px-4 py-3 text-sm text-slate-300">
              {verificationEmail}
            </p>
            <form onSubmit={confirmEmail} className="mt-7">
              <label className="block text-sm text-slate-300">
                {text.code}
                <input
                  required
                  aria-label={text.code}
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]{8}"
                  maxLength={8}
                  value={verificationCode}
                  onChange={(event) =>
                    setVerificationCode(event.target.value.replace(/\D/g, ""))
                  }
                  className="mt-2 w-full border border-[#2a3a54] bg-[#0a1322] px-4 py-4 text-center font-mono text-2xl tracking-[0.45em] text-white outline-none transition focus:border-cyan-300"
                />
              </label>
              <button
                disabled={verificationCode.length !== 8}
                className="mt-5 w-full bg-cyan-300 py-3.5 text-sm font-bold text-[#07101e] transition enabled:hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {text.confirmCode}
              </button>
            </form>
            <button
              type="button"
              onClick={() => void resendCode()}
              disabled={Boolean(cooldownSeconds)}
              className="mt-5 text-sm font-semibold text-cyan-200 hover:text-cyan-100 disabled:cursor-not-allowed disabled:text-slate-500"
            >
              {cooldownSeconds ? `${text.resend} (${cooldownSeconds}s)` : text.resend}
            </button>
            {message ? (
              <p
                role="status"
                className="mt-5 border-l-2 border-cyan-300 bg-cyan-300/5 px-4 py-3 text-sm leading-6 text-cyan-100"
              >
                {message}
              </p>
            ) : null}
          </div>
        </section>
        <aside className="relative hidden overflow-hidden border-l border-[#1e2a40] bg-[#091321] lg:block">
          <div
            aria-hidden="true"
            className="absolute -right-24 top-20 h-80 w-80 border border-cyan-300/25"
          />
          <div
            aria-hidden="true"
            className="absolute right-28 top-40 h-48 w-48 border border-cyan-300/50 bg-[#0d1727]"
          />
          <div className="absolute bottom-20 left-14 max-w-md">
            <span className="block h-1 w-10 bg-cyan-300" />
            <h2 className="mt-7 text-4xl font-semibold tracking-tight text-white">
              {text.securityTitle}
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-400">
              {text.securityCopy}
            </p>
          </div>
        </aside>
      </main>
    );
  return (
    <main className="phoenix-shell min-h-screen text-slate-100 lg:grid lg:grid-cols-[minmax(0,520px)_1fr]">
      <section className="relative flex min-h-screen flex-col px-6 py-6 sm:px-10 lg:px-14">
        <div className="flex items-center justify-between">
          <a
            href="/"
            className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.18em] text-white"
          >
            <span className="grid h-7 w-7 place-items-center bg-cyan-300 text-[13px] font-black tracking-normal text-[#07101e]">
              P
            </span>
            PHOENIX
          </a>
          <LanguageSelect />
        </div>
        <div className="my-auto w-full max-w-md py-12">
          <p className="text-[11px] font-bold tracking-[0.14em] text-cyan-200">
            {mode === "register" ? "01 / ACCESS" : "ACCOUNT ACCESS"}
          </p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white">
            {title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">{intro}</p>
          <form onSubmit={submit} className="mt-8 space-y-4">
            {mode === "register" ? (
              <label className="block text-sm text-slate-300">
                {text.name}
                <input
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1.5 w-full border border-[#2a3a54] bg-[#0a1322] px-3 py-3 text-white outline-none transition focus:border-cyan-300"
                />
              </label>
            ) : null}
            <label className="block text-sm text-slate-300">
              {text.email}
              <input
                required
                autoComplete="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1.5 w-full border border-[#2a3a54] bg-[#0a1322] px-3 py-3 text-white outline-none transition focus:border-cyan-300"
              />
            </label>
            {mode !== "reset" ? (
              <>
                <label className="block text-sm text-slate-300">
                  {text.password}
                  <input
                    aria-label={text.password}
                    required
                    minLength={mode === "register" ? 12 : 8}
                    autoComplete={
                      mode === "register" ? "new-password" : "current-password"
                    }
                    type="password"
                    value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="mt-1.5 w-full border border-[#2a3a54] bg-[#0a1322] px-3 py-3 text-white outline-none transition focus:border-cyan-300"
                />
                {mode === "register" ? (
                  <ul className="mt-3 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
                    {text.passwordRequirements.map((requirement, index) => (
                      <li key={requirement} className={passwordRequirements[index] ? "text-emerald-200" : "text-slate-500"}>
                        <label className="flex items-center gap-2">
                          <input
                            aria-label={requirement}
                            checked={passwordRequirements[index]}
                            readOnly
                            type="checkbox"
                            className="h-3.5 w-3.5 accent-emerald-300"
                          />
                          {requirement}
                        </label>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </label>
                {mode === "register" ? (
                  <label className="block text-sm text-slate-300">
                    {text.confirm}
                  <input
                    aria-label={text.confirm}
                    required
                    minLength={mode === "register" ? 12 : 8}
                      autoComplete="new-password"
                      type="password"
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      className="mt-1.5 w-full border border-[#2a3a54] bg-[#0a1322] px-3 py-3 text-white outline-none transition focus:border-cyan-300"
                    />
                  </label>
                ) : null}
              </>
            ) : null}
            {mode === "register" ? (
              <label className="flex items-start gap-3 pt-1 text-sm leading-5 text-slate-400">
                <input
                  required
                  checked={acceptedTerms}
                  onChange={(event) => setAcceptedTerms(event.target.checked)}
                  type="checkbox"
                  className="mt-1 h-4 w-4 accent-cyan-300"
                />
                <span>
                  {text.terms}{" "}
                  <a
                    className="text-cyan-200 hover:text-cyan-100"
                    href="/terms"
                  >
                    {text.termsLink}
                  </a>
                  .
                </span>
              </label>
            ) : null}
            {mode !== "reset" ? (
              <div className="border border-[#1e2a40] bg-[#0a1322] p-4">
                <p className="text-sm font-semibold text-slate-200">{text.captchaTitle}</p>
                <div className="mt-3 min-h-[65px]">
                  <TurnstileCaptcha
                    refreshKey={captchaRefreshKey}
                    onToken={(token) => {
                      setCaptchaToken(token);
                      if (token) setCaptchaUnavailable(false);
                    }}
                    onUnavailable={() => setCaptchaUnavailable(true)}
                  />
                </div>
                {!captchaToken ? <p className="mt-2 text-xs leading-5 text-slate-400">{captchaUnavailable ? text.captchaUnavailable : text.captchaPending}</p> : null}
              </div>
            ) : null}
            <button disabled={mode !== "reset" && !captchaToken} className="w-full bg-cyan-300 py-3.5 text-sm font-bold text-[#07101e] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50">
              {mode === "register"
                ? text.create
                : mode === "reset"
                  ? text.send
                  : text.enter}
            </button>
          </form>
          {message ? (
            <p
              role="status"
              className="mt-5 border-l-2 border-cyan-300 bg-cyan-300/5 px-4 py-3 text-sm leading-6 text-cyan-100"
            >
              {message}
            </p>
          ) : null}
          <p className="mt-7 text-sm text-slate-400">
            {mode === "login" ? (
              <>
                {text.account}{" "}
                <a
                  className="text-cyan-200 hover:text-cyan-100"
                  href="/register"
                >
                  {text.createLink}
                </a>{" "}
                ·{" "}
                <a
                  className="text-cyan-200 hover:text-cyan-100"
                  href="/reset-password"
                >
                  {text.forgot}
                </a>
              </>
            ) : (
              <a className="text-cyan-200 hover:text-cyan-100" href="/login">
                {text.back}
              </a>
            )}
          </p>
        </div>
      </section>
      <aside className="relative hidden overflow-hidden border-l border-[#1e2a40] bg-[#091321] lg:block">
        <div
          aria-hidden="true"
          className="absolute -right-24 top-20 h-80 w-80 border border-cyan-300/25"
        />
        <div
          aria-hidden="true"
          className="absolute right-28 top-40 h-48 w-48 border border-cyan-300/50 bg-[#0d1727]"
        />
        <div
          aria-hidden="true"
          className="absolute right-16 top-72 h-24 w-64 border-l-2 border-cyan-300 bg-[#10203a]"
        />
        <div className="absolute bottom-20 left-14 max-w-md">
          <span className="block h-1 w-10 bg-cyan-300" />
          <h2 className="mt-7 text-4xl font-semibold tracking-tight text-white">
            {text.securityTitle}
          </h2>
          <p className="mt-4 text-base leading-7 text-slate-400">
            {text.securityCopy}
          </p>
          <ul className="mt-8 space-y-3 border-t border-[#1e2a40] pt-6 text-sm text-slate-300">
            {text.securityItems.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 bg-cyan-300" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </main>
  );
};
