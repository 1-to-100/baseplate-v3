SET cleanup.target_schema = 'public';
-- ===========================================
-- Supabase cleanup script (fixed)
-- Drops RLS policies, tables, functions/procedures, and enum types
-- in the specified schema. Safe-guarded.
-- ===========================================
-- >>> REQUIRED: set your target schema <<<
-- Example:
-- SET cleanup.target_schema = 'public';
BEGIN;
-- ---------- Safety checks ----------
DO $block$
DECLARE
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  IF target_schema IS NULL OR target_schema = '' THEN
    RAISE EXCEPTION 'Safety check: set cleanup.target_schema first, e.g.  SET cleanup.target_schema = ''public'';';
  END IF;
  IF target_schema IN (
    'auth','storage','realtime','pgbouncer','extensions',
    'pg_catalog','information_schema'
  ) THEN
    RAISE EXCEPTION 'Refusing to operate on Supabase/system schema: %', target_schema;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = target_schema) THEN
    RAISE EXCEPTION 'Schema "%" does not exist.', target_schema;
  END IF;
END
$block$;
-- ---------- 1) Drop all RLS policies (correct syntax uses DROP POLICY ... ON ...) ----------
DO $block$
DECLARE
  r RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = target_schema
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I;',
      r.policyname, r.schemaname, r.tablename
    );
  END LOOP;
END
$block$;
-- ---------- 2) (Optional but safer) Drop materialized views then views ----------
-- Doing this first avoids large CASCADE chains from tables.
DO $block$
DECLARE
  r RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  -- Materialized views
  FOR r IN
    SELECT n.nspname AS schemaname, c.relname AS viewname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = target_schema
      AND c.relkind = 'm'  -- matview
  LOOP
    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I.%I CASCADE;', r.schemaname, r.viewname);
  END LOOP;
  -- Regular views
  FOR r IN
    SELECT table_schema AS schemaname, table_name AS viewname
    FROM information_schema.views
    WHERE table_schema = target_schema
  LOOP
    EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE;', r.schemaname, r.viewname);
  END LOOP;
END
$block$;
-- ---------- 3) Drop all tables (CASCADE) ----------
DO $block$
DECLARE
  r RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  FOR r IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = target_schema
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE;', r.schemaname, r.tablename);
  END LOOP;
END
$block$;
-- ---------- 4) Drop functions and procedures defined in the schema ----------
-- (skips aggregates/window functions; uses identity args to match exact signature)
DO $block$
DECLARE
  target_schema text := current_setting('cleanup.target_schema', true);
  r RECORD;
BEGIN
  FOR r IN
    SELECT
      n.nspname AS schema_name,
      p.oid     AS proc_oid,
      p.proname AS proc_name,
      p.prokind AS kind, -- 'f' function, 'p' procedure
      pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = target_schema
      AND p.prokind IN ('f','p')
  LOOP
    EXECUTE format(
      'DROP %s IF EXISTS %I.%I(%s);',
      CASE WHEN r.kind = 'p' THEN 'PROCEDURE' ELSE 'FUNCTION' END,
      r.schema_name, r.proc_name, r.args
    );
  END LOOP;
END
$block$;
-- ---------- 5) Drop enum types in the schema ----------
DO $block$
DECLARE
  target_schema text := current_setting('cleanup.target_schema', true);
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schema_name, t.typname AS type_name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = target_schema
      AND t.typtype = 'e'  -- enums
  LOOP
    EXECUTE format('DROP TYPE IF EXISTS %I.%I;', r.schema_name, r.type_name);
  END LOOP;
END
$block$;
COMMIT;
-- ===== Optional verification queries (run after if you want) =====
-- SELECT schemaname, tablename, policyname
-- FROM pg_policies
-- WHERE schemaname = current_setting('cleanup.target_schema', true);
-- SELECT schemaname, tablename FROM pg_tables
-- WHERE schemaname = current_setting('cleanup.target_schema', true);
-- SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)
-- FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
-- WHERE n.nspname=current_setting('cleanup.target_schema', true);
-- SELECT n.nspname,t.typname
-- FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
-- WHERE n.nspname=current_setting('cleanup.target_schema', true) AND t.typtype='e';