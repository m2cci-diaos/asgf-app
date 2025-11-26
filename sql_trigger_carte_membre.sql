-- ============================================
-- TRIGGER POUR CRÉER AUTOMATIQUEMENT LA CARTE MEMBRE
-- Après l'insertion d'un membre dans adhesion.members,
-- crée automatiquement une entrée dans tresorerie.cartes_membres
-- ============================================

-- Supprimer TOUS les anciens triggers qui pourraient créer des doublons
DROP TRIGGER IF EXISTS trigger_create_carte_membre_after_insert ON adhesion.members;
DROP TRIGGER IF EXISTS create_carte_membre_after_insert ON adhesion.members;
DROP TRIGGER IF EXISTS trigger_create_carte ON adhesion.members;

-- Vérifier et créer une contrainte unique sur numero_membre si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cartes_membres_numero_membre_key' 
    AND conrelid = 'tresorerie.cartes_membres'::regclass
  ) THEN
    ALTER TABLE tresorerie.cartes_membres 
    ADD CONSTRAINT cartes_membres_numero_membre_key UNIQUE (numero_membre);
  END IF;
END $$;

-- Fonction trigger pour créer la carte membre
CREATE OR REPLACE FUNCTION tresorerie.create_carte_membre()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = tresorerie, adhesion, public
AS $$
BEGIN
  -- Vérifier que le numero_membre existe (doit être généré par le trigger BEFORE INSERT)
  IF NEW.numero_membre IS NULL OR NEW.numero_membre = '' THEN
    -- Si pas de numéro, ne pas créer de carte (ne pas lever d'exception pour ne pas bloquer l'insertion du membre)
    RETURN NEW;
  END IF;

  -- Vérifier d'abord si la carte existe déjà (double protection)
  IF NOT EXISTS (
    SELECT 1 FROM tresorerie.cartes_membres 
    WHERE numero_membre = NEW.numero_membre
  ) THEN
    -- Créer la carte membre avec les informations du membre
    INSERT INTO tresorerie.cartes_membres (
      numero_membre,
      date_emission,
      date_validite,
      pays,
      statut_carte,
      statut_paiement,
      lien_pdf
    )
    VALUES (
      NEW.numero_membre,  -- Utilise le numero_membre généré par le trigger BEFORE INSERT
      CURRENT_DATE,       -- Date d'émission = aujourd'hui
      CURRENT_DATE + INTERVAL '1 year',  -- Date de validité = 1 an après émission
      NEW.pays,           -- Pays du membre (peut être NULL)
      'en_attente',       -- Statut par défaut : en attente de validation
      'en_attente',       -- Statut paiement par défaut : en attente
      NULL                -- Pas de PDF au départ
    );
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- En cas d'erreur, logger mais ne pas bloquer l'insertion du membre
    RAISE WARNING 'Erreur lors de la création de la carte membre pour %: %', NEW.numero_membre, SQLERRM;
    RETURN NEW;
END;
$$;

-- Créer UN SEUL trigger AFTER INSERT
CREATE TRIGGER trigger_create_carte_membre_after_insert
  AFTER INSERT ON adhesion.members
  FOR EACH ROW
  EXECUTE FUNCTION tresorerie.create_carte_membre();

-- Vérifier qu'il n'y a qu'un seul trigger actif
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE event_object_schema = 'adhesion'
  AND event_object_table = 'members'
  AND event_manipulation = 'INSERT'
ORDER BY trigger_name;

-- ============================================
-- VÉRIFICATIONS
-- ============================================

-- Vérifier que le trigger existe et qu'il n'y en a qu'un seul
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'adhesion'
  AND event_object_table = 'members'
  AND trigger_name LIKE '%carte%';

-- Vérifier les cartes créées récemment
SELECT 
  cm.numero_membre,
  cm.date_emission,
  cm.date_validite,
  cm.pays,
  cm.statut_carte,
  cm.statut_paiement,
  m.nom,
  m.prenom,
  m.email
FROM tresorerie.cartes_membres cm
LEFT JOIN adhesion.members m ON m.numero_membre = cm.numero_membre
ORDER BY cm.created_at DESC
LIMIT 10;

