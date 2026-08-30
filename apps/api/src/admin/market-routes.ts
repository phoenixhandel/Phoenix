import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { createAuthenticationMiddleware, requireAdministrator } from "../auth/middleware.js";
import type { AuthProvider, PhoenixUser, UserDirectory } from "../auth/session.js";
import type { LedgerPool } from "../ledger/credit-service.js";

type Dependencies = { auth: AuthProvider; users: UserDirectory; pool: LedgerPool; onMarketChanged?: () => void };
type ConfigurationRow = { mode: "REAL" | "MANUAL"; trading_fee: string; spread: string; slippage: string; volatility: string; order_book_levels: number; simulation_paused: boolean; updated_at: string | Date };
const decimal = z.string().trim().regex(/^\d+(?:\.\d+)?$/);
const patchSchema = z.object({ mode: z.enum(["REAL", "MANUAL"]).optional(), tradingFee: decimal.optional(), spread: decimal.optional(), slippage: decimal.optional(), volatility: decimal.optional(), orderBookLevels: z.number().int().min(20).max(50).optional(), simulationPaused: z.boolean().optional(), reason: z.string().trim().min(1).max(2000) });
const manualPriceSchema = z.object({ referencePrice: decimal, reason: z.string().trim().min(1).max(2000) });
const asyncRoute = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
const present = (row: ConfigurationRow) => ({ mode: row.mode, tradingFee: row.trading_fee, spread: row.spread, slippage: row.slippage, volatility: row.volatility, orderBookLevels: row.order_book_levels, simulationPaused: row.simulation_paused, updatedAt: new Date(row.updated_at).toISOString() });

export const registerAdminMarketRoutes = (app: Express, { auth, users, pool, onMarketChanged }: Dependencies) => {
  const authenticate = createAuthenticationMiddleware({ auth, users });
  const select = "mode, trading_fee::text AS trading_fee, spread::text AS spread, slippage::text AS slippage, volatility::text AS volatility, order_book_levels, simulation_paused, updated_at";
  app.get("/api/admin/market/config", authenticate, requireAdministrator, asyncRoute(async (_request, response) => {
    const client = await pool.connect();
    try {
      const result = await client.query<ConfigurationRow>(`SELECT ${select} FROM market_configuration WHERE singleton = true`);
      if (!result.rows[0]) { response.status(503).json({ error: { code: "MARKET_CONFIGURATION_UNAVAILABLE" } }); return; }
      response.status(200).json({ configuration: present(result.rows[0]) });
    } finally { client.release(); }
  }));

  app.patch("/api/admin/market/config", authenticate, requireAdministrator, asyncRoute(async (request, response) => {
    const body = patchSchema.safeParse(request.body);
    if (!body.success || Object.keys(body.data).length === 1) { response.status(400).json({ error: { code: "VALIDATION_ERROR" } }); return; }
    const administrator = response.locals.authenticatedUser as PhoenixUser;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<ConfigurationRow>(`UPDATE market_configuration SET mode = COALESCE($1::market_mode, mode), trading_fee = COALESCE($2::numeric, trading_fee), spread = COALESCE($3::numeric, spread), slippage = COALESCE($4::numeric, slippage), volatility = COALESCE($5::numeric, volatility), order_book_levels = COALESCE($6::smallint, order_book_levels), simulation_paused = COALESCE($7::boolean, simulation_paused) WHERE singleton = true RETURNING ${select}`, [body.data.mode ?? null, body.data.tradingFee ?? null, body.data.spread ?? null, body.data.slippage ?? null, body.data.volatility ?? null, body.data.orderBookLevels ?? null, body.data.simulationPaused ?? null]);
      if (!result.rows[0]) throw new Error("MARKET_CONFIGURATION_UNAVAILABLE");
      await client.query("INSERT INTO admin_audit_events (admin_user_id, action, entity_type, metadata, reason) VALUES ($1, 'MARKET_CONFIGURATION_CHANGED', 'MARKET_CONFIGURATION', $2::jsonb, $3)", [administrator.userId, JSON.stringify(body.data), body.data.reason]);
      await client.query("COMMIT");
      onMarketChanged?.();
      response.status(200).json({ configuration: present(result.rows[0]) });
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }));

  app.put("/api/admin/market/manual-prices/:asset", authenticate, requireAdministrator, asyncRoute(async (request, response) => {
    const body = manualPriceSchema.safeParse(request.body);
    const asset = typeof request.params.asset === "string" ? request.params.asset.toUpperCase() : "";
    if (!body.success || !/^[A-Z0-9]{2,12}$/.test(asset)) { response.status(400).json({ error: { code: "VALIDATION_ERROR" } }); return; }
    const administrator = response.locals.authenticatedUser as PhoenixUser;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("INSERT INTO manual_market_prices (asset_symbol, reference_price) VALUES ($1, $2::numeric) ON CONFLICT (asset_symbol) DO UPDATE SET reference_price = EXCLUDED.reference_price", [asset, body.data.referencePrice]);
      await client.query("INSERT INTO admin_audit_events (admin_user_id, action, entity_type, metadata, reason) VALUES ($1, 'MANUAL_MARKET_PRICE_SET', 'MANUAL_MARKET_PRICE', $2::jsonb, $3)", [administrator.userId, JSON.stringify({ asset, referencePrice: body.data.referencePrice }), body.data.reason]);
      await client.query("COMMIT");
      onMarketChanged?.();
      response.status(200).json({ asset, referencePrice: body.data.referencePrice });
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  }));
};
