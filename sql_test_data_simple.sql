-- ============================================
-- DONNÉES DE TEST SIMPLIFIÉES
-- MENTORAT & RECRUTEMENT
-- ============================================
--
-- ÉTAPE 1: Récupérez les UUIDs de vos membres existants
-- Exécutez cette requête pour obtenir des UUIDs valides:
--
-- SELECT id, prenom, nom, numero_membre 
-- FROM adhesion.members 
-- WHERE status = 'approved' 
-- LIMIT 20;
--
-- ÉTAPE 2: Remplacez les placeholders {MEMBRE_ID_1}, {MEMBRE_ID_2}, etc.
-- par les vrais UUIDs récupérés à l'étape 1
--
-- ============================================

-- ========== MENTORAT ==========

-- 1. MENTORS (4 mentors actifs)
INSERT INTO mentorat.mentors (membre_id, domaine, biographie, competences, linkedin, disponibilite, status)
VALUES
  (
    '{MEMBRE_ID_1}', -- Remplacez par un UUID réel
    'Géomatique',
    'Ingénieur géomaticien avec 15 ans d''expérience dans la cartographie et les SIG.',
    'QGIS, ArcGIS, PostGIS, Python, JavaScript',
    'https://linkedin.com/in/mentor1',
    '2-3 heures par semaine',
    'active'
  ),
  (
    '{MEMBRE_ID_2}', -- Remplacez par un UUID réel
    'Télédétection',
    'Docteur en télédétection, spécialisé en traitement d''images satellitaires.',
    'Télédétection, Imagerie satellitaire, Machine Learning, Python',
    'https://linkedin.com/in/mentor2',
    '1-2 heures par semaine',
    'active'
  ),
  (
    '{MEMBRE_ID_3}', -- Remplacez par un UUID réel
    'Développement Web Géospatial',
    'Développeur full-stack spécialisé dans les applications web géospatiales.',
    'JavaScript, React, Leaflet, Mapbox, Node.js',
    'https://linkedin.com/in/mentor3',
    '3-4 heures par semaine',
    'active'
  ),
  (
    '{MEMBRE_ID_4}', -- Remplacez par un UUID réel
    'Cartographie',
    'Cartographe professionnel avec expertise en design cartographique.',
    'Cartographie, Design, Illustrator, QGIS',
    'https://linkedin.com/in/mentor4',
    '2 heures par semaine',
    'active'
  );

-- 2. MENTEES (5 mentorés)
INSERT INTO mentorat.mentees (membre_id, domaine_souhaite, objectif_general, niveau, status)
VALUES
  (
    '{MEMBRE_ID_5}', -- Remplacez par un UUID réel
    'Géomatique',
    'Trouver un stage en développement d''applications SIG',
    'Master 2',
    'en recherche'
  ),
  (
    '{MEMBRE_ID_6}', -- Remplacez par un UUID réel
    'Télédétection',
    'Préparer une thèse en télédétection appliquée à l''agriculture',
    'Master 2',
    'en recherche'
  ),
  (
    '{MEMBRE_ID_7}', -- Remplacez par un UUID réel
    'Développement Web Géospatial',
    'Développer mes compétences en développement web géospatial',
    'Licence 3',
    'en recherche'
  ),
  (
    '{MEMBRE_ID_8}', -- Remplacez par un UUID réel
    'Cartographie',
    'Améliorer mes compétences en design cartographique',
    'Master 1',
    'en recherche'
  ),
  (
    '{MEMBRE_ID_9}', -- Remplacez par un UUID réel
    'Géomatique',
    'Trouver un emploi en tant que géomaticien',
    'Master 2',
    'en cours'
  );

