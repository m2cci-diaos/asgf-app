-- ============================================
-- VÉRIFICATION DES PERMISSIONS spatial_ref_sys
-- ============================================
-- Ce script vérifie que les permissions ont bien été modifiées
-- selon la stratégie recommandée par l'Assistant Supabase
-- ============================================

-- 1. Vérifier les permissions actuelles
SELECT 
    grantee as role,
    privilege_type as permission,
    is_grantable as peut_octroyer,
    CASE 
        WHEN grantee = 'anon' AND privilege_type = 'SELECT' THEN '✅ Correct - anon peut lire'
        WHEN grantee IN ('postgres', 'service_role', 'supabase_admin') THEN '✅ Normal - rôles système'
        WHEN grantee = 'PUBLIC' THEN '❌ Problème - PUBLIC ne devrait pas avoir de permissions'
        WHEN grantee = 'authenticated' AND privilege_type = 'SELECT' THEN 'ℹ️ Optionnel - authenticated peut lire'
        ELSE '⚠️ À vérifier'
    END as statut
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
    AND table_name = 'spatial_ref_sys'
ORDER BY 
    CASE 
        WHEN grantee = 'PUBLIC' THEN 0
        WHEN grantee = 'anon' THEN 1
        WHEN grantee = 'authenticated' THEN 2
        ELSE 3
    END,
    grantee, 
    privilege_type;

-- 2. Vérifier le statut RLS (devrait être désactivé - c'est normal)
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Activé'
        ELSE '✅ RLS Désactivé (normal et recommandé pour cette table)'
    END as rls_status,
    tableowner as proprietaire,
    CASE 
        WHEN tableowner = 'supabase_admin' THEN '✅ Propriétaire système (normal)'
        ELSE '⚠️ Autre propriétaire'
    END as statut_proprietaire
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename = 'spatial_ref_sys';

-- 3. Résumé des permissions par rôle
SELECT 
    grantee as role,
    COUNT(*) as nombre_permissions,
    STRING_AGG(privilege_type, ', ' ORDER BY privilege_type) as permissions
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
    AND table_name = 'spatial_ref_sys'
GROUP BY grantee
ORDER BY 
    CASE 
        WHEN grantee = 'PUBLIC' THEN 0
        WHEN grantee = 'anon' THEN 1
        WHEN grantee = 'authenticated' THEN 2
        ELSE 3
    END,
    grantee;

-- 4. Vérifier si PUBLIC a encore des permissions (ne devrait pas)
SELECT 
    CASE 
        WHEN COUNT(*) = 0 THEN '✅ Correct - PUBLIC n''a plus de permissions'
        ELSE '❌ Problème - PUBLIC a encore ' || COUNT(*) || ' permission(s)'
    END as statut_public
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
    AND table_name = 'spatial_ref_sys'
    AND grantee = 'PUBLIC';
















