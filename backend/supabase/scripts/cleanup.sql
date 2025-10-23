-- ===========================================
-- Supabase deep cleanup script (max coverage)
-- Drops (in safe order) virtually all recreatable objects in a target schema:
-- RLS policies, rules, triggers, materialized views, views, foreign tables, tables,
-- standalone sequences, functions/procedures/aggregates, operators,
-- operator classes/families, text search objects, domains, types (enum/composite/range),
-- collations, etc.
--
-- Usage:
--   SET cleanup.target_schema = 'public';
--   -- then run this whole script.
-- ===========================================

SET cleanup.target_schema = 'public';

BEGIN;

-- ---------- Safety checks ----------
DO $block$
DECLARE
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  IF target_schema IS NULL OR target_schema = '' THEN
    RAISE EXCEPTION 'Safety check: set cleanup.target_schema first, e.g. SET cleanup.target_schema = ''public'';';
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

-- ---------- 0) SECURITY / RLS ----------
-- Drop all RLS policies
DO $block$
DECLARE
  rec RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  FOR rec IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = target_schema
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', rec.policyname, rec.schemaname, rec.tablename);
  END LOOP;
END
$block$;

-- Disable RLS on tables (optional)
DO $block$
DECLARE
  rec RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  FOR rec IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = target_schema
  LOOP
    EXECUTE format('ALTER TABLE IF EXISTS %I.%I DISABLE ROW LEVEL SECURITY;', rec.schemaname, rec.tablename);
  END LOOP;
END
$block$;

-- ---------- 1) RULES / TRIGGERS on relations in schema ----------
-- Drop RULES (avoid alias/variable shadowing)
DO $block$
DECLARE
  rec RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  FOR rec IN
    SELECT n.nspname AS schemaname,
           c.relname  AS relname,
           rw.rulename AS rulename
    FROM pg_rewrite AS rw
    JOIN pg_class     AS c  ON c.oid = rw.ev_class
    JOIN pg_namespace AS n  ON n.oid = c.relnamespace
    WHERE n.nspname = target_schema
      AND rw.rulename <> '_RETURN'  -- implicit rule marker; rel drop removes it anyway
  LOOP
    EXECUTE format('DROP RULE IF EXISTS %I ON %I.%I;', rec.rulename, rec.schemaname, rec.relname);
  END LOOP;
END
$block$;

-- Drop TRIGGERS (explicit, though dropping rels also removes them)
DO $block$
DECLARE
  rec RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  FOR rec IN
    SELECT n.nspname AS schemaname,
           c.relname  AS relname,
           tg.tgname  AS trgname
    FROM pg_trigger AS tg
    JOIN pg_class   AS c  ON c.oid = tg.tgrelid
    JOIN pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = target_schema
      AND NOT tg.tgisinternal
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I.%I;', rec.trgname, rec.schemaname, rec.relname);
  END LOOP;
END
$block$;

-- ---------- 2) MATERIALIZED VIEWS then VIEWS ----------
DO $block$
DECLARE
  rec RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  -- Materialized views
  FOR rec IN
    SELECT n.nspname AS schemaname, c.relname AS viewname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = target_schema AND c.relkind = 'm'
  LOOP
    EXECUTE format('DROP MATERIALIZED VIEW IF EXISTS %I.%I CASCADE;', rec.schemaname, rec.viewname);
  END LOOP;

  -- Views
  FOR rec IN
    SELECT table_schema AS schemaname, table_name AS viewname
    FROM information_schema.views
    WHERE table_schema = target_schema
  LOOP
    EXECUTE format('DROP VIEW IF EXISTS %I.%I CASCADE;', rec.schemaname, rec.viewname);
  END LOOP;
END
$block$;

-- ---------- 3) FOREIGN TABLES ----------
DO $block$
DECLARE
  rec RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  FOR rec IN
    SELECT n.nspname AS schemaname, c.relname AS ftname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = target_schema
      AND c.relkind = 'f'  -- foreign table
  LOOP
    EXECUTE format('DROP FOREIGN TABLE IF EXISTS %I.%I CASCADE;', rec.schemaname, rec.ftname);
  END LOOP;
END
$block$;

-- ---------- 4) TABLES (and partitions) ----------
DO $block$
DECLARE
  rec RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  FOR rec IN
    SELECT schemaname, tablename
    FROM pg_tables
    WHERE schemaname = target_schema
  LOOP
    EXECUTE format('DROP TABLE IF EXISTS %I.%I CASCADE;', rec.schemaname, rec.tablename);
  END LOOP;
