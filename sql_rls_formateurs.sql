-- ============================================
-- POLITIQUES RLS POUR LA TABLE formateurs
-- ============================================

-- Activer RLS sur la table formateurs
ALTER TABLE formation.formateurs ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture des formateurs pour tous (anon)
DROP POLICY IF EXISTS "Allow public read access to formateurs" ON formation.formateurs;
CREATE POLICY "Allow public read access to formateurs"
ON formation.formateurs
FOR SELECT
TO anon
USING (true);

-- Accorder les permissions nécessaires au rôle 'anon'
GRANT USAGE ON SCHEMA formation TO anon;
GRANT SELECT ON TABLE formation.formateurs TO anon;

-- ============================================
-- VÉRIFICATIONS
-- ============================================

-- Vérifier que RLS est activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'formation' 
AND tablename = 'formateurs';

-- Vérifier les politiques créées
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'formation'
AND tablename = 'formateurs';











