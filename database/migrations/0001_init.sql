CREATE TABLE IF NOT EXISTS companies (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        TEXT NOT NULL,
    slug        TEXT NOT NULL UNIQUE,
    website     TEXT,
    careers_url TEXT,
    ats         TEXT NOT NULL,          -- greenhouse | ashby | lever
    ats_token   TEXT NOT NULL,          -- board token / identifier on the ATS
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (ats, ats_token)
);

CREATE TABLE IF NOT EXISTS jobs (
    id                BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    company_id        BIGINT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title             TEXT NOT NULL,
    description_html  TEXT,
    raw_location      TEXT,
    country           TEXT,             -- India | Singapore | United Kingdom | Hong Kong | Remote | Other
    city              TEXT,
    work_mode         TEXT NOT NULL DEFAULT 'unknown',  -- remote | hybrid | onsite | unknown
    role_category     TEXT NOT NULL DEFAULT 'Other',
    role              TEXT,
    season            TEXT NOT NULL DEFAULT 'unknown',  -- e.g. summer-2027, winter-2026, off-cycle, unknown
    season_confidence TEXT NOT NULL DEFAULT 'unknown',  -- explicit | inferred | unknown
    duration_months   INT,
    application_url   TEXT NOT NULL,
    posted_at         TIMESTAMPTZ,
    first_seen_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    missed_runs       INT NOT NULL DEFAULT 0,           -- consecutive ingest runs the job was not seen
    is_active         BOOLEAN NOT NULL DEFAULT TRUE,
    closed_at         TIMESTAMPTZ,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    search_tsv        TSVECTOR GENERATED ALWAYS AS (
        setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('english', coalesce(role, '') || ' ' || coalesce(role_category, '')), 'B') ||
        setweight(to_tsvector('english', coalesce(city, '') || ' ' || coalesce(country, '')), 'C')
    ) STORED
);

CREATE INDEX IF NOT EXISTS jobs_active_facets_idx ON jobs (is_active, season, country, role_category);
CREATE INDEX IF NOT EXISTS jobs_company_idx ON jobs (company_id);
CREATE INDEX IF NOT EXISTS jobs_first_seen_idx ON jobs (first_seen_at DESC);
CREATE INDEX IF NOT EXISTS jobs_search_idx ON jobs USING GIN (search_tsv);

CREATE TABLE IF NOT EXISTS job_sources (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    job_id        BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    source        TEXT NOT NULL,        -- greenhouse | ashby | lever
    external_id   TEXT NOT NULL,
    external_url  TEXT,
    first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (source, external_id)
);

CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO settings (key, value) VALUES ('target_season', 'summer-2027')
ON CONFLICT (key) DO NOTHING;
