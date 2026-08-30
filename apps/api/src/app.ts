import cors from "cors";
import express from "express";
import helmet from "helmet";
import pino from "pino";
import { pinoHttp } from "pino-http";
import { apiHealth } from "@phoenix/shared";
import { createAuthenticationMiddleware } from "./auth/middleware.js";
import type { AuthProvider, UserDirectory } from "./auth/session.js";
import type { AppConfig } from "./config.js";
import { registerAdminBalanceRoutes, type AdminRouteDependencies } from "./admin/balance-routes.js";
import { registerMarketRoutes } from "./market/routes.js";
import type { MarketService } from "./market/service.js";
import { registerTradingRoutes, type TradingRouteDependencies } from "./trading/routes.js";
import { registerPortfolioRoutes } from "./portfolio/routes.js";
import { registerAdminUserRoutes } from "./admin/user-routes.js";
import { registerAdminAuditRoutes } from "./admin/audit-routes.js";
import { registerAdminMarketRoutes } from "./admin/market-routes.js";
import { registerActivityRoutes } from "./activity/routes.js";
import { registerIdentityRoutes } from "./identity/routes.js";
import type { IdentityProvider } from "./identity/provider.js";
import { registerStripeIdentityWebhook } from "./identity/webhook.js";
import { registerProvisionRoutes } from "./auth/provision-routes.js";
import { createRateLimitMiddleware } from "./security/rate-limit.js";
import { registerSupportRoutes, type SupportResponder } from "./support/routes.js";
import { registerSettingsRoutes } from "./settings/routes.js";

type AppDependencies = {
  auth: AuthProvider;
  users: UserDirectory;
  ledgerPool?: AdminRouteDependencies["ledgerPool"];
  trading?: Omit<TradingRouteDependencies, "auth" | "users">;
  identity?: IdentityProvider | undefined;
  support?: SupportResponder | undefined;
  stripeWebhook?: { secretKey: string; webhookSecret: string } | undefined;
};

export const createApp = (config: AppConfig, dependencies?: AppDependencies, market?: MarketService) => {
  const app = express();
  app.set("trust proxy", 1);
  const logger = pino({
    redact: ["req.headers.authorization", "req.headers.cookie"]
  });

  app.disable("x-powered-by");
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(createRateLimitMiddleware({ limit: 300, windowMs: 60_000 }));
  if (dependencies?.ledgerPool && dependencies.stripeWebhook) {
    registerStripeIdentityWebhook(app, { ...dependencies.stripeWebhook, pool: dependencies.ledgerPool });
  }
  app.use(express.json({ limit: "16kb" }));
  app.use(pinoHttp({ logger }));

  app.get("/api/health", (_request, response) => {
    response.status(200).json(apiHealth);
  });
  app.use("/api/support", createRateLimitMiddleware({ limit: 8, windowMs: 10 * 60_000 }));
  registerSupportRoutes(app, dependencies?.support);

  if (market) {
    const ledgerPool = dependencies?.ledgerPool;
    registerMarketRoutes(app, market, ledgerPool ? async () => {
      const client = await ledgerPool.connect();
      try {
        const result = await client.query<{ spread: string; order_book_levels: number; volatility: string }>("SELECT spread::text AS spread, order_book_levels, volatility::text AS volatility FROM market_configuration WHERE singleton = true");
        const settings = result.rows[0];
        if (!settings) throw new Error("MARKET_CONFIGURATION_UNAVAILABLE");
        return { spread: settings.spread, levels: settings.order_book_levels, volatility: settings.volatility };
      } finally {
        client.release();
      }
    } : undefined);
  }

  if (dependencies) {
    if (dependencies.ledgerPool) registerProvisionRoutes(app, { auth: dependencies.auth, pool: dependencies.ledgerPool });
    app.get("/api/me", createAuthenticationMiddleware(dependencies), (_request, response) => {
      response.status(200).json(response.locals.authenticatedUser);
    });
    if (dependencies.ledgerPool) {
      registerPortfolioRoutes(app, {
        auth: dependencies.auth,
        users: dependencies.users,
        pool: dependencies.ledgerPool
      });
      registerSettingsRoutes(app, { auth: dependencies.auth, users: dependencies.users, pool: dependencies.ledgerPool });
      registerActivityRoutes(app, {
        auth: dependencies.auth,
        users: dependencies.users,
        pool: dependencies.ledgerPool
      });
      registerIdentityRoutes(app, {
        auth: dependencies.auth,
        users: dependencies.users,
        pool: dependencies.ledgerPool,
        identity: dependencies.identity
      });
      registerAdminBalanceRoutes(app, {
        auth: dependencies.auth,
        users: dependencies.users,
        ledgerPool: dependencies.ledgerPool
      });
      registerAdminUserRoutes(app, {
        auth: dependencies.auth,
        users: dependencies.users,
        pool: dependencies.ledgerPool
      });
      registerAdminAuditRoutes(app, {
        auth: dependencies.auth,
        users: dependencies.users,
        pool: dependencies.ledgerPool
      });
      registerAdminMarketRoutes(app, {
        auth: dependencies.auth,
        users: dependencies.users,
        pool: dependencies.ledgerPool,
        onMarketChanged: () => market?.clearCache()
      });
    }
    if (dependencies.trading) {
      registerTradingRoutes(app, {
        auth: dependencies.auth,
        users: dependencies.users,
        ...dependencies.trading
      });
    }
  } else {
    app.get("/api/me", (_request, response) => response.status(503).json({ error: { code: "AUTH_UNAVAILABLE" } }));
  }

  app.use((error: unknown, _request: express.Request, response: express.Response, _next: express.NextFunction) => {
    void _next;
    if (response.headersSent) return;
    const message = error instanceof Error ? error.message : "INTERNAL_ERROR";
    const knownConflict = new Set(["INSUFFICIENT_BALANCE", "NO_BALANCE_CHANGE", "NO_BALANCES_TO_RESET", "SIMULATION_PAUSED"]);
    const knownValidation = new Set(["MARKET_CONFIGURATION_UNAVAILABLE", "Unsupported or disabled trading pair"]);
    if (knownConflict.has(message)) { response.status(409).json({ error: { code: message } }); return; }
    if (knownValidation.has(message)) { response.status(400).json({ error: { code: message } }); return; }
    logger.error({ err: error }, "Unhandled API error");
    response.status(500).json({ error: { code: "INTERNAL_ERROR" } });
  });

  return app;
};
