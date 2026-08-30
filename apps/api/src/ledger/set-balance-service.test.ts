import { describe, expect, it } from "vitest";
import { executeSetBalance } from "./set-balance-service.js";
import type { LedgerPool } from "./credit-service.js";

const pool: LedgerPool = {
  connect: async () => ({
    query: async <Row extends Record<string, unknown>>(statement: string) => {
      if (statement.includes("INSERT INTO ledger_transactions")) return { rows: [{ transaction_id: "set-transaction" }] as unknown as Row[] };
      if (statement.includes("owner_user_id = $1")) return { rows: [{ account_id: "user-account" }] as unknown as Row[] };
      if (statement.includes("owner_user_id IS NULL")) return { rows: [{ account_id: "adjustment-account" }] as unknown as Row[] };
      if (statement.includes("FOR UPDATE")) return { rows: [{ balance: "0.500000000000" }] as unknown as Row[] };
      return { rows: [] as Row[] };
    },
    release: () => undefined
  })
};

describe("executeSetBalance", () => {
  it("records only the delta required to reach the requested balance", async () => {
    await expect(executeSetBalance({ pool, targetUserId: "user-1", asset: "BTC", newBalance: "1.5", idempotencyKey: "set-1" })).resolves.toEqual({ transactionId: "set-transaction", idempotent: false, delta: "1.000000000000" });
  });
});
