-- ============================================
-- CORRECTION DE LA FONCTION DE GÉNÉRATION DE CODE DE CONFIRMATION
-- ============================================
-- Le problème : gen_random_bytes() n'existe pas dans PostgreSQL standard
-- Solution : Utiliser une alternative avec random() et md5()

-- IMPORTANT : Supprimer d'abord le trigger, puis la fonction
DROP TRIGGER IF EXISTS trg_auto_confirmation_code ON webinaire.inscriptions;

-- Maintenant on peut supprimer l'ancienne fonction
DROP FUNCTION IF EXISTS webinaire.generate_confirmation_code() CASCADE;

-- Créer la fonction corrigée pour générer un code de confirmation
CREATE OR REPLACE FUNCTION webinaire.generate_confirmation_code()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  code_length INTEGER := 8;
  chars TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; -- Évite les caractères ambigus (0, O, I, 1)
  result TEXT := '';
  i INTEGER;
  random_val NUMERIC;
BEGIN
  -- Générer un code aléatoire de 8 caractères
  FOR i IN 1..code_length LOOP
    -- Utiliser random() pour générer un nombre aléatoire entre 0 et 1
    random_val := random();
    -- Convertir en index dans la chaîne de caractères
    result := result || SUBSTRING(chars, FLOOR(random_val * LENGTH(chars) + 1)::INTEGER, 1);
  END LOOP;
  
  -- Assigner le code généré
  NEW.confirmation_code := result;
  
  RETURN NEW;
END;
$$;

-- Recréer le trigger
CREATE TRIGGER trg_auto_confirmation_code
  BEFORE INSERT ON webinaire.inscriptions
  FOR EACH ROW
  WHEN (NEW.confirmation_code IS NULL)
  EXECUTE FUNCTION webinaire.generate_confirmation_code();

-- Test de la fonction (optionnel)
-- SELECT webinaire.generate_confirmation_code();

-- Vérification
SELECT 
  routine_name,
  routine_type,
  routine_schema
FROM information_schema.routines
WHERE routine_schema = 'webinaire'
  AND routine_name = 'generate_confirmation_code';

