-- ============================================
-- CRÉER UNE RELATION MANY-TO-MANY
-- ENTRE formations ET formateurs
-- ============================================
-- Un formateur peut enseigner plusieurs formations
-- Une formation peut avoir plusieurs formateurs
-- ============================================

-- 1. Créer la table de liaison formation_formateurs
CREATE TABLE IF NOT EXISTS formation.formation_formateurs (
    id UUID NOT NULL DEFAULT gen_random_uuid(),
    formation_id UUID NOT NULL,
    formateur_id UUID NOT NULL,
    role TEXT NULL, -- Ex: "Formateur principal", "Formateur assistant", "Intervenant"
    ordre INTEGER DEFAULT 0, -- Pour ordonner les formateurs (principal en premier)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT formation_formateurs_pkey PRIMARY KEY (id),
    CONSTRAINT formation_formateurs_formation_id_fkey 
        FOREIGN KEY (formation_id) 
        REFERENCES formation.formations(id) 
        ON DELETE CASCADE,
    CONSTRAINT formation_formateurs_formateur_id_fkey 
        FOREIGN KEY (formateur_id) 
        REFERENCES formation.formateurs(id) 
        ON DELETE CASCADE,
    CONSTRAINT formation_formateurs_unique 
        UNIQUE (formation_id, formateur_id) -- Éviter les doublons
) TABLESPACE pg_default;

-- 2. Créer des index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_formation_formateurs_formation_id 
    ON formation.formation_formateurs(formation_id);
CREATE INDEX IF NOT EXISTS idx_formation_formateurs_formateur_id 
    ON formation.formation_formateurs(formateur_id);

-- 3. Migrer les données existantes (si formateur_id existe dans formations)
-- Copier les associations existantes vers la nouvelle table
DO $$
DECLARE
    formation_record RECORD;
BEGIN
    -- Vérifier si la colonne formateur_id existe
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'formation'
        AND table_name = 'formations'
        AND column_name = 'formateur_id'
    ) THEN
        -- Migrer les données existantes
        FOR formation_record IN 
            SELECT id, formateur_id 
            FROM formation.formations 
            WHERE formateur_id IS NOT NULL
        LOOP
            -- Insérer dans la table de liaison si pas déjà présent
            INSERT INTO formation.formation_formateurs (formation_id, formateur_id, role, ordre)
            VALUES (formation_record.id, formation_record.formateur_id, 'Formateur principal', 1)
            ON CONFLICT (formation_id, formateur_id) DO NOTHING;
        END LOOP;
        
        RAISE NOTICE 'Migration des données existantes terminée';
    END IF;
END $$;

-- 4. Optionnel : Garder formateur_id pour compatibilité (formateur principal)
-- Ou le supprimer si vous voulez uniquement utiliser la table de liaison
-- Pour l'instant, on le garde comme référence au formateur principal

-- 5. Activer RLS sur la table de liaison
ALTER TABLE formation.formation_formateurs ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture publique
DROP POLICY IF EXISTS "Allow public read access to formation_formateurs" ON formation.formation_formateurs;
CREATE POLICY "Allow public read access to formation_formateurs"
ON formation.formation_formateurs
FOR SELECT
TO anon
USING (true);

-- Accorder les permissions
GRANT USAGE ON SCHEMA formation TO anon;
GRANT SELECT ON TABLE formation.formation_formateurs TO anon;

-- 6. Ajouter des commentaires pour documenter
COMMENT ON TABLE formation.formation_formateurs IS 
'Table de liaison many-to-many entre formations et formateurs. Un formateur peut enseigner plusieurs formations, et une formation peut avoir plusieurs formateurs.';
COMMENT ON COLUMN formation.formation_formateurs.role IS 
'Rôle du formateur dans cette formation (ex: "Formateur principal", "Formateur assistant", "Intervenant")';
COMMENT ON COLUMN formation.formation_formateurs.ordre IS 
'Ordre d''affichage des formateurs (1 = principal, 2 = secondaire, etc.)';

-- ============================================
-- VÉRIFICATIONS
-- ============================================

-- Vérifier que la table existe
SELECT 
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'formation'
AND table_name = 'formation_formateurs';

-- Vérifier la structure de la table
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'formation'
AND table_name = 'formation_formateurs'
ORDER BY ordinal_position;

-- Vérifier les contraintes
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'formation'
  AND tc.table_name = 'formation_formateurs';

-- Test de jointure
SELECT 
    f.id as formation_id,
    f.titre as formation_titre,
    ff.role,
    ff.ordre,
    form.id as formateur_id,
    form.nom as formateur_nom,
    form.prenom as formateur_prenom
FROM formation.formations f
LEFT JOIN formation.formation_formateurs ff ON f.id = ff.formation_id
LEFT JOIN formation.formateurs form ON ff.formateur_id = form.id
WHERE f.is_active = true
ORDER BY f.titre, ff.ordre
LIMIT 10;

-- Compter les associations
SELECT 
    COUNT(DISTINCT formation_id) as formations_avec_formateurs,
    COUNT(DISTINCT formateur_id) as formateurs_actifs,
    COUNT(*) as total_associations
FROM formation.formation_formateurs;



