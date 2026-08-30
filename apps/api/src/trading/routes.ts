import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { createAuthenticationMiddleware } from "../auth/middleware.js";
import type { AuthProvider, UserDirectory } from "../auth/session.js";
import type { MarketTicker } from "../market/providers.js";
import type { MarketOrderInput, MarketOrderResult } from "./execution-service.js";

const bodySchema = z.object({
  pair: z.string().trim().regex(/^[A-Z0-9]{4,24}$/),
  side: z.enum(["BUY", "SELL"]),
  baseAmount: z.string().trim().min(1)
});

type ExecutionSettings = { spread: string; slippage: string; feeRate: string; simulationPaused?: boolean };

export type TradingRouteDependencies = {
  auth: AuthProvider;
  users: UserDirectory;
  requireKycForTrading: boolean;
  getTicker: (pair: string) => Promise<MarketTicker>;
  getExecutionSettings: () => Promise<ExecutionSettings>;
  execute: (input: Omit<MarketOrderInput, "pool">) => Promise<MarketOrderResult>;
};

const asyncRoute = (handler: RequestHandler): RequestHandler => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

export const registerTradingRoutes = (app: Express, dependencies: TradingRouteDependencies) => {
  const authenticate = createAuthenticationMiddleware(dependencies);
  app.post(
    "/api/trades/market",
    authenticate,
    asyncRoute(async (request, response) => {
      const body = bodySchema.safeParse(request.body);
      const idempotencyKey = request.header("idempotency-key");
      if (!body.success || !idempotencyKey) {
        response.status(400).json({ error: { code: "VALIDATION_ERROR" } });
        return;
      }
      const user = response.locals.authenticatedUser as Awaited<ReturnType<UserDirectory["findByAuthUserId"]>>;
      if (!user) {
        response.status(401).json({ error: { code: "INVALID_SESSION" } });
        return;
      }
      if (!user.emailVerified) {
        response.status(403).json({ error: { code: "EMAIL_UNVERIFIED" } });
        return;
      }
      if (user.tradingStatus !== "ENABLED") {
        response.status(403).json({ error: { code: "TRADING_FROZEN" } });
        return;
      }
      if (dependencies.requireKycForTrading && user.kycStatus !== "VERIFIED") {
        response.status(403).json({ error: { code: "KYC_REQUIRED" } });
        return;
      }

      try {
        const [ticker, settings] = await Promise.all([dependencies.getTicker(body.data.pair), dependencies.getExecutionSettings()]);
        if (settings.simulationPaused) {
          response.status(409).json({ error: { code: "SIMULATION_PAUSED" } });
          return;
        }
        const result = await dependencies.execute({
          userId: user.userId,
          pair: body.data.pair,
          side: body.data.side,
          baseAmount: body.data.baseAmount,
          marketPrice: ticker.price,
          spread: settings.spread,
          slippage: settings.slippage,
          feeRate: settings.feeRate,
          idempotencyKey
        });
        response.status(result.idempotent ? 200 : 201).json(result);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Trade could not be executed";
        const status = message === "INSUFFICIENT_BALANCE" ? 409 : 400;
        response.status(status).json({ error: { code: message } });
      }
    })
  );
};
