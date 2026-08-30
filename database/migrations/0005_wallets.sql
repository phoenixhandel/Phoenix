INSERT INTO assets (symbol, name) VALUES
  ('BTC', 'Bitcoin'),
  ('ETH', 'Ethereum'),
  ('SOL', 'Solana'),
  ('XRP', 'XRP'),
  ('USDT', 'Tether')
ON CONFLICT (symbol) DO NOTHING;

INSERT INTO trading_pairs (pair_symbol, base_asset, quote_asset) VALUES
  ('BTCUSDT', 'BTC', 'USDT'),
  ('ETHUSDT', 'ETH', 'USDT'),
  ('SOLUSDT', 'SOL', 'USDT'),
  ('XRPUSDT', 'XRP', 'USDT'),
  ('BTCETH', 'BTC', 'ETH'),
  ('BTCSOL', 'BTC', 'SOL'),
  ('BTCXRP', 'BTC', 'XRP'),
  ('ETHSOL', 'ETH', 'SOL'),
  ('ETHXRP', 'ETH', 'XRP'),
  ('SOLXRP', 'SOL', 'XRP')
ON CONFLICT (pair_symbol) DO NOTHING;

INSERT INTO ledger_accounts (asset_symbol, account_type)
SELECT asset.symbol, account_type.account_type::ledger_account_type
FROM assets AS asset
CROSS JOIN (VALUES ('SYSTEM_ADJUSTMENT'), ('SYSTEM_LIQUIDITY'), ('SYSTEM_FEES')) AS account_type(account_type)
WHERE asset.enabled
ON CONFLICT (asset_symbol, account_type) WHERE owner_user_id IS NULL DO NOTHING;

INSERT INTO ledger_accounts (owner_user_id, asset_symbol, account_type)
SELECT user_record.user_id, asset.symbol, 'USER'::ledger_account_type
FROM users AS user_record
CROSS JOIN assets AS asset
WHERE asset.enabled
ON CONFLICT (owner_user_id, asset_symbol) WHERE account_type = 'USER' DO NOTHING;

INSERT INTO portfolio_balances (user_id, asset_symbol, balance)
SELECT user_record.user_id, asset.symbol, 0
FROM users AS user_record
CROSS JOIN assets AS asset
WHERE asset.enabled
ON CONFLICT (user_id, asset_symbol) DO NOTHING;
