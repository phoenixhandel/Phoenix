import { Decimal } from "decimal.js";
import { parsePositiveAmount } from "./amount.js";
import type { CreditResult, LedgerPool } from "./credit-service.js";

type TransferInput = { pool: LedgerPool; sourceUserId: string; targetUserId: string; asset: string; amount: string; idempotencyKey: string; notes?: string };
const requireRow = <Row>(row: Row | undefined, message: string): Row => { if (!row) throw new Error(message); return row; };

export const executeTransfer = async ({ pool, sourceUserId, targetUserId, asset, amount, idempotencyKey, notes }: TransferInput): Promise<CreditResult> => {
  if (!sourceUserId || !targetUserId || sourceUserId === targetUserId || !idempotencyKey) throw new Error("Distinct users and an idempotency key are required");
  const normalizedAmount = parsePositiveAmount(amount);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const transaction = await client.query<{ transaction_id: string }>("INSERT INTO ledger_transactions (transaction_type, actor_user_id, target_user_id, idempotency_key, notes) VALUES ('TRANSFER', $1, $2, $3, $4) ON CONFLICT (idempotency_key) DO NOTHING RETURNING transaction_id", [sourceUserId, targetUserId, idempotencyKey, notes ?? null]);
    const created = transaction.rows[0];
    if (!created) {
      const existing = await client.query<{ transaction_id: string }>("SELECT transaction_id FROM ledger_transactions WHERE idempotency_key = $1", [idempotencyKey]);
      await client.query("COMMIT");
      return { transactionId: requireRow(existing.rows[0], "Idempotency key did not resolve to a transaction").transaction_id, idempotent: true };
    }
    const orderedUsers = [sourceUserId, targetUserId].sort();
    await client.query("INSERT INTO portfolio_balances (user_id, asset_symbol, balance) SELECT unnest($1::uuid[]), $2, 0 ON CONFLICT (user_id, asset_symbol) DO NOTHING", [orderedUsers, asset]);
    const balances = await client.query<{ user_id: string; balance: string }>("SELECT user_id, balance::text AS balance FROM portfolio_balances WHERE user_id = ANY($1::uuid[]) AND asset_symbol = $2 ORDER BY user_id FOR UPDATE", [orderedUsers, asset]);
    const sourceBalance = requireRow(balances.rows.find((row) => row.user_id === sourceUserId), "Source balance is missing");
    if (new Decimal(sourceBalance.balance).lessThan(normalizedAmount)) throw new Error("INSUFFICIENT_BALANCE");
    const accounts = await client.query<{ account_id: string; owner_user_id: string }>("SELECT account_id, owner_user_id FROM ledger_accounts WHERE owner_user_id = ANY($1::uuid[]) AND asset_symbol = $2 AND account_type = 'USER'", [orderedUsers, asset]);
    const sourceAccount = requireRow(accounts.rows.find((row) => row.owner_user_id === sourceUserId), "Source ledger account is missing");
    const targetAccount = requireRow(accounts.rows.find((row) => row.owner_user_id === targetUserId), "Target ledger account is missing");
    await client.query("INSERT INTO ledger_entries (transaction_id, account_id, amount_delta) VALUES ($1, $2, -$4::numeric), ($1, $3, $4::numeric)", [created.transaction_id, sourceAccount.account_id, targetAccount.account_id, normalizedAmount]);
    await client.query("UPDATE portfolio_balances SET balance = balance - $3::numeric, updated_at = now() WHERE user_id = $1 AND asset_symbol = $2", [sourceUserId, asset, normalizedAmount]);
    await client.query("UPDATE portfolio_balances SET balance = balance + $3::numeric, updated_at = now() WHERE user_id = $1 AND asset_symbol = $2", [targetUserId, asset, normalizedAmount]);
    await client.query("COMMIT");
    return { transactionId: created.transaction_id, idempotent: false };
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; } finally { client.release(); }
};
