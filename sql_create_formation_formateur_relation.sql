-- ============================================
-- CRÉER LA RELATION ENTRE formations ET formateurs
-- ============================================

-- 1. Vérifier si la colonne formateur_id existe dans formations
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'formation'
  AND table_name = 'formations'
  AND column_name = 'formateur_id';

-- 2. Ajouter la colonne formateur_id si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'formation'
        AND table_name = 'formations'
        AND column_name = 'formateur_id'
    ) THEN
        ALTER TABLE formation.formations
        ADD COLUMN formateur_id UUID;
        
        RAISE NOTICE 'Colonne formateur_id ajoutée à formation.formations';
    ELSE
        RAISE NOTICE 'La colonne formateur_id existe déjà';
    END IF;
END $$;

-- 3. Supprimer l'ancienne contrainte de clé étrangère si elle existe
DO $$
BEGIN
    -- Supprimer toutes les contraintes de clé étrangère existantes sur formateur_id
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_schema = 'formation' 
        AND table_name = 'formations' 
        AND constraint_type = 'FOREIGN KEY'
        AND constraint_name LIKE '%formateur%'
    ) THEN
        ALTER TABLE formation.formations 
        DROP CONSTRAINT IF EXISTS formations_formateur_id_fkey;
        
        RAISE NOTICE 'Ancienne contrainte supprimée';
    END IF;
END $$;

-- 4. Créer la contrainte de clé étrangère
DO $$
BEGIN
    -- Vérifier que la colonne formateur_id existe maintenant
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'formation'
        AND table_name = 'formations'
        AND column_name = 'formateur_id'
    ) THEN
        -- Créer la contrainte de clé étrangère
        ALTER TABLE formation.formations
        ADD CONSTRAINT formations_formateur_id_fkey
        FOREIGN KEY (formateur_id)
        REFERENCES formation.formateurs(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE;
        
        RAISE NOTICE 'Contrainte de clé étrangère créée avec succès';
    ELSE
        RAISE EXCEPTION 'La colonne formateur_id n''existe pas dans formation.formations';
    END IF;
END $$;

-- 5. Ajouter un index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_formations_formateur_id 
ON formation.formations(formateur_id);

-- 6. Ajouter un commentaire pour documenter la colonne
COMMENT ON COLUMN formation.formations.formateur_id IS 
'Référence vers le formateur responsable de cette formation';

-- ============================================
-- VÉRIFICATIONS
-- ============================================

-- Vérifier que la colonne existe
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'formation'
  AND table_name = 'formations'
  AND column_name = 'formateur_id';

-- Vérifier que la contrainte existe
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
  AND tc.table_name = 'formations'
  AND kcu.column_name = 'formateur_id';

-- Test de jointure
SELECT 
    f.id,
    f.titre,
    f.formateur_id,
    form.id as formateur_id_verif,
    form.nom,
    form.prenom,
    form.email
FROM formation.formations f
LEFT JOIN formation.formateurs form ON f.formateur_id = form.id
WHERE f.is_active = true
LIMIT 5;

-- Compter les formations avec et sans formateur
SELECT 
    COUNT(*) as total_formations,
    COUNT(formateur_id) as formations_avec_formateur,
    COUNT(*) - COUNT(formateur_id) as formations_sans_formateur
FROM formation.formations
WHERE is_active = true;






