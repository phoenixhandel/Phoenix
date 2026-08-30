import { describe, expect, it } from "vitest";
import { executeFee } from "./fee-service.js";
import type { LedgerPool } from "./credit-service.js";

describe("executeFee", () => {
  it("charges a user only through a balanced fee transaction", async () => {
    const calls: string[] = [];
    const pool: LedgerPool = { connect: async () => ({ query: async <Row extends Record<string, unknown>>(sql: string) => { calls.push(sql); if (sql.includes("INSERT INTO ledger_transactions")) return { rows: [{ transaction_id: "fee" }] as unknown as Row[] }; if (sql.includes("FOR UPDATE")) return { rows: [{ balance: "2" }] as unknown as Row[] }; if (sql.includes("ledger_accounts")) return { rows: [{ account_id: "user", account_type: "USER" }, { account_id: "fees", account_type: "SYSTEM_FEES" }] as unknown as Row[] }; return { rows: [] as Row[] }; }, release: () => undefined }) };
    await expect(executeFee({ pool, userId: "user-id", asset: "USDT", amount: "0.1", idempotencyKey: "fee-1" })).resolves.toEqual({ transactionId: "fee", idempotent: false });
    expect(calls).toEqual(expect.arrayContaining([expect.stringContaining("SYSTEM_FEES"), expect.stringContaining("INSERT INTO ledger_entries")]));
  });
});
