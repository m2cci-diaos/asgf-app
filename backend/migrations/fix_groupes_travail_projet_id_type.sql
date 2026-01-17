-- ============================================
-- CORRECTION : Type de projet_id dans groupes_travail
-- ============================================
-- Date: 2025-01-XX
-- Description: Corriger le type de projet_id de UUID à varchar(50)
-- pour correspondre à public.projets.projet_id

-- 1. Vérifier et corriger le type de projet_id dans groupes_travail
DO $$
BEGIN
  -- Vérifier si la table existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'groupes_travail'
  ) THEN
    -- Vérifier le type actuel de projet_id
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'secretariat' 
      AND table_name = 'groupes_travail' 
      AND column_name = 'projet_id'
      AND data_type = 'uuid'
    ) THEN
      -- Supprimer la contrainte de clé étrangère si elle existe
      ALTER TABLE secretariat.groupes_travail 
      DROP CONSTRAINT IF EXISTS groupes_travail_projet_id_fkey;
      
      -- Supprimer la contrainte unique si elle existe
      ALTER TABLE secretariat.groupes_travail 
      DROP CONSTRAINT IF EXISTS groupes_travail_nom_projet_unique;
      
      -- Supprimer la colonne projet_id
      ALTER TABLE secretariat.groupes_travail 
      DROP COLUMN IF EXISTS projet_id;
      
      -- Recréer la colonne avec le bon type
      ALTER TABLE secretariat.groupes_travail 
      ADD COLUMN projet_id varchar(50) NOT NULL;
      
      -- Recréer la contrainte de clé étrangère
      ALTER TABLE secretariat.groupes_travail
      ADD CONSTRAINT groupes_travail_projet_id_fkey 
      FOREIGN KEY (projet_id) REFERENCES public.projets(projet_id) ON DELETE CASCADE;
      
      -- Recréer la contrainte unique
      ALTER TABLE secretariat.groupes_travail
      ADD CONSTRAINT groupes_travail_nom_projet_unique UNIQUE(projet_id, nom);
      
      RAISE NOTICE 'Colonne projet_id corrigée de UUID à varchar(50) dans secretariat.groupes_travail';
    ELSIF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'secretariat' 
      AND table_name = 'groupes_travail' 
      AND column_name = 'projet_id'
      AND data_type = 'character varying'
    ) THEN
      RAISE NOTICE 'Colonne projet_id est déjà de type varchar, aucune modification nécessaire';
    ELSE
      -- La colonne n'existe pas, l'ajouter
      ALTER TABLE secretariat.groupes_travail 
      ADD COLUMN projet_id varchar(50) NOT NULL;
      
      ALTER TABLE secretariat.groupes_travail
      ADD CONSTRAINT groupes_travail_projet_id_fkey 
      FOREIGN KEY (projet_id) REFERENCES public.projets(projet_id) ON DELETE CASCADE;
      
      ALTER TABLE secretariat.groupes_travail
      ADD CONSTRAINT groupes_travail_nom_projet_unique UNIQUE(projet_id, nom);
      
      RAISE NOTICE 'Colonne projet_id ajoutée en varchar(50) dans secretariat.groupes_travail';
    END IF;
  ELSE
    -- La table n'existe pas, la créer avec le bon type
    CREATE TABLE secretariat.groupes_travail (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      projet_id varchar(50) NOT NULL,
      nom text NOT NULL,
      description text NULL,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now(),
      CONSTRAINT groupes_travail_nom_projet_unique UNIQUE(projet_id, nom),
      CONSTRAINT groupes_travail_projet_id_fkey FOREIGN KEY (projet_id) REFERENCES public.projets(projet_id) ON DELETE CASCADE
    );
    
    RAISE NOTICE 'Table secretariat.groupes_travail créée avec projet_id en varchar(50)';
  END IF;
END $$;

-- 2. Créer les index si nécessaire
CREATE INDEX IF NOT EXISTS idx_groupes_travail_projet_id 
ON secretariat.groupes_travail(projet_id);

CREATE INDEX IF NOT EXISTS idx_groupes_travail_nom 
ON secretariat.groupes_travail(nom);