-- 3. RELATIONS (2 binômes actifs)
-- Note: Utilisez les IDs des mentors et mentorés créés ci-dessus
-- Vous pouvez les récupérer avec: SELECT id FROM mentorat.mentors WHERE domaine = 'Géomatique' LIMIT 1;
INSERT INTO mentorat.relations (mentor_id, mentee_id, date_debut, statut_relation, commentaire_admin)
VALUES
  (
    (SELECT id FROM mentorat.mentors WHERE domaine = 'Géomatique' LIMIT 1),
    (SELECT id FROM mentorat.mentees WHERE domaine_souhaite = 'Géomatique' AND status = 'en cours' LIMIT 1),
    CURRENT_DATE - INTERVAL '2 months',
    'active',
    'Binôme créé pour accompagner le mentoré dans sa recherche de stage'
  ),
  (
    (SELECT id FROM mentorat.mentors WHERE domaine = 'Télédétection' LIMIT 1),
    (SELECT id FROM mentorat.mentees WHERE domaine_souhaite = 'Télédétection' AND status = 'en recherche' LIMIT 1),
    CURRENT_DATE - INTERVAL '1 month',
    'active',
    'Accompagnement pour préparation thèse'
  );

-- 4. OBJECTIFS (2 objectifs pour les relations)
INSERT INTO mentorat.objectifs (relation_id, titre, description, statut, deadline)
SELECT 
  r.id,
  'Trouver un stage en développement SIG',
  'Identifier 5 entreprises cibles et préparer les candidatures',
  'en cours',
  CURRENT_DATE + INTERVAL '2 months'
FROM mentorat.relations r
WHERE r.statut_relation = 'active'
LIMIT 1;

INSERT INTO mentorat.objectifs (relation_id, titre, description, statut, deadline)
SELECT 
  r.id,
  'Améliorer le portfolio GitHub',
  'Créer 3 projets SIG open source et les publier sur GitHub',
  'en cours',
  CURRENT_DATE + INTERVAL '3 months'
FROM mentorat.relations r
WHERE r.statut_relation = 'active'
LIMIT 1;

-- 5. RENDEZ-VOUS (3 rendez-vous)
INSERT INTO mentorat.rendezvous (relation_id, date_rdv, type, notes_rdv, prochaine_action)
SELECT 
  r.id,
  CURRENT_TIMESTAMP - INTERVAL '2 weeks',
  'Visio',
  'Premier rendez-vous: présentation mutuelle, définition des objectifs.',
  'Préparer une liste d''entreprises cibles pour stage'
FROM mentorat.relations r
WHERE r.statut_relation = 'active'
LIMIT 1;

INSERT INTO mentorat.rendezvous (relation_id, date_rdv, type, notes_rdv, prochaine_action)
SELECT 
  r.id,
  CURRENT_TIMESTAMP - INTERVAL '1 week',
  'Visio',
  'Révision du CV et de la lettre de motivation.',
  'Finaliser le CV et commencer les candidatures'
FROM mentorat.relations r
WHERE r.statut_relation = 'active'
LIMIT 1;

INSERT INTO mentorat.rendezvous (relation_id, date_rdv, type, notes_rdv, prochaine_action)
SELECT 
  r.id,
  CURRENT_TIMESTAMP + INTERVAL '1 week',
  'Visio',
  'Rendez-vous planifié pour suivi des candidatures',
  'Préparer les questions pour les entretiens'
FROM mentorat.relations r
WHERE r.statut_relation = 'active'
LIMIT 1;

-- ========== RECRUTEMENT ==========

-- 1. CANDIDATURES (5 candidatures)
INSERT INTO recrutement.candidatures (membre_id, titre_poste, entreprise, type_contrat, statut, cv_url, lm_url, date_candidature, commentaire_mentor)
VALUES
  (
    '{MEMBRE_ID_10}', -- Remplacez par un UUID réel
    'Géomaticien Junior',
    'IGN (Institut National de l''Information Géographique et Forestière)',
    'CDI',
    'envoye',
    'https://example.com/cv/geomaticien1.pdf',
    'https://example.com/lm/geomaticien1.pdf',
    CURRENT_DATE - INTERVAL '15 days',
    'Candidature bien préparée, bon profil pour le poste'
  ),
  (
    '{MEMBRE_ID_11}', -- Remplacez par un UUID réel
    'Développeur Web Géospatial',
    'GeoTech Solutions',
    'CDI',
    'envoye',
    'https://example.com/cv/dev1.pdf',
    NULL,
    CURRENT_DATE - INTERVAL '10 days',
    NULL
  ),
  (
    '{MEMBRE_ID_12}', -- Remplacez par un UUID réel
    'Cartographe',
    'CartoFrance',
    'CDD',
    'envoye',
    'https://example.com/cv/cartographe1.pdf',
    'https://example.com/lm/cartographe1.pdf',
    CURRENT_DATE - INTERVAL '5 days',
    NULL
  ),
  (
    '{MEMBRE_ID_13}', -- Remplacez par un UUID réel
    'Ingénieur Télédétection',
    'CNES (Centre National d''Études Spatiales)',
    'CDI',
    'envoye',
    'https://example.com/cv/teledetection1.pdf',
    NULL,
    CURRENT_DATE - INTERVAL '3 days',
    'Profil très intéressant, compétences en machine learning'
  ),
  (
    '{MEMBRE_ID_14}', -- Remplacez par un UUID réel
    'Stagiaire SIG',
    'Mairie de Paris',
    'Stage',
    'envoye',
    'https://example.com/cv/stage1.pdf',
    'https://example.com/lm/stage1.pdf',
    CURRENT_DATE - INTERVAL '1 day',
    NULL
  );

