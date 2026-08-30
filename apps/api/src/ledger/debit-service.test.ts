import { describe, expect, it } from "vitest";
import { executeDebit } from "./debit-service.js";
import type { LedgerPool } from "./credit-service.js";

const createPool = (balance: string): { calls: string[]; pool: LedgerPool } => {
  const calls: string[] = [];
  const client = {
    query: async <Row extends Record<string, unknown>>(statement: string) => {
      calls.push(statement);
      if (statement.includes("INSERT INTO ledger_transactions")) {
        return { rows: [{ transaction_id: "debit-transaction" }] as unknown as Row[] };
      }
      if (statement.includes("owner_user_id = $1")) {
        return { rows: [{ account_id: "user-account" }] as unknown as Row[] };
      }
      if (statement.includes("owner_user_id IS NULL")) {
        return { rows: [{ account_id: "adjustment-account" }] as unknown as Row[] };
      }
      if (statement.includes("FOR UPDATE")) {
        return { rows: [{ balance }] as unknown as Row[] };
      }

      return { rows: [] as Row[] };
    },
    release: () => undefined
  };

  return { calls, pool: { connect: async () => client } };
};

describe("executeDebit", () => {
  it("writes a balanced debit only after locking a sufficient balance", async () => {
    const { calls, pool } = createPool("1.000000000000");

    await expect(
      executeDebit({
        pool,
        targetUserId: "user-1",
        asset: "BTC",
        amount: "0.250000000000",
        idempotencyKey: "debit-1"
      })
    ).resolves.toEqual({ transactionId: "debit-transaction", idempotent: false });

    expect(calls).toEqual(expect.arrayContaining([expect.stringContaining("FOR UPDATE"), expect.stringContaining("balance = balance -")]));
    expect(calls).toContain("COMMIT");
  });

  it("rolls back without writing entries when the balance is insufficient", async () => {
    const { calls, pool } = createPool("0.100000000000");

    await expect(
      executeDebit({
        pool,
        targetUserId: "user-1",
        asset: "BTC",
        amount: "0.250000000000",
        idempotencyKey: "debit-1"
      })
    ).rejects.toThrow("INSUFFICIENT_BALANCE");

    expect(calls.some((statement) => statement.includes("INSERT INTO ledger_entries"))).toBe(false);
    expect(calls).toContain("ROLLBACK");
  });
});
