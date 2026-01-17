-- ============================================
-- CORRECTION DES PROBLÈMES DE SÉCURITÉ RLS
-- ============================================
-- Ce script corrige les erreurs détectées par Supabase Security Advisor
-- Problème principal : Tables avec des politiques RLS mais RLS non activé
-- Date : 2025-12-04
-- ============================================

-- ============================================
-- ÉTAPE 1 : IDENTIFIER LES TABLES AVEC POLITIQUES MAIS RLS DÉSACTIVÉ
-- ============================================

-- Cette requête identifie toutes les tables qui ont des politiques mais RLS désactivé
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT DISTINCT
            p.schemaname,
            p.tablename
        FROM pg_policies p
        INNER JOIN pg_tables t
            ON t.schemaname = p.schemaname
            AND t.tablename = p.tablename
        WHERE t.rowsecurity = false
        ORDER BY p.schemaname, p.tablename
    LOOP
        RAISE NOTICE 'Table avec politiques mais RLS désactivé: %.%', table_record.schemaname, table_record.tablename;
    END LOOP;
END $$;

-- ============================================
-- ÉTAPE 2 : ACTIVER RLS SUR formation.formations
-- ============================================

-- Activer RLS sur la table formations (problème identifié par Security Advisor)
ALTER TABLE IF EXISTS formation.formations ENABLE ROW LEVEL SECURITY;

-- Créer la politique si elle n'existe pas déjà
DROP POLICY IF EXISTS "Allow public read access to active formations" ON formation.formations;
CREATE POLICY "Allow public read access to active formations"
ON formation.formations
FOR SELECT
TO anon
USING (is_active = true OR is_active IS NULL);

-- Permissions pour l'admin (insert, update, delete)
DROP POLICY IF EXISTS "Allow insert for formations" ON formation.formations;
CREATE POLICY "Allow insert for formations"
ON formation.formations
FOR INSERT
TO anon
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for formations" ON formation.formations;
CREATE POLICY "Allow update for formations"
ON formation.formations
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow delete for formations" ON formation.formations;
CREATE POLICY "Allow delete for formations"
ON formation.formations
FOR DELETE
TO anon
USING (true);

-- Accorder les permissions
GRANT USAGE ON SCHEMA formation TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE formation.formations TO anon;

-- ============================================
-- ÉTAPE 3 : VÉRIFIER ET CORRIGER TOUTES LES AUTRES TABLES
-- ============================================

-- Activer RLS sur toutes les tables qui ont des politiques mais RLS désactivé
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN
        SELECT DISTINCT
            p.schemaname,
            p.tablename
        FROM pg_policies p
        INNER JOIN pg_tables t
            ON t.schemaname = p.schemaname
            AND t.tablename = p.tablename
        WHERE t.rowsecurity = false
        ORDER BY p.schemaname, p.tablename
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I.%I ENABLE ROW LEVEL SECURITY', 
                table_record.schemaname, table_record.tablename);
            RAISE NOTICE 'RLS activé sur %.%', table_record.schemaname, table_record.tablename;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE WARNING 'Erreur lors de l''activation de RLS sur %.% : %', 
                    table_record.schemaname, table_record.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- ============================================
-- ÉTAPE 4 : VÉRIFIER LES TABLES DU SCHÉMA formation
-- ============================================

-- S'assurer que toutes les tables du schéma formation ont RLS activé si elles ont des politiques
ALTER TABLE IF EXISTS formation.sessions ENABLE ROW LEVEL SECURITY;

-- Créer les politiques pour sessions si elles n'existent pas
DROP POLICY IF EXISTS "Allow public read access to sessions" ON formation.sessions;
CREATE POLICY "Allow public read access to sessions"
ON formation.sessions
FOR SELECT
TO anon
USING (true);

GRANT SELECT ON TABLE formation.sessions TO anon;

-- ============================================
-- ÉTAPE 5 : VÉRIFIER ET ACTIVER RLS SUR TOUTES LES TABLES
-- ============================================

