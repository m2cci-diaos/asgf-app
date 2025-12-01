-- ============================================
-- SCRIPT DE DIAGNOSTIC POUR LE TRIGGER CARTE MEMBRE
-- ============================================

-- 1. Vérifier que le trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'adhesion'
  AND event_object_table = 'members'
  AND trigger_name LIKE '%carte%';

-- 2. Vérifier que la fonction existe
SELECT 
  routine_name,
  routine_type,
  routine_schema
FROM information_schema.routines
WHERE routine_schema = 'tresorerie'
  AND routine_name = 'create_carte_membre';

-- 3. Vérifier la contrainte unique
SELECT 
  conname,
  contype,
  conrelid::regclass
FROM pg_constraint
WHERE conrelid = 'tresorerie.cartes_membres'::regclass
  AND conname LIKE '%numero_membre%';

-- 4. Tester manuellement la fonction avec un membre existant
-- (remplace ASGF-2025-235 par un vrai numéro de membre)
DO $$
DECLARE
  test_member RECORD;
BEGIN
  SELECT * INTO test_member
  FROM adhesion.members
  WHERE numero_membre IS NOT NULL
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF test_member IS NULL THEN
    RAISE NOTICE 'Aucun membre trouvé pour le test';
  ELSE
    RAISE NOTICE 'Test avec membre: %', test_member.numero_membre;
    
    -- Simuler l'insertion d'une carte
    INSERT INTO tresorerie.cartes_membres (
      numero_membre,
      date_emission,
      date_validite,
      pays,
      statut_carte,
      statut_paiement
    )
    VALUES (
      test_member.numero_membre || '-TEST',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '1 year',
      test_member.pays,
      'en_attente',
      'en_attente'
    )
    ON CONFLICT (numero_membre) DO NOTHING;
    
    RAISE NOTICE 'Test d''insertion réussi';
  END IF;
END $$;

-- 5. Vérifier les derniers membres créés sans carte
SELECT 
  m.numero_membre,
  m.nom,
  m.prenom,
  m.created_at,
  CASE 
    WHEN cm.numero_membre IS NULL THEN '❌ Pas de carte'
    ELSE '✅ Carte existe'
  END as statut_carte
FROM adhesion.members m
LEFT JOIN tresorerie.cartes_membres cm ON cm.numero_membre = m.numero_membre
WHERE m.created_at > CURRENT_DATE - INTERVAL '7 days'
ORDER BY m.created_at DESC
LIMIT 10;













