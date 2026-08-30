import { useEffect, useState } from "react";

const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

type AdminUser = {
  userId: string;
  email: string | null;
  role: string;
  accountStatus: string;
  emailVerified: boolean;
};
type Portfolio = { balances?: Record<string, string> };
type Operation = "credit" | "debit" | "set" | "reset";

const statusTone = (status: string) => status === "ACTIVE" ? "text-emerald-300" : "text-amber-200";

export const AdminPage = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [asset, setAsset] = useState("USDT");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [operation, setOperation] = useState<Operation>("set");
  const token = window.localStorage.getItem("phoenix_access_token");
  const selectedUser = users.find(({ userId }) => userId === selectedUserId) ?? null;
  const walletRows = Object.entries(portfolio?.balances ?? {});

  useEffect(() => {
    if (!token) { setMessage("Sign in with an administrator account to continue."); return; }
    const query = search.trim() ? `?q=${encodeURIComponent(search.trim())}` : "";
    void fetch(`${apiBase}/api/admin/users${query}`, { headers: { authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Administrator access is required");
        return response.json() as Promise<{ users?: AdminUser[] }>;
      })
      .then(({ users: nextUsers = [] }) => {
        setUsers(nextUsers);
        setSelectedUserId((current) => nextUsers.some(({ userId }) => userId === current) ? current : nextUsers[0]?.userId ?? null);
      })
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Admin data unavailable"));
  }, [search, token]);

  useEffect(() => {
    if (!token || !selectedUserId) { setPortfolio(null); return; }
    setPortfolio(null);
    void fetch(`${apiBase}/api/admin/users/${selectedUserId}/portfolio`, { headers: { authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Wallet data unavailable");
        return response.json() as Promise<Portfolio>;
      })
      .then(setPortfolio)
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Wallet data unavailable"));
  }, [selectedUserId, token]);

  const applyBalanceChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !selectedUserId) { setMessage("Select a user first."); return; }
    const url = operation === "reset" ? `/api/admin/users/${selectedUserId}/portfolio/reset` : operation === "set" ? `/api/admin/users/${selectedUserId}/balance` : `/api/admin/users/${selectedUserId}/balance/${operation}`;
    const body = operation === "reset" ? { reason } : operation === "set" ? { asset, newBalance: amount, reason } : { asset, amount, reason };
    const response = await fetch(`${apiBase}${url}`, {
      method: operation === "set" ? "PUT" : "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json", "idempotency-key": crypto.randomUUID() },
      body: JSON.stringify(body)
    });
    if (!response.ok) { setMessage("The balance update was rejected."); return; }
    setMessage("Balance update recorded in the audit log.");
    const refreshed = await fetch(`${apiBase}/api/admin/users/${selectedUserId}/portfolio`, { headers: { authorization: `Bearer ${token}` } });
    if (refreshed.ok) setPortfolio(await refreshed.json() as Portfolio);
  };

  return (
    <main className="min-h-screen bg-[#07101e] px-5 py-8 text-slate-100 sm:px-8">
      <section className="mx-auto max-w-6xl">
        <a href="/" className="text-sm font-semibold tracking-[0.18em] text-cyan-200">PHOENIX · ADMIN</a>
        <header className="mt-7 border border-[#1e2a40] bg-[#0d1727] px-6 py-7">
          <p className="text-[11px] font-bold tracking-[0.14em] text-amber-200">ADMINISTRATION · AUDITED</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-white">Accounts and wallets</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Select an account, review its wallet balances, and record a protected adjustment. Every change is server-authorized and added to the audit log.</p>
        </header>

        <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(260px,.75fr)_minmax(0,1.25fr)]">
          <section className="border border-[#1e2a40] bg-[#0d1727]">
            <div className="border-b border-[#1e2a40] p-4">
              <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Find account<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Email or username" className="mt-2 w-full border border-[#2a3a54] bg-[#07101e] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300" /></label>
            </div>
            <div className="max-h-[560px] overflow-y-auto p-2">
              {users.map((user) => <button key={user.userId} type="button" aria-pressed={selectedUserId === user.userId} onClick={() => setSelectedUserId(user.userId)} className={`mb-1 w-full border p-3 text-left transition ${selectedUserId === user.userId ? "border-cyan-300/70 bg-cyan-300/10" : "border-transparent hover:border-[#2a3a54] hover:bg-[#101d30]"}`}><div className="flex items-start justify-between gap-3"><span className="min-w-0 truncate text-sm font-semibold text-white">{user.email ?? user.userId}</span><span className={`text-[10px] font-bold ${statusTone(user.accountStatus)}`}>{user.accountStatus}</span></div><p className="mt-1 font-mono text-[11px] text-slate-500">{user.userId}</p><p className="mt-2 text-xs text-slate-400">{user.emailVerified ? "Email verified" : "Email not verified"} · {user.role}</p></button>)}
              {!users.length ? <p className="p-4 text-sm text-slate-500">No matching accounts.</p> : null}
            </div>
          </section>

          <div className="space-y-5">
            <section className="border border-[#1e2a40] bg-[#0d1727]">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#1e2a40] px-5 py-4"><div><p className="text-[11px] font-bold tracking-[0.12em] text-cyan-200">SELECTED ACCOUNT</p><h2 className="mt-1 break-all text-lg font-semibold text-white">{selectedUser?.email ?? "Select an account"}</h2></div>{selectedUser ? <span className={`text-xs font-semibold ${statusTone(selectedUser.accountStatus)}`}>{selectedUser.accountStatus}</span> : null}</div>
              <div className="divide-y divide-[#1e2a40]">
                {walletRows.map(([symbol, balance]) => <div key={symbol} className="flex items-center justify-between px-5 py-3.5"><span className="font-mono text-sm font-semibold text-slate-200">{symbol}</span><span className="font-mono text-sm tabular-nums text-white">{balance}</span></div>)}
                {selectedUser && !portfolio ? <p className="px-5 py-8 text-sm text-slate-500">Loading wallets…</p> : null}
                {portfolio && !walletRows.length ? <p className="px-5 py-8 text-sm text-slate-500">No wallet rows are available.</p> : null}
              </div>
            </section>

            <form onSubmit={(event) => void applyBalanceChange(event)} className="border border-[#1e2a40] bg-[#0d1727] p-5">
              <div className="flex items-center justify-between gap-4"><div><p className="text-[11px] font-bold tracking-[0.12em] text-amber-200">BALANCE CONTROL</p><h2 className="mt-1 text-lg font-semibold text-white">Record an adjustment</h2></div><a href="/admin/audit" className="text-sm font-semibold text-cyan-200 hover:text-cyan-100">Audit log →</a></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Action<select value={operation} onChange={(event) => setOperation(event.target.value as Operation)} className="mt-2 w-full border border-[#2a3a54] bg-[#07101e] px-3 py-2.5 text-sm text-white outline-none"><option value="set">Set exact balance</option><option value="credit">Credit balance</option><option value="debit">Debit balance</option><option value="reset">Reset all wallets</option></select></label>{operation !== "reset" ? <><label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">Asset<select value={asset} onChange={(event) => setAsset(event.target.value)} className="mt-2 w-full border border-[#2a3a54] bg-[#07101e] px-3 py-2.5 text-sm text-white outline-none">{walletRows.map(([symbol]) => <option key={symbol}>{symbol}</option>)}</select></label><label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 sm:col-span-2">{operation === "set" ? "New balance" : "Amount"}<input aria-label="Amount" required value={amount} onChange={(event) => setAmount(event.target.value)} inputMode="decimal" placeholder="0.00000000" className="mt-2 w-full border border-[#2a3a54] bg-[#07101e] px-3 py-2.5 font-mono text-sm text-white outline-none transition focus:border-cyan-300" /></label></> : <p className="self-end text-sm leading-6 text-amber-100 sm:col-span-2">This records balancing ledger entries that set every current wallet to zero.</p>}<label className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500 sm:col-span-2">Reason for audit trail<input required value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is this adjustment needed?" className="mt-2 w-full border border-[#2a3a54] bg-[#07101e] px-3 py-2.5 text-sm text-white outline-none transition focus:border-cyan-300" /></label></div>
              <button disabled={!selectedUser} className="mt-4 min-h-11 bg-cyan-300 px-4 text-sm font-bold text-[#07101e] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400">Apply balance update</button>
              {message ? <p role="status" className="mt-3 text-sm text-cyan-100">{message}</p> : null}
            </form>
          </div>
        </div>
      </section>
    </main>
  );
};
