-- ============================================
-- CRÉATION DES GROUPES DE TRAVAIL
-- ============================================
-- Date: 2025-01-XX
-- Description: Système de groupes de travail pour les projets
-- Les groupes de travail peuvent avoir des réunions et des actions

-- 1. Créer la table groupes_travail dans le schéma secretariat
-- Note: projet_id est un varchar (comme 'mobilite-intelligente', 'dashboard-energie')
-- qui correspond à public.projets.projet_id, pas à public.projets.id
-- IMPORTANT: Si la table existe déjà avec projet_id en UUID, exécutez d'abord fix_groupes_travail_projet_id_type.sql

DO $$
BEGIN
  -- Vérifier si la table existe déjà
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'groupes_travail'
  ) THEN
    -- Créer la table avec le bon type
    CREATE TABLE secretariat.groupes_travail (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      projet_id varchar(50) NOT NULL, -- Référence vers public.projets.projet_id (varchar)
      nom text NOT NULL,
      description text NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT groupes_travail_nom_projet_unique UNIQUE(projet_id, nom),
      CONSTRAINT groupes_travail_projet_id_fkey FOREIGN KEY (projet_id) REFERENCES public.projets(projet_id) ON DELETE CASCADE
    );
    
    RAISE NOTICE 'Table secretariat.groupes_travail créée';
  ELSE
    -- Vérifier si projet_id est du bon type
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'secretariat' 
      AND table_name = 'groupes_travail' 
      AND column_name = 'projet_id'
      AND data_type = 'uuid'
    ) THEN
      RAISE EXCEPTION 'La table groupes_travail existe avec projet_id en UUID. Exécutez d''abord fix_groupes_travail_projet_id_type.sql pour corriger le type.';
    END IF;
    
    RAISE NOTICE 'Table secretariat.groupes_travail existe déjà';
  END IF;
END $$;

