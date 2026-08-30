import type { Express, RequestHandler } from "express";
import { createAuthenticationMiddleware } from "../auth/middleware.js";
import type { AuthProvider, PhoenixUser, UserDirectory } from "../auth/session.js";
import type { LedgerPool } from "../ledger/credit-service.js";
import type { IdentityProvider } from "./provider.js";

type Dependencies = { auth: AuthProvider; users: UserDirectory; pool: LedgerPool; identity?: IdentityProvider | undefined };
const asyncRoute = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };

export const registerIdentityRoutes = (app: Express, { auth, users, pool, identity }: Dependencies) => {
  const authenticate = createAuthenticationMiddleware({ auth, users });
  app.post("/api/verification/identity/session", authenticate, asyncRoute(async (_request, response) => {
    if (!identity) { response.status(503).json({ error: { code: "IDENTITY_VERIFICATION_UNAVAILABLE" } }); return; }
    const user = response.locals.authenticatedUser as PhoenixUser;
    const idempotencyKey = _request.header("idempotency-key");
    const session = await identity.createSession(idempotencyKey ? { userId: user.userId, idempotencyKey } : { userId: user.userId });
    const client = await pool.connect();
    try {
      await client.query("UPDATE users SET kyc_status = 'PENDING', identity_provider_id = $2, identity_provider_status = 'processing' WHERE user_id = $1", [user.userId, session.id]);
      response.status(201).json({ sessionId: session.id, clientSecret: session.clientSecret });
    } finally { client.release(); }
  }));
  app.get("/api/verification/identity/status", authenticate, asyncRoute(async (_request, response) => {
    const user = response.locals.authenticatedUser as PhoenixUser;
    const client = await pool.connect();
    try {
      const result = await client.query<{ kyc_status: string; identity_provider_id: string | null }>("SELECT kyc_status, identity_provider_id FROM users WHERE user_id = $1", [user.userId]);
      const status = result.rows[0];
      if (!status) { response.status(404).json({ error: { code: "USER_NOT_FOUND" } }); return; }
      response.status(200).json({ kycStatus: status.kyc_status, verificationSessionId: status.identity_provider_id });
    } finally { client.release(); }
  }));
};
