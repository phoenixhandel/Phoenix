import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, Pool } from "pg";
import { executeCredit, type LedgerPool } from "./credit-service.js";
import { executeSetBalance } from "./set-balance-service.js";
import { executePortfolioReset } from "./reset-portfolio-service.js";

const databaseName = "phoenix_api_ledger_test";
const baseUrl = new URL(
  process.env.DATABASE_URL ?? "postgresql://phoenix:phoenix@localhost:5432/phoenix"
);
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${databaseName}`;

const admin = new Client({ connectionString: baseUrl.toString() });
const database = new Client({ connectionString: testUrl.toString() });
const pool = new Pool({ connectionString: testUrl.toString() });
const userId = randomUUID();

const migrate = async () => {
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  const migrationsDirectory = path.resolve(currentDirectory, "../../../../database/migrations");
  const migrationNames = (await readdir(migrationsDirectory)).filter((name) => name.endsWith(".sql")).sort();

  for (const name of migrationNames) {
    await database.query(await readFile(path.join(migrationsDirectory, name), "utf8"));
  }
};

beforeAll(async () => {
  await admin.connect();
  await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1", [databaseName]);
  await admin.query(`DROP DATABASE IF EXISTS ${databaseName}`);
  await admin.query(`CREATE DATABASE ${databaseName}`);
  await database.connect();
  await migrate();

  await database.query(
    "INSERT INTO users (user_id, auth_user_id, username, email) VALUES ($1, $2, 'ledger_tester', 'ledger@example.test')",
    [userId, randomUUID()]
  );
  await database.query("INSERT INTO assets (symbol, name) VALUES ('BTC', 'Bitcoin')");
  await database.query(
    "INSERT INTO ledger_accounts (owner_user_id, asset_symbol, account_type) VALUES ($1, 'BTC', 'USER'), (NULL, 'BTC', 'SYSTEM_ADJUSTMENT')",
    [userId]
  );
});

afterAll(async () => {
  await pool.end();
  await database.end();
  await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1", [databaseName]);
  await admin.query(`DROP DATABASE IF EXISTS ${databaseName}`);
  await admin.end();
});

describe("executeCredit integration", () => {
  it("persists exactly one balanced ledger transaction and balance projection per idempotency key", async () => {
    const input = {
      pool: pool as LedgerPool,
      targetUserId: userId,
      asset: "BTC",
      amount: "0.250000000000",
      idempotencyKey: "integration-credit-1"
    };

    await expect(executeCredit(input)).resolves.toEqual({ transactionId: expect.any(String), idempotent: false });
    await expect(executeCredit(input)).resolves.toEqual({ transactionId: expect.any(String), idempotent: true });

    const balance = await database.query<{ balance: string }>(
      "SELECT balance::text AS balance FROM portfolio_balances WHERE user_id = $1 AND asset_symbol = 'BTC'",
      [userId]
    );
    const entries = await database.query<{ entry_count: string; total: string }>(
      "SELECT count(*)::text AS entry_count, sum(entry.amount_delta)::text AS total FROM ledger_entries entry JOIN ledger_transactions transaction_record ON transaction_record.transaction_id = entry.transaction_id WHERE transaction_record.idempotency_key = 'integration-credit-1'"
    );

    expect(balance.rows).toEqual([{ balance: "0.250000000000" }]);
    expect(entries.rows).toEqual([{ entry_count: "2", total: "0.000000000000" }]);
  });

  it("sets and resets balances through balanced, immutable ledger transactions", async () => {
    const set = await executeSetBalance({ pool: pool as LedgerPool, targetUserId: userId, actorUserId: userId, asset: "BTC", newBalance: "0.500000000000", idempotencyKey: "integration-set-1", notes: "Test adjustment" });
    expect(set).toMatchObject({ idempotent: false, delta: "0.250000000000" });
    const reset = await executePortfolioReset({ pool: pool as LedgerPool, targetUserId: userId, actorUserId: userId, idempotencyKey: "integration-reset-1", notes: "Test reset" });
    expect(reset).toMatchObject({ idempotent: false, resetAssets: ["BTC"] });
    const balance = await database.query<{ balance: string }>("SELECT balance::text AS balance FROM portfolio_balances WHERE user_id = $1 AND asset_symbol = 'BTC'", [userId]);
    const unbalanced = await database.query<{ count: string }>("SELECT count(*)::text AS count FROM (SELECT entry.transaction_id FROM ledger_entries entry JOIN ledger_accounts account ON account.account_id = entry.account_id GROUP BY entry.transaction_id, account.asset_symbol HAVING sum(entry.amount_delta) <> 0) invalid");
    expect(balance.rows).toEqual([{ balance: "0.000000000000" }]);
    expect(unbalanced.rows).toEqual([{ count: "0" }]);
  });
});
