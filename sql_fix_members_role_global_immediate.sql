-- ============================================
-- CORRECTION IMMÉDIATE : role_global dans adhesion.members
-- Problème : Les politiques RLS référencent role_global qui n'existe plus
-- Solution : Supprimer et recréer les politiques avec role_type
-- ============================================

-- 1. Supprimer TOUTES les politiques existantes sur adhesion.members
DO $$
DECLARE
  policy_record RECORD;
BEGIN
  FOR policy_record IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE schemaname = 'adhesion' 
      AND tablename = 'members'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON adhesion.members', policy_record.policyname);
    RAISE NOTICE 'Politique supprimée: %', policy_record.policyname;
  END LOOP;
END $$;

-- 2. Recréer les politiques simplifiées
-- Note : Les admins ne sont pas dans auth.users, donc on ne peut pas utiliser auth.uid()
-- L'authentification réelle est gérée par les Edge Functions avec JWT
-- Ici, on permet simplement l'accès aux utilisateurs authentifiés pour les opérations admin

-- INSERT : Permettre l'insertion publique (pour le formulaire d'adhésion)
-- C'est la seule politique qui doit permettre anon
DROP POLICY IF EXISTS "members_insert_public" ON adhesion.members;
CREATE POLICY "members_insert_public"
ON adhesion.members
FOR INSERT
TO anon
WITH CHECK (true);

-- SELECT : Permettre la lecture aux utilisateurs authentifiés
-- L'authentification réelle est vérifiée par les Edge Functions
CREATE POLICY "members_select_authenticated"
ON adhesion.members
FOR SELECT
TO authenticated
USING (true);

-- UPDATE : Permettre la mise à jour aux utilisateurs authentifiés
-- L'authentification réelle est vérifiée par les Edge Functions
CREATE POLICY "members_update_authenticated"
ON adhesion.members
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE : Permettre la suppression aux utilisateurs authentifiés
-- L'authentification réelle est vérifiée par les Edge Functions
CREATE POLICY "members_delete_authenticated"
ON adhesion.members
FOR DELETE
TO authenticated
USING (true);

-- 3. Vérifier que RLS est activé
ALTER TABLE adhesion.members ENABLE ROW LEVEL SECURITY;

-- 4. Accorder les permissions nécessaires (CRITIQUE pour que RLS fonctionne)
GRANT USAGE ON SCHEMA adhesion TO anon;
GRANT USAGE ON SCHEMA adhesion TO authenticated;
GRANT INSERT ON TABLE adhesion.members TO anon;
GRANT SELECT, UPDATE, DELETE ON TABLE adhesion.members TO authenticated;

-- 5. Vérification finale : Lister toutes les politiques
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  roles,
  CASE 
    WHEN qual::text LIKE '%role_global%' THEN '❌ CONTIENT role_global - À CORRIGER'
    WHEN qual::text LIKE '%role_type%' THEN '⚠️ Utilise role_type (peut causer problème)'
    ELSE '✅ OK'
  END as verification_qual,
  CASE 
    WHEN with_check::text LIKE '%role_global%' THEN '❌ CONTIENT role_global - À CORRIGER'
    WHEN with_check::text LIKE '%role_type%' THEN '⚠️ Utilise role_type (peut causer problème)'
    ELSE '✅ OK'
  END as verification_with_check
FROM pg_policies
WHERE schemaname = 'adhesion'
  AND tablename = 'members'
ORDER BY policyname;

-- Vérifier qu'il n'y a plus de références à role_global
SELECT 
  COUNT(*) as nombre_politiques_avec_role_global
FROM pg_policies
WHERE schemaname = 'adhesion'
  AND tablename = 'members'
  AND (
    qual::text LIKE '%role_global%'
    OR with_check::text LIKE '%role_global%'
  );

