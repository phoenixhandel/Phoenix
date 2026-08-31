import { useEffect, useRef, useState } from "react";

type TurnstileOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

type TurnstileApi = {
  render: (container: HTMLElement, options: TurnstileOptions) => string;
  reset: (widgetId?: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

type TurnstileCaptchaProps = {
  refreshKey: number;
  onToken: (token: string | null) => void;
  onUnavailable: () => void;
};

const scriptId = "phoenix-turnstile";
const scriptSource = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export const TurnstileCaptcha = ({ refreshKey, onToken, onUnavailable }: TurnstileCaptchaProps) => {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const callbacksRef = useRef({ onToken, onUnavailable });
  const refreshMountedRef = useRef(false);
  const [ready, setReady] = useState(Boolean(window.turnstile));

  callbacksRef.current = { onToken, onUnavailable };

  useEffect(() => {
    if (!siteKey) {
      callbacksRef.current.onToken(null);
      callbacksRef.current.onUnavailable();
      return;
    }

    if (window.turnstile) {
      setReady(true);
      return;
    }

    const markReady = () => setReady(true);
    const markUnavailable = () => {
      callbacksRef.current.onToken(null);
      callbacksRef.current.onUnavailable();
    };
    const existing = document.getElementById(scriptId) as HTMLScriptElement | null;
    const script = existing ?? document.createElement("script");
    if (!existing) {
      script.id = scriptId;
      script.src = scriptSource;
      script.async = true;
      script.defer = true;
      document.head.append(script);
    }
    script.addEventListener("load", markReady);
    script.addEventListener("error", markUnavailable);

    return () => {
      script.removeEventListener("load", markReady);
      script.removeEventListener("error", markUnavailable);
    };
  }, [siteKey]);

  useEffect(() => {
    if (!ready || !siteKey || !containerRef.current) return;
    const turnstile = window.turnstile;
    if (!turnstile) {
      callbacksRef.current.onToken(null);
      callbacksRef.current.onUnavailable();
      return;
    }

    callbacksRef.current.onToken(null);
    const widgetId = turnstile.render(containerRef.current, {
      sitekey: siteKey,
      callback: (token) => callbacksRef.current.onToken(token),
      "expired-callback": () => callbacksRef.current.onToken(null),
      "error-callback": () => {
        callbacksRef.current.onToken(null);
        callbacksRef.current.onUnavailable();
      }
    });
    widgetIdRef.current = widgetId;

    return () => {
      turnstile.remove(widgetId);
      if (widgetIdRef.current === widgetId) widgetIdRef.current = null;
    };
  }, [ready, siteKey]);

  useEffect(() => {
    if (!refreshMountedRef.current) {
      refreshMountedRef.current = true;
      return;
    }
    callbacksRef.current.onToken(null);
    const widgetId = widgetIdRef.current;
    if (widgetId) window.turnstile?.reset(widgetId);
  }, [refreshKey]);

  return <div ref={containerRef} aria-label="Security check" />;
};
