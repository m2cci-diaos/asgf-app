-- ============================================
-- CORRECTION : Ajouter reunion_id à documents
-- ============================================
-- Date: 2025-01-16
-- Description: Ajouter la colonne reunion_id à la table documents si elle n'existe pas

-- 1. Vérifier et ajouter la colonne reunion_id si elle n'existe pas
DO $$
BEGIN
  -- Vérifier si la colonne existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'documents' 
    AND column_name = 'reunion_id'
  ) THEN
    -- Ajouter la colonne reunion_id (nullable)
    ALTER TABLE secretariat.documents 
    ADD COLUMN reunion_id uuid NULL;
    
    -- Ajouter une contrainte de clé étrangère si la table reunions existe
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'secretariat' 
      AND table_name = 'reunions'
    ) THEN
      ALTER TABLE secretariat.documents
      ADD CONSTRAINT documents_reunion_id_fkey 
      FOREIGN KEY (reunion_id) REFERENCES secretariat.reunions(id) ON DELETE SET NULL;
    END IF;
    
    RAISE NOTICE 'Colonne reunion_id ajoutée à secretariat.documents';
  ELSE
    -- Si la colonne existe, s'assurer qu'elle est nullable
    ALTER TABLE secretariat.documents 
    ALTER COLUMN reunion_id DROP NOT NULL;
    
    RAISE NOTICE 'Colonne reunion_id existe déjà, rendue nullable';
  END IF;
END $$;

-- 2. Créer un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_documents_reunion_id 
ON secretariat.documents(reunion_id);

-- 3. Commentaire pour documentation
COMMENT ON COLUMN secretariat.documents.reunion_id IS 'Référence vers la réunion (nullable pour documents indépendants)';


