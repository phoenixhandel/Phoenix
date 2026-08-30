import express from "express";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { createRateLimitMiddleware } from "./rate-limit.js";

describe("rate limit middleware", () => {
  it("rejects requests that exceed the configured window", async () => {
    const app = express(); app.use(createRateLimitMiddleware({ limit: 2, windowMs: 60_000 })); app.get("/", (_request, response) => response.sendStatus(200));
    expect((await request(app).get("/")).status).toBe(200); expect((await request(app).get("/")).status).toBe(200); expect((await request(app).get("/")).status).toBe(429);
  });

  it("returns a retry hint when a limited route is exhausted", async () => {
    const app = express(); app.use(createRateLimitMiddleware({ limit: 1, windowMs: 60_000 })); app.get("/", (_request, response) => response.sendStatus(200));
    await request(app).get("/");
    const response = await request(app).get("/");
    expect(response.status).toBe(429);
    expect(response.headers["retry-after"]).toBeDefined();
    expect(response.body.error.code).toBe("RATE_LIMITED");
  });
});
