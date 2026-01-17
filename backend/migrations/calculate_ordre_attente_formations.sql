-- ============================================
-- CALCULER ordre_attente POUR LES INSCRIPTIONS EXISTANTES
-- Module Formation uniquement
-- ============================================

-- Fonction pour calculer/mettre à jour ordre_attente pour toutes les inscriptions en attente
CREATE OR REPLACE FUNCTION formation.calculate_ordre_attente()
RETURNS void AS $$
DECLARE
  formation_rec RECORD;
  inscription_rec RECORD;
  current_ordre INTEGER;
BEGIN
  -- Parcourir toutes les formations
  FOR formation_rec IN 
    SELECT DISTINCT formation_id 
    FROM formation.inscriptions 
    WHERE status = 'pending' AND (ordre_attente IS NULL OR ordre_attente = 0)
  LOOP
    current_ordre := 1;
    
    -- Parcourir les inscriptions en attente de cette formation, triées par created_at ASC
    FOR inscription_rec IN
      SELECT id
      FROM formation.inscriptions
      WHERE formation_id = formation_rec.formation_id 
        AND status = 'pending'
      ORDER BY created_at ASC
    LOOP
      -- Assigner l'ordre d'attente
      UPDATE formation.inscriptions
      SET ordre_attente = current_ordre
      WHERE id = inscription_rec.id;
      
      current_ordre := current_ordre + 1;
    END LOOP;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Exécuter la fonction pour calculer l'ordre d'attente pour les inscriptions existantes
SELECT formation.calculate_ordre_attente();

-- Vérifier les résultats
SELECT 
  formation_id,
  COUNT(*) as total_pending,
  MIN(ordre_attente) as min_ordre,
  MAX(ordre_attente) as max_ordre
FROM formation.inscriptions
WHERE status = 'pending' AND ordre_attente IS NOT NULL
GROUP BY formation_id
ORDER BY formation_id;


