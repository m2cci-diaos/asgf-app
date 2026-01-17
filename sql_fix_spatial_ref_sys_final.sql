-- ============================================
-- CORRECTION FINALE : spatial_ref_sys
-- ============================================
-- Basé sur les recommandations de l'Assistant Supabase
-- 
-- Stratégie : Révoquer PUBLIC et GRANT SELECT aux rôles nécessaires
-- (au lieu d'activer RLS, car c'est une table système PostGIS non sensible)
-- ============================================

-- Étape 1 : Révoquer toutes les permissions publiques
REVOKE ALL ON TABLE public.spatial_ref_sys FROM PUBLIC;
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon;
REVOKE ALL ON TABLE public.spatial_ref_sys FROM authenticated;

-- Étape 2 : Accorder uniquement SELECT aux rôles qui en ont besoin
-- Si votre API PostgREST a besoin de lire cette table via anon :
GRANT SELECT ON TABLE public.spatial_ref_sys TO anon;

-- Si vous voulez que seuls les utilisateurs authentifiés puissent lire :
-- GRANT SELECT ON TABLE public.spatial_ref_sys TO authenticated;

-- Note: Vous pouvez choisir anon OU authenticated selon vos besoins
-- Pour l'instant, on accorde à anon car c'est souvent nécessaire pour PostGIS

-- Étape 3 : S'assurer que les rôles système gardent leurs permissions
-- (postgres et service_role gardent leurs permissions par défaut)

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Vérifier les permissions après modification
SELECT 
    grantee as role,
    privilege_type as permission,
    is_grantable as peut_octroyer
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
    AND table_name = 'spatial_ref_sys'
ORDER BY grantee, privilege_type;

-- Vérifier le statut RLS (devrait rester désactivé)
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Activé'
        ELSE '❌ RLS Désactivé (normal pour cette table)'
    END as rls_status,
    tableowner as proprietaire
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename = 'spatial_ref_sys';

-- ============================================
-- RÉSULTAT ATTENDU
-- ============================================
-- Après exécution, vous devriez voir :
-- - anon : SELECT uniquement
-- - postgres : Toutes les permissions (normal)
-- - service_role : Toutes les permissions (normal)
-- - Plus de PUBLIC, authenticated (sauf si vous avez choisi authenticated)
-- 
-- L'alerte Security Advisor pourrait persister car elle vérifie RLS,
-- mais l'accès est maintenant restreint et sécurisé.
-- ============================================














