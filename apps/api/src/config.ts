import { z } from "zod";

const optionalNonEmptyString = z.preprocess(
  (value) => value === "" ? undefined : value,
  z.string().min(1).optional()
);

const configSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65_535).default(3001),
  DATABASE_URL: z.url().default("postgresql://phoenix:phoenix@localhost:5432/phoenix"),
  CORS_ORIGIN: z.url().default("http://localhost:5173"),
  MARKET_PROVIDER: z.enum(["binance", "manual"]).default("binance"),
  REQUIRE_KYC_FOR_TRADING: z.enum(["true", "false"]).default("false").transform((value) => value === "true"),
  SUPABASE_URL: z.url().optional(),
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  OPENAI_API_KEY: optionalNonEmptyString,
  OPENAI_SUPPORT_MODEL: z.string().min(1).default("gpt-5.6"),
  RESEND_API_KEY: optionalNonEmptyString,
  SUPPORT_FROM_EMAIL: optionalNonEmptyString,
  SUPPORT_INBOX_EMAIL: z.string().email().default("phoenixhandel@protonmail.com"),
  WITHDRAWAL_AGENT_CODE: optionalNonEmptyString
}).refine((value) => Boolean(value.SUPABASE_URL) === Boolean(value.SUPABASE_ANON_KEY), {
  message: "SUPABASE_URL and SUPABASE_ANON_KEY must be set together"
});

export type AppConfig = {
  port: number;
  databaseUrl: string;
  corsOrigin: string;
  marketProvider: "binance" | "manual";
  requireKycForTrading: boolean;
  supabaseUrl: string | undefined;
  supabaseAnonKey: string | undefined;
  stripeSecretKey?: string | undefined;
  stripeWebhookSecret?: string | undefined;
  openAiApiKey?: string | undefined;
  openAiSupportModel?: string | undefined;
  resendApiKey?: string | undefined;
  supportFromEmail?: string | undefined;
  supportInboxEmail?: string | undefined;
  withdrawalAgentCode?: string | undefined;
};

export const loadConfig = (environment: NodeJS.ProcessEnv): AppConfig => {
  const parsed = configSchema.parse(environment);

  return {
    port: parsed.PORT,
    databaseUrl: parsed.DATABASE_URL,
    corsOrigin: parsed.CORS_ORIGIN,
    marketProvider: parsed.MARKET_PROVIDER,
    requireKycForTrading: parsed.REQUIRE_KYC_FOR_TRADING,
    supabaseUrl: parsed.SUPABASE_URL,
    supabaseAnonKey: parsed.SUPABASE_ANON_KEY,
    stripeSecretKey: parsed.STRIPE_SECRET_KEY,
    stripeWebhookSecret: parsed.STRIPE_WEBHOOK_SECRET,
    openAiApiKey: parsed.OPENAI_API_KEY,
    openAiSupportModel: parsed.OPENAI_SUPPORT_MODEL,
    resendApiKey: parsed.RESEND_API_KEY,
    supportFromEmail: parsed.SUPPORT_FROM_EMAIL,
    supportInboxEmail: parsed.SUPPORT_INBOX_EMAIL,
    withdrawalAgentCode: parsed.WITHDRAWAL_AGENT_CODE
  };
};
