import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuthSession } from "./auth-session";

const pendingNoticeKey = "phoenix_route_notice";

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
  const { state } = useAuthSession();
  const locationKey = `${location.key}:${location.pathname}${location.search}${location.hash}`;
  const previousLocation = useRef(locationKey);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state === "anonymous" || state === "unverified") {
      window.sessionStorage.removeItem(pendingNoticeKey);
      setOpen(false);
      return;
    }
    if (state === "pending") return;
    if (window.sessionStorage.getItem(pendingNoticeKey) !== "1") return;
    window.sessionStorage.removeItem(pendingNoticeKey);
    setOpen(true);
  }, [state]);

  useEffect(() => {
    const markFullPageNavigation = (event: MouseEvent) => {
      if (state !== "verified") return;
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.target || link.hasAttribute("download")) return;
      const next = new URL(link.href, window.location.href);
      const current = new URL(window.location.href);
      if (next.origin === current.origin && `${next.pathname}${next.search}${next.hash}` !== `${current.pathname}${current.search}${current.hash}`) {
        window.sessionStorage.setItem(pendingNoticeKey, "1");
      }
    };
    document.addEventListener("click", markFullPageNavigation);
    return () => document.removeEventListener("click", markFullPageNavigation);
  }, [state]);

  useEffect(() => {
    if (state !== "verified") return;
    if (previousLocation.current === locationKey) return;
    previousLocation.current = locationKey;
    setOpen(true);
  }, [locationKey, state]);

  if (!open) return null;

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-[#020617]/55 p-5 backdrop-blur-md" role="presentation"><section aria-labelledby="route-change-title" aria-modal="true" role="dialog" className="relative flex min-h-[min(48vh,32rem)] w-full max-w-3xl flex-col justify-between border border-cyan-200/20 bg-[#0b1626]/95 p-7 shadow-2xl shadow-black/40 sm:p-10"><button type="button" aria-label={routeChangeModalContent.closeLabel} onClick={() => setOpen(false)} className="absolute right-5 top-4 text-2xl font-light leading-none text-slate-500 transition hover:text-cyan-100">×</button><div className="max-w-xl"><p className="phoenix-kicker">{routeChangeModalContent.eyebrow}</p><h2 id="route-change-title" className="mt-5 max-w-lg text-3xl font-semibold tracking-[-0.035em] text-white sm:text-4xl">{routeChangeModalContent.title}</h2><p className="mt-5 text-sm leading-7 text-slate-300 sm:text-base">{routeChangeModalContent.body}</p></div><p className="border-t border-[#1e2a40] pt-5 text-sm text-slate-500">{routeChangeModalContent.detail}</p></section></div>;
};
