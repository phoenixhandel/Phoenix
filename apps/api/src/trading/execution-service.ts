import { Decimal } from "decimal.js";
import type { LedgerPool } from "../ledger/credit-service.js";
import type { TradeSide } from "../market/engine.js";
import { planMarketOrder, type MarketOrderPlan } from "./market-order.js";

export type MarketOrderInput = {
  pool: LedgerPool;
  userId: string;
  pair: string;
  side: TradeSide;
  baseAmount: string;
  marketPrice: string;
  spread: string;
  slippage: string;
  feeRate: string;
  idempotencyKey: string;
};

export type MarketOrderResult = {
  tradeId: string;
  idempotent: boolean;
  executionPrice: string;
  quoteAmount: string;
  feeAmount: string;
};

type Account = { account_id: string; asset_symbol: string; account_type: "USER" | "SYSTEM_LIQUIDITY" | "SYSTEM_FEES" };

const requireRow = <Row>(row: Row | undefined, message: string): Row => {
  if (!row) throw new Error(message);
  return row;
};

const accountId = (accounts: Account[], asset: string, type: Account["account_type"]) =>
  requireRow(accounts.find((account) => account.asset_symbol === asset && account.account_type === type), `Missing ${type} account for ${asset}`).account_id;

const entriesFor = ({
  transactionId,
  plan,
  side,
  baseAsset,
  quoteAsset,
  accounts
}: {
  transactionId: string;
  plan: MarketOrderPlan;
  side: TradeSide;
  baseAsset: string;
  quoteAsset: string;
  accounts: Account[];
}) => {
  const base = new Decimal(plan.balanceDeltas.find(({ asset }) => asset === baseAsset)?.amountDelta ?? "0").absoluteValue().toFixed(12);
  const quote = new Decimal(plan.quoteAmount).toFixed(12);
  const fee = new Decimal(plan.feeAmount).toFixed(12);
  const userBase = accountId(accounts, baseAsset, "USER");
  const userQuote = accountId(accounts, quoteAsset, "USER");
  const liquidityBase = accountId(accounts, baseAsset, "SYSTEM_LIQUIDITY");
  const liquidityQuote = accountId(accounts, quoteAsset, "SYSTEM_LIQUIDITY");
  const feesQuote = accountId(accounts, quoteAsset, "SYSTEM_FEES");

  if (side === "BUY") {
    return [
      [transactionId, userBase, base],
      [transactionId, liquidityBase, new Decimal(base).negated().toFixed(12)],
      [transactionId, userQuote, new Decimal(quote).plus(fee).negated().toFixed(12)],
      [transactionId, liquidityQuote, quote],
      [transactionId, feesQuote, fee]
    ];
  }

  return [
    [transactionId, userBase, new Decimal(base).negated().toFixed(12)],
    [transactionId, liquidityBase, base],
    [transactionId, userQuote, new Decimal(quote).minus(fee).toFixed(12)],
    [transactionId, liquidityQuote, new Decimal(quote).negated().toFixed(12)],
    [transactionId, feesQuote, fee]
  ];
};

