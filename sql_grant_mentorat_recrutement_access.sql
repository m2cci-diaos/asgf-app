-- ============================================
-- SCRIPT POUR DONNER ACCÈS AUX MODULES
-- MENTORAT ET RECRUTEMENT À UN ADMIN
-- ============================================
--
-- IMPORTANT: Remplacez {ADMIN_ID} par l'UUID de votre admin
-- Vous pouvez récupérer l'UUID avec:
-- SELECT id, numero_membre, email FROM admin.admins;
--
-- ============================================

-- Option 1: Donner accès à un admin spécifique
-- Remplacez {ADMIN_ID} par l'UUID de votre admin
INSERT INTO admin.admins_modules (admin_id, module)
VALUES
  ('{ADMIN_ID}', 'mentorat'),
  ('{ADMIN_ID}', 'recrutement')
ON CONFLICT (admin_id, module) DO NOTHING;

-- Option 2: Donner accès à TOUS les admins (si vous êtes sûr)
-- INSERT INTO admin.admins_modules (admin_id, module)
-- SELECT id, 'mentorat' FROM admin.admins
-- ON CONFLICT (admin_id, module) DO NOTHING;
--
-- INSERT INTO admin.admins_modules (admin_id, module)
-- SELECT id, 'recrutement' FROM admin.admins
-- ON CONFLICT (admin_id, module) DO NOTHING;

-- Option 3: Vérifier les accès actuels
-- SELECT 
--   a.numero_membre,
--   a.email,
--   am.module
-- FROM admin.admins a
-- LEFT JOIN admin.admins_modules am ON a.id = am.admin_id
-- ORDER BY a.numero_membre, am.module;

-- Option 4: Si votre admin est un MASTER, il a déjà accès à tout
-- Vérifiez avec:
-- SELECT id, numero_membre, email, is_master, role_global 
-- FROM admin.admins 
-- WHERE is_master = true;



