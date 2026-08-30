import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { createAuthenticationMiddleware } from "../auth/middleware.js";
import type { AuthProvider, PhoenixUser, UserDirectory } from "../auth/session.js";
import type { LedgerPool } from "../ledger/credit-service.js";

type Dependencies = { auth: AuthProvider; users: UserDirectory; pool: LedgerPool };
const pageSchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20), cursor: z.coerce.number().int().min(0).default(0) });
const asyncRoute = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };

export const registerActivityRoutes = (app: Express, { auth, users, pool }: Dependencies) => {
  const authenticate = createAuthenticationMiddleware({ auth, users });
  app.get("/api/me/trades", authenticate, asyncRoute(async (request, response) => {
    const page = pageSchema.safeParse(request.query); if (!page.success) { response.status(400).json({ error: { code: "VALIDATION_ERROR" } }); return; }
    const user = response.locals.authenticatedUser as PhoenixUser;
    const client = await pool.connect();
    try {
      const result = await client.query<Record<string, unknown>>("SELECT trade_id, pair_symbol, side, base_amount::text AS base_amount, quote_amount::text AS quote_amount, market_price::text AS market_price, execution_price::text AS execution_price, fee_asset, fee_amount::text AS fee_amount, created_at FROM trades WHERE user_id = $1 ORDER BY created_at DESC, trade_id DESC LIMIT $2 OFFSET $3", [user.userId, page.data.limit, page.data.cursor]);
      response.status(200).json({ trades: result.rows.map((trade) => ({ tradeId: trade.trade_id, pair: trade.pair_symbol, side: trade.side, baseAmount: trade.base_amount, quoteAmount: trade.quote_amount, marketPrice: trade.market_price, executionPrice: trade.execution_price, feeAsset: trade.fee_asset, feeAmount: trade.fee_amount, createdAt: trade.created_at })), nextCursor: result.rows.length === page.data.limit ? String(page.data.cursor + result.rows.length) : null });
    } finally { client.release(); }
  }));
  app.get("/api/me/activity", authenticate, asyncRoute(async (request, response) => {
    const page = pageSchema.safeParse(request.query); if (!page.success) { response.status(400).json({ error: { code: "VALIDATION_ERROR" } }); return; }
    const user = response.locals.authenticatedUser as PhoenixUser;
    const client = await pool.connect();
    try {
      const result = await client.query<{ event_id: string; event_type: string; metadata: Record<string, unknown>; created_at: string | Date }>("SELECT event_id, event_type, metadata, created_at FROM activity_events WHERE user_id = $1 ORDER BY created_at DESC, event_id DESC LIMIT $2 OFFSET $3", [user.userId, page.data.limit, page.data.cursor]);
      response.status(200).json({ events: result.rows.map((event) => ({ eventId: event.event_id, eventType: event.event_type, metadata: event.metadata, createdAt: new Date(event.created_at).toISOString() })), nextCursor: result.rows.length === page.data.limit ? String(page.data.cursor + result.rows.length) : null });
    } finally { client.release(); }
  }));
};
