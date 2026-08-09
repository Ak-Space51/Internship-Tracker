-- One-click unsubscribe: a per-subscription secret in the digest footer, and a
-- soft-delete flag so an opt-out survives the subscriber re-appearing in a
-- later ingest run.
ALTER TABLE alert_subscriptions
    ADD COLUMN IF NOT EXISTS unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS alert_subs_token_idx
    ON alert_subscriptions (unsubscribe_token);
