ALTER TABLE users ADD COLUMN identity_provider_id varchar(255);
ALTER TABLE users ADD COLUMN identity_provider_status varchar(64);

CREATE UNIQUE INDEX users_identity_provider_id_unique ON users (identity_provider_id) WHERE identity_provider_id IS NOT NULL;

CREATE TABLE identity_webhook_events (
  provider_event_id varchar(255) PRIMARY KEY,
  received_at timestamptz NOT NULL DEFAULT now()
);
