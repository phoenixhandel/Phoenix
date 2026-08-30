import type { Express } from "express";
import { createAuthenticationMiddleware } from "../auth/middleware.js";
import type { AuthProvider, PhoenixUser, UserDirectory } from "../auth/session.js";
import type { LedgerPool } from "../ledger/credit-service.js";

export const registerPortfolioRoutes = (
  app: Express,
  { auth, users, pool }: { auth: AuthProvider; users: UserDirectory; pool: LedgerPool }
) => {
  app.get("/api/me/portfolio", createAuthenticationMiddleware({ auth, users }), async (_request, response, next) => {
    const user = response.locals.authenticatedUser as PhoenixUser;
    const client = await pool.connect();
    try {
      const balances = await client.query<{ asset_symbol: string; balance: string }>(
        "SELECT asset.symbol AS asset_symbol, COALESCE(balance.balance, 0)::text AS balance FROM assets AS asset LEFT JOIN portfolio_balances AS balance ON balance.asset_symbol = asset.symbol AND balance.user_id = $1 WHERE asset.enabled ORDER BY asset.symbol",
        [user.userId]
      );
      response.status(200).json({
        userId: user.userId,
        balances: Object.fromEntries(balances.rows.map(({ asset_symbol, balance }) => [asset_symbol, balance]))
      });
    } catch (error) {
      next(error);
    } finally {
      client.release();
    }
  });
};
