import { planCredit } from "./credit.js";

type QueryResult<Row extends Record<string, unknown>> = { rows: Row[] };

export type LedgerClient = {
  query: <Row extends Record<string, unknown>>(
    statement: string,
    values?: readonly unknown[]
  ) => Promise<QueryResult<Row>>;
  release: () => void;
};

export type LedgerPool = {
  connect: () => Promise<LedgerClient>;
};

export type CreditInput = {
  pool: LedgerPool;
  targetUserId: string;
  asset: string;
  amount: string;
  idempotencyKey: string;
  actorUserId?: string;
  notes?: string;
};

export type CreditResult = {
  transactionId: string;
  idempotent: boolean;
};

const requireRow = <Row>(row: Row | undefined, message: string): Row => {
  if (!row) {
    throw new Error(message);
  }

  return row;
};

export const executeCredit = async ({
  pool,
  targetUserId,
  asset,
  amount,
  idempotencyKey,
  actorUserId,
  notes
}: CreditInput): Promise<CreditResult> => {
  if (!idempotencyKey) {
    throw new Error("Idempotency key is required");
  }

  const credit = planCredit({ userId: targetUserId, asset, amount });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const transaction = await client.query<{ transaction_id: string }>(
      "INSERT INTO ledger_transactions (transaction_type, actor_user_id, target_user_id, idempotency_key, notes) VALUES ('ADMIN_CREDIT', $1, $2, $3, $4) ON CONFLICT (idempotency_key) DO NOTHING RETURNING transaction_id",
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
      [targetUserId, credit.asset]
    );
    const adjustmentAccount = await client.query<{ account_id: string }>(
      "SELECT account_id FROM ledger_accounts WHERE owner_user_id IS NULL AND asset_symbol = $1 AND account_type = 'SYSTEM_ADJUSTMENT'",
      [credit.asset]
    );
    const userAccountId = requireRow(userAccount.rows[0], "User ledger account is missing").account_id;
    const adjustmentAccountId = requireRow(
      adjustmentAccount.rows[0],
      "System adjustment ledger account is missing"
    ).account_id;

    await client.query(
      "INSERT INTO portfolio_balances (user_id, asset_symbol, balance) VALUES ($1, $2, 0) ON CONFLICT (user_id, asset_symbol) DO NOTHING",
      [targetUserId, credit.asset]
    );
    await client.query(
      "SELECT balance FROM portfolio_balances WHERE user_id = $1 AND asset_symbol = $2 FOR UPDATE",
      [targetUserId, credit.asset]
    );
    await client.query(
      "INSERT INTO ledger_entries (transaction_id, account_id, amount_delta) VALUES ($1, $2, $3), ($1, $4, -$3::numeric)",
      [createdTransaction.transaction_id, userAccountId, credit.amount, adjustmentAccountId]
    );
    await client.query(
      "UPDATE portfolio_balances SET balance = balance + $3::numeric, updated_at = now() WHERE user_id = $1 AND asset_symbol = $2",
      [targetUserId, credit.asset, credit.amount]
    );
    if (actorUserId && notes) {
      await client.query(
        "INSERT INTO admin_audit_events (admin_user_id, target_user_id, action, entity_type, entity_id, metadata, reason) VALUES ($1, $2, 'BALANCE_CREDIT', 'LEDGER_TRANSACTION', $3, $4::jsonb, $5)",
        [
          actorUserId,
          targetUserId,
          createdTransaction.transaction_id,
          JSON.stringify({ asset: credit.asset, amount: credit.amount }),
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
