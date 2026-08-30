import { useEffect, useState } from "react";

type Configuration = {
  mode: "REAL" | "MANUAL";
  simulationPaused: boolean;
  tradingFee: string;
  spread: string;
  slippage: string;
  volatility: string;
  orderBookLevels: number;
};
const apiBase = import.meta.env.VITE_API_BASE_URL ?? "";

export const AdminMarketPage = () => {
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [reason, setReason] = useState("");
  const [asset, setAsset] = useState("BTC");
  const [referencePrice, setReferencePrice] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const token = window.localStorage.getItem("phoenix_access_token");

  useEffect(() => {
    if (!token) return;
    void fetch(`${apiBase}/api/admin/market/config`, { headers: { authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (!response.ok) throw new Error("Administrator access is required");
        return response.json() as Promise<{ configuration: Configuration }>;
      })
      .then((data) => setConfiguration(data.configuration))
      .catch((error: unknown) => setMessage(error instanceof Error ? error.message : "Market configuration unavailable"));
  }, [token]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token || !configuration) return;
    const response = await fetch(`${apiBase}/api/admin/market/config`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ ...configuration, reason })
    });
    if (response.ok) {
      const data = await response.json() as { configuration: Configuration };
      setConfiguration(data.configuration);
      setMessage("Audited market configuration updated.");
    } else setMessage("Market configuration was rejected.");
  };

  const saveManualPrice = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) return;
    const response = await fetch(`${apiBase}/api/admin/market/manual-prices/${encodeURIComponent(asset)}`, {
      method: "PUT",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ referencePrice, reason })
    });
    setMessage(response.ok ? `Manual ${asset} reference price saved.` : "Manual reference price was rejected.");
  };

  const numberField = (label: string, key: "tradingFee" | "spread" | "slippage" | "volatility", hint: string) => configuration ? <label className="block text-sm text-slate-300">{label}<input required inputMode="decimal" value={configuration[key]} onChange={(event) => setConfiguration({ ...configuration, [key]: event.target.value })} className="mt-1.5 w-full border border-[#2a3a54] bg-[#07101e] px-3 py-3" /><span className="mt-1 block text-xs text-slate-500">{hint}</span></label> : null;

  return <main className="min-h-screen bg-[#07101e] px-5 py-8 text-slate-100"><section className="mx-auto max-w-2xl"><a href="/admin" className="text-sm font-semibold tracking-[0.18em] text-cyan-200">PHOENIX · ADMIN</a><div className="mt-7 border border-[#1e2a40] bg-[#0d1727] p-6"><p className="text-[11px] font-bold tracking-[0.14em] text-cyan-200">MARKET CONTROL · AUDITED</p><h1 className="mt-2 text-2xl font-semibold text-white">Market controls</h1>{configuration ? <form onSubmit={save} className="mt-6 space-y-4"><label className="block text-sm text-slate-300">Mode<select value={configuration.mode} onChange={(event) => setConfiguration({ ...configuration, mode: event.target.value as Configuration["mode"] })} className="mt-1.5 w-full border border-[#2a3a54] bg-[#07101e] px-3 py-3"><option value="REAL">REAL — public Binance anchor</option><option value="MANUAL">MANUAL — administrator reference prices</option></select></label><div className="grid gap-4 sm:grid-cols-2">{numberField("Trading fee", "tradingFee", "Decimal rate, e.g. 0.001 = 0.1%.")}{numberField("Displayed spread", "spread", "Decimal rate, e.g. 0.0005 = 0.05%.")}{numberField("Execution slippage", "slippage", "Applied to order calculations.")}{numberField("Price volatility", "volatility", "Used by the market reference model.")}</div><label className="block text-sm text-slate-300">Order-book levels<input required type="number" min="20" max="50" value={configuration.orderBookLevels} onChange={(event) => setConfiguration({ ...configuration, orderBookLevels: Number(event.target.value) })} className="mt-1.5 w-full border border-[#2a3a54] bg-[#07101e] px-3 py-3" /></label><label className="flex items-center gap-3 text-sm text-slate-300"><input type="checkbox" checked={configuration.simulationPaused} onChange={(event) => setConfiguration({ ...configuration, simulationPaused: event.target.checked })} /> Pause order processing</label><label className="block text-sm text-slate-300">Audit reason<input required value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1.5 w-full border border-[#2a3a54] bg-[#07101e] px-3 py-3" /></label><button className="bg-cyan-300 px-4 py-3 text-sm font-bold text-[#07101e]">Save audited controls</button></form> : <p className="mt-6 text-sm text-slate-400">Loading configuration…</p>}<form onSubmit={saveManualPrice} className="mt-8 border-t border-[#1e2a40] pt-6"><h2 className="text-lg font-semibold text-white">Manual reference price</h2><p className="mt-1 text-sm text-slate-400">Use this only in MANUAL mode. Prices are audited and never become live execution or custody data.</p><div className="mt-4 grid gap-3 sm:grid-cols-2"><input required value={asset} onChange={(event) => setAsset(event.target.value.toUpperCase())} placeholder="Asset, e.g. BTC" className="border border-[#2a3a54] bg-[#07101e] px-3 py-3 text-sm" /><input required inputMode="decimal" value={referencePrice} onChange={(event) => setReferencePrice(event.target.value)} placeholder="USDT reference price" className="border border-[#2a3a54] bg-[#07101e] px-3 py-3 text-sm" /></div><button className="mt-3 border border-cyan-300 px-4 py-3 text-sm font-bold text-cyan-100">Save manual price</button></form>{message ? <p role="status" className="mt-4 text-sm text-cyan-200">{message}</p> : null}</div></section></main>;
};
