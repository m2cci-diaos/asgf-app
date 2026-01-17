-- ============================================
-- CORRECTION : Toutes les références à role_global
-- Problème : role_global a été renommé en role_type dans admin.admins
-- Solution : Trouver et corriger toutes les politiques RLS qui utilisent role_global
-- ============================================

-- 1. Trouver toutes les politiques qui référencent role_global
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

-- 2. Afficher le code source de toutes les fonctions qui pourraient contenir role_global
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE pg_get_functiondef(p.oid)::text LIKE '%role_global%'
ORDER BY n.nspname, p.proname;

-- 3. Pour chaque politique trouvée, la recréer avec role_type
-- Note : Cette section doit être adaptée selon les politiques réelles trouvées

-- Exemple de correction pour adhesion.members
DO $$
DECLARE
  policy_name TEXT;
  policy_cmd TEXT;
  policy_qual TEXT;
  policy_with_check TEXT;
  new_qual TEXT;
  new_with_check TEXT;
BEGIN
  -- Parcourir toutes les politiques sur adhesion.members
  FOR policy_name, policy_cmd, policy_qual, policy_with_check IN
    SELECT 
      policyname,
      cmd::text,
      qual::text,
      with_check::text
    FROM pg_policies
    WHERE schemaname = 'adhesion'
      AND tablename = 'members'
      AND (
        qual::text LIKE '%role_global%'
        OR with_check::text LIKE '%role_global%'
      )
  LOOP
    -- Remplacer role_global par role_type
    new_qual := REPLACE(policy_qual, 'role_global', 'role_type');
    new_with_check := REPLACE(policy_with_check, 'role_global', 'role_type');
    
    -- Supprimer l'ancienne politique
    EXECUTE format('DROP POLICY IF EXISTS %I ON adhesion.members', policy_name);
    
    -- Recréer la politique avec role_type
    -- Note : Cette partie doit être adaptée selon la structure réelle de vos politiques
    RAISE NOTICE 'Politique % trouvée et supprimée. Recréez-la manuellement avec role_type.', policy_name;
  END LOOP;
END $$;

-- 4. Solution simple : Recréer les politiques de base pour adhesion.members
-- (Supprime toutes les politiques existantes et les recrée)

-- Supprimer toutes les politiques existantes
DROP POLICY IF EXISTS "members_insert_public" ON adhesion.members;
DROP POLICY IF EXISTS "members_select_admin" ON adhesion.members;
DROP POLICY IF EXISTS "members_update_admin" ON adhesion.members;
DROP POLICY IF EXISTS "members_delete_admin" ON adhesion.members;
DROP POLICY IF EXISTS "members_select_own" ON adhesion.members;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON adhesion.members;
DROP POLICY IF EXISTS "Enable read access for all users" ON adhesion.members;
DROP POLICY IF EXISTS "Enable update for users based on email" ON adhesion.members;
DROP POLICY IF EXISTS "Enable delete for users based on email" ON adhesion.members;

-- Recréer les politiques avec role_type

-- INSERT : Permettre l'insertion publique (pour le formulaire d'adhésion)
CREATE POLICY "members_insert_public"
ON adhesion.members
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- SELECT : Permettre la lecture aux admins uniquement
CREATE POLICY "members_select_admin"
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

-- UPDATE : Permettre la mise à jour aux admins uniquement
CREATE POLICY "members_update_admin"
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

-- DELETE : Permettre la suppression aux admins uniquement
CREATE POLICY "members_delete_admin"
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

-- 5. Vérifier que RLS est activé
ALTER TABLE adhesion.members ENABLE ROW LEVEL SECURITY;

-- 6. Vérification finale
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

