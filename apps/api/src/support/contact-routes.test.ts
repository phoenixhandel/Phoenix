import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { registerContactRoutes } from "./contact-routes.js";

const user = { userId: "user-1", role: "USER" as const, accountStatus: "ACTIVE" as const, tradingStatus: "ENABLED" as const, emailVerified: true, kycStatus: "NOT_STARTED" as const };

describe("account contact route", () => {
  it("delivers a verified account request with account context", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    const app = express(); app.use(express.json());
    registerContactRoutes(app, { auth: { getUser: async () => ({ id: "auth-1", email: "member@example.test", emailVerified: true }) }, users: { findByAuthUserId: async () => user }, mail: { send } });
    const response = await request(app).post("/api/me/support-requests").set("authorization", "Bearer token").send({ subject: "Access", message: "Please help me." });
    expect(response.status).toBe(202);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ subject: "Access", accountEmail: "member@example.test", accountUserId: "user-1" }));
  });

  it("safely reports unavailable delivery without a configured sender", async () => {
    const app = express(); app.use(express.json());
    registerContactRoutes(app, { auth: { getUser: async () => ({ id: "auth-1", email: "member@example.test", emailVerified: true }) }, users: { findByAuthUserId: async () => user } });
    const response = await request(app).post("/api/me/support-requests").set("authorization", "Bearer token").send({ subject: "Access", message: "Please help me." });
    expect(response.status).toBe(503);
    expect(response.body).toEqual({ error: { code: "SUPPORT_DELIVERY_UNAVAILABLE" } });
  });
});
