-- ============================================
-- POLITIQUES RLS POUR LES WEBINAIRES
-- ============================================

-- Activer RLS sur les tables
ALTER TABLE webinaire.webinaires ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinaire.presentateurs ENABLE ROW LEVEL SECURITY;
ALTER TABLE webinaire.inscriptions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLITIQUES POUR webinaires
-- ============================================

-- Lecture publique des webinaires actifs
DROP POLICY IF EXISTS "Allow public read active webinaires" ON webinaire.webinaires;
CREATE POLICY "Allow public read active webinaires"
ON webinaire.webinaires
FOR SELECT
TO anon
USING (is_active = true);

-- Insertion pour l'admin (via anon pour l'instant, à restreindre en production)
DROP POLICY IF EXISTS "Allow insert for webinaires" ON webinaire.webinaires;
CREATE POLICY "Allow insert for webinaires"
ON webinaire.webinaires
FOR INSERT
TO anon
WITH CHECK (true);

-- Mise à jour pour l'admin
DROP POLICY IF EXISTS "Allow update for webinaires" ON webinaire.webinaires;
CREATE POLICY "Allow update for webinaires"
ON webinaire.webinaires
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Suppression pour l'admin
DROP POLICY IF EXISTS "Allow delete for webinaires" ON webinaire.webinaires;
CREATE POLICY "Allow delete for webinaires"
ON webinaire.webinaires
FOR DELETE
TO anon
USING (true);

-- ============================================
-- POLITIQUES POUR presentateurs
-- ============================================

-- Lecture publique des présentateurs
DROP POLICY IF EXISTS "Allow public read presentateurs" ON webinaire.presentateurs;
CREATE POLICY "Allow public read presentateurs"
ON webinaire.presentateurs
FOR SELECT
TO anon
USING (true);

-- Insertion pour l'admin
DROP POLICY IF EXISTS "Allow insert for presentateurs" ON webinaire.presentateurs;
CREATE POLICY "Allow insert for presentateurs"
ON webinaire.presentateurs
FOR INSERT
TO anon
WITH CHECK (true);

-- Mise à jour pour l'admin
DROP POLICY IF EXISTS "Allow update for presentateurs" ON webinaire.presentateurs;
CREATE POLICY "Allow update for presentateurs"
ON webinaire.presentateurs
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Suppression pour l'admin
DROP POLICY IF EXISTS "Allow delete for presentateurs" ON webinaire.presentateurs;
CREATE POLICY "Allow delete for presentateurs"
ON webinaire.presentateurs
FOR DELETE
TO anon
USING (true);

-- ============================================
-- POLITIQUES POUR inscriptions
-- ============================================

-- Insertion publique (pour s'inscrire)
DROP POLICY IF EXISTS "Allow public insert inscriptions" ON webinaire.inscriptions;
CREATE POLICY "Allow public insert inscriptions"
ON webinaire.inscriptions
FOR INSERT
TO anon
WITH CHECK (true);

-- Lecture publique (pour vérifier son inscription)
DROP POLICY IF EXISTS "Allow public read inscriptions" ON webinaire.inscriptions;
CREATE POLICY "Allow public read inscriptions"
ON webinaire.inscriptions
FOR SELECT
TO anon
USING (true);

-- Mise à jour pour l'admin
DROP POLICY IF EXISTS "Allow update for inscriptions" ON webinaire.inscriptions;
CREATE POLICY "Allow update for inscriptions"
ON webinaire.inscriptions
FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

-- Suppression pour l'admin
DROP POLICY IF EXISTS "Allow delete for inscriptions" ON webinaire.inscriptions;
CREATE POLICY "Allow delete for inscriptions"
ON webinaire.inscriptions
FOR DELETE
TO anon
USING (true);

-- ============================================
-- GRANT PERMISSIONS
-- ============================================

-- Accorder les permissions nécessaires au rôle 'anon'
GRANT USAGE ON SCHEMA webinaire TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE webinaire.webinaires TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE webinaire.presentateurs TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE webinaire.inscriptions TO anon;

-- ============================================
-- VÉRIFICATIONS
-- ============================================

-- Vérifier que RLS est activé
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'webinaire'
ORDER BY tablename;

-- Vérifier les politiques créées
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'webinaire'
ORDER BY tablename, policyname;





