import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type { AuthProvider, UserDirectory } from "./session.js";

type MiddlewareModule = {
  createAuthenticationMiddleware?: (dependencies: { auth: AuthProvider; users: UserDirectory }) => express.RequestHandler;
};

const loadMiddlewareModule = async (): Promise<MiddlewareModule> => {
  const entrypoint = "./middleware.js";
  return import(entrypoint).catch(() => ({}));
};

describe("authentication middleware", () => {
  it("denies a request without a bearer token", async () => {
    const module = await loadMiddlewareModule();
    if (!module.createAuthenticationMiddleware) {
      expect(module.createAuthenticationMiddleware).toBeTypeOf("function");
      return;
    }

    const app = express();
    app.get(
      "/api/me",
      module.createAuthenticationMiddleware({
        auth: { getUser: async () => null },
        users: { findByAuthUserId: async () => null }
      }),
      (_request, response) => response.status(200).json({ ok: true })
    );

    const response = await request(app).get("/api/me");
    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: { code: "INVALID_SESSION" } });
  });

  it("requires a confirmed email before granting product API access", async () => {
    const module = await loadMiddlewareModule();
    if (!module.createAuthenticationMiddleware) {
      expect(module.createAuthenticationMiddleware).toBeTypeOf("function");
      return;
    }
    const app = express();
    app.get("/api/me", module.createAuthenticationMiddleware({
      auth: { getUser: async () => ({ id: "auth-user", email: "member@example.com", emailVerified: false }) },
      users: { findByAuthUserId: async () => ({ userId: "user", emailVerified: false, role: "USER", accountStatus: "ACTIVE", tradingStatus: "ENABLED", kycStatus: "NOT_STARTED" }) }
    }), (_request, response) => response.status(200).json({ ok: true }));

    const response = await request(app).get("/api/me").set("Authorization", "Bearer valid-token");
    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: { code: "EMAIL_VERIFICATION_REQUIRED" } });
  });
});
