import { Decimal } from "decimal.js";
import type { CreditResult, LedgerPool } from "./credit-service.js";

type Account = { account_id: string; asset_symbol: string; owner_user_id: string | null };

export const executePortfolioReset = async ({ pool, targetUserId, idempotencyKey, actorUserId, notes }: { pool: LedgerPool; targetUserId: string; idempotencyKey: string; actorUserId?: string; notes?: string }): Promise<CreditResult & { resetAssets: string[] }> => {
  if (!targetUserId || !idempotencyKey) throw new Error("User ID and idempotency key are required");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const transaction = await client.query<{ transaction_id: string }>("INSERT INTO ledger_transactions (transaction_type, actor_user_id, target_user_id, idempotency_key, notes) VALUES ('ADMIN_RESET', $1, $2, $3, $4) ON CONFLICT (idempotency_key) DO NOTHING RETURNING transaction_id", [actorUserId ?? null, targetUserId, idempotencyKey, notes ?? null]);
    const id = transaction.rows[0]?.transaction_id;
    if (!id) {
      const existing = await client.query<{ transaction_id: string }>("SELECT transaction_id FROM ledger_transactions WHERE idempotency_key = $1", [idempotencyKey]);
      await client.query("COMMIT");
      return { transactionId: existing.rows[0]?.transaction_id ?? "", idempotent: true, resetAssets: [] };
    }
    const balances = await client.query<{ asset_symbol: string; balance: string }>("SELECT asset_symbol, balance::text AS balance FROM portfolio_balances WHERE user_id = $1 AND balance > 0 ORDER BY asset_symbol FOR UPDATE", [targetUserId]);
    if (balances.rows.length === 0) throw new Error("NO_BALANCES_TO_RESET");
    const assets = balances.rows.map(({ asset_symbol }) => asset_symbol);
    const accounts = await client.query<Account>("SELECT account_id, asset_symbol, owner_user_id FROM ledger_accounts WHERE asset_symbol = ANY($1::varchar[]) AND ((owner_user_id = $2 AND account_type = 'USER') OR (owner_user_id IS NULL AND account_type = 'SYSTEM_ADJUSTMENT'))", [assets, targetUserId]);
    for (const { asset_symbol, balance } of balances.rows) {
      const user = accounts.rows.find((account) => account.asset_symbol === asset_symbol && account.owner_user_id === targetUserId);
      const adjustment = accounts.rows.find((account) => account.asset_symbol === asset_symbol && account.owner_user_id === null);
      if (!user || !adjustment) throw new Error(`Ledger account is missing for ${asset_symbol}`);
      await client.query("INSERT INTO ledger_entries (transaction_id, account_id, amount_delta) VALUES ($1, $2, -$3::numeric), ($1, $4, $3)", [id, user.account_id, new Decimal(balance).toFixed(12), adjustment.account_id]);
      await client.query("UPDATE portfolio_balances SET balance = 0, updated_at = now() WHERE user_id = $1 AND asset_symbol = $2", [targetUserId, asset_symbol]);
    }
    if (actorUserId && notes) await client.query("INSERT INTO admin_audit_events (admin_user_id, target_user_id, action, entity_type, entity_id, metadata, reason) VALUES ($1, $2, 'PORTFOLIO_RESET', 'LEDGER_TRANSACTION', $3, $4::jsonb, $5)", [actorUserId, targetUserId, id, JSON.stringify({ assets }), notes]);
    await client.query("COMMIT");
    return { transactionId: id, idempotent: false, resetAssets: assets };
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; } finally { client.release(); }
};
