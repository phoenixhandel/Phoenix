import type { Express, RequestHandler } from "express";
import { z } from "zod";
import { createAuthenticationMiddleware } from "../auth/middleware.js";
import type { AuthProvider, UserDirectory } from "../auth/session.js";

export type ContactMailSender = { send: (request: { subject: string; message: string; accountEmail: string | null; accountUserId: string }) => Promise<void> };
const schema = z.object({ subject: z.string().trim().min(1).max(120), message: z.string().trim().min(1).max(4000) });
const asyncRoute = (handler: RequestHandler): RequestHandler => (request, response, next) => { Promise.resolve(handler(request, response, next)).catch(next); };

export const registerContactRoutes = (app: Express, { auth, users, mail }: { auth: AuthProvider; users: UserDirectory; mail?: ContactMailSender | undefined }) => {
  const authenticate = createAuthenticationMiddleware({ auth, users });
  app.post("/api/me/support-requests", authenticate, asyncRoute(async (request, response) => {
    const parsed = schema.safeParse(request.body);
    if (!parsed.success) { response.status(400).json({ error: { code: "VALIDATION_ERROR" } }); return; }
    if (!mail) { response.status(503).json({ error: { code: "SUPPORT_DELIVERY_UNAVAILABLE" } }); return; }
    const user = response.locals.authenticatedUser;
    const identity = await auth.getUser(request.header("authorization")?.replace(/^Bearer\s+/i, "") ?? "");
    await mail.send({ ...parsed.data, accountEmail: identity?.email ?? null, accountUserId: user.userId });
    response.status(202).json({ accepted: true });
  }));
};

export const createResendContactMailSender = ({ apiKey, from, inbox }: { apiKey: string; from: string; inbox: string }): ContactMailSender => ({
  send: async ({ subject, message, accountEmail, accountUserId }) => {
    const response = await fetch("https://api.resend.com/emails", { method: "POST", headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" }, body: JSON.stringify({ from, to: [inbox], subject: `[Phoenix] ${subject}`, text: `Account: ${accountEmail ?? "unavailable"}\nUser ID: ${accountUserId}\n\n${message}` }) });
    if (!response.ok) throw new Error("SUPPORT_DELIVERY_FAILED");
  }
});
