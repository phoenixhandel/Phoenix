import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../app.js";
import type { AuthProvider, UserDirectory } from "../auth/session.js";
import type { LedgerPool } from "../ledger/credit-service.js";

const config = {
  corsOrigin: "http://localhost:5173",
  databaseUrl: "postgresql://phoenix:phoenix@localhost:5432/phoenix",
  marketProvider: "binance" as const,
  requireKycForTrading: false,
  port: 3001,
  supabaseUrl: undefined,
  supabaseAnonKey: undefined
};

const ledgerPool: LedgerPool = {
  connect: async () => ({
    query: async <Row extends Record<string, unknown>>(statement: string) => {
      if (statement.includes("INSERT INTO ledger_transactions")) {
        return { rows: [{ transaction_id: "credit-transaction" }] as unknown as Row[] };
      }
      if (statement.includes("balance > 0") && statement.includes("FOR UPDATE")) {
        return { rows: [{ asset_symbol: "BTC", balance: "1.000000000000" }, { asset_symbol: "USDT", balance: "2.000000000000" }] as unknown as Row[] };
      }
      if (statement.includes("asset_symbol = ANY")) {
        return { rows: [
          { account_id: "btc-user", asset_symbol: "BTC", owner_user_id: "target-user" },
          { account_id: "btc-adjustment", asset_symbol: "BTC", owner_user_id: null },
          { account_id: "usdt-user", asset_symbol: "USDT", owner_user_id: "target-user" },
          { account_id: "usdt-adjustment", asset_symbol: "USDT", owner_user_id: null }
        ] as unknown as Row[] };
      }
      if (statement.includes("owner_user_id = $1")) {
        return { rows: [{ account_id: "user-account" }] as unknown as Row[] };
      }
      if (statement.includes("owner_user_id IS NULL")) {
        return { rows: [{ account_id: "adjustment-account" }] as unknown as Row[] };
      }
      if (statement.includes("FOR UPDATE")) {
        return { rows: [{ balance: "1.000000000000" }] as unknown as Row[] };
      }

      return { rows: [] as Row[] };
    },
    release: () => undefined
  })
};

const dependencies = (role: "USER" | "ADMIN") => ({
  auth: { getUser: async () => ({ id: "auth-user", email: "admin@example.test", emailVerified: true }) } satisfies AuthProvider,
  users: {
    findByAuthUserId: async () => ({ userId: "admin-user", role, accountStatus: "ACTIVE", tradingStatus: "ENABLED", emailVerified: true, kycStatus: "VERIFIED" })
  } satisfies UserDirectory,
  ledgerPool
});

describe("administrator balance routes", () => {
  it("denies a balance credit to a normal user", async () => {
    const response = await request(createApp(config, dependencies("USER")))
      .post("/api/admin/users/target-user/balance/credit")
      .set("authorization", "Bearer valid-token")
      .set("idempotency-key", "credit-route-1")
      .send({ asset: "BTC", amount: "0.25" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: { code: "ADMIN_REQUIRED" } });
  });

  it("allows an administrator credit without a client-supplied reason", async () => {
    const response = await request(createApp(config, dependencies("ADMIN")))
      .post("/api/admin/users/target-user/balance/credit")
      .set("authorization", "Bearer valid-token")
      .set("idempotency-key", "credit-route-1")
      .send({ asset: "BTC", amount: "0.25" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ transactionId: "credit-transaction", idempotent: false });
  });

  it("allows an administrator to submit a protected debit", async () => {
    const response = await request(createApp(config, dependencies("ADMIN")))
      .post("/api/admin/users/target-user/balance/debit")
      .set("authorization", "Bearer valid-token")
      .set("idempotency-key", "debit-route-1")
      .send({ asset: "BTC", amount: "0.25" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ transactionId: "credit-transaction", idempotent: false });
  });

  it("sets an exact balance through a protected historical adjustment", async () => {
    const response = await request(createApp(config, dependencies("ADMIN")))
      .put("/api/admin/users/target-user/balance")
      .set("authorization", "Bearer valid-token")
      .set("idempotency-key", "set-route-1")
      .send({ asset: "BTC", newBalance: "1.5" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ transactionId: "credit-transaction", idempotent: false, delta: "0.500000000000" });
  });

  it("resets a portfolio through the protected ledger path", async () => {
    const response = await request(createApp(config, dependencies("ADMIN")))
      .post("/api/admin/users/target-user/portfolio/reset")
      .set("authorization", "Bearer valid-token")
      .set("idempotency-key", "reset-route-1")
      .send({});

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ transactionId: "credit-transaction", idempotent: false, resetAssets: ["BTC", "USDT"] });
  });
});
