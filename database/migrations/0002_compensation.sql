ALTER TABLE jobs
    ADD COLUMN IF NOT EXISTS comp_min NUMERIC,
    ADD COLUMN IF NOT EXISTS comp_max NUMERIC,
    ADD COLUMN IF NOT EXISTS comp_currency TEXT,   -- ISO code: INR, SGD, GBP, HKD, USD, EUR
    ADD COLUMN IF NOT EXISTS comp_period TEXT;     -- year | month | week | day | hour
