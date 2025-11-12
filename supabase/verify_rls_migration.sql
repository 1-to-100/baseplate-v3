-- ============================================================================
-- RLS Migration Verification Queries
-- ============================================================================

-- 1. Verify RLS is enabled on all required tables
SELECT 
  tablename, 
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN (
    'users', 'customers', 'roles', 'permissions', 
    'role_permissions', 'articles', 'article_categories',
    'notifications', 'notification_templates'
  )
ORDER BY tablename;

-- Expected: All 9 tables should show rls_enabled = true

-- 2. Verify system roles exist
SELECT 
  id, 
  name, 
  description,
  system_role,
  created_at
FROM roles 
WHERE system_role = true 
ORDER BY id;

-- Expected: 
-- 1 | System Administrator      | ... | true
-- 2 | Customer Success          | ... | true
-- 3 | Customer Administrator    | ... | true

-- 3. Verify helper functions exist
SELECT 
  routine_name, 
  routine_type,
  security_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN (
    'get_user_role_id', 
    'has_system_role', 
    'get_user_customer_id'
  )
ORDER BY routine_name;

-- Expected: 3 functions with type FUNCTION and security_type DEFINER

-- 4. Verify indexes exist
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Expected: Multiple indexes including:
-- idx_users_uid, idx_users_role_id, idx_users_customer_id, etc.

-- 5. Verify policies exist per table
SELECT 
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Expected:
-- users: 14 policies
-- customers: 8 policies
-- roles: 4 policies
-- permissions: 2 policies
-- role_permissions: 2 policies
-- articles: 3 policies
-- article_categories: 3 policies
-- notifications: 6 policies
-- notification_templates: 2 policies

-- 6. List all policies by table
SELECT 
  tablename,
  policyname,
  cmd as operation,
  roles as for_role
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 7. Verify sequence is reset to 100
SELECT 
  last_value,
  is_called
FROM roles_id_seq;

-- Expected: last_value should be >= 100

-- 8. Check if any users already have roles assigned
SELECT 
  r.name as role_name,
  COUNT(u.id) as user_count
FROM roles r
LEFT JOIN users u ON u.role_id = r.id
GROUP BY r.id, r.name
ORDER BY r.id;

-- 9. Verify system role column exists
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'roles'
  AND column_name = 'system_role';

-- Expected: system_role | boolean | YES | false

-- ============================================================================
-- Summary Statistics
-- ============================================================================

SELECT 
  'Tables with RLS' as metric,
  COUNT(*) as count
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = true

UNION ALL

SELECT 
  'System Roles' as metric,
  COUNT(*) as count
FROM roles WHERE system_role = true

UNION ALL

SELECT 
  'Helper Functions' as metric,
  COUNT(*) as count
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('get_user_role_id', 'has_system_role', 'get_user_customer_id')

UNION ALL

SELECT 
  'Performance Indexes' as metric,
  COUNT(*) as count
FROM pg_indexes 
WHERE schemaname = 'public' AND indexname LIKE 'idx_%'

UNION ALL

SELECT 
  'RLS Policies' as metric,
  COUNT(*) as count
FROM pg_policies 
WHERE schemaname = 'public';

