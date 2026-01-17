-- ============================================
-- MIGRATIONS ÉVOLUTIONS MODULE SECRÉTARIAT
-- ============================================
-- Date: 2025-01-XX
-- Description: Support actions/documents indépendants + multi-assignation actions

-- 1. Rendre meeting_id nullable pour actions (si pas déjà nullable)
DO $$
BEGIN
  -- Vérifier si la colonne existe et si elle est NOT NULL
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'actions' 
    AND column_name = 'reunion_id'
  ) THEN
    -- Rendre nullable si ce n'est pas déjà le cas
    ALTER TABLE secretariat.actions 
    ALTER COLUMN reunion_id DROP NOT NULL;
  END IF;
END $$;

-- 2. Rendre meeting_id nullable pour documents (si pas déjà nullable)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'documents' 
    AND column_name = 'reunion_id'
  ) THEN
    ALTER TABLE secretariat.documents 
    ALTER COLUMN reunion_id DROP NOT NULL;
  END IF;
END $$;

-- 3. Créer la table pivot pour la multi-assignation des actions
CREATE TABLE IF NOT EXISTS secretariat.action_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_id uuid NOT NULL REFERENCES secretariat.actions(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES adhesion.members(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(action_id, member_id)
);

-- 4. Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_action_assignees_action_id 
ON secretariat.action_assignees(action_id);

CREATE INDEX IF NOT EXISTS idx_action_assignees_member_id 
ON secretariat.action_assignees(member_id);

-- 5. Commentaires pour documentation
COMMENT ON TABLE secretariat.action_assignees IS 'Table pivot pour la multi-assignation des actions';
COMMENT ON COLUMN secretariat.action_assignees.action_id IS 'Référence vers l''action';
COMMENT ON COLUMN secretariat.action_assignees.member_id IS 'Référence vers le membre assigné';

-- 6. Migrer les données existantes de assigne_a vers action_assignees (si assigne_a existe)
DO $$
DECLARE
  action_record RECORD;
BEGIN
  -- Vérifier si la colonne assigne_a existe
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'actions' 
    AND column_name = 'assigne_a'
  ) THEN
    -- Migrer les assignations existantes
    FOR action_record IN 
      SELECT id, assigne_a FROM secretariat.actions 
      WHERE assigne_a IS NOT NULL
    LOOP
      -- Insérer dans action_assignees si pas déjà présent
      INSERT INTO secretariat.action_assignees (action_id, member_id)
      VALUES (action_record.id, action_record.assigne_a)
      ON CONFLICT (action_id, member_id) DO NOTHING;
    END LOOP;
  END IF;
END $$;



