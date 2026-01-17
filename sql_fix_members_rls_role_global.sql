-- ============================================
-- CORRECTION : Politiques RLS sur adhesion.members
-- Problème : Les politiques RLS référencent role_global qui n'existe plus
-- Solution : Remplacer role_global par role_type dans admin.admins
-- ============================================

-- 1. Vérifier les politiques RLS existantes sur adhesion.members
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
WHERE schemaname = 'adhesion'
  AND tablename = 'members'
ORDER BY policyname;

-- 2. Lister toutes les politiques qui contiennent "role_global"
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE qual::text LIKE '%role_global%'
   OR with_check::text LIKE '%role_global%'
ORDER BY schemaname, tablename, policyname;

-- 3. Supprimer et recréer les politiques avec role_type au lieu de role_global
-- Note : Adaptez ces politiques selon vos besoins réels

-- Exemple pour une politique INSERT (si elle existe)
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  -- Parcourir toutes les politiques sur adhesion.members
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'adhesion' 
      AND tablename = 'members'
  LOOP
    -- Supprimer la politique existante
    EXECUTE format('DROP POLICY IF EXISTS %I ON adhesion.members', policy_record.policyname);
  END LOOP;
END $$;

-- Recréer les politiques avec role_type (exemples - à adapter selon vos besoins)

-- Politique pour permettre l'insertion publique (pour le formulaire d'adhésion)
CREATE POLICY IF NOT EXISTS "members_insert_public"
ON adhesion.members
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Politique pour permettre la lecture aux admins
CREATE POLICY IF NOT EXISTS "members_select_admin"
ON adhesion.members
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin.admins
    WHERE id = auth.uid()::text
      AND (role_type = 'superadmin' OR role_type = 'admin')
      AND (is_active IS NULL OR is_active = true)
      AND (disabled_until IS NULL OR disabled_until < now())
  )
);

-- Politique pour permettre la mise à jour aux admins
CREATE POLICY IF NOT EXISTS "members_update_admin"
ON adhesion.members
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin.admins
    WHERE id = auth.uid()::text
      AND (role_type = 'superadmin' OR role_type = 'admin')
      AND (is_active IS NULL OR is_active = true)
      AND (disabled_until IS NULL OR disabled_until < now())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin.admins
    WHERE id = auth.uid()::text
      AND (role_type = 'superadmin' OR role_type = 'admin')
      AND (is_active IS NULL OR is_active = true)
      AND (disabled_until IS NULL OR disabled_until < now())
  )
);

-- Politique pour permettre la suppression aux admins
CREATE POLICY IF NOT EXISTS "members_delete_admin"
ON adhesion.members
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin.admins
    WHERE id = auth.uid()::text
      AND (role_type = 'superadmin' OR role_type = 'admin')
      AND (is_active IS NULL OR is_active = true)
      AND (disabled_until IS NULL OR disabled_until < now())
  )
);

-- 4. Vérifier que RLS est activé sur la table
ALTER TABLE adhesion.members ENABLE ROW LEVEL SECURITY;

-- 5. Vérification finale
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'adhesion'
  AND tablename = 'members'
ORDER BY policyname;

