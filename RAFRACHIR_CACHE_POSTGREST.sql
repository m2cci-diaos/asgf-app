-- ============================================
-- RAFRAÎCHIR LE CACHE POSTGREST
-- ============================================
-- Date: 2025-01-16
-- Description: Forcer le rafraîchissement du cache de schéma PostgREST

-- Méthode 1: Notifier PostgREST du changement de schéma
NOTIFY pgrst, 'reload schema';

-- Méthode 2: Vérifier que les colonnes sont bien exposées
SELECT 
  table_schema,
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_schema = 'secretariat' 
AND table_name = 'documents'
ORDER BY ordinal_position;

-- Méthode 3: Vérifier les permissions RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'secretariat' 
AND tablename = 'documents';

-- Méthode 4: Vérifier que le schéma est exposé à PostgREST
SELECT 
  schema_name
FROM information_schema.schemata 
WHERE schema_name = 'secretariat';



