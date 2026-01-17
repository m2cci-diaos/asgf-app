-- Migration pour créer le bucket Supabase Storage pour les recommandations
-- Date: 2025-11-29
-- 
-- NOTE: Cette migration doit être exécutée dans l'interface Supabase Dashboard
-- ou via l'API Supabase Storage, car SQL ne peut pas créer directement des buckets.
--
-- Pour créer le bucket via l'API Supabase :
-- 1. Aller dans Supabase Dashboard > Storage
-- 2. Créer un nouveau bucket nommé "recommandations"
-- 3. Configurer les permissions :
--    - Public: false (recommandé pour la sécurité)
--    - File size limit: selon vos besoins (ex: 10MB)
--    - Allowed MIME types: application/pdf
--
-- OU utiliser l'API Supabase Storage pour créer le bucket programmatiquement
--
-- Exemple de création via API (à exécuter dans un script Node.js ou via curl) :
-- 
-- const { createClient } = require('@supabase/supabase-js')
-- const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
-- 
-- const { data, error } = await supabase.storage.createBucket('recommandations', {
--   public: false,
--   fileSizeLimit: 10485760, // 10MB
--   allowedMimeTypes: ['application/pdf']
-- })

-- Si vous préférez un bucket public (moins sécurisé mais plus simple) :
-- const { data, error } = await supabase.storage.createBucket('recommandations', {
--   public: true,
--   fileSizeLimit: 10485760,
--   allowedMimeTypes: ['application/pdf']
-- })

COMMENT ON SCHEMA recrutement IS 
  'Module Recrutement - Les PDFs de recommandations seront stockés dans le bucket Supabase Storage "recommandations"';






