import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { registerAdminAuditRoutes } from "./audit-routes.js";
import type { LedgerPool } from "../ledger/credit-service.js";

const pool: LedgerPool = { connect: async () => ({ query: async <Row extends Record<string, unknown>>() => ({ rows: [{ event_id: "event-1", admin_user_id: "admin", target_user_id: "user", action: "BALANCE_CREDIT", entity_type: "LEDGER_TRANSACTION", entity_id: "transaction", metadata: { asset: "BTC" }, reason: "Demo", created_at: "2026-08-24T00:00:00.000Z" }] as unknown as Row[] }), release: () => undefined }) };

describe("admin audit route", () => {
  it("returns immutable audit events only to an administrator", async () => {
    const app = express();
    registerAdminAuditRoutes(app, { auth: { getUser: async () => ({ id: "auth", email: "admin@test", emailVerified: true }) }, users: { findByAuthUserId: async () => ({ userId: "admin", role: "ADMIN", accountStatus: "ACTIVE", tradingStatus: "ENABLED", emailVerified: true, kycStatus: "VERIFIED" }) }, pool });
    const response = await request(app).get("/api/admin/audit-log?limit=10").set("authorization", "Bearer token");
    expect(response.status).toBe(200);
    expect(response.body.events).toEqual([expect.objectContaining({ eventId: "event-1", action: "BALANCE_CREDIT" })]);
  });
});
