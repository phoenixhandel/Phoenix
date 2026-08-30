import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { registerSettingsRoutes } from "./routes.js";
import type { LedgerPool } from "../ledger/credit-service.js";

const user = { userId: "user-1", role: "USER" as const, accountStatus: "ACTIVE" as const, tradingStatus: "ENABLED" as const, emailVerified: true, kycStatus: "NOT_STARTED" as const };

describe("account settings routes", () => {
  it("returns EUR by default and persists a selected display currency", async () => {
    const calls: string[] = [];
    const pool: LedgerPool = { connect: async () => ({ query: async <Row extends Record<string, unknown>>(sql: string) => { calls.push(sql); return { rows: [sql.startsWith("SELECT") ? { email: "member@example.test", email_verified: true, display_currency: "EUR" } : { display_currency: "GBP" }] as unknown as Row[] }; }, release: () => undefined }) };
    const app = express(); app.use(express.json());
    registerSettingsRoutes(app, { auth: { getUser: async () => ({ id: "auth-1", email: "member@example.test", emailVerified: true }) }, users: { findByAuthUserId: async () => user }, pool });

    const read = await request(app).get("/api/me/settings").set("authorization", "Bearer token");
    const update = await request(app).patch("/api/me/settings").set("authorization", "Bearer token").send({ displayCurrency: "GBP" });

    expect(read.body).toEqual({ email: "member@example.test", emailVerified: true, displayCurrency: "EUR" });
    expect(update.body).toEqual({ displayCurrency: "GBP" });
    expect(calls.some((sql) => sql.startsWith("UPDATE users"))).toBe(true);
  });

  it("rejects unsupported display currencies", async () => {
    const pool: LedgerPool = { connect: async () => ({ query: async <Row extends Record<string, unknown>>() => ({ rows: [] as unknown as Row[] }), release: () => undefined }) };
    const app = express(); app.use(express.json());
    registerSettingsRoutes(app, { auth: { getUser: async () => ({ id: "auth-1", email: "member@example.test", emailVerified: true }) }, users: { findByAuthUserId: async () => user }, pool });
    const response = await request(app).patch("/api/me/settings").set("authorization", "Bearer token").send({ displayCurrency: "CHF" });
    expect(response.status).toBe(400);
  });
});
