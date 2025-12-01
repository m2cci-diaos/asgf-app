-- Script pour corriger le trigger update_cotisation_statut
-- Le trigger ne doit PAS réinitialiser le statut si on le met explicitement à 'paye'

-- 1. Supprimer le trigger existant s'il existe
DROP TRIGGER IF EXISTS trg_update_cotisation_statut ON tresorerie.cotisations;

-- 2. Créer ou remplacer la fonction pour qu'elle respecte les mises à jour explicites
CREATE OR REPLACE FUNCTION tresorerie.update_cotisation_statut()
RETURNS TRIGGER AS $$
BEGIN
  -- Si le statut est explicitement défini dans NEW, le conserver
  -- Sinon, mettre à jour automatiquement selon la logique métier
  
  -- Si date_paiement est définie et statut_paiement n'est pas explicitement 'paye' ou 'valide'
  -- ET que le statut n'a pas été explicitement modifié (OLD.statut_paiement = NEW.statut_paiement)
  -- Alors on peut mettre à jour automatiquement
  IF NEW.date_paiement IS NOT NULL 
     AND (NEW.statut_paiement IS NULL OR NEW.statut_paiement = 'en_attente')
     AND OLD.date_paiement IS NULL THEN
    -- Si une date de paiement est ajoutée et qu'on n'a pas explicitement défini le statut
    NEW.statut_paiement := 'paye';
  ELSIF NEW.date_paiement IS NULL 
        AND NEW.statut_paiement = 'paye' 
        AND OLD.date_paiement IS NOT NULL THEN
    -- Si on retire la date de paiement mais qu'on garde 'paye', on peut le laisser
    -- (cas où on veut juste changer la date)
    NULL; -- Ne rien faire, garder 'paye'
  ELSIF NEW.statut_paiement IS NOT NULL AND NEW.statut_paiement != OLD.statut_paiement THEN
    -- Si le statut a été explicitement modifié, le conserver tel quel
    NULL; -- Ne rien faire, garder le statut explicite
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recréer le trigger
CREATE TRIGGER trg_update_cotisation_statut
  BEFORE UPDATE ON tresorerie.cotisations
  FOR EACH ROW
  EXECUTE FUNCTION tresorerie.update_cotisation_statut();

-- 4. Commentaire pour documentation
COMMENT ON FUNCTION tresorerie.update_cotisation_statut() IS 
'Met à jour automatiquement le statut_paiement selon la date_paiement, mais respecte les mises à jour explicites du statut (notamment lors de la validation manuelle)';






