import { randomUUID } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Client, Pool } from "pg";
import { executeMarketOrder } from "./execution-service.js";
import type { LedgerPool } from "../ledger/credit-service.js";

const databaseName = "phoenix_api_trade_test";
const baseUrl = new URL(process.env.DATABASE_URL ?? "postgresql://phoenix:phoenix@localhost:5432/phoenix");
const testUrl = new URL(baseUrl);
testUrl.pathname = `/${databaseName}`;
const admin = new Client({ connectionString: baseUrl.toString() });
const database = new Client({ connectionString: testUrl.toString() });
const pool = new Pool({ connectionString: testUrl.toString() });
const userId = randomUUID();

const migrate = async () => {
  const migrationsDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../database/migrations");
  for (const name of (await readdir(migrationsDirectory)).filter((file) => file.endsWith(".sql")).sort()) {
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
  await database.query("INSERT INTO users (user_id, auth_user_id, username, email) VALUES ($1, $2, 'trade_tester', 'trade@example.test')", [userId, randomUUID()]);
  await database.query(
    "INSERT INTO ledger_accounts (owner_user_id, asset_symbol, account_type) VALUES ($1, 'BTC', 'USER'), ($1, 'USDT', 'USER')",
    [userId]
  );
  await database.query("INSERT INTO portfolio_balances (user_id, asset_symbol, balance) VALUES ($1, 'BTC', 0), ($1, 'USDT', 1000)", [userId]);
});

afterAll(async () => {
  await pool.end();
  await database.end();
  await admin.query("SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1", [databaseName]);
  await admin.query(`DROP DATABASE IF EXISTS ${databaseName}`);
  await admin.end();
});

describe("executeMarketOrder integration", () => {
  it("atomically executes one idempotent simulated BUY with balanced entries", async () => {
    const input = {
      pool: pool as LedgerPool,
      userId,
      pair: "BTCUSDT",
      side: "BUY" as const,
      baseAmount: "2",
      marketPrice: "100",
      spread: "0.0004",
      slippage: "0.0001",
      feeRate: "0.001",
      idempotencyKey: "integration-trade-1"
    };
    await expect(executeMarketOrder(input)).resolves.toMatchObject({ idempotent: false, quoteAmount: "200.100000000000" });
    await expect(executeMarketOrder(input)).resolves.toMatchObject({ idempotent: true });

    const balances = await database.query<{ asset_symbol: string; balance: string }>(
      "SELECT asset_symbol, balance::text AS balance FROM portfolio_balances WHERE user_id = $1 ORDER BY asset_symbol",
      [userId]
    );
    const entries = await database.query<{ asset_symbol: string; total: string }>(
      "SELECT account.asset_symbol, sum(entry.amount_delta)::text AS total FROM ledger_entries entry JOIN ledger_accounts account ON account.account_id = entry.account_id GROUP BY account.asset_symbol ORDER BY account.asset_symbol"
    );
    const trades = await database.query<{ count: string }>("SELECT count(*)::text AS count FROM trades");

    expect(balances.rows).toEqual([{ asset_symbol: "BTC", balance: "2.000000000000" }, { asset_symbol: "USDT", balance: "799.699900000000" }]);
    expect(entries.rows).toEqual([{ asset_symbol: "BTC", total: "0.000000000000" }, { asset_symbol: "USDT", total: "0.000000000000" }]);
    expect(trades.rows).toEqual([{ count: "1" }]);
  });

  it("rolls back the trade and projections if a ledger entry cannot be written", async () => {
    const before = await database.query<{ balance: string }>(
      "SELECT balance::text AS balance FROM portfolio_balances WHERE user_id = $1 AND asset_symbol = 'USDT'",
      [userId]
    );

    await expect(
      executeMarketOrder({
        pool: pool as LedgerPool,
        userId,
        pair: "BTCUSDT",
        side: "BUY",
        baseAmount: "0.1",
        marketPrice: "100",
        spread: "0.0004",
        slippage: "0.0001",
        feeRate: "0",
        idempotencyKey: "integration-trade-ledger-failure"
      })
    ).rejects.toThrow();

    const after = await database.query<{ balance: string }>(
      "SELECT balance::text AS balance FROM portfolio_balances WHERE user_id = $1 AND asset_symbol = 'USDT'",
      [userId]
    );
    const failedTrade = await database.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM trades WHERE idempotency_key = 'integration-trade-ledger-failure'"
    );

    expect(after.rows).toEqual(before.rows);
    expect(failedTrade.rows).toEqual([{ count: "0" }]);
  });

  it("executes SELL by reducing base, crediting quote net of fees, and balancing every asset", async () => {
    await expect(executeMarketOrder({ pool: pool as LedgerPool, userId, pair: "BTCUSDT", side: "SELL", baseAmount: "1", marketPrice: "100", spread: "0.0004", slippage: "0.0001", feeRate: "0.001", idempotencyKey: "integration-trade-sell-1" })).resolves.toMatchObject({ idempotent: false, executionPrice: "99.950000000000", feeAmount: "0.099950000000" });
    const balances = await database.query<{ asset_symbol: string; balance: string }>("SELECT asset_symbol, balance::text AS balance FROM portfolio_balances WHERE user_id = $1 ORDER BY asset_symbol", [userId]);
    const entries = await database.query<{ asset_symbol: string; total: string }>("SELECT account.asset_symbol, sum(entry.amount_delta)::text AS total FROM ledger_entries entry JOIN ledger_accounts account ON account.account_id = entry.account_id GROUP BY account.asset_symbol ORDER BY account.asset_symbol");
    expect(balances.rows).toEqual([{ asset_symbol: "BTC", balance: "1.000000000000" }, { asset_symbol: "USDT", balance: "899.549950000000" }]);
    expect(entries.rows).toEqual([{ asset_symbol: "BTC", total: "0.000000000000" }, { asset_symbol: "USDT", total: "0.000000000000" }]);
  });

  it("prevents concurrent orders from spending the same quote balance twice", async () => {
    const input = (idempotencyKey: string) => ({ pool: pool as LedgerPool, userId, pair: "BTCUSDT", side: "BUY" as const, baseAmount: "6", marketPrice: "100", spread: "0.0004", slippage: "0.0001", feeRate: "0.001", idempotencyKey });
    const results = await Promise.allSettled([executeMarketOrder(input("integration-concurrent-1")), executeMarketOrder(input("integration-concurrent-2"))]);
    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
    const balance = await database.query<{ balance: string }>("SELECT balance::text AS balance FROM portfolio_balances WHERE user_id = $1 AND asset_symbol = 'USDT'", [userId]);
    expect(Number(balance.rows[0]?.balance)).toBeGreaterThanOrEqual(0);
  });
});
