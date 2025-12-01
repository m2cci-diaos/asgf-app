-- ============================================
-- MIGRATIONS COMPLÈTES MODULE SECRÉTARIAT
-- ============================================

-- 1. Ajouter les champs manquants dans reunions
ALTER TABLE secretariat.reunions 
ADD COLUMN IF NOT EXISTS presente_par uuid NULL;

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

-- 2. Ajouter les champs pour les non-membres dans participants_reunion
ALTER TABLE secretariat.participants_reunion 
ADD COLUMN IF NOT EXISTS nom_externe text NULL,
ADD COLUMN IF NOT EXISTS prenom_externe text NULL,
ADD COLUMN IF NOT EXISTS email_externe text NULL;

-- 3. Ajouter les champs de présence dans participants_reunion
ALTER TABLE secretariat.participants_reunion 
ADD COLUMN IF NOT EXISTS presence text NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS motif_absence text NULL;

-- 4. Contrainte pour vérifier que presence est soit 'present' soit 'absent'
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

-- 5. Contrainte UNIQUE pour éviter les doublons participants
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'participants_reunion_unique'
  ) THEN
    ALTER TABLE secretariat.participants_reunion
    ADD CONSTRAINT participants_reunion_unique 
    UNIQUE (reunion_id, membre_id);
  END IF;
END $$;

-- 6. Créer la table rapports_presidence
CREATE TABLE IF NOT EXISTS secretariat.rapports_presidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  periode_type text NOT NULL CHECK (periode_type IN ('mensuel', 'annuel')),
  periode_debut date NOT NULL,
  periode_fin date NOT NULL,
  resume text,
  lien_pdf text NOT NULL,
  genere_par uuid REFERENCES adhesion.members(id),
  created_at timestamptz DEFAULT now()
);

-- 7. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_rapports_presidence_periode 
ON secretariat.rapports_presidence(periode_debut, periode_fin);

CREATE INDEX IF NOT EXISTS idx_rapports_presidence_genere_par 
ON secretariat.rapports_presidence(genere_par);

-- 8. Ajouter un champ statut dans reunions pour gérer l'état automatique
ALTER TABLE secretariat.reunions 
ADD COLUMN IF NOT EXISTS statut text NULL DEFAULT 'programmee';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'reunions_statut_check'
  ) THEN
    ALTER TABLE secretariat.reunions
    ADD CONSTRAINT reunions_statut_check 
    CHECK (statut IS NULL OR statut IN ('programmee', 'en_cours', 'terminee', 'annulee'));
  END IF;
END $$;

-- 9. Commentaires pour documentation
COMMENT ON COLUMN secretariat.reunions.presente_par IS 'ID du membre qui a présenté la réunion';
COMMENT ON COLUMN secretariat.reunions.statut IS 'Statut automatique: programmee, en_cours, terminee, annulee';
COMMENT ON COLUMN secretariat.participants_reunion.nom_externe IS 'Nom du participant externe (non membre)';
COMMENT ON COLUMN secretariat.participants_reunion.prenom_externe IS 'Prénom du participant externe (non membre)';
COMMENT ON COLUMN secretariat.participants_reunion.email_externe IS 'Email du participant externe (non membre)';
COMMENT ON COLUMN secretariat.participants_reunion.presence IS 'Statut de présence: present, absent ou NULL';
COMMENT ON COLUMN secretariat.participants_reunion.motif_absence IS 'Motif de l''absence si le participant est absent';
COMMENT ON TABLE secretariat.rapports_presidence IS 'Rapports générés pour la présidence (mensuels/annuels)';





