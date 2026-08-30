import { useEffect, useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { getAuthClient } from "./auth-client";

export const RequireVerifiedSession = ({ children }: { children: ReactNode }) => {
  const auth = getAuthClient();
  const hasStoredSession = Boolean(window.localStorage.getItem("phoenix_access_token"));
  const [verified, setVerified] = useState<boolean | null>(auth && hasStoredSession ? null : false);
  useEffect(() => {
    if (!auth || !hasStoredSession) return;
    void auth.auth.getUser().then(({ data }) => setVerified(Boolean(data.user?.email_confirmed_at))).catch(() => setVerified(false));
  }, [auth, hasStoredSession]);
  if (verified === null) return <main className="grid min-h-screen place-items-center bg-[#07101e] text-sm text-slate-400">Lade Konto…</main>;
  return verified ? <>{children}</> : <Navigate to="/login?reason=verify" replace />;
};
