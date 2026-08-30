export type AuthIdentity = {
  id: string;
  email: string | null;
  emailVerified: boolean;
  phone?: string | null;
  phoneVerified?: boolean;
};

export type PhoenixUser = {
  userId: string;
  role: "USER" | "ADMIN";
  accountStatus: "ACTIVE" | "SUSPENDED" | "LOCKED";
  tradingStatus: "ENABLED" | "FROZEN";
  emailVerified: boolean;
  kycStatus: "NOT_STARTED" | "PENDING" | "VERIFIED" | "FAILED" | "REQUIRES_INPUT";
};

export type AuthProvider = {
  getUser: (accessToken: string) => Promise<AuthIdentity | null>;
};

export type UserDirectory = {
  findByAuthUserId: (authUserId: string) => Promise<PhoenixUser | null>;
};

export type SessionResolution =
  | { kind: "authenticated"; identity: AuthIdentity; user: PhoenixUser }
  | { kind: "denied"; code: "INVALID_SESSION" | "USER_NOT_REGISTERED" | "ACCOUNT_SUSPENDED" | "ACCOUNT_LOCKED" };

export const resolveAuthenticatedUser = async ({
  accessToken,
  auth,
  users
}: {
  accessToken: string;
  auth: AuthProvider;
  users: UserDirectory;
}): Promise<SessionResolution> => {
  const identity = await auth.getUser(accessToken);
  if (!identity) {
    return { kind: "denied", code: "INVALID_SESSION" };
  }

  const user = await users.findByAuthUserId(identity.id);
  if (!user) {
    return { kind: "denied", code: "USER_NOT_REGISTERED" };
  }
  if (user.accountStatus === "SUSPENDED") {
    return { kind: "denied", code: "ACCOUNT_SUSPENDED" };
  }
  if (user.accountStatus === "LOCKED") {
    return { kind: "denied", code: "ACCOUNT_LOCKED" };
  }

  return { kind: "authenticated", identity, user };
};
