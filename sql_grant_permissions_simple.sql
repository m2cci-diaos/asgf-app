-- ============================================
-- SCRIPT SIMPLIFIÉ POUR DONNER LES PERMISSIONS
-- AUX SCHÉMAS MENTORAT & RECRUTEMENT
-- ============================================
-- 
-- Exécutez ce script dans Supabase SQL Editor
-- avec les privilèges administrateur
--
-- ============================================

-- Donner USAGE sur les schémas au service_role (utilisé par le backend)
GRANT USAGE ON SCHEMA mentorat TO service_role;
GRANT USAGE ON SCHEMA recrutement TO service_role;

-- Donner toutes les permissions sur les tables
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA mentorat TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA recrutement TO service_role;

-- Donner les permissions sur les séquences
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA mentorat TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA recrutement TO service_role;

-- Permissions pour les futures tables
ALTER DEFAULT PRIVILEGES IN SCHEMA mentorat GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA recrutement GRANT ALL PRIVILEGES ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA mentorat GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA recrutement GRANT ALL PRIVILEGES ON SEQUENCES TO service_role;

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Permissions accordées avec succès sur les schémas mentorat et recrutement';
END $$;



