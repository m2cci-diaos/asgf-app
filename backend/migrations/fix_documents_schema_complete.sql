-- ============================================
-- CORRECTION COMPLÈTE : Schéma table documents
-- ============================================
-- Date: 2025-01-16
-- Description: Vérifier et créer toutes les colonnes nécessaires pour documents

-- 1. Vérifier et ajouter reunion_id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'documents' 
    AND column_name = 'reunion_id'
  ) THEN
    ALTER TABLE secretariat.documents 
    ADD COLUMN reunion_id uuid NULL;
    
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'secretariat' 
      AND table_name = 'reunions'
    ) THEN
      ALTER TABLE secretariat.documents
      ADD CONSTRAINT documents_reunion_id_fkey 
      FOREIGN KEY (reunion_id) REFERENCES secretariat.reunions(id) ON DELETE SET NULL;
    END IF;
  ELSE
    ALTER TABLE secretariat.documents 
    ALTER COLUMN reunion_id DROP NOT NULL;
  END IF;
END $$;

-- 2. Vérifier et ajouter lien_pdf (si lien_document existe, on peut le renommer ou créer lien_pdf)
DO $$
BEGIN
  -- Si lien_pdf n'existe pas mais lien_document existe, créer lien_pdf et copier les données
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'documents' 
    AND column_name = 'lien_pdf'
  ) THEN
    -- Vérifier si lien_document existe
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'secretariat' 
      AND table_name = 'documents' 
      AND column_name = 'lien_document'
    ) THEN
      -- Créer lien_pdf et copier les données de lien_document
      ALTER TABLE secretariat.documents 
      ADD COLUMN lien_pdf text NULL;
      
      UPDATE secretariat.documents 
      SET lien_pdf = lien_document 
      WHERE lien_pdf IS NULL AND lien_document IS NOT NULL;
    ELSE
      -- Créer lien_pdf vide
      ALTER TABLE secretariat.documents 
      ADD COLUMN lien_pdf text NULL;
    END IF;
  END IF;
END $$;

-- 3. Vérifier et ajouter uploaded_by
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'documents' 
    AND column_name = 'uploaded_by'
  ) THEN
    ALTER TABLE secretariat.documents 
    ADD COLUMN uploaded_by uuid NULL;
    
    -- Ajouter contrainte FK si members existe
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'adhesion' 
      AND table_name = 'members'
    ) THEN
      ALTER TABLE secretariat.documents
      ADD CONSTRAINT documents_uploaded_by_fkey 
      FOREIGN KEY (uploaded_by) REFERENCES adhesion.members(id) ON DELETE SET NULL;
    END IF;
  END IF;
END $$;

-- 4. Vérifier et ajouter type_document
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'documents' 
    AND column_name = 'type_document'
  ) THEN
    ALTER TABLE secretariat.documents 
    ADD COLUMN type_document text NULL;
  END IF;
END $$;

-- 5. S'assurer que les colonnes de base existent
DO $$
BEGIN
  -- titre
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'documents' 
    AND column_name = 'titre'
  ) THEN
    ALTER TABLE secretariat.documents 
    ADD COLUMN titre text NOT NULL DEFAULT '';
  END IF;
  
  -- description
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'documents' 
    AND column_name = 'description'
  ) THEN
    ALTER TABLE secretariat.documents 
    ADD COLUMN description text NULL;
  END IF;
  
  -- categorie
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'secretariat' 
    AND table_name = 'documents' 
    AND column_name = 'categorie'
  ) THEN
    ALTER TABLE secretariat.documents 
    ADD COLUMN categorie text NULL;
  END IF;
END $$;

-- 6. Créer les index
CREATE INDEX IF NOT EXISTS idx_documents_reunion_id 
ON secretariat.documents(reunion_id);

CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by 
ON secretariat.documents(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_documents_categorie 
ON secretariat.documents(categorie);

-- 7. Commentaires
COMMENT ON COLUMN secretariat.documents.reunion_id IS 'Référence vers la réunion (nullable pour documents indépendants)';
COMMENT ON COLUMN secretariat.documents.lien_pdf IS 'Lien vers le PDF du document';
COMMENT ON COLUMN secretariat.documents.uploaded_by IS 'ID du membre qui a uploadé le document';
COMMENT ON COLUMN secretariat.documents.type_document IS 'Type de document (optionnel)';


