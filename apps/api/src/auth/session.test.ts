import { describe, expect, it } from "vitest";

type SessionModule = {
  resolveAuthenticatedUser?: (input: {
    accessToken: string;
    auth: { getUser: (token: string) => Promise<{ id: string; email: string | null; emailVerified: boolean } | null> };
    users: { findByAuthUserId: (id: string) => Promise<{ userId: string; role: "USER" | "ADMIN"; accountStatus: "ACTIVE" | "SUSPENDED" | "LOCKED"; tradingStatus: "ENABLED" | "FROZEN"; emailVerified: boolean; kycStatus: "NOT_STARTED" | "PENDING" | "VERIFIED" | "FAILED" | "REQUIRES_INPUT" } | null> };
  }) => Promise<unknown>;
};

const loadSessionModule = async (): Promise<SessionModule> => {
  const entrypoint = "./session.js";
  return import(entrypoint).catch(() => ({}));
};

describe("authenticated session resolution", () => {
  it("rejects a suspended Phoenix user even when Supabase accepts the token", async () => {
    const session = await loadSessionModule();
    if (!session.resolveAuthenticatedUser) {
      expect(session.resolveAuthenticatedUser).toBeTypeOf("function");
      return;
    }

    const result = await session.resolveAuthenticatedUser({
      accessToken: "valid-token",
      auth: { getUser: async () => ({ id: "auth-1", email: "user@example.test", emailVerified: true }) },
      users: { findByAuthUserId: async () => ({ userId: "user-1", role: "USER", accountStatus: "SUSPENDED", tradingStatus: "ENABLED", emailVerified: true, kycStatus: "VERIFIED" }) }
    });

    expect(result).toEqual({ kind: "denied", code: "ACCOUNT_SUSPENDED" });
  });
});
