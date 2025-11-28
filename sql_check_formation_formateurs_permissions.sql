-- ============================================
-- VÉRIFICATION DES PERMISSIONS formation_formateurs
-- ============================================
-- Exécutez ce script pour vérifier l'état actuel des permissions

-- 1. Vérifier l'existence de la table
SELECT 
  'Table exists?' as check_type,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ OUI'
    ELSE '❌ NON - La table n''existe pas!'
  END as status
FROM pg_tables 
WHERE schemaname = 'formation' 
AND tablename = 'formation_formateurs';

-- 2. Vérifier si RLS est activé
SELECT 
  'RLS enabled?' as check_type,
  CASE 
    WHEN rowsecurity THEN '✅ OUI'
    ELSE '❌ NON - RLS n''est pas activé!'
  END as status
FROM pg_tables 
WHERE schemaname = 'formation' 
AND tablename = 'formation_formateurs';

-- 3. Vérifier les politiques RLS
SELECT 
  'Policies' as check_type,
  COUNT(*) as policy_count,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ OK (4 politiques attendues)'
    ELSE '❌ MANQUANT - ' || (4 - COUNT(*)) || ' politique(s) manquante(s)'
  END as status
FROM pg_policies
WHERE schemaname = 'formation'
AND tablename = 'formation_formateurs';

-- 4. Lister les politiques existantes
SELECT 
  policyname,
  cmd as operation,
  roles,
  CASE 
    WHEN cmd = 'SELECT' THEN '✅ Lecture'
    WHEN cmd = 'INSERT' THEN '✅ Insertion'
    WHEN cmd = 'UPDATE' THEN '✅ Mise à jour'
    WHEN cmd = 'DELETE' THEN '✅ Suppression'
    ELSE cmd
  END as description
FROM pg_policies
WHERE schemaname = 'formation'
AND tablename = 'formation_formateurs'
ORDER BY cmd;

-- 5. Vérifier les permissions GRANT
SELECT 
  'Grants' as check_type,
  grantee,
  STRING_AGG(privilege_type, ', ' ORDER BY privilege_type) as permissions,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✅ OK'
    ELSE '❌ MANQUANT'
  END as status
FROM information_schema.role_table_grants
WHERE table_schema = 'formation'
AND table_name = 'formation_formateurs'
AND grantee = 'anon'
GROUP BY grantee;

-- 6. Résumé final
SELECT 
  '=== RÉSUMÉ ===' as summary,
  '' as details
UNION ALL
SELECT 
  'Table existe',
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'formation' AND tablename = 'formation_formateurs') 
    THEN '✅' ELSE '❌' END
UNION ALL
SELECT 
  'RLS activé',
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'formation' AND tablename = 'formation_formateurs' AND rowsecurity) 
    THEN '✅' ELSE '❌' END
UNION ALL
SELECT 
  'Politiques RLS',
  CASE WHEN (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'formation' AND tablename = 'formation_formateurs') >= 4 
    THEN '✅' ELSE '❌' END
UNION ALL
SELECT 
  'Permissions GRANT',
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.role_table_grants WHERE table_schema = 'formation' AND table_name = 'formation_formateurs' AND grantee = 'anon') 
    THEN '✅' ELSE '❌' END;





