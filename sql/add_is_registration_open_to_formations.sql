-- ============================================
-- AJOUTER LE CHAMP is_registration_open
-- POUR LA CLÔTURE MANUELLE DES INSCRIPTIONS
-- ============================================

ALTER TABLE formation.formations
ADD COLUMN IF NOT EXISTS is_registration_open BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN formation.formations.is_registration_open IS
'Indique si les inscriptions sont ouvertes (true) ou clôturées (false) pour cette formation. Contrôle manuel par l''admin.';

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_formations_is_registration_open
ON formation.formations(is_registration_open)
WHERE is_registration_open = true;

