import { useEffect, useState } from "react";
import { LanguageSelect, useLanguage } from "./i18n";
import { CompanyLogo } from "./CompanyLogo";
import { SiteFooter } from "./SiteFooter";

type Ticker = { symbol: string; price: number; updatedAt: string; source: string };
const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT", "XRPUSDT", "BTCETH", "BTCSOL"];
const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";
const labels: Record<string, { name: string; pair: string; domain: string }> = {
  BTCUSDT: { name: "Bitcoin", pair: "BTC / USDT", domain: "bitcoin.org" },
  ETHUSDT: { name: "Ethereum", pair: "ETH / USDT", domain: "ethereum.org" },
  SOLUSDT: { name: "Solana", pair: "SOL / USDT", domain: "solana.com" },
  XRPUSDT: { name: "XRP", pair: "XRP / USDT", domain: "ripple.com" },
  BTCETH: { name: "Bitcoin", pair: "BTC / ETH", domain: "bitcoin.org" },
  BTCSOL: { name: "Bitcoin", pair: "BTC / SOL", domain: "bitcoin.org" }
};
const cryptoAssets = [
  { name: "Bitcoin", ticker: "BTC", domain: "bitcoin.org", de: "Das ursprüngliche Netzwerk für digitales Eigentum.", en: "The original network for digital ownership." },
  { name: "Ethereum", ticker: "ETH", domain: "ethereum.org", de: "Ein offenes Netzwerk für Anwendungen und digitale Werte.", en: "An open network for applications and digital value." },
  { name: "Solana", ticker: "SOL", domain: "solana.com", de: "Ein leistungsstarkes Netzwerk für digitale Anwendungen.", en: "A high-performance network for digital applications." },
  { name: "XRP", ticker: "XRP", domain: "ripple.com", de: "Ein digitales Asset für globale Wertübertragung.", en: "A digital asset for global value transfer." }
] as const;

const content = {
  de: {
    nav: ["Krypto", "Märkte", "Sicherheit"], login: "Anmelden", create: "Konto eröffnen",
    title: "Ihre Krypto-Welt, klar organisiert.",
    intro: "Phoenix bringt die Assets, Informationen und Kontoschritte zusammen, die zu einem sicheren Einstieg in Krypto gehören. Märkte bleiben verfügbar, wenn Sie tiefer einsteigen möchten.",
    first: "Konto eröffnen", sessionTitle: "Ein Zugang, Ihr Überblick",
    steps: [["Assets im Fokus", "Entdecken Sie die wichtigsten digitalen Assets mit einem klaren, ruhigen Überblick."], ["Verifizierter Zugang", "Ein bestätigter E-Mail-Zugang schützt die persönlichen Bereiche Ihres Kontos."], ["Märkte nach Bedarf", "Öffnen Sie Marktinformationen und Handelspaare erst dann, wenn Sie sie wirklich brauchen."]],
    crypto: "Krypto im Überblick", cryptoCopy: "Ein fokussierter Start mit den Assets, die Sie in Phoenix beobachten und in Ihrem Konto wiederfinden.",
    assets: "Märkte, wenn Sie sie brauchen", assetCopy: "Unterstützte Paare mit aktuellen öffentlichen Kursreferenzen. Marktinformationen bleiben eine Option innerhalb Ihres Krypto-Workspaces.",
    pair: "Handelspaar", price: "Referenzpreis", source: "Quelle", action: "Markt ansehen", open: "Öffnen",
    proofTitle: "Ein Konto, das Krypto verständlich hält.", proof: [
      ["Kontosicherheit", "E-Mail-Bestätigung schützt Ihren Zugang, bevor persönliche Bereiche geöffnet werden."],
      ["Portfolioansicht", "Assets, Aktivität und ausgewählte Märkte bleiben an einem klaren Ort verbunden."],
      ["Nachvollziehbare Schritte", "Verifizierung, Einstellungen und Hilfe folgen einer einfachen, nachvollziehbaren Struktur."]
    ],
    ctaTitle: "Beginnen Sie mit Krypto, nicht mit Komplexität.", ctaCopy: "Erstellen Sie Ihr Konto und bestätigen Sie Ihre E-Mail-Adresse, um Ihren Phoenix Workspace zu öffnen.",
    note: "Phoenix akzeptiert keine Kundengelder und bietet keine Verwahrung oder Auszahlungen an."
  },
  en: {
    nav: ["Crypto", "Markets", "Security"], login: "Log in", create: "Open account",
    title: "Your crypto world, clearly organized.",
    intro: "Phoenix brings together the assets, information, and account steps that belong to a confident start in crypto. Markets remain available whenever you want to go deeper.",
    first: "Open account", sessionTitle: "One account, your overview",
    steps: [["Assets in focus", "Explore core digital assets in a clear, calm overview."], ["Verified access", "A confirmed email protects the personal areas of your account."], ["Markets when needed", "Open market information and trading pairs only when you need them."],],
    crypto: "Crypto at a glance", cryptoCopy: "A focused start with the assets you can observe in Phoenix and find throughout your account.",
    assets: "Markets when you need them", assetCopy: "Supported pairs with current public price references. Market information remains an option within your crypto workspace.",
    pair: "Trading pair", price: "Reference price", source: "Source", action: "View market", open: "Open",
    proofTitle: "An account that keeps crypto understandable.", proof: [
      ["Account security", "Email confirmation protects your access before personal areas become available."],
      ["Portfolio view", "Assets, activity, and selected markets stay connected in one clear place."],
      ["Traceable steps", "Verification, settings, and help follow a simple, understandable structure."]
    ],
    ctaTitle: "Start with crypto, not complexity.", ctaCopy: "Create your account and confirm your email address to enter your Phoenix workspace.",
    note: "Phoenix does not accept client funds or provide custody or withdrawals."
  }
} as const;

