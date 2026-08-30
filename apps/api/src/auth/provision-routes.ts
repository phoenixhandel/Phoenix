import type { Express, RequestHandler } from "express";
import type { LedgerPool } from "../ledger/credit-service.js";
import type { AuthProvider } from "./session.js";

const asyncRoute = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };
const bearer = (authorization: string | undefined) => authorization?.match(/^Bearer (.+)$/i)?.[1];

export const registerProvisionRoutes = (app: Express, { auth, pool }: { auth: AuthProvider; pool: LedgerPool }) => {
  app.post("/api/auth/provision", asyncRoute(async (request, response) => {
    const token = bearer(request.header("authorization"));
    if (!token) { response.status(401).json({ error: { code: "INVALID_SESSION" } }); return; }
    const identity = await auth.getUser(token);
    if (!identity || (!identity.email && !identity.phone)) { response.status(401).json({ error: { code: "INVALID_SESSION" } }); return; }
    if (!identity.emailVerified) { response.status(403).json({ error: { code: "EMAIL_VERIFICATION_REQUIRED" } }); return; }
    const client = await pool.connect();
    try {
      const result = await client.query<{ user_id: string; email: string | null; email_verified: boolean; created: boolean }>("INSERT INTO users (user_id, auth_user_id, email, email_verified, phone, phone_verified) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5) ON CONFLICT (auth_user_id) DO UPDATE SET email = EXCLUDED.email, email_verified = EXCLUDED.email_verified, phone = EXCLUDED.phone, phone_verified = EXCLUDED.phone_verified, last_login_at = now() RETURNING user_id, email, email_verified, (xmax = 0) AS created", [identity.id, identity.email, identity.emailVerified, identity.phone ?? null, identity.phoneVerified ?? false]);
      const user = result.rows[0];
      if (!user) throw new Error("USER_PROVISIONING_FAILED");
      if (user.created) await client.query("INSERT INTO activity_events (user_id, event_type, metadata) VALUES ($1, 'ACCOUNT_REGISTERED', '{}'::jsonb)", [user.user_id]);
      response.status(201).json({ userId: user.user_id, email: user.email, emailVerified: user.email_verified });
    } finally { client.release(); }
  }));
};