-- 2. SUIVI CANDIDATURES (4 suivis)
INSERT INTO recrutement.suivi_candidatures (candidature_id, date_event, type_event, notes)
SELECT 
  c.id,
  c.date_candidature + INTERVAL '3 days',
  'Relance',
  'Relance envoyée par email pour confirmer la réception de la candidature'
FROM recrutement.candidatures c
WHERE c.statut = 'envoye'
LIMIT 2;

INSERT INTO recrutement.suivi_candidatures (candidature_id, date_event, type_event, notes)
SELECT 
  c.id,
  c.date_candidature + INTERVAL '7 days',
  'Entretien planifié',
  'Entretien téléphonique prévu le 15/02/2025 à 14h'
FROM recrutement.candidatures c
WHERE c.statut = 'envoye'
LIMIT 1;

INSERT INTO recrutement.suivi_candidatures (candidature_id, date_event, type_event, notes)
SELECT 
  c.id,
  c.date_candidature + INTERVAL '10 days',
  'Retour positif',
  'L''entreprise a confirmé l''intérêt pour le profil, entretien physique prévu'
FROM recrutement.candidatures c
WHERE c.statut = 'envoye'
LIMIT 1;

-- 3. RECOMMANDATIONS (2 recommandations)
INSERT INTO recrutement.recommandations (mentor_id, mentee_id, texte, lien_pdf)
SELECT 
  m.id,
  me.id,
  'Je recommande chaleureusement ce mentoré pour un poste de géomaticien. Excellent niveau technique, très motivé et sérieux.',
  'https://example.com/recommandations/reco1.pdf'
FROM mentorat.mentors m
CROSS JOIN mentorat.mentees me
WHERE m.domaine = 'Géomatique' 
  AND me.domaine_souhaite = 'Géomatique'
  AND me.status = 'en cours'
LIMIT 1;

INSERT INTO recrutement.recommandations (mentor_id, mentee_id, texte, lien_pdf)
SELECT 
  m.id,
  me.id,
  'Recommandation pour ce mentoré: étudiant très prometteur en télédétection, avec une excellente compréhension des concepts.',
  NULL
FROM mentorat.mentors m
CROSS JOIN mentorat.mentees me
WHERE m.domaine = 'Télédétection' 
  AND me.domaine_souhaite = 'Télédétection'
  AND me.status = 'en recherche'
LIMIT 1;

-- ============================================
-- VÉRIFICATIONS
-- ============================================

-- Vérifier les données créées
SELECT 'MENTORS' as table_name, COUNT(*) as count FROM mentorat.mentors
UNION ALL
SELECT 'MENTEES', COUNT(*) FROM mentorat.mentees
UNION ALL
SELECT 'RELATIONS', COUNT(*) FROM mentorat.relations
UNION ALL
SELECT 'OBJECTIFS', COUNT(*) FROM mentorat.objectifs
UNION ALL
SELECT 'RENDEZ-VOUS', COUNT(*) FROM mentorat.rendezvous
UNION ALL
SELECT 'CANDIDATURES', COUNT(*) FROM recrutement.candidatures
UNION ALL
SELECT 'SUIVIS', COUNT(*) FROM recrutement.suivi_candidatures
UNION ALL
SELECT 'RECOMMANDATIONS', COUNT(*) FROM recrutement.recommandations;



