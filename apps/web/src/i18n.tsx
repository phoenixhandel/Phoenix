import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Language = "de" | "en";
type LanguageContext = { language: Language; setLanguage: (language: Language) => void };
const LanguageContext = createContext<LanguageContext>({ language: "de", setLanguage: () => undefined });

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => window.localStorage.getItem("phoenix_language") === "en" ? "en" : "de");
  useEffect(() => { window.localStorage.setItem("phoenix_language", language); document.documentElement.lang = language; }, [language]);
  return <LanguageContext.Provider value={{ language, setLanguage }}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);

export const LanguageSelect = () => {
  const { language, setLanguage } = useLanguage();
  return <label className="hidden text-xs text-slate-400 sm:block">{language === "de" ? "Sprache" : "Language"}<select aria-label={language === "de" ? "Sprache" : "Language"} value={language} onChange={(event) => setLanguage(event.target.value as Language)} className="ml-2 bg-transparent text-xs text-slate-200 outline-none"><option className="bg-[#0d1727]" value="de">DE</option><option className="bg-[#0d1727]" value="en">EN</option></select></label>;
};
