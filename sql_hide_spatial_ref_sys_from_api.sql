-- ============================================
-- RÉVOQUER LES PERMISSIONS SUR spatial_ref_sys
-- ============================================
-- Cette table système PostGIS ne devrait pas être accessible via l'API
-- On révoque toutes les permissions publiques pour réduire l'exposition
-- Note: Cela pourrait ne pas résoudre l'alerte Security Advisor
--       qui vérifie RLS, pas les permissions
-- ============================================

-- Révoker toutes les permissions publiques (anon et authenticated)
-- Note: On ne révoque PAS les permissions de postgres et service_role
--       car ce sont des rôles système nécessaires au fonctionnement
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon;
REVOKE ALL ON TABLE public.spatial_ref_sys FROM authenticated;
REVOKE ALL ON TABLE public.spatial_ref_sys FROM public;

-- Vérifier que les permissions publiques ont été révoquées
-- (postgres et service_role gardent leurs permissions - c'est normal)

-- Vérifier que les permissions ont été révoquées
DO $$
DECLARE
    perm_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO perm_count
    FROM information_schema.role_table_grants
    WHERE table_schema = 'public'
        AND table_name = 'spatial_ref_sys'
        AND grantee IN ('anon', 'authenticated', 'public');
    
    IF perm_count = 0 THEN
        RAISE NOTICE '✅ Toutes les permissions publiques ont été révoquées';
    ELSE
        RAISE WARNING '⚠️ Il reste % permission(s) publique(s)', perm_count;
    END IF;
END $$;

-- Méthode 2 : S'assurer que le schéma public n'expose pas cette table
-- (Cette table ne devrait pas être accessible via l'API de toute façon)

-- Note: Si vous utilisez PostgREST, vous pouvez aussi configurer
-- dans les settings Supabase pour exclure cette table de l'API

-- ============================================
-- VÉRIFICATION DES PERMISSIONS
-- ============================================
SELECT 
    grantee,
    privilege_type,
    is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
    AND table_name = 'spatial_ref_sys'
ORDER BY grantee, privilege_type;

