-- Schema Patch v14 — match metadata + center courts

ALTER TABLE public.centers
  ADD COLUMN IF NOT EXISTS num_courts smallint NOT NULL DEFAULT 1;

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS played_at  timestamptz,
  ADD COLUMN IF NOT EXISTS court_number smallint;
