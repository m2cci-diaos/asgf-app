-- ============================================
-- DONNÉES DE TEST POUR MENTORAT & RECRUTEMENT
-- ============================================
-- 
-- IMPORTANT: Remplacez les UUIDs par ceux de vos membres existants dans adhesion.members
-- Vous pouvez récupérer les UUIDs avec: SELECT id, prenom, nom, numero_membre FROM adhesion.members LIMIT 10;
--
-- ============================================

-- ========== MENTORAT ==========

-- 1. MENTORS (remplacez les membre_id par de vrais UUIDs)
INSERT INTO mentorat.mentors (membre_id, domaine, biographie, competences, linkedin, disponibilite, status)
VALUES
  -- Mentor 1: Géomatique
  (
    (SELECT id FROM adhesion.members WHERE numero_membre LIKE '%001%' LIMIT 1), -- Remplacez par un vrai UUID
    'Géomatique',
    'Ingénieur géomaticien avec 15 ans d''expérience dans la cartographie et les SIG. Expert en QGIS, ArcGIS et développement d''applications géospatiales.',
    'QGIS, ArcGIS, PostGIS, Python, JavaScript, Cartographie, SIG',
    'https://linkedin.com/in/mentor1',
    '2-3 heures par semaine',
    'active'
  ),
  -- Mentor 2: Télédétection
  (
    (SELECT id FROM adhesion.members WHERE numero_membre LIKE '%002%' LIMIT 1), -- Remplacez par un vrai UUID
    'Télédétection',
    'Docteur en télédétection, spécialisé en traitement d''images satellitaires et analyse de données spatiales.',
    'Télédétection, Imagerie satellitaire, Machine Learning, Python, R',
    'https://linkedin.com/in/mentor2',
    '1-2 heures par semaine',
    'active'
  ),
  -- Mentor 3: Développement Web Géospatial
  (
    (SELECT id FROM adhesion.members WHERE numero_membre LIKE '%003%' LIMIT 1), -- Remplacez par un vrai UUID
    'Développement Web Géospatial',
    'Développeur full-stack spécialisé dans les applications web géospatiales. Expert en Leaflet, Mapbox, et APIs géospatiales.',
    'JavaScript, React, Leaflet, Mapbox, Node.js, PostGIS',
    'https://linkedin.com/in/mentor3',
    '3-4 heures par semaine',
    'active'
  ),
  -- Mentor 4: Cartographie
  (
    (SELECT id FROM adhesion.members WHERE numero_membre LIKE '%004%' LIMIT 1), -- Remplacez par un vrai UUID
    'Cartographie',
    'Cartographe professionnel avec expertise en design cartographique et visualisation de données géographiques.',
    'Cartographie, Design, Illustrator, QGIS, D3.js',
    'https://linkedin.com/in/mentor4',
    '2 heures par semaine',
    'active'
  );

-- 2. MENTEES (remplacez les membre_id par de vrais UUIDs)
INSERT INTO mentorat.mentees (membre_id, domaine_souhaite, objectif_general, niveau, status)
VALUES
  -- Mentoré 1
  (
    (SELECT id FROM adhesion.members WHERE numero_membre LIKE '%005%' LIMIT 1), -- Remplacez par un vrai UUID
    'Géomatique',
    'Trouver un stage en développement d''applications SIG',
    'Master 2',
    'en recherche'
  ),
  -- Mentoré 2
  (
    (SELECT id FROM adhesion.members WHERE numero_membre LIKE '%006%' LIMIT 1), -- Remplacez par un vrai UUID
    'Télédétection',
    'Préparer une thèse en télédétection appliquée à l''agriculture',
    'Master 2',
    'en recherche'
  ),
  -- Mentoré 3
  (
    (SELECT id FROM adhesion.members WHERE numero_membre LIKE '%007%' LIMIT 1), -- Remplacez par un vrai UUID
    'Développement Web Géospatial',
    'Développer mes compétences en développement web géospatial',
    'Licence 3',
    'en recherche'
  ),
  -- Mentoré 4
  (
    (SELECT id FROM adhesion.members WHERE numero_membre LIKE '%008%' LIMIT 1), -- Remplacez par un vrai UUID
    'Cartographie',
    'Améliorer mes compétences en design cartographique',
    'Master 1',
    'en recherche'
  ),
  -- Mentoré 5 (déjà en relation)
  (
    (SELECT id FROM adhesion.members WHERE numero_membre LIKE '%009%' LIMIT 1), -- Remplacez par un vrai UUID
    'Géomatique',
    'Trouver un emploi en tant que géomaticien',
    'Master 2',
    'en cours'
  );

