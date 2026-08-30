CREATE TYPE user_role AS ENUM ('USER', 'ADMIN');
CREATE TYPE account_status AS ENUM ('ACTIVE', 'SUSPENDED', 'LOCKED');
CREATE TYPE trading_status AS ENUM ('ENABLED', 'FROZEN');
CREATE TYPE kyc_status AS ENUM ('NOT_STARTED', 'PENDING', 'VERIFIED', 'FAILED', 'REQUIRES_INPUT');
CREATE TYPE ledger_transaction_type AS ENUM ('TRADE', 'TRADE_FEE', 'ADMIN_CREDIT', 'ADMIN_DEBIT', 'ADMIN_SET_BALANCE', 'ADMIN_RESET');
CREATE TYPE ledger_account_type AS ENUM ('USER', 'SYSTEM_LIQUIDITY', 'SYSTEM_FEES', 'SYSTEM_ADJUSTMENT');
CREATE TYPE trade_side AS ENUM ('BUY', 'SELL');
CREATE TYPE market_mode AS ENUM ('REAL', 'MANUAL');

CREATE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE users (
  user_id uuid PRIMARY KEY,
  auth_user_id uuid UNIQUE NOT NULL,
  username varchar(64) UNIQUE,
  email varchar(320),
  phone varchar(32),
  role user_role NOT NULL DEFAULT 'USER',
  account_status account_status NOT NULL DEFAULT 'ACTIVE',
  trading_status trading_status NOT NULL DEFAULT 'ENABLED',
  email_verified boolean NOT NULL DEFAULT false,
  phone_verified boolean NOT NULL DEFAULT false,
  kyc_status kyc_status NOT NULL DEFAULT 'NOT_STARTED',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE UNIQUE INDEX users_email_unique ON users (lower(email)) WHERE email IS NOT NULL;
CREATE TRIGGER users_set_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE assets (
  symbol varchar(12) PRIMARY KEY,
  name varchar(64) NOT NULL,
  decimals smallint NOT NULL DEFAULT 12 CHECK (decimals BETWEEN 0 AND 12),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trading_pairs (
  pair_symbol varchar(24) PRIMARY KEY,
  base_asset varchar(12) NOT NULL REFERENCES assets(symbol),
  quote_asset varchar(12) NOT NULL REFERENCES assets(symbol),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (base_asset <> quote_asset)
);

CREATE TABLE ledger_transactions (
  transaction_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type ledger_transaction_type NOT NULL,
  actor_user_id uuid REFERENCES users(user_id),
  target_user_id uuid REFERENCES users(user_id),
  idempotency_key varchar(255) UNIQUE NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE ledger_accounts (
  account_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid REFERENCES users(user_id),
  asset_symbol varchar(12) NOT NULL REFERENCES assets(symbol),
  account_type ledger_account_type NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (
    (account_type = 'USER' AND owner_user_id IS NOT NULL)
    OR (account_type <> 'USER' AND owner_user_id IS NULL)
  )
);

CREATE UNIQUE INDEX user_ledger_account_per_asset ON ledger_accounts (owner_user_id, asset_symbol) WHERE account_type = 'USER';
CREATE UNIQUE INDEX system_ledger_account_per_asset ON ledger_accounts (asset_symbol, account_type) WHERE owner_user_id IS NULL;

CREATE TABLE ledger_entries (
  entry_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES ledger_transactions(transaction_id),
  account_id uuid NOT NULL REFERENCES ledger_accounts(account_id),
  amount_delta numeric(30, 12) NOT NULL CHECK (amount_delta <> 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION reject_immutable_ledger_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% records are immutable', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER ledger_transactions_immutable BEFORE UPDATE OR DELETE ON ledger_transactions FOR EACH ROW EXECUTE FUNCTION reject_immutable_ledger_change();
CREATE TRIGGER ledger_entries_immutable BEFORE UPDATE OR DELETE ON ledger_entries FOR EACH ROW EXECUTE FUNCTION reject_immutable_ledger_change();

CREATE FUNCTION assert_ledger_transaction_balance(id uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM ledger_entries WHERE transaction_id = id) THEN
    RAISE EXCEPTION 'ledger transaction % must contain ledger entries', id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM ledger_entries entry
    JOIN ledger_accounts account ON account.account_id = entry.account_id
    WHERE entry.transaction_id = id
    GROUP BY account.asset_symbol
    HAVING sum(entry.amount_delta) <> 0
  ) THEN
    RAISE EXCEPTION 'ledger transaction % must balance to zero per asset', id;
  END IF;
END;
$$;

CREATE FUNCTION check_ledger_transaction_balance() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM assert_ledger_transaction_balance(COALESCE(NEW.transaction_id, OLD.transaction_id));
  RETURN NULL;
END;
$$;

CREATE CONSTRAINT TRIGGER ledger_transaction_requires_entries
AFTER INSERT ON ledger_transactions DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_ledger_transaction_balance();

CREATE CONSTRAINT TRIGGER ledger_entries_must_balance
AFTER INSERT OR UPDATE OR DELETE ON ledger_entries DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_ledger_transaction_balance();

CREATE TABLE portfolio_balances (
  user_id uuid NOT NULL REFERENCES users(user_id),
  asset_symbol varchar(12) NOT NULL REFERENCES assets(symbol),
  balance numeric(30, 12) NOT NULL CHECK (balance >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, asset_symbol)
);

CREATE TABLE trades (
  trade_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id),
  pair_symbol varchar(24) NOT NULL REFERENCES trading_pairs(pair_symbol),
  side trade_side NOT NULL,
  base_asset varchar(12) NOT NULL REFERENCES assets(symbol),
  quote_asset varchar(12) NOT NULL REFERENCES assets(symbol),
  base_amount numeric(30, 12) NOT NULL CHECK (base_amount > 0),
  quote_amount numeric(30, 12) NOT NULL CHECK (quote_amount > 0),
  market_price numeric(30, 12) NOT NULL CHECK (market_price > 0),
  execution_price numeric(30, 12) NOT NULL CHECK (execution_price > 0),
  fee_asset varchar(12) NOT NULL REFERENCES assets(symbol),
  fee_amount numeric(30, 12) NOT NULL CHECK (fee_amount >= 0),
  idempotency_key varchar(255) UNIQUE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (base_asset <> quote_asset)
);

CREATE INDEX trades_user_created_at ON trades (user_id, created_at DESC);

CREATE TABLE activity_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(user_id),
  event_type varchar(64) NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX activity_events_user_created_at ON activity_events (user_id, created_at DESC);

CREATE TABLE admin_audit_events (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL REFERENCES users(user_id),
  target_user_id uuid REFERENCES users(user_id),
  action varchar(64) NOT NULL,
  entity_type varchar(64) NOT NULL,
  entity_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  reason text NOT NULL,
  ip_address inet,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER admin_audit_events_immutable BEFORE UPDATE OR DELETE ON admin_audit_events FOR EACH ROW EXECUTE FUNCTION reject_immutable_ledger_change();
CREATE INDEX admin_audit_events_created_at ON admin_audit_events (created_at DESC);

CREATE TABLE market_configuration (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  mode market_mode NOT NULL DEFAULT 'REAL',
  trading_fee numeric(12, 8) NOT NULL DEFAULT 0.001 CHECK (trading_fee >= 0 AND trading_fee <= 1),
  spread numeric(12, 8) NOT NULL DEFAULT 0.0005 CHECK (spread >= 0 AND spread <= 1),
  slippage numeric(12, 8) NOT NULL DEFAULT 0.0005 CHECK (slippage >= 0 AND slippage <= 1),
  volatility numeric(12, 8) NOT NULL DEFAULT 0.01 CHECK (volatility >= 0 AND volatility <= 1),
  order_book_levels smallint NOT NULL DEFAULT 30 CHECK (order_book_levels BETWEEN 20 AND 50),
  simulation_paused boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER market_configuration_set_updated_at BEFORE UPDATE ON market_configuration FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE manual_market_prices (
  asset_symbol varchar(12) PRIMARY KEY REFERENCES assets(symbol),
  reference_price numeric(30, 12) NOT NULL CHECK (reference_price > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER manual_market_prices_set_updated_at BEFORE UPDATE ON manual_market_prices FOR EACH ROW EXECUTE FUNCTION set_updated_at();
