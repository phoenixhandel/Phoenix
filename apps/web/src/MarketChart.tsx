import { CandlestickSeries, createChart, HistogramSeries, type Time } from "lightweight-charts";
import { useEffect, useRef, useState } from "react";
import type { Candle } from "./exchange-store";

const candles = [
  { time: 1_787_530_400 as Time, open: 64_090, high: 64_210, low: 64_010, close: 64_160 },
  { time: 1_787_534_000 as Time, open: 64_160, high: 64_240, low: 64_080, close: 64_110 },
  { time: 1_787_537_600 as Time, open: 64_110, high: 64_300, low: 64_090, close: 64_270 },
  { time: 1_787_541_200 as Time, open: 64_270, high: 64_360, low: 64_180, close: 64_230 },
  { time: 1_787_544_800 as Time, open: 64_230, high: 64_330, low: 64_190, close: 64_280 }
];

export const MarketChart = ({ candles: liveCandles }: { candles?: Candle[] }) => {
  const container = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<{ time: string; open: number; high: number; low: number; close: number } | null>(null);

  useEffect(() => {
    if (!container.current || typeof ResizeObserver === "undefined") {
      return;
    }

    const chart = createChart(container.current, {
      autoSize: true,
      height: 360,
      layout: { background: { color: "#0d1727" }, textColor: "#94a3b8", fontFamily: "Aptos, Segoe UI Variable, ui-sans-serif, system-ui" },
      grid: { vertLines: { color: "#172337" }, horzLines: { color: "#172337" } },
      rightPriceScale: { borderColor: "#1d2a40" },
      timeScale: { borderColor: "#1d2a40", timeVisible: true }
    });
    const series = chart.addSeries(CandlestickSeries, {
      upColor: "#2dd4a8",
      downColor: "#f07088",
      borderVisible: false,
      wickUpColor: "#2dd4a8",
      wickDownColor: "#f07088"
    });
    const data = liveCandles?.length ? liveCandles.map((candle) => ({ time: Math.floor(new Date(candle.openTime).getTime() / 1000) as Time, open: Number(candle.open), high: Number(candle.high), low: Number(candle.low), close: Number(candle.close), volume: Number(candle.volume ?? 0) })) : candles.map((candle) => ({ ...candle, volume: 0 }));
    series.setData(data);
    const volume = chart.addSeries(HistogramSeries, { priceFormat: { type: "volume" }, priceScaleId: "" });
    volume.setData(data.map((candle) => ({ time: candle.time, value: candle.volume, color: candle.close >= candle.open ? "#2dd4a855" : "#f0708855" })));
    chart.timeScale().fitContent();
    chart.subscribeCrosshairMove((event) => {
      const value = event.seriesData.get(series);
      if (!event.time || !value || !("open" in value) || !("high" in value) || !("low" in value) || !("close" in value)) { setTooltip(null); return; }
      const epoch = typeof event.time === "number" ? event.time : Date.parse(String(event.time)) / 1000;
      setTooltip({ time: new Date(epoch * 1000).toLocaleString(), open: value.open, high: value.high, low: value.low, close: value.close });
    });

    return () => chart.remove();
  }, [liveCandles]);

  return <div className="relative"><div ref={container} aria-label="BTC USDT candlestick chart" className="h-[360px] w-full" />{tooltip ? <div className="pointer-events-none absolute left-3 top-3 border border-[#2a3a54] bg-[#07101e]/95 px-3 py-2 font-mono text-[10px] leading-5 text-slate-300 shadow-xl"><div className="mb-1 text-slate-500">{tooltip.time}</div><div>O {tooltip.open.toFixed(2)} · H {tooltip.high.toFixed(2)}</div><div>L {tooltip.low.toFixed(2)} · C {tooltip.close.toFixed(2)}</div></div> : null}</div>;
};
