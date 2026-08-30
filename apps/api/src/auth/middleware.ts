import type { RequestHandler } from "express";
import { resolveAuthenticatedUser } from "./session.js";
import type { AuthProvider, UserDirectory } from "./session.js";

const bearerToken = (authorization: string | undefined) => {
  const match = authorization?.match(/^Bearer (.+)$/i);
  return match?.[1];
};

export const createAuthenticationMiddleware = (dependencies: {
  auth: AuthProvider;
  users: UserDirectory;
}): RequestHandler =>
  async (request, response, next) => {
    const accessToken = bearerToken(request.header("authorization"));
    if (!accessToken) {
      response.status(401).json({ error: { code: "INVALID_SESSION" } });
      return;
    }

    const session = await resolveAuthenticatedUser({ accessToken, ...dependencies });
    if (session.kind === "denied") {
      const status = session.code === "INVALID_SESSION" ? 401 : 403;
      response.status(status).json({ error: { code: session.code } });
      return;
    }

    if (!session.user.emailVerified) {
      response.status(403).json({ error: { code: "EMAIL_VERIFICATION_REQUIRED" } });
      return;
    }

    response.locals.authenticatedUser = session.user;
    next();
  };

export const requireAdministrator: RequestHandler = (_request, response, next) => {
  if (response.locals.authenticatedUser?.role !== "ADMIN") {
    response.status(403).json({ error: { code: "ADMIN_REQUIRED" } });
    return;
  }

  next();
};
