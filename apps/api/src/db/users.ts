import type { Pool } from "pg";
import type { UserDirectory } from "../auth/session.js";

export const createPgUserDirectory = (pool: Pool): UserDirectory => ({
  findByAuthUserId: async (authUserId) => {
    const result = await pool.query<{
      user_id: string;
      role: "USER" | "ADMIN";
      account_status: "ACTIVE" | "SUSPENDED" | "LOCKED";
      trading_status: "ENABLED" | "FROZEN";
      email_verified: boolean;
      kyc_status: "NOT_STARTED" | "PENDING" | "VERIFIED" | "FAILED" | "REQUIRES_INPUT";
    }>("SELECT user_id, role, account_status, trading_status, email_verified, kyc_status FROM users WHERE auth_user_id = $1", [authUserId]);
    const row = result.rows[0];
    return row
      ? {
          userId: row.user_id,
          role: row.role,
          accountStatus: row.account_status,
          tradingStatus: row.trading_status,
          emailVerified: row.email_verified,
          kycStatus: row.kyc_status
        }
      : null;
  }
});
