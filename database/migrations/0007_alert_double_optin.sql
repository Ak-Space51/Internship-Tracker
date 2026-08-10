-- Double opt-in: a subscription only receives mail once the owner of the
-- address has confirmed it. Without this, anyone can sign up a third party and
-- unconfirmed addresses generate spam complaints that damage sender reputation.
ALTER TABLE alert_subscriptions
    ADD COLUMN IF NOT EXISTS confirm_token UUID NOT NULL DEFAULT gen_random_uuid(),
    ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ,
    -- Timestamp of the last confirmation email, so repeated submissions of the
    -- same address can't be used to mail-bomb its owner.
    ADD COLUMN IF NOT EXISTS confirm_sent_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS alert_subs_confirm_token_idx
    ON alert_subscriptions (confirm_token);

-- Existing subscribers predate double opt-in; grandfather them in rather than
-- silently cutting off alerts they already asked for.
UPDATE alert_subscriptions
   SET confirmed_at = COALESCE(confirmed_at, created_at)
 WHERE confirmed_at IS NULL;