END
$block$;

-- ---------- 5) STANDALONE SEQUENCES (not owned by dropped tables) ----------
DO $block$
DECLARE
  rec RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  FOR rec IN
    SELECT n.nspname AS schemaname, c.relname AS seqname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = target_schema
      AND c.relkind = 'S'
      AND NOT EXISTS (
        SELECT 1
        FROM pg_depend d
        JOIN pg_class t ON t.oid = d.refobjid
        WHERE d.classid = 'pg_class'::regclass
          AND d.objid = c.oid
          AND d.deptype = 'a'  -- owned by
          AND t.relkind IN ('r','p') -- table or partitioned table
      )
  LOOP
    EXECUTE format('DROP SEQUENCE IF EXISTS %I.%I;', rec.schemaname, rec.seqname);
  END LOOP;
END
$block$;

-- ---------- 6) ROUTINES: functions, procedures, aggregates ----------
DO $block$
DECLARE
  rec RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  FOR rec IN
    SELECT n.nspname AS schema_name,
           p.oid     AS proc_oid,
           p.proname AS proc_name,
           p.prokind AS kind,   -- 'f' function, 'p' procedure, 'a' aggregate
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = target_schema
      AND p.prokind IN ('f','p','a')
  LOOP
    EXECUTE format(
      'DROP %s IF EXISTS %I.%I(%s);',
      CASE rec.kind
        WHEN 'p' THEN 'PROCEDURE'
        WHEN 'a' THEN 'AGGREGATE'
        ELSE 'FUNCTION'
      END,
      rec.schema_name, rec.proc_name, rec.args
    );
  END LOOP;
END
$block$;

-- ---------- 7) TEXT SEARCH OBJECTS (configs, dicts, parsers, templates) ----------
DO $block$
DECLARE
  rec RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  -- configurations
  FOR rec IN
    SELECT cfg.oid, n.nspname AS schemaname, cfg.cfgname
    FROM pg_ts_config cfg
    JOIN pg_namespace n ON n.oid = cfg.cfgnamespace
    WHERE n.nspname = target_schema
  LOOP
    EXECUTE format('DROP TEXT SEARCH CONFIGURATION IF EXISTS %I.%I;', rec.schemaname, rec.cfgname);
  END LOOP;

  -- dictionaries
  FOR rec IN
    SELECT d.oid, n.nspname AS schemaname, d.dictname
    FROM pg_ts_dict d
    JOIN pg_namespace n ON n.oid = d.dictnamespace
    WHERE n.nspname = target_schema
  LOOP
    EXECUTE format('DROP TEXT SEARCH DICTIONARY IF EXISTS %I.%I;', rec.schemaname, rec.dictname);
  END LOOP;

  -- parsers
  FOR rec IN
    SELECT p.oid, n.nspname AS schemaname, p.prsname
    FROM pg_ts_parser p
    JOIN pg_namespace n ON n.oid = p.prsnamespace
    WHERE n.nspname = target_schema
  LOOP
    EXECUTE format('DROP TEXT SEARCH PARSER IF EXISTS %I.%I;', rec.schemaname, rec.prsname);
  END LOOP;

  -- templates
  FOR rec IN
    SELECT t.oid, n.nspname AS schemaname, t.tmplname
    FROM pg_ts_template t
    JOIN pg_namespace n ON n.oid = t.tmplnamespace
    WHERE n.nspname = target_schema
  LOOP
    EXECUTE format('DROP TEXT SEARCH TEMPLATE IF EXISTS %I.%I;', rec.schemaname, rec.tmplname);
  END LOOP;
END
$block$;

