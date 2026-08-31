import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuthSession } from "./auth-session";

const pendingNoticeKey = "phoenix_route_notice";

// Replace this public image file to change the route-change notice.
export const routeChangeNoticeImage = {
  src: "/route-notice.webp",
  alt: "Page transition notice"
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

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-[#020617]/55 p-5 backdrop-blur-md" role="presentation"><section aria-label={routeChangeNoticeImage.alt} aria-modal="true" role="dialog" className="relative w-full max-w-3xl overflow-hidden shadow-2xl shadow-black/40"><button type="button" aria-label="Close notice" onClick={() => setOpen(false)} className="absolute right-4 top-3 z-10 text-2xl font-light leading-none text-white/45 transition hover:text-white">×</button><img src={routeChangeNoticeImage.src} alt={routeChangeNoticeImage.alt} className="block max-h-[82vh] w-full object-contain" /></section></div>;
};
