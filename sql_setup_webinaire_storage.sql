-- ============================================
-- CONFIGURATION DU STORAGE POUR LES WEBINAIRES
-- ============================================
-- Ce script doit être exécuté dans Supabase Dashboard > Storage
-- ou via l'API Supabase

-- Note: La création de buckets se fait généralement via l'interface Supabase
-- ou via l'API. Voici les commandes SQL pour créer les politiques de storage.

-- ============================================
-- CRÉER LE BUCKET (à faire via l'interface Supabase Dashboard > Storage)
-- ============================================
-- 1. Aller dans Supabase Dashboard > Storage
-- 2. Cliquer sur "New bucket"
-- 3. Nom: "webinaires"
-- 4. Public: Oui (pour que les photos soient accessibles publiquement)
-- 5. File size limit: 5 MB
-- 6. Allowed MIME types: image/jpeg, image/png, image/gif, image/webp

-- ============================================
-- POLITIQUES DE STORAGE (après création du bucket)
-- ============================================

-- Activer RLS sur le bucket
-- Note: Ces commandes doivent être exécutées via l'API Supabase ou l'interface
-- car les politiques de storage ne peuvent pas être créées via SQL standard

-- Politique pour permettre l'upload (authenticated ou anon selon votre besoin)
-- Via Supabase Dashboard > Storage > webinaires > Policies:
-- 
-- Policy name: "Allow public uploads to webinaires/presentateurs"
-- Operation: INSERT
-- Target roles: anon, authenticated
-- Policy definition:
--   (bucket_id = 'webinaires'::text) AND ((storage.foldername(name))[1] = 'presentateurs'::text)

-- Politique pour permettre la lecture publique
-- Policy name: "Allow public read access"
-- Operation: SELECT
-- Target roles: anon, authenticated
-- Policy definition:
--   bucket_id = 'webinaires'::text

-- Politique pour permettre la suppression (admin seulement)
-- Policy name: "Allow authenticated delete"
-- Operation: DELETE
-- Target roles: authenticated
-- Policy definition:
--   bucket_id = 'webinaires'::text

-- ============================================
-- VÉRIFICATION
-- ============================================

-- Vérifier que le bucket existe (via l'interface Supabase Dashboard > Storage)
-- Le bucket "webinaires" doit apparaître dans la liste

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
-- 1. Le bucket doit être créé manuellement via l'interface Supabase
-- 2. Les politiques de storage doivent être configurées via l'interface ou l'API
-- 3. Le code frontend utilise supabaseWebinaire.storage.from('webinaires')
-- 4. Les fichiers seront stockés dans: webinaires/presentateurs/[filename]
-- 5. Les URLs publiques seront générées automatiquement par Supabase


