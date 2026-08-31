import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { createAuthenticationMiddleware, requireAdministrator } from "../auth/middleware.js";
import type { AuthProvider, PhoenixUser, UserDirectory } from "../auth/session.js";
import type { LedgerPool } from "../ledger/credit-service.js";

type Dependencies = { auth: AuthProvider; users: UserDirectory; pool: LedgerPool };
type UserRow = { user_id: string; email: string | null; role: string; account_status: string; trading_status: string; kyc_status: string; email_verified: boolean; phone_verified: boolean; created_at: string | Date; updated_at: string | Date; last_login_at: string | Date | null };
const statuses = z.enum(["ACTIVE", "SUSPENDED", "LOCKED"]);
const tradingStatuses = z.enum(["ENABLED", "FROZEN"]);
const changeSchema = z.object({ accountStatus: statuses.optional(), tradingStatus: tradingStatuses.optional() });
const pageSchema = z.object({ limit: z.coerce.number().int().min(1).max(100).default(20), cursor: z.coerce.number().int().min(0).default(0), q: z.string().trim().min(1).max(100).optional() });
const asyncRoute = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };

const presentUser = (row: UserRow) => ({
  userId: row.user_id, email: row.email, role: row.role, accountStatus: row.account_status,
  tradingStatus: row.trading_status, kycStatus: row.kyc_status, emailVerified: row.email_verified,
  phoneVerified: row.phone_verified, createdAt: new Date(row.created_at).toISOString(),
  updatedAt: new Date(row.updated_at).toISOString(), lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : null
});
const validPage = (value: unknown) => pageSchema.safeParse(value);

