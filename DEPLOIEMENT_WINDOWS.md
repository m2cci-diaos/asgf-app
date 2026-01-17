# 🪟 Guide de Déploiement Windows - ASGF

## 📋 Étape 1 : Vérifier/Installer Supabase CLI

### Option A : Via npm (Recommandé)

```powershell
npm install -g supabase
```

### Option B : Via Scoop (si installé)

```powershell
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Option C : Télécharger l'exécutable

1. Allez sur : https://github.com/supabase/cli/releases
2. Téléchargez `supabase_windows_amd64.zip`
3. Extrayez `supabase.exe` dans un dossier dans votre PATH

### Vérifier l'installation

```powershell
supabase --version
```

---

## 📋 Étape 2 : Se connecter à Supabase

```powershell
supabase login
```

Cela ouvrira votre navigateur pour vous authentifier.

---

## 📋 Étape 3 : Lier votre projet Supabase

```powershell
# Depuis la racine du projet (asgf-admin)
cd C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin
supabase link --project-ref wooyxkfdzehvedvivhhd
```

**Remplacez `wooyxkfdzehvedvivhhd` par votre project-ref Supabase.**

Pour trouver votre project-ref :
- Allez sur https://supabase.com/dashboard
- Sélectionnez votre projet
- Le project-ref est dans l'URL ou dans Settings > General

---

## 📋 Étape 4 : Déployer les fonctions Supabase

**Depuis la racine du projet :**

```powershell
# S'assurer d'être à la racine
cd C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin

# Déployer la fonction admin-adhesion-members
supabase functions deploy admin-adhesion-members

# Déployer les autres fonctions (optionnel, si elles existent)
supabase functions deploy admin-login
supabase functions deploy admin-dashboard-stats
supabase functions deploy public-bureau
supabase functions deploy projet-inscription
```

---

## 📋 Étape 5 : Configurer les variables d'environnement

### Via le Dashboard Supabase (Recommandé)

1. Allez sur : https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/settings/functions
2. Dans la section "Secrets", ajoutez :
   - `APPSCRIPT_CONTACT_WEBHOOK_URL` = `https://script.google.com/macros/s/[VOTRE_ID]/exec`
   - `APPSCRIPT_CONTACT_TOKEN` = `ASGF123`

### Via CLI (Alternative)

```powershell
supabase secrets set APPSCRIPT_CONTACT_WEBHOOK_URL="https://script.google.com/macros/s/[ID]/exec" --project-ref wooyxkfdzehvedvivhhd
supabase secrets set APPSCRIPT_CONTACT_TOKEN="ASGF123" --project-ref wooyxkfdzehvedvivhhd
```

---

## 📋 Étape 6 : Déployer le Frontend sur Firebase

```powershell
# Aller dans le dossier asgf-app
cd asgf-app

# Construire l'application
npm install
npm run build

# Déployer sur Firebase
firebase deploy --only hosting
```

---

## 🚨 Problèmes courants

### "supabase : Le terme n'est pas reconnu"

**Solution :** Supabase CLI n'est pas installé ou pas dans votre PATH.

1. Installez via npm : `npm install -g supabase`
2. Ou ajoutez le chemin au PATH Windows

### "Project not found"

**Solution :** Vérifiez votre project-ref dans le dashboard Supabase.

### "Function not found"

**Solution :** Vérifiez que vous êtes dans le bon répertoire et que la fonction existe dans `supabase/functions/`

---

## ✅ Vérification du déploiement

### Vérifier les fonctions Supabase

1. Dashboard Supabase → Edge Functions
2. Vous devriez voir `admin-adhesion-members` listée

### Vérifier le frontend

1. Visitez : https://asgf-siteweb.web.app
2. Ouvrez la console du navigateur (F12)
3. Les erreurs `localhost:3001` ne devraient plus apparaître

---

## 📝 Commandes rapides (PowerShell)

```powershell
# Se positionner à la racine
cd C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin

# Déployer une fonction spécifique
supabase functions deploy admin-adhesion-members

# Déployer toutes les fonctions
Get-ChildItem supabase\functions -Directory | ForEach-Object {
    supabase functions deploy $_.Name
}

# Déployer le frontend
cd asgf-app
npm run build
firebase deploy --only hosting
```

---

## 🔗 URLs importantes

- **Firebase Console :** https://console.firebase.google.com/project/asgf-siteweb/overview
- **Supabase Dashboard :** https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd
- **Site Web :** https://asgf-siteweb.web.app


