import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import { getAuthClient } from "./auth-client";

type SessionState = "pending" | "anonymous" | "unverified" | "verified";
type AuthSessionContextValue = { session: Session | null; state: SessionState };

const AuthSessionContext = createContext<AuthSessionContextValue>({ session: null, state: "anonymous" });

const stateFor = (session: Session | null): SessionState => {
  if (!session) return "anonymous";
  return session.user.email_confirmed_at ? "verified" : "unverified";
};

export const AuthSessionProvider = ({ children }: { children: ReactNode }) => {
  const auth = getAuthClient();
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<SessionState>(auth ? "pending" : "anonymous");

  useEffect(() => {
    if (!auth) return;
    let active = true;
    void auth.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setState(stateFor(data.session));
    }).catch(() => {
      if (active) setState("anonymous");
    });
    const { data } = auth.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setState(stateFor(next));
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [auth]);

  const value = useMemo(() => ({ session, state }), [session, state]);
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
};

export const useAuthSession = () => useContext(AuthSessionContext);

export const RequireVerifiedSession = ({ children }: { children: ReactNode }) => {
  const { state } = useAuthSession();
  if (state === "pending") return <main className="grid min-h-screen place-items-center bg-[#07101e] text-sm text-slate-400">Lade Konto…</main>;
  return state === "verified" ? <>{children}</> : <Navigate to="/login?reason=verify" replace />;
};

export const PublicOnlyRoute = ({ children }: { children: ReactNode }) => {
  const { state } = useAuthSession();
  if (state === "pending") return <main className="grid min-h-screen place-items-center bg-[#07101e] text-sm text-slate-400">Lade Konto…</main>;
  return state === "verified" ? <Navigate to="/account" replace /> : <>{children}</>;
};
