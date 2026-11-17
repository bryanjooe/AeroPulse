CREATE TABLE IF NOT EXISTS public.schema_migrations (
  version VARCHAR(120) PRIMARY KEY,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
COMMENT ON TABLE public.schema_migrations IS 'Applied application migration versions. Managed only by the explicit migration command.';