const formatPrice = (price: number | undefined) => price === undefined ? "—" : new Intl.NumberFormat("en-US", { maximumFractionDigits: price >= 100 ? 2 : price >= 1 ? 4 : 6 }).format(price);

export const LandingPage = () => {
  const { language } = useLanguage();
  const copy = content[language];
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  useEffect(() => {
    let active = true;
    const refresh = () => void fetch(`${apiBase}/api/market/feed?pairs=${symbols.join(",")}`).then((response) => response.ok ? response.json() : Promise.reject()).then((data: { tickers?: Ticker[] }) => {
      if (active) setTickers(Object.fromEntries((data.tickers ?? []).map((ticker) => [ticker.symbol, ticker])));
    }).catch(() => undefined);
    refresh();
    const interval = window.setInterval(refresh, 5_000);
    return () => { active = false; window.clearInterval(interval); };
  }, []);

  return <main className="phoenix-shell min-h-screen overflow-x-hidden text-slate-100 selection:bg-cyan-300/30">
    <header className="sticky top-0 z-20 border-b border-[#1e2a40] bg-[#091321]/95 px-5 backdrop-blur-xl sm:px-8"><div className="mx-auto flex h-16 max-w-7xl items-center gap-5">
      <a href="/" aria-label="Phoenix home" className="flex items-center gap-2.5 text-sm font-semibold tracking-[0.18em] text-white"><span className="grid h-7 w-7 place-items-center bg-cyan-300 text-[13px] font-black tracking-normal text-[#07101e]">P</span>PHOENIX</a>
      <nav aria-label="Public navigation" className="hidden items-center gap-5 text-sm text-slate-400 md:flex"><a href="#crypto" className="hover:text-white">{copy.nav[0]}</a><a href="#markets" className="hover:text-white">{copy.nav[1]}</a><a href="#security" className="hover:text-white">{copy.nav[2]}</a></nav>
      <div className="ml-auto flex items-center gap-2 sm:gap-3"><LanguageSelect /><a href="/login" className="px-2 py-2 text-sm text-slate-300 hover:text-white sm:px-3">{copy.login}</a><a href="/register" className="bg-cyan-300 px-3 py-2 text-sm font-bold text-[#07101e] transition hover:bg-cyan-200 sm:px-4">{copy.create}</a></div>
    </div></header>

    <section className="mx-auto grid max-w-7xl gap-9 px-5 pb-14 pt-14 sm:px-8 lg:grid-cols-[1.1fr_.9fr] lg:items-center lg:py-24"><div className="max-w-2xl"><p className="phoenix-kicker mb-5">Digital assets · klare Orientierung</p>
      <h1 className="max-w-2xl text-5xl font-semibold leading-[.96] tracking-[-0.035em] text-white sm:text-7xl">{copy.title}</h1>
      <p className="mt-7 max-w-xl text-base leading-7 text-slate-300 sm:text-lg">{copy.intro}</p><div className="mt-9 flex flex-wrap gap-3"><a href="/register" className="phoenix-lift inline-flex min-h-12 items-center justify-center bg-cyan-300 px-6 text-sm font-bold text-[#07101e] transition hover:bg-cyan-200">{copy.first}</a><a href="#crypto" className="inline-flex min-h-12 items-center justify-center border border-[#2a3a54] px-5 text-sm font-semibold text-slate-200 hover:border-cyan-300 hover:text-white">{language === "de" ? "So funktioniert Phoenix" : "How Phoenix works"}</a></div>
    </div><section aria-label={copy.sessionTitle} className="relative border border-[#2a3a54] bg-[#0d1727] p-5 sm:p-7"><div aria-hidden="true" className="absolute inset-x-0 top-0 h-px bg-cyan-300/70" />
      <h2 className="text-xl font-semibold text-white">{copy.sessionTitle}</h2><ol className="mt-5">{copy.steps.map(([title, detail], index) => <li key={title} className="grid grid-cols-[32px_1fr] gap-4 border-t border-[#1e2a40] py-5"><span className="font-mono text-sm text-cyan-200">0{index + 1}</span><div><h3 className="text-sm font-semibold text-white">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-400">{detail}</p></div></li>)}</ol>
    </section></section>

    <section id="crypto" className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]"><div><h2 className="max-w-md text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.crypto}</h2><p className="mt-4 max-w-md text-sm leading-6 text-slate-400">{copy.cryptoCopy}</p></div><ol className="border-y border-[#1e2a40]">{cryptoAssets.map((asset) => <li key={asset.ticker} className="grid gap-4 border-b border-[#1e2a40] py-5 last:border-b-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] sm:items-center"><div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center rounded-full bg-[#15345b] p-1.5"><CompanyLogo domain={asset.domain} name={asset.name} size={32} /></span><div><h3 className="text-sm font-semibold text-white">{asset.name}</h3><p className="mt-0.5 font-mono text-xs text-slate-500">{asset.ticker}</p></div></div><p className="text-sm leading-6 text-slate-400">{asset[language]}</p></li>)}</ol></div></section>

    <section id="markets" className="border-y border-[#1e2a40] bg-[#091321] px-5 py-16 sm:px-8"><div className="mx-auto max-w-7xl"><div className="max-w-2xl"><h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.assets}</h2><p className="mt-3 text-sm leading-6 text-slate-400">{copy.assetCopy}</p></div>
      <div className="relative mt-9 overflow-hidden border border-[#1e2a40] bg-[#0a1322]"><div aria-hidden="true" className="absolute bottom-0 right-0 top-0 w-1 bg-cyan-300" /><div className="hidden grid-cols-[1.3fr_1fr_.9fr_auto] gap-5 border-b border-[#1e2a40] px-6 py-4 text-[10px] font-bold tracking-[0.12em] text-slate-500 md:grid"><span>{copy.pair}</span><span>{copy.price}</span><span>{copy.source}</span><span>{copy.action}</span></div>
        {symbols.map((symbol) => { const meta = labels[symbol]!; const ticker = tickers[symbol]; return <a key={symbol} href={`/trade/${symbol}`} className="grid gap-3 border-b border-[#17243a] px-5 py-5 pr-8 transition last:border-b-0 hover:bg-[#0d1727] md:grid-cols-[1.3fr_1fr_.9fr_auto] md:items-center md:gap-5 md:px-6"><span className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#15345b] p-1.5"><CompanyLogo domain={meta.domain} name={meta.name} size={28} /></span><span><strong className="block text-sm text-white">{meta.name}</strong><small className="mt-0.5 block font-mono text-xs text-slate-500">{meta.pair}</small></span></span><span className="font-mono text-sm font-semibold text-slate-200">{formatPrice(ticker?.price)}</span><span className="flex items-center gap-2 text-xs text-slate-500">{ticker?.source === "BINANCE" ? <CompanyLogo domain="binance.com" name="Binance" size={20} /> : null}{ticker?.source ?? "—"}</span><span className="text-sm font-semibold text-cyan-200">{copy.open} <span aria-hidden="true">→</span></span></a>; })}
      </div></div></section>

    <section id="security" className="mx-auto max-w-7xl px-5 py-16 sm:px-8"><div className="grid gap-8 lg:grid-cols-[.7fr_1.3fr]"><h2 className="max-w-md text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.proofTitle}</h2><div className="grid gap-px border border-[#1e2a40] bg-[#1e2a40] md:grid-cols-3">{copy.proof.map(([title, detail]) => <section key={title} className="bg-[#0d1727] p-6"><span className="block h-1 w-8 bg-cyan-300" /><h3 className="mt-6 text-lg font-semibold text-white">{title}</h3><p className="mt-3 text-sm leading-6 text-slate-400">{detail}</p></section>)}</div></div></section>

    <section className="border-t border-[#1e2a40] bg-[#0d1727] px-5 py-14 sm:px-8"><div className="mx-auto flex max-w-7xl flex-col justify-between gap-6 md:flex-row md:items-end"><div><h2 className="max-w-xl text-3xl font-semibold tracking-tight text-white">{copy.ctaTitle}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-400">{copy.ctaCopy}</p></div><a href="/register" className="inline-flex min-h-12 items-center justify-center bg-cyan-300 px-6 text-sm font-bold text-[#07101e] transition hover:bg-cyan-200">{copy.create}</a></div></section>
    <p className="border-t border-[#1e2a40] bg-[#07101e] px-5 py-4 text-center text-xs leading-5 text-slate-500 sm:px-8">{copy.note}</p><SiteFooter />
  </main>;
};
