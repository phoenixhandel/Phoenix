import { type FormEvent, useState } from "react";
import { useLanguage } from "./i18n";
import { supportGuidance } from "./support-guidance";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

const BubbleIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 8.8 8.8 0 0 1-3.4-.7L4 20l1.3-4.1A7.3 7.3 0 0 1 4 11.5 7.5 7.5 0 0 1 12 4a7.5 7.5 0 0 1 8 7.5Z" /><path d="M8 12h.01M12 12h.01M16 12h.01" strokeLinecap="round" strokeWidth="2.4" /></svg>;
const CloseIcon = () => <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="m6 6 12 12M18 6 6 18" /></svg>;

export const SupportChatWidget = () => {
  const { language } = useLanguage();
  const de = language === "de";
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState(() => supportGuidance("", language));
  const [loading, setLoading] = useState(false);
  const topics = de ? ["E-Mail bestätigen", "Telefonnummer", "Märkte"] : ["Confirm email", "Phone number", "Markets"];

  const ask = async (prompt: string) => {
    const message = prompt.trim();
    if (!message || loading) return;
    setLoading(true);
    setAnswer(de ? "Phoenix Assist bereitet eine Antwort vor…" : "Phoenix Assist is preparing an answer…");
    try {
      const response = await fetch(`${apiBase}/api/support/assist`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ message }) });
      const payload = await response.json() as { answer?: string };
      if (!response.ok || !payload.answer) throw new Error("SUPPORT_UNAVAILABLE");
      setAnswer(payload.answer);
    } catch {
      setAnswer(supportGuidance(message, language));
    } finally {
      setLoading(false);
    }
  };

  const submit = (event: FormEvent) => { event.preventDefault(); void ask(question); };
  return <div id="phoenix-assist" className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-7 sm:right-7">
    {open ? <aside aria-label="Phoenix Assist" className="w-[calc(100vw-2.5rem)] max-w-sm overflow-hidden border border-[#2a3a54] bg-[#0b1626] shadow-2xl shadow-black/40"><div className="flex items-center justify-between border-b border-[#1e2a40] bg-[#0d1727] px-4 py-3"><div className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center bg-cyan-300 text-[#07101e]"><BubbleIcon /></span><div><p className="text-sm font-semibold text-white">Phoenix Assist</p><p className="text-[11px] text-emerald-300">{de ? "Orientierung & Hilfe" : "Guidance & support"}</p></div></div><button type="button" aria-label={de ? "Chat schließen" : "Close chat"} onClick={() => setOpen(false)} className="grid h-9 w-9 place-items-center text-slate-400 transition hover:bg-white/5 hover:text-white"><CloseIcon /></button></div><div className="p-4"><div aria-live="polite" className="min-h-32 border-l-2 border-cyan-300 bg-[#07101e] p-4 text-sm leading-6 text-slate-300">{answer}</div><div className="mt-3 flex flex-wrap gap-2">{topics.map((topic) => <button key={topic} type="button" disabled={loading} onClick={() => void ask(topic)} className="border border-[#2a3a54] px-2.5 py-1.5 text-xs text-slate-300 transition hover:border-cyan-300 hover:text-cyan-100 disabled:opacity-50">{topic}</button>)}</div><form onSubmit={submit} className="mt-4 flex gap-2"><label className="sr-only" htmlFor="phoenix-assist-message">Phoenix Assist</label><input id="phoenix-assist-message" value={question} maxLength={1000} onChange={(event) => setQuestion(event.target.value)} placeholder={de ? "Ihre Frage" : "Your question"} className="min-w-0 flex-1 border border-[#2a3a54] bg-[#07101e] px-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-cyan-300" /><button disabled={loading || !question.trim()} className="bg-cyan-300 px-3 text-sm font-bold text-[#07101e] transition enabled:hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50">{de ? "Senden" : "Send"}</button></form><p className="mt-3 text-[11px] leading-5 text-slate-500">{de ? "Teilen Sie niemals Passwörter, Einmalcodes oder Dokumente im Chat." : "Never share passwords, one-time codes, or documents in chat."}</p></div></aside> : null}
    <button type="button" aria-expanded={open} aria-controls="phoenix-assist" onClick={() => setOpen((value) => !value)} className="group inline-flex min-h-12 items-center gap-2 bg-cyan-300 px-4 text-sm font-bold text-[#07101e] shadow-lg shadow-cyan-300/10 transition hover:-translate-y-0.5 hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"><BubbleIcon /><span>{open ? (de ? "Schließen" : "Close") : "Phoenix Assist"}</span></button>
  </div>;
};
