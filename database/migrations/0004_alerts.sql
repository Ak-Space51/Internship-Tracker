CREATE TABLE IF NOT EXISTS alert_subscriptions (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email      TEXT NOT NULL,
    seasons    TEXT[] NOT NULL DEFAULT '{}',   -- empty = target season + off-cycle
    countries  TEXT[] NOT NULL DEFAULT '{}',   -- empty = the four targets + Remote
    roles      TEXT[] NOT NULL DEFAULT '{}',   -- empty = all
    keywords   TEXT[] NOT NULL DEFAULT '{}',   -- empty = all; matched against title
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (email)
);

-- One row per (subscription, job) actually emailed, so a job is never sent twice.
CREATE TABLE IF NOT EXISTS alert_deliveries (
    subscription_id BIGINT NOT NULL REFERENCES alert_subscriptions(id) ON DELETE CASCADE,
    job_id          BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    sent_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (subscription_id, job_id)
);
