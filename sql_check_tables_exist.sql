-- ============================================
-- SCRIPT POUR VÉRIFIER L'EXISTENCE DES TABLES
-- MENTORAT & RECRUTEMENT
-- ============================================
-- Exécutez ce script pour vérifier que toutes les tables existent
-- ============================================

-- Vérifier les tables du schéma mentorat
SELECT 
  'mentorat' as schema_name,
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as status
FROM information_schema.tables
WHERE table_schema = 'mentorat'
  AND table_name IN ('mentors', 'mentees', 'relations', 'objectifs', 'rendezvous')
ORDER BY table_name;

-- Vérifier les tables du schéma recrutement
SELECT 
  'recrutement' as schema_name,
  table_name,
  CASE 
    WHEN table_name IS NOT NULL THEN '✅ Existe'
    ELSE '❌ Manquante'
  END as status
FROM information_schema.tables
WHERE table_schema = 'recrutement'
  AND table_name IN ('candidatures', 'recommandations', 'suivi_candidatures')
ORDER BY table_name;

-- Vérifier les colonnes de la table relations
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'mentorat'
  AND table_name = 'relations'
ORDER BY ordinal_position;

-- Vérifier les colonnes de la table candidatures
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'recrutement'
  AND table_name = 'candidatures'
ORDER BY ordinal_position;

-- Compter les enregistrements dans chaque table
SELECT 'mentorat.mentors' as table_name, COUNT(*) as count FROM mentorat.mentors
UNION ALL
SELECT 'mentorat.mentees', COUNT(*) FROM mentorat.mentees
UNION ALL
SELECT 'mentorat.relations', COUNT(*) FROM mentorat.relations
UNION ALL
SELECT 'mentorat.objectifs', COUNT(*) FROM mentorat.objectifs
UNION ALL
SELECT 'mentorat.rendezvous', COUNT(*) FROM mentorat.rendezvous
UNION ALL
SELECT 'recrutement.candidatures', COUNT(*) FROM recrutement.candidatures
UNION ALL
SELECT 'recrutement.recommandations', COUNT(*) FROM recrutement.recommandations
UNION ALL
SELECT 'recrutement.suivi_candidatures', COUNT(*) FROM recrutement.suivi_candidatures;



