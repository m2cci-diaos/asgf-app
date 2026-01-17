-- ============================================
-- VÉRIFICATION DU PROPRIÉTAIRE DE spatial_ref_sys
-- ============================================
-- Ce script vérifie qui est le propriétaire de la table
-- et pourquoi on ne peut pas activer RLS
-- ============================================

-- Vérifier le propriétaire de la table
SELECT 
    schemaname,
    tablename,
    tableowner as proprietaire,
    CASE 
        WHEN tableowner = 'postgres' THEN '✅ Propriétaire standard'
        WHEN tableowner LIKE '%postgis%' THEN '⚠️ Propriétaire PostGIS (protégé)'
        ELSE '❓ Autre propriétaire'
    END as statut,
    rowsecurity as rls_actif
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename = 'spatial_ref_sys';

-- Vérifier les permissions actuelles
SELECT 
    grantee as role,
    privilege_type as permission,
    is_grantable as peut_octroyer
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
    AND table_name = 'spatial_ref_sys'
ORDER BY grantee, privilege_type;

-- Vérifier si on peut modifier la table (en tant qu'utilisateur actuel)
SELECT 
    current_user as utilisateur_actuel,
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = 'spatial_ref_sys'
            AND tableowner = current_user
        ) THEN '✅ Vous êtes propriétaire - vous pouvez modifier'
        ELSE '❌ Vous n''êtes pas propriétaire - modification impossible'
    END as peut_modifier;

-- Vérifier l'extension PostGIS
SELECT 
    extname as extension,
    extversion as version,
    nspname as schema
FROM pg_extension e
JOIN pg_namespace n ON e.extnamespace = n.oid
WHERE extname = 'postgis';















