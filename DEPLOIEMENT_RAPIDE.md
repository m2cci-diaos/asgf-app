# 🚀 Déploiement Rapide - ASGF

## ✅ Supabase CLI est déjà installé !

Supabase CLI est disponible à : `C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin\supabase.exe`

Version : **2.62.10**

---

## 🚀 Déploiement en 3 étapes

### 1️⃣ Se connecter à Supabase

```powershell
C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin\supabase.exe login
```

Cette commande ouvrira votre navigateur pour vous authentifier.

### 2️⃣ Lier votre projet (si ce n'est pas déjà fait)

```powershell
C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin\supabase.exe link --project-ref wooyxkfdzehvedvivhhd
```

Remplacez `wooyxkfdzehvedvivhhd` par votre project-ref Supabase si différent.

### 3️⃣ Déployer la fonction

```powershell
# Depuis la racine du projet (asgf-admin)
cd C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin

C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin\supabase.exe functions deploy admin-adhesion-members
```

---

## 📝 Script automatique

Pour simplifier, exécutez :

```powershell
.\deploy-simple.ps1
```

Ce script fera tout automatiquement !

---

## 🔧 Commandes rapides

```powershell
# Définir une variable pour simplifier
$supabase = "C:\Users\serig\OneDrive\Bureau\sites_asgf\asgf-admin\supabase.exe"

# Connexion
& $supabase login

# Liste des projets
& $supabase projects list

# Lier le projet
& $supabase link --project-ref wooyxkfdzehvedvivhhd

# Déployer
& $supabase functions deploy admin-adhesion-members

# Vérifier les logs
& $supabase functions logs admin-adhesion-members
```

---

## ⚠️ Configuration des secrets

Après le déploiement, configurez dans le Dashboard Supabase :
- `APPSCRIPT_CONTACT_WEBHOOK_URL`
- `APPSCRIPT_CONTACT_TOKEN`

URL : https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd/settings/functions

---

## 🔗 URLs importantes

- **Firebase Console :** https://console.firebase.google.com/project/asgf-siteweb
- **Supabase Dashboard :** https://supabase.com/dashboard/project/wooyxkfdzehvedvivhhd
- **Site Web :** https://asgf-siteweb.web.app
