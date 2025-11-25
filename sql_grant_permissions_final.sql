-- ============================================
-- SCRIPT FINAL POUR DONNER LES PERMISSIONS
-- AUX SCHÉMAS MENTORAT & RECRUTEMENT
-- ============================================
-- 
-- IMPORTANT: Exécutez ce script dans Supabase SQL Editor
-- avec les privilèges administrateur (postgres)
--
-- Ce script :
-- 1. Vérifie que les schémas existent
-- 2. Donne les permissions nécessaires au service_role
-- 3. Vérifie les permissions accordées
--
-- ============================================

-- Vérifier que les schémas existent
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'mentorat') THEN
    RAISE EXCEPTION 'Le schéma mentorat n''existe pas. Veuillez le créer d''abord.';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'recrutement') THEN
    RAISE EXCEPTION 'Le schéma recrutement n''existe pas. Veuillez le créer d''abord.';
  END IF;
  
  RAISE NOTICE '✅ Les schémas mentorat et recrutement existent';
END $$;

-- Donner USAGE sur les schémas au service_role
GRANT USAGE ON SCHEMA mentorat TO service_role;
GRANT USAGE ON SCHEMA recrutement TO service_role;

-- Donner toutes les permissions sur les tables existantes
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA mentorat TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA recrutement TO service_role;

-- Donner les permissions sur les séquences existantes
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA mentorat TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA recrutement TO service_role;

-- Permissions pour les futures tables (ALTER DEFAULT PRIVILEGES)
ALTER DEFAULT PRIVILEGES IN SCHEMA mentorat GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA recrutement GRANT ALL PRIVILEGES ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA mentorat GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA recrutement GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;

-- Vérification des permissions accordées
DO $$
DECLARE
  mentorat_tables_count INTEGER;
  recrutement_tables_count INTEGER;
BEGIN
  -- Compter les tables dans mentorat
  SELECT COUNT(*) INTO mentorat_tables_count
  FROM pg_tables
  WHERE schemaname = 'mentorat';
  
  -- Compter les tables dans recrutement
  SELECT COUNT(*) INTO recrutement_tables_count
  FROM pg_tables
  WHERE schemaname = 'recrutement';
  
  RAISE NOTICE '✅ Permissions accordées avec succès';
  RAISE NOTICE '   - Tables dans mentorat: %', mentorat_tables_count;
  RAISE NOTICE '   - Tables dans recrutement: %', recrutement_tables_count;
END $$;

-- Afficher un résumé des permissions
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname IN ('mentorat', 'recrutement')
ORDER BY schemaname, tablename;



