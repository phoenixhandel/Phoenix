import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { createAuthenticationMiddleware, requireAdministrator } from "../auth/middleware.js";
import type { AuthProvider, UserDirectory } from "../auth/session.js";
import type { LedgerPool } from "../ledger/credit-service.js";

type AdminAuditRouteDependencies = {
  auth: AuthProvider;
  users: UserDirectory;
  pool: LedgerPool;
};

type AuditEventRow = {
  event_id: string;
  admin_user_id: string | null;
  target_user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string | Date;
};

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  cursor: z.coerce.number().int().min(0).default(0)
});

const asyncRoute = (handler: RequestHandler): RequestHandler => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

export const registerAdminAuditRoutes = (app: Express, dependencies: AdminAuditRouteDependencies) => {
  const authenticate = createAuthenticationMiddleware(dependencies);

  app.get("/api/admin/audit-log", authenticate, requireAdministrator, asyncRoute(async (request, response) => {
    const query = querySchema.safeParse(request.query);
    if (!query.success) {
      response.status(400).json({ error: { code: "VALIDATION_ERROR" } });
      return;
    }

    const client = await dependencies.pool.connect();
    try {
      const result = await client.query<AuditEventRow>(
        `SELECT event_id, admin_user_id, target_user_id, action, entity_type, entity_id, metadata, created_at
         FROM admin_audit_events
         ORDER BY created_at DESC, event_id DESC
         LIMIT $1 OFFSET $2`,
        [query.data.limit, query.data.cursor]
      );
      response.status(200).json({
        events: result.rows.map((event) => ({
          eventId: event.event_id,
          adminUserId: event.admin_user_id,
          targetUserId: event.target_user_id,
          action: event.action,
          entityType: event.entity_type,
          entityId: event.entity_id,
          metadata: event.metadata,
          createdAt: new Date(event.created_at).toISOString()
        })),
        nextCursor: result.rows.length === query.data.limit ? String(query.data.cursor + result.rows.length) : null
      });
    } finally {
      client.release();
    }
  }));
};
