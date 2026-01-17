-- ============================================
-- EXPOSER LE SCHÉMA adhesion VIA POSTGREST
-- PostgREST doit avoir accès au schéma pour que l'API REST fonctionne
-- ============================================

-- 1. Vérifier si le schéma est dans le search_path de PostgREST
-- (PostgREST utilise généralement le search_path par défaut ou celui configuré)

-- 2. Accorder les permissions nécessaires au rôle postgres (utilisé par PostgREST)
-- Note : PostgREST utilise généralement le rôle 'postgres' ou 'authenticator'
GRANT USAGE ON SCHEMA adhesion TO postgres;
GRANT USAGE ON SCHEMA adhesion TO anon;
GRANT USAGE ON SCHEMA adhesion TO authenticated;
GRANT USAGE ON SCHEMA adhesion TO service_role;

-- 3. Accorder les permissions sur la table members
GRANT ALL ON TABLE adhesion.members TO postgres;
GRANT INSERT ON TABLE adhesion.members TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE adhesion.members TO authenticated;
GRANT ALL ON TABLE adhesion.members TO service_role;

-- 4. Si PostgREST utilise un rôle spécifique, l'ajouter aussi
-- (Supabase utilise généralement 'postgres' pour PostgREST)
DO $$
BEGIN
  -- Vérifier si le rôle 'authenticator' existe (utilisé par certains setups PostgREST)
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') THEN
    GRANT USAGE ON SCHEMA adhesion TO authenticator;
    GRANT ALL ON TABLE adhesion.members TO authenticator;
    RAISE NOTICE 'Permissions accordées à authenticator';
  END IF;
END $$;

-- 5. Vérifier les permissions finales
SELECT 
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.role_table_grants
WHERE table_schema = 'adhesion'
  AND table_name = 'members'
  AND grantee IN ('anon', 'authenticated', 'postgres', 'service_role', 'authenticator')
ORDER BY grantee, privilege_type;













