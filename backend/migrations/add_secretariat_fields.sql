-- Migration pour ajouter les champs manquants au module Secrétariat
-- À exécuter dans votre base de données PostgreSQL

-- Ajouter le champ presente_par dans la table reunions
ALTER TABLE secretariat.reunions 
ADD COLUMN IF NOT EXISTS presente_par uuid NULL;

-- Ajouter une contrainte de clé étrangère si le champ existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'reunions_presente_par_fkey'
  ) THEN
    ALTER TABLE secretariat.reunions
    ADD CONSTRAINT reunions_presente_par_fkey 
    FOREIGN KEY (presente_par) REFERENCES adhesion.members(id);
  END IF;
END $$;

-- Ajouter les champs pour les non-membres dans participants_reunion
ALTER TABLE secretariat.participants_reunion 
ADD COLUMN IF NOT EXISTS nom_externe text NULL,
ADD COLUMN IF NOT EXISTS prenom_externe text NULL,
ADD COLUMN IF NOT EXISTS email_externe text NULL;

-- Ajouter les champs de présence dans participants_reunion
ALTER TABLE secretariat.participants_reunion 
ADD COLUMN IF NOT EXISTS presence text NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS motif_absence text NULL;

-- Ajouter une contrainte pour vérifier que presence est soit 'present' soit 'absent'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'participants_reunion_presence_check'
  ) THEN
    ALTER TABLE secretariat.participants_reunion
    ADD CONSTRAINT participants_reunion_presence_check 
    CHECK (presence IS NULL OR presence IN ('present', 'absent'));
  END IF;
END $$;

-- Commentaires pour documentation
COMMENT ON COLUMN secretariat.reunions.presente_par IS 'ID du membre qui a présenté la réunion';
COMMENT ON COLUMN secretariat.participants_reunion.nom_externe IS 'Nom du participant externe (non membre)';
COMMENT ON COLUMN secretariat.participants_reunion.prenom_externe IS 'Prénom du participant externe (non membre)';
COMMENT ON COLUMN secretariat.participants_reunion.email_externe IS 'Email du participant externe (non membre)';
COMMENT ON COLUMN secretariat.participants_reunion.presence IS 'Statut de présence: present, absent ou NULL';
COMMENT ON COLUMN secretariat.participants_reunion.motif_absence IS 'Motif de l''absence si le participant est absent';








