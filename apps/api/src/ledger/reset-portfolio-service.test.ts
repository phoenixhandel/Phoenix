import { describe, expect, it } from "vitest";
import { executePortfolioReset } from "./reset-portfolio-service.js";
import type { LedgerPool } from "./credit-service.js";

const pool: LedgerPool = {
  connect: async () => ({
    query: async <Row extends Record<string, unknown>>(statement: string) => {
      if (statement.includes("INSERT INTO ledger_transactions")) return { rows: [{ transaction_id: "reset-transaction" }] as unknown as Row[] };
      if (statement.includes("FROM portfolio_balances") && statement.includes("FOR UPDATE")) return { rows: [{ asset_symbol: "BTC", balance: "1.000000000000" }, { asset_symbol: "USDT", balance: "10.000000000000" }] as unknown as Row[] };
      if (statement.includes("FROM ledger_accounts")) return { rows: [{ account_id: "btc-user", asset_symbol: "BTC", owner_user_id: "user-1" }, { account_id: "btc-adjustment", asset_symbol: "BTC", owner_user_id: null }, { account_id: "usdt-user", asset_symbol: "USDT", owner_user_id: "user-1" }, { account_id: "usdt-adjustment", asset_symbol: "USDT", owner_user_id: null }] as unknown as Row[] };
      return { rows: [] as Row[] };
    },
    release: () => undefined
  })
};

describe("executePortfolioReset", () => {
  it("zeros every nonzero balance through one balanced ledger transaction", async () => {
    await expect(executePortfolioReset({ pool, targetUserId: "user-1", idempotencyKey: "reset-1" })).resolves.toEqual({ transactionId: "reset-transaction", idempotent: false, resetAssets: ["BTC", "USDT"] });
  });
});
