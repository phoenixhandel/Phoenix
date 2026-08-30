import { Decimal } from "decimal.js";
import { parsePositiveAmount } from "./amount.js";
import type { CreditResult, LedgerPool } from "./credit-service.js";

export type DebitInput = {
  pool: LedgerPool;
  targetUserId: string;
  asset: string;
  amount: string;
  idempotencyKey: string;
  actorUserId?: string;
  notes?: string;
};

const requireRow = <Row>(row: Row | undefined, message: string): Row => {
  if (!row) {
    throw new Error(message);
  }

  return row;
};

export const executeDebit = async ({
  pool,
  targetUserId,
  asset,
  amount,
  idempotencyKey,
  actorUserId,
  notes
}: DebitInput): Promise<CreditResult> => {
  if (!targetUserId || !idempotencyKey) {
    throw new Error("User ID and idempotency key are required");
  }

  const normalizedAmount = new Decimal(parsePositiveAmount(amount)).toFixed(12);
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const transaction = await client.query<{ transaction_id: string }>(
      "INSERT INTO ledger_transactions (transaction_type, actor_user_id, target_user_id, idempotency_key, notes) VALUES ('ADMIN_DEBIT', $1, $2, $3, $4) ON CONFLICT (idempotency_key) DO NOTHING RETURNING transaction_id",
      [actorUserId ?? null, targetUserId, idempotencyKey, notes ?? null]
    );
    const createdTransaction = transaction.rows[0];
    if (!createdTransaction) {
      const existing = await client.query<{ transaction_id: string }>(
        "SELECT transaction_id FROM ledger_transactions WHERE idempotency_key = $1",
        [idempotencyKey]
      );
      const original = requireRow(existing.rows[0], "Idempotency key did not resolve to a transaction");
      await client.query("COMMIT");
      return { transactionId: original.transaction_id, idempotent: true };
    }

    const userAccount = await client.query<{ account_id: string }>(
      "SELECT account_id FROM ledger_accounts WHERE owner_user_id = $1 AND asset_symbol = $2 AND account_type = 'USER'",
      [targetUserId, asset]
    );
    const adjustmentAccount = await client.query<{ account_id: string }>(
      "SELECT account_id FROM ledger_accounts WHERE owner_user_id IS NULL AND asset_symbol = $1 AND account_type = 'SYSTEM_ADJUSTMENT'",
      [asset]
    );
    const userAccountId = requireRow(userAccount.rows[0], "User ledger account is missing").account_id;
    const adjustmentAccountId = requireRow(
      adjustmentAccount.rows[0],
      "System adjustment ledger account is missing"
    ).account_id;

    await client.query(
      "INSERT INTO portfolio_balances (user_id, asset_symbol, balance) VALUES ($1, $2, 0) ON CONFLICT (user_id, asset_symbol) DO NOTHING",
      [targetUserId, asset]
    );
    const balance = await client.query<{ balance: string }>(
      "SELECT balance::text AS balance FROM portfolio_balances WHERE user_id = $1 AND asset_symbol = $2 FOR UPDATE",
      [targetUserId, asset]
    );
    const currentBalance = new Decimal(requireRow(balance.rows[0], "Portfolio balance is missing").balance);
    if (currentBalance.lessThan(normalizedAmount)) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    await client.query(
      "INSERT INTO ledger_entries (transaction_id, account_id, amount_delta) VALUES ($1, $2, -$3::numeric), ($1, $4, $3)",
      [createdTransaction.transaction_id, userAccountId, normalizedAmount, adjustmentAccountId]
    );
    await client.query(
      "UPDATE portfolio_balances SET balance = balance - $3::numeric, updated_at = now() WHERE user_id = $1 AND asset_symbol = $2",
      [targetUserId, asset, normalizedAmount]
    );
    if (actorUserId && notes) {
      await client.query(
        "INSERT INTO admin_audit_events (admin_user_id, target_user_id, action, entity_type, entity_id, metadata, reason) VALUES ($1, $2, 'BALANCE_DEBIT', 'LEDGER_TRANSACTION', $3, $4::jsonb, $5)",
        [
          actorUserId,
          targetUserId,
          createdTransaction.transaction_id,
          JSON.stringify({ asset, amount: normalizedAmount }),
          notes
        ]
      );
    }
    await client.query("COMMIT");

    return { transactionId: createdTransaction.transaction_id, idempotent: false };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};
