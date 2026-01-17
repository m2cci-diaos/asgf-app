-- ============================================
-- CORRECTION COMPLÈTE ET DÉFINITIVE : RLS pour adhesion.members
-- Ce script supprime TOUT et recrée proprement
-- ============================================

BEGIN;

-- 1. DÉSACTIVER RLS TEMPORAIREMENT pour pouvoir nettoyer
ALTER TABLE adhesion.members DISABLE ROW LEVEL SECURITY;

-- 2. SUPPRIMER TOUTES LES POLITIQUES EXISTANTES
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

-- 3. ACCORDER LES PERMISSIONS SUR LE SCHÉMA
GRANT USAGE ON SCHEMA adhesion TO anon;
GRANT USAGE ON SCHEMA adhesion TO authenticated;

-- 4. ACCORDER LES PERMISSIONS SUR LA TABLE
-- Révoquer d'abord toutes les permissions existantes pour repartir à zéro
REVOKE ALL ON TABLE adhesion.members FROM anon;
REVOKE ALL ON TABLE adhesion.members FROM authenticated;
REVOKE ALL ON TABLE adhesion.members FROM public;

-- Puis accorder les permissions nécessaires
GRANT INSERT ON TABLE adhesion.members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE adhesion.members TO authenticated;

-- 5. RECRÉER LES POLITIQUES RLS (simples et permissives)

-- INSERT : Permettre l'insertion publique (formulaire d'adhésion)
CREATE POLICY "members_insert_public"
ON adhesion.members
FOR INSERT
TO anon
WITH CHECK (true);

-- SELECT : Permettre la lecture aux utilisateurs authentifiés
CREATE POLICY "members_select_authenticated"
ON adhesion.members
FOR SELECT
TO authenticated
USING (true);

-- UPDATE : Permettre la mise à jour aux utilisateurs authentifiés
CREATE POLICY "members_update_authenticated"
ON adhesion.members
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE : Permettre la suppression aux utilisateurs authentifiés
CREATE POLICY "members_delete_authenticated"
ON adhesion.members
FOR DELETE
TO authenticated
USING (true);

-- 6. RÉACTIVER RLS
ALTER TABLE adhesion.members ENABLE ROW LEVEL SECURITY;

COMMIT;

-- 7. VÉRIFICATION FINALE

-- Nombre de politiques RLS
SELECT 
  'Politiques RLS créées' as verification,
  COUNT(*)::text as valeur
FROM pg_policies
WHERE schemaname = 'adhesion'
  AND tablename = 'members';

-- RLS activé ?
SELECT 
  'RLS Activé' as verification,
  CASE WHEN rowsecurity THEN '✅ OUI' ELSE '❌ NON' END as valeur
FROM pg_tables
WHERE schemaname = 'adhesion'
  AND tablename = 'members';

-- Permissions INSERT pour anon
SELECT 
  'Permission INSERT pour anon' as verification,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ OUI'
    ELSE '❌ NON'
  END as valeur
FROM information_schema.role_table_grants
WHERE table_schema = 'adhesion'
  AND table_name = 'members'
  AND grantee = 'anon'
  AND privilege_type = 'INSERT';

-- Afficher toutes les politiques créées
SELECT 
  policyname,
  cmd,
  roles,
  CASE 
    WHEN with_check::text = 'true' THEN '✅ OK'
    ELSE with_check::text
  END as with_check_status
FROM pg_policies
WHERE schemaname = 'adhesion'
  AND tablename = 'members'
ORDER BY cmd, policyname;