export const executeMarketOrder = async ({
  pool,
  userId,
  pair,
  side,
  baseAmount,
  marketPrice,
  spread,
  slippage,
  feeRate,
  idempotencyKey
}: MarketOrderInput): Promise<MarketOrderResult> => {
  if (!userId || !idempotencyKey) throw new Error("User ID and idempotency key are required");
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const configuredPair = await client.query<{ base_asset: string; quote_asset: string }>(
      "SELECT base_asset, quote_asset FROM trading_pairs WHERE pair_symbol = $1 AND enabled = true",
      [pair]
    );
    const pairRecord = requireRow(configuredPair.rows[0], "Unsupported or disabled trading pair");
    const plan = planMarketOrder({ side, baseAsset: pairRecord.base_asset, quoteAsset: pairRecord.quote_asset, baseAmount, marketPrice, spread, slippage, feeRate });
    const transaction = await client.query<{ transaction_id: string }>(
      "INSERT INTO ledger_transactions (transaction_type, actor_user_id, target_user_id, idempotency_key, notes) VALUES ('TRADE', $1, $1, $2, 'Simulated market order') ON CONFLICT (idempotency_key) DO NOTHING RETURNING transaction_id",
      [userId, idempotencyKey]
    );
    const transactionId = transaction.rows[0]?.transaction_id;
    if (!transactionId) {
      const existing = await client.query<{ trade_id: string; execution_price: string; quote_amount: string; fee_amount: string }>(
        "SELECT trade_id, execution_price::text, quote_amount::text, fee_amount::text FROM trades WHERE idempotency_key = $1",
        [idempotencyKey]
      );
      const trade = requireRow(existing.rows[0], "Idempotency key did not resolve to a trade");
      await client.query("COMMIT");
      return { tradeId: trade.trade_id, idempotent: true, executionPrice: trade.execution_price, quoteAmount: trade.quote_amount, feeAmount: trade.fee_amount };
    }

    const assets = [pairRecord.base_asset, pairRecord.quote_asset].sort();
    await client.query(
      "INSERT INTO portfolio_balances (user_id, asset_symbol, balance) SELECT $1, unnest($2::varchar[]), 0 ON CONFLICT (user_id, asset_symbol) DO NOTHING",
      [userId, assets]
    );
    const balances = await client.query<{ asset_symbol: string; balance: string }>(
      "SELECT asset_symbol, balance::text AS balance FROM portfolio_balances WHERE user_id = $1 AND asset_symbol = ANY($2::varchar[]) ORDER BY asset_symbol FOR UPDATE",
      [userId, assets]
    );
    const available = new Map(balances.rows.map(({ asset_symbol, balance }) => [asset_symbol, new Decimal(balance)]));
    const required = available.get(plan.requiredBalance.asset);
    if (!required || required.lessThan(plan.requiredBalance.amount)) throw new Error("INSUFFICIENT_BALANCE");

    const accounts = await client.query<Account>(
      "SELECT account_id, asset_symbol, account_type FROM ledger_accounts WHERE (owner_user_id = $1 AND account_type = 'USER') OR (owner_user_id IS NULL AND account_type IN ('SYSTEM_LIQUIDITY', 'SYSTEM_FEES'))",
      [userId]
    );
    const trade = await client.query<{ trade_id: string }>(
      "INSERT INTO trades (user_id, pair_symbol, side, base_asset, quote_asset, base_amount, quote_amount, market_price, execution_price, fee_asset, fee_amount, idempotency_key) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $5, $10, $11) RETURNING trade_id",
      [userId, pair, side, pairRecord.base_asset, pairRecord.quote_asset, baseAmount, plan.quoteAmount, marketPrice, plan.executionPrice, plan.feeAmount, idempotencyKey]
    );
    for (const [entryTransactionId, account, amount] of entriesFor({ transactionId, plan, side, baseAsset: pairRecord.base_asset, quoteAsset: pairRecord.quote_asset, accounts: accounts.rows })) {
      await client.query("INSERT INTO ledger_entries (transaction_id, account_id, amount_delta) VALUES ($1, $2, $3)", [entryTransactionId, account, amount]);
    }
    for (const { asset, amountDelta } of plan.balanceDeltas) {
      await client.query(
        "UPDATE portfolio_balances SET balance = balance + $3::numeric, updated_at = now() WHERE user_id = $1 AND asset_symbol = $2",
        [userId, asset, amountDelta]
      );
    }
    await client.query(
      "INSERT INTO activity_events (user_id, event_type, metadata) VALUES ($1, 'TRADE_EXECUTED', $2::jsonb)",
      [userId, JSON.stringify({ pair, side, tradeId: requireRow(trade.rows[0], "Trade was not created").trade_id, baseAmount, quoteAmount: plan.quoteAmount, feeAmount: plan.feeAmount })]
    );
    await client.query("COMMIT");
    return { tradeId: requireRow(trade.rows[0], "Trade was not created").trade_id, idempotent: false, executionPrice: plan.executionPrice, quoteAmount: plan.quoteAmount, feeAmount: plan.feeAmount };
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
};
