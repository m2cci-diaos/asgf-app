# Structure Git du Projet ASGF-Admin

## 📁 Structure du Projet

```
asgf-admin/
├── .gitignore                    # Configuration Git globale (mis à jour)
├── package.json                  # Dépendances racine
├── package-lock.json             # Lock file (à décider si commité)
│
├── asgf-app/                     # Application Firebase/React
│   ├── .gitignore                # Gitignore spécifique
│   ├── .env                      # ⚠️ Ignoré (secrets)
│   ├── .firebase/                # ⚠️ Ignoré (cache Firebase)
│   └── ...
│
├── backend/                      # Backend Express/Node
│   ├── .env                      # ⚠️ Ignoré (secrets)
│   ├── migrations/               # ✅ À suivre
│   ├── controllers/              # ✅ À suivre
│   ├── routes/                   # ✅ À suivre
│   └── ...
│
├── frontend/                     # Frontend (autre app?)
│   ├── .gitignore                # Gitignore spécifique
│   └── ...
│
├── supabase/                     # Configuration Supabase
│   ├── .gitignore                # Gitignore spécifique
│   ├── migrations/               # ✅ À suivre
│   └── ...
│
├── sql/                          # Scripts SQL divers
│   └── ...
│
├── docs/                         # Documentation
│   └── ...
│
└── [scripts de déploiement]      # Scripts .ps1, .bat, .sh
```

## ✅ Fichiers à Suivre dans Git

### Code Source
- ✅ Tous les fichiers `.js`, `.jsx`, `.ts`, `.tsx`
- ✅ Fichiers de configuration non-secrets (`.json`, `.toml`, `.config.js`)
- ✅ Migrations SQL (`backend/migrations/`, `supabase/migrations/`)
- ✅ Scripts de déploiement (`.ps1`, `.bat`, `.sh`)
- ✅ Documentation (`.md`)
- ✅ Scripts SQL (`sql/`)

### Configuration (sans secrets)
- ✅ `package.json`, `package-lock.json`
- ✅ `firebase.json`, `.firebaserc` (sans secrets)
- ✅ `supabase/config.toml`
- ✅ Fichiers de configuration d'IDE (optionnel: `.vscode/extensions.json`)

## ⚠️ Fichiers à Ignorer (via .gitignore)

### Secrets et Variables d'Environnement
- ⚠️ `.env` (tous les dossiers)
- ⚠️ `.env.*` (variantes locales)
- ✅ `.env.example` (modèle sans secrets - à créer)

### Dépendances et Builds
- ⚠️ `node_modules/` (partout)
- ⚠️ `dist/`, `build/`, `dist-ssr/`
- ⚠️ `node_modules/.bin/`

### Cache et Fichiers Temporaires
- ⚠️ `.firebase/` (cache Firebase)
- ⚠️ `*.cache`, `*.tmp`, `*.log`
- ⚠️ `supabase/.branches`, `supabase/.temp`

### Exécutables
- ⚠️ `supabase.exe`
- ⚠️ `backend/supabase.exe`

### IDE et OS
- ⚠️ `.vscode/` (sauf `extensions.json`)
- ⚠️ `.idea/`, `.cursor/`, `.history/`
- ⚠️ `.DS_Store`, `Thumbs.db`

## 📋 État Actuel du Repository

### Branche actuelle
- `feature/cartes-membres-et-studio` (1 commit en avance sur origin)

### Fichiers modifiés non commités
- Environ 100+ fichiers modifiés
- Plusieurs fichiers de configuration

### Fichiers non suivis (untracked)
- Nombreux fichiers `.md` de documentation
- Migrations SQL récentes
- Scripts de déploiement

## 🎯 Structure Recommandée pour les Commits

### Option 1: Commits par Module/Fonctionnalité
```
1. Configuration Git (.gitignore)
2. Backend - Migrations SQL
3. Backend - Contrôleurs et Routes
4. Frontend/ASGF-App - Composants
5. Documentation
6. Scripts de déploiement
```

### Option 2: Commits Logiques par Feature
```
1. Configuration et setup
2. Module Secretari
```

## 📝 Prochaines Étapes

1. ✅ `.gitignore` mis à jour
2. ⏳ Réviser les fichiers à ajouter (selon vos besoins)
3. ⏳ Créer des commits organisés
4. ⏳ Créer `.env.example` pour documenter les variables nécessaires

---

**Note:** Le `.gitignore` a été amélioré pour couvrir tous les fichiers sensibles et temporaires.
Vous pouvez maintenant me dire quels fichiers/éléments vous voulez ajouter au repository.

