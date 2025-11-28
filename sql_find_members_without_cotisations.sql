-- Script pour identifier les membres qui n'ont pas de cotisations

-- 1. Trouver tous les membres approuvés
SELECT 
  m.id,
  m.numero_membre,
  m.prenom,
  m.nom,
  m.email,
  m.status,
  m.is_active,
  COUNT(c.id) as nombre_cotisations
FROM adhesion.members m
LEFT JOIN tresorerie.cotisations c ON c.membre_id = m.id
WHERE m.status = 'approved'
GROUP BY m.id, m.numero_membre, m.prenom, m.nom, m.email, m.status, m.is_active
HAVING COUNT(c.id) = 0
ORDER BY m.numero_membre;

-- 2. Compter le total
SELECT 
  COUNT(*) as membres_sans_cotisation
FROM adhesion.members m
LEFT JOIN tresorerie.cotisations c ON c.membre_id = m.id
WHERE m.status = 'approved'
  AND c.id IS NULL;

-- 3. Vérifier tous les membres et leurs cotisations
SELECT 
  m.id,
  m.numero_membre,
  m.prenom,
  m.nom,
  m.status,
  m.is_active,
  COUNT(c.id) as nombre_cotisations
FROM adhesion.members m
LEFT JOIN tresorerie.cotisations c ON c.membre_id = m.id
GROUP BY m.id, m.numero_membre, m.prenom, m.nom, m.status, m.is_active
ORDER BY nombre_cotisations ASC, m.numero_membre;

