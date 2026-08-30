import express from "express";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { registerTradingRoutes } from "./routes.js";

const user = (overrides: Partial<{ tradingStatus: "ENABLED" | "FROZEN"; emailVerified: boolean; kycStatus: "NOT_STARTED" | "PENDING" | "VERIFIED" | "FAILED" | "REQUIRES_INPUT" }> = {}) => ({
  userId: "user-1",
  role: "USER" as const,
  accountStatus: "ACTIVE" as const,
  tradingStatus: "ENABLED" as const,
  emailVerified: true,
  kycStatus: "NOT_STARTED" as const,
  ...overrides
});

describe("market-order route", () => {
  it("blocks an unverified account before an order reaches execution", async () => {
    const execute = vi.fn();
    const app = express();
    app.use(express.json());
    registerTradingRoutes(app, {
      auth: { getUser: async () => ({ id: "auth-1", email: "user@example.test", emailVerified: false }) },
      users: { findByAuthUserId: async () => user({ emailVerified: false }) },
      requireKycForTrading: false,
      getTicker: async () => ({ price: "100", symbol: "BTCUSDT", source: "MANUAL", updatedAt: new Date() }),
      getExecutionSettings: async () => ({ spread: "0.0004", slippage: "0.0001", feeRate: "0.001" }),
      execute
    });

    const response = await request(app).post("/api/trades/market").set("authorization", "Bearer valid").set("idempotency-key", "trade-key").send({ pair: "BTCUSDT", side: "BUY", baseAmount: "2" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({ error: { code: "EMAIL_VERIFICATION_REQUIRED" } });
    expect(execute).not.toHaveBeenCalled();
  });

  it("executes an eligible authenticated order with current market settings", async () => {
    const execute = vi.fn().mockResolvedValue({ tradeId: "trade-1", idempotent: false, executionPrice: "100.05", quoteAmount: "200.1", feeAmount: "0.2" });
    const app = express();
    app.use(express.json());
    registerTradingRoutes(app, {
      auth: { getUser: async () => ({ id: "auth-1", email: "user@example.test", emailVerified: true }) },
      users: { findByAuthUserId: async () => user() },
      requireKycForTrading: false,
      getTicker: async () => ({ price: "100", symbol: "BTCUSDT", source: "MANUAL", updatedAt: new Date() }),
      getExecutionSettings: async () => ({ spread: "0.0004", slippage: "0.0001", feeRate: "0.001" }),
      execute
    });

    const response = await request(app).post("/api/trades/market").set("authorization", "Bearer valid").set("idempotency-key", "trade-key").send({ pair: "BTCUSDT", side: "BUY", baseAmount: "2" });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ tradeId: "trade-1" });
    expect(execute).toHaveBeenCalledWith(expect.objectContaining({ userId: "user-1", marketPrice: "100", pair: "BTCUSDT", side: "BUY" }));
  });

  it("does not execute orders while an administrator pauses simulation", async () => {
    const execute = vi.fn();
    const app = express(); app.use(express.json());
    registerTradingRoutes(app, {
      auth: { getUser: async () => ({ id: "auth-1", email: "user@example.test", emailVerified: true }) }, users: { findByAuthUserId: async () => user() }, requireKycForTrading: false,
      getTicker: async () => ({ price: "100", symbol: "BTCUSDT", source: "MANUAL", updatedAt: new Date() }), getExecutionSettings: async () => ({ spread: "0.0004", slippage: "0.0001", feeRate: "0.001", simulationPaused: true }), execute
    });
    const response = await request(app).post("/api/trades/market").set("authorization", "Bearer valid").set("idempotency-key", "paused-order").send({ pair: "BTCUSDT", side: "BUY", baseAmount: "2" });
    expect(response.status).toBe(409); expect(response.body.error.code).toBe("SIMULATION_PAUSED"); expect(execute).not.toHaveBeenCalled();
  });
});
