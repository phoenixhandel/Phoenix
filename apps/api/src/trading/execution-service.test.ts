import { describe, expect, it } from "vitest";
import { executeMarketOrder } from "./execution-service.js";
import type { LedgerPool } from "../ledger/credit-service.js";

const createPool = (): { calls: string[]; pool: LedgerPool } => {
  const calls: string[] = [];
  const client = {
    query: async <Row extends Record<string, unknown>>(statement: string) => {
      calls.push(statement);
      if (statement.includes("FROM trading_pairs")) return { rows: [{ base_asset: "BTC", quote_asset: "USDT" }] as unknown as Row[] };
      if (statement.includes("INSERT INTO ledger_transactions")) return { rows: [{ transaction_id: "ledger-transaction" }] as unknown as Row[] };
      if (statement.includes("FROM portfolio_balances") && statement.includes("FOR UPDATE")) return { rows: [{ asset_symbol: "BTC", balance: "0.000000000000" }, { asset_symbol: "USDT", balance: "1000.000000000000" }] as unknown as Row[] };
      if (statement.includes("FROM ledger_accounts")) return { rows: [
        { account_id: "btc-user", asset_symbol: "BTC", account_type: "USER" },
        { account_id: "usdt-user", asset_symbol: "USDT", account_type: "USER" },
        { account_id: "btc-liquidity", asset_symbol: "BTC", account_type: "SYSTEM_LIQUIDITY" },
        { account_id: "usdt-liquidity", asset_symbol: "USDT", account_type: "SYSTEM_LIQUIDITY" },
        { account_id: "usdt-fees", asset_symbol: "USDT", account_type: "SYSTEM_FEES" }
      ] as unknown as Row[] };
      if (statement.includes("INSERT INTO trades")) return { rows: [{ trade_id: "trade-1" }] as unknown as Row[] };
      return { rows: [] as Row[] };
    },
    release: () => undefined
  };
  return { calls, pool: { connect: async () => client } };
};

describe("executeMarketOrder", () => {
  it("locks balances and commits the trade, ledger, and projections together", async () => {
    const { calls, pool } = createPool();

    await expect(
      executeMarketOrder({
        pool,
        userId: "user-1",
        pair: "BTCUSDT",
        side: "BUY",
        baseAmount: "2",
        marketPrice: "100",
        spread: "0.0004",
        slippage: "0.0001",
        feeRate: "0.001",
        idempotencyKey: "trade-1"
      })
    ).resolves.toMatchObject({ tradeId: "trade-1", idempotent: false, executionPrice: "100.050000000000" });

    expect(calls).toEqual(expect.arrayContaining(["BEGIN", "COMMIT", expect.stringContaining("FOR UPDATE"), expect.stringContaining("INSERT INTO trades"), expect.stringContaining("INSERT INTO ledger_entries")]));
  });
});