-- 1.1. Créer la table pivot pour les membres des groupes de travail
-- Les membres sont automatiquement ajoutés depuis projets_inscriptions (statut = 'approved')
CREATE TABLE IF NOT EXISTS secretariat.groupe_travail_membres (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  groupe_travail_id uuid NOT NULL REFERENCES secretariat.groupes_travail(id) ON DELETE CASCADE,
  inscription_id uuid NOT NULL REFERENCES public.projets_inscriptions(id) ON DELETE CASCADE,
  membre_id uuid NULL REFERENCES adhesion.members(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(groupe_travail_id, inscription_id)
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_groupe_travail_membres_groupe_id 
ON secretariat.groupe_travail_membres(groupe_travail_id);

CREATE INDEX IF NOT EXISTS idx_groupe_travail_membres_inscription_id 
ON secretariat.groupe_travail_membres(inscription_id);

CREATE INDEX IF NOT EXISTS idx_groupe_travail_membres_membre_id 
ON secretariat.groupe_travail_membres(membre_id);

-- 2. Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_groupes_travail_projet_id 
ON secretariat.groupes_travail(projet_id);

CREATE INDEX IF NOT EXISTS idx_groupes_travail_nom 
ON secretariat.groupes_travail(nom);

-- 3. Ajouter groupe_travail_id à la table reunions (nullable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'reunions' 
    AND column_name = 'groupe_travail_id'
  ) THEN
    ALTER TABLE secretariat.reunions 
    ADD COLUMN groupe_travail_id uuid NULL;
    
    ALTER TABLE secretariat.reunions
    ADD CONSTRAINT reunions_groupe_travail_id_fkey 
    FOREIGN KEY (groupe_travail_id) REFERENCES secretariat.groupes_travail(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_reunions_groupe_travail_id 
    ON secretariat.reunions(groupe_travail_id);
    
    RAISE NOTICE 'Colonne groupe_travail_id ajoutée à secretariat.reunions';
  END IF;
END $$;

-- 4. Ajouter groupe_travail_id à la table actions (nullable)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'actions' 
    AND column_name = 'groupe_travail_id'
  ) THEN
    ALTER TABLE secretariat.actions 
    ADD COLUMN groupe_travail_id uuid NULL;
    
    ALTER TABLE secretariat.actions
    ADD CONSTRAINT actions_groupe_travail_id_fkey 
    FOREIGN KEY (groupe_travail_id) REFERENCES secretariat.groupes_travail(id) ON DELETE SET NULL;
    
    CREATE INDEX IF NOT EXISTS idx_actions_groupe_travail_id 
    ON secretariat.actions(groupe_travail_id);
    
    RAISE NOTICE 'Colonne groupe_travail_id ajoutée à secretariat.actions';
  END IF;
END $$;

-- 5. Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION secretariat.update_groupes_travail_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_groupes_travail_updated_at ON secretariat.groupes_travail;
CREATE TRIGGER trigger_update_groupes_travail_updated_at
  BEFORE UPDATE ON secretariat.groupes_travail
  FOR EACH ROW
  EXECUTE FUNCTION secretariat.update_groupes_travail_updated_at();

-- 6. Commentaires pour documentation
COMMENT ON TABLE secretariat.groupes_travail IS 'Groupes de travail appartenant à un projet. Les groupes peuvent avoir des réunions et des actions.';
COMMENT ON COLUMN secretariat.groupes_travail.projet_id IS 'Référence vers le projet parent';
COMMENT ON COLUMN secretariat.groupes_travail.nom IS 'Nom du groupe de travail';
COMMENT ON COLUMN secretariat.groupes_travail.description IS 'Description du groupe de travail (optionnel)';
COMMENT ON COLUMN secretariat.reunions.groupe_travail_id IS 'Référence vers le groupe de travail (nullable pour réunions indépendantes)';
COMMENT ON COLUMN secretariat.actions.groupe_travail_id IS 'Référence vers le groupe de travail (nullable pour actions indépendantes)';
COMMENT ON TABLE secretariat.groupe_travail_membres IS 'Table pivot pour les membres des groupes de travail. Les membres proviennent de projets_inscriptions avec statut = approved.';
COMMENT ON COLUMN secretariat.groupe_travail_membres.inscription_id IS 'Référence vers projets_inscriptions (membre approuvé pour le projet)';
COMMENT ON COLUMN secretariat.groupe_travail_membres.membre_id IS 'Référence vers adhesion.members (si le membre existe dans la table members)';

-- 7. Fonction pour ajouter automatiquement les membres approuvés d'un projet à un groupe
CREATE OR REPLACE FUNCTION secretariat.ajouter_membres_approuves_au_groupe()
RETURNS TRIGGER AS $$
BEGIN
  -- Quand un groupe de travail est créé, ajouter automatiquement tous les membres approuvés du projet
  IF TG_OP = 'INSERT' THEN
    INSERT INTO secretariat.groupe_travail_membres (groupe_travail_id, inscription_id, membre_id)
    SELECT 
      NEW.id,
      pi.id,
      pi.membre_id
    FROM public.projets_inscriptions pi
    WHERE pi.projet_id = NEW.projet_id -- NEW.projet_id est déjà un varchar
      AND pi.statut = 'approved'
    ON CONFLICT (groupe_travail_id, inscription_id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour ajouter automatiquement les membres lors de la création d'un groupe
DROP TRIGGER IF EXISTS trigger_ajouter_membres_au_groupe ON secretariat.groupes_travail;
CREATE TRIGGER trigger_ajouter_membres_au_groupe
  AFTER INSERT ON secretariat.groupes_travail
  FOR EACH ROW
  EXECUTE FUNCTION secretariat.ajouter_membres_approuves_au_groupe();

-- 8. Fonction pour ajouter un membre approuvé à un groupe existant
CREATE OR REPLACE FUNCTION secretariat.ajouter_membre_au_groupe(
  p_groupe_travail_id uuid,
  p_inscription_id uuid
)
RETURNS void AS $$
DECLARE
  v_projet_id varchar(50);
BEGIN
  -- Vérifier que l'inscription appartient au même projet que le groupe
  SELECT gt.projet_id INTO v_projet_id
  FROM secretariat.groupes_travail gt
  WHERE gt.id = p_groupe_travail_id;
  
  -- Vérifier que l'inscription est approuvée et appartient au même projet
  IF EXISTS (
    SELECT 1 FROM public.projets_inscriptions pi
    INNER JOIN public.projets p ON p.projet_id = pi.projet_id
    WHERE pi.id = p_inscription_id
      AND pi.statut = 'approved'
      AND p.id = v_projet_id
  ) THEN
    INSERT INTO secretariat.groupe_travail_membres (groupe_travail_id, inscription_id, membre_id)
    SELECT 
      p_groupe_travail_id,
      pi.id,
      pi.membre_id
    FROM public.projets_inscriptions pi
    WHERE pi.id = p_inscription_id
    ON CONFLICT (groupe_travail_id, inscription_id) DO NOTHING;
  ELSE
    RAISE EXCEPTION 'L''inscription doit être approuvée et appartenir au même projet que le groupe';
  END IF;
END;
$$ LANGUAGE plpgsql;

