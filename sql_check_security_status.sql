-- ============================================
-- VÉRIFICATION DU STATUT DE SÉCURITÉ RLS
-- ============================================
-- Ce script permet de vérifier l'état de sécurité avant et après correction
-- ============================================

-- ============================================
-- 1. TABLES AVEC POLITIQUES MAIS RLS DÉSACTIVÉ (PROBLÈMES)
-- ============================================
SELECT 
    '❌ ERREUR' as status,
    p.schemaname || '.' || p.tablename as table_name,
    COUNT(DISTINCT p.policyname) as nombre_politiques,
    STRING_AGG(DISTINCT p.policyname, ', ' ORDER BY p.policyname) as politiques
FROM pg_policies p
INNER JOIN pg_tables t
    ON t.schemaname = p.schemaname
    AND t.tablename = p.tablename
WHERE t.rowsecurity = false
GROUP BY p.schemaname, p.tablename
ORDER BY p.schemaname, p.tablename;

-- ============================================
-- 2. STATUT RLS DE TOUTES LES TABLES IMPORTANTES
-- ============================================
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ Activé'
        ELSE '❌ Désactivé'
    END as rls_status,
    (SELECT COUNT(*) FROM pg_policies p 
     WHERE p.schemaname = t.schemaname 
     AND p.tablename = t.tablename) as nombre_politiques,
    CASE 
        WHEN rowsecurity = false AND (SELECT COUNT(*) FROM pg_policies p 
                                      WHERE p.schemaname = t.schemaname 
                                      AND p.tablename = t.tablename) > 0 
        THEN '⚠️ PROBLÈME'
        WHEN rowsecurity = true AND (SELECT COUNT(*) FROM pg_policies p 
                                     WHERE p.schemaname = t.schemaname 
                                     AND p.tablename = t.tablename) > 0 
        THEN '✅ OK'
        WHEN rowsecurity = false AND (SELECT COUNT(*) FROM pg_policies p 
                                      WHERE p.schemaname = t.schemaname 
                                      AND p.tablename = t.tablename) = 0 
        THEN 'ℹ️ Pas de politiques'
        ELSE '❓ Inconnu'
    END as etat_securite
FROM pg_tables t
WHERE schemaname IN ('formation', 'webinaire', 'adhesion', 'tresorerie', 
                     'mentorat', 'recrutement', 'secretariat', 'admin', 'public')
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE '_prisma%'
ORDER BY 
    CASE 
        WHEN rowsecurity = false AND (SELECT COUNT(*) FROM pg_policies p 
                                      WHERE p.schemaname = t.schemaname 
                                      AND p.tablename = t.tablename) > 0 
        THEN 0
        WHEN rowsecurity = true AND (SELECT COUNT(*) FROM pg_policies p 
                                     WHERE p.schemaname = t.schemaname 
                                     AND p.tablename = t.tablename) > 0 
        THEN 1
        WHEN rowsecurity = false AND (SELECT COUNT(*) FROM pg_policies p 
                                      WHERE p.schemaname = t.schemaname 
                                      AND p.tablename = t.tablename) = 0 
        THEN 2
        ELSE 3
    END,
    schemaname,
    tablename;

-- ============================================
-- 3. DÉTAIL DES POLITIQUES PAR TABLE
-- ============================================
SELECT 
    schemaname,
    tablename,
    policyname,
    cmd as operation,
    roles,
    CASE 
        WHEN cmd = 'SELECT' THEN '📖 Lecture'
        WHEN cmd = 'INSERT' THEN '➕ Insertion'
        WHEN cmd = 'UPDATE' THEN '✏️ Mise à jour'
        WHEN cmd = 'DELETE' THEN '🗑️ Suppression'
        ELSE cmd
    END as description
FROM pg_policies
WHERE schemaname IN ('formation', 'webinaire', 'adhesion', 'tresorerie', 
                     'mentorat', 'recrutement', 'secretariat', 'admin', 'public')
ORDER BY schemaname, tablename, cmd;

-- ============================================
-- 4. RÉSUMÉ PAR SCHÉMA
-- ============================================
SELECT 
    schemaname,
    COUNT(DISTINCT tablename) as nombre_tables,
    COUNT(DISTINCT CASE WHEN rowsecurity THEN tablename END) as tables_rls_actif,
    COUNT(DISTINCT CASE WHEN NOT rowsecurity THEN tablename END) as tables_rls_desactive,
    COUNT(DISTINCT CASE 
        WHEN NOT rowsecurity AND EXISTS (
            SELECT 1 FROM pg_policies p 
            WHERE p.schemaname = t.schemaname 
            AND p.tablename = t.tablename
        ) THEN tablename 
    END) as tables_problemes
FROM pg_tables t
WHERE schemaname IN ('formation', 'webinaire', 'adhesion', 'tresorerie', 
                     'mentorat', 'recrutement', 'secretariat', 'admin', 'public')
    AND tablename NOT LIKE 'pg_%'
    AND tablename NOT LIKE '_prisma%'
GROUP BY schemaname
ORDER BY schemaname;

-- ============================================
-- 5. COMPTEUR TOTAL DES PROBLÈMES
-- ============================================
SELECT 
    COUNT(DISTINCT p.tablename) as nombre_tables_avec_problemes,
    COUNT(DISTINCT p.policyname) as nombre_politiques_affectees
FROM pg_policies p
INNER JOIN pg_tables t
    ON t.schemaname = p.schemaname
    AND t.tablename = p.tablename
WHERE t.rowsecurity = false
    AND t.schemaname IN ('formation', 'webinaire', 'adhesion', 'tresorerie', 
                         'mentorat', 'recrutement', 'secretariat', 'admin', 'public');

