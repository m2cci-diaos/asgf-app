-- ============================================
-- SCRIPT POUR CRÉER LES CARTES MANQUANTES
-- Crée les cartes pour les membres qui n'en ont pas
-- ============================================

-- Identifier les membres sans carte
SELECT 
  m.id,
  m.numero_membre,
  m.prenom,
  m.nom,
  m.email,
  m.pays,
  m.created_at
FROM adhesion.members m
LEFT JOIN tresorerie.cartes_membres cm ON m.numero_membre = cm.numero_membre
WHERE cm.numero_membre IS NULL
  AND m.numero_membre IS NOT NULL
  AND m.numero_membre != ''
ORDER BY m.created_at;

-- Créer les cartes manquantes
INSERT INTO tresorerie.cartes_membres (
  numero_membre,
  date_emission,
  date_validite,
  pays,
  statut_carte,
  statut_paiement,
  lien_pdf
)
SELECT 
  m.numero_membre,
  COALESCE(m.date_adhesion, CURRENT_DATE) as date_emission,
  COALESCE(m.date_adhesion, CURRENT_DATE) + INTERVAL '1 year' as date_validite,
  m.pays,
  'en_attente' as statut_carte,
  NULL as statut_paiement, -- null = non payé
  NULL as lien_pdf -- sera généré plus tard
FROM adhesion.members m
LEFT JOIN tresorerie.cartes_membres cm ON m.numero_membre = cm.numero_membre
WHERE cm.numero_membre IS NULL
  AND m.numero_membre IS NOT NULL
  AND m.numero_membre != ''
ON CONFLICT (numero_membre) DO NOTHING;

-- Vérifier le résultat
SELECT 
  COUNT(*) as total_members,
  (SELECT COUNT(*) FROM tresorerie.cartes_membres) as total_cartes,
  COUNT(*) - (SELECT COUNT(*) FROM tresorerie.cartes_membres) as difference
FROM adhesion.members
WHERE numero_membre IS NOT NULL AND numero_membre != '';






