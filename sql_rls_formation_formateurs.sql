-- ============================================
-- POLITIQUES RLS POUR LA TABLE formation_formateurs
-- ============================================

-- Activer RLS sur la table formation_formateurs
ALTER TABLE formation.formation_formateurs ENABLE ROW LEVEL SECURITY;

-- 1. Politique pour permettre la lecture publique (pour afficher les formateurs sur le site)
DROP POLICY IF EXISTS "Allow public read access to formation_formateurs" ON formation.formation_formateurs;
CREATE POLICY "Allow public read access to formation_formateurs"
ON formation.formation_formateurs
FOR SELECT
TO anon
USING (true);

-- 2. Politique pour permettre l'insertion (pour l'admin)
-- Note: En production, vous devriez restreindre cela au rôle authenticated ou service_role
DROP POLICY IF EXISTS "Allow insert for formation_formateurs" ON formation.formation_formateurs;
CREATE POLICY "Allow insert for formation_formateurs"
ON formation.formation_formateurs
FOR INSERT
TO anon
WITH CHECK (true);

-- 3. Politique pour permettre la mise à jour (pour l'admin)
DROP POLICY IF EXISTS "Allow update for formation_formateurs" ON formation.formation_formateurs;
CREATE POLICY "Allow update for formation_formateurs"
ON formation.formation_formateurs
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- 4. Politique pour permettre la suppression (pour l'admin)
DROP POLICY IF EXISTS "Allow delete for formation_formateurs" ON formation.formation_formateurs;
CREATE POLICY "Allow delete for formation_formateurs"
ON formation.formation_formateurs
FOR DELETE
TO anon
USING (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Accorder les permissions nécessaires au rôle 'anon'
GRANT USAGE ON SCHEMA formation TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE formation.formation_formateurs TO anon;

-- Si vous utilisez un rôle authenticated pour l'admin, accordez aussi les permissions
-- GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE formation.formation_formateurs TO authenticated;

-- ============================================
-- VÉRIFICATIONS
-- ============================================

-- Vérifier que RLS est activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'formation' 
AND tablename = 'formation_formateurs';

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
AND tablename = 'formation_formateurs';

-- Vérifier les permissions
SELECT 
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'formation'
AND table_name = 'formation_formateurs'
ORDER BY grantee, privilege_type;














