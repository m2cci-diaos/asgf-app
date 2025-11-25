-- ============================================
-- SCRIPT POUR DONNER LES PERMISSIONS
-- AUX SCHÉMAS MENTORAT & RECRUTEMENT
-- ============================================
-- 
-- IMPORTANT: Exécutez ce script en tant qu'administrateur PostgreSQL
-- dans Supabase SQL Editor avec les privilèges admin
--
-- ============================================

-- 1. Donner USAGE sur les schémas (nécessaire pour accéder aux tables)
GRANT USAGE ON SCHEMA mentorat TO service_role;
GRANT USAGE ON SCHEMA recrutement TO service_role;

-- 2. Donner USAGE sur les schémas à authenticated (si utilisé)
GRANT USAGE ON SCHEMA mentorat TO authenticated;
GRANT USAGE ON SCHEMA recrutement TO authenticated;

-- 3. Donner USAGE sur les schémas à anon (si utilisé)
GRANT USAGE ON SCHEMA mentorat TO anon;
GRANT USAGE ON SCHEMA recrutement TO anon;

-- 4. Donner toutes les permissions sur les tables du schéma mentorat
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA mentorat TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA mentorat TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA mentorat TO anon;

-- 5. Donner toutes les permissions sur les tables du schéma recrutement
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA recrutement TO service_role;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA recrutement TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA recrutement TO anon;

-- 6. Donner les permissions sur les séquences (pour les auto-increment)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA mentorat TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA mentorat TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA mentorat TO anon;

GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA recrutement TO service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA recrutement TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA recrutement TO anon;

-- 7. Donner les permissions pour les futures tables (optionnel, pour les tables créées plus tard)
ALTER DEFAULT PRIVILEGES IN SCHEMA mentorat GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA mentorat GRANT ALL PRIVILEGES ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA mentorat GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA recrutement GRANT ALL PRIVILEGES ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA recrutement GRANT ALL PRIVILEGES ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA recrutement GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon;

-- 8. Vérifier les permissions accordées
SELECT 
  schemaname,
  tablename,
  tableowner,
  hasinserts,
  hasselects,
  hasupdates,
  hasdeletes
FROM pg_tables
WHERE schemaname IN ('mentorat', 'recrutement')
ORDER BY schemaname, tablename;

-- 9. Vérifier les permissions sur les schémas
SELECT 
  nspname as schema_name,
  nspacl as permissions
FROM pg_namespace
WHERE nspname IN ('mentorat', 'recrutement');



