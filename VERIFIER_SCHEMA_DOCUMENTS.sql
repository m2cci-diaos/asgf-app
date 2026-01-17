-- ============================================
-- VÉRIFIER LE SCHÉMA DE LA TABLE documents
-- ============================================
-- Exécutez ce script pour voir toutes les colonnes de la table documents

SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'secretariat' 
AND table_name = 'documents'
ORDER BY ordinal_position;

-- Vérifier spécifiquement les colonnes nécessaires
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'secretariat' 
      AND table_name = 'documents' 
      AND column_name = 'reunion_id'
    ) THEN '✅ reunion_id existe'
    ELSE '❌ reunion_id MANQUANT'
  END as reunion_id_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'secretariat' 
      AND table_name = 'documents' 
      AND column_name = 'lien_pdf'
    ) THEN '✅ lien_pdf existe'
    ELSE '❌ lien_pdf MANQUANT'
  END as lien_pdf_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'secretariat' 
      AND table_name = 'documents' 
      AND column_name = 'uploaded_by'
    ) THEN '✅ uploaded_by existe'
    ELSE '❌ uploaded_by MANQUANT'
  END as uploaded_by_status,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'secretariat' 
      AND table_name = 'documents' 
      AND column_name = 'type_document'
    ) THEN '✅ type_document existe'
    ELSE '❌ type_document MANQUANT'
  END as type_document_status;



