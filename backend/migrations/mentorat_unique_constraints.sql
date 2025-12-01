-- ============================================
-- MIGRATION: CONTRAINTES UNIQUE POUR MENTORAT
-- ============================================
-- Objectif: Empêcher les doublons dans le module mentorat
-- Date: 2025-01-XX
-- ============================================

-- ========== 1. CONTRAINTE UNIQUE : UN SEUL MENTOR PAR MEMBRE ==========
-- Empêche qu'un même membre soit enregistré plusieurs fois comme mentor
ALTER TABLE mentorat.mentors
  ADD CONSTRAINT mentors_unique_membre 
  UNIQUE (membre_id);

-- Si la contrainte existe déjà, cette commande échouera silencieusement avec IF NOT EXISTS
-- Sinon, utiliser cette syntaxe PostgreSQL (si disponible):
-- ALTER TABLE mentorat.mentors
--   ADD CONSTRAINT IF NOT EXISTS mentors_unique_membre 
--   UNIQUE (membre_id);

-- ========== 2. CONTRAINTE UNIQUE : UN SEUL MENTEE PAR MEMBRE ==========
-- Empêche qu'un même membre soit enregistré plusieurs fois comme mentoré
ALTER TABLE mentorat.mentees
  ADD CONSTRAINT mentees_unique_membre 
  UNIQUE (membre_id);

-- ========== 3. INDEX UNIQUE PARTIEL : PAS DEUX RELATIONS ACTIVES POUR LE MÊME DUO ==========
-- Empêche deux relations ACTIVES simultanées entre le même mentor et le même mentoré
-- Note: Les relations terminées/suspendues peuvent coexister avec des relations actives
CREATE UNIQUE INDEX IF NOT EXISTS idx_relations_unique_active
  ON mentorat.relations(mentor_id, mentee_id)
  WHERE statut_relation = 'active';

-- ========== 4. INDEX UNIQUE : PAS DEUX RENDEZ-VOUS AU MÊME MOMENT POUR LA MÊME RELATION ==========
-- Empêche deux rendez-vous au même moment (date_rdv exacte) pour la même relation
-- Cette contrainte est optionnelle mais recommandée pour éviter les conflits
CREATE UNIQUE INDEX IF NOT EXISTS idx_rdv_unique_relation_datetime
  ON mentorat.rendezvous(relation_id, date_rdv);

-- ============================================
-- VÉRIFICATION
-- ============================================
-- Exécutez ces requêtes pour vérifier que les contraintes sont bien créées:

-- SELECT 
--   conname AS constraint_name,
--   contype AS constraint_type,
--   pg_get_constraintdef(oid) AS constraint_definition
-- FROM pg_constraint
-- WHERE conrelid = 'mentorat.mentors'::regclass
--   AND conname = 'mentors_unique_membre';

-- SELECT 
--   conname AS constraint_name,
--   contype AS constraint_type,
--   pg_get_constraintdef(oid) AS constraint_definition
-- FROM pg_constraint
-- WHERE conrelid = 'mentorat.mentees'::regclass
--   AND conname = 'mentees_unique_membre';

-- SELECT 
--   indexname,
--   indexdef
-- FROM pg_indexes
-- WHERE schemaname = 'mentorat'
--   AND tablename IN ('relations', 'rendezvous')
--   AND indexname LIKE '%unique%';

-- ============================================
-- NOTES IMPORTANTES
-- ============================================
-- 1. Ces contraintes empêcheront la création de doublons au niveau SQL
-- 2. Le code backend doit gérer l'erreur PostgreSQL 23505 (duplicate key)
-- 3. Le frontend doit également vérifier les doublons avant soumission (UX)
-- 4. Les index partiels (WHERE) permettent d'avoir plusieurs relations historiques
--    tout en empêchant plusieurs relations actives simultanées




