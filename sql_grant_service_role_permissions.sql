-- ============================================
-- SCRIPT POUR DONNER LES PERMISSIONS
-- AU SERVICE_ROLE (utilisé par le backend)
-- ============================================
-- 
-- IMPORTANT: Le backend utilise le service_role
-- avec la clé SUPABASE_SERVICE_ROLE, pas anon/authenticated
--
-- Exécutez ce script dans Supabase SQL Editor
-- avec les privilèges administrateur
--
-- ============================================

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

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Permissions accordées au service_role pour les schémas mentorat et recrutement';
END $$;



