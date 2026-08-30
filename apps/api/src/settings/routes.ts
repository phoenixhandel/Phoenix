import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { createAuthenticationMiddleware } from "../auth/middleware.js";
import type { AuthProvider, UserDirectory } from "../auth/session.js";
import type { LedgerPool } from "../ledger/credit-service.js";

const updateSchema = z.object({ displayCurrency: z.enum(["EUR", "USD", "GBP"]) });
const asyncRoute = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };

export const registerSettingsRoutes = (app: Express, { auth, users, pool }: { auth: AuthProvider; users: UserDirectory; pool: LedgerPool }) => {
  const authenticate = createAuthenticationMiddleware({ auth, users });
  app.get("/api/me/settings", authenticate, asyncRoute(async (_request, response) => {
    const user = response.locals.authenticatedUser;
    const client = await pool.connect();
    try {
      const result = await client.query<{ email: string | null; email_verified: boolean; display_currency: "EUR" | "USD" | "GBP" }>("SELECT email, email_verified, display_currency FROM users WHERE user_id = $1", [user.userId]);
      const settings = result.rows[0];
      if (!settings) throw new Error("USER_NOT_REGISTERED");
      response.status(200).json({ email: settings.email, emailVerified: settings.email_verified, displayCurrency: settings.display_currency });
    } finally { client.release(); }
  }));
  app.patch("/api/me/settings", authenticate, asyncRoute(async (request, response) => {
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) { response.status(400).json({ error: { code: "VALIDATION_ERROR" } }); return; }
    const user = response.locals.authenticatedUser;
    const client = await pool.connect();
    try {
      const result = await client.query<{ display_currency: "EUR" | "USD" | "GBP" }>("UPDATE users SET display_currency = $2 WHERE user_id = $1 RETURNING display_currency", [user.userId, parsed.data.displayCurrency]);
      response.status(200).json({ displayCurrency: result.rows[0]?.display_currency ?? parsed.data.displayCurrency });
    } finally { client.release(); }
  }));
};
