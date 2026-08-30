import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { registerPortfolioRoutes } from "./routes.js";
import type { LedgerPool } from "../ledger/credit-service.js";

const pool: LedgerPool = {
  connect: async () => ({
    query: async <Row extends Record<string, unknown>>() => ({ rows: [{ asset_symbol: "BTC", balance: "1.000000000000" }, { asset_symbol: "USDT", balance: "100.000000000000" }] as unknown as Row[] }),
    release: () => undefined
  })
};

describe("portfolio route", () => {
  it("returns the authenticated user's string-valued balance projection", async () => {
    const app = express();
    registerPortfolioRoutes(app, {
      auth: { getUser: async () => ({ id: "auth-1", email: "user@example.test", emailVerified: true }) },
      users: { findByAuthUserId: async () => ({ userId: "user-1", role: "USER", accountStatus: "ACTIVE", tradingStatus: "ENABLED", emailVerified: true, kycStatus: "NOT_STARTED" }) },
      pool
    });

    const response = await request(app).get("/api/me/portfolio").set("authorization", "Bearer valid");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ userId: "user-1", balances: { BTC: "1.000000000000", USDT: "100.000000000000" } });
  });
});
