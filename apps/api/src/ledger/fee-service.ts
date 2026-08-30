import { Decimal } from "decimal.js";
import { parsePositiveAmount } from "./amount.js";
import type { CreditResult, LedgerPool } from "./credit-service.js";

const requireRow = <Row>(row: Row | undefined, message: string): Row => { if (!row) throw new Error(message); return row; };

export const executeFee = async ({ pool, userId, asset, amount, idempotencyKey, notes }: { pool: LedgerPool; userId: string; asset: string; amount: string; idempotencyKey: string; notes?: string }): Promise<CreditResult> => {
  if (!userId || !idempotencyKey) throw new Error("User ID and idempotency key are required");
  const normalizedAmount = parsePositiveAmount(amount);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const transaction = await client.query<{ transaction_id: string }>("INSERT INTO ledger_transactions (transaction_type, actor_user_id, target_user_id, idempotency_key, notes) VALUES ('FEE', $1, $1, $2, $3) ON CONFLICT (idempotency_key) DO NOTHING RETURNING transaction_id", [userId, idempotencyKey, notes ?? null]);
    const created = transaction.rows[0];
    if (!created) {
      const existing = await client.query<{ transaction_id: string }>("SELECT transaction_id FROM ledger_transactions WHERE idempotency_key = $1", [idempotencyKey]);
      await client.query("COMMIT");
      return { transactionId: requireRow(existing.rows[0], "Idempotency key did not resolve to a transaction").transaction_id, idempotent: true };
    }
    const accounts = await client.query<{ account_id: string; account_type: "USER" | "SYSTEM_FEES" }>("SELECT account_id, account_type FROM ledger_accounts WHERE asset_symbol = $1 AND ((owner_user_id = $2 AND account_type = 'USER') OR (owner_user_id IS NULL AND account_type = 'SYSTEM_FEES'))", [asset, userId]);
    const userAccount = requireRow(accounts.rows.find((account) => account.account_type === "USER"), "User ledger account is missing");
    const feeAccount = requireRow(accounts.rows.find((account) => account.account_type === "SYSTEM_FEES"), "System fee account is missing");
    await client.query("INSERT INTO portfolio_balances (user_id, asset_symbol, balance) VALUES ($1, $2, 0) ON CONFLICT (user_id, asset_symbol) DO NOTHING", [userId, asset]);
    const balance = await client.query<{ balance: string }>("SELECT balance::text AS balance FROM portfolio_balances WHERE user_id = $1 AND asset_symbol = $2 FOR UPDATE", [userId, asset]);
    if (new Decimal(requireRow(balance.rows[0], "Balance is missing").balance).lessThan(normalizedAmount)) throw new Error("INSUFFICIENT_BALANCE");
    await client.query("INSERT INTO ledger_entries (transaction_id, account_id, amount_delta) VALUES ($1, $2, -$4::numeric), ($1, $3, $4::numeric)", [created.transaction_id, userAccount.account_id, feeAccount.account_id, normalizedAmount]);
    await client.query("UPDATE portfolio_balances SET balance = balance - $3::numeric, updated_at = now() WHERE user_id = $1 AND asset_symbol = $2", [userId, asset, normalizedAmount]);
    await client.query("COMMIT");
    return { transactionId: created.transaction_id, idempotent: false };
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; } finally { client.release(); }
};
