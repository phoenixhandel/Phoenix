import { describe, expect, it } from "vitest";
import { executeCredit } from "./credit-service.js";

type Call = { statement: string; values?: readonly unknown[] };

const createPool = ({ existing = false, failAt }: { existing?: boolean; failAt?: string } = {}) => {
  const calls: Call[] = [];
  const client = {
    query: async <Row extends Record<string, unknown>>(statement: string, values?: readonly unknown[]) => {
      calls.push({ statement, ...(values ? { values } : {}) });

      if (failAt && statement.includes(failAt)) {
        throw new Error("database write failed");
      }
      if (statement.includes("INSERT INTO ledger_transactions")) {
        return { rows: (existing ? [] : [{ transaction_id: "new-transaction" }]) as unknown as Row[] };
      }
      if (statement.includes("SELECT transaction_id FROM ledger_transactions")) {
        return { rows: [{ transaction_id: "existing-transaction" }] as unknown as Row[] };
      }
      if (statement.includes("owner_user_id = $1")) {
        return { rows: [{ account_id: "user-account" }] as unknown as Row[] };
      }
      if (statement.includes("owner_user_id IS NULL")) {
        return { rows: [{ account_id: "adjustment-account" }] as unknown as Row[] };
      }

      return { rows: [] as Row[] };
    },
    release: () => undefined
  };

  return { calls, pool: { connect: async () => client } };
};

describe("executeCredit", () => {
  it("writes a balanced, fixed-precision credit and projection atomically", async () => {
    const { calls, pool } = createPool();

    await expect(
      executeCredit({
        pool,
        targetUserId: "user-1",
        asset: "BTC",
        amount: "0.25",
        idempotencyKey: "credit-1"
      })
    ).resolves.toEqual({ transactionId: "new-transaction", idempotent: false });

    expect(calls.map(({ statement }) => statement)).toEqual(
      expect.arrayContaining([
        "BEGIN",
        "COMMIT",
        expect.stringContaining("INSERT INTO ledger_entries"),
        expect.stringContaining("FOR UPDATE"),
        expect.stringContaining("UPDATE portfolio_balances")
      ])
    );
    expect(calls.find(({ statement }) => statement.includes("INSERT INTO ledger_entries"))?.values).toEqual([
      "new-transaction",
      "user-account",
      "0.250000000000",
      "adjustment-account"
    ]);
  });

  it("returns the original transaction for a repeated idempotency key", async () => {
    const { calls, pool } = createPool({ existing: true });

    await expect(
      executeCredit({
        pool,
        targetUserId: "user-1",
        asset: "BTC",
        amount: "0.25",
        idempotencyKey: "credit-1"
      })
    ).resolves.toEqual({ transactionId: "existing-transaction", idempotent: true });

    expect(calls.some(({ statement }) => statement.includes("INSERT INTO ledger_entries"))).toBe(false);
  });

  it("rolls back if any ledger write fails", async () => {
    const { calls, pool } = createPool({ failAt: "INSERT INTO ledger_entries" });

    await expect(
      executeCredit({
        pool,
        targetUserId: "user-1",
        asset: "BTC",
        amount: "0.25",
        idempotencyKey: "credit-1"
      })
    ).rejects.toThrow("database write failed");

    expect(calls.map(({ statement }) => statement)).toContain("ROLLBACK");
  });
});
