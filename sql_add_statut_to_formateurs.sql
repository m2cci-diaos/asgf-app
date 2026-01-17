-- ============================================
-- AJOUTER LE CHAMP STATUT À LA TABLE formateurs
-- ============================================

-- 1. Vérifier si la colonne statut existe déjà
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'formation'
  AND table_name = 'formateurs'
  AND column_name = 'statut';

-- 2. Ajouter la colonne statut si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'formation'
        AND table_name = 'formateurs'
        AND column_name = 'statut'
    ) THEN
        ALTER TABLE formation.formateurs
        ADD COLUMN statut TEXT CHECK (statut IN ('membre', 'externe'));
        
        -- Mettre à jour les formateurs existants avec une valeur par défaut
        UPDATE formation.formateurs
        SET statut = 'membre'
        WHERE statut IS NULL;
        
        -- Rendre la colonne NOT NULL après avoir mis à jour les valeurs existantes
        ALTER TABLE formation.formateurs
        ALTER COLUMN statut SET NOT NULL;
        
        -- Ajouter une valeur par défaut
        ALTER TABLE formation.formateurs
        ALTER COLUMN statut SET DEFAULT 'membre';
        
        RAISE NOTICE 'Colonne statut ajoutée à formation.formateurs';
    ELSE
        RAISE NOTICE 'La colonne statut existe déjà';
    END IF;
END $$;

-- 3. Ajouter un commentaire pour documenter
COMMENT ON COLUMN formation.formateurs.statut IS 
'Statut du formateur : "membre" pour les membres de l''ASGF, "externe" pour les personnes extérieures';

-- 4. Vérification finale
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'formation'
  AND table_name = 'formateurs'
  AND column_name = 'statut';

-- 5. Afficher les formateurs avec leur statut
SELECT 
    id,
    prenom,
    nom,
    email,
    statut,
    created_at
FROM formation.formateurs
ORDER BY created_at DESC
LIMIT 10;














