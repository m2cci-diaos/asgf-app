-- ============================================
-- GESTION DE spatial_ref_sys (TABLE SYSTÈME POSTGIS)
-- ============================================
-- ATTENTION: Cette table appartient à PostGIS et nécessite des privilèges élevés
-- Si vous obtenez une erreur "must be owner", c'est normal
-- 
-- OPTIONS:
-- 1. Ignorer cette erreur (recommandé) - voir sql_handle_spatial_ref_sys.md
-- 2. Exécuter ce script avec service_role (si disponible)
-- 3. Contacter le support Supabase
-- ============================================

-- TENTATIVE 1: Révoker les permissions publiques (peut fonctionner)
REVOKE ALL ON TABLE public.spatial_ref_sys FROM anon;
REVOKE ALL ON TABLE public.spatial_ref_sys FROM authenticated;

-- TENTATIVE 2: Activer RLS (nécessite d'être propriétaire ou service_role)
-- Si vous obtenez une erreur ici, c'est normal - cette table est protégée
DO $$
BEGIN
    ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
    RAISE NOTICE 'RLS activé sur spatial_ref_sys';
EXCEPTION
    WHEN insufficient_privilege THEN
        RAISE NOTICE 'Permissions insuffisantes pour activer RLS sur spatial_ref_sys (normal pour une table système)';
    WHEN OTHERS THEN
        RAISE NOTICE 'Erreur lors de l''activation RLS: %', SQLERRM;
END $$;

-- TENTATIVE 3: Créer une politique (si RLS a été activé)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Allow public read spatial_ref_sys" ON public.spatial_ref_sys;
    CREATE POLICY "Allow public read spatial_ref_sys"
    ON public.spatial_ref_sys
    FOR SELECT
    TO anon
    USING (true);
    RAISE NOTICE 'Politique créée sur spatial_ref_sys';
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Impossible de créer la politique (normal si RLS n''est pas activé): %', SQLERRM;
END $$;

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Activé'
        ELSE '❌ RLS Désactivé'
    END as rls_status,
    (SELECT COUNT(*) FROM pg_policies p 
     WHERE p.schemaname = t.schemaname 
     AND p.tablename = t.tablename) as nombre_politiques
FROM pg_tables t
WHERE schemaname = 'public'
    AND tablename = 'spatial_ref_sys';

