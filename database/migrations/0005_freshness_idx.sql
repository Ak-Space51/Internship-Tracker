-- The footer's "boards last checked" reads max(last_seen_at) over active jobs,
-- which was a sequential scan on every uncached page render.
CREATE INDEX IF NOT EXISTS jobs_last_seen_idx ON jobs (last_seen_at DESC) WHERE is_active;
