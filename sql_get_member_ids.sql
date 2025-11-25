-- ============================================
-- SCRIPT POUR RÉCUPÉRER LES UUIDs DES MEMBRES
-- ============================================
-- Exécutez ce script pour obtenir les UUIDs des membres
-- que vous pourrez utiliser dans les scripts de test
-- ============================================

-- Récupérer les 20 premiers membres approuvés avec leurs UUIDs
SELECT 
  id as membre_id,
  prenom,
  nom,
  email,
  numero_membre,
  status
FROM adhesion.members 
WHERE status = 'approved'
ORDER BY created_at DESC
LIMIT 20;

-- Alternative: Récupérer tous les membres (si vous en avez moins de 50)
-- SELECT 
--   id as membre_id,
--   prenom,
--   nom,
--   email,
--   numero_membre,
--   status
-- FROM adhesion.members 
-- ORDER BY created_at DESC;

-- Pour copier facilement les UUIDs, vous pouvez utiliser cette requête:
-- SELECT id FROM adhesion.members WHERE status = 'approved' LIMIT 20;



