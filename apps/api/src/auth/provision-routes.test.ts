import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { registerProvisionRoutes } from "./provision-routes.js";
import type { LedgerPool } from "../ledger/credit-service.js";

describe("account provisioning", () => {
  it("creates or synchronizes an application user from a valid Supabase identity", async () => {
    const calls: string[] = [];
    const pool: LedgerPool = { connect: async () => ({ query: async <Row extends Record<string, unknown>>(sql: string) => { calls.push(sql); return { rows: [{ user_id: "user", email: "user@test", email_verified: true, created: true }] as unknown as Row[] }; }, release: () => undefined }) };
    const app = express(); registerProvisionRoutes(app, { auth: { getUser: async () => ({ id: "auth", email: "user@test", emailVerified: true }) }, pool });
    const response = await request(app).post("/api/auth/provision").set("authorization", "Bearer token");
    expect(response.status).toBe(201); expect(response.body).toEqual({ userId: "user", email: "user@test", emailVerified: true });
    expect(calls).toEqual(expect.arrayContaining([expect.stringContaining("ACCOUNT_REGISTERED")]));
  });

  it("does not create a Phoenix account before the email is confirmed", async () => {
    const pool: LedgerPool = { connect: async () => { throw new Error("database must not be used"); } };
    const app = express(); registerProvisionRoutes(app, { auth: { getUser: async () => ({ id: "auth", email: "user@test", emailVerified: false }) }, pool });
    const response = await request(app).post("/api/auth/provision").set("authorization", "Bearer token");
    expect(response.status).toBe(403); expect(response.body.error.code).toBe("EMAIL_VERIFICATION_REQUIRED");
  });
});
