ALTER TABLE users
  ADD COLUMN display_currency varchar(3) NOT NULL DEFAULT 'EUR'
  CHECK (display_currency IN ('EUR', 'USD', 'GBP'));