-- 3. RELATIONS (binômes mentor/mentoré)
-- Note: Les mentor_id et mentee_id doivent correspondre aux IDs créés ci-dessus
INSERT INTO mentorat.relations (mentor_id, mentee_id, date_debut, statut_relation, commentaire_admin)
SELECT 
  m.id as mentor_id,
  me.id as mentee_id,
  CURRENT_DATE - INTERVAL '2 months' as date_debut,
  'active' as statut_relation,
  'Binôme créé pour accompagner le mentoré dans sa recherche de stage'
FROM mentorat.mentors m
CROSS JOIN mentorat.mentees me
WHERE m.domaine = 'Géomatique' 
  AND me.domaine_souhaite = 'Géomatique'
  AND me.status = 'en cours'
LIMIT 1;

-- Ajout d'une deuxième relation
INSERT INTO mentorat.relations (mentor_id, mentee_id, date_debut, statut_relation, commentaire_admin)
SELECT 
  m.id as mentor_id,
  me.id as mentee_id,
  CURRENT_DATE - INTERVAL '1 month' as date_debut,
  'active' as statut_relation,
  'Accompagnement pour préparation thèse'
FROM mentorat.mentors m
CROSS JOIN mentorat.mentees me
WHERE m.domaine = 'Télédétection' 
  AND me.domaine_souhaite = 'Télédétection'
  AND me.status = 'en recherche'
LIMIT 1;

-- 4. OBJECTIFS (pour les relations actives)
INSERT INTO mentorat.objectifs (relation_id, titre, description, statut, deadline)
SELECT 
  r.id as relation_id,
  'Trouver un stage en développement SIG' as titre,
  'Identifier 5 entreprises cibles et préparer les candidatures' as description,
  'en cours' as statut,
  CURRENT_DATE + INTERVAL '2 months' as deadline
FROM mentorat.relations r
WHERE r.statut_relation = 'active'
LIMIT 1;

INSERT INTO mentorat.objectifs (relation_id, titre, description, statut, deadline)
SELECT 
  r.id as relation_id,
  'Améliorer le portfolio GitHub' as titre,
  'Créer 3 projets SIG open source et les publier sur GitHub' as description,
  'en cours' as statut,
  CURRENT_DATE + INTERVAL '3 months' as deadline
FROM mentorat.relations r
WHERE r.statut_relation = 'active'
LIMIT 1;

-- 5. RENDEZ-VOUS
INSERT INTO mentorat.rendezvous (relation_id, date_rdv, type, notes_rdv, prochaine_action)
SELECT 
  r.id as relation_id,
  CURRENT_TIMESTAMP - INTERVAL '2 weeks' as date_rdv,
  'Visio' as type,
  'Premier rendez-vous: présentation mutuelle, définition des objectifs. Le mentoré souhaite se spécialiser en développement SIG.' as notes_rdv,
  'Préparer une liste d''entreprises cibles pour stage' as prochaine_action
FROM mentorat.relations r
WHERE r.statut_relation = 'active'
LIMIT 1;

INSERT INTO mentorat.rendezvous (relation_id, date_rdv, type, notes_rdv, prochaine_action)
SELECT 
  r.id as relation_id,
  CURRENT_TIMESTAMP - INTERVAL '1 week' as date_rdv,
  'Visio' as type,
  'Révision du CV et de la lettre de motivation. Discussion sur les compétences techniques à mettre en avant.' as notes_rdv,
  'Finaliser le CV et commencer les candidatures' as prochaine_action
FROM mentorat.relations r
WHERE r.statut_relation = 'active'
LIMIT 1;

