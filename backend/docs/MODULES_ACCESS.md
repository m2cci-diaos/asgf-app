# Documentation des Modules et Accès Admin

## Modules Disponibles

Tous les modules sont définis dans `backend/config/constants.js` :

- `adhesion` : Gestion des adhésions et membres
- `formation` : Gestion des formations
- `webinaire` : Gestion des webinaires
- `tresorerie` : Gestion de la trésorerie
- `secretariat` : Gestion du secrétariat et réunions
- `mentorat` : Gestion du mentorat
- `recrutement` : Gestion du recrutement
- `contact` : Gestion des messages de contact
- `audit` : Historique des actions (réservé aux superadmins)
- `calendar` : Calendrier global (accessible à tous les admins)

## Règles d'Accès

### Modules Accessibles à Tous les Admins Authentifiés

- **calendar** : Le calendrier est accessible à tous les admins, même sans permission explicite sur les modules formations/webinaires/réunions. Il agrège les événements de tous les modules.

### Modules Réservés aux Superadmins

- **audit** : L'historique des actions est uniquement accessible aux superadmins (masters ou scoped avec audit dans leur scope).
- **settings** : Les paramètres système sont uniquement accessibles aux superadmins.

### Dépendances entre Modules

Certains modules dépendent d'autres modules. Si un admin a accès au module parent, il a automatiquement accès au module enfant :

- **members** dépend de **adhesion** : Les membres sont gérés dans le module adhesion, donc si un admin a accès à `adhesion`, il peut voir et gérer les membres.
- **studio** dépend de **secretariat** : Le studio (génération d'images) dépend du module secretariat.

### Superadmins

- **Masters** (`is_master = true`) : Accès complet à tous les modules, sans restriction.
- **Scoped** (`role_type = 'superadmin'` avec `super_scope`) : Accès limité aux modules listés dans `super_scope`. Si `super_scope` est vide, accès complet.

### Admins Standards

Les admins standards ont accès uniquement aux modules explicitement accordés dans la table `admins_modules`.

## Implémentation

### Frontend (`asgf-app/src/admin/pages/AdminDashboard.jsx`)

La fonction `canAccessModule` gère la logique d'accès :
- Vérifie d'abord les règles spéciales (audit, calendar, settings)
- Vérifie l'accès direct au module
- Vérifie les dépendances (si le module dépend d'un autre, vérifie l'accès au module parent)
- Gère les superadmins (masters et scoped)

### Backend (`backend/middlewares/auth.js`)

Le middleware `requireModule` :
- Autorise automatiquement `calendar` pour tous les admins authentifiés
- Restreint `audit` aux superadmins uniquement
- Vérifie les dépendances entre modules
- Vérifie les permissions dans la table `admins_modules`

## Routes API

- `/api/admin/calendar/events` : Accessible à tous les admins authentifiés (pas de `requireModule`)
- `/api/admin/audit/*` : Requiert `requireModule(MODULES.AUDIT)` qui vérifie que l'admin est superadmin
- Toutes les autres routes : Requièrent `requireModule(MODULES.XXX)` correspondant




