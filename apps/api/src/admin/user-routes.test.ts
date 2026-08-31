import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { registerAdminUserRoutes } from "./user-routes.js";
import type { LedgerPool } from "../ledger/credit-service.js";

const pool: LedgerPool = { connect: async () => ({ query: async <Row extends Record<string, unknown>>() => ({ rows: [{ user_id: "u1", email: "person@example.test", role: "USER", account_status: "ACTIVE", trading_status: "ENABLED", kyc_status: "NOT_STARTED", email_verified: false, phone_verified: false, created_at: "2026-08-24T00:00:00.000Z", updated_at: "2026-08-24T00:00:00.000Z", last_login_at: null }] as unknown as Row[] }), release: () => undefined }) };

describe("admin user routes", () => {
  it("returns a paginated user list only to administrators", async () => {
    const app = express();
    registerAdminUserRoutes(app, { auth: { getUser: async () => ({ id: "auth", email: "admin@test", emailVerified: true }) }, users: { findByAuthUserId: async () => ({ userId: "admin", role: "ADMIN", accountStatus: "ACTIVE", tradingStatus: "ENABLED", emailVerified: true, kycStatus: "VERIFIED" }) }, pool });
    const response = await request(app).get("/api/admin/users?limit=20").set("authorization", "Bearer token");
    expect(response.status).toBe(200);
    expect(response.body.users).toEqual([expect.objectContaining({ userId: "u1", email: "person@example.test" })]);
  });

  it("shows and changes account controls only for administrators", async () => {
    const app = express();
    app.use(express.json());
    registerAdminUserRoutes(app, { auth: { getUser: async () => ({ id: "auth", email: "admin@test", emailVerified: true }) }, users: { findByAuthUserId: async () => ({ userId: "admin", role: "ADMIN", accountStatus: "ACTIVE", tradingStatus: "ENABLED", emailVerified: true, kycStatus: "VERIFIED" }) }, pool });
    const headers = { authorization: "Bearer token" };
    const detail = await request(app).get("/api/admin/users/u1").set(headers);
    expect(detail.status).toBe(200);
    expect(detail.body.user).toEqual(expect.objectContaining({ userId: "u1" }));
    const update = await request(app).patch("/api/admin/users/u1/status").set(headers).send({ accountStatus: "SUSPENDED" });
    expect(update.status).toBe(200);
  });

  it("uses a bounded offset cursor for administrator list pagination", async () => {
    const values: unknown[][] = [];
    const pagedPool: LedgerPool = { connect: async () => ({ query: async <Row extends Record<string, unknown>>(_sql: string, parameters?: readonly unknown[]) => { values.push(parameters ? [...parameters] : []); return { rows: [{ user_id: "u1", email: "person@example.test", role: "USER", account_status: "ACTIVE", trading_status: "ENABLED", kyc_status: "NOT_STARTED", email_verified: false, phone_verified: false, created_at: "2026-08-24T00:00:00.000Z", updated_at: "2026-08-24T00:00:00.000Z", last_login_at: null }] as unknown as Row[] }; }, release: () => undefined }) };
    const app = express(); registerAdminUserRoutes(app, { auth: { getUser: async () => ({ id: "auth", email: "admin@test", emailVerified: true }) }, users: { findByAuthUserId: async () => ({ userId: "admin", role: "ADMIN", accountStatus: "ACTIVE", tradingStatus: "ENABLED", emailVerified: true, kycStatus: "VERIFIED" }) }, pool: pagedPool });
    const response = await request(app).get("/api/admin/users?limit=1&cursor=2").set("authorization", "Bearer token");
    expect(response.body.nextCursor).toBe("3"); expect(values[0]).toEqual([null, 1, 2]);
  });
});
