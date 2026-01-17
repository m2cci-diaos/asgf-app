# 🚀 Déploiement sans Supabase CLI - Via Dashboard

Si vous ne pouvez pas installer Supabase CLI, vous pouvez déployer les fonctions directement depuis le Dashboard Supabase.

## 📋 Étape 1 : Préparer les fichiers

1. Allez dans le dossier de votre fonction :
   ```
   supabase\functions\admin-adhesion-members\
   ```

2. Vous devez avoir ces fichiers :
   - `index.ts` (le code de la fonction)
   - `deno.json` (la configuration)

## 📋 Étape 2 : Déployer via le Dashboard Supabase

### Méthode A : Via l'interface web

1. **Connectez-vous au Dashboard Supabase :**
   - Allez sur : https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd

2. **Allez dans Edge Functions :**
   - Cliquez sur "Edge Functions" dans le menu de gauche
   - Ou allez directement sur : https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/functions

3. **Créer/Déployer une fonction :**
   - Cliquez sur "Create a new function"
   - Nom : `admin-adhesion-members`
   - Copiez le contenu de `index.ts` dans l'éditeur
   - Déployez

### Méthode B : Via l'API REST (Alternative)

Vous pouvez aussi utiliser l'API REST de Supabase pour déployer. Cela nécessite :
- Votre `PROJECT_URL`
- Votre `SERVICE_ROLE_KEY`

---

## 📋 Étape 3 : Configurer les secrets

Après le déploiement, configurez les secrets :

1. **Dans le Dashboard Supabase :**
   - Allez sur : Settings → Edge Functions → Secrets
   - Ajoutez :
     - `APPSCRIPT_CONTACT_WEBHOOK_URL`
     - `APPSCRIPT_CONTACT_TOKEN`

---

## ✅ Solution Alternative : Utiliser l'exécutable local

Si vous téléchargez `supabase.exe` manuellement :

1. Téléchargez depuis : https://github.com/supabase/cli/releases/latest
2. Placez-le dans un dossier accessible
3. Utilisez-le avec le chemin complet :

```powershell
# Si vous l'avez mis dans C:\Tools
C:\Tools\supabase.exe login

# Si vous l'avez mis dans le projet\bin
.\bin\supabase.exe login

# Si vous l'avez mis dans le dossier actuel
.\supabase.exe login
```

---

## 🔧 Script de déploiement avec exécutable local

Créez un fichier `deploy-local.ps1` :

```powershell
# Chemin vers supabase.exe
$SUPABASE_CLI = ".\bin\supabase.exe"

# Si supabase.exe n'existe pas dans bin, chercher ailleurs
if (-not (Test-Path $SUPABASE_CLI)) {
    $SUPABASE_CLI = ".\supabase.exe"
}

if (-not (Test-Path $SUPABASE_CLI)) {
    Write-Host "Erreur: supabase.exe non trouvé" -ForegroundColor Red
    Write-Host "Téléchargez-le depuis: https://github.com/supabase/cli/releases/latest" -ForegroundColor Yellow
    exit 1
}

Write-Host "Utilisation de: $SUPABASE_CLI" -ForegroundColor Cyan

# Se connecter
& $SUPABASE_CLI login

# Déployer
& $SUPABASE_CLI functions deploy admin-adhesion-members
```

---

## 📝 Recommandation

**La solution la plus simple pour vous :**

1. Téléchargez `supabase.exe` depuis GitHub
2. Placez-le dans `C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin\bin\`
3. Utilisez le script `deploy-local.ps1` que je vais créer


