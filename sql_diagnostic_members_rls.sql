-- ============================================
-- DIAGNOSTIC : Vérifier l'état actuel de RLS sur adhesion.members
-- ============================================

-- 1. Vérifier si RLS est activé
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_actif,
  CASE WHEN rowsecurity THEN '✅ RLS Activé' ELSE '❌ RLS Désactivé' END as statut
FROM pg_tables
WHERE schemaname = 'adhesion'
  AND tablename = 'members';

-- 2. Lister TOUTES les politiques RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'adhesion'
  AND tablename = 'members'
ORDER BY cmd, policyname;

-- 3. Vérifier les permissions GRANT sur le schéma
SELECT 
  nspname as schema_name,
  nspacl as permissions
FROM pg_namespace
WHERE nspname = 'adhesion';

-- 4. Vérifier les permissions GRANT sur la table
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'adhesion'
  AND table_name = 'members'
  AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;

-- 5. Vérifier s'il y a des triggers qui pourraient interférer
SELECT 
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'adhesion'
  AND event_object_table = 'members'
ORDER BY trigger_name;