-- Schéma adhesion
ALTER TABLE IF EXISTS adhesion.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS adhesion.cotisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS adhesion.users ENABLE ROW LEVEL SECURITY; -- Ajouté

-- Schéma tresorerie
ALTER TABLE IF EXISTS tresorerie.cartes_membres ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tresorerie.paiements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tresorerie.depenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tresorerie.periodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS tresorerie.historique ENABLE ROW LEVEL SECURITY; -- Ajouté
ALTER TABLE IF EXISTS tresorerie.relances ENABLE ROW LEVEL SECURITY; -- Ajouté

-- Schéma mentorat
ALTER TABLE IF EXISTS mentorat.relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mentorat.comptes_rendus ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mentorat.mentees ENABLE ROW LEVEL SECURITY; -- Ajouté
ALTER TABLE IF EXISTS mentorat.mentors ENABLE ROW LEVEL SECURITY; -- Ajouté
ALTER TABLE IF EXISTS mentorat.objectifs ENABLE ROW LEVEL SECURITY; -- Ajouté
ALTER TABLE IF EXISTS mentorat.rendezvous ENABLE ROW LEVEL SECURITY; -- Ajouté

-- Schéma recrutement
ALTER TABLE IF EXISTS recrutement.candidatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recrutement.suivis ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recrutement.recommandations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS recrutement.suivi_candidatures ENABLE ROW LEVEL SECURITY; -- Ajouté (nom correct)

-- Schéma secretariat
ALTER TABLE IF EXISTS secretariat.reunions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS secretariat.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS secretariat.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS secretariat.participants_reunion ENABLE ROW LEVEL SECURITY; -- Ajouté (nom correct)
ALTER TABLE IF EXISTS secretariat.actions ENABLE ROW LEVEL SECURITY; -- Ajouté
ALTER TABLE IF EXISTS secretariat.comptes_rendus ENABLE ROW LEVEL SECURITY; -- Ajouté
ALTER TABLE IF EXISTS secretariat.rapports_presidence ENABLE ROW LEVEL SECURITY; -- Ajouté

-- Schéma admin
ALTER TABLE IF EXISTS admin.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin.module_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS admin.admins_modules ENABLE ROW LEVEL SECURITY; -- Ajouté (nom correct)

-- Schéma public
ALTER TABLE IF EXISTS public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projets ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projets_inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.contact_messages ENABLE ROW LEVEL SECURITY; -- Ajouté
-- Note: spatial_ref_sys est une table système PostGIS, on la laisse telle quelle

-- Schéma webinaire
ALTER TABLE IF EXISTS webinaire.webinaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS webinaire.presentateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS webinaire.inscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS webinaire.stats ENABLE ROW LEVEL SECURITY; -- Ajouté

-- ============================================
-- ÉTAPE 6 : RAPPORT FINAL
-- ============================================

-- Afficher toutes les tables avec leurs statuts RLS
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Activé'
        ELSE '❌ RLS Désactivé'
    END as rls_status,
    (SELECT COUNT(*) FROM pg_policies p 
     WHERE p.schemaname = t.schemaname 
     AND p.tablename = t.tablename) as policy_count
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
        ELSE 1 
    END,
    schemaname,
    tablename;

-- Afficher les tables avec politiques mais RLS désactivé (devrait être vide après correction)
SELECT 
    '⚠️ PROBLÈME DÉTECTÉ' as status,
    p.schemaname,
    p.tablename,
    COUNT(DISTINCT p.policyname) as policy_count
FROM pg_policies p
INNER JOIN pg_tables t
    ON t.schemaname = p.schemaname
    AND t.tablename = p.tablename
WHERE t.rowsecurity = false
GROUP BY p.schemaname, p.tablename
ORDER BY p.schemaname, p.tablename;

-- ============================================
-- FIN DU SCRIPT
-- ============================================
-- Après exécution, vérifiez le Security Advisor dans Supabase
-- Toutes les erreurs "Policy Exists RLS Disabled" devraient être résolues
-- ============================================