export const registerAdminUserRoutes = (app: Express, { auth, users, pool }: Dependencies) => {
  const authenticate = createAuthenticationMiddleware({ auth, users });
  const userSelect = "user_id, email, role, account_status, trading_status, kyc_status, email_verified, phone_verified, created_at, updated_at, last_login_at";

  app.get("/api/admin/users", authenticate, requireAdministrator, asyncRoute(async (request, response) => {
    const page = validPage(request.query);
    if (!page.success) { response.status(400).json({ error: { code: "VALIDATION_ERROR" } }); return; }
    const client = await pool.connect();
    try {
      const result = await client.query<UserRow>(`SELECT ${userSelect} FROM users WHERE ($1::text IS NULL OR email ILIKE '%' || $1 || '%' OR username ILIKE '%' || $1 || '%') ORDER BY created_at DESC, user_id DESC LIMIT $2 OFFSET $3`, [page.data.q ?? null, page.data.limit, page.data.cursor]);
      response.status(200).json({ users: result.rows.map(presentUser), nextCursor: result.rows.length === page.data.limit ? String(page.data.cursor + result.rows.length) : null });
    } finally { client.release(); }
  }));

  app.get("/api/admin/users/:userId", authenticate, requireAdministrator, asyncRoute(async (request, response) => {
    const client = await pool.connect();
    try {
      const result = await client.query<UserRow>(`SELECT ${userSelect} FROM users WHERE user_id = $1`, [request.params.userId]);
      if (!result.rows[0]) { response.status(404).json({ error: { code: "USER_NOT_FOUND" } }); return; }
      response.status(200).json({ user: presentUser(result.rows[0]) });
    } finally { client.release(); }
  }));

  app.get("/api/admin/users/:userId/portfolio", authenticate, requireAdministrator, asyncRoute(async (request, response) => {
    const client = await pool.connect();
    try {
      const balances = await client.query<{ asset_symbol: string; balance: string }>("SELECT asset_symbol, balance::text AS balance FROM portfolio_balances WHERE user_id = $1 ORDER BY asset_symbol", [request.params.userId]);
      response.status(200).json({ userId: request.params.userId, balances: Object.fromEntries(balances.rows.map(({ asset_symbol, balance }) => [asset_symbol, balance])) });
    } finally { client.release(); }
  }));

  app.get("/api/admin/users/:userId/trades", authenticate, requireAdministrator, asyncRoute(async (request, response) => {
    const page = validPage(request.query); if (!page.success) { response.status(400).json({ error: { code: "VALIDATION_ERROR" } }); return; }
    const client = await pool.connect();
    try {
      const result = await client.query<Record<string, unknown>>("SELECT trade_id, pair_symbol, side, base_amount::text AS base_amount, quote_amount::text AS quote_amount, market_price::text AS market_price, execution_price::text AS execution_price, fee_asset, fee_amount::text AS fee_amount, created_at FROM trades WHERE user_id = $1 ORDER BY created_at DESC, trade_id DESC LIMIT $2 OFFSET $3", [request.params.userId, page.data.limit, page.data.cursor]);
      response.status(200).json({ trades: result.rows.map((trade) => ({ tradeId: trade.trade_id, pair: trade.pair_symbol, side: trade.side, baseAmount: trade.base_amount, quoteAmount: trade.quote_amount, marketPrice: trade.market_price, executionPrice: trade.execution_price, feeAsset: trade.fee_asset, feeAmount: trade.fee_amount, createdAt: trade.created_at })), nextCursor: result.rows.length === page.data.limit ? String(page.data.cursor + result.rows.length) : null });
    } finally { client.release(); }
  }));

  app.get("/api/admin/users/:userId/activity", authenticate, requireAdministrator, asyncRoute(async (request, response) => {
    const page = validPage(request.query); if (!page.success) { response.status(400).json({ error: { code: "VALIDATION_ERROR" } }); return; }
    const client = await pool.connect();
    try {
      const result = await client.query<{ event_id: string; event_type: string; metadata: Record<string, unknown>; created_at: string | Date }>("SELECT event_id, event_type, metadata, created_at FROM activity_events WHERE user_id = $1 ORDER BY created_at DESC, event_id DESC LIMIT $2 OFFSET $3", [request.params.userId, page.data.limit, page.data.cursor]);
      response.status(200).json({ events: result.rows.map((event) => ({ eventId: event.event_id, eventType: event.event_type, metadata: event.metadata, createdAt: new Date(event.created_at).toISOString() })), nextCursor: result.rows.length === page.data.limit ? String(page.data.cursor + result.rows.length) : null });
    } finally { client.release(); }
  }));

  app.get("/api/admin/users/:userId/ledger", authenticate, requireAdministrator, asyncRoute(async (request, response) => {
    const page = validPage(request.query); if (!page.success) { response.status(400).json({ error: { code: "VALIDATION_ERROR" } }); return; }
    const client = await pool.connect();
    try {
      const result = await client.query<Record<string, unknown>>("SELECT tx.transaction_id, tx.transaction_type, tx.actor_user_id, tx.target_user_id, tx.notes, tx.created_at FROM ledger_transactions tx WHERE tx.target_user_id = $1 OR tx.actor_user_id = $1 ORDER BY tx.created_at DESC, tx.transaction_id DESC LIMIT $2 OFFSET $3", [request.params.userId, page.data.limit, page.data.cursor]);
      response.status(200).json({ transactions: result.rows.map((tx) => ({ transactionId: tx.transaction_id, transactionType: tx.transaction_type, actorUserId: tx.actor_user_id, targetUserId: tx.target_user_id, notes: tx.notes, createdAt: tx.created_at })), nextCursor: result.rows.length === page.data.limit ? String(page.data.cursor + result.rows.length) : null });
    } finally { client.release(); }
  }));

  const changeUser = asyncRoute(async (request, response) => {
    const body = changeSchema.safeParse(request.body);
    if (!body.success || (body.data.accountStatus === undefined && body.data.tradingStatus === undefined)) { response.status(400).json({ error: { code: "VALIDATION_ERROR" } }); return; }
    const administrator = response.locals.authenticatedUser as PhoenixUser;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query<UserRow>(`UPDATE users SET account_status = COALESCE($2::account_status, account_status), trading_status = COALESCE($3::trading_status, trading_status) WHERE user_id = $1 RETURNING ${userSelect}`, [request.params.userId, body.data.accountStatus ?? null, body.data.tradingStatus ?? null]);
      if (!result.rows[0]) { await client.query("ROLLBACK"); response.status(404).json({ error: { code: "USER_NOT_FOUND" } }); return; }
      const action = body.data.accountStatus ? "USER_ACCOUNT_STATUS_CHANGED" : "USER_TRADING_STATUS_CHANGED";
      await client.query("INSERT INTO admin_audit_events (admin_user_id, target_user_id, action, entity_type, entity_id, metadata, reason) VALUES ($1, $2, $3, 'USER', $2, $4::jsonb, 'ADMINISTRATOR_ACTION')", [administrator.userId, request.params.userId, action, JSON.stringify({ accountStatus: body.data.accountStatus, tradingStatus: body.data.tradingStatus })]);
      await client.query("COMMIT");
      response.status(200).json({ user: presentUser(result.rows[0]) });
    } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
  });
  app.patch("/api/admin/users/:userId/status", authenticate, requireAdministrator, changeUser);
  app.patch("/api/admin/users/:userId/trading-status", authenticate, requireAdministrator, changeUser);
};
