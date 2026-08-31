import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";

// Edit this object to change every part of the route-change notice.
export const routeChangeModalContent = {
  eyebrow: "PHOENIX",
  title: "Willkommen in Ihrem nächsten Bereich.",
  body: "Ihr Zugang, Ihre Kontodaten und Ihre Marktübersicht bleiben geschützt und klar organisiert.",
  detail: "Schließen Sie diesen Hinweis, um fortzufahren.",
  closeLabel: "Close notice"
};

export const RouteChangeModal = () => {
  const location = useLocation();
  const locationKey = `${location.key}:${location.pathname}${location.search}${location.hash}`;
  const previousLocation = useRef(locationKey);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (previousLocation.current === locationKey) return;
    previousLocation.current = locationKey;
    setOpen(true);
  }, [locationKey]);

  if (!open) return null;

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-[#020617]/55 p-5 backdrop-blur-md" role="presentation"><section aria-labelledby="route-change-title" aria-modal="true" role="dialog" className="relative flex min-h-[min(48vh,32rem)] w-full max-w-3xl flex-col justify-between border border-cyan-200/20 bg-[#0b1626]/95 p-7 shadow-2xl shadow-black/40 sm:p-10"><button type="button" aria-label={routeChangeModalContent.closeLabel} onClick={() => setOpen(false)} className="absolute right-5 top-4 text-2xl font-light leading-none text-slate-500 transition hover:text-cyan-100">×</button><div className="max-w-xl"><p className="phoenix-kicker">{routeChangeModalContent.eyebrow}</p><h2 id="route-change-title" className="mt-5 max-w-lg text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">{routeChangeModalContent.title}</h2><p className="mt-5 text-sm leading-7 text-slate-300 sm:text-base">{routeChangeModalContent.body}</p></div><p className="border-t border-[#1e2a40] pt-5 text-sm text-slate-500">{routeChangeModalContent.detail}</p></section></div>;
};
