# Module Secrétariat - Documentation

## Structure des fichiers

### Frontend

```
frontend/src/
├── pages/
│   └── SecretariatDashboard.jsx      # Dashboard principal
└── components/secretariat/
    ├── KPICard.jsx                    # Carte KPI cliquable
    ├── StatusBadge.jsx                 # Badge de statut
    ├── EmptyState.jsx                  # État vide
    ├── ReunionTimeline.jsx             # Timeline des réunions
    ├── ReunionDrawer.jsx               # Drawer avec onglets
    └── RapportPresidenceModal.jsx      # Modal rapport Présidence
```

### Backend

```
backend/
├── routes/secretariat/
│   ├── reunions.js                    # Routes réunions
│   ├── participants.js                 # Routes participants
│   ├── comptesRendus.js               # Routes comptes-rendus
│   ├── actions.js                      # Routes actions
│   ├── documents.js                    # Routes documents
│   └── rapports.js                     # Routes rapports
├── services/
│   ├── secretariat.service.js          # Services principaux
│   └── secretariat.rapports.service.js # Services rapports
├── controllers/
│   └── secretariat.controller.js       # Controllers
└── migrations/
    └── secretariat_complete.sql        # Migrations SQL
```

## Fonctionnalités

### 1. Dashboard Secrétariat

- **KPIs cliquables** : Réunions totales, À venir, Actions en cours, Documents
- **Timeline réunions à venir** : Affichage format timeline
- **Tableau réunions récentes** : Avec statut automatique
- **Mes actions** : Actions assignées au user connecté
- **Derniers documents** : Liste des documents récents

### 2. Drawer Réunion

**Onglet Infos** :
- Description
- Ordre du jour formaté
- Métadonnées (créé le / mis à jour)

**Onglet Participants** :
- Tableau avec statut invitation modifiable inline
- Ajout multi-participants avec recherche
- Statistiques (invités, présents, excusés)
- Prévention doublons (contrainte SQL + frontend)

**Onglet Compte-rendu** :
- Formulaire résumé, décisions, actions
- Liste participants auto-remplie
- Génération PDF
- Téléchargement PDF si disponible

**Onglet Actions** :
- Vue tableau ou Kanban
- Statut modifiable inline
- Badge rouge si deadline dépassée
- Ajout d'actions

### 3. Rapports Présidence

- Génération mensuelle ou annuelle
- Options d'inclusion configurables
- Envoi email automatique (optionnel)
- Upload Supabase Storage
- Historique des rapports

## Utilisation

### Intégration dans AdminDashboard

Le dashboard est automatiquement intégré. Pour l'utiliser :

```jsx
import SecretariatDashboard from "./SecretariatDashboard"

// Dans votre composant
{activeModule === 'secretariat' && (
  <SecretariatDashboard currentUser={admin} />
)}
```

### Migrations SQL

Exécuter le fichier `backend/migrations/secretariat_complete.sql` dans votre base de données PostgreSQL.

### Routes API

Toutes les routes sont préfixées par `/api/secretariat/` :

- `GET /api/secretariat/reunions` - Liste réunions
- `GET /api/secretariat/reunions/:id` - Détail réunion
- `POST /api/secretariat/reunions` - Créer réunion
- `GET /api/secretariat/reunions/:id/participants` - Participants
- `POST /api/secretariat/participants` - Ajouter participants (array ou object)
- `POST /api/secretariat/comptes-rendus/reunions/:id/pdf` - Générer PDF
- `POST /api/secretariat/rapports/presidence` - Générer rapport Présidence

## Notes importantes

1. **Contrainte doublons** : La contrainte SQL `participants_reunion_unique` empêche les doublons
2. **Statut automatique** : Le statut des réunions peut être calculé automatiquement (programmée/en cours/terminée)
3. **PDF** : Les PDF sont générés avec PDFKit et peuvent être uploadés sur Supabase Storage
4. **Email** : L'envoi d'email au Président nécessite une configuration SMTP (Mailtrap ou autre)

## Prochaines étapes

- [ ] Implémenter l'upload PDF vers Supabase Storage
- [ ] Configurer l'envoi d'email SMTP
- [ ] Ajouter les animations CSS pour le drawer
- [ ] Implémenter le calcul automatique du statut des réunions
- [ ] Ajouter les filtres avancés dans le dashboard








