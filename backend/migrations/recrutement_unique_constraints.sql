-- Migration pour ajouter les contraintes d'unicité au module Recrutement
-- Date: 2025-11-29

-- 1. Index unique partiel pour éviter les suivis exactement identiques
-- (même candidature, même date/heure, même type d'événement)
CREATE UNIQUE INDEX IF NOT EXISTS idx_suivi_unique
  ON recrutement.suivi_candidatures(candidature_id, date_event, type_event);

COMMENT ON INDEX recrutement.idx_suivi_unique IS 
  'Empêche la création de suivis exactement identiques pour une même candidature';

-- 2. Contrainte unique pour éviter les doublons de recommandation
-- (une seule recommandation par paire mentor/mentee)
ALTER TABLE recrutement.recommandations
  DROP CONSTRAINT IF EXISTS recommandations_unique_pair;

ALTER TABLE recrutement.recommandations
  ADD CONSTRAINT recommandations_unique_pair 
  UNIQUE (mentor_id, mentee_id);

COMMENT ON CONSTRAINT recommandations_unique_pair ON recrutement.recommandations IS 
  'Empêche la création de plusieurs recommandations pour la même paire mentor/mentoré';



