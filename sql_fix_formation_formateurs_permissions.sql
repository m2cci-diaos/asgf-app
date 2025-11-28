-- ============================================
-- FIX RAPIDE : PERMISSIONS POUR formation_formateurs
-- ============================================
-- Ce script corrige les erreurs 401/42501 "permission denied"

-- 1. Vérifier que la table existe
SELECT 
  schemaname,
  tablename,
  tableowner
FROM pg_tables 
WHERE schemaname = 'formation' 
AND tablename = 'formation_formateurs';

-- 2. Activer RLS (si pas déjà fait)
ALTER TABLE formation.formation_formateurs ENABLE ROW LEVEL SECURITY;

-- 3. Supprimer les anciennes politiques (au cas où)
DROP POLICY IF EXISTS "Allow public read access to formation_formateurs" ON formation.formation_formateurs;
DROP POLICY IF EXISTS "Allow insert for formation_formateurs" ON formation.formation_formateurs;
DROP POLICY IF EXISTS "Allow update for formation_formateurs" ON formation.formation_formateurs;
DROP POLICY IF EXISTS "Allow delete for formation_formateurs" ON formation.formation_formateurs;

-- 4. Créer les politiques RLS
CREATE POLICY "Allow public read access to formation_formateurs"
ON formation.formation_formateurs
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Allow insert for formation_formateurs"
ON formation.formation_formateurs
FOR INSERT
TO anon
WITH CHECK (true);

CREATE POLICY "Allow update for formation_formateurs"
ON formation.formation_formateurs
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow delete for formation_formateurs"
ON formation.formation_formateurs
FOR DELETE
TO anon
USING (true);

-- 5. Accorder les permissions GRANT (CRITIQUE)
-- D'abord, s'assurer que le schéma est accessible
GRANT USAGE ON SCHEMA formation TO anon;

-- Ensuite, accorder les permissions sur la table
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE formation.formation_formateurs TO anon;

-- 6. Vérifier que tout est bien configuré
SELECT 
  'RLS Status' as check_type,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'formation' 
AND tablename = 'formation_formateurs';

SELECT 
  'Policies' as check_type,
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE schemaname = 'formation'
AND tablename = 'formation_formateurs';

SELECT 
  'Grants' as check_type,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'formation'
AND table_name = 'formation_formateurs'
ORDER BY grantee, privilege_type;





