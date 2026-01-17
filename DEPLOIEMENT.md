# Guide de Déploiement - ASGF Admin

Ce guide explique comment déployer l'application ASGF sur Firebase Hosting et les fonctions Supabase Edge Functions sur Supabase.

## 📋 Table des matières

1. [Architecture du déploiement](#architecture-du-déploiement)
2. [Prérequis](#prérequis)
3. [Déploiement du Frontend sur Firebase](#déploiement-du-frontend-sur-firebase)
4. [Déploiement des Fonctions Supabase](#déploiement-des-fonctions-supabase)
5. [Configuration des Variables d'Environnement](#configuration-des-variables-denvironnement)
6. [Vérification du Déploiement](#vérification-du-déploiement)

---

## 🏗️ Architecture du déploiement

- **Frontend React** → Déployé sur **Firebase Hosting** (https://asgf-siteweb.web.app/)
- **Fonctions Supabase Edge Functions** → Déployées sur **Supabase** (infrastructure Supabase)
- **Base de données** → Hébergée sur **Supabase**

---

## ✅ Prérequis

### Outils nécessaires

1. **Firebase CLI**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. **Supabase CLI**
   ```bash
   npm install -g supabase
   ```

3. **Node.js** (version 18 ou supérieure)

### Accès nécessaires

- Accès au projet Firebase (asgf-siteweb)
- Accès au projet Supabase (avec les credentials)
- Variables d'environnement configurées

---

## 🌐 Déploiement du Frontend sur Firebase

### Étape 1 : Se placer dans le dossier de l'application

```bash
cd asgf-app
```

### Étape 2 : Construire l'application

```bash
npm install
npm run build
```

Cette commande crée un dossier `dist/` avec les fichiers optimisés pour la production.

### Étape 3 : Vérifier la configuration Firebase

Le fichier `firebase.json` devrait contenir :

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

### Étape 4 : Déployer sur Firebase Hosting

```bash
firebase deploy --only hosting
```

Ou si vous n'êtes pas encore lié au projet :

```bash
firebase init hosting
# Sélectionnez le projet existant : asgf-siteweb
# Configurez comme suit :
#   - Public directory: dist
#   - Single-page app: Yes
#   - GitHub deploys: No (ou Yes selon votre préférence)

firebase deploy --only hosting
```

### Étape 5 : Vérifier le déploiement

Visitez https://asgf-siteweb.web.app/ pour vérifier que l'application est en ligne.

---

## ⚡ Déploiement des Fonctions Supabase Edge Functions

Les fonctions Supabase ne sont **PAS** déployées sur Firebase, mais directement sur Supabase.

### Étape 1 : Se connecter à Supabase

```bash
supabase login
```

Ou si vous utilisez un token d'accès :

```bash
supabase link --project-ref votre-project-ref
```

### Étape 2 : Déployer une fonction spécifique

Pour déployer la fonction `admin-adhesion-members` :

```bash
supabase functions deploy admin-adhesion-members
```

### Étape 3 : Déployer toutes les fonctions

```bash
cd supabase
supabase functions deploy
```

Cela déploiera toutes les fonctions présentes dans `supabase/functions/` :
- `admin-adhesion-members`
- `admin-login`
- `admin-dashboard-stats`
- `public-bureau`
- `projet-inscription`

### Étape 4 : Vérifier le déploiement

Les fonctions seront disponibles aux URLs suivantes :
```
https://[votre-project-ref].supabase.co/functions/v1/admin-adhesion-members
https://[votre-project-ref].supabase.co/functions/v1/admin-login
https://[votre-project-ref].supabase.co/functions/v1/admin-dashboard-stats
https://[votre-project-ref].supabase.co/functions/v1/public-bureau
https://[votre-project-ref].supabase.co/functions/v1/projet-inscription
```

---

## 🔐 Configuration des Variables d'Environnement

### Variables d'environnement Supabase

Les fonctions Supabase Edge Functions ont besoin de ces variables d'environnement. Configurez-les dans le dashboard Supabase :

1. Allez sur https://supabase.com/dashboard/project/[votre-project-ref]/settings/functions
2. Ajoutez les secrets suivants :

```bash
# Variables automatiques (déjà disponibles)
PROJECT_URL=https://[votre-project-ref].supabase.co
SERVICE_ROLE_KEY=[votre-service-role-key]
JWT_SECRET=[votre-jwt-secret]

# Variables à configurer manuellement pour l'envoi d'emails
APPSCRIPT_CONTACT_WEBHOOK_URL=https://script.google.com/macros/s/[votre-script-id]/exec
APPSCRIPT_CONTACT_TOKEN=ASGF123
```

#### Comment obtenir les valeurs :

1. **PROJECT_URL** : Visible dans Settings > API > Project URL
2. **SERVICE_ROLE_KEY** : Dans Settings > API > service_role key (gardez-la secrète !)
3. **JWT_SECRET** : Dans Settings > API > JWT Secret
4. **APPSCRIPT_CONTACT_WEBHOOK_URL** : URL de déploiement de votre Google Apps Script
5. **APPSCRIPT_CONTACT_TOKEN** : Token défini dans votre script Google Apps Script

### Configurer les secrets via CLI

```bash
# Définir un secret pour une fonction
supabase secrets set APPSCRIPT_CONTACT_WEBHOOK_URL=https://script.google.com/macros/s/[ID]/exec --project-ref [votre-project-ref]

supabase secrets set APPSCRIPT_CONTACT_TOKEN=ASGF123 --project-ref [votre-project-ref]
```

Ou via le dashboard Supabase :
- Allez sur Settings > Edge Functions > Secrets
- Ajoutez chaque variable

---

## ✅ Vérification du Déploiement

### 1. Vérifier le Frontend

```bash
# Tester l'URL
curl https://asgf-siteweb.web.app/

# Vérifier dans le navigateur
# Ouvrir https://asgf-siteweb.web.app/
```

### 2. Vérifier les Fonctions Supabase

#### Tester la fonction admin-adhesion-members

```bash
# Tester l'endpoint (nécessite un token JWT valide)
curl -X GET \
  'https://[votre-project-ref].supabase.co/functions/v1/admin-adhesion-members?page=1&limit=10' \
  -H 'Authorization: Bearer [votre-token-jwt]' \
  -H 'Content-Type: application/json'
```

#### Tester les routes disponibles :

**GET /pending** - Membres en attente :
```bash
curl -X GET \
  'https://[votre-project-ref].supabase.co/functions/v1/admin-adhesion-members/pending' \
  -H 'Authorization: Bearer [votre-token-jwt]'
```

**GET /stats** - Statistiques :
```bash
curl -X GET \
  'https://[votre-project-ref].supabase.co/functions/v1/admin-adhesion-members/stats' \
  -H 'Authorization: Bearer [votre-token-jwt]'
```

**POST /email** - Envoi d'emails :
```bash
curl -X POST \
  'https://[votre-project-ref].supabase.co/functions/v1/admin-adhesion-members/email' \
  -H 'Authorization: Bearer [votre-token-jwt]' \
  -H 'Content-Type: application/json' \
  -d '{
    "member_ids": ["id1", "id2"],
    "subject": "Test",
    "body": "Message de test",
    "attachments": []
  }'
```

### 3. Vérifier dans le Dashboard Supabase

1. Allez sur https://supabase.com/dashboard/project/[votre-project-ref]/functions
2. Vérifiez que toutes les fonctions sont déployées
3. Consultez les logs pour détecter d'éventuelles erreurs

---

## 🚀 Script de Déploiement Automatique

Créer un script `deploy.sh` (Linux/Mac) ou `deploy.bat` (Windows) :

### deploy.sh (Linux/Mac)

```bash
#!/bin/bash

echo "🚀 Déploiement de l'application ASGF..."

# 1. Déployer le frontend
echo "📦 Construction du frontend..."
cd asgf-app
npm install
npm run build

echo "🔥 Déploiement sur Firebase Hosting..."
firebase deploy --only hosting

# 2. Déployer les fonctions Supabase
echo "⚡ Déploiement des fonctions Supabase..."
cd ../supabase
supabase functions deploy admin-adhesion-members
supabase functions deploy admin-login
supabase functions deploy admin-dashboard-stats
supabase functions deploy public-bureau
supabase functions deploy projet-inscription

echo "✅ Déploiement terminé !"
```

### deploy.bat (Windows)

```batch
@echo off
echo 🚀 Déploiement de l'application ASGF...

REM 1. Déployer le frontend
echo 📦 Construction du frontend...
cd asgf-app
call npm install
call npm run build

echo 🔥 Déploiement sur Firebase Hosting...
call firebase deploy --only hosting

REM 2. Déployer les fonctions Supabase
echo ⚡ Déploiement des fonctions Supabase...
cd ..\supabase
call supabase functions deploy admin-adhesion-members
call supabase functions deploy admin-login
call supabase functions deploy admin-dashboard-stats
call supabase functions deploy public-bureau
call supabase functions deploy projet-inscription

echo ✅ Déploiement terminé !
```

---

## 🔄 Mise à jour d'une fonction spécifique

Si vous modifiez uniquement une fonction :

```bash
# Exemple : mettre à jour admin-adhesion-members
cd supabase/functions/admin-adhesion-members
# Faire vos modifications dans index.ts
cd ../../..
supabase functions deploy admin-adhesion-members
```

---

## 📝 Routes disponibles pour admin-adhesion-members

Une fois déployée, la fonction `admin-adhesion-members` expose les routes suivantes :

| Méthode | Route | Description |
|---------|-------|-------------|
| GET | `/functions/v1/admin-adhesion-members` | Liste des membres (avec pagination) |
| GET | `/functions/v1/admin-adhesion-members/pending` | Membres en attente de validation |
| GET | `/functions/v1/admin-adhesion-members/stats` | Statistiques d'adhésion |
| POST | `/functions/v1/admin-adhesion-members/email` | Envoyer un email aux membres |
| GET | `/functions/v1/admin-adhesion-members/:id` | Détails d'un membre |
| PUT | `/functions/v1/admin-adhesion-members/:id` | Mettre à jour un membre |
| DELETE | `/functions/v1/admin-adhesion-members/:id` | Supprimer un membre |
| POST | `/functions/v1/admin-adhesion-members/:id/approve` | Approuver un membre |
| POST | `/functions/v1/admin-adhesion-members/:id/reject` | Rejeter un membre |

---

## ⚠️ Notes importantes

1. **Sécurité** : Ne commitez jamais vos clés API ou tokens dans Git
2. **CORS** : Les fonctions Supabase sont configurées pour accepter les requêtes depuis n'importe quelle origine
3. **Authentification** : Toutes les routes nécessitent un JWT valide dans le header `Authorization: Bearer [token]`
4. **Variables d'environnement** : Assurez-vous que toutes les variables d'environnement sont configurées avant le déploiement

---

## 🆘 Dépannage

### Erreur : "Function not found"
- Vérifiez que la fonction est bien déployée
- Vérifiez l'URL (elle doit correspondre au project-ref Supabase)

### Erreur : "Token invalide"
- Vérifiez que le JWT_SECRET est correctement configuré
- Vérifiez que le token JWT est valide et non expiré

### Erreur : "Apps Script webhook non configuré"
- Vérifiez que `APPSCRIPT_CONTACT_WEBHOOK_URL` est configuré
- Vérifiez que l'URL du webhook est accessible

### Erreur lors du build du frontend
- Vérifiez que toutes les dépendances sont installées : `npm install`
- Vérifiez qu'il n'y a pas d'erreurs de syntaxe dans le code

---

## 📞 Support

Pour toute question ou problème, consultez :
- Documentation Firebase : https://firebase.google.com/docs/hosting
- Documentation Supabase Functions : https://supabase.com/docs/guides/functions

---

**Dernière mise à jour** : $(date)


