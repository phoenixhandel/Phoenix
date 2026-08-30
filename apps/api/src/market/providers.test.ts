import { describe, expect, it } from "vitest";
import { BinanceMarketProvider, DatabaseMarketProvider, ManualMarketProvider } from "./providers.js";
import type { LedgerPool } from "../ledger/credit-service.js";

describe("market providers", () => {
  it("uses only Binance public market-data endpoints", async () => {
    const calls: string[] = [];
    const provider = new BinanceMarketProvider({
      fetcher: async (input) => {
        calls.push(String(input));
        return new Response(JSON.stringify({ symbol: "BTCUSDT", price: "64000.25" }), { status: 200 });
      }
    });

    await expect(provider.getTicker("BTCUSDT")).resolves.toMatchObject({
      symbol: "BTCUSDT",
      price: "64000.250000000000",
      source: "BINANCE"
    });
    expect(calls).toEqual(["https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT"]);
  });

  it("returns deterministic manual prices without external calls", async () => {
    const provider = new ManualMarketProvider({ BTCUSDT: "65000" });

    await expect(provider.getTicker("BTCUSDT")).resolves.toMatchObject({
      symbol: "BTCUSDT",
      price: "65000.000000000000",
      source: "MANUAL"
    });
  });

  it("uses audited manual reference prices when the database simulation mode is MANUAL", async () => {
    const pool: LedgerPool = { connect: async () => ({ query: async <Row extends Record<string, unknown>>(sql: string) => ({ rows: [sql.includes("market_configuration") ? { mode: "MANUAL" } : { reference_price: "65000" }] as unknown as Row[] }), release: () => undefined }) };
    const provider = new DatabaseMarketProvider(pool, new ManualMarketProvider({ BTCUSDT: "1" }));
    await expect(provider.getTicker("BTCUSDT")).resolves.toMatchObject({ price: "65000.000000000000", source: "MANUAL" });
  });

  it("keeps the public reference feed available when local PostgreSQL is offline", async () => {
    const pool: LedgerPool = { connect: async () => { throw new Error("database unavailable"); } };
    const provider = new DatabaseMarketProvider(pool, new ManualMarketProvider({ BTCUSDT: "64000" }));

    await expect(provider.getTicker("BTCUSDT")).resolves.toMatchObject({
      price: "64000.000000000000",
      source: "MANUAL"
    });
  });
});
