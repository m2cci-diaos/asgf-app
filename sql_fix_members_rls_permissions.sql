-- ============================================
-- CORRECTION COMPLÈTE : RLS et permissions pour adhesion.members
-- Problème : La politique INSERT existe mais les permissions GRANT manquent
-- Solution : Accorder les permissions nécessaires au rôle anon
-- ============================================

-- 1. Vérifier les politiques actuelles
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'adhesion'
  AND tablename = 'members'
ORDER BY policyname;

-- 2. Accorder les permissions nécessaires au schéma
GRANT USAGE ON SCHEMA adhesion TO anon;
GRANT USAGE ON SCHEMA adhesion TO authenticated;

-- 3. Accorder les permissions sur la table members
-- INSERT : nécessaire pour le formulaire d'adhésion public
GRANT INSERT ON TABLE adhesion.members TO anon;
GRANT INSERT ON TABLE adhesion.members TO authenticated;

-- SELECT : pour les admins (via authenticated)
GRANT SELECT ON TABLE adhesion.members TO authenticated;

-- UPDATE : pour les admins (via authenticated)
GRANT UPDATE ON TABLE adhesion.members TO authenticated;

-- DELETE : pour les admins (via authenticated)
GRANT DELETE ON TABLE adhesion.members TO authenticated;

-- 4. Vérifier que RLS est activé
ALTER TABLE adhesion.members ENABLE ROW LEVEL SECURITY;

-- 5. Vérification finale : Vérifier les permissions accordées
SELECT 
  grantee,
  table_schema,
  table_name,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'adhesion'
  AND table_name = 'members'
  AND grantee IN ('anon', 'authenticated')
ORDER BY grantee, privilege_type;













