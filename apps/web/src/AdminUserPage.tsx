import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

export const AdminUserPage = () => {
  const { id } = useParams();
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [accountStatus, setAccountStatus] = useState("ACTIVE");
  const [tradingStatus, setTradingStatus] = useState("ENABLED");
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const token = window.localStorage.getItem("phoenix_access_token");
  const headers = { authorization: `Bearer ${token}` };
  const load = useCallback(async () => {
    if (!token || !id) { setMessage("Administrator sign-in is required."); return; }
    try {
      const [user, portfolio, trades, activity, ledger] = await Promise.all(["", "/portfolio", "/trades", "/activity", "/ledger"].map(async (suffix) => {
        const response = await fetch(`${apiBase}/api/admin/users/${id}${suffix}`, { headers: { authorization: `Bearer ${token}` } }); if (!response.ok) throw new Error("User record unavailable"); return response.json() as Promise<unknown>;
      }));
      setData({ user, portfolio, trades, activity, ledger });
    } catch (error) { setMessage(error instanceof Error ? error.message : "User record unavailable"); }
  }, [id, token]);
  useEffect(() => { void load(); }, [load]);
  const change = async (kind: "status" | "trading-status") => {
    if (!id || !token || !reason.trim()) { setMessage("A reason is required for every account control."); return; }
    const response = await fetch(`${apiBase}/api/admin/users/${id}/${kind}`, { method: "PATCH", headers: { ...headers, "content-type": "application/json" }, body: JSON.stringify(kind === "status" ? { accountStatus, reason } : { tradingStatus, reason }) });
    setMessage(response.ok ? "Audited user control applied." : "User control was rejected."); if (response.ok) void load();
  };
  return <main className="min-h-screen bg-[#07101e] px-5 py-8 text-slate-100"><section className="mx-auto max-w-5xl"><a href="/admin" className="text-sm font-semibold tracking-[0.18em] text-cyan-200">PHOENIX · ADMIN</a><div className="mt-7 border border-[#1e2a40] bg-[#0d1727] p-6"><p className="text-[11px] font-bold tracking-[0.14em] text-amber-200">USER DETAIL · AUDITED CONTROLS</p><h1 className="mt-2 break-all text-2xl font-semibold text-white">{id}</h1><div className="mt-6 grid gap-3 border border-[#1e2a40] bg-[#07101e] p-4 md:grid-cols-2"><label className="text-sm text-slate-300">Account status<select value={accountStatus} onChange={(event) => setAccountStatus(event.target.value)} className="mt-1 w-full border border-[#2a3a54] bg-[#0d1727] p-2"><option>ACTIVE</option><option>SUSPENDED</option><option>LOCKED</option></select></label><label className="text-sm text-slate-300">Trading status<select value={tradingStatus} onChange={(event) => setTradingStatus(event.target.value)} className="mt-1 w-full border border-[#2a3a54] bg-[#0d1727] p-2"><option>ENABLED</option><option>FROZEN</option></select></label><label className="text-sm text-slate-300 md:col-span-2">Reason<input value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 w-full border border-[#2a3a54] bg-[#0d1727] p-2" /></label><div className="flex gap-3 md:col-span-2"><button onClick={() => void change("status")} className="border border-cyan-300 px-3 py-2 text-sm text-cyan-200">Update account</button><button onClick={() => void change("trading-status")} className="border border-cyan-300 px-3 py-2 text-sm text-cyan-200">Update trading</button></div></div><pre className="mt-6 max-h-[650px] overflow-auto border border-[#1e2a40] bg-[#07101e] p-4 font-mono text-xs leading-6 text-slate-300">{data ? JSON.stringify(data, null, 2) : "Loading…"}</pre>{message ? <p role="status" className="mt-4 text-sm text-cyan-200">{message}</p> : null}</div></section></main>;
};
