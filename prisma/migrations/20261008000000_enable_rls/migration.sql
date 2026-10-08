-- Lock the tables away from Supabase's auto-generated Data API (PostgREST).
-- The app talks to Postgres only through Prisma as the table owner, which RLS does not restrict,
-- so the website is unaffected. With RLS on and no policies, the `anon` / `authenticated` API roles
-- can read or change nothing, even if a Supabase API key ever leaked.
-- NOTE: tables added by future migrations need `ALTER TABLE ... ENABLE ROW LEVEL SECURITY;` too.

DO $$
DECLARE t record;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t.tablename);
  END LOOP;

  -- Second layer on Supabase (these roles don't exist on a plain local Postgres).
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
  END IF;
END $$;
