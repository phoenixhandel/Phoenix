import { useEffect, useState } from "react";

export const AdminPage = () => {
  const [data, setData] = useState<unknown>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [userId, setUserId] = useState("");
  const [asset, setAsset] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [operation, setOperation] = useState<"credit" | "debit" | "set" | "reset">("credit");
  const [search, setSearch] = useState("");
  useEffect(() => {
    const token = window.localStorage.getItem("phoenix_access_token");
    if (!token) { setMessage("Sign in with an administrator account to continue."); return; }
    const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
    void fetch(`${import.meta.env.VITE_API_BASE_URL ?? ""}/api/admin/users${query}`, { headers: { authorization: `Bearer ${token}` } }).then(async (response) => { if (!response.ok) throw new Error("Administrator access is required"); return response.json(); }).then(setData).catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Admin data unavailable"));
  }, [search]);
  const adjustBalance = async (event: React.FormEvent) => {
    event.preventDefault();
    const token = window.localStorage.getItem("phoenix_access_token");
    if (!token) { setMessage("Sign in with an administrator account to continue."); return; }
    const url = operation === "reset" ? `/api/admin/users/${userId}/portfolio/reset` : operation === "set" ? `/api/admin/users/${userId}/balance` : `/api/admin/users/${userId}/balance/${operation}`;
    const body = operation === "reset" ? { reason } : operation === "set" ? { asset, newBalance: amount, reason } : { asset, amount, reason };
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL ?? ""}${url}`, { method: operation === "set" ? "PUT" : "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "idempotency-key": crypto.randomUUID() }, body: JSON.stringify(body) });
    setMessage(response.ok ? "Audited balance action completed." : "Balance action was rejected.");
  };
  return <main className="min-h-screen bg-[#07101e] px-5 py-8 text-slate-100"><section className="mx-auto max-w-5xl"><a href="/" className="text-sm font-semibold tracking-[0.18em] text-cyan-200">PHOENIX</a><div className="mt-7 border border-[#1e2a40] bg-[#0d1727] p-6"><p className="text-[11px] font-bold tracking-[0.14em] text-amber-200">ADMINISTRATION · AUDITED</p><h1 className="mt-2 text-2xl font-semibold text-white">User management</h1><p className="mt-2 text-sm text-slate-400">All balance, account-state, and market controls are server-side and create immutable audit records.</p><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search email or username" className="mt-5 w-full border border-[#2a3a54] bg-[#07101e] px-3 py-3 text-sm" /><form onSubmit={adjustBalance} className="mt-6 grid gap-3 border border-[#1e2a40] bg-[#07101e] p-4 md:grid-cols-2"><select value={operation} onChange={(event) => setOperation(event.target.value as typeof operation)} className="border border-[#2a3a54] bg-[#0d1727] px-3 py-2 text-sm"><option value="credit">Credit balance</option><option value="debit">Debit balance</option><option value="set">Set balance</option><option value="reset">Reset all portfolio balances</option></select><input required value={userId} onChange={(event) => setUserId(event.target.value)} placeholder="User UUID" className="border border-[#2a3a54] bg-[#0d1727] px-3 py-2 text-sm" />{operation !== "reset" ? <><input required value={asset} onChange={(event) => setAsset(event.target.value.toUpperCase())} placeholder="Asset" className="border border-[#2a3a54] bg-[#0d1727] px-3 py-2 text-sm" /><input required value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder={operation === "set" ? "New balance" : "Amount"} className="border border-[#2a3a54] bg-[#0d1727] px-3 py-2 text-sm" /></> : <p className="self-center text-sm text-amber-200 md:col-span-2">This permanently records balancing ledger entries that reset every current asset balance to zero.</p>}<input required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Reason (recorded in audit log)" className="border border-[#2a3a54] bg-[#0d1727] px-3 py-2 text-sm md:col-span-2" /><button className="bg-cyan-300 px-4 py-2 text-sm font-bold text-[#07101e] md:col-span-2">Apply audited action</button></form><pre className="mt-6 max-h-[550px] overflow-auto border border-[#1e2a40] bg-[#07101e] p-4 font-mono text-xs leading-6 text-slate-300">{data ? JSON.stringify(data, null, 2) : "Loading…"}</pre>{message ? <p role="status" className="mt-4 text-sm text-cyan-200">{message}</p> : null}</div></section></main>;
};
