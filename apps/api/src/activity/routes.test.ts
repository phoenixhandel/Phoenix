import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { registerActivityRoutes } from "./routes.js";
import type { LedgerPool } from "../ledger/credit-service.js";

const pool: LedgerPool = { connect: async () => ({ query: async <Row extends Record<string, unknown>>(sql: string) => ({ rows: [sql.includes("FROM trades") ? { trade_id: "trade", pair_symbol: "BTCUSDT", side: "BUY", base_amount: "0.1", quote_amount: "100", market_price: "1000", execution_price: "1001", fee_asset: "USDT", fee_amount: "0.1", created_at: "2026-08-24T00:00:00.000Z" } : { event_id: "event", event_type: "TRADE_EXECUTED", metadata: {}, created_at: "2026-08-24T00:00:00.000Z" }] as unknown as Row[] }), release: () => undefined }) };
const dependencies = { auth: { getUser: async () => ({ id: "auth", email: "user@test", emailVerified: true }) }, users: { findByAuthUserId: async () => ({ userId: "user", role: "USER" as const, accountStatus: "ACTIVE" as const, tradingStatus: "ENABLED" as const, emailVerified: true, kycStatus: "VERIFIED" as const }) }, pool };

describe("activity routes", () => {
  it("returns a signed-in user's own trades and activity", async () => {
    const app = express(); registerActivityRoutes(app, dependencies);
    const headers = { authorization: "Bearer token" };
    expect((await request(app).get("/api/me/trades").set(headers)).body.trades[0]).toEqual(expect.objectContaining({ tradeId: "trade" }));
    expect((await request(app).get("/api/me/activity").set(headers)).body.events[0]).toEqual(expect.objectContaining({ eventId: "event" }));
  });
});
