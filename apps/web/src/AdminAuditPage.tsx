import { useEffect, useState } from "react";

export const AdminAuditPage = () => {
  const [data, setData] = useState<unknown>(null);
  const [message, setMessage] = useState<string | null>(null);
  const token = window.localStorage.getItem("phoenix_access_token");
  useEffect(() => { if (!token) { setMessage("Administrator sign-in is required."); return; } void fetch(`${import.meta.env.VITE_API_BASE_URL ?? ""}/api/admin/audit-log?limit=100`, { headers: { authorization: `Bearer ${token}` } }).then(async (response) => { if (!response.ok) throw new Error("Administrator access is required"); return response.json() as Promise<unknown>; }).then(setData).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Audit log unavailable")); }, [token]);
  return <main className="min-h-screen bg-[#07101e] px-5 py-8 text-slate-100"><section className="mx-auto max-w-5xl"><a href="/admin" className="text-sm font-semibold tracking-[0.18em] text-cyan-200">PHOENIX · ADMIN</a><div className="mt-7 border border-[#1e2a40] bg-[#0d1727] p-6"><p className="text-[11px] font-bold tracking-[0.14em] text-amber-200">IMMUTABLE EVIDENCE</p><h1 className="mt-2 text-2xl font-semibold text-white">Administrator audit log</h1><pre className="mt-6 max-h-[650px] overflow-auto border border-[#1e2a40] bg-[#07101e] p-4 font-mono text-xs leading-6 text-slate-300">{data ? JSON.stringify(data, null, 2) : "Loading…"}</pre>{message ? <p role="status" className="mt-4 text-sm text-cyan-200">{message}</p> : null}</div></section></main>;
};
