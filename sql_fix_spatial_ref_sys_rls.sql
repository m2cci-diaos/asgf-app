-- ============================================
-- CORRECTION RLS POUR spatial_ref_sys
-- ============================================
-- Cette table système PostGIS nécessite des privilèges élevés
-- On utilise une fonction avec SECURITY DEFINER pour contourner les restrictions
-- ============================================

-- Créer une fonction qui active RLS avec les privilèges nécessaires
CREATE OR REPLACE FUNCTION public.enable_rls_spatial_ref_sys()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Activer RLS sur spatial_ref_sys
    ALTER TABLE public.spatial_ref_sys ENABLE ROW LEVEL SECURITY;
    
    -- Créer une politique pour permettre la lecture publique
    DROP POLICY IF EXISTS "Allow public read spatial_ref_sys" ON public.spatial_ref_sys;
    CREATE POLICY "Allow public read spatial_ref_sys"
    ON public.spatial_ref_sys
    FOR SELECT
    TO anon
    USING (true);
    
    RAISE NOTICE 'RLS activé et politique créée pour spatial_ref_sys';
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erreur lors de l''activation RLS: %', SQLERRM;
        RAISE;
END;
$$;

-- Exécuter la fonction
SELECT public.enable_rls_spatial_ref_sys();

-- Nettoyer : supprimer la fonction après utilisation (optionnel)
-- DROP FUNCTION IF EXISTS public.enable_rls_spatial_ref_sys();

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















