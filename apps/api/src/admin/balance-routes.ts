import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { createAuthenticationMiddleware, requireAdministrator } from "../auth/middleware.js";
import type { AuthProvider, PhoenixUser, UserDirectory } from "../auth/session.js";
import { executeCredit, type LedgerPool } from "../ledger/credit-service.js";
import { executeDebit } from "../ledger/debit-service.js";
import { executeSetBalance } from "../ledger/set-balance-service.js";
import { executePortfolioReset } from "../ledger/reset-portfolio-service.js";

export type AdminRouteDependencies = {
  auth: AuthProvider;
  users: UserDirectory;
  ledgerPool: LedgerPool;
};

const creditBody = z.object({
  asset: z.string().trim().regex(/^[A-Z0-9]{2,12}$/),
  amount: z.string().trim().min(1),
  reason: z.string().trim().min(1).max(2000)
});
const setBalanceBody = z.object({ asset: z.string().trim().regex(/^[A-Z0-9]{2,12}$/), newBalance: z.string().trim().min(1), reason: z.string().trim().min(1).max(2000) });
const resetBody = z.object({ reason: z.string().trim().min(1).max(2000) });

const asyncRoute = (handler: RequestHandler): RequestHandler => (request, response, next) => {
  Promise.resolve(handler(request, response, next)).catch(next);
};

export const registerAdminBalanceRoutes = (app: Express, dependencies: AdminRouteDependencies) => {
  const authenticate = createAuthenticationMiddleware(dependencies);

  app.post(
    "/api/admin/users/:userId/balance/credit",
    authenticate,
    requireAdministrator,
    asyncRoute(async (request, response) => {
      const body = creditBody.safeParse(request.body);
      const idempotencyKey = request.header("idempotency-key");
      const targetUserId = request.params.userId;
      if (!body.success || !idempotencyKey || typeof targetUserId !== "string") {
        response.status(400).json({ error: { code: "VALIDATION_ERROR" } });
        return;
      }

      const administrator = response.locals.authenticatedUser as PhoenixUser;
      const result = await executeCredit({
        pool: dependencies.ledgerPool,
        actorUserId: administrator.userId,
        targetUserId,
        asset: body.data.asset,
        amount: body.data.amount,
        idempotencyKey,
        notes: body.data.reason
      });

      response.status(result.idempotent ? 200 : 201).json(result);
    })
  );

  app.post(
    "/api/admin/users/:userId/balance/debit",
    authenticate,
    requireAdministrator,
    asyncRoute(async (request, response) => {
      const body = creditBody.safeParse(request.body);
      const idempotencyKey = request.header("idempotency-key");
      const targetUserId = request.params.userId;
      if (!body.success || !idempotencyKey || typeof targetUserId !== "string") {
        response.status(400).json({ error: { code: "VALIDATION_ERROR" } });
        return;
      }

      const administrator = response.locals.authenticatedUser as PhoenixUser;
      const result = await executeDebit({
        pool: dependencies.ledgerPool,
        actorUserId: administrator.userId,
        targetUserId,
        asset: body.data.asset,
        amount: body.data.amount,
        idempotencyKey,
        notes: body.data.reason
      });

      response.status(result.idempotent ? 200 : 201).json(result);
    })
  );

  app.put("/api/admin/users/:userId/balance", authenticate, requireAdministrator, asyncRoute(async (request, response) => {
    const body = setBalanceBody.safeParse(request.body);
    const idempotencyKey = request.header("idempotency-key");
    const targetUserId = request.params.userId;
    if (!body.success || !idempotencyKey || typeof targetUserId !== "string") { response.status(400).json({ error: { code: "VALIDATION_ERROR" } }); return; }
    const administrator = response.locals.authenticatedUser as PhoenixUser;
    const result = await executeSetBalance({ pool: dependencies.ledgerPool, actorUserId: administrator.userId, targetUserId, asset: body.data.asset, newBalance: body.data.newBalance, idempotencyKey, notes: body.data.reason });
    response.status(result.idempotent ? 200 : 201).json(result);
  }));

  app.post("/api/admin/users/:userId/portfolio/reset", authenticate, requireAdministrator, asyncRoute(async (request, response) => {
    const body = resetBody.safeParse(request.body);
    const idempotencyKey = request.header("idempotency-key");
    const targetUserId = request.params.userId;
    if (!body.success || !idempotencyKey || typeof targetUserId !== "string") { response.status(400).json({ error: { code: "VALIDATION_ERROR" } }); return; }
    const administrator = response.locals.authenticatedUser as PhoenixUser;
    const result = await executePortfolioReset({ pool: dependencies.ledgerPool, actorUserId: administrator.userId, targetUserId, idempotencyKey, notes: body.data.reason });
    response.status(result.idempotent ? 200 : 201).json(result);
  }));
};
