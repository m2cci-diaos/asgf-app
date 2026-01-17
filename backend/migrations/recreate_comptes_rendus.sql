-- ============================================
-- RECRÉATION DE LA TABLE COMPTES_RENDUS
-- ============================================

-- Créer la table comptes_rendus dans le schéma secretariat
CREATE TABLE IF NOT EXISTS secretariat.comptes_rendus (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reunion_id uuid NOT NULL REFERENCES secretariat.reunions(id) ON DELETE CASCADE,
  resume text NULL,
  decisions text NULL,
  actions_assignées text NULL,
  participants_list text NULL,
  lien_pdf text NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Créer un index unique sur reunion_id pour garantir qu'il n'y a qu'un seul compte rendu par réunion
CREATE UNIQUE INDEX IF NOT EXISTS idx_comptes_rendus_reunion_id 
ON secretariat.comptes_rendus(reunion_id);

-- Créer un index pour améliorer les performances de recherche
CREATE INDEX IF NOT EXISTS idx_comptes_rendus_created_at 
ON secretariat.comptes_rendus(created_at);

-- Créer un trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION secretariat.update_comptes_rendus_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Supprimer le trigger s'il existe déjà
DROP TRIGGER IF EXISTS trg_comptes_rendus_update ON secretariat.comptes_rendus;

-- Créer le trigger
CREATE TRIGGER trg_comptes_rendus_update
BEFORE UPDATE ON secretariat.comptes_rendus
FOR EACH ROW
EXECUTE FUNCTION secretariat.update_comptes_rendus_timestamp();

-- Commentaires pour documentation
COMMENT ON TABLE secretariat.comptes_rendus IS 'Comptes rendus des réunions du secrétariat';
COMMENT ON COLUMN secretariat.comptes_rendus.reunion_id IS 'Référence vers la réunion concernée';
COMMENT ON COLUMN secretariat.comptes_rendus.resume IS 'Résumé de la réunion';
COMMENT ON COLUMN secretariat.comptes_rendus.decisions IS 'Décisions prises lors de la réunion';
COMMENT ON COLUMN secretariat.comptes_rendus.actions_assignées IS 'Actions assignées lors de la réunion';
COMMENT ON COLUMN secretariat.comptes_rendus.participants_list IS 'Liste des participants';
COMMENT ON COLUMN secretariat.comptes_rendus.lien_pdf IS 'Lien vers le PDF du compte rendu';







