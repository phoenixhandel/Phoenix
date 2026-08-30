import { type ReactNode, useState } from "react";
import { getAuthClient } from "./auth-client";
import { LanguageSelect, useLanguage } from "./i18n";
import { PhoenixMark, SiteFooter } from "./SiteFooter";

type Section = "account" | "markets" | "activity" | "verification";

type Props = {
  active: Section;
  title: string;
  description: string;
  children: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
};

const navigation: Record<
  "de" | "en",
  Array<{ id: Section; label: string; href: string }>
> = {
  de: [
    { id: "account", label: "Übersicht", href: "/account" },
    { id: "markets", label: "Märkte", href: "/markets" },
    { id: "activity", label: "Aktivität", href: "/activity" },
    { id: "verification", label: "Verifizierung", href: "/account/verification" }
  ],
  en: [
    { id: "account", label: "Overview", href: "/account" },
    { id: "markets", label: "Markets", href: "/markets" },
    { id: "activity", label: "Activity", href: "/activity" },
    { id: "verification", label: "Verification", href: "/account/verification" }
  ]
};

export const WorkspaceShell = ({
  active,
  title,
  description,
  children,
  actions,
  meta
}: Props) => {
  const { language } = useLanguage();
  const [message, setMessage] = useState<string | null>(null);
  const signOut = async () => {
    const auth = getAuthClient();
    if (!auth) {
      setMessage(
        language === "de"
          ? "Die Anmeldung ist in dieser Umgebung nicht verfügbar."
          : "Authentication is unavailable in this environment."
      );
      return;
    }
    const { error } = await auth.auth.signOut();
    if (error) {
      setMessage(error.message);
      return;
    }
    window.localStorage.removeItem("phoenix_access_token");
    window.location.assign("/");
  };

  return (
    <main className="phoenix-shell min-h-screen text-slate-100 selection:bg-cyan-300/30">
      <header className="sticky top-0 z-20 border-b border-[#1e2a40] bg-[#091321]/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-16 max-w-[1480px] items-center gap-4 px-5 sm:px-8">
          <PhoenixMark href="/account" />
          <nav
            aria-label="Workspace navigation"
            className="hidden items-center gap-1 md:flex"
          >
            {navigation[language].map((item) => (
              <a
                key={item.id}
                href={item.href}
                aria-current={active === item.id ? "page" : undefined}
                className={`relative min-h-10 px-3 py-2 text-sm transition ${
                  active === item.id
                    ? "text-white after:absolute after:inset-x-3 after:bottom-0 after:h-px after:bg-cyan-300"
                    : "text-slate-400 hover:text-slate-100"
                }`}
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2 sm:gap-3">
            <LanguageSelect />
            <a
              href="/account"
              className="hidden min-h-10 items-center px-3 text-sm font-medium text-slate-300 transition hover:text-white sm:inline-flex"
            >
              {language === "de" ? "Konto" : "Account"}
            </a>
            <button
              type="button"
              onClick={() => void signOut()}
              className="min-h-10 border border-[#2a3a54] px-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-300 hover:bg-cyan-300/5 hover:text-white"
            >
              {language === "de" ? "Abmelden" : "Sign out"}
            </button>
          </div>
        </div>
        <nav
          aria-label={language === "de" ? "Mobile Navigation" : "Mobile navigation"}
          className="flex overflow-x-auto border-t border-[#1e2a40] px-3 md:hidden"
        >
          {navigation[language].map((item) => (
            <a
              key={item.id}
              href={item.href}
              aria-current={active === item.id ? "page" : undefined}
              className={`shrink-0 px-3 py-3 text-sm ${
                active === item.id ? "text-cyan-100" : "text-slate-400"
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </header>

      <section className="border-b border-[#1e2a40] bg-[#091321]">
          <div className="mx-auto flex max-w-[1480px] flex-col gap-5 px-5 py-9 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:py-12">
            <div className="max-w-3xl">
            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-4xl">
              {title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
              {description}
            </p>
            {meta ? <div className="mt-5">{meta}</div> : null}
          </div>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
      </section>

      <div className="phoenix-reveal mx-auto max-w-[1480px] px-5 py-8 sm:px-8 sm:py-10">
        {message ? (
          <p role="status" className="mb-5 border border-amber-300/40 bg-amber-300/5 px-4 py-3 text-sm text-amber-100">
            {message}
          </p>
        ) : null}
        {children}
      </div>
      <SiteFooter />
    </main>
  );
};