-- ---------- 8) OPERATORS, OPERATOR CLASSES/FAMILIES ----------
DO $block$
DECLARE
  rec RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  -- operators (NOTE: if overloaded, enumerate with arg types; this generic form works when single signature)
  FOR rec IN
    SELECT n.nspname AS schemaname, o.oprname
    FROM pg_operator o
    JOIN pg_namespace n ON n.oid = o.oprnamespace
    WHERE n.nspname = target_schema
  LOOP
    EXECUTE format('DROP OPERATOR IF EXISTS %I.%I (NONE, NONE);', rec.schemaname, rec.oprname);
  END LOOP;

  -- operator classes
  FOR rec IN
    SELECT n.nspname AS schemaname, opc.opcname AS opcname, am.amname AS amname
    FROM pg_opclass opc
    JOIN pg_namespace n ON n.oid = opc.opcnamespace
    JOIN pg_am am ON am.oid = opc.opcmethod
    WHERE n.nspname = target_schema
  LOOP
    EXECUTE format('DROP OPERATOR CLASS IF EXISTS %I.%I USING %I;', rec.schemaname, rec.opcname, rec.amname);
  END LOOP;

  -- operator families
  FOR rec IN
    SELECT n.nspname AS schemaname, opf.opfname AS opfname, am.amname AS amname
    FROM pg_opfamily opf
    JOIN pg_namespace n ON n.oid = opf.opfnamespace
    JOIN pg_am am ON am.oid = opf.opfmethod
    WHERE n.nspname = target_schema
  LOOP
    EXECUTE format('DROP OPERATOR FAMILY IF EXISTS %I.%I USING %I;', rec.schemaname, rec.opfname, rec.amname);
  END LOOP;
END
$block$;

-- ---------- 9) DOMAINS ----------
DO $block$
DECLARE
  rec RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  FOR rec IN
    SELECT n.nspname AS schema_name, t.typname AS domain_name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typtypmod::regnamespace -- safe join? Nope, use typnamespace
    WHERE 1=0
  LOOP NULL; END LOOP;
END
$block$;

-- (Fixed domain block: correct join)
DO $block$
DECLARE
  rec RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  FOR rec IN
    SELECT n.nspname AS schema_name, t.typname AS domain_name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = target_schema
      AND t.typtype = 'd'   -- domain
  LOOP
    EXECUTE format('DROP DOMAIN IF EXISTS %I.%I CASCADE;', rec.schema_name, rec.domain_name);
  END LOOP;
END
$block$;

-- ---------- 10) TYPES (enum, composite, range) ----------
DO $block$
DECLARE
  rec RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  -- enums
  FOR rec IN
    SELECT n.nspname AS schema_name, t.typname AS type_name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = target_schema
      AND t.typtype = 'e'
  LOOP
    EXECUTE format('DROP TYPE IF EXISTS %I.%I;', rec.schema_name, rec.type_name);
  END LOOP;

  -- composite types (excluding table row types)
  FOR rec IN
    SELECT n.nspname AS schema_name, t.typname AS type_name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = target_schema
      AND t.typtype = 'c'
      AND t.typrelid = 0
  LOOP
    EXECUTE format('DROP TYPE IF EXISTS %I.%I CASCADE;', rec.schema_name, rec.type_name);
  END LOOP;

  -- range types
  FOR rec IN
    SELECT n.nspname AS schema_name, t.typname AS type_name
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = target_schema
      AND t.typtype = 'r'
  LOOP
    EXECUTE format('DROP TYPE IF EXISTS %I.%I CASCADE;', rec.schema_name, rec.type_name);
  END LOOP;
END
$block$;

-- ---------- 11) COLLATIONS ----------
DO $block$
DECLARE
  rec RECORD;
  target_schema text := current_setting('cleanup.target_schema', true);
BEGIN
  FOR rec IN
    SELECT n.nspname AS schema_name, c.collname
    FROM pg_collation c
    JOIN pg_namespace n ON n.oid = c.collnamespace
    WHERE n.nspname = target_schema
  LOOP
    EXECUTE format('DROP COLLATION IF EXISTS %I.%I;', rec.schema_name, rec.collname);
  END LOOP;
END
$block$;

COMMIT;

-- ===== Optional verification queries (run after if you want) =====
-- SELECT * FROM pg_policies WHERE schemaname = current_setting('cleanup.target_schema', true);
-- SELECT * FROM pg_tables   WHERE schemaname = current_setting('cleanup.target_schema', true);
-- SELECT n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)
--   FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
--  WHERE n.nspname=current_setting('cleanup.target_schema', true);
-- SELECT n.nspname,t.typname, t.typtype
--   FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace
--  WHERE n.nspname=current_setting('cleanup.target_schema', true);
-- SELECT * FROM information_schema.views WHERE table_schema = current_setting('cleanup.target_schema', true);
-- SELECT * FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
--  WHERE n.nspname = current_setting('cleanup.target_schema', true) AND c.relkind IN ('S','m','f','r','v');