INSERT INTO mentorat.rendezvous (relation_id, date_rdv, type, notes_rdv, prochaine_action)
SELECT 
  r.id as relation_id,
  CURRENT_TIMESTAMP + INTERVAL '1 week' as date_rdv,
  'Visio' as type,
  'Rendez-vous planifié pour suivi des candidatures' as notes_rdv,
  'Préparer les questions pour les entretiens' as prochaine_action
FROM mentorat.relations r
WHERE r.statut_relation = 'active'
LIMIT 1;

-- ========== RECRUTEMENT ==========

-- 1. CANDIDATURES (remplacez les membre_id par de vrais UUIDs)
INSERT INTO recrutement.candidatures (membre_id, titre_poste, entreprise, type_contrat, statut, cv_url, lm_url, date_candidature, commentaire_mentor)
VALUES
  -- Candidature 1
  (
    (SELECT id FROM adhesion.members WHERE numero_membre LIKE '%010%' LIMIT 1), -- Remplacez par un vrai UUID
    'Géomaticien Junior',
    'IGN (Institut National de l''Information Géographique et Forestière)',
    'CDI',
    'envoye',
    'https://example.com/cv/geomaticien1.pdf',
    'https://example.com/lm/geomaticien1.pdf',
    CURRENT_DATE - INTERVAL '15 days',
    'Candidature bien préparée, bon profil pour le poste'
  ),
  -- Candidature 2
  (
    (SELECT id FROM adhesion.members WHERE numero_membre LIKE '%011%' LIMIT 1), -- Remplacez par un vrai UUID
    'Développeur Web Géospatial',
    'GeoTech Solutions',
    'CDI',
    'envoye',
    'https://example.com/cv/dev1.pdf',
    NULL,
    CURRENT_DATE - INTERVAL '10 days',
    NULL
  ),
  -- Candidature 3
  (
    (SELECT id FROM adhesion.members WHERE numero_membre LIKE '%012%' LIMIT 1), -- Remplacez par un vrai UUID
    'Cartographe',
    'CartoFrance',
    'CDD',
    'envoye',
    'https://example.com/cv/cartographe1.pdf',
    'https://example.com/lm/cartographe1.pdf',
    CURRENT_DATE - INTERVAL '5 days',
    NULL
  ),
  -- Candidature 4
  (
    (SELECT id FROM adhesion.members WHERE numero_membre LIKE '%013%' LIMIT 1), -- Remplacez par un vrai UUID
    'Ingénieur Télédétection',
    'CNES (Centre National d''Études Spatiales)',
    'CDI',
    'envoye',
    'https://example.com/cv/teledetection1.pdf',
    NULL,
    CURRENT_DATE - INTERVAL '3 days',
    'Profil très intéressant, compétences en machine learning'
  ),
  -- Candidature 5
  (
    (SELECT id FROM adhesion.members WHERE numero_membre LIKE '%014%' LIMIT 1), -- Remplacez par un vrai UUID
    'Stagiaire SIG',
    'Mairie de Paris',
    'Stage',
    'envoye',
    'https://example.com/cv/stage1.pdf',
    'https://example.com/lm/stage1.pdf',
    CURRENT_DATE - INTERVAL '1 day',
    NULL
  );

-- 2. SUIVI CANDIDATURES
-- Note: Les candidature_id doivent correspondre aux IDs créés ci-dessus
INSERT INTO recrutement.suivi_candidatures (candidature_id, date_event, type_event, notes)
SELECT 
  c.id as candidature_id,
  c.date_candidature + INTERVAL '3 days' as date_event,
  'Relance' as type_event,
  'Relance envoyée par email pour confirmer la réception de la candidature'
FROM recrutement.candidatures c
WHERE c.statut = 'envoye'
LIMIT 2;

INSERT INTO recrutement.suivi_candidatures (candidature_id, date_event, type_event, notes)
SELECT 
  c.id as candidature_id,
  c.date_candidature + INTERVAL '7 days' as date_event,
  'Entretien planifié' as type_event,
  'Entretien téléphonique prévu le 15/02/2025 à 14h'
FROM recrutement.candidatures c
WHERE c.statut = 'envoye'
LIMIT 1;

