-- ============================================
-- ACTIVATION RLS SUR TOUTES LES TABLES IDENTIFIÉES
-- ============================================
-- Script complémentaire pour activer RLS sur toutes les tables
-- qui ont actuellement RLS désactivé
-- ============================================

-- Schéma adhesion
ALTER TABLE IF EXISTS adhesion.users ENABLE ROW LEVEL SECURITY;

-- Schéma admin
ALTER TABLE IF EXISTS admin.admins_modules ENABLE ROW LEVEL SECURITY;

-- Schéma mentorat
ALTER TABLE IF EXISTS mentorat.objectifs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS mentorat.rendezvous ENABLE ROW LEVEL SECURITY;

-- Schéma recrutement
ALTER TABLE IF EXISTS recrutement.suivi_candidatures ENABLE ROW LEVEL SECURITY;

-- Schéma secretariat
ALTER TABLE IF EXISTS secretariat.actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS secretariat.comptes_rendus ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS secretariat.rapports_presidence ENABLE ROW LEVEL SECURITY;

-- Schéma tresorerie
ALTER TABLE IF EXISTS tresorerie.relances ENABLE ROW LEVEL SECURITY;

-- Schéma webinaire
ALTER TABLE IF EXISTS webinaire.stats ENABLE ROW LEVEL SECURITY;

-- Note: spatial_ref_sys est une table système PostGIS, on ne l'active pas

-- ============================================
-- VÉRIFICATION
-- ============================================
SELECT 
    schemaname,
    tablename,
    CASE 
        WHEN rowsecurity THEN '✅ RLS Activé'
        ELSE '❌ RLS Désactivé'
    END as rls_status
FROM pg_tables
WHERE schemaname IN ('adhesion', 'admin', 'mentorat', 'recrutement', 
                     'secretariat', 'tresorerie', 'webinaire')
    AND tablename IN (
        'users', 'admins_modules', 'objectifs', 'rendezvous',
        'suivi_candidatures', 'actions', 'comptes_rendus', 
        'rapports_presidence', 'relances', 'stats'
    )
ORDER BY schemaname, tablename;
















