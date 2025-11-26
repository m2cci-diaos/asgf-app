-- ============================================
-- FONCTION POUR GÉNÉRER AUTOMATIQUEMENT LE NUMÉRO DE MEMBRE
-- Format selon le pays :
-- - Sénégal : ASGF-{année}-{2 + id} (ex: ASGF-2025-201)
-- - France : ASGF-{année}-{0 + id} (ex: ASGF-2025-201)
-- - Autres : ASGF-{année}-{9 + id} (ex: ASGF-2025-901)
-- ============================================

-- Fonction helper pour UNACCENT (si l'extension n'est pas activée)
CREATE OR REPLACE FUNCTION adhesion.unaccent_simple(text)
RETURNS TEXT AS $$
  SELECT translate(
    $1,
    'àáâãäåèéêëìíîïòóôõöùúûüýÿÀÁÂÃÄÅÈÉÊËÌÍÎÏÒÓÔÕÖÙÚÛÜÝŸ',
    'aaaaaaeeeeiiiioooouuuuyyAAAAAAEEEEIIIIOOOOUUUUYY'
  );
$$ LANGUAGE sql IMMUTABLE;

-- Fonction pour obtenir le préfixe selon le pays
CREATE OR REPLACE FUNCTION adhesion.get_prefixe_pays(pays_text TEXT)
RETURNS TEXT AS $$
DECLARE
  pays_normalise TEXT;
BEGIN
  IF pays_text IS NULL THEN
    RETURN '9'; -- Par défaut "Autres"
  END IF;
  
  -- Normaliser le texte (minuscules, sans accents)
  pays_normalise := LOWER(adhesion.unaccent_simple(pays_text));
  
  IF pays_normalise LIKE '%senegal%' THEN
    RETURN '2';
  ELSIF pays_normalise LIKE '%france%' THEN
    RETURN '0';
  ELSE
    RETURN '9'; -- Autres pays
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction pour générer le numéro de membre
CREATE OR REPLACE FUNCTION adhesion.generate_numero_membre()
RETURNS TRIGGER AS $$
DECLARE
  annee_actuelle TEXT;
  prefixe TEXT;
  dernier_numero INTEGER;
  nouveau_numero TEXT;
  numero_base INTEGER;
BEGIN
  -- Si numero_membre est déjà défini, ne rien faire
  IF NEW.numero_membre IS NOT NULL AND NEW.numero_membre != '' THEN
    RETURN NEW;
  END IF;

  -- Obtenir l'année actuelle
  annee_actuelle := TO_CHAR(CURRENT_DATE, 'YYYY');
  
  -- Obtenir le préfixe selon le pays
  prefixe := adhesion.get_prefixe_pays(NEW.pays);
  
  -- Récupérer le dernier numéro pour cette année et ce préfixe
  -- Le format est ASGF-{année}-{prefixe}{numéro} (ex: ASGF-2025-2001)
  -- On extrait juste la partie numérique après le préfixe
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(numero_membre FROM 'ASGF-' || annee_actuelle || '-' || prefixe || '(\d+)') AS INTEGER
    )
  ), 0)
  INTO dernier_numero
  FROM adhesion.members
  WHERE numero_membre LIKE 'ASGF-' || annee_actuelle || '-' || prefixe || '%'
    AND numero_membre ~ ('^ASGF-' || annee_actuelle || '-' || prefixe || '[0-9]+$');
  
  -- Incrémenter le numéro
  numero_base := dernier_numero + 1;
  
  -- Construire le nouveau numéro : ASGF-{année}-{prefixe}{numéro avec padding}
  -- Format: ASGF-2025-201 (Sénégal: 2+01), ASGF-2025-001 (France: 0+01), ASGF-2025-901 (Autres: 9+01)
  -- Le numéro après le préfixe est sur 2 chiffres
  nouveau_numero := 'ASGF-' || annee_actuelle || '-' || prefixe || LPAD(numero_base::TEXT, 2, '0');
  
  -- Vérifier qu'il n'y a pas de doublon (sécurité supplémentaire)
  WHILE EXISTS (
    SELECT 1 FROM adhesion.members WHERE numero_membre = nouveau_numero
  ) LOOP
    numero_base := numero_base + 1;
    nouveau_numero := 'ASGF-' || annee_actuelle || '-' || prefixe || LPAD(numero_base::TEXT, 2, '0');
  END LOOP;
  
  -- Assigner le numéro
  NEW.numero_membre := nouveau_numero;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Créer le trigger BEFORE INSERT
DROP TRIGGER IF EXISTS trigger_generate_numero_membre ON adhesion.members;

CREATE TRIGGER trigger_generate_numero_membre
  BEFORE INSERT ON adhesion.members
  FOR EACH ROW
  WHEN (NEW.numero_membre IS NULL OR NEW.numero_membre = '')
  EXECUTE FUNCTION adhesion.generate_numero_membre();

-- ============================================
-- VÉRIFICATIONS ET TESTS
-- ============================================

-- Vérifier les numéros existants par pays et année
SELECT 
  pays,
  numero_membre,
  SUBSTRING(numero_membre FROM 'ASGF-(\d{4})') as annee,
  SUBSTRING(numero_membre FROM 'ASGF-\d{4}-(\d)') as prefixe
FROM adhesion.members
WHERE numero_membre IS NOT NULL
ORDER BY created_at DESC
LIMIT 20;

-- Compter les membres par préfixe pour l'année actuelle
SELECT 
  SUBSTRING(numero_membre FROM 'ASGF-\d{4}-(\d)') as prefixe,
  COUNT(*) as nombre
FROM adhesion.members
WHERE numero_membre LIKE 'ASGF-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-%'
GROUP BY prefixe;

