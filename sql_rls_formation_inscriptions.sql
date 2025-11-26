-- ============================================
-- POLITIQUES RLS POUR LES INSCRIPTIONS AUX FORMATIONS
-- ============================================

-- Activer RLS sur la table inscriptions
ALTER TABLE formation.inscriptions ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre l'insertion d'inscriptions par les utilisateurs anonymes
CREATE POLICY "Allow public insert inscriptions"
ON formation.inscriptions
FOR INSERT
TO anon
WITH CHECK (true);

-- Politique pour permettre la lecture de ses propres inscriptions (par email)
-- Note: Cette politique nécessite que l'utilisateur soit authentifié
-- Pour l'instant, on permet la lecture publique pour faciliter le développement
-- À restreindre en production si nécessaire
CREATE POLICY "Allow public read own inscriptions"
ON formation.inscriptions
FOR SELECT
TO anon
USING (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Donner les permissions nécessaires au rôle anon
GRANT USAGE ON SCHEMA formation TO anon;
GRANT SELECT, INSERT ON formation.inscriptions TO anon;
GRANT SELECT ON formation.formations TO anon;
GRANT SELECT ON formation.formateurs TO anon;
GRANT SELECT ON formation.sessions TO anon;

-- ============================================
-- VÉRIFICATIONS
-- ============================================

-- Vérifier que RLS est activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'formation' 
AND tablename = 'inscriptions';

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
AND tablename = 'inscriptions';



