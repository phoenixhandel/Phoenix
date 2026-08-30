import { describe, expect, it } from "vitest";
import { executeTransfer } from "./transfer-service.js";
import type { LedgerPool } from "./credit-service.js";

describe("executeTransfer", () => {
  it("locks both users, rejects insufficient funds, and records one balanced transfer", async () => {
    const calls: string[] = [];
    const pool: LedgerPool = { connect: async () => ({ query: async <Row extends Record<string, unknown>>(sql: string) => { calls.push(sql); if (sql.includes("INSERT INTO ledger_transactions")) return { rows: [{ transaction_id: "transfer" }] as unknown as Row[] }; if (sql.includes("portfolio_balances") && sql.includes("FOR UPDATE")) return { rows: [{ user_id: "from", balance: "2" }, { user_id: "to", balance: "0" }] as unknown as Row[] }; if (sql.includes("ledger_accounts")) return { rows: [{ account_id: "from-account", owner_user_id: "from" }, { account_id: "to-account", owner_user_id: "to" }] as unknown as Row[] }; return { rows: [] as Row[] }; }, release: () => undefined }) };
    await expect(executeTransfer({ pool, sourceUserId: "from", targetUserId: "to", asset: "BTC", amount: "1.25", idempotencyKey: "transfer-1" })).resolves.toEqual({ transactionId: "transfer", idempotent: false });
    expect(calls).toEqual(expect.arrayContaining(["BEGIN", "COMMIT", expect.stringContaining("FOR UPDATE"), expect.stringContaining("INSERT INTO ledger_entries")]));
  });
});
