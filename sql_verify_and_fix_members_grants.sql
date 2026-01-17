-- ============================================
-- VÉRIFICATION ET CORRECTION DES PERMISSIONS GRANT
-- Pour que RLS fonctionne, il faut BOTH les politiques ET les permissions GRANT
-- ============================================

-- 1. VÉRIFIER LES PERMISSIONS ACTUELLES SUR LE SCHÉMA
SELECT 
  'Permissions sur le schéma adhesion' as type,
  grantee,
  privilege_type
FROM information_schema.usage_privileges
WHERE object_schema = 'adhesion'
  AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;

-- 2. VÉRIFIER LES PERMISSIONS ACTUELLES SUR LA TABLE
SELECT 
  'Permissions sur la table members' as type,
  grantee,
  privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'adhesion'
  AND table_name = 'members'
  AND grantee IN ('anon', 'authenticated', 'public')
ORDER BY grantee, privilege_type;

-- 3. CORRIGER LES PERMISSIONS (à exécuter si nécessaire)

-- Permissions sur le schéma
GRANT USAGE ON SCHEMA adhesion TO anon;
GRANT USAGE ON SCHEMA adhesion TO authenticated;

-- Permissions sur la table pour anon (INSERT uniquement pour le formulaire)
GRANT INSERT ON TABLE adhesion.members TO anon;

-- Permissions sur la table pour authenticated (toutes les opérations pour les admins)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE adhesion.members TO authenticated;

-- 4. VÉRIFICATION FINALE APRÈS CORRECTION
SELECT 
  '✅ Permissions accordées' as statut,
  grantee,
  string_agg(privilege_type, ', ' ORDER BY privilege_type) as permissions
FROM information_schema.role_table_grants
WHERE table_schema = 'adhesion'
  AND table_name = 'members'
  AND grantee IN ('anon', 'authenticated')
GROUP BY grantee
ORDER BY grantee;













