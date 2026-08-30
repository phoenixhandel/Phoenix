import { createApp } from "./app.js";
import { createSupabaseAuthProvider } from "./auth/supabase.js";
import { loadConfig } from "./config.js";
import { createPgUserDirectory } from "./db/users.js";
import { Pool } from "pg";
import { BinanceMarketProvider, DatabaseMarketProvider, ManualMarketProvider } from "./market/providers.js";
import { MarketService } from "./market/service.js";
import { executeMarketOrder, type MarketOrderInput } from "./trading/execution-service.js";
import type { LedgerPool } from "./ledger/credit-service.js";
import { createStripeIdentityProvider } from "./identity/provider.js";
import { createOpenAiSupportResponder } from "./support/routes.js";

const config = loadConfig(process.env);
const pool = new Pool({ connectionString: config.databaseUrl });
const market = new MarketService(new DatabaseMarketProvider(pool as LedgerPool, config.marketProvider === "manual" ? new ManualMarketProvider() : new BinanceMarketProvider()));
const dependencies = config.supabaseUrl && config.supabaseAnonKey
  ? {
      auth: createSupabaseAuthProvider({ url: config.supabaseUrl, anonKey: config.supabaseAnonKey }),
      users: createPgUserDirectory(pool),
      ledgerPool: pool as LedgerPool,
      identity: config.stripeSecretKey ? createStripeIdentityProvider(config.stripeSecretKey) : undefined,
      support: config.openAiApiKey ? createOpenAiSupportResponder({ apiKey: config.openAiApiKey, model: config.openAiSupportModel ?? "gpt-5.6" }) : undefined,
      stripeWebhook: config.stripeSecretKey && config.stripeWebhookSecret ? { secretKey: config.stripeSecretKey, webhookSecret: config.stripeWebhookSecret } : undefined,
      trading: {
        requireKycForTrading: config.requireKycForTrading,
        getTicker: (pair: string) => market.getTicker(pair),
        getExecutionSettings: async () => {
          const client = await pool.connect();
          try {
            const result = await client.query<{ fee_rate: string; spread: string; slippage: string; simulation_paused: boolean }>(
              "SELECT trading_fee::text AS fee_rate, spread::text AS spread, slippage::text AS slippage, simulation_paused FROM market_configuration WHERE singleton = true"
            );
            const settings = result.rows[0];
            if (!settings) throw new Error("MARKET_CONFIGURATION_UNAVAILABLE");
            return { feeRate: settings.fee_rate, spread: settings.spread, slippage: settings.slippage, simulationPaused: settings.simulation_paused };
          } finally {
            client.release();
          }
        },
        execute: (input: Omit<MarketOrderInput, "pool">) => executeMarketOrder({ pool: pool as LedgerPool, ...input })
      }
    }
  : undefined;
const app = createApp(config, dependencies, market);

app.listen(config.port, () => {
  console.info(`Phoenix API listening on port ${config.port}`);
  void market.connect().catch((error: unknown) => console.warn("Market stream unavailable; using REST fallback", error));
});
