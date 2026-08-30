import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { registerIdentityRoutes } from "./routes.js";
import type { LedgerPool } from "../ledger/credit-service.js";

const pool: LedgerPool = { connect: async () => ({ query: async <Row extends Record<string, unknown>>() => ({ rows: [{ kyc_status: "NOT_STARTED", identity_provider_id: null }] as unknown as Row[] }), release: () => undefined }) };
const dependencies = { auth: { getUser: async () => ({ id: "auth", email: "user@test", emailVerified: true }) }, users: { findByAuthUserId: async () => ({ userId: "user", role: "USER" as const, accountStatus: "ACTIVE" as const, tradingStatus: "ENABLED" as const, emailVerified: true, kycStatus: "NOT_STARTED" as const }) }, pool, identity: { createSession: async () => ({ id: "vs_test", clientSecret: "secret" }) } };

describe("identity routes", () => {
  it("creates an authenticated verification session and exposes only application status", async () => {
    const app = express(); app.use(express.json()); registerIdentityRoutes(app, dependencies);
    const headers = { authorization: "Bearer token" };
    const session = await request(app).post("/api/verification/identity/session").set(headers);
    expect(session.status).toBe(201); expect(session.body).toEqual({ sessionId: "vs_test", clientSecret: "secret" });
    const status = await request(app).get("/api/verification/identity/status").set(headers);
    expect(status.status).toBe(200); expect(status.body.kycStatus).toBe("NOT_STARTED");
  });

  it("does not expose a browser route that can set KYC status", async () => {
    const app = express(); app.use(express.json()); registerIdentityRoutes(app, dependencies);
    const response = await request(app).post("/api/verification/identity/status").set("authorization", "Bearer token").send({ kycStatus: "VERIFIED" });
    expect(response.status).toBe(404);
  });
});
