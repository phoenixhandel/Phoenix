import { Client } from "pg";
import { fileURLToPath } from "node:url";

const demoUser = {
  userId: "10000000-0000-4000-8000-000000000001",
  authUserId: "10000000-0000-4000-8000-000000000011",
  username: "phoenix_demo",
  email: "demo@phoenix.local",
  role: "USER"
} as const;

const adminUser = {
  userId: "10000000-0000-4000-8000-000000000002",
  authUserId: "10000000-0000-4000-8000-000000000012",
  username: "phoenix_admin",
  email: "admin@phoenix.local",
  role: "ADMIN"
} as const;

const assets = [
  ["BTC", "Bitcoin", "1.000000000000"],
  ["ETH", "Ethereum", "10.000000000000"],
  ["SOL", "Solana", "100.000000000000"],
  ["XRP", "XRP", "10000.000000000000"],
  ["USDT", "Tether USD", "100000.000000000000"]
] as const;

const pairs = [
  ["BTCUSDT", "BTC", "USDT"],
  ["ETHUSDT", "ETH", "USDT"],
  ["SOLUSDT", "SOL", "USDT"],
  ["XRPUSDT", "XRP", "USDT"],
  ["BTCETH", "BTC", "ETH"],
  ["BTCSOL", "BTC", "SOL"],
  ["BTCXRP", "BTC", "XRP"],
  ["ETHSOL", "ETH", "SOL"],
  ["ETHXRP", "ETH", "XRP"],
  ["SOLXRP", "SOL", "XRP"]
] as const;

type SeedClient = Pick<Client, "query">;

const insertUser = async (client: SeedClient, user: typeof demoUser | typeof adminUser) => {
  await client.query(
    "INSERT INTO users (user_id, auth_user_id, username, email, role, email_verified) VALUES ($1, $2, $3, $4, $5, true) ON CONFLICT (auth_user_id) DO UPDATE SET username = EXCLUDED.username, email = EXCLUDED.email, role = EXCLUDED.role, email_verified = true",
    [user.userId, user.authUserId, user.username, user.email, user.role]
  );
};

export const seedDevelopmentData = async (client: SeedClient) => {
  await client.query("BEGIN");
  try {
    await insertUser(client, demoUser);
    await insertUser(client, adminUser);

    for (const [symbol, name] of assets) {
      await client.query("INSERT INTO assets (symbol, name) VALUES ($1, $2) ON CONFLICT (symbol) DO NOTHING", [symbol, name]);
      for (const accountType of ["SYSTEM_LIQUIDITY", "SYSTEM_FEES", "SYSTEM_ADJUSTMENT"]) {
        await client.query(
          "INSERT INTO ledger_accounts (asset_symbol, account_type) VALUES ($1, $2::ledger_account_type) ON CONFLICT (asset_symbol, account_type) WHERE owner_user_id IS NULL DO NOTHING",
          [symbol, accountType]
        );
      }
      await client.query(
        "INSERT INTO ledger_accounts (owner_user_id, asset_symbol, account_type) VALUES ($1, $2, 'USER') ON CONFLICT (owner_user_id, asset_symbol) WHERE account_type = 'USER' DO NOTHING",
        [demoUser.userId, symbol]
      );
    }

    for (const [pairSymbol, baseAsset, quoteAsset] of pairs) {
      await client.query(
        "INSERT INTO trading_pairs (pair_symbol, base_asset, quote_asset) VALUES ($1, $2, $3) ON CONFLICT (pair_symbol) DO NOTHING",
        [pairSymbol, baseAsset, quoteAsset]
      );
    }
    await client.query("INSERT INTO market_configuration (singleton) VALUES (true) ON CONFLICT (singleton) DO NOTHING");

    for (const [symbol, , balance] of assets) {
      const transaction = await client.query<{ transaction_id: string }>(
        "INSERT INTO ledger_transactions (transaction_type, target_user_id, idempotency_key, notes) VALUES ('ADMIN_CREDIT', $1, $2, 'Development demo balance') ON CONFLICT (idempotency_key) DO NOTHING RETURNING transaction_id",
        [demoUser.userId, `seed:demo:${symbol}`]
      );
      const transactionId = transaction.rows[0]?.transaction_id;

      if (!transactionId) {
        continue;
      }

      const userAccount = await client.query<{ account_id: string }>(
        "SELECT account_id FROM ledger_accounts WHERE owner_user_id = $1 AND asset_symbol = $2 AND account_type = 'USER'",
        [demoUser.userId, symbol]
      );
      const adjustmentAccount = await client.query<{ account_id: string }>(
        "SELECT account_id FROM ledger_accounts WHERE owner_user_id IS NULL AND asset_symbol = $1 AND account_type = 'SYSTEM_ADJUSTMENT'",
        [symbol]
      );
      const userAccountId = userAccount.rows[0]?.account_id;
      const adjustmentAccountId = adjustmentAccount.rows[0]?.account_id;

      if (!userAccountId || !adjustmentAccountId) {
        throw new Error(`Seed accounts for ${symbol} are missing`);
      }

      await client.query(
        "INSERT INTO ledger_entries (transaction_id, account_id, amount_delta) VALUES ($1, $2, $3), ($1, $4, -$3::numeric)",
        [transactionId, userAccountId, balance, adjustmentAccountId]
      );
      await client.query(
        "INSERT INTO portfolio_balances (user_id, asset_symbol, balance) VALUES ($1, $2, $3) ON CONFLICT (user_id, asset_symbol) DO UPDATE SET balance = EXCLUDED.balance, updated_at = now()",
        [demoUser.userId, symbol, balance]
      );
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
};

const run = async () => {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to seed development data");
  }

  const client = new Client({ connectionString });
  await client.connect();
  try {
    await seedDevelopmentData(client);
  } finally {
    await client.end();
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
