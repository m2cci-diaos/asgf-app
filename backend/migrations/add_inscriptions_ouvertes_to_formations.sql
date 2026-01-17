-- Migration: Ajouter le champ inscriptions_ouvertes à la table formations
-- Date: 2026-01-17
-- Description: Permet de gérer manuellement l'ouverture/fermeture des inscriptions pour chaque formation

-- Ajouter la colonne inscriptions_ouvertes (boolean, default true)
ALTER TABLE formation.formations
ADD COLUMN IF NOT EXISTS inscriptions_ouvertes BOOLEAN NOT NULL DEFAULT true;

-- Créer un index pour améliorer les performances des requêtes de filtrage
CREATE INDEX IF NOT EXISTS idx_formations_inscriptions_ouvertes 
ON formation.formations(inscriptions_ouvertes) 
WHERE inscriptions_ouvertes = true;

-- Commentaire sur la colonne
COMMENT ON COLUMN formation.formations.inscriptions_ouvertes IS 
'Contrôle manuel de l''ouverture des inscriptions. Si false, les inscriptions sont fermées même si des places sont disponibles.';

