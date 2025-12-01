-- Script d'insertion de membres du bureau ASGF
-- À exécuter dans Supabase SQL Editor après avoir créé la table

-- Membres de la Direction
INSERT INTO organisation.bureau_members (
  prenom, nom, nom_affichage, role_court, role_long, categorie, 
  email, phone, linkedin_url, highlight, ordre, is_active
) VALUES
-- Président
('Serigne Omar', 'DIAO', 'DIAO Serigne Omar', 'PRESIDENT', 'Président', 'direction',
 'association.geomaticiens.sf@gmail.com', '+33 6 52 45 47 85', 
 'https://www.linkedin.com/in/serigne-omar-diao-045117172/', 
 true, 1, true),

-- Vice-Président
('Alhassane', 'TAMBADOU', 'TAMBADOU Alhassane', 'VICE-PRESIDENT', 'Vice-Président', 'direction',
 'association.geomaticiens.sf@gmail.com', '+33 6 62 08 16 21',
 'https://www.linkedin.com/in/alhassane-tambadou-a3232b25a/',
 false, 2, true),

-- Membre du Bureau Exécutif
('Oumar', 'NDIAYE', 'NDIAYE Oumar', 'MEMBRE_BUREAU', 'Membre du Bureau Exécutif', 'direction',
 'association.geomaticiens.sf@gmail.com', '+33 6 62 08 16 21',
 'https://www.linkedin.com/in/alhassane-tambadou-a3232b25a/',
 false, 3, true),

-- Secrétaire Général
('Moustapha', 'GAKOU', 'GAKOU Moustapha', 'SECRETAIRE', 'Secrétaire Général', 'direction',
 'association.geomaticiens.sf@gmail.com', NULL,
 'https://linkedin.com/in/gaikou-moustapha',
 false, 4, true),

-- Trésorière
('Mame Khady', 'NIASSE', 'NIASSE Mame Khady', 'TRESORIER', 'Trésorière', 'direction',
 'association.geomaticiens.sf@gmail.com', NULL,
 'https://linkedin.com/in/niasse-mama-sady',
 false, 5, true)

ON CONFLICT DO NOTHING;

-- Responsables de pôles
INSERT INTO organisation.bureau_members (
  prenom, nom, nom_affichage, role_court, role_long, categorie, pole_nom,
  email, linkedin_url, ordre, is_active
) VALUES
-- Pôle Formation
('Poullo', 'BA', 'BA Poullo', 'RESPONSABLE_POLE', 'Responsable pôle formation', 'pole', 'Pôle Formation',
 'association.geomaticiens.sf@gmail.com', 'https://linkedin.com/in/ba-poullo',
 10, true),

('Abdou', 'Sène', 'Sène Abdou', 'CO_RESPONSABLE', 'Co-responsable pôle formation', 'pole', 'Pôle Formation',
 'association.geomaticiens.sf@gmail.com', 'https://linkedin.com/in/sene-abdou',
 11, true),

-- Communications et réseaux
('Amadou', 'FALL', 'FALL Amadou', 'RESPONSABLE_POLE', 'Communications et réseaux', 'pole', 'Pôle Communication',
 'association.geomaticiens.sf@gmail.com', 'https://linkedin.com/in/fall-amadou',
 20, true),

('Khadim R.', 'FALL', 'FALL Khadim R.', 'RESPONSABLE_POLE', 'Communications et réseaux', 'pole', 'Pôle Communication',
 'association.geomaticiens.sf@gmail.com', 'https://linkedin.com/in/fall-khadim',
 21, true),

-- Partenariats et Relations extérieurs
('M. Lamine', 'GUEYE', 'GUEYE M. Lamine', 'RESPONSABLE_POLE', 'Responsable - Partenariats et Relations extérieurs', 'pole', 'Pôle Partenariats',
 'association.geomaticiens.sf@gmail.com', 'https://linkedin.com/in/gueye-lamine',
 30, true),

('A. Bamba', 'Mbaye', 'Mbaye A. Bamba', 'RESPONSABLE_POLE', 'Partenariats et Relations extérieurs au Sénégal', 'pole', 'Pôle Partenariats',
 'association.geomaticiens.sf@gmail.com', 'https://linkedin.com/in/mbaye-bamba',
 31, true),

-- Recrutement et accompagnements
('Adji Bousso', 'SECK', 'SECK Adji Bousso', 'RESPONSABLE_POLE', 'Responsable - Recrutement et accompagnements', 'pole', 'Pôle Recrutement',
 'association.geomaticiens.sf@gmail.com', 'https://linkedin.com/in/seck-adji-bousso',
 40, true),

-- Innovations et Projets SIG
('Boubacar', 'DEMBA', 'DEMBA Boubacar', 'RESPONSABLE_POLE', 'Responsable Innovations et Projets SIG', 'pole', 'Pôle Innovation',
 'association.geomaticiens.sf@gmail.com', 'https://linkedin.com/in/demba-boubacar',
 50, true),

-- Webinaires & Publications
('Cheikh Oumar', 'Diallo', 'Diallo Cheikh Oumar', 'RESPONSABLE_POLE', 'Responsable - pôle Webinaires & Publications', 'pole', 'Pôle Webinaires & Publications',
 'association.geomaticiens.sf@gmail.com', 'https://linkedin.com/in/diallo-cheikh-oumar',
 60, true),

-- Adjointe Secrétaire Générale
('Astou', 'DIOUF', 'DIOUF Astou', 'AUTRE', 'Adjointe - Secrétaire Générale', 'autre', NULL,
 'association.geomaticiens.sf@gmail.com', 'https://www.linkedin.com/in/astou-diouf-86467a280/',
 100, true)

ON CONFLICT DO NOTHING;

-- Vérification : Afficher les membres insérés
SELECT 
  id,
  nom_affichage,
  role_long,
  categorie,
  pole_nom,
  is_active
FROM organisation.bureau_members
ORDER BY categorie, ordre;



