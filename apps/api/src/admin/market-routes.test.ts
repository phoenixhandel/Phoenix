import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { registerAdminMarketRoutes } from "./market-routes.js";
import type { LedgerPool } from "../ledger/credit-service.js";

const pool: LedgerPool = { connect: async () => ({ query: async <Row extends Record<string, unknown>>() => ({ rows: [{ mode: "REAL", trading_fee: "0.001", spread: "0.0005", slippage: "0.0005", volatility: "0.01", order_book_levels: 30, simulation_paused: false, updated_at: "2026-08-24T00:00:00.000Z" }] as unknown as Row[] }), release: () => undefined }) };
const dependencies = { auth: { getUser: async () => ({ id: "auth", email: "admin@test", emailVerified: true }) }, users: { findByAuthUserId: async () => ({ userId: "admin", role: "ADMIN" as const, accountStatus: "ACTIVE" as const, tradingStatus: "ENABLED" as const, emailVerified: true, kycStatus: "VERIFIED" as const }) }, pool };

describe("admin market routes", () => {
  it("shows and changes controlled simulation configuration", async () => {
    const app = express(); app.use(express.json()); registerAdminMarketRoutes(app, dependencies);
    const headers = { authorization: "Bearer token" };
    expect((await request(app).get("/api/admin/market/config").set(headers)).status).toBe(200);
    const changed = await request(app).patch("/api/admin/market/config").set(headers).send({ mode: "MANUAL", simulationPaused: true, reason: "Maintenance" });
    expect(changed.status).toBe(200);
    expect(changed.body.configuration).toEqual(expect.objectContaining({ mode: "REAL" }));
  });
});
