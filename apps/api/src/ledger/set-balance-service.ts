import { Decimal } from "decimal.js";
import type { CreditResult, LedgerPool } from "./credit-service.js";

export const executeSetBalance = async ({ pool, targetUserId, asset, newBalance, idempotencyKey, actorUserId, notes }: { pool: LedgerPool; targetUserId: string; asset: string; newBalance: string; idempotencyKey: string; actorUserId?: string; notes?: string }): Promise<CreditResult & { delta: string }> => {
  if (!/^(?:0|[1-9]\d*)(?:\.\d{1,12})?$/.test(newBalance) || !idempotencyKey) throw new Error("A non-negative balance and idempotency key are required");
  const desired = new Decimal(newBalance).toFixed(12);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const transaction = await client.query<{ transaction_id: string }>("INSERT INTO ledger_transactions (transaction_type, actor_user_id, target_user_id, idempotency_key, notes) VALUES ('ADMIN_SET_BALANCE', $1, $2, $3, $4) ON CONFLICT (idempotency_key) DO NOTHING RETURNING transaction_id", [actorUserId ?? null, targetUserId, idempotencyKey, notes ?? null]);
    const id = transaction.rows[0]?.transaction_id;
    if (!id) {
      const existing = await client.query<{ transaction_id: string }>("SELECT transaction_id FROM ledger_transactions WHERE idempotency_key = $1", [idempotencyKey]);
      await client.query("COMMIT");
      return { transactionId: existing.rows[0]?.transaction_id ?? "", idempotent: true, delta: "0.000000000000" };
    }
    const user = await client.query<{ account_id: string }>("SELECT account_id FROM ledger_accounts WHERE owner_user_id = $1 AND asset_symbol = $2 AND account_type = 'USER'", [targetUserId, asset]);
    const adjustment = await client.query<{ account_id: string }>("SELECT account_id FROM ledger_accounts WHERE owner_user_id IS NULL AND asset_symbol = $1 AND account_type = 'SYSTEM_ADJUSTMENT'", [asset]);
    if (!user.rows[0] || !adjustment.rows[0]) throw new Error("Ledger account is missing");
    await client.query("INSERT INTO portfolio_balances (user_id, asset_symbol, balance) VALUES ($1, $2, 0) ON CONFLICT (user_id, asset_symbol) DO NOTHING", [targetUserId, asset]);
    const current = await client.query<{ balance: string }>("SELECT balance::text AS balance FROM portfolio_balances WHERE user_id = $1 AND asset_symbol = $2 FOR UPDATE", [targetUserId, asset]);
    const delta = new Decimal(desired).minus(current.rows[0]?.balance ?? "0").toFixed(12);
    if (new Decimal(delta).isZero()) throw new Error("NO_BALANCE_CHANGE");
    await client.query("INSERT INTO ledger_entries (transaction_id, account_id, amount_delta) VALUES ($1, $2, $3), ($1, $4, -$3::numeric)", [id, user.rows[0].account_id, delta, adjustment.rows[0].account_id]);
    await client.query("UPDATE portfolio_balances SET balance = balance + $3::numeric, updated_at = now() WHERE user_id = $1 AND asset_symbol = $2", [targetUserId, asset, delta]);
    if (actorUserId && notes) await client.query("INSERT INTO admin_audit_events (admin_user_id, target_user_id, action, entity_type, entity_id, metadata, reason) VALUES ($1, $2, 'BALANCE_SET', 'LEDGER_TRANSACTION', $3, $4::jsonb, $5)", [actorUserId, targetUserId, id, JSON.stringify({ asset, newBalance: desired, delta }), notes]);
    await client.query("COMMIT");
    return { transactionId: id, idempotent: false, delta };
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; } finally { client.release(); }
};
