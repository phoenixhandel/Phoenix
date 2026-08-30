import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client } from "pg";
import { loadMigrations, runMigrations } from "./migrate.js";

type SeedModule = {
  seedDevelopmentData?: (client: Client) => Promise<void>;
};

const loadSeedModule = async (): Promise<SeedModule> => {
  const entrypoint = "./seeds/dev.js";

  return import(entrypoint).catch(() => ({}));
};

const databaseName = "phoenix_test";
const baseUrl = new URL(
  process.env.DATABASE_URL ?? "postgresql://phoenix:phoenix@localhost:5432/phoenix"
);
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${databaseName}`;

const admin = new Client({ connectionString: baseUrl.toString() });
const database = new Client({ connectionString: testUrl.toString() });

beforeAll(async () => {
  await admin.connect();
  await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1", [databaseName]);
  await admin.query(`DROP DATABASE IF EXISTS ${databaseName}`);
  await admin.query(`CREATE DATABASE ${databaseName}`);

  await database.connect();
  const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
  await runMigrations(database, await loadMigrations(path.join(currentDirectory, "migrations")));
});

afterAll(async () => {
  await database.end();
  await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1", [databaseName]);
  await admin.query(`DROP DATABASE IF EXISTS ${databaseName}`);
  await admin.end();
});

describe("Phoenix core schema", () => {
  it("creates the ledger-first financial tables", async () => {
    const result = await database.query<{ table_name: string }>(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    );

    expect(result.rows.map(({ table_name }) => table_name)).toEqual(
      expect.arrayContaining([
        "users",
        "assets",
        "trading_pairs",
        "ledger_accounts",
        "ledger_transactions",
        "ledger_entries",
        "portfolio_balances",
        "trades",
        "activity_events",
        "admin_audit_events",
        "market_configuration"
      ])
    );
  });

  it("rejects a ledger transaction without balancing entries", async () => {
    await database.query("BEGIN");
    try {
      await database.query(
        "INSERT INTO ledger_transactions (transaction_type, idempotency_key) VALUES ('ADMIN_CREDIT', $1)",
        [`test-empty-${randomUUID()}`]
      );

      await expect(database.query("COMMIT")).rejects.toThrow("must contain ledger entries");
    } finally {
      await database.query("ROLLBACK").catch(() => undefined);
    }
  });

  it("rejects a negative portfolio balance", async () => {
    const userId = randomUUID();
    const authUserId = randomUUID();

    await database.query(
      "INSERT INTO users (user_id, auth_user_id, username, email) VALUES ($1, $2, $3, $4)",
      [userId, authUserId, `tester-${userId.slice(0, 8)}`, `${userId}@example.test`]
    );
    await database.query("INSERT INTO assets (symbol, name) VALUES ('TST', 'Test Asset')");

    await expect(
      database.query(
        "INSERT INTO portfolio_balances (user_id, asset_symbol, balance) VALUES ($1, 'TST', '-0.000000000001')",
        [userId]
      )
    ).rejects.toThrow();
  });

  it("creates demo balances through balanced ledger entries", async () => {
    const seed = await loadSeedModule();

    if (!seed.seedDevelopmentData) {
      expect(seed.seedDevelopmentData).toBeTypeOf("function");
      return;
    }

    await seed.seedDevelopmentData(database);

    const balance = await database.query<{ balance: string }>(
      "SELECT balance FROM portfolio_balances balance JOIN users user_record ON user_record.user_id = balance.user_id WHERE user_record.email = 'demo@phoenix.local' AND asset_symbol = 'USDT'"
    );
    const entries = await database.query<{ total: string }>(
      "SELECT sum(entry.amount_delta)::text AS total FROM ledger_entries entry JOIN ledger_transactions transaction_record ON transaction_record.transaction_id = entry.transaction_id WHERE transaction_record.idempotency_key = 'seed:demo:USDT'"
    );

    expect(balance.rows).toEqual([{ balance: "100000.000000000000" }]);
    expect(entries.rows).toEqual([{ total: "0.000000000000" }]);
  });
});