INSERT INTO recrutement.suivi_candidatures (candidature_id, date_event, type_event, notes)
SELECT 
  c.id as candidature_id,
  c.date_candidature + INTERVAL '10 days' as date_event,
  'Retour positif' as type_event,
  'L''entreprise a confirmé l''intérêt pour le profil, entretien physique prévu'
FROM recrutement.candidatures c
WHERE c.statut = 'envoye'
LIMIT 1;

-- 3. RECOMMANDATIONS
-- Note: Les mentor_id et mentee_id doivent correspondre aux IDs créés dans mentorat
INSERT INTO recrutement.recommandations (mentor_id, mentee_id, texte, lien_pdf)
SELECT 
  m.id as mentor_id,
  me.id as mentee_id,
  'Je recommande chaleureusement [NOM_MENTORE] pour un poste de géomaticien. Excellent niveau technique, très motivé et sérieux. A suivi avec assiduité le programme de mentorat et a fait des progrès remarquables.' as texte,
  'https://example.com/recommandations/reco1.pdf' as lien_pdf
FROM mentorat.mentors m
CROSS JOIN mentorat.mentees me
WHERE m.domaine = 'Géomatique' 
  AND me.domaine_souhaite = 'Géomatique'
  AND me.status = 'en cours'
LIMIT 1;

INSERT INTO recrutement.recommandations (mentor_id, mentee_id, texte, lien_pdf)
SELECT 
  m.id as mentor_id,
  me.id as mentee_id,
  'Recommandation pour [NOM_MENTORE]: étudiant très prometteur en télédétection, avec une excellente compréhension des concepts et une forte motivation pour la recherche.' as texte,
  NULL as lien_pdf
FROM mentorat.mentors m
CROSS JOIN mentorat.mentees me
WHERE m.domaine = 'Télédétection' 
  AND me.domaine_souhaite = 'Télédétection'
  AND me.status = 'en recherche'
LIMIT 1;

-- ============================================
-- VÉRIFICATION DES DONNÉES
-- ============================================

-- Vérifier les mentors créés
SELECT 
  m.id,
  mem.prenom,
  mem.nom,
  m.domaine,
  m.status,
  m.created_at
FROM mentorat.mentors m
JOIN adhesion.members mem ON m.membre_id = mem.id;

-- Vérifier les mentorés créés
SELECT 
  me.id,
  mem.prenom,
  mem.nom,
  me.domaine_souhaite,
  me.status,
  me.created_at
FROM mentorat.mentees me
JOIN adhesion.members mem ON me.membre_id = mem.id;

-- Vérifier les relations actives
SELECT 
  r.id,
  mentor_mem.prenom || ' ' || mentor_mem.nom as mentor,
  mentee_mem.prenom || ' ' || mentee_mem.nom as mentee,
  r.date_debut,
  r.statut_relation
FROM mentorat.relations r
JOIN mentorat.mentors m ON r.mentor_id = m.id
JOIN adhesion.members mentor_mem ON m.membre_id = mentor_mem.id
JOIN mentorat.mentees me ON r.mentee_id = me.id
JOIN adhesion.members mentee_mem ON me.membre_id = mentee_mem.id;

-- Vérifier les candidatures
SELECT 
  c.id,
  mem.prenom || ' ' || mem.nom as membre,
  c.titre_poste,
  c.entreprise,
  c.statut,
  c.date_candidature
FROM recrutement.candidatures c
JOIN adhesion.members mem ON c.membre_id = mem.id;

-- Statistiques mentorat
SELECT 
  (SELECT COUNT(*) FROM mentorat.mentors WHERE status = 'active') as mentors_actifs,
  (SELECT COUNT(*) FROM mentorat.mentees WHERE status = 'en recherche') as mentees_en_recherche,
  (SELECT COUNT(*) FROM mentorat.relations WHERE statut_relation = 'active') as relations_actives,
  (SELECT COUNT(*) FROM mentorat.rendezvous) as total_rendezvous;

-- Statistiques recrutement
SELECT 
  (SELECT COUNT(*) FROM recrutement.candidatures) as total_candidatures,
  (SELECT COUNT(*) FROM recrutement.suivi_candidatures) as total_suivis,
  (SELECT COUNT(*) FROM recrutement.recommandations) as total_recommandations;



