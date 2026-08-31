import { useLanguage } from "./i18n";

const columns = {
  de: [
    { title: "Krypto", links: [["Portfolio", "/portfolio"], ["Märkte", "/markets"], ["Orderhistorie", "/history"], ["Kontoaktivität", "/activity"]] },
    { title: "Service", links: [["Phoenix Assist", "#phoenix-assist"], ["Verifizierung", "/account/verification"], ["Sicherheit", "/account/security"], ["Passwort zurücksetzen", "/reset-password"]] },
    { title: "Information", links: [["Gebühren", "/fees"], ["Plattformstatus", "/status"], ["Sicherheit", "/security"], ["Produktüberblick", "/how-it-works"]] },
    { title: "Rechtliches", links: [["Nutzungsbedingungen", "/terms"], ["Datenschutz", "/privacy"], ["KYC-Richtlinie", "/kyc-policy"], ["Risikohinweis", "/risk"], ["Cookies", "/cookies"]] }
  ],
  en: [
    { title: "Crypto", links: [["Portfolio", "/portfolio"], ["Markets", "/markets"], ["Trade history", "/history"], ["Account activity", "/activity"]] },
    { title: "Service", links: [["Phoenix Assist", "#phoenix-assist"], ["Verification", "/account/verification"], ["Security", "/account/security"], ["Password reset", "/reset-password"]] },
    { title: "Information", links: [["Fees", "/fees"], ["Platform status", "/status"], ["Security", "/security"], ["Product overview", "/how-it-works"]] },
    { title: "Legal", links: [["Terms of Use", "/terms"], ["Privacy Notice", "/privacy"], ["KYC policy", "/kyc-policy"], ["Risk notice", "/risk"], ["Cookies", "/cookies"]] }
  ]
} as const;

export const PhoenixMark = ({ href = "/" }: { href?: string }) => <a href={href} aria-label="Phoenix home" className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.18em] text-white"><span className="grid h-7 w-7 place-items-center bg-cyan-300 text-[13px] font-black tracking-normal text-[#07101e]">P</span>PHOENIX</a>;

export const SiteFooter = () => { const { language } = useLanguage(); const de = language === "de"; return <footer className="border-t border-[#1e2a40] bg-[#070e19] px-5 py-12 sm:px-8"><div className="mx-auto max-w-7xl"><div className="grid gap-10 border-b border-[#1e2a40] pb-10 sm:grid-cols-2 lg:grid-cols-[1.35fr_repeat(4,1fr)]"><div><PhoenixMark /><p className="mt-5 max-w-xs text-sm leading-6 text-slate-400">{de ? "Ein strukturierter Workspace für Ihre Krypto-Übersicht, Kontoaktivität und sichere Produktabläufe." : "A structured workspace for your crypto overview, account activity, and secure product workflows."}</p><a href="/register" className="mt-5 inline-flex text-sm font-semibold text-cyan-200 hover:text-cyan-100">{de ? "Konto eröffnen" : "Open an account"} →</a></div>{columns[language].map((column) => <section key={column.title}><h2 className="text-sm font-semibold text-white">{column.title}</h2><ul className="mt-4 space-y-2.5 text-sm text-slate-400">{column.links.map(([label, href]) => <li key={href}><a className="transition hover:text-cyan-100" href={href}>{label}</a></li>)}</ul></section>)}</div><div className="pt-6 text-xs text-slate-500"><span>© 2026 Phoenix Exchange</span></div></div></footer>; };
